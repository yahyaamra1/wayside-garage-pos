namespace WaysideGarage.Core.Models;

public enum POStatus { Open, PartialReceived, Received, Cancelled }

public class PurchaseOrder
{
    public int Id { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int SupplierId { get; set; }
    public POStatus Status { get; set; } = POStatus.Open;
    public string? Notes { get; set; }
    public int UserId { get; set; }

    public Supplier Supplier { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<POLine> Lines { get; set; } = [];
}

public class POLine
{
    public int Id { get; set; }
    public int PurchaseOrderId { get; set; }
    public int PartId { get; set; }
    public int QtyOrdered { get; set; }
    public int QtyReceived { get; set; }
    public decimal UnitCost { get; set; }

    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Part Part { get; set; } = null!;
}
