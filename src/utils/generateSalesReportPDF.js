import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../assets/AquaBest logo.png';

const PDF_COLORS = {
  navy: [27, 47, 99],
  blue: [36, 78, 163],
  aqua: [42, 169, 197],
  lightBlue: [234, 241, 255],
  surface: [248, 251, 255],
  border: [217, 226, 236],
  muted: [102, 119, 136],
  amber: [196, 125, 11],
  green: [19, 131, 88],
  greenBg: [240, 249, 244],
  greenBorder: [200, 233, 214],
  white: [255, 255, 255]
};

// Convert image URL to Base64 in browser (returns null safely in Node or on failure)
async function getBase64Image(url) {
  if (typeof fetch !== 'function' || typeof FileReader === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const formatCurrency = (val) => 'PHP ' + Number(val || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function addLogoOrFallback(doc, logoBase64, x, y, w, h, fontSize = 15) {
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', x, y, w, h);
      return;
    } catch {
      // Fall through to text fallback
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('AQUABEST', x, y + h * 0.7);
}

function drawHeaderAndFooter(doc, reportPeriod) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Subtle top banner line
    doc.setDrawColor(...PDF_COLORS.blue);
    doc.setLineWidth(0.5);
    doc.line(12, 10, 198, 10);

    // Running header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.blue);
    doc.text('AQUABEST WATER REFILLING STATION', 12, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Period: ${reportPeriod}`, 198, 8, { align: 'right' });

    // Running footer
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(12, 284, 198, 284);

    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text('CONFIDENTIAL • AQUABEST INTERNAL BUSINESS MANAGEMENT REPORT', 12, 289);
    doc.text(`Page ${i} of ${pageCount}`, 198, 289, { align: 'right' });
  }
}

// -------------------------------------------------------------
// 1. FINANCIAL SUMMARY PDF (Strictly 1 A4 Portrait Page)
// -------------------------------------------------------------
export function createFinancialSummaryDoc(data, logoBase64 = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const contentWidth = 210 - margin * 2; // 186mm
  let y = 13;

  // Header branding
  addLogoOrFallback(doc, logoBase64, margin, y, 34, 11, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('SALES & FINANCIAL SUMMARY', 50, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Reporting Period: ${data.periodLabel} (${data.period})`, 50, y + 9);
  doc.text(`Generated: ${data.dateGenerated}  •  Role: ${data.role || 'Station Manager'}`, 50, y + 13);

  y += 16;

  // 4 Compact KPI Cards (4-across)
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const kpis = [
    { label: 'GROSS SALES', value: formatCurrency(data.grossSales), sub: `${data.totalOrders - data.cancelledOrdersCount} active orders`, color: PDF_COLORS.navy },
    { label: 'VERIFIED COLLECTED', value: formatCurrency(data.verifiedCollected), sub: `${data.paidOrdersCount} paid orders`, color: PDF_COLORS.green },
    { label: 'OUTSTANDING BALANCE', value: formatCurrency(data.outstandingBalance), sub: `${data.unpaidOrdersCount} unpaid orders`, color: PDF_COLORS.amber },
    { label: 'RECORDED EXPENSES', value: formatCurrency(data.recordedExpenses), sub: `${formatCurrency(data.paidExpenses)} paid`, color: PDF_COLORS.blue }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(...PDF_COLORS.surface);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.roundedRect(cx, y, cardWidth, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(kpi.label, cx + 2.5, y + 4.5);

    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, cx + 2.5, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(kpi.sub, cx + 2.5, y + 14);
  });

  y += 20;

  // SECTION A: Financial Summary Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('Financial Summary', margin, y);
  y += 2;

  const summaryRows = [
    ['Gross Sales', 'Non-cancelled recorded orders in period', formatCurrency(data.grossSales)],
    ['Verified Collected', 'Orders explicitly marked Paid', formatCurrency(data.verifiedCollected)],
    ['Outstanding Receivables', 'Orders explicitly marked Unpaid', formatCurrency(data.outstandingBalance)],
    ['Recorded Expenses', 'All active station expenses in period', formatCurrency(data.recordedExpenses)],
    ['Paid Expenses', 'Active expenses explicitly marked Paid', formatCurrency(data.paidExpenses)],
    ['Unpaid Expenses', 'Active expenses explicitly marked Unpaid', formatCurrency(data.unpaidExpenses)],
    ['Collections After Paid Expenses', 'Verified Collected minus Paid Expenses (cash-flow indicator)', formatCurrency(data.collectionsAfterPaidExpenses)]
  ];

  if (data.unknownPaymentOrdersCount > 0) {
    summaryRows.splice(3, 0, [
      'Unrecorded Order Payment Status',
      `${data.unknownPaymentOrdersCount} active order(s) without Paid/Unpaid flag`,
      formatCurrency(data.unknownPaymentBalance)
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Accounting Treatment', 'Amount']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8, cellPadding: 1.8 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.8, cellPadding: 1.6 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52 },
      1: { cellWidth: 96 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 38 }
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.row.raw[0] === 'Collections After Paid Expenses') {
        hookData.cell.styles.fillColor = PDF_COLORS.lightBlue;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 5;

  // SECTION B: Compact Sales Channel Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('Sales Channel Breakdown', margin, y);
  y += 2;

  const sourceRows = (data.sources || []).slice(0, 6).map(s => [
    s.source,
    String(s.orders),
    formatCurrency(s.gross),
    formatCurrency(s.verified)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Order Source', 'Orders', 'Gross Sales', 'Verified Collected']],
    body: sourceRows.length ? sourceRows : [['No order sources recorded', '0', formatCurrency(0), formatCurrency(0)]],
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8, cellPadding: 1.6 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.6, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 56 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 53 },
      3: { halign: 'right', cellWidth: 53 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Compact Fulfillment Service table (only if vertical space allows without risking page 2)
  if (y < 218) {
    const serviceRows = (data.services || []).slice(0, 5).map(s => [
      s.service,
      String(s.orders),
      formatCurrency(s.gross),
      formatCurrency(s.verified),
      formatCurrency(s.outstanding)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Fulfillment Service', 'Orders', 'Gross Sales', 'Collected', 'Outstanding']],
      body: serviceRows.length ? serviceRows : [['No services recorded', '0', formatCurrency(0), formatCurrency(0), formatCurrency(0)]],
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.aqua, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8, cellPadding: 1.6 },
      bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.6, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 38 },
        4: { halign: 'right', cellWidth: 38 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // Disclaimer Box (kept within Page 1 bounds)
  const disclaimerY = Math.min(y, 246);
  doc.setFillColor(...PDF_COLORS.lightBlue);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.roundedRect(margin, disclaimerY, contentWidth, 21, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('IMPORTANT FINANCIAL & DEMO DATA NOTES', margin + 3, disclaimerY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    '• Collections After Paid Expenses is a cash-flow indicator (Verified Collected minus Paid Expenses), not verified net profit.\n' +
    '• DEMO REPORT: Figures are based on local session records and manually recorded payment statuses; they are not server-verified.',
    margin + 3,
    disclaimerY + 9,
    { maxWidth: contentWidth - 6, lineHeightFactor: 1.35 }
  );

  // Order count summary line at bottom above footer
  const sigY = Math.min(disclaimerY + 26, 276);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    `Order Summary: ${data.totalOrders} total (${data.paidOrdersCount} Paid, ${data.unpaidOrdersCount} Unpaid` +
    `${data.unknownPaymentOrdersCount ? `, ${data.unknownPaymentOrdersCount} Not Recorded` : ''}` +
    `${data.cancelledOrdersCount ? `, ${data.cancelledOrdersCount} Cancelled` : ''})`,
    margin,
    sigY
  );

  drawHeaderAndFooter(doc, data.periodLabel);
  return doc;
}

export async function generateFinancialSummaryPDF(data) {
  const logoBase64 = await getBase64Image(logoUrl);
  const doc = createFinancialSummaryDoc(data, logoBase64);
  const filename = `AquaBest_Financial_Summary_${data.periodFilename}.pdf`;
  doc.save(filename);
  return filename;
}

// -------------------------------------------------------------
// 2. COMPLETE FINANCIAL REPORT PDF (Multi-Page Content-Driven)
// -------------------------------------------------------------
export function createCompleteFinancialReportDoc(data, logoBase64 = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const contentWidth = 210 - margin * 2; // 186mm
  const tableMargin = { top: 15, bottom: 16, left: margin, right: margin };

  const ensureSpace = (neededMm, currentY) => {
    if (currentY + neededMm > 276) {
      doc.addPage();
      return 16;
    }
    return currentY;
  };

  let y = 14;
  addLogoOrFallback(doc, logoBase64, margin, y, 38, 13, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('COMPLETE SALES & FINANCIAL AUDIT REPORT', 54, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('CONFIDENTIAL COMPREHENSIVE BUSINESS PERFORMANCE REPORT', 54, y + 9.5);
  doc.text(`Reporting Period: ${data.periodLabel} (${data.period})`, 54, y + 13.5);

  y += 18;

  // Metadata Block
  doc.setFillColor(...PDF_COLORS.surface);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...PDF_COLORS.blue);
  doc.text('GENERATION DATE:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(String(data.dateGenerated || ''), margin + 38, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.blue);
  doc.text('AUTHORIZED ROLE:', margin + 4, y + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(data.role || 'Station Manager', margin + 38, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.blue);
  doc.text('REPORT SOURCE:', margin + 102, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('Demo / Local Session Records', margin + 132, y + 5);

  y += 18;

  // 1. Executive Financial Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('1. Executive Financial Summary', margin, y);
  y += 2.5;

  const execRows = [
    ['Gross Sales (Non-Cancelled Orders)', formatCurrency(data.grossSales)],
    ['Verified Collected (Explicitly Paid Orders)', formatCurrency(data.verifiedCollected)],
    ['Outstanding Receivables (Explicitly Unpaid Orders)', formatCurrency(data.outstandingBalance)],
    ['Unrecorded Order Payment Status', formatCurrency(data.unknownPaymentBalance || 0)],
    ['Recorded Station Expenses (Active Total)', formatCurrency(data.recordedExpenses)],
    ['Paid Expenses (Verified Cash Outflow)', formatCurrency(data.paidExpenses)],
    ['Unpaid Expenses (Pending Payables)', formatCurrency(data.unpaidExpenses)],
    ['Expenses (Payment Status Not Recorded)', formatCurrency(data.unrecordedStatusExpenses || 0)],
    ['Collections After Paid Expenses (Verified Collected less Paid Expenses)', formatCurrency(data.collectionsAfterPaidExpenses)]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Financial Core Metric', 'Amount']],
    body: execRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 8, cellPadding: 2.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 46 }
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.row.index === execRows.length - 1) {
        hookData.cell.styles.fillColor = PDF_COLORS.lightBlue;
      }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 2. Sales by Order Source
  y = ensureSpace(28, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('2. Sales by Order Source', margin, y);
  y += 2.5;

  const srcRows = (data.sources || []).map(s => [
    s.source,
    s.orders,
    formatCurrency(s.gross),
    formatCurrency(s.verified)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Order Source', 'Orders', 'Gross Sales', 'Verified Collected']],
    body: srcRows.length ? srcRows : [['No order sources recorded', 0, formatCurrency(0), formatCurrency(0)]],
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 54 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 54 },
      3: { halign: 'right', cellWidth: 54 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 3. Sales by Fulfillment Service
  y = ensureSpace(28, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('3. Sales by Fulfillment Service', margin, y);
  y += 2.5;

  const srvRows = (data.services || []).map(s => [
    s.service,
    s.orders,
    formatCurrency(s.gross),
    formatCurrency(s.verified),
    formatCurrency(s.outstanding)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Service Type', 'Orders', 'Gross Sales', 'Verified Collected', 'Outstanding']],
    body: srvRows.length ? srvRows : [['No service records', 0, formatCurrency(0), formatCurrency(0), formatCurrency(0)]],
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.aqua, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 38.6 },
      3: { halign: 'right', cellWidth: 38.7 },
      4: { halign: 'right', cellWidth: 38.7 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 4. Payment Method Breakdown
  y = ensureSpace(28, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('4. Payment Method Breakdown (Recorded vs Verified)', margin, y);
  y += 2.5;

  const payRows = (data.paymentMethods || []).map(p => [
    p.method,
    p.orders,
    formatCurrency(p.recorded),
    formatCurrency(p.verified)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Payment Method', 'Orders', 'Recorded Amount', 'Verified Collected']],
    body: payRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 54 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 54 },
      3: { halign: 'right', cellWidth: 54 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 5. Best-Selling Containers
  y = ensureSpace(28, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('5. Best-Selling Containers', margin, y);
  y += 2.5;

  const contRows = (data.containers || []).map(c => [
    c.label,
    c.quantity === 1 ? '1 container' : `${c.quantity} containers`,
    `${Number(c.share || 0).toFixed(1)}%`
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Container Type', 'Quantity Dispensed', 'Share of Volume']],
    body: contRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.muted, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 84 },
      1: { halign: 'center', cellWidth: 51 },
      2: { halign: 'center', cellWidth: 51 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 6. Complete Expense Ledger (Active and Voided)
  y = ensureSpace(32, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('6. Complete Expense Ledger (Active & Voided)', margin, y);
  y += 2.5;

  const expTableRows = (data.expensesList || []).map(e => {
    const isVoided = e.active === false;
    return [
      e.date || 'Unspecified',
      e.category || 'Other',
      e.description || '',
      formatCurrency(e.amount),
      e.paymentStatus || 'Not Recorded',
      isVoided ? 'Voided' : 'Active',
      e.paymentMethod || 'Not Recorded',
      e.reference || '-'
    ];
  });

  if (!expTableRows.length) {
    expTableRows.push(['-', '-', 'No recorded expenses in this timeframe', formatCurrency(0), '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Category', 'Description', 'Amount', 'Payment Status', 'Record Status', 'Method', 'Reference']],
    body: expTableRows,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 7.2 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 6.8, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 23 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
      6: { cellWidth: 24 },
      7: { cellWidth: 20 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 7. Outstanding Receivables (Explicitly Unpaid only)
  y = ensureSpace(32, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('7. Outstanding Receivables (Explicitly Unpaid)', margin, y);
  y += 2.5;

  const recTableRows = (data.receivablesList || []).map(r => [
    r.id,
    r.customer || 'Walk-in',
    r.service || 'Not Specified',
    r.date || 'Unspecified',
    formatCurrency(r.amount),
    r.paymentStatus || 'Unpaid'
  ]);

  if (!recTableRows.length) {
    recTableRows.push(['-', 'No outstanding unpaid orders in this period', '-', '-', formatCurrency(0), '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Order ID', 'Customer', 'Service', 'Date', 'Amount', 'Payment Status']],
    body: recTableRows,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.amber, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 24 },
      1: { cellWidth: 50 },
      2: { cellWidth: 36 },
      3: { cellWidth: 24 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      5: { cellWidth: 24 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 8. Orders with Unknown / Unrecorded Payment Status
  y = ensureSpace(32, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('8. Orders with Unrecorded Payment Status', margin, y);
  y += 2.5;

  const unknownRows = (data.unknownPaymentOrders || []).map(o => [
    o.id || 'No Order ID',
    o.date || 'Unspecified',
    o.customer || 'Walk-in',
    o.source || 'Not Specified',
    o.service || 'Not Specified',
    formatCurrency(o.amount),
    o.paymentStatus || 'Not Recorded'
  ]);

  if (!unknownRows.length) {
    unknownRows.push(['-', '-', 'No orders with unrecorded payment status', '-', '-', formatCurrency(0), '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Order ID', 'Date', 'Customer', 'Source', 'Service', 'Amount', 'Payment Status']],
    body: unknownRows,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.muted, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 24 },
      4: { cellWidth: 28 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      6: { cellWidth: 24 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 7;

  // 9. Complete Transaction Register (Includes Cancelled, clearly labeled)
  y = ensureSpace(32, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('9. Complete Transaction Register', margin, y);
  y += 2.5;

  const txTableRows = (data.transactionsList || []).map(t => [
    t.id,
    t.date || 'Unspecified',
    t.customer || 'Walk-in',
    t.source || 'Not Specified',
    t.service || 'Not Specified',
    formatCurrency(t.amount),
    t.paymentStatus || 'Not Recorded',
    t.status || 'Active'
  ]);

  if (!txTableRows.length) {
    txTableRows.push(['-', '-', 'No transactions logged in this timeframe', '-', '-', formatCurrency(0), '-', '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Order ID', 'Date', 'Customer', 'Source', 'Service', 'Amount', 'Payment', 'Order Status']],
    body: txTableRows,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.blue, textColor: PDF_COLORS.white, fontStyle: 'bold', fontSize: 7.3 },
    bodyStyles: { textColor: PDF_COLORS.navy, fontSize: 6.9, cellPadding: 1.8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 34 },
      3: { cellWidth: 20 },
      4: { cellWidth: 26 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      6: { cellWidth: 20 },
      7: { cellWidth: 24 }
    },
    margin: tableMargin
  });

  y = doc.lastAutoTable.finalY + 8;

  // 10. Financial Notes, Disclaimer & Signatures
  y = ensureSpace(36, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('10. Financial Notes & Disclaimer', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    'DEMO REPORT — figures are based on local session records and manually recorded payment statuses. ' +
    'They are not independently verified by a production server. Cancelled orders are excluded from financial totals, ' +
    'voided expenses are excluded from active expense totals, and Collections After Paid Expenses is a cash-flow indicator rather than verified net profit.',
    margin,
    y,
    { maxWidth: contentWidth, lineHeightFactor: 1.35 }
  );
  y += 16;

  const sigColWidth = 58;
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text('Prepared by: _______________________', margin, y);
  doc.text('Reviewed by: _______________________', margin + sigColWidth + 6, y);
  doc.text('Approved by: _______________________', margin + (sigColWidth + 6) * 2, y);

  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('Station Manager', margin, y);
  doc.text('Accountant / Audit Staff', margin + sigColWidth + 6, y);
  doc.text('Super Admin / Business Owner', margin + (sigColWidth + 6) * 2, y);

  drawHeaderAndFooter(doc, data.periodLabel);
  return doc;
}

export async function generateCompleteFinancialReportPDF(data) {
  const logoBase64 = await getBase64Image(logoUrl);
  const doc = createCompleteFinancialReportDoc(data, logoBase64);
  const filename = `AquaBest_Complete_Financial_Report_${data.periodFilename}.pdf`;
  doc.save(filename);
  return filename;
}
