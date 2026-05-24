using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/jobcards")]
[Authorize]
public class JobCardsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? q)
    {
        var query = db.JobCards
            .Include(j => j.Customer)
            .Include(j => j.CreatedBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<JobCardStatus>(status, out var s))
            query = query.Where(j => j.Status == s);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(j =>
                j.JobNo.ToLower().Contains(term) ||
                j.VehicleReg.ToLower().Contains(term) ||
                j.VehicleMake.ToLower().Contains(term) ||
                j.VehicleModel.ToLower().Contains(term) ||
                (j.Customer != null && j.Customer.Name.ToLower().Contains(term)));
        }

        var cards = await query
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new
            {
                j.Id,
                j.JobNo,
                Customer = j.Customer == null ? null : j.Customer.Name,
                j.VehicleReg,
                j.VehicleMake,
                j.VehicleModel,
                Status = j.Status.ToString(),
                CreatedAt = j.CreatedAt.ToLocalTime(),
                LineCount = j.Lines.Count
            })
            .ToListAsync();

        return Ok(new { success = true, data = cards });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var job = await db.JobCards
            .Include(j => j.Customer)
            .Include(j => j.CreatedBy)
            .Include(j => j.Lines).ThenInclude(l => l.Part)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job is null)
            return NotFound(new { success = false, error = "Job card not found." });

        return Ok(new
        {
            success = true,
            data = new
            {
                job.Id,
                job.JobNo,
                Customer = job.Customer == null ? null : new { job.Customer.Id, job.Customer.Name, job.Customer.Phone },
                job.VehicleReg,
                job.VehicleMake,
                job.VehicleModel,
                job.Mileage,
                Status = job.Status.ToString(),
                job.Notes,
                CreatedAt = job.CreatedAt.ToLocalTime(),
                CompletedAt = job.CompletedAt?.ToLocalTime(),
                CreatedBy = job.CreatedBy.FullName,
                Lines = job.Lines.Select(l => new
                {
                    l.Id,
                    Type = l.Type.ToString(),
                    l.Description,
                    l.UnitPrice,
                    l.Qty,
                    LineTotal = l.UnitPrice * l.Qty,
                    PartNo = l.Part?.PartNo
                }),
                Total = job.Lines.Sum(l => l.UnitPrice * l.Qty)
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JobCardRequest req)
    {
        var validation = ValidateRequest(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Auto-generate job number
        var lastId = await db.JobCards.MaxAsync(j => (int?)j.Id) ?? 0;
        var jobNo = $"JC-{(lastId + 1):D5}";

        var job = new JobCard
        {
            JobNo = jobNo,
            CustomerId = req.CustomerId,
            VehicleReg = req.VehicleReg.Trim().ToUpper(),
            VehicleMake = req.VehicleMake.Trim(),
            VehicleModel = req.VehicleModel.Trim(),
            Mileage = req.Mileage,
            Notes = req.Notes?.Trim(),
            Status = JobCardStatus.Open,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = userId
        };

        db.JobCards.Add(job);
        await db.SaveChangesAsync();

        foreach (var line in req.Lines ?? [])
        {
            if (!Enum.TryParse<JobLineType>(line.Type, out var lineType))
                return BadRequest(new { success = false, error = $"Invalid line type: {line.Type}." });

            db.JobCardLines.Add(new JobCardLine
            {
                JobCardId = job.Id,
                Type = lineType,
                Description = line.Description.Trim(),
                UnitPrice = line.UnitPrice,
                Qty = line.Qty,
                PartId = line.PartId
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { job.Id, job.JobNo } });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] JobCardRequest req)
    {
        var validation = ValidateRequest(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var job = await db.JobCards.Include(j => j.Lines).FirstOrDefaultAsync(j => j.Id == id);
        if (job is null)
            return NotFound(new { success = false, error = "Job card not found." });

        if (job.Status == JobCardStatus.Cancelled)
            return BadRequest(new { success = false, error = "Cannot edit a cancelled job card." });

        job.CustomerId = req.CustomerId;
        job.VehicleReg = req.VehicleReg.Trim().ToUpper();
        job.VehicleMake = req.VehicleMake.Trim();
        job.VehicleModel = req.VehicleModel.Trim();
        job.Mileage = req.Mileage;
        job.Notes = req.Notes?.Trim();

        db.JobCardLines.RemoveRange(job.Lines);

        foreach (var line in req.Lines ?? [])
        {
            if (!Enum.TryParse<JobLineType>(line.Type, out var lineType))
                return BadRequest(new { success = false, error = $"Invalid line type: {line.Type}." });

            db.JobCardLines.Add(new JobCardLine
            {
                JobCardId = job.Id,
                Type = lineType,
                Description = line.Description.Trim(),
                UnitPrice = line.UnitPrice,
                Qty = line.Qty,
                PartId = line.PartId
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest req)
    {
        if (!Enum.TryParse<JobCardStatus>(req.Status, out var newStatus))
            return BadRequest(new { success = false, error = "Invalid status." });

        var job = await db.JobCards.FindAsync(id);
        if (job is null)
            return NotFound(new { success = false, error = "Job card not found." });

        if (job.Status == JobCardStatus.Cancelled)
            return BadRequest(new { success = false, error = "Cannot change status of a cancelled job card." });

        job.Status = newStatus;
        if (newStatus == JobCardStatus.Completed && job.CompletedAt is null)
            job.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { status = newStatus.ToString() } });
    }

    private static string? ValidateRequest(JobCardRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.VehicleReg)) return "Vehicle registration is required.";
        if (string.IsNullOrWhiteSpace(req.VehicleMake)) return "Vehicle make is required.";
        if (string.IsNullOrWhiteSpace(req.VehicleModel)) return "Vehicle model is required.";
        return null;
    }
}

public record JobCardRequest(
    int? CustomerId,
    string VehicleReg,
    string VehicleMake,
    string VehicleModel,
    int? Mileage,
    string? Notes,
    List<JobCardLineRequest>? Lines
);

public record JobCardLineRequest(
    string Type,
    string Description,
    decimal UnitPrice,
    decimal Qty,
    int? PartId
);

public record UpdateStatusRequest(string Status);
