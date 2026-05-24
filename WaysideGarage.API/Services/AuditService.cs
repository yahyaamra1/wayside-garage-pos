using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Services;

public class AuditService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
{
    public async Task LogAsync(string action, string? entityType = null, string? entityId = null, string? detail = null, int? userId = null, string? username = null)
    {
        var ctx = httpContextAccessor.HttpContext;
        var resolvedUserId = userId;
        var resolvedUsername = username ?? "";

        if (resolvedUserId is null && ctx?.User.Identity?.IsAuthenticated == true)
        {
            var idClaim = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var nameClaim = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            if (int.TryParse(idClaim, out var id)) resolvedUserId = id;
            resolvedUsername = nameClaim ?? "";
        }

        var ip = ctx?.Connection.RemoteIpAddress?.ToString();

        db.AuditLogs.Add(new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            UserId = resolvedUserId,
            Username = resolvedUsername,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Detail = detail,
            IpAddress = ip
        });
        await db.SaveChangesAsync();
    }
}
