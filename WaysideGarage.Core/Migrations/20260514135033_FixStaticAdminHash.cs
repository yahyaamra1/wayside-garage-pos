using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaysideGarage.Core.Migrations
{
    /// <inheritdoc />
    public partial class FixStaticAdminHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$7PLzj19LmYzfM7OKMHDeUe0dpKfxCRGTZfy7hqK4NjcHB.3UTMlXK");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$VXJb3R3UtMyuT4sbrBNcpORTHsCKU7s505XTpeSRXhwdqn3l0Zbfy");
        }
    }
}
