import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { format } from "date-fns";
import type { AllTicketItem } from "@/hooks/use-events";
import { loadExportLogo, type ExportBranding } from "./export-branding";
import { PDF_COLORS as colors, PDF_FONT, preparePdf, pdfText, pdfLabel, drawPdfHeader, drawPdfFooters } from "@/lib/pdf-design";

/** A compact, printable admission pass. QR payload and ticket data are unchanged. */
export async function createTicketPDF(ticket: AllTicketItem, branding?: ExportBranding) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5", putOnlyUsedFonts: true });
  const [assets, qrDataUrl] = await Promise.all([
    preparePdf(doc),
    QRCode.toDataURL(ticket.code, { width: 480, margin: 4, errorCorrectionLevel: "M", color: { dark: colors.navy, light: colors.white } }),
  ]);
  const churchLogo = await loadExportLogo(branding);
  doc.setProperties({ title: `${ticket.eventName} - Event pass`, author: branding?.churchName || "BelivrHQ", creator: "BelivrHQ", subject: `Ticket ${ticket.code}` });
  drawPdfHeader(doc, assets.logo, "EVENT PASS", branding, churchLogo);
  pdfLabel(doc, "YOU'RE INVITED", 14, 36);

  // Fit the heading into its own area; retain unusually long names in the details.
  let titleSize = 19;
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(titleSize);
  while (titleSize > 10 && doc.splitTextToSize(ticket.eventName, 121).length * titleSize * 0.3528 * 1.4 > 24) {
    titleSize--;
    doc.setFontSize(titleSize);
  }
  const longTitle = doc.splitTextToSize(ticket.eventName, 121).length * titleSize * 0.3528 * 1.4 > 24;
  pdfText(doc, longTitle ? "Event admission" : ticket.eventName, 14, 45, 121, titleSize, true);

  const date = new Date(ticket.eventDate);
  const dateLabel = Number.isNaN(date.getTime()) ? ticket.eventDate : format(date, "EEEE, MMM d, yyyy · h:mm a");
  const fields = [
    ...(longTitle ? [["EVENT", ticket.eventName]] : []),
    ["WHEN", dateLabel],
    ["WHERE", ticket.eventLocation || "Location not specified"],
    ["ATTENDEE", ticket.memberName || ticket.visitorName || "Unassigned"],
    ["ADMISSION", ticket.tierName || "General"],
  ];
  autoTable(doc, {
    startY: 70,
    margin: { left: 14, right: 75, top: 35, bottom: 23 },
    body: fields,
    theme: "plain",
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: { top: 2.3, bottom: 2.3, left: 0, right: 3 }, textColor: colors.ink, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 24, textColor: colors.muted, fontSize: 7, fontStyle: "bold" }, 1: { fontStyle: "bold" } },
    rowPageBreak: "avoid",
    willDrawPage: () => drawPdfHeader(doc, assets.logo, "EVENT PASS", branding, churchLogo),
  });

  doc.setPage(1);
  doc.setDrawColor(colors.line);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(144, 34, 144, 127);
  doc.setLineDashPattern([], 0);
  const statusColor = ticket.status === "cancelled" || ticket.status === "refunded" ? colors.red : ticket.isUsed ? colors.amber : colors.green;
  doc.setFillColor(colors.soft);
  doc.roundedRect(152, 35, 44, 8, 2, 2, "F");
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(statusColor);
  doc.text(ticket.isUsed ? `${ticket.status.toUpperCase()} · USED` : ticket.status.toUpperCase(), 174, 40.3, { align: "center" });
  doc.addImage(qrDataUrl, "PNG", 152, 47, 44, 44);
  pdfLabel(doc, "TICKET CODE", 152, 98);
  pdfText(doc, ticket.code, 152, 104, 44, 7.5, true);
  pdfText(doc, "Present this QR code at event check-in.", 152, 119, 44, 7, false, colors.muted);
  drawPdfFooters(doc, new Date(), "BelivrHQ · Event pass");
  return doc;
}

export async function generateTicketPDF(ticket: AllTicketItem, branding?: ExportBranding): Promise<void> {
  const doc = await createTicketPDF(ticket, branding);
  doc.save(`ticket-${ticket.code}.pdf`);
}
