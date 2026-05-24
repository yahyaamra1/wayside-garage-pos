using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WaysideGarage.API.Services;
using WaysideGarage.Core.Data;
using WaysideGarage.Core.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (builder.Environment.IsDevelopment())
        opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=wayside_dev.db");
    else
        opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddHostedService<LowStockEmailService>();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(5);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.RejectionStatusCode = 429;
});

// In production the React app is served from wwwroot — CORS only needed in dev
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(p => p
            .WithOrigins("http://localhost:5173", "https://localhost:5173")
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .WithHeaders("Authorization", "Content-Type")));
}

var app = builder.Build();

// Initialise database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (app.Environment.IsDevelopment())
    {
        db.Database.EnsureCreated();

        // Seed dev data if database is empty
        if (!db.Users.Any())
        {
            db.Users.AddRange(
                new User { Username = "admin",   PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),   FullName = "Admin User",    Role = UserRole.Admin,   IsActive = true, AllowCash = true },
                new User { Username = "cashier", PasswordHash = BCrypt.Net.BCrypt.HashPassword("cashier123"), FullName = "Cashier User",  Role = UserRole.Cashier, IsActive = true, AllowCash = true }
            );

            db.Categories.AddRange(
                new Category { Name = "Brake Parts" },
                new Category { Name = "Engine Parts" },
                new Category { Name = "Filters" },
                new Category { Name = "Suspension" },
                new Category { Name = "Electrical" },
                new Category { Name = "Tyres & Wheels" },
                new Category { Name = "Lubricants & Fluids" }
            );

            db.Suppliers.AddRange(
                new Supplier { Name = "AutoZone SA",       ContactName = "John Smith",  Phone = "011 123 4567", Email = "orders@autozone.co.za",  AccountNo = "AZ-001" },
                new Supplier { Name = "Midas Distributors",ContactName = "Sarah Jones", Phone = "011 987 6543", Email = "orders@midas.co.za",      AccountNo = "MD-042" },
                new Supplier { Name = "Repco Parts SA",    ContactName = "Mike van der Berg", Phone = "021 555 8800", Email = "sales@repco.co.za", AccountNo = "RP-007" }
            );

            db.SaveChanges();

            // Add parts after categories and suppliers are saved (need their IDs)
            var brakes   = db.Categories.First(c => c.Name == "Brake Parts");
            var engine   = db.Categories.First(c => c.Name == "Engine Parts");
            var filters  = db.Categories.First(c => c.Name == "Filters");
            var susp     = db.Categories.First(c => c.Name == "Suspension");
            var autozone = db.Suppliers.First(s => s.Name == "AutoZone SA");
            var midas    = db.Suppliers.First(s => s.Name == "Midas Distributors");

            db.Parts.AddRange(
                new Part { PartNo = "BP-4321", Description = "Front Brake Pad Set",       CategoryId = brakes.Id,  SupplierId = autozone.Id, CostPrice = 185.00m, SellPrice = 295.00m, StockQty = 12, ReorderLevel = 4, IsActive = true },
                new Part { PartNo = "BR-1100", Description = "Rear Brake Pad Set",        CategoryId = brakes.Id,  SupplierId = autozone.Id, CostPrice = 150.00m, SellPrice = 240.00m, StockQty = 8,  ReorderLevel = 4, IsActive = true },
                new Part { PartNo = "OIL-F15", Description = "Oil Filter 15W-40",         CategoryId = filters.Id, SupplierId = midas.Id,    CostPrice =  45.00m, SellPrice =  79.00m, StockQty = 25, ReorderLevel = 8, IsActive = true },
                new Part { PartNo = "AIR-F22", Description = "Air Filter — Universal",    CategoryId = filters.Id, SupplierId = midas.Id,    CostPrice =  60.00m, SellPrice =  99.00m, StockQty = 15, ReorderLevel = 5, IsActive = true },
                new Part { PartNo = "SP-NGK8", Description = "NGK Spark Plug (each)",     CategoryId = engine.Id,  SupplierId = autozone.Id, CostPrice =  28.00m, SellPrice =  49.00m, StockQty = 40, ReorderLevel = 10, IsActive = true },
                new Part { PartNo = "SH-KYB1", Description = "KYB Shock Absorber Front",  CategoryId = susp.Id,    SupplierId = midas.Id,    CostPrice = 420.00m, SellPrice = 650.00m, StockQty = 4,  ReorderLevel = 2, IsActive = true }
            );

            db.Customers.AddRange(
                new Customer { Name = "Walk-in Customer",  Phone = "",               Email = "",                      IsTradeAccount = false, CreditLimit = 0,       Balance = 0,       IsActive = true },
                new Customer { Name = "ABC Garage",        Phone = "011 456 7890",   Email = "accounts@abcgarage.co.za", IsTradeAccount = true,  CreditLimit = 5000.00m, Balance = 1200.00m, IsActive = true },
                new Customer { Name = "City Fleet Services",Phone = "021 333 4444",  Email = "fleet@cityfleet.co.za",   IsTradeAccount = true,  CreditLimit = 10000.00m,Balance = 3400.00m, IsActive = true }
            );

            db.SaveChanges();
        }
    }
    else
    {
        db.Database.Migrate();
    }
}

app.UseExceptionHandler(err => err.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsJsonAsync(new { success = false, error = "An unexpected error occurred." });
}));

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    await next();
});

if (builder.Environment.IsDevelopment())
    app.UseCors();

// Serve React SPA in production
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

// Fallback for React client-side routing
app.MapFallbackToFile("index.html");

app.Run();
