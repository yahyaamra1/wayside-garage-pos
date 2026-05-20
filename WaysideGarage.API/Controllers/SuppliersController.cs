using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool? includeInactive)
    {
        var query = db.Suppliers.AsQueryable();
        if (!(includeInactive ?? false))
            query = query.Where(s => s.IsActive);

        var suppliers = await query
            .OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.ContactName, s.Phone, s.Email, s.AccountNo, s.IsActive })
            .ToListAsync();

        return Ok(new { success = true, data = suppliers });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] SupplierRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { success = false, error = "Name is required." });

        var exists = await db.Suppliers.AnyAsync(s => s.Name.ToLower() == req.Name.Trim().ToLower());
        if (exists)
            return BadRequest(new { success = false, error = "A supplier with this name already exists." });

        var supplier = new Supplier
        {
            Name = req.Name.Trim(),
            ContactName = req.ContactName?.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim(),
            AccountNo = req.AccountNo?.Trim(),
            IsActive = true
        };

        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { supplier.Id, supplier.Name } });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] SupplierRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { success = false, error = "Name is required." });

        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null)
            return NotFound(new { success = false, error = "Supplier not found." });

        var exists = await db.Suppliers.AnyAsync(s => s.Name.ToLower() == req.Name.Trim().ToLower() && s.Id != id);
        if (exists)
            return BadRequest(new { success = false, error = "A supplier with this name already exists." });

        supplier.Name = req.Name.Trim();
        supplier.ContactName = req.ContactName?.Trim();
        supplier.Phone = req.Phone?.Trim();
        supplier.Email = req.Email?.Trim();
        supplier.AccountNo = req.AccountNo?.Trim();

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null)
            return NotFound(new { success = false, error = "Supplier not found." });

        supplier.IsActive = false;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }
}

public record SupplierRequest(string Name, string? ContactName, string? Phone, string? Email, string? AccountNo);
