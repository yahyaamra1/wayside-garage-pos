using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SalesController(AppDbContext db, AuditService audit) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateSale([FromBody] CreateSaleRequest req)
    {
        if (req.Lines == null || req.Lines.Count == 0)
            return BadRequest(new { success = false, error = "Sale must have at least one line." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Cash restriction check
        if (req.PaymentMethod == "Cash")
        {
            var cashier = await db.Users.FindAsync(userId);
            if (cashier is { AllowCash: false })
                return BadRequest(new { success = false, error = "You are not authorised to accept cash payments." });
        }

        // Credit warning check
        if (req.CustomerId.HasValue && !req.AcknowledgedCreditWarning)
        {
            var customer = await db.Customers.FindAsync(req.CustomerId.Value);
            if (customer is { IsTradeAccount: true })
            {
                var saleTotal = req.Lines.Sum(l => l.Qty * l.UnitPrice * (1 - l.DiscountPct / 100m)) - req.DiscountAmount;
                if (customer.Balance + saleTotal > customer.CreditLimit)
                {
                    return Ok(new
                    {
                        success = false,
                        creditWarning = true,
                        error = $"Customer is R{(customer.Balance + saleTotal - customer.CreditLimit):F2} over their credit limit."
                    });
                }
            }
        }

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            // Validate stock
            foreach (var line in req.Lines)
            {
                var part = await db.Parts.FindAsync(line.PartId);
                if (part is null)
                    return BadRequest(new { success = false, error = $"Part ID {line.PartId} not found." });
                if (part.StockQty < line.Qty)
                    return BadRequest(new { success = false, error = $"Insufficient stock for {part.PartNo}. Available: {part.StockQty}." });
            }

            var subTotal = req.Lines.Sum(l => l.Qty * l.UnitPrice * (1 - l.DiscountPct / 100m));

            if (req.DiscountAmount < 0)
                return BadRequest(new { success = false, error = "Discount cannot be negative." });
            if (req.DiscountAmount > subTotal)
                return BadRequest(new { success = false, error = "Discount cannot exceed the subtotal." });

            if (!Enum.TryParse<PaymentMethod>(req.PaymentMethod, out var paymentMethod))
                return BadRequest(new { success = false, error = "Invalid payment method." });

            var total = subTotal - req.DiscountAmount;

            var sale = new Sale
            {
                Date = DateTime.UtcNow,
                CustomerId = req.CustomerId,
                UserId = userId,
                SubTotal = subTotal,
                DiscountAmount = req.DiscountAmount,
                Total = total,
                PaymentMethod = paymentMethod,
                Notes = req.Notes
            };

            db.Sales.Add(sale);
            await db.SaveChangesAsync();

            foreach (var line in req.Lines)
            {
                var part = await db.Parts.FindAsync(line.PartId);
                if (part!.StockQty < line.Qty)
                    return BadRequest(new { success = false, error = $"Insufficient stock for {part.PartNo}. Available: {part.StockQty}." });

                var lineTotal = line.Qty * line.UnitPrice * (1 - line.DiscountPct / 100m);

                db.SaleLines.Add(new SaleLine
                {
                    SaleId = sale.Id,
                    PartId = line.PartId,
                    Qty = line.Qty,
                    UnitPrice = line.UnitPrice,
                    DiscountPct = line.DiscountPct,
                    LineTotal = lineTotal
                });

                part.StockQty -= line.Qty;
            }

            // Update customer balance for account sales
            if (req.CustomerId.HasValue && req.PaymentMethod == "Account")
            {
                var customer = await db.Customers.FindAsync(req.CustomerId.Value);
                if (customer != null) customer.Balance += total;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            // Queue balance alert if trade account exceeds 80% of credit limit
            if (req.CustomerId.HasValue && req.PaymentMethod == "Account")
            {
                var cust = await db.Customers.FindAsync(req.CustomerId.Value);
                if (cust is { IsTradeAccount: true } && cust.CreditLimit > 0
                    && cust.Balance >= cust.CreditLimit * 0.8m
                    && !string.IsNullOrWhiteSpace(cust.Email))
                {
                    var pct = (cust.Balance / cust.CreditLimit * 100).ToString("0");
                    var encodedName = System.Net.WebUtility.HtmlEncode(cust.Name);
                    var body = $"""
                        <html><body style="font-family:Arial,sans-serif;color:#333">
                        <h2 style="color:#c0392b">Account Balance Alert</h2>
                        <p>Dear {encodedName},</p>
                        <p>Your account balance at <strong>Wayside Garage &amp; Motor Spares</strong>
                        has reached <strong>R {cust.Balance:F2}</strong> ({pct}% of your
                        R {cust.CreditLimit:F2} credit limit).</p>
                        <p>Please arrange payment at your earliest convenience to avoid any
                        disruption to your account.</p>
                        <p>Regards,<br/>Wayside Garage &amp; Motor Spares</p>
                        </body></html>
                        """;

                    db.EmailQueue.Add(new EmailQueue
                    {
                        ToEmail = cust.Email,
                        ToName = cust.Name,
                        Subject = $"Account Balance Alert — R {cust.Balance:F2} outstanding",
                        Body = body,
                        Type = EmailType.BalanceAlert,
                        Status = EmailStatus.Pending,
                        RelatedId = cust.Id
                    });
                    await db.SaveChangesAsync();
                }
            }

            await audit.LogAsync("Sale.Create", "Sale", sale.Id.ToString(), $"Invoice {sale.Id} · R {sale.Total:F2} · {req.PaymentMethod}");

            return Ok(new { success = true, data = new { sale.Id } });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Failed to process sale." });
        }
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> LookupSale([FromQuery] string? invoiceNo, [FromQuery] int? customerId)
    {
        if (string.IsNullOrWhiteSpace(invoiceNo) && customerId is null)
            return BadRequest(new { success = false, error = "Provide invoiceNo or customerId." });

        IQueryable<Sale> query = db.Sales
            .Include(s => s.Customer)
            .Include(s => s.Lines).ThenInclude(l => l.Part)
            .Where(s => s.Status == SaleStatus.Completed);

        if (!string.IsNullOrWhiteSpace(invoiceNo) && int.TryParse(invoiceNo, out var id))
            query = query.Where(s => s.Id == id);
        else if (customerId.HasValue)
            query = query.Where(s => s.CustomerId == customerId).OrderByDescending(s => s.Date).Take(10);

        var sales = await query.Select(s => new
        {
            s.Id,
            Date = s.Date.ToLocalTime(),
            Customer = s.Customer == null ? "Walk-in" : s.Customer.Name,
            s.Total,
            Lines = s.Lines.Select(l => new
            {
                l.Id,
                l.Part.PartNo,
                l.Part.Description,
                l.Qty,
                l.UnitPrice,
                l.DiscountPct,
                l.LineTotal
            })
        }).ToListAsync();

        if (sales.Count == 0)
            return NotFound(new { success = false, error = "No sale found." });

        return Ok(new { success = true, data = sales });
    }

    [HttpGet("{id}/receipt")]
    public async Task<IActionResult> GetReceipt(int id)
    {
        var sale = await db.Sales
            .Include(s => s.Customer)
            .Include(s => s.User)
            .Include(s => s.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sale is null)
            return NotFound(new { success = false, error = "Sale not found." });

        var pdf = PdfService.GenerateSaleReceiptPdf(sale);
        return File(pdf, "application/pdf", $"Invoice-{id:D6}.pdf");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSale(int id)
    {
        var sale = await db.Sales
            .Include(s => s.Customer)
            .Include(s => s.User)
            .Include(s => s.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sale is null)
            return NotFound(new { success = false, error = "Sale not found." });

        return Ok(new
        {
            success = true,
            data = new
            {
                sale.Id,
                Date = sale.Date.ToLocalTime(),
                Customer = sale.Customer == null ? null : new { sale.Customer.Id, sale.Customer.Name },
                Cashier = sale.User.FullName,
                sale.SubTotal,
                sale.DiscountAmount,
                sale.Total,
                PaymentMethod = sale.PaymentMethod.ToString(),
                sale.Notes,
                Lines = sale.Lines.Select(l => new
                {
                    l.Id,
                    l.Part.PartNo,
                    l.Part.Description,
                    l.Qty,
                    l.UnitPrice,
                    l.DiscountPct,
                    l.LineTotal
                })
            }
        });
    }
}

public record CreateSaleRequest(
    int? CustomerId,
    List<SaleLineRequest> Lines,
    decimal DiscountAmount,
    string PaymentMethod,
    string? Notes,
    bool AcknowledgedCreditWarning
);

public record SaleLineRequest(int PartId, int Qty, decimal UnitPrice, decimal DiscountPct);
