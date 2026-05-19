using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    public async Task<bool> SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var host = config["Email:SmtpHost"];
        var port = int.Parse(config["Email:SmtpPort"] ?? "587");
        var username = config["Email:Username"];
        var password = config["Email:Password"];
        var fromAddress = config["Email:FromAddress"];
        var fromName = config["Email:FromName"] ?? "Wayside Garage";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Email not configured — skipping send to {ToEmail}", toEmail);
            return false;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddress ?? string.Empty));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(username ?? string.Empty, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {ToEmail}", toEmail);
            return false;
        }
    }

    public async Task ProcessQueueItemAsync(AppDbContext db, int queueId)
    {
        var item = await db.EmailQueue.FindAsync(queueId);
        if (item is null || item.Status != EmailStatus.Approved) return;

        var sent = await SendAsync(item.ToEmail, item.ToName, item.Subject, item.Body);

        item.Status = sent ? EmailStatus.Sent : EmailStatus.Failed;
        item.SentAt = sent ? DateTime.UtcNow : null;
        item.ErrorMessage = sent ? null : "SMTP delivery failed — check server logs.";
        await db.SaveChangesAsync();
    }
}
