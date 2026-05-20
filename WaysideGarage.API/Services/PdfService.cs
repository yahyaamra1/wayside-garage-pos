using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WaysideGarage.Core.Models;
// ReSharper disable AccessToModifiedClosure

namespace WaysideGarage.API.Services;

public static class PdfService
{
    static PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] GenerateSaleReceiptPdf(Sale sale)
    {
        var vatRate = 0.15m;
        var totalInclVat = sale.Total;
        var vatAmount = Math.Round(totalInclVat * vatRate / (1 + vatRate), 2);
        var exclVat = totalInclVat - vatAmount;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontSize(10).FontColor("#333333"));

                page.Header().Element(c => ReceiptHeader(c, sale));
                page.Content().Element(c => ReceiptContent(c, sale, vatAmount, exclVat));
                page.Footer().Element(c => ReceiptFooter(c));
            });
        }).GeneratePdf();

        void ReceiptHeader(IContainer c, Sale sale)
        {
            c.Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Wayside Garage & Motor Spares")
                        .FontSize(18).Bold().FontColor("#0f1420");
                    col.Item().Text("TAX INVOICE")
                        .FontSize(12).Bold().FontColor("#1e6fd9");
                });
                row.ConstantItem(160).AlignRight().Column(col =>
                {
                    col.Item().Text($"Invoice # {sale.Id:D6}").Bold().FontSize(12);
                    col.Item().PaddingTop(2).Text($"{sale.Date.ToLocalTime():dd MMM yyyy HH:mm}").FontColor("#555");
                    col.Item().PaddingTop(2).Text($"Cashier: {sale.User?.FullName ?? "—"}").FontColor("#555");
                });
            });
        }

        void ReceiptContent(IContainer c, Sale sale, decimal vatAmount, decimal exclVat)
        {
            c.PaddingTop(16).Column(col =>
            {
                // Customer box (only if there's a customer)
                if (sale.Customer != null)
                {
                    col.Item().Border(1).BorderColor("#dddddd").Padding(10).Column(inner =>
                    {
                        inner.Item().Text("Bill To").Bold().FontColor("#888").FontSize(9);
                        inner.Item().PaddingTop(4).Text(sale.Customer.Name).Bold();
                        if (!string.IsNullOrWhiteSpace(sale.Customer.Phone))
                            inner.Item().Text(sale.Customer.Phone).FontColor("#555");
                        if (!string.IsNullOrWhiteSpace(sale.Customer.Email))
                            inner.Item().Text(sale.Customer.Email).FontColor("#555");
                    });
                    col.Item().PaddingTop(12);
                }

                // Table header
                col.Item().Background("#0f1420").Padding(8).Row(row =>
                {
                    row.RelativeItem(3).Text("Part No").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(7).Text("Description").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(2).AlignCenter().Text("Qty").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(3).AlignRight().Text("Unit Price").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(2).AlignRight().Text("Disc%").Bold().FontColor(Colors.White).FontSize(9);
                    row.RelativeItem(3).AlignRight().Text("Total").Bold().FontColor(Colors.White).FontSize(9);
                });

                // Lines
                var even = false;
                foreach (var line in sale.Lines)
                {
                    even = !even;
                    col.Item().Background(even ? "#f9fafb" : Colors.White)
                        .BorderBottom(1).BorderColor("#eeeeee").Padding(8).Row(row =>
                    {
                        row.RelativeItem(3).Text(line.Part?.PartNo ?? "—").FontFamily("Courier New");
                        row.RelativeItem(7).Text(line.Part?.Description ?? "—");
                        row.RelativeItem(2).AlignCenter().Text(line.Qty.ToString());
                        row.RelativeItem(3).AlignRight().Text($"R {line.UnitPrice:F2}");
                        row.RelativeItem(2).AlignRight().Text(line.DiscountPct > 0 ? $"{line.DiscountPct:0.#}%" : "—").FontColor("#888");
                        row.RelativeItem(3).AlignRight().Text($"R {line.LineTotal:F2}").Bold();
                    });
                }

                col.Item().PaddingTop(12);

                // Totals block
                col.Item().AlignRight().Column(totals =>
                {
                    totals.Item().Width(260).Row(row =>
                    {
                        row.RelativeItem().Text("Subtotal (excl. VAT)").FontColor("#555");
                        row.ConstantItem(100).AlignRight().Text($"R {exclVat:F2}");
                    });
                    if (sale.DiscountAmount > 0)
                    {
                        totals.Item().Width(260).Row(row =>
                        {
                            row.RelativeItem().Text("Discount").FontColor("#555");
                            row.ConstantItem(100).AlignRight().Text($"- R {sale.DiscountAmount:F2}").FontColor("#c0392b");
                        });
                    }
                    totals.Item().Width(260).Row(row =>
                    {
                        row.RelativeItem().Text("VAT (15%)").FontColor("#555");
                        row.ConstantItem(100).AlignRight().Text($"R {vatAmount:F2}");
                    });
                    totals.Item().PaddingTop(4).Width(260)
                        .Background("#0f1420").Padding(8).Row(row =>
                    {
                        row.RelativeItem().Text("TOTAL (incl. VAT)").Bold().FontColor(Colors.White);
                        row.ConstantItem(100).AlignRight().Text($"R {sale.Total:F2}").Bold().FontColor(Colors.White).FontSize(12);
                    });
                    totals.Item().PaddingTop(6).Width(260).Row(row =>
                    {
                        row.RelativeItem().Text("Payment Method").FontColor("#555");
                        row.ConstantItem(100).AlignRight().Text(sale.PaymentMethod.ToString()).Bold();
                    });
                });

                if (!string.IsNullOrWhiteSpace(sale.Notes))
                {
                    col.Item().PaddingTop(16).Border(1).BorderColor("#dddddd").Padding(10).Column(inner =>
                    {
                        inner.Item().Text("Notes").Bold().FontColor("#888").FontSize(9);
                        inner.Item().PaddingTop(4).Text(sale.Notes);
                    });
                }

                col.Item().PaddingTop(20).AlignCenter()
                    .Text("Thank you for your business!").FontColor("#888").FontSize(10);
            });
        }

        void ReceiptFooter(IContainer c)
        {
            c.BorderTop(1).BorderColor("#dddddd").PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text("Wayside Garage & Motor Spares — Tax Invoice")
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
