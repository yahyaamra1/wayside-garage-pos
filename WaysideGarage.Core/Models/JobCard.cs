namespace WaysideGarage.Core.Models;

public enum JobCardStatus { Open, InProgress, Completed, Cancelled }
public enum JobLineType { Labour, Part }

public class JobCard
{
    public int Id { get; set; }
    public string JobNo { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string VehicleReg { get; set; } = string.Empty;
    public string VehicleMake { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public int? Mileage { get; set; }
    public JobCardStatus Status { get; set; } = JobCardStatus.Open;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int CreatedByUserId { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<JobCardLine> Lines { get; set; } = [];
}

public class JobCardLine
{
    public int Id { get; set; }
    public int JobCardId { get; set; }
    public JobCard JobCard { get; set; } = null!;
    public JobLineType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal Qty { get; set; }
    public int? PartId { get; set; }
    public Part? Part { get; set; }
}
