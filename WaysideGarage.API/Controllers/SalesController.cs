using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SalesController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateSale([FromBody] CreateSaleRequest req)
    {
        if (req.Lines == null || req.Lines.Count == 0)
            return BadRequest(new { success = false, error = "Sale must have at least one line." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
            var total = subTotal - req.DiscountAmount;

            var sale = new Sale
            {
                Date = DateTime.UtcNow,
                CustomerId = req.CustomerId,
                UserId = userId,
                SubTotal = subTotal,
                DiscountAmount = req.DiscountAmount,
                Total = total,
                PaymentMethod = Enum.Parse<PaymentMethod>(req.PaymentMethod),
                Notes = req.Notes
            };

            db.Sales.Add(sale);
            await db.SaveChangesAsync();

            foreach (var line in req.Lines)
            {
                var part = await db.Parts.FindAsync(line.PartId);
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

                part!.StockQty -= line.Qty;
            }

            // Update customer balance for account sales
            if (req.CustomerId.HasValue && req.PaymentMethod == "Account")
            {
                var customer = await db.Customers.FindAsync(req.CustomerId.Value);
                if (customer != null) customer.Balance += total;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { success = true, data = new { sale.Id } });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Failed to process sale." });
        }
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
