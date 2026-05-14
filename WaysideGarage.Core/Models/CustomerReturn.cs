namespace WaysideGarage.Core.Models;

public enum ReturnOutcome { Refund, StoreCredit, Exchange }

public class CustomerReturn
{
    public int Id { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int SaleId { get; set; }
    public int SaleLineId { get; set; }
    public int Qty { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ReturnOutcome Outcome { get; set; }
    public decimal RefundAmount { get; set; }
    public bool StockRestored { get; set; }
    public int UserId { get; set; }

    public Sale Sale { get; set; } = null!;
    public SaleLine SaleLine { get; set; } = null!;
    public User User { get; set; } = null!;
}
