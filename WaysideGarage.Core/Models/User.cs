namespace WaysideGarage.Core.Models;

public enum UserRole { Admin, Cashier }

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public bool AllowCash { get; set; } = true;

    public ICollection<Sale> Sales { get; set; } = [];
}
