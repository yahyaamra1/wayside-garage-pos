using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;

namespace WaysideGarage.API.Controllers;

// Simple in-memory failed login tracker (resets on restart — acceptable for single-server deployment)
internal static class LoginAttemptTracker
{
    private static readonly ConcurrentDictionary<string, (int Count, DateTime LockoutUntil)> _attempts = new();

    public static bool IsLockedOut(string username)
    {
        if (_attempts.TryGetValue(username.ToLower(), out var entry))
            return entry.LockoutUntil > DateTime.UtcNow;
        return false;
    }

    public static void RecordFailure(string username)
    {
        var key = username.ToLower();
        _attempts.AddOrUpdate(key,
            _ => (1, DateTime.UtcNow.AddMinutes(1)),
            (_, existing) =>
            {
                var count = existing.Count + 1;
                var lockout = count >= 5 ? DateTime.UtcNow.AddMinutes(15) : existing.LockoutUntil;
                return (count, lockout);
            });
    }

    public static void RecordSuccess(string username)
    {
        _attempts.TryRemove(username.ToLower(), out _);
    }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config, AuditService audit) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { success = false, error = "Username and password are required." });

        if (LoginAttemptTracker.IsLockedOut(req.Username))
        {
            await audit.LogAsync("Login.Blocked", "User", null, $"Blocked login attempt for username: {req.Username}");
            return StatusCode(429, new { success = false, error = "Too many failed attempts. Try again in 15 minutes." });
        }

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            LoginAttemptTracker.RecordFailure(req.Username);
            await audit.LogAsync("Login.Failure", "User", null, $"Failed login attempt for username: {req.Username}");
            return Unauthorized(new { success = false, error = "Invalid username or password." });
        }

        LoginAttemptTracker.RecordSuccess(req.Username);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var expiry = int.Parse(config["Jwt:ExpiryMinutes"] ?? "480");

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            ],
            expires: DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        await audit.LogAsync("Login.Success", "User", user.Id.ToString(), $"{user.Username} logged in", user.Id, user.Username);

        return Ok(new
        {
            success = true,
            data = new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                user = new { user.Id, user.Username, user.FullName, role = user.Role.ToString(), allowCash = user.AllowCash }
            }
        });
    }
}

public record LoginRequest(string Username, string Password);
