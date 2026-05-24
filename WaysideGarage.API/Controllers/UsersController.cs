using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController(AppDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var users = await db.Users
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.FullName,
                Role = u.Role.ToString(),
                u.IsActive,
                u.AllowCash
            })
            .ToListAsync();

        return Ok(new { success = true, data = users });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username)) return BadRequest(new { success = false, error = "Username is required." });
        if (string.IsNullOrWhiteSpace(req.Password)) return BadRequest(new { success = false, error = "Password is required." });
        if (req.Password.Length < 8) return BadRequest(new { success = false, error = "Password must be at least 8 characters." });
        if (string.IsNullOrWhiteSpace(req.FullName)) return BadRequest(new { success = false, error = "Full name is required." });

        var exists = await db.Users.AnyAsync(u => u.Username.ToLower() == req.Username.Trim().ToLower());
        if (exists) return BadRequest(new { success = false, error = "Username already exists." });

        var user = new User
        {
            Username = req.Username.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FullName = req.FullName.Trim(),
            Role = Enum.TryParse<UserRole>(req.Role, true, out var role) ? role : UserRole.Cashier,
            IsActive = true,
            AllowCash = req.AllowCash
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        await audit.LogAsync("User.Create", "User", user.Id.ToString(), $"User '{req.Username}' created with role {req.Role}");

        return Ok(new { success = true, data = new { user.Id } });
    }

    [HttpPatch("{id}/allowcash")]
    public async Task<IActionResult> SetAllowCash(int id, [FromBody] SetAllowCashRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { success = false, error = "User not found." });

        user.AllowCash = req.AllowCash;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { } });
    }

    [HttpPatch("{id}/active")]
    public async Task<IActionResult> SetActive(int id, [FromBody] SetActiveRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { success = false, error = "User not found." });

        user.IsActive = req.IsActive;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = new { } });
    }

    [HttpPatch("{id}/password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
            return BadRequest(new { success = false, error = "Password must be at least 8 characters." });

        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "User not found." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();

        await audit.LogAsync("User.PasswordChange", "User", id.ToString(), $"Password changed for user {id}");

        return Ok(new { success = true });
    }
}

public record CreateUserRequest(string Username, string Password, string FullName, string Role, bool AllowCash);
public record SetAllowCashRequest(bool AllowCash);
public record SetActiveRequest(bool IsActive);
public record ChangePasswordRequest(string NewPassword);
