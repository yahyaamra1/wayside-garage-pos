namespace WaysideGarage.Core.Models;

public class CustomerPayment
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public int UserId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Customer Customer { get; set; } = null!;
    public User User { get; set; } = null!;
}
