using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Services;

public class LowStockEmailService(IServiceProvider services, ILogger<LowStockEmailService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Low stock email service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNext4PM();
            logger.LogInformation("Next low stock check in {Minutes} minutes.", (int)delay.TotalMinutes);

            await Task.Delay(delay, stoppingToken);
            if (stoppingToken.IsCancellationRequested) break;

            await QueueLowStockReportAsync();
        }
    }

    private static TimeSpan TimeUntilNext4PM()
    {
        var now = DateTime.Now;
        var next = now.Date.AddHours(16);
        if (now >= next) next = next.AddDays(1);
        return next - now;
    }

    private async Task QueueLowStockReportAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var lowStock = await db.Parts
            .Where(p => p.IsActive && p.StockQty <= p.ReorderLevel)
            .OrderBy(p => p.PartNo)
            .Select(p => new { p.PartNo, p.Description, p.StockQty, p.ReorderLevel })
            .ToListAsync();

        if (lowStock.Count == 0)
        {
            logger.LogInformation("Low stock check: no items below reorder level.");
            return;
        }

        var rows = string.Join("", lowStock.Select(p =>
            $"<tr><td>{p.PartNo}</td><td>{p.Description}</td>" +
            $"<td style='color:{(p.StockQty == 0 ? "#c0392b" : "#e67e22")};font-weight:600'>{p.StockQty}</td>" +
            $"<td>{p.ReorderLevel}</td></tr>"));

        var body = $"""
            <html><body style="font-family:Arial,sans-serif;color:#333">
            <h2 style="color:#1a5276">Wayside Garage — Daily Low Stock Report</h2>
            <p>{DateTime.Now:dd MMMM yyyy} — {lowStock.Count} part(s) at or below reorder level.</p>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
              <thead style="background:#1a5276;color:white">
                <tr><th>Part No</th><th>Description</th><th>Stock</th><th>Reorder Level</th></tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
            <p style="color:#888;font-size:12px">Wayside Garage POS — automated report</p>
            </body></html>
            """;

        var adminEmail = scope.ServiceProvider.GetRequiredService<IConfiguration>()["Email:AdminEmail"];

        db.EmailQueue.Add(new EmailQueue
        {
            ToEmail = adminEmail ?? "admin@waysidegarage.co.za",
            ToName = "Wayside Garage Admin",
            Subject = $"Low Stock Alert — {lowStock.Count} part(s) need restocking ({DateTime.Now:dd MMM yyyy})",
            Body = body,
            Type = EmailType.LowStockReport,
            Status = EmailStatus.Pending
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Low stock report queued: {Count} parts.", lowStock.Count);
    }
}
