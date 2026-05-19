using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/email-queue")]
[Authorize(Roles = "Admin")]
public class EmailQueueController(AppDbContext db, EmailService emailService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var query = db.EmailQueue.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<EmailStatus>(status, true, out var s))
            query = query.Where(e => e.Status == s);

        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Take(100)
            .Select(e => new
            {
                e.Id,
                e.ToEmail,
                e.ToName,
                e.Subject,
                e.Type,
                Status = e.Status.ToString(),
                CreatedAt = e.CreatedAt.ToLocalTime(),
                SentAt = e.SentAt.HasValue ? e.SentAt.Value.ToLocalTime() : (DateTime?)null,
                e.ErrorMessage,
                e.RelatedId
            })
            .ToListAsync();

        return Ok(new { success = true, data = items });
    }

    [HttpGet("{id}/body")]
    public async Task<IActionResult> GetBody(int id)
    {
        var item = await db.EmailQueue.FindAsync(id);
        if (item is null) return NotFound(new { success = false, error = "Not found." });
        return Ok(new { success = true, data = new { item.Body } });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var item = await db.EmailQueue.FindAsync(id);
        if (item is null) return NotFound(new { success = false, error = "Not found." });
        if (item.Status != EmailStatus.Pending)
            return BadRequest(new { success = false, error = "Only pending emails can be approved." });

        item.Status = EmailStatus.Approved;
        await db.SaveChangesAsync();

        await emailService.ProcessQueueItemAsync(db, id);

        var updated = await db.EmailQueue.FindAsync(id);
        return Ok(new { success = true, data = new { status = updated!.Status.ToString(), updated.ErrorMessage } });
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var item = await db.EmailQueue.FindAsync(id);
        if (item is null) return NotFound(new { success = false, error = "Not found." });
        if (item.Status != EmailStatus.Pending)
            return BadRequest(new { success = false, error = "Only pending emails can be rejected." });

        item.Status = EmailStatus.Rejected;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { } });
    }
}
