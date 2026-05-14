namespace WaysideGarage.Core.Models;

public enum PaymentMethod { Cash, Card, Account }
public enum SaleStatus { Completed, Voided, Refunded }

public class Sale
{
    public int Id { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int? CustomerId { get; set; }
    public int UserId { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public SaleStatus Status { get; set; } = SaleStatus.Completed;
    public string? Notes { get; set; }

    public Customer? Customer { get; set; }
    public User User { get; set; } = null!;
    public ICollection<SaleLine> Lines { get; set; } = [];
    public ICollection<CustomerReturn> CustomerReturns { get; set; } = [];
}
