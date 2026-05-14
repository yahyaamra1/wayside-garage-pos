namespace WaysideGarage.Core.Models;

public class SaleLine
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public int PartId { get; set; }
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }
    public decimal LineTotal { get; set; }

    public Sale Sale { get; set; } = null!;
    public Part Part { get; set; } = null!;
    public ICollection<CustomerReturn> CustomerReturns { get; set; } = [];
}
