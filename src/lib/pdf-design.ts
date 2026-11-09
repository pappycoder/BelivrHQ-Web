import type jsPDF from "jspdf";
import type { ExportBranding, ExportLogo } from "./export-branding";

/** Print colors stay consistent regardless of the app's active theme. */
export const PDF_COLORS = {
  navy: "#173D3E",
  blue: "#526F4A",
  ink: "#183B40",
  muted: "#586D61",
  line: "#D3DED2",
  soft: "#F1F5E9",
  white: "#FFFFFF",
  green: "#047857",
  red: "#B91C1C",
  amber: "#B45309",
};

export const PDF_FONT = "BelivrHQSans";
export interface PdfMetadata { label: string; value: string }
interface PdfAssets { regular: string; bold: string; logo: string }
let assetsPromise: Promise<PdfAssets> | undefined;

async function base64Asset(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Unable to load PDF design assets. Please try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export async function preparePdf(doc: jsPDF): Promise<PdfAssets> {
  assetsPromise ??= Promise.all([
    base64Asset("/fonts/pdf/DejaVuSans.ttf"),
    base64Asset("/fonts/pdf/DejaVuSans-Bold.ttf"),
    base64Asset("/brand/belivrhq-lockup-light.png"),
  ]).then(([regular, bold, logo]) => ({ regular, bold, logo })).catch((error) => {
    assetsPromise = undefined;
    throw error;
  });
  const assets = await assetsPromise;
  doc.addFileToVFS("BelivrHQSans.ttf", assets.regular);
  doc.addFont("BelivrHQSans.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("BelivrHQSans-Bold.ttf", assets.bold);
  doc.addFont("BelivrHQSans-Bold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
  return assets;
}

export function pdfText(doc: jsPDF, text: string, x: number, y: number, width: number, size = 10, bold = false, color = PDF_COLORS.ink): number {
  doc.setFont(PDF_FONT, bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color);
  const lines: string[] = doc.splitTextToSize(text, width);
  doc.text(lines, x, y, { lineHeightFactor: 1.4 });
  return Math.max(1, lines.length) * size * 0.3528 * 1.4;
}

export function pdfLabel(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(PDF_COLORS.muted);
  doc.text(text.toUpperCase(), x, y);
}

export function drawPdfHeader(doc: jsPDF, logo: string, label = "REPORT", branding?: ExportBranding, churchLogo?: ExportLogo) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(PDF_COLORS.navy);
  doc.rect(0, 0, width, 25, "F");
  doc.setFillColor("#D6ED97");
  doc.rect(0, 25, width, 1.2, "F");
  if (branding?.churchName) {
    let textX = 14;
    if (churchLogo) {
      doc.setFillColor(PDF_COLORS.soft);
      doc.roundedRect(14, 3, 19, 19, 2, 2, "F");
      const scale = 16 / Math.max(churchLogo.width, churchLogo.height);
      const w = churchLogo.width * scale;
      const h = churchLogo.height * scale;
      doc.addImage(churchLogo.dataUrl, "PNG", 15.5 + (16 - w) / 2, 4.5 + (16 - h) / 2, w, h);
      textX = 38;
    }
    doc.setFont(PDF_FONT, "bold");
    let size = 12;
    doc.setFontSize(size);
    const available = width - textX - 58;
    while (size > 7 && doc.splitTextToSize(branding.churchName, available).length > 2) doc.setFontSize(--size);
    const lines: string[] = doc.splitTextToSize(branding.churchName, available);
    doc.setTextColor(PDF_COLORS.white);
    doc.text(lines.slice(0, 2), textX, lines.length > 1 ? 10 : 13, { lineHeightFactor: 1.2 });
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(6);
    doc.setTextColor("#D6ED97");
    doc.text("Powered by BelivrHQ", textX, 21);
  } else {
    doc.addImage(logo, "PNG", 14, 1, 42, 23);
  }
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(8);
  doc.setTextColor(PDF_COLORS.white);
  doc.text(label.toUpperCase(), width - 14, 14, { align: "right" });
}

export function drawPdfFooters(doc: jsPDF, generatedAt: Date, label = "BelivrHQ") {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(PDF_COLORS.line);
    doc.setLineWidth(0.25);
    doc.line(14, height - 16, width - 14, height - 16);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(PDF_COLORS.muted);
    doc.text(`Powered by ${label}  ·  ${generatedAt.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}`, 14, height - 10);
    doc.text(`${i} / ${total}`, width - 14, height - 10, { align: "right" });
  }
}
