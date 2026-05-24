using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController(AppDbContext db, AuditService audit) : ControllerBase
{
    // ── POS quick search ─────────────────────────────────────────────────

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { success = true, data = Array.Empty<object>() });

        var term = q.Trim().ToLower();

        var customers = await db.Customers
            .Where(c => c.IsActive &&
                (c.Name.ToLower().Contains(term) || (c.Phone != null && c.Phone.Contains(term))))
            .OrderBy(c => c.Name)
            .Take(20)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Phone,
                c.IsTradeAccount,
                c.Balance,
                c.CreditLimit
            })
            .ToListAsync();

        return Ok(new { success = true, data = customers });
    }

    // ── List ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] bool? tradeOnly,
        [FromQuery] bool? includeInactive)
    {
        var query = db.Customers.AsQueryable();

        if (!(includeInactive ?? false))
            query = query.Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }

        if (tradeOnly == true)
            query = query.Where(c => c.IsTradeAccount);

        var customers = await query
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Phone,
                c.Email,
                c.IsTradeAccount,
                c.Balance,
                c.CreditLimit,
                c.IsActive,
                SaleCount = c.Sales.Count
            })
            .ToListAsync();

        return Ok(new { success = true, data = customers });
    }

    // ── Detail ───────────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null)
            return NotFound(new { success = false, error = "Customer not found." });

        var recentSales = await db.Sales
            .Where(s => s.CustomerId == id && s.Status == SaleStatus.Completed)
            .OrderByDescending(s => s.Date)
            .Take(20)
            .Select(s => new
            {
                s.Id,
                Date = s.Date.ToLocalTime(),
                s.Total,
                PaymentMethod = s.PaymentMethod.ToString(),
                LineCount = s.Lines.Count
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                customer.Id,
                customer.Name,
                customer.Phone,
                customer.Email,
                customer.IsTradeAccount,
                customer.Balance,
                customer.CreditLimit,
                AvailableCredit = Math.Max(0, customer.CreditLimit - customer.Balance),
                customer.IsActive,
                RecentSales = recentSales
            }
        });
    }

    // ── Statement (trade accounts) ───────────────────────────────────────

    [HttpGet("{id}/statement")]
    public async Task<IActionResult> Statement(int id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null)
            return NotFound(new { success = false, error = "Customer not found." });

        // Sales on account
        var sales = await db.Sales
            .Where(s => s.CustomerId == id && s.PaymentMethod == PaymentMethod.Account && s.Status == SaleStatus.Completed)
            .Select(s => new
            {
                Date = s.Date.ToLocalTime(),
                Type = "Sale",
                Reference = $"Invoice #{s.Id:D6}",
                Debit = (decimal?)s.Total,
                Credit = (decimal?)null
            })
            .ToListAsync();

        // Returns that reduced balance
        var returns = await db.CustomerReturns
            .Where(r => r.Sale.CustomerId == id &&
                r.Sale.PaymentMethod == PaymentMethod.Account &&
                (r.Outcome == ReturnOutcome.Refund || r.Outcome == ReturnOutcome.StoreCredit))
            .Select(r => new
            {
                Date = r.Date.ToLocalTime(),
                Type = "Return",
                Reference = $"Invoice #{r.SaleId:D6} return",
                Debit = (decimal?)null,
                Credit = (decimal?)r.RefundAmount
            })
            .ToListAsync();

        // Payments
        var payments = await db.CustomerPayments
            .Where(p => p.CustomerId == id)
            .Select(p => new
            {
                Date = p.Date.ToLocalTime(),
                Type = "Payment",
                Reference = p.Reference ?? "Payment",
                Debit = (decimal?)null,
                Credit = (decimal?)p.Amount
            })
            .ToListAsync();

        var allEntries = sales
            .Concat(returns)
            .Concat(payments)
            .OrderBy(e => e.Date)
            .ToList();

        // Running balance
        decimal running = 0;
        var statement = allEntries.Select(e =>
        {
            running += (e.Debit ?? 0) - (e.Credit ?? 0);
            return new { e.Date, e.Type, e.Reference, e.Debit, e.Credit, RunningBalance = running };
        }).ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                customer.Name,
                customer.Balance,
                customer.CreditLimit,
                Entries = statement
            }
        });
    }

    // ── Create ───────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomerRequest req)
    {
        var validation = Validate(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var customer = new Customer
        {
            Name = req.Name.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim(),
            IsTradeAccount = req.IsTradeAccount,
            CreditLimit = req.IsTradeAccount ? req.CreditLimit : 0,
            Balance = 0,
            IsActive = true
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        await audit.LogAsync("Customer.Create", "Customer", customer.Id.ToString(), $"{req.Name}");

        return Ok(new { success = true, data = new { customer.Id } });
    }

    // ── Update ───────────────────────────────────────────────────────────

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CustomerRequest req)
    {
        var validation = Validate(req);
        if (validation != null) return BadRequest(new { success = false, error = validation });

        var customer = await db.Customers.FindAsync(id);
        if (customer is null)
            return NotFound(new { success = false, error = "Customer not found." });

        customer.Name = req.Name.Trim();
        customer.Phone = req.Phone?.Trim();
        customer.Email = req.Email?.Trim();
        customer.IsTradeAccount = req.IsTradeAccount;
        customer.CreditLimit = req.IsTradeAccount ? req.CreditLimit : 0;

        await db.SaveChangesAsync();

        await audit.LogAsync("Customer.Update", "Customer", id.ToString(), $"Customer {id} updated");

        return Ok(new { success = true, data = new { } });
    }

    // ── Deactivate ───────────────────────────────────────────────────────

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null)
            return NotFound(new { success = false, error = "Customer not found." });

        customer.IsActive = false;
        await db.SaveChangesAsync();
        return Ok(new { success = true, data = new { } });
    }

    // ── Record payment ───────────────────────────────────────────────────

    [HttpPost("{id}/payment")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] PaymentRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest(new { success = false, error = "Amount must be greater than zero." });

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var customer = await db.Customers.FindAsync(id);
        if (customer is null)
            return NotFound(new { success = false, error = "Customer not found." });

        if (!customer.IsTradeAccount)
            return BadRequest(new { success = false, error = "Payments can only be recorded for trade accounts." });

        if (req.Amount > customer.Balance)
            return BadRequest(new { success = false, error = $"Payment of R{req.Amount:F2} exceeds outstanding balance of R{customer.Balance:F2}." });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.CustomerPayments.Add(new CustomerPayment
            {
                CustomerId = id,
                Amount = req.Amount,
                Reference = req.Reference?.Trim(),
                Notes = req.Notes?.Trim(),
                UserId = userId,
                Date = DateTime.UtcNow
            });

            customer.Balance -= req.Amount;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { success = false, error = "Payment failed." });
        }

        await audit.LogAsync("Customer.Payment", "Customer", id.ToString(), $"Payment R {req.Amount:F2} recorded for customer {id}");

        return Ok(new { success = true, data = new { newBalance = customer.Balance } });
    }

    private static string? Validate(CustomerRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return "Name is required.";
        if (req.IsTradeAccount && req.CreditLimit < 0) return "Credit limit cannot be negative.";
        return null;
    }
}

public record CustomerRequest(
    string Name,
    string? Phone,
    string? Email,
    bool IsTradeAccount,
    decimal CreditLimit
);

public record PaymentRequest(decimal Amount, string? Reference, string? Notes);
