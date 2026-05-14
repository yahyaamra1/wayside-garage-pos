using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WaysideGarage.Core.Data;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { success = false, error = "Username and password are required." });

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { success = false, error = "Invalid username or password." });

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

        return Ok(new
        {
            success = true,
            data = new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                user = new { user.Id, user.Username, user.FullName, role = user.Role.ToString() }
            }
        });
    }
}

public record LoginRequest(string Username, string Password);
