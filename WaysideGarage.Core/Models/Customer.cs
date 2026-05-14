namespace WaysideGarage.Core.Models;

public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsTradeAccount { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Sale> Sales { get; set; } = [];
}
