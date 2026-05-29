using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/returns")]
[Authorize]
public class ReturnsController(AppDbContext db, AuditService audit) : ControllerBase
{
    // ── Customer Returns ─────────────────────────────────────────────────

    [HttpGet("customer/sale/{saleId}")]
    public async Task<IActionResult> GetReturnsBySale(int saleId)
    {
        var returns = await db.CustomerReturns
            .Where(r => r.SaleId == saleId)
            .Select(r => new { r.SaleLineId, r.Qty })
            .ToListAsync();

        // Sum qty already returned per line
        var summary = returns
            .GroupBy(r => r.SaleLineId)
            .ToDictionary(g => g.Key, g => g.Sum(r => r.Qty));

        return Ok(new { success = true, data = summary });
    }

    [HttpPost("customer")]
    public async Task<IActionResult> CustomerReturn([FromBody] CustomerReturnRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
            return BadRequest(new { success = false, error = "Reason is required." });

        if (req.Lines == null || req.Lines.Count == 0 || req.Lines.All(l => l.Qty == 0))
            return BadRequest(new { success = false, error = "At least one line with quantity > 0 is required." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var sale = await db.Sales
            .Include(s => s.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(s => s.Id == req.SaleId);

        if (sale is null)
            return NotFound(new { success = false, error = "Sale not found." });

        // Validate each line
        foreach (var line in req.Lines.Where(l => l.Qty > 0))
        {
            var saleLine = sale.Lines.FirstOrDefault(l => l.Id == line.SaleLineId);
            if (saleLine is null)
                return BadRequest(new { success = false, error = $"Sale line {line.SaleLineId} does not belong to sale {req.SaleId}." });

            var alreadyReturned = await db.CustomerReturns
                .Where(r => r.SaleLineId == line.SaleLineId)
                .SumAsync(r => (int?)r.Qty) ?? 0;

            var available = saleLine.Qty - alreadyReturned;
            if (line.Qty > available)
                return BadRequest(new { success = false, error = $"Cannot return {line.Qty} of {saleLine.Part.PartNo} — only {available} available to return." });
        }

        if (!Enum.TryParse<ReturnOutcome>(req.Outcome, out var outcome))
            return BadRequest(new { success = false, error = "Invalid return outcome." });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            decimal totalRefund = 0;

            foreach (var line in req.Lines.Where(l => l.Qty > 0))
            {
                var saleLine = sale.Lines.First(l => l.Id == line.SaleLineId);
                var refundAmount = saleLine.UnitPrice * line.Qty * (1 - saleLine.DiscountPct / 100m);
                totalRefund += refundAmount;

                db.CustomerReturns.Add(new CustomerReturn
                {
                    SaleId = req.SaleId,
                    SaleLineId = line.SaleLineId,
                    Qty = line.Qty,
                    Reason = req.Reason,
                    Outcome = outcome,
                    RefundAmount = refundAmount,
                    StockRestored = req.StockRestored,
                    UserId = userId,
                    Date = DateTime.UtcNow
                });

                if (req.StockRestored)
                    saleLine.Part.StockQty += line.Qty;
            }

            // Adjust trade account balance for refunds and credits
            if (sale.CustomerId.HasValue && sale.PaymentMethod == PaymentMethod.Account
                && (outcome == ReturnOutcome.Refund || outcome == ReturnOutcome.StoreCredit))
            {
                var customer = await db.Customers.FindAsync(sale.CustomerId.Value);
                if (customer != null)
                    customer.Balance -= totalRefund;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            await audit.LogAsync("Return.Customer", "Sale", req.SaleId.ToString(), $"Return on sale {req.SaleId} · {req.Lines.Count} line(s)");

            return Ok(new { success = true, data = new { refundTotal = totalRefund } });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Failed to process return." });
        }
    }

    [HttpGet("customer/recent")]
    public async Task<IActionResult> RecentCustomerReturns()
    {
        var returns = await db.CustomerReturns
            .Include(r => r.Sale).ThenInclude(s => s.Customer)
            .Include(r => r.SaleLine).ThenInclude(l => l.Part)
            .Include(r => r.User)
            .OrderByDescending(r => r.Date)
            .Take(50)
            .Select(r => new
            {
                r.Id,
                Date = r.Date.ToLocalTime(),
                Invoice = r.SaleId,
                Customer = r.Sale.Customer == null ? "Walk-in" : r.Sale.Customer.Name,
                r.SaleLine.Part.PartNo,
                r.SaleLine.Part.Description,
                r.Qty,
                r.Outcome,
                r.RefundAmount,
                r.Reason,
                Cashier = r.User.FullName
            })
            .ToListAsync();

        return Ok(new { success = true, data = returns });
    }

    // ── Supplier Returns ─────────────────────────────────────────────────

    [HttpPost("supplier")]
    public async Task<IActionResult> SupplierReturn([FromBody] SupplierReturnRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
            return BadRequest(new { success = false, error = "Reason is required." });

        if (req.Qty <= 0)
            return BadRequest(new { success = false, error = "Quantity must be greater than zero." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var part = await db.Parts.FindAsync(req.PartId);
        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        if (part.StockQty < req.Qty)
            return BadRequest(new { success = false, error = $"Insufficient stock. Available: {part.StockQty}." });

        var supplier = await db.Suppliers.FindAsync(req.SupplierId);
        if (supplier is null)
            return NotFound(new { success = false, error = "Supplier not found." });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.SupplierReturns.Add(new SupplierReturn
            {
                SupplierId = req.SupplierId,
                PartId = req.PartId,
                Qty = req.Qty,
                Reason = req.Reason,
                DebitNoteNo = req.DebitNoteNo?.Trim(),
                SupplierInvoiceNo = req.SupplierInvoiceNo?.Trim(),
                UnitCost = part.CostPrice,
                UserId = userId,
                Date = DateTime.UtcNow
            });

            part.StockQty -= req.Qty;

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            await audit.LogAsync("Return.Supplier", "Supplier", req.SupplierId.ToString(), $"Supplier return · 1 line(s)");

            return Ok(new { success = true, data = new { totalCost = part.CostPrice * req.Qty } });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Failed to process supplier return." });
        }
    }

    [HttpGet("supplier/{id}/pdf")]
    public async Task<IActionResult> SupplierReturnPdf(int id)
    {
        var ret = await db.SupplierReturns
            .Include(r => r.Supplier)
            .Include(r => r.Part)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (ret is null)
            return NotFound(new { success = false, error = "Return not found." });

        var pdf = PdfService.GenerateSupplierReturnPdf(ret);
        var fileName = $"SupplierReturn-{ret.DebitNoteNo ?? id.ToString()}.pdf";
        return File(pdf, "application/pdf", fileName);
    }

    [HttpGet("supplier/recent")]
    public async Task<IActionResult> RecentSupplierReturns()
    {
        var returns = await db.SupplierReturns
            .Include(r => r.Supplier)
            .Include(r => r.Part)
            .Include(r => r.User)
            .OrderByDescending(r => r.Date)
            .Take(50)
            .Select(r => new
            {
                r.Id,
                Date = r.Date.ToLocalTime(),
                Supplier = r.Supplier.Name,
                r.Part.PartNo,
                r.Part.Description,
                r.Qty,
                r.UnitCost,
                TotalCost = r.Qty * r.UnitCost,
                r.Reason,
                r.DebitNoteNo,
                r.SupplierInvoiceNo,
                Cashier = r.User.FullName
            })
            .ToListAsync();

        return Ok(new { success = true, data = returns });
    }
}

public record CustomerReturnRequest(
    int SaleId,
    List<ReturnLineRequest> Lines,
    string Reason,
    string Outcome,
    bool StockRestored
);

public record ReturnLineRequest(int SaleLineId, int Qty);

public record SupplierReturnRequest(
    int SupplierId,
    int PartId,
    int Qty,
    string Reason,
    string? DebitNoteNo,
    string? SupplierInvoiceNo
);
