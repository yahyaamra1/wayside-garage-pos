using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaysideGarage.Core.Migrations
{
    public partial class SeedFakeData : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Users ──────────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Users"" (""Id"", ""Username"", ""PasswordHash"", ""FullName"", ""Role"", ""IsActive"")
                VALUES (2, 'cashier', '$2a$11$7PLzj19LmYzfM7OKMHDeUe0dpKfxCRGTZfy7hqK4NjcHB.3UTMlXK', 'Jane Sithole', 1, 1);
            ");

            // ── Suppliers ──────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Suppliers"" (""Id"", ""Name"", ""ContactName"", ""Phone"", ""Email"", ""AccountNo"", ""IsActive"")
                VALUES
                (1, 'Midas Auto Parts',    'Barry Malan',    '011 555 0101', 'orders@midas.co.za',         'MIDAS-001', 1),
                (2, 'First Auto Parts',    'Priya Govender', '031 555 0202', 'sales@firstauto.co.za',       'FAP-002',   1),
                (3, 'Toyota Parts Direct', 'Johan du Toit',  '012 555 0303', 'parts@toyotadirect.co.za',    'TPD-003',   1),
                (4, 'Bosch Automotive SA', 'Karen Smit',     '021 555 0404', 'k.smit@bosch.co.za',          'BOSCH-004', 1),
                (5, 'Ferodo Brakes SA',    'Sipho Khumalo',  '011 555 0505', 'sipho@ferodo.co.za',          'FER-005',   1);
            ");

            // ── Parts (25) ─────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Parts"" (""Id"", ""PartNo"", ""Description"", ""CategoryId"", ""SupplierId"", ""CostPrice"", ""SellPrice"", ""StockQty"", ""ReorderLevel"", ""IsActive"")
                VALUES
                -- Filters (Cat 3)
                ( 1, 'OF-001',  'Oil Filter — 5L Capacity',                3, 1,   45.00,   85.00,  8, 5, 1),
                ( 7, 'AF-001',  'Air Filter — Paper Element',               3, 4,   65.00,  120.00, 10, 8, 1),
                ( 8, 'FF-001',  'Fuel Filter — Inline',                     3, 1,   55.00,  100.00,  7, 5, 1),
                (18, 'CF-001',  'Cabin Air Filter',                         3, 4,   75.00,  135.00,  8, 5, 1),
                -- Engine Parts (Cat 1)
                ( 2, 'SP-001',  'Spark Plug NGK BPR6ES (Pack of 4)',        1, 4,  120.00,  220.00, 12,10, 1),
                ( 3, 'TB-001',  'Timing Belt Kit',                          1, 2,  280.00,  480.00,  3, 5, 1),
                (19, 'GS-001',  'Head Gasket Set',                          1, 3,  420.00,  720.00,  2, 2, 1),
                (25, 'PRS-001', 'Piston Ring Set — Standard',               1, 3,  650.00, 1100.00,  1, 2, 1),
                -- Brakes (Cat 2)
                ( 4, 'FBP-001', 'Front Brake Pads — Set',                   2, 5,  180.00,  320.00,  6, 5, 1),
                ( 5, 'RBP-001', 'Rear Brake Pads — Set',                    2, 5,  150.00,  280.00,  4, 5, 1),
                ( 6, 'BD-001',  'Brake Disc — Front (each)',                 2, 5,  320.00,  580.00,  5, 3, 1),
                (21, 'BF-001',  'Brake Fluid DOT4 — 1 Litre',               2, 1,   35.00,   65.00, 14,10, 1),
                -- Electrical (Cat 4)
                ( 9, 'BAT-001', 'Battery 652MF 60Ah',                       4, 1,  950.00, 1650.00,  2, 3, 1),
                (10, 'ALT-001', 'Alternator 70A — Remanufactured',          4, 2, 1200.00, 2100.00,  2, 2, 1),
                (15, 'HLB-001', 'Headlight Bulb H4 60/55W',                 4, 4,   45.00,   80.00, 20,15, 1),
                (20, 'SM-001',  'Starter Motor — Remanufactured',           4, 2,  980.00, 1750.00,  1, 2, 1),
                -- Suspension (Cat 5)
                (11, 'SF-001',  'Shock Absorber — Front',                   5, 2,  480.00,  850.00,  3, 4, 1),
                (12, 'SR-001',  'Shock Absorber — Rear',                    5, 2,  380.00,  680.00,  4, 3, 1),
                (13, 'BJ-001',  'Ball Joint — Lower',                       5, 2,  220.00,  390.00,  6, 4, 1),
                -- Exhaust (Cat 6)
                (16, 'EP-001',  'Exhaust Pipe — Centre Section',            6, 3,  580.00,  980.00,  2, 2, 1),
                (17, 'MUF-001', 'Muffler Assembly',                         6, 3,  750.00, 1280.00,  1, 2, 1),
                -- Body Parts (Cat 7)
                (14, 'WB-001',  'Wiper Blade 22 inch',                      7, 1,   55.00,   95.00, 15,10, 1),
                (22, 'SM-002',  'Side Mirror — Left Hand',                  7, 1,  380.00,  650.00,  3, 3, 1),
                -- Accessories (Cat 8)
                (23, 'CM-001',  'Car Mat Set — Universal Fit',              8, 1,  180.00,  320.00, 10, 5, 1),
                (24, 'TB-002',  'Tow Bar — Universal Hitch',                8, 3, 1800.00, 3200.00,  2, 1, 1);
            ");

            // ── Customers (10) ─────────────────────────────────────────────────
            // Trade balances: ABC R2500 + City R1680 + Rapid R850 = R5030 outstanding
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Customers"" (""Id"", ""Name"", ""Phone"", ""Email"", ""IsTradeAccount"", ""CreditLimit"", ""Balance"", ""IsActive"")
                VALUES
                ( 1, 'John Mokoena',          '071 234 5678', 'john.mokoena@gmail.com',      0,     0.00,    0.00, 1),
                ( 2, 'Sarah van Wyk',         '082 345 6789', 'sarah.vanwyk@webmail.co.za',  0,     0.00,    0.00, 1),
                ( 3, 'Thabo Nkosi',           '060 456 7890', '',                            0,     0.00,    0.00, 1),
                ( 4, 'ABC Motors',            '011 789 0123', 'accounts@abcmotors.co.za',    1, 15000.00, 2500.00, 1),
                ( 5, 'City Auto Centre',      '011 890 1234', 'orders@cityauto.co.za',       1, 20000.00, 1680.00, 1),
                ( 6, 'Rapid Repairs Garage',  '012 901 2345', 'rapid.repairs@gmail.com',     1, 10000.00,  850.00, 1),
                ( 7, 'Letsatsi Transport',    '014 012 3456', 'fleet@letsatsi.co.za',        1, 25000.00,    0.00, 1),
                ( 8, 'Mike Patel',            '083 567 8901', 'mike.patel@outlook.com',      0,     0.00,    0.00, 1),
                ( 9, 'Zanele Dlamini',        '079 678 9012', 'zanele.d@gmail.com',          0,     0.00,    0.00, 1),
                (10, 'Premier Auto Workshop', '015 123 4567', 'premier.auto@mweb.co.za',     1, 30000.00,    0.00, 1);
            ");

            // ── Sales (31) — March, April, May 2026 ────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""Sales"" (""Id"", ""Date"", ""CustomerId"", ""UserId"", ""SubTotal"", ""DiscountAmount"", ""Total"", ""PaymentMethod"", ""Status"", ""Notes"")
                VALUES
                -- March 2026
                ( 1, '2026-03-03 08:00:00', NULL, 2,  290.00, 0, 290.00,  0, 1, NULL),
                ( 2, '2026-03-05 08:00:00',    1, 2,  900.00, 0, 900.00,  1, 1, NULL),
                ( 3, '2026-03-07 08:00:00',    4, 1, 1050.00, 0,1050.00,  2, 1, NULL),
                ( 4, '2026-03-10 08:00:00', NULL, 2,  350.00, 0, 350.00,  0, 1, NULL),
                ( 5, '2026-03-12 08:00:00',    2, 2, 1650.00, 0,1650.00,  1, 1, NULL),
                ( 6, '2026-03-14 08:00:00',    5, 1, 1330.00, 0,1330.00,  2, 1, NULL),
                ( 7, '2026-03-17 08:00:00', NULL, 2,  235.00, 0, 235.00,  0, 1, NULL),
                ( 8, '2026-03-19 08:00:00',    3, 2,  480.00, 0, 480.00,  1, 1, NULL),
                ( 9, '2026-03-21 08:00:00',    4, 1, 1240.00, 0,1240.00,  2, 1, NULL),
                (10, '2026-03-24 08:00:00', NULL, 2,  415.00, 0, 415.00,  0, 1, NULL),
                (11, '2026-03-26 08:00:00',    8, 2,  805.00, 0, 805.00,  1, 1, NULL),
                (12, '2026-03-28 08:00:00',    6, 1, 1140.00, 0,1140.00,  2, 1, NULL),
                (13, '2026-03-31 08:00:00', NULL, 2,  415.00, 0, 415.00,  0, 1, NULL),
                -- April 2026
                (14, '2026-04-01 08:00:00',    9, 2,  525.00, 0, 525.00,  1, 1, NULL),
                (15, '2026-04-03 08:00:00',    5, 1, 1750.00, 0,1750.00,  2, 1, NULL),
                (16, '2026-04-07 08:00:00', NULL, 2,  355.00, 0, 355.00,  0, 1, NULL),
                (17, '2026-04-09 08:00:00',    1, 2, 1530.00, 0,1530.00,  1, 1, NULL),
                (18, '2026-04-11 08:00:00', NULL, 2,  375.00, 0, 375.00,  0, 1, NULL),
                (19, '2026-04-14 08:00:00',    4, 1, 2260.00, 0,2260.00,  2, 1, NULL),
                (20, '2026-04-16 08:00:00',    8, 2,  385.00, 0, 385.00,  1, 1, NULL),
                (21, '2026-04-17 08:00:00', NULL, 2, 3200.00, 0,3200.00,  0, 1, NULL),
                (22, '2026-04-22 08:00:00',    3, 2, 1650.00, 0,1650.00,  1, 1, NULL),
                (23, '2026-04-24 08:00:00',    6, 1, 1630.00, 0,1630.00,  2, 1, NULL),
                (24, '2026-04-28 08:00:00', NULL, 2,  650.00, 0, 650.00,  0, 1, NULL),
                (25, '2026-04-30 08:00:00',    2, 2, 1100.00, 0,1100.00,  1, 1, NULL),
                -- May 2026
                (26, '2026-05-04 08:00:00', NULL, 2,  270.00, 0, 270.00,  0, 1, NULL),
                (27, '2026-05-06 08:00:00',    9, 2,  600.00, 0, 600.00,  1, 1, NULL),
                (28, '2026-05-08 08:00:00', NULL, 2,  390.00, 0, 390.00,  0, 1, NULL),
                (29, '2026-05-12 08:00:00',    1, 2, 2100.00, 0,2100.00,  1, 1, NULL),
                (30, '2026-05-13 08:00:00', NULL, 2,  220.00, 0, 220.00,  0, 1, NULL),
                (31, '2026-05-14 09:00:00',    8, 2,  220.00, 0, 220.00,  1, 1, NULL);
            ");
            // PaymentMethod: 0=Cash, 1=Card, 2=Account  |  Status: 1=Completed

            // ── Sale Lines (55) ────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""SaleLines"" (""Id"", ""SaleId"", ""PartId"", ""Qty"", ""UnitPrice"", ""DiscountPct"", ""LineTotal"")
                VALUES
                -- Sale 1 — Cash walk-in R290
                ( 1,  1,  1, 2,   85.00, 0,  170.00),
                ( 2,  1,  7, 1,  120.00, 0,  120.00),
                -- Sale 2 — Card, John Mokoena R900
                ( 3,  2,  4, 1,  320.00, 0,  320.00),
                ( 4,  2,  6, 1,  580.00, 0,  580.00),
                -- Sale 3 — Account, ABC Motors R1050
                ( 5,  3,  2, 4,  220.00, 0,  880.00),
                ( 6,  3,  1, 2,   85.00, 0,  170.00),
                -- Sale 4 — Cash walk-in R350
                ( 7,  4, 14, 2,   95.00, 0,  190.00),
                ( 8,  4, 15, 2,   80.00, 0,  160.00),
                -- Sale 5 — Card, Sarah van Wyk R1650
                ( 9,  5,  9, 1, 1650.00, 0, 1650.00),
                -- Sale 6 — Account, City Auto Centre R1330
                (10,  6,  4, 2,  320.00, 0,  640.00),
                (11,  6,  5, 2,  280.00, 0,  560.00),
                (12,  6, 21, 2,   65.00, 0,  130.00),
                -- Sale 7 — Cash walk-in R235
                (13,  7, 18, 1,  135.00, 0,  135.00),
                (14,  7,  8, 1,  100.00, 0,  100.00),
                -- Sale 8 — Card, Thabo Nkosi R480
                (15,  8,  3, 1,  480.00, 0,  480.00),
                -- Sale 9 — Account, ABC Motors R1240
                (16,  9, 11, 1,  850.00, 0,  850.00),
                (17,  9, 13, 1,  390.00, 0,  390.00),
                -- Sale 10 — Cash walk-in R415
                (18, 10, 15, 4,   80.00, 0,  320.00),
                (19, 10, 14, 1,   95.00, 0,   95.00),
                -- Sale 11 — Card, Mike Patel R805
                (20, 11, 19, 1,  720.00, 0,  720.00),
                (21, 11,  1, 1,   85.00, 0,   85.00),
                -- Sale 12 — Account, Rapid Repairs R1140
                (22, 12,  5, 2,  280.00, 0,  560.00),
                (23, 12,  6, 1,  580.00, 0,  580.00),
                -- Sale 13 — Cash walk-in R415
                (24, 13, 23, 1,  320.00, 0,  320.00),
                (25, 13, 14, 1,   95.00, 0,   95.00),
                -- Sale 14 — Card, Zanele Dlamini R525
                (26, 14,  2, 2,  220.00, 0,  440.00),
                (27, 14,  1, 1,   85.00, 0,   85.00),
                -- Sale 15 — Account, City Auto Centre R1750
                (28, 15, 20, 1, 1750.00, 0, 1750.00),
                -- Sale 16 — Cash walk-in R355
                (29, 16, 21, 3,   65.00, 0,  195.00),
                (30, 16, 15, 2,   80.00, 0,  160.00),
                -- Sale 17 — Card, John Mokoena R1530
                (31, 17, 11, 1,  850.00, 0,  850.00),
                (32, 17, 12, 1,  680.00, 0,  680.00),
                -- Sale 18 — Cash walk-in R375
                (33, 18,  7, 2,  120.00, 0,  240.00),
                (34, 18, 18, 1,  135.00, 0,  135.00),
                -- Sale 19 — Account, ABC Motors R2260
                (35, 19, 16, 1,  980.00, 0,  980.00),
                (36, 19, 17, 1, 1280.00, 0, 1280.00),
                -- Sale 20 — Card, Mike Patel R385
                (37, 20,  4, 1,  320.00, 0,  320.00),
                (38, 20, 21, 1,   65.00, 0,   65.00),
                -- Sale 21 — Cash walk-in R3200
                (39, 21, 24, 1, 3200.00, 0, 3200.00),
                -- Sale 22 — Card, Thabo Nkosi R1650
                (40, 22,  9, 1, 1650.00, 0, 1650.00),
                -- Sale 23 — Account, Rapid Repairs R1630
                (41, 23, 13, 2,  390.00, 0,  780.00),
                (42, 23, 11, 1,  850.00, 0,  850.00),
                -- Sale 24 — Cash walk-in R650
                (43, 24, 22, 1,  650.00, 0,  650.00),
                -- Sale 25 — Card, Sarah van Wyk R1100
                (44, 25, 25, 1, 1100.00, 0, 1100.00),
                -- Sale 26 — Cash walk-in R270
                (45, 26, 14, 2,   95.00, 0,  190.00),
                (46, 26, 15, 1,   80.00, 0,   80.00),
                -- Sale 27 — Card, Zanele Dlamini R600
                (47, 27,  4, 1,  320.00, 0,  320.00),
                (48, 27,  5, 1,  280.00, 0,  280.00),
                -- Sale 28 — Cash walk-in R390
                (49, 28,  1, 2,   85.00, 0,  170.00),
                (50, 28,  2, 1,  220.00, 0,  220.00),
                -- Sale 29 — Card, John Mokoena R2100
                (51, 29, 10, 1, 2100.00, 0, 2100.00),
                -- Sale 30 — Cash walk-in R220
                (52, 30,  7, 1,  120.00, 0,  120.00),
                (53, 30,  8, 1,  100.00, 0,  100.00),
                -- Sale 31 — Card, Mike Patel R220
                (54, 31, 18, 1,  135.00, 0,  135.00),
                (55, 31,  1, 1,   85.00, 0,   85.00);
            ");

            // ── Customer Returns (2) ───────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""CustomerReturns"" (""Id"", ""Date"", ""SaleId"", ""SaleLineId"", ""Qty"", ""Reason"", ""Outcome"", ""RefundAmount"", ""StockRestored"", ""UserId"")
                VALUES
                (1, '2026-03-20 09:00:00', 2, 3, 1, 'Wrong fitment — customer ordered incorrect part number',      0, 320.00,  1, 1),
                (2, '2026-04-28 10:30:00', 22,40, 1, 'Faulty — battery failed within warranty period',            0,1650.00,  0, 1);
            ");
            // Outcome: 0=Refund

            // ── Supplier Returns (2) ───────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""SupplierReturns"" (""Id"", ""Date"", ""SupplierId"", ""PartId"", ""Qty"", ""Reason"", ""DebitNoteNo"", ""UnitCost"", ""UserId"")
                VALUES
                (1, '2026-04-05 08:00:00', 4, 2, 2, 'Damaged packaging — spark plugs cracked on delivery',  'DN-BOSCH-001', 120.00, 1),
                (2, '2026-04-18 08:00:00', 5, 5, 1, 'Wrong part supplied — incorrect vehicle fitment',       'DN-FER-001',   150.00, 1);
            ");

            // ── Purchase Orders (6) ────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""PurchaseOrders"" (""Id"", ""Date"", ""SupplierId"", ""Status"", ""Notes"", ""UserId"")
                VALUES
                (1, '2026-03-01 07:00:00', 1, 2, 'Monthly filters & consumables restock',         1),
                (2, '2026-03-15 07:00:00', 4, 2, 'Bosch electrical & ignition top-up',            1),
                (3, '2026-04-01 07:00:00', 2, 2, 'Suspension & electrical replenishment',         1),
                (4, '2026-04-10 07:00:00', 3, 1, 'Exhaust & engine — awaiting balance of order',  1),
                (5, '2026-05-01 07:00:00', 5, 0, 'Brake components reorder — urgently needed',   1),
                (6, '2026-05-10 07:00:00', 1, 0, 'Filters & fluids monthly order',               1);
            ");
            // Status: 0=Open, 1=PartialReceived, 2=Received

            // ── PO Lines (17) ─────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""POLines"" (""Id"", ""PurchaseOrderId"", ""PartId"", ""QtyOrdered"", ""QtyReceived"", ""UnitCost"")
                VALUES
                -- PO 1 Midas (Received)
                ( 1, 1,  1, 20, 20,   45.00),
                ( 2, 1,  7, 10, 10,   65.00),
                ( 3, 1, 14, 20, 20,   55.00),
                -- PO 2 Bosch (Received)
                ( 4, 2, 15, 30, 30,   45.00),
                ( 5, 2,  2, 20, 20,  120.00),
                -- PO 3 First Auto (Received)
                ( 6, 3, 11,  5,  5,  480.00),
                ( 7, 3, 12,  5,  5,  380.00),
                ( 8, 3, 10,  3,  3, 1200.00),
                -- PO 4 Toyota (Partial — GS-001 not yet received)
                ( 9, 4, 16,  3,  2,  580.00),
                (10, 4, 17,  3,  1,  750.00),
                (11, 4, 19,  3,  0,  420.00),
                -- PO 5 Ferodo (Open)
                (12, 5,  4, 10,  0,  180.00),
                (13, 5,  5, 10,  0,  150.00),
                (14, 5,  6,  5,  0,  320.00),
                -- PO 6 Midas (Open)
                (15, 6,  1, 20,  0,   45.00),
                (16, 6,  8, 15,  0,   55.00),
                (17, 6, 21, 20,  0,   35.00);
            ");

            // ── Customer Payments (3) ──────────────────────────────────────────
            // ABC: charged R4550 - paid R2050 = balance R2500
            // City: charged R3080 - paid R1400 = balance R1680
            // Rapid: charged R2770 - paid R1920 = balance R850
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""CustomerPayments"" (""Id"", ""CustomerId"", ""Amount"", ""Reference"", ""Notes"", ""UserId"", ""Date"")
                VALUES
                (1, 4, 2050.00, 'PAY-4-001', 'Part payment — EFT',          1, '2026-04-15 09:00:00'),
                (2, 5, 1400.00, 'PAY-5-001', 'Part payment — EFT',          1, '2026-04-20 09:00:00'),
                (3, 6, 1920.00, 'PAY-6-001', 'Full settlement of March inv', 1, '2026-05-05 09:00:00');
            ");

            // ── Stock Adjustments (2) ──────────────────────────────────────────
            migrationBuilder.Sql(@"
                INSERT OR IGNORE INTO ""StockAdjustments"" (""Id"", ""PartId"", ""QtyBefore"", ""AdjustmentQty"", ""QtyAfter"", ""Reason"", ""UserId"", ""Date"")
                VALUES
                (1,  9, 3, -1, 2, 'Stocktake — one unit found damaged, written off',   1, '2026-02-28 08:00:00'),
                (2, 25, 2, -1, 1, 'Stocktake — packaging damaged, item unsellable',    1, '2026-02-28 08:00:00');
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DELETE FROM ""StockAdjustments"" WHERE ""Id"" IN (1, 2);");
            migrationBuilder.Sql(@"DELETE FROM ""CustomerPayments"" WHERE ""Id"" IN (1, 2, 3);");
            migrationBuilder.Sql(@"DELETE FROM ""POLines"" WHERE ""Id"" BETWEEN 1 AND 17;");
            migrationBuilder.Sql(@"DELETE FROM ""PurchaseOrders"" WHERE ""Id"" BETWEEN 1 AND 6;");
            migrationBuilder.Sql(@"DELETE FROM ""SupplierReturns"" WHERE ""Id"" IN (1, 2);");
            migrationBuilder.Sql(@"DELETE FROM ""CustomerReturns"" WHERE ""Id"" IN (1, 2);");
            migrationBuilder.Sql(@"DELETE FROM ""SaleLines"" WHERE ""Id"" BETWEEN 1 AND 55;");
            migrationBuilder.Sql(@"DELETE FROM ""Sales"" WHERE ""Id"" BETWEEN 1 AND 31;");
            migrationBuilder.Sql(@"DELETE FROM ""Customers"" WHERE ""Id"" BETWEEN 1 AND 10;");
            migrationBuilder.Sql(@"DELETE FROM ""Parts"" WHERE ""Id"" IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25);");
            migrationBuilder.Sql(@"DELETE FROM ""Suppliers"" WHERE ""Id"" BETWEEN 1 AND 5;");
            migrationBuilder.Sql(@"DELETE FROM ""Users"" WHERE ""Id"" = 2;");
        }
    }
}
