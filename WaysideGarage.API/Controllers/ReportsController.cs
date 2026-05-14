using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController(AppDbContext db) : ControllerBase
{
    // ── Summary (date range) ─────────────────────────────────────────────

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var sales = await db.Sales
            .Where(s => s.Status == SaleStatus.Completed &&
                        s.Date >= utcFrom && s.Date < utcTo)
            .ToListAsync();

        var byMethod = sales
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new
            {
                Method = g.Key.ToString(),
                Count = g.Count(),
                Total = g.Sum(s => s.Total)
            })
            .ToList();

        var returns = await db.CustomerReturns
            .Where(r => r.Date >= utcFrom && r.Date < utcTo &&
                        (r.Outcome == ReturnOutcome.Refund || r.Outcome == ReturnOutcome.StoreCredit))
            .SumAsync(r => r.RefundAmount);

        var tradeBalance = await db.Customers
            .Where(c => c.IsTradeAccount && c.IsActive)
            .SumAsync(c => c.Balance);

        return Ok(new
        {
            success = true,
            data = new
            {
                From = utcFrom.ToLocalTime(),
                To = utcTo.ToLocalTime(),
                SaleCount = sales.Count,
                GrossRevenue = sales.Sum(s => s.Total),
                TotalReturns = returns,
                NetRevenue = sales.Sum(s => s.Total) - returns,
                ByPaymentMethod = byMethod,
                TotalTradeBalance = tradeBalance
            }
        });
    }

    // ── Daily breakdown ──────────────────────────────────────────────────

    [HttpGet("daily")]
    public async Task<IActionResult> Daily(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var rows = await db.Sales
            .Where(s => s.Status == SaleStatus.Completed &&
                        s.Date >= utcFrom && s.Date < utcTo)
            .Select(s => new { s.Date, s.Total })
            .ToListAsync();

        var daily = rows
            .GroupBy(s => s.Date.ToLocalTime().Date)
            .Select(g => new
            {
                Date = g.Key,
                SaleCount = g.Count(),
                Total = g.Sum(s => s.Total)
            })
            .OrderBy(d => d.Date)
            .ToList();

        return Ok(new { success = true, data = daily });
    }

    // ── Top-selling parts ────────────────────────────────────────────────

    [HttpGet("top-parts")]
    public async Task<IActionResult> TopParts(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 10)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var top = await db.SaleLines
            .Where(l => l.Sale.Status == SaleStatus.Completed &&
                        l.Sale.Date >= utcFrom && l.Sale.Date < utcTo)
            .GroupBy(l => new { l.PartId, l.Part.PartNo, l.Part.Description })
            .Select(g => new
            {
                g.Key.PartId,
                g.Key.PartNo,
                g.Key.Description,
                QtySold = g.Sum(l => l.Qty),
                Revenue = g.Sum(l => l.LineTotal)
            })
            .OrderByDescending(x => x.Revenue)
            .Take(limit)
            .ToListAsync();

        return Ok(new { success = true, data = top });
    }

    // ── Low stock ────────────────────────────────────────────────────────

    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock()
    {
        var parts = await db.Parts
            .Where(p => p.IsActive && p.StockQty <= p.ReorderLevel)
            .OrderBy(p => p.StockQty - p.ReorderLevel)
            .Select(p => new
            {
                p.Id,
                p.PartNo,
                p.Description,
                p.StockQty,
                p.ReorderLevel,
                SupplierName = p.Supplier != null ? p.Supplier.Name : null
            })
            .ToListAsync();

        return Ok(new { success = true, data = parts });
    }

    // ── Supplier spend ───────────────────────────────────────────────────

    [HttpGet("supplier-spend")]
    public async Task<IActionResult> SupplierSpend(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var spend = await db.POLines
            .Where(l => (l.PurchaseOrder.Status == POStatus.Received ||
                         l.PurchaseOrder.Status == POStatus.PartialReceived) &&
                        l.PurchaseOrder.Date >= utcFrom && l.PurchaseOrder.Date < utcTo &&
                        l.QtyReceived > 0)
            .GroupBy(l => new { l.PurchaseOrder.SupplierId, l.PurchaseOrder.Supplier.Name })
            .Select(g => new
            {
                SupplierId = g.Key.SupplierId,
                SupplierName = g.Key.Name,
                OrderCount = g.Select(l => l.PurchaseOrderId).Distinct().Count(),
                TotalSpend = g.Sum(l => l.QtyReceived * l.UnitCost)
            })
            .OrderByDescending(x => x.TotalSpend)
            .ToListAsync();

        return Ok(new { success = true, data = spend });
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static (DateTime utcFrom, DateTime utcTo) NormaliseRange(DateTime? from, DateTime? to)
    {
        var localFrom = (from ?? DateTime.Today).Date;
        var localTo = (to ?? DateTime.Today).Date.AddDays(1);
        return (localFrom.ToUniversalTime(), localTo.ToUniversalTime());
    }
}
