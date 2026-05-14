using Microsoft.EntityFrameworkCore;
using WaysideGarage.Core.Models;

namespace WaysideGarage.Core.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Part> Parts => Set<Part>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleLine> SaleLines => Set<SaleLine>();
    public DbSet<CustomerReturn> CustomerReturns => Set<CustomerReturn>();
    public DbSet<SupplierReturn> SupplierReturns => Set<SupplierReturn>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<POLine> POLines => Set<POLine>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Part>(e =>
        {
            e.Property(p => p.CostPrice).HasColumnType("decimal(18,2)");
            e.Property(p => p.SellPrice).HasColumnType("decimal(18,2)");
            e.HasIndex(p => p.PartNo).IsUnique();
        });

        b.Entity<Sale>(e =>
        {
            e.Property(s => s.SubTotal).HasColumnType("decimal(18,2)");
            e.Property(s => s.DiscountAmount).HasColumnType("decimal(18,2)");
            e.Property(s => s.Total).HasColumnType("decimal(18,2)");
        });

        b.Entity<SaleLine>(e =>
        {
            e.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)");
            e.Property(l => l.DiscountPct).HasColumnType("decimal(5,2)");
            e.Property(l => l.LineTotal).HasColumnType("decimal(18,2)");
        });

        b.Entity<Customer>(e =>
        {
            e.Property(c => c.CreditLimit).HasColumnType("decimal(18,2)");
            e.Property(c => c.Balance).HasColumnType("decimal(18,2)");
        });

        b.Entity<CustomerReturn>(e =>
        {
            e.Property(r => r.RefundAmount).HasColumnType("decimal(18,2)");
        });

        b.Entity<SupplierReturn>(e =>
        {
            e.Property(r => r.UnitCost).HasColumnType("decimal(18,2)");
        });

        b.Entity<POLine>(e =>
        {
            e.Property(l => l.UnitCost).HasColumnType("decimal(18,2)");
        });

        // Seed data
        b.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Engine Parts" },
            new Category { Id = 2, Name = "Brakes" },
            new Category { Id = 3, Name = "Filters" },
            new Category { Id = 4, Name = "Electrical" },
            new Category { Id = 5, Name = "Suspension" },
            new Category { Id = 6, Name = "Exhaust" },
            new Category { Id = 7, Name = "Body Parts" },
            new Category { Id = 8, Name = "Accessories" }
        );

        b.Entity<User>().HasData(new User
        {
            Id = 1,
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            FullName = "Administrator",
            Role = UserRole.Admin,
            IsActive = true
        });
    }
}
