namespace WaysideGarage.Core.Models;

public class StockAdjustment
{
    public int Id { get; set; }
    public int PartId { get; set; }
    public int QtyBefore { get; set; }
    public int AdjustmentQty { get; set; }
    public int QtyAfter { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int UserId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Part Part { get; set; } = null!;
    public User User { get; set; } = null!;
}
