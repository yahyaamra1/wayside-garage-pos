using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/purchaseorders")]
[Authorize]
public class PurchaseOrdersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var query = db.PurchaseOrders
            .Include(p => p.Supplier)
            .Include(p => p.Lines)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<POStatus>(status, out var s))
            query = query.Where(p => p.Status == s);

        var pos = await query
            .OrderByDescending(p => p.Date)
            .Select(p => new
            {
                p.Id,
                Date = p.Date.ToLocalTime(),
                Supplier = p.Supplier.Name,
                p.SupplierId,
                Status = p.Status.ToString(),
                LineCount = p.Lines.Count,
                TotalValue = p.Lines.Sum(l => l.QtyOrdered * l.UnitCost),
                p.Notes
            })
            .ToListAsync();

        return Ok(new { success = true, data = pos });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var po = await db.PurchaseOrders
            .Include(p => p.Supplier)
            .Include(p => p.User)
            .Include(p => p.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po is null)
            return NotFound(new { success = false, error = "Purchase order not found." });

        return Ok(new
        {
            success = true,
            data = new
            {
                po.Id,
                Date = po.Date.ToLocalTime(),
                Supplier = new { po.Supplier.Id, po.Supplier.Name, po.Supplier.AccountNo, po.Supplier.Phone },
                Status = po.Status.ToString(),
                CreatedBy = po.User.FullName,
                po.Notes,
                Lines = po.Lines.Select(l => new
                {
                    l.Id,
                    l.Part.PartNo,
                    l.Part.Description,
                    l.UnitCost,
                    l.QtyOrdered,
                    l.QtyReceived,
                    Remaining = l.QtyOrdered - l.QtyReceived,
                    LineTotal = l.QtyOrdered * l.UnitCost
                }),
                TotalValue = po.Lines.Sum(l => l.QtyOrdered * l.UnitCost)
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePORequest req)
    {
        if (req.Lines == null || req.Lines.Count == 0)
            return BadRequest(new { success = false, error = "PO must have at least one line." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var supplier = await db.Suppliers.FindAsync(req.SupplierId);
        if (supplier is null)
            return NotFound(new { success = false, error = "Supplier not found." });

        var po = new PurchaseOrder
        {
            SupplierId = req.SupplierId,
            UserId = userId,
            Notes = req.Notes,
            Date = DateTime.UtcNow,
            Status = POStatus.Open
        };

        db.PurchaseOrders.Add(po);
        await db.SaveChangesAsync();

        foreach (var line in req.Lines)
        {
            var part = await db.Parts.FindAsync(line.PartId);
            if (part is null)
            {
                db.PurchaseOrders.Remove(po);
                await db.SaveChangesAsync();
                return BadRequest(new { success = false, error = $"Part ID {line.PartId} not found." });
            }

            db.POLines.Add(new POLine
            {
                PurchaseOrderId = po.Id,
                PartId = line.PartId,
                QtyOrdered = line.QtyOrdered,
                QtyReceived = 0,
                UnitCost = line.UnitCost
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { po.Id } });
    }

    [HttpPut("{id}/receive")]
    public async Task<IActionResult> ReceiveStock(int id, [FromBody] ReceiveStockRequest req)
    {
        if (req.Lines == null || req.Lines.Count == 0)
            return BadRequest(new { success = false, error = "No lines provided." });

        var po = await db.PurchaseOrders
            .Include(p => p.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po is null)
            return NotFound(new { success = false, error = "Purchase order not found." });

        if (po.Status == POStatus.Received || po.Status == POStatus.Cancelled)
            return BadRequest(new { success = false, error = $"Cannot receive stock on a {po.Status} order." });

        // Validate receive qtys
        foreach (var r in req.Lines.Where(l => l.QtyReceiving > 0))
        {
            var line = po.Lines.FirstOrDefault(l => l.Id == r.LineId);
            if (line is null)
                return BadRequest(new { success = false, error = $"Line {r.LineId} does not belong to this PO." });

            var remaining = line.QtyOrdered - line.QtyReceived;
            if (r.QtyReceiving > remaining)
                return BadRequest(new { success = false, error = $"Cannot receive {r.QtyReceiving} of {line.Part.PartNo} — only {remaining} remaining." });
        }

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            foreach (var r in req.Lines.Where(l => l.QtyReceiving > 0))
            {
                var line = po.Lines.First(l => l.Id == r.LineId);
                line.QtyReceived += r.QtyReceiving;
                line.Part.StockQty += r.QtyReceiving;

                // Update part cost price to latest received cost
                line.Part.CostPrice = line.UnitCost;
            }

            // Update PO status
            var allReceived = po.Lines.All(l => l.QtyReceived >= l.QtyOrdered);
            var anyReceived = po.Lines.Any(l => l.QtyReceived > 0);
            po.Status = allReceived ? POStatus.Received : anyReceived ? POStatus.PartialReceived : po.Status;

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { success = true, data = new { status = po.Status.ToString() } });
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Failed to receive stock." });
        }
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var po = await db.PurchaseOrders.FindAsync(id);
        if (po is null)
            return NotFound(new { success = false, error = "Purchase order not found." });

        if (po.Status != POStatus.Open)
            return BadRequest(new { success = false, error = "Only open orders can be cancelled." });

        po.Status = POStatus.Cancelled;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { } });
    }
}

public record CreatePORequest(int SupplierId, List<POLineRequest> Lines, string? Notes);
public record POLineRequest(int PartId, int QtyOrdered, decimal UnitCost);
public record ReceiveStockRequest(List<ReceiveLineRequest> Lines);
public record ReceiveLineRequest(int LineId, int QtyReceiving);
