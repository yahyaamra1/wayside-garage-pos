using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var cats = await db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, PartCount = c.Parts.Count(p => p.IsActive) })
            .ToListAsync();

        return Ok(new { success = true, data = cats });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { success = false, error = "Name is required." });

        var exists = await db.Categories.AnyAsync(c => c.Name.ToLower() == req.Name.Trim().ToLower());
        if (exists)
            return BadRequest(new { success = false, error = "A category with this name already exists." });

        var cat = new Category { Name = req.Name.Trim() };
        db.Categories.Add(cat);
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { cat.Id, cat.Name } });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { success = false, error = "Name is required." });

        var cat = await db.Categories.FindAsync(id);
        if (cat is null)
            return NotFound(new { success = false, error = "Category not found." });

        var exists = await db.Categories.AnyAsync(c => c.Name.ToLower() == req.Name.Trim().ToLower() && c.Id != id);
        if (exists)
            return BadRequest(new { success = false, error = "A category with this name already exists." });

        cat.Name = req.Name.Trim();
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { cat.Id, cat.Name } });
    }
}

public record CategoryRequest(string Name);
