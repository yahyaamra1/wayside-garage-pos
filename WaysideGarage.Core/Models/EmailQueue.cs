namespace WaysideGarage.Core.Models;

public enum EmailType   { BalanceAlert, LowStockReport, SupplierReturnPdf }
public enum EmailStatus { Pending, Approved, Sent, Rejected, Failed }

public class EmailQueue
{
    public int Id { get; set; }
    public string ToEmail { get; set; } = string.Empty;
    public string ToName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public EmailType Type { get; set; }
    public EmailStatus Status { get; set; } = EmailStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int? RelatedId { get; set; }
}
