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

        var rawLines = await db.SaleLines
            .Where(l => l.Sale.Status == SaleStatus.Completed &&
                        l.Sale.Date >= utcFrom && l.Sale.Date < utcTo)
            .Select(l => new
            {
                l.PartId,
                l.Part.PartNo,
                l.Part.Description,
                l.Qty,
                l.LineTotal
            })
            .ToListAsync();

        var top = rawLines
            .GroupBy(l => new { l.PartId, l.PartNo, l.Description })
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
            .ToList();

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

        var rawLines = await db.POLines
            .Where(l => (l.PurchaseOrder.Status == POStatus.Received ||
                         l.PurchaseOrder.Status == POStatus.PartialReceived) &&
                        l.PurchaseOrder.Date >= utcFrom && l.PurchaseOrder.Date < utcTo &&
                        l.QtyReceived > 0)
            .Select(l => new
            {
                SupplierId = l.PurchaseOrder.SupplierId,
                SupplierName = l.PurchaseOrder.Supplier.Name,
                l.PurchaseOrderId,
                Spend = (decimal)l.QtyReceived * l.UnitCost
            })
            .ToListAsync();

        var spend = rawLines
            .GroupBy(l => new { l.SupplierId, l.SupplierName })
            .Select(g => new
            {
                SupplierId = g.Key.SupplierId,
                SupplierName = g.Key.SupplierName,
                OrderCount = g.Select(l => l.PurchaseOrderId).Distinct().Count(),
                TotalSpend = g.Sum(l => l.Spend)
            })
            .OrderByDescending(x => x.TotalSpend)
            .ToList();

        return Ok(new { success = true, data = spend });
    }

    // ── Individual sales detail ──────────────────────────────────────────

    [HttpGet("sales-detail")]
    public async Task<IActionResult> SalesDetail(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var raw = await db.Sales
            .Where(s => s.Status == SaleStatus.Completed &&
                        s.Date >= utcFrom && s.Date < utcTo)
            .Select(s => new
            {
                s.Id,
                s.Date,
                s.Total,
                s.PaymentMethod,
                CustomerName = s.Customer != null ? s.Customer.Name : null,
                Lines = s.Lines.Select(l => new
                {
                    l.Part.PartNo,
                    l.Part.Description,
                    l.Qty,
                    l.LineTotal
                }).ToList()
            })
            .OrderBy(s => s.Date)
            .ToListAsync();

        var sales = raw.Select(s => new
        {
            s.Id,
            InvoiceNo     = $"INV-{s.Id:D5}",
            Date          = s.Date.ToLocalTime(),
            s.Total,
            PaymentMethod = s.PaymentMethod.ToString(),
            Customer      = s.CustomerName,
            s.Lines
        });

        return Ok(new { success = true, data = sales });
    }

    // ── Daily items breakdown ────────────────────────────────────────────

    [HttpGet("daily-items")]
    public async Task<IActionResult> DailyItems(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var (utcFrom, utcTo) = NormaliseRange(from, to);

        var rawLines = await db.SaleLines
            .Where(l => l.Sale.Status == SaleStatus.Completed &&
                        l.Sale.Date >= utcFrom && l.Sale.Date < utcTo)
            .Select(l => new
            {
                Date      = l.Sale.Date,
                l.Part.PartNo,
                l.Part.Description,
                l.Qty,
                l.LineTotal
            })
            .ToListAsync();

        var result = rawLines
            .GroupBy(l => l.Date.ToLocalTime().Date)
            .Select(g => new
            {
                Date  = g.Key,
                Items = g.GroupBy(l => new { l.PartNo, l.Description })
                         .Select(ig => new
                         {
                             ig.Key.PartNo,
                             ig.Key.Description,
                             Qty       = ig.Sum(l => l.Qty),
                             LineTotal = ig.Sum(l => l.LineTotal)
                         })
                         .OrderByDescending(x => x.LineTotal)
                         .ToList()
            })
            .OrderBy(d => d.Date)
            .ToList();

        return Ok(new { success = true, data = result });
    }

    // ── Till close ──────────────────────────────────────────────────────────

    [HttpGet("till-close")]
    public async Task<IActionResult> TillClose([FromQuery] DateTime? date)
    {
        var d = (date?.Date ?? DateTime.Today);
        var utcFrom = d.ToUniversalTime();
        var utcTo = d.AddDays(1).ToUniversalTime();

        var sales = await db.Sales
            .Where(s => s.Status == SaleStatus.Completed && s.Date >= utcFrom && s.Date < utcTo)
            .ToListAsync();

        var cash    = sales.Where(s => s.PaymentMethod == PaymentMethod.Cash).ToList();
        var card    = sales.Where(s => s.PaymentMethod == PaymentMethod.Card).ToList();
        var account = sales.Where(s => s.PaymentMethod == PaymentMethod.Account).ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                date         = d.ToString("yyyy-MM-dd"),
                cashCount    = cash.Count,
                cashTotal    = cash.Sum(s => s.Total),
                cardCount    = card.Count,
                cardTotal    = card.Sum(s => s.Total),
                accountCount = account.Count,
                accountTotal = account.Sum(s => s.Total),
                totalCount   = sales.Count,
                totalValue   = sales.Sum(s => s.Total)
            }
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static (DateTime utcFrom, DateTime utcTo) NormaliseRange(DateTime? from, DateTime? to)
    {
        var localFrom = (from ?? DateTime.Today).Date;
        var localTo = (to ?? DateTime.Today).Date.AddDays(1);
        return (localFrom.ToUniversalTime(), localTo.ToUniversalTime());
    }
}
