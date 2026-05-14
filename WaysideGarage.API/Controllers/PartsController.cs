using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PartsController(AppDbContext db) : ControllerBase
{
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
}
