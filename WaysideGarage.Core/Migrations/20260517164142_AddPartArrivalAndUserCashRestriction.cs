using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaysideGarage.Core.Migrations
{
    /// <inheritdoc />
    public partial class AddPartArrivalAndUserCashRestriction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowCash",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArrivalDate",
                table: "Parts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierInvoiceNo",
                table: "Parts",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "AllowCash",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowCash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ArrivalDate",
                table: "Parts");

            migrationBuilder.DropColumn(
                name: "SupplierInvoiceNo",
                table: "Parts");
        }
    }
}
