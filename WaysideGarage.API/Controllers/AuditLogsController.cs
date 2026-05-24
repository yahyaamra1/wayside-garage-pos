using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? action,
        [FromQuery] int? userId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId);

        if (DateTime.TryParse(from, out var fromDate))
            query = query.Where(a => a.Timestamp >= fromDate.ToUniversalTime());

        if (DateTime.TryParse(to, out var toDate))
            query = query.Where(a => a.Timestamp < toDate.AddDays(1).ToUniversalTime());

        var total = await query.CountAsync();

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.Timestamp,
                a.UserId,
                a.Username,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.Detail,
                a.IpAddress
            })
            .ToListAsync();

        return Ok(new { success = true, data = new { logs, total, page, pageSize } });
    }

    [HttpGet("actions")]
    public async Task<IActionResult> GetActions()
    {
        var actions = await db.AuditLogs
            .Select(a => a.Action)
            .Distinct()
            .OrderBy(a => a)
            .ToListAsync();
        return Ok(new { success = true, data = actions });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await db.AuditLogs
            .Where(a => a.UserId != null)
            .Select(a => new { a.UserId, a.Username })
            .Distinct()
            .OrderBy(a => a.Username)
            .ToListAsync();
        return Ok(new { success = true, data = users });
    }
}
