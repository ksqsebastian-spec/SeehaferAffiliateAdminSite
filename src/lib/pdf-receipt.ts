import { jsPDF } from "jspdf";
import { COMPANY } from "./company";
import type { EmpfehlungWithHandwerker } from "@/types";

interface ReceiptData {
  empfehlung: EmpfehlungWithHandwerker;
  emailSubject: string;
  emailBody: string;
}

function formatCurrencyPlain(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDatePlain(dateString: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export function generateReceipt({ empfehlung, emailSubject, emailBody }: ReceiptData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

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
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("AUSZAHLUNGSBELEG", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Datum: ${formatDatePlain(new Date().toISOString())}`, margin, y);
  doc.text(`Referenz: ${empfehlung.ref_code}`, margin + 70, y);
  y += 12;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Recipient Section ---
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
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 2, 52);
  doc.text("TRANSAKTION", margin, y);
  y += 7;

  doc.setFontSize(10);

  const transactionFields = [
    ["Kunde (Partner)", empfehlung.handwerker?.name ?? empfehlung.kunde_name],
    ["Rechnungsbetrag", empfehlung.rechnungsbetrag ? formatCurrencyPlain(empfehlung.rechnungsbetrag) : "–"],
    ["Provisionssatz", empfehlung.handwerker?.provision_prozent ? `${empfehlung.handwerker.provision_prozent}%` : "–"],
    ["Provisionsbetrag", empfehlung.provision_betrag ? formatCurrencyPlain(empfehlung.provision_betrag) : "–"],
    ...(empfehlung.ausgezahlt_am ? [["Ausgezahlt am", formatDatePlain(empfehlung.ausgezahlt_am)]] : []),
  ];

  for (const [label, value] of transactionFields) {
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
    y += 4;
    doc.setFillColor(242, 137, 0); // orange
    doc.roundedRect(margin, y - 1, contentWidth, 12, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Auszahlungsbetrag: ${formatCurrencyPlain(empfehlung.provision_betrag)}`,
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

  // Email body in a light gray box
  doc.setFillColor(248, 247, 244);
  doc.setDrawColor(220, 220, 220);

  const bodyLines = doc.splitTextToSize(emailBody, contentWidth - 12);
  const boxHeight = bodyLines.length * 5.5 + 10;
  doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "FD");

  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  doc.text(bodyLines, margin + 6, y + 7);
  y += boxHeight + 10;

  // --- Footer ---
  doc.setDrawColor(242, 137, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Erstellt am ${formatDatePlain(new Date().toISOString())} · ${COMPANY.name} · ${COMPANY.addressLine1}, ${COMPANY.addressLine2}`,
    margin,
    y,
  );

  // Save
  const filename = `Beleg_${empfehlung.ref_code.replace("#", "")}_${empfehlung.empfehler_name.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
