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
public class PartsController(AppDbContext db) : ControllerBase
{
    // ── POS search (fast, minimal payload) ──────────────────────────────

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { success = true, data = Array.Empty<object>() });

        var term = q.Trim().ToLower();

        var parts = await db.Parts
            .Include(p => p.Category)
            .Where(p => p.IsActive &&
                (p.PartNo.ToLower().Contains(term) || p.Description.ToLower().Contains(term)))
            .OrderBy(p => p.PartNo)
            .Take(30)
            .Select(p => new
            {
                p.Id,
                p.PartNo,
                p.Description,
                p.CostPrice,
                p.SellPrice,
                p.StockQty,
                Category = p.Category.Name
            })
            .ToListAsync();

        return Ok(new { success = true, data = parts });
    }

    // ── Inventory list ───────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] int? categoryId,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] bool? includeInactive)
    {
        var query = db.Parts
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (!(includeInactive ?? false))
            query = query.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(p =>
                p.PartNo.ToLower().Contains(term) ||
                p.Description.ToLower().Contains(term));
        }

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (lowStockOnly == true)
            query = query.Where(p => p.StockQty <= p.ReorderLevel);

        var parts = await query
            .OrderBy(p => p.PartNo)
            .Select(p => new
            {
                p.Id,
                p.PartNo,
                p.Description,
                p.CategoryId,
                Category = p.Category.Name,
                p.SupplierId,
                Supplier = p.Supplier == null ? null : p.Supplier.Name,
                p.CostPrice,
                p.SellPrice,
                p.StockQty,
                p.ReorderLevel,
                p.IsActive,
                p.ImagePath,
                StockStatus = p.StockQty == 0 ? "OutOfStock"
                    : p.StockQty <= p.ReorderLevel ? "Low"
                    : "OK"
            })
            .ToListAsync();

        return Ok(new { success = true, data = parts });
    }

    // ── Single part ──────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var part = await db.Parts
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        return Ok(new
        {
            success = true,
            data = new
            {
                part.Id,
                part.PartNo,
                part.Description,
                part.CategoryId,
                Category = part.Category.Name,
                part.SupplierId,
                Supplier = part.Supplier?.Name,
                part.CostPrice,
                part.SellPrice,
                part.StockQty,
                part.ReorderLevel,
                part.IsActive,
                part.ArrivalDate,
                part.SupplierInvoiceNo,
                part.ImagePath
            }
        });
    }

    // ── Create ───────────────────────────────────────────────────────────

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] PartRequest req)
    {
        var validation = ValidateRequest(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var exists = await db.Parts.AnyAsync(p => p.PartNo.ToLower() == req.PartNo.Trim().ToLower());
        if (exists)
            return BadRequest(new { success = false, error = $"Part number '{req.PartNo}' already exists." });

        var part = new Part
        {
            PartNo = req.PartNo.Trim().ToUpper(),
            Description = req.Description.Trim(),
            CategoryId = req.CategoryId,
            SupplierId = req.SupplierId,
            CostPrice = req.CostPrice,
            SellPrice = req.SellPrice,
            StockQty = req.InitialStock ?? 0,
            ReorderLevel = req.ReorderLevel,
            IsActive = true,
            ArrivalDate = req.ArrivalDate,
            SupplierInvoiceNo = req.SupplierInvoiceNo?.Trim()
        };

        db.Parts.Add(part);
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { part.Id } });
    }

    // ── Update ───────────────────────────────────────────────────────────

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] PartRequest req)
    {
        var validation = ValidateRequest(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var part = await db.Parts.FindAsync(id);
        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        var exists = await db.Parts.AnyAsync(p => p.PartNo.ToLower() == req.PartNo.Trim().ToLower() && p.Id != id);
        if (exists)
            return BadRequest(new { success = false, error = $"Part number '{req.PartNo}' already exists on another part." });

        part.PartNo = req.PartNo.Trim().ToUpper();
        part.Description = req.Description.Trim();
        part.CategoryId = req.CategoryId;
        part.SupplierId = req.SupplierId;
        part.CostPrice = req.CostPrice;
        part.SellPrice = req.SellPrice;
        part.ReorderLevel = req.ReorderLevel;
        part.ArrivalDate = req.ArrivalDate;
        part.SupplierInvoiceNo = req.SupplierInvoiceNo?.Trim();

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }

    // ── Deactivate ───────────────────────────────────────────────────────

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var part = await db.Parts.FindAsync(id);
        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        part.IsActive = false;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }

    // ── Image upload ─────────────────────────────────────────────────────

    [HttpPost("{id}/image")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, error = "No file uploaded." });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (!allowedExtensions.Contains(ext))
            return BadRequest(new { success = false, error = "Only JPG, PNG, and WebP images are allowed." });

        var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedMimeTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { success = false, error = "Invalid file type." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, error = "Image must be under 5MB." });

        var part = await db.Parts.FindAsync(id);
        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        var safeExt = file.ContentType.ToLower() switch {
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg"
        };
        var fileName = $"part-{id}{safeExt}";
        var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "parts");
        Directory.CreateDirectory(folder);
        var filePath = Path.Combine(folder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        part.ImagePath = $"/images/parts/{fileName}";
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { imagePath = part.ImagePath } });
    }

    // ── Stock adjustment ─────────────────────────────────────────────────

    [HttpPost("{id}/adjust")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdjustStock(int id, [FromBody] StockAdjustRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
            return BadRequest(new { success = false, error = "Reason is required." });

        if (req.AdjustmentQty == 0)
            return BadRequest(new { success = false, error = "Adjustment quantity cannot be zero." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var part = await db.Parts.FindAsync(id);
        if (part is null)
            return NotFound(new { success = false, error = "Part not found." });

        var newQty = part.StockQty + req.AdjustmentQty;
        if (newQty < 0)
            return BadRequest(new { success = false, error = $"Adjustment would result in negative stock ({newQty})." });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.StockAdjustments.Add(new StockAdjustment
            {
                PartId = id,
                QtyBefore = part.StockQty,
                AdjustmentQty = req.AdjustmentQty,
                QtyAfter = newQty,
                Reason = req.Reason.Trim(),
                UserId = userId,
                Date = DateTime.UtcNow
            });

            part.StockQty = newQty;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Adjustment failed." });
        }

        return Ok(new { success = true, data = new { newQty } });
    }

    private static string? ValidateRequest(PartRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PartNo)) return "Part number is required.";
        if (string.IsNullOrWhiteSpace(req.Description)) return "Description is required.";
        if (req.CategoryId <= 0) return "Category is required.";
        if (req.CostPrice < 0) return "Cost price cannot be negative.";
        if (req.SellPrice < 0) return "Sell price cannot be negative.";
        if (req.ReorderLevel < 0) return "Reorder level cannot be negative.";
        return null;
    }
}

public record PartRequest(
    string PartNo,
    string Description,
    int CategoryId,
    int? SupplierId,
    decimal CostPrice,
    decimal SellPrice,
    int ReorderLevel,
    int? InitialStock,
    DateTime? ArrivalDate,
    string? SupplierInvoiceNo
);

public record StockAdjustRequest(int AdjustmentQty, string Reason);
