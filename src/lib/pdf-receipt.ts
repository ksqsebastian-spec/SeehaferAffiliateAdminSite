import { COMPANY } from "./company";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EmpfehlungWithHandwerker } from "@/types";

interface ReceiptData {
  empfehlung: EmpfehlungWithHandwerker;
  emailSubject: string;
  emailBody: string;
}

export async function generateReceipt({ empfehlung, emailSubject, emailBody }: ReceiptData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const bottomMargin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }
  }

  // --- Company Header ---
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52); // navy
  doc.text(COMPANY.name, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY.addressLine1, margin, y);
  y += 4.5;
  doc.text(COMPANY.addressLine2, margin, y);
  y += 4.5;
  doc.text(`Tel: ${COMPANY.phone} · ${COMPANY.email}`, margin, y);
  y += 4.5;
  doc.text(`Steuernummer: ${COMPANY.steuernummer} · USt-IdNr: ${COMPANY.ustIdNr}`, margin, y);
  y += 10;

  // --- Divider ---
  doc.setDrawColor(242, 137, 0); // orange
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Document Title ---
  checkPageBreak(20);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("AUSZAHLUNGSBELEG", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Datum: ${formatDate(new Date().toISOString())}`, margin, y);
  doc.text(`Referenz: ${empfehlung.ref_code}`, margin + 70, y);
  y += 12;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Recipient Section ---
  checkPageBreak(15);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("EMPFÄNGER", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  const recipientFields = [
    ["Name", empfehlung.empfehler_name],
    ["E-Mail", empfehlung.empfehler_email],
    ...(empfehlung.iban ? [["IBAN", empfehlung.iban]] : []),
    ...(empfehlung.bic ? [["BIC", empfehlung.bic]] : []),
    ...(empfehlung.kontoinhaber ? [["Kontoinhaber", empfehlung.kontoinhaber]] : []),
    ...(empfehlung.bank_name ? [["Bank", empfehlung.bank_name]] : []),
  ];

  for (const [label, value] of recipientFields) {
    checkPageBreak(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + 35, y);
    y += 6;
  }

  y += 6;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Transaction Section ---
  checkPageBreak(15);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("TRANSAKTION", margin, y);
  y += 7;

  doc.setFontSize(10);

  const transactionFields = [
    ["Kunde (Partner)", empfehlung.handwerker?.name ?? empfehlung.kunde_name],
    ["Rechnungsbetrag", empfehlung.rechnungsbetrag ? formatCurrency(empfehlung.rechnungsbetrag) : "–"],
    ["Provisionssatz", empfehlung.handwerker?.provision_prozent ? `${empfehlung.handwerker.provision_prozent}%` : "–"],
    ["Provisionsbetrag", empfehlung.provision_betrag ? formatCurrency(empfehlung.provision_betrag) : "–"],
    ...(empfehlung.ausgezahlt_am ? [["Ausgezahlt am", formatDate(empfehlung.ausgezahlt_am)]] : []),
  ];

  for (const [label, value] of transactionFields) {
    checkPageBreak(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + 45, y);
    y += 6;
  }

  // Highlight provision amount
  if (empfehlung.provision_betrag) {
    checkPageBreak(20);
    y += 4;
    doc.setFillColor(242, 137, 0); // orange
    doc.roundedRect(margin, y - 1, contentWidth, 12, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Auszahlungsbetrag: ${formatCurrency(empfehlung.provision_betrag)}`,
      margin + 6,
      y + 7,
    );
    y += 18;
  } else {
    y += 6;
  }

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Email Section ---
  checkPageBreak(25);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("GESENDETE E-MAIL", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Betreff:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(emailSubject, margin + 20, y);
  y += 8;

  // Email body — render line by line with page break support
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const bodyLines: string[] = doc.splitTextToSize(emailBody, contentWidth - 12);
  const lineHeight = 5.5;

  // Draw background box on each page as needed
  const boxPadding = 5;
  let boxStartY = y;
  let needBoxStart = true;

  function startEmailBox() {
    doc.setFillColor(248, 247, 244);
    doc.setDrawColor(220, 220, 220);
    boxStartY = y;
    needBoxStart = false;
  }

  function closeEmailBox() {
    const boxH = y - boxStartY + boxPadding;
    doc.setFillColor(248, 247, 244);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin, boxStartY, contentWidth, boxH, 3, 3, "FD");
  }

  startEmailBox();

  for (let i = 0; i < bodyLines.length; i++) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      closeEmailBox();
      doc.addPage();
      y = margin;
      needBoxStart = true;
      startEmailBox();
    }
    if (needBoxStart) {
      startEmailBox();
    }
    // Draw text on top of box (we'll draw the box behind after)
    y += lineHeight;
  }

  // Now that we know the extent, redraw properly:
  // Reset and draw the box first, then the text
  // For simplicity, draw the text after the box outline
  closeEmailBox();

  // Re-render the text on top of the boxes
  y = boxStartY + boxPadding + 2;
  let currentPage = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();

  // Simple approach: re-render all lines from boxStartY
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  for (let i = 0; i < bodyLines.length; i++) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      if (currentPage < totalPages) {
        currentPage++;
        doc.setPage(currentPage);
        y = margin + boxPadding + 2;
      }
    }
    doc.text(bodyLines[i], margin + 6, y);
    y += lineHeight;
  }

  // Ensure we're on the last page for the footer
  doc.setPage(doc.getNumberOfPages());
  y += 10;

  // --- Footer ---
  checkPageBreak(15);
  doc.setDrawColor(242, 137, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Erstellt am ${formatDate(new Date().toISOString())} · ${COMPANY.name} · ${COMPANY.addressLine1}, ${COMPANY.addressLine2}`,
    margin,
    y,
  );

  // Save
  const filename = `Beleg_${empfehlung.ref_code.replace("#", "")}_${empfehlung.empfehler_name.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
