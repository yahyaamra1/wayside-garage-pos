namespace WaysideGarage.Core.Models;

public class Part
{
    public int Id { get; set; }
    public string PartNo { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public int? SupplierId { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellPrice { get; set; }
    public int StockQty { get; set; }
    public int ReorderLevel { get; set; }
    public bool IsActive { get; set; } = true;

    public Category Category { get; set; } = null!;
    public Supplier? Supplier { get; set; }
    public ICollection<SaleLine> SaleLines { get; set; } = [];
    public ICollection<SupplierReturn> SupplierReturns { get; set; } = [];
    public ICollection<POLine> POLines { get; set; } = [];
}
