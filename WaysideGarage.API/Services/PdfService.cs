using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WaysideGarage.Core.Models;

namespace WaysideGarage.API.Services;

public static class PdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] GenerateSupplierReturnPdf(SupplierReturn ret)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontSize(10).FontColor("#333333"));

                page.Header().Element(Header);
                page.Content().Element(c => Content(c, ret));
                page.Footer().Element(Footer);
            });
        }).GeneratePdf();

        void Header(IContainer c)
        {
            c.Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Wayside Garage & Motor Spares")
                        .FontSize(18).Bold().FontColor("#0f1420");
                    col.Item().Text("Supplier Return / Debit Note")
                        .FontSize(12).FontColor("#1e6fd9");
                });
                row.ConstantItem(160).AlignRight().Column(col =>
                {
                    col.Item().Text($"DN No: {ret.DebitNoteNo ?? "—"}").Bold();
                    col.Item().Text($"Date: {ret.Date.ToLocalTime():dd MMM yyyy}").FontColor("#555");
                });
            });
        }

        void Content(IContainer c, SupplierReturn ret)
        {
            c.PaddingTop(20).Column(col =>
            {
                // Supplier + Part info boxes
                col.Item().Row(row =>
                {
                    row.RelativeItem().Border(1).BorderColor("#dddddd").Padding(12).Column(inner =>
                    {
                        inner.Item().Text("Supplier").Bold().FontColor("#888").FontSize(9);
                        inner.Item().PaddingTop(4).Text(ret.Supplier?.Name ?? "—").Bold();
                        if (!string.IsNullOrWhiteSpace(ret.Supplier?.ContactName))
                            inner.Item().Text(ret.Supplier.ContactName).FontColor("#555");
                        if (!string.IsNullOrWhiteSpace(ret.Supplier?.Phone))
                            inner.Item().Text(ret.Supplier.Phone).FontColor("#555");
                        if (!string.IsNullOrWhiteSpace(ret.Supplier?.Email))
                            inner.Item().Text(ret.Supplier.Email).FontColor("#555");
                        if (!string.IsNullOrWhiteSpace(ret.Supplier?.AccountNo))
                            inner.Item().PaddingTop(4).Text($"Account: {ret.Supplier.AccountNo}").FontColor("#1e6fd9");
                    });

                    row.ConstantItem(12);

                    row.RelativeItem().Border(1).BorderColor("#dddddd").Padding(12).Column(inner =>
                    {
                        inner.Item().Text("Return Details").Bold().FontColor("#888").FontSize(9);
                        inner.Item().PaddingTop(4).Text($"Debit Note No: {ret.DebitNoteNo ?? "—"}").Bold();
                        if (!string.IsNullOrWhiteSpace(ret.SupplierInvoiceNo))
                            inner.Item().Text($"Supplier Invoice: {ret.SupplierInvoiceNo}");
                        inner.Item().Text($"Date: {ret.Date.ToLocalTime():dd MMMM yyyy}");
                        inner.Item().Text($"Processed by: {ret.User?.FullName ?? "—"}");
                    });
                });

                col.Item().PaddingTop(20);

                // Lines table header
                col.Item().Background("#0f1420").Padding(8).Row(row =>
                {
                    row.RelativeItem(4).Text("Part No").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(8).Text("Description").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(2).AlignCenter().Text("Qty").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(3).AlignRight().Text("Unit Cost").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(3).AlignRight().Text("Total").Bold().FontColor(Colors.White).FontSize(9);
                });

                col.Item().Border(1).BorderColor("#dddddd").Padding(10).Row(row =>
                {
                    row.RelativeItem(4).Text(ret.Part?.PartNo ?? "—");
                    row.RelativeItem(8).Text(ret.Part?.Description ?? "—");
                    row.RelativeItem(2).AlignCenter().Text(ret.Qty.ToString());
                    row.RelativeItem(3).AlignRight().Text($"R {ret.UnitCost:F2}");
                    row.RelativeItem(3).AlignRight().Text($"R {ret.Qty * ret.UnitCost:F2}").Bold();
                });

                // Total row
                col.Item().PaddingTop(4).AlignRight().Row(row =>
                {
                    row.ConstantItem(200).Background("#f4f6f9").Border(1).BorderColor("#dddddd")
                        .Padding(10).Row(inner =>
                        {
                            inner.RelativeItem().Text("TOTAL CREDIT VALUE").Bold().FontSize(11);
                            inner.ConstantItem(80).AlignRight().Text($"R {ret.Qty * ret.UnitCost:F2}").Bold().FontSize(11).FontColor("#1e6fd9");
                        });
                });

                col.Item().PaddingTop(20);

                // Reason
                col.Item().Border(1).BorderColor("#dddddd").Padding(12).Column(inner =>
                {
                    inner.Item().Text("Reason for Return").Bold().FontColor("#888").FontSize(9);
                    inner.Item().PaddingTop(4).Text(ret.Reason);
                });

                col.Item().PaddingTop(30);

                // Signature lines
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(sig =>
                    {
                        sig.Item().PaddingBottom(30).Text("").FontSize(8);
                        sig.Item().BorderBottom(1).BorderColor("#aaaaaa").Text("").FontSize(8);
                        sig.Item().PaddingTop(4).Text("Authorised by — Wayside Garage").FontColor("#888").FontSize(9);
                    });
                    row.ConstantItem(40);
                    row.RelativeItem().Column(sig =>
                    {
                        sig.Item().PaddingBottom(30).Text("").FontSize(8);
                        sig.Item().BorderBottom(1).BorderColor("#aaaaaa").Text("").FontSize(8);
                        sig.Item().PaddingTop(4).Text("Received by — Supplier").FontColor("#888").FontSize(9);
                    });
                });
            });
        }

        void Footer(IContainer c)
        {
            c.BorderTop(1).BorderColor("#dddddd").PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text("Wayside Garage & Motor Spares — Supplier Return Document")
                    .FontSize(8).FontColor("#aaaaaa");
                row.ConstantItem(80).AlignRight().Text(text =>
                {
                    text.Span("Page ").FontSize(8).FontColor("#aaaaaa");
                    text.CurrentPageNumber().FontSize(8).FontColor("#aaaaaa");
                    text.Span(" of ").FontSize(8).FontColor("#aaaaaa");
                    text.TotalPages().FontSize(8).FontColor("#aaaaaa");
                });
            });
        }
    }
}
