namespace WaysideGarage.Core.Models;

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? AccountNo { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Part> Parts { get; set; } = [];
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
    public ICollection<SupplierReturn> SupplierReturns { get; set; } = [];
}
