using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaysideGarage.Core.Migrations
{
    /// <inheritdoc />
    public partial class SeedFakeData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Suppliers
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Suppliers"" (""Id"", ""Name"", ""ContactName"", ""Phone"", ""Email"", ""AccountNo"", ""IsActive"")
                VALUES
                (1, 'AutoZone SA',     'Thabo Molefe',   '011 234 5678', 'thabo@autozone.co.za',  'AZ-001', 1),
                (2, 'Motus Parts',     'Linda Botha',    '012 345 6789', 'linda@motusparts.co.za','MP-002', 1),
                (3, 'GUD Holdings',    'Piet Swanepoel', '011 987 6543', 'piet@gud.co.za',        'GH-003', 1);
            ");

            // Parts
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Parts"" (""Id"", ""PartNo"", ""Description"", ""CategoryId"", ""SupplierId"", ""CostPrice"", ""SellPrice"", ""StockQty"", ""ReorderLevel"", ""IsActive"")
                VALUES
                (1,  'FIL-OF-001',  'Oil Filter — Toyota Hilux 2.4',        3, 3,  45.00,   89.00,  24, 5,  1),
                (2,  'FIL-AF-002',  'Air Filter — Toyota Hilux 2.4',        3, 3,  55.00,  110.00,  18, 5,  1),
                (3,  'FIL-FF-003',  'Fuel Filter — Universal',              3, 3,  38.00,   75.00,  30, 8,  1),
                (4,  'BRK-PF-001',  'Brake Pads Front — Toyota Hilux',      2, 1, 180.00,  350.00,  12, 4,  1),
                (5,  'BRK-PR-002',  'Brake Pads Rear — Toyota Hilux',       2, 1, 150.00,  295.00,  10, 4,  1),
                (6,  'BRK-DS-003',  'Brake Disc Front — Toyota Hilux',      2, 1, 320.00,  620.00,   6, 2,  1),
                (7,  'ENG-TB-001',  'Timing Belt Kit — Toyota 2.4',         1, 2, 480.00,  950.00,   5, 2,  1),
                (8,  'ENG-SP-002',  'Spark Plugs Set x4 — NGK',             1, 1,  60.00,  120.00,  40, 10, 1),
                (9,  'ENG-CK-003',  'Clutch Kit — Toyota Hilux 2.4',        1, 2, 850.00, 1650.00,   3, 1,  1),
                (10, 'ELE-AL-001',  'Alternator — Toyota Hilux',            4, 2, 950.00, 1850.00,   2, 1,  1),
                (11, 'ELE-SM-002',  'Starter Motor — Toyota Hilux',         4, 2, 780.00, 1490.00,   3, 1,  1),
                (12, 'ELE-BA-003',  'Battery 627 — 60Ah',                   4, 1, 650.00, 1250.00,   8, 2,  1),
                (13, 'SUS-SF-001',  'Shock Absorber Front — Hilux',         5, 1, 420.00,  820.00,   6, 2,  1),
                (14, 'SUS-SR-002',  'Shock Absorber Rear — Hilux',          5, 1, 380.00,  740.00,   4, 2,  1),
                (15, 'SUS-WB-003',  'Wheel Bearing Front — Toyota',         5, 2, 210.00,  410.00,   3, 2,  1),
                (16, 'EXH-MG-001',  'Exhaust Manifold Gasket — Toyota 2.4', 6, 3,  35.00,   70.00,  15, 5,  1),
                (17, 'ACC-WB-001',  'Wiper Blade Set — 21/19 inch',         8, 1,  75.00,  149.00,  20, 5,  1),
                (18, 'BRK-FL-001',  'Brake Fluid DOT4 500ml',               2, 1,  28.00,   55.00,   2, 5,  1);
            ");

            // Customers
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Customers"" (""Id"", ""Name"", ""Phone"", ""Email"", ""IsTradeAccount"", ""CreditLimit"", ""Balance"", ""IsActive"")
                VALUES
                (1, 'Sipho Dlamini',  '082 111 2233', 'sipho@gmail.com',        0,     0.00,    0.00, 1),
                (2, 'ABC Taxis CC',   '011 555 0101', 'accounts@abctaxis.co.za',1,  5000.00, 1250.00, 1),
                (3, 'Maria Santos',   '073 456 7890', 'maria.s@outlook.com',    0,     0.00,    0.00, 1),
                (4, 'Joburg Motors',  '011 888 3344', 'admin@joburgmotors.co.za',1,10000.00, 3780.00, 1),
                (5, 'Peter van Wyk',  '083 222 4455', null,                     0,     0.00,    0.00, 1);
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DELETE FROM ""Parts"" WHERE ""Id"" BETWEEN 1 AND 18;");
            migrationBuilder.Sql(@"DELETE FROM ""Suppliers"" WHERE ""Id"" BETWEEN 1 AND 3;");
            migrationBuilder.Sql(@"DELETE FROM ""Customers"" WHERE ""Id"" BETWEEN 1 AND 5;");
        }
    }
}
