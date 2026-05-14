using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController(AppDbContext db) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { success = true, data = Array.Empty<object>() });

        var term = q.Trim().ToLower();

        var customers = await db.Customers
            .Where(c => c.IsActive &&
                (c.Name.ToLower().Contains(term) || (c.Phone != null && c.Phone.Contains(term))))
            .OrderBy(c => c.Name)
            .Take(20)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Phone,
                c.IsTradeAccount,
                c.Balance,
                c.CreditLimit
            })
            .ToListAsync();

        return Ok(new { success = true, data = customers });
    }
}
