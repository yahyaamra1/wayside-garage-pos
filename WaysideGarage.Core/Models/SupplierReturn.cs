namespace WaysideGarage.Core.Models;

public class SupplierReturn
{
    public int Id { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int SupplierId { get; set; }
    public int PartId { get; set; }
    public int Qty { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? DebitNoteNo { get; set; }
    public decimal UnitCost { get; set; }
    public int UserId { get; set; }

    public Supplier Supplier { get; set; } = null!;
    public Part Part { get; set; } = null!;
    public User User { get; set; } = null!;
}
