using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaysideGarage.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddStockAdjustment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockAdjustments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PartId = table.Column<int>(type: "INTEGER", nullable: false),
                    QtyBefore = table.Column<int>(type: "INTEGER", nullable: false),
                    AdjustmentQty = table.Column<int>(type: "INTEGER", nullable: false),
                    QtyAfter = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockAdjustments_Parts_PartId",
                        column: x => x.PartId,
                        principalTable: "Parts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockAdjustments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$5xvRDxVYSHJDwxzbrFhIheFf8lZzh8q.Op5LKwNTrM9jjuRZjt1Uq");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_PartId",
                table: "StockAdjustments",
                column: "PartId");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_UserId",
                table: "StockAdjustments",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockAdjustments");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$WVfiv4wD4OQmHyiqliQw3.8HQZtzHZ7MNn/zD66DZVbD.zcYsnv4W");
        }
    }
}
