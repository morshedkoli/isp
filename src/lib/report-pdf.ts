import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { MonthlyReportData } from '@/lib/report-data';
import { monthName } from '@/lib/period';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const INDIGO = rgb(0.31, 0.27, 0.9);
const STONE = rgb(0.17, 0.15, 0.14);
const MUTED = rgb(0.45, 0.43, 0.4);
const LINE = rgb(0.9, 0.89, 0.87);
const SOFT = rgb(0.97, 0.97, 0.96);

function safeText(text: string, fallback = ''): string {
  const cleaned = text.replace(/[^\x20-\x7E]/g, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function money(value: number) {
  return `BDT ${Math.abs(value).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

function short(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function write(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number, color = STONE) {
  const safe = safeText(text, ' ');
  page.drawText(safe, { x, y, size, font, color });
}

function rule(page: PDFPage, y: number) {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: LINE });
}

function footer(page: PDFPage, font: PDFFont) {
  rule(page, 42);
  write(page, font, 'GrameenWifi - Kalikaccha, Sarail, Brahmanbaria', MARGIN, 27, 8, MUTED);
  write(page, font, `Generated ${new Date().toLocaleDateString('en-GB')}`, PAGE_WIDTH - MARGIN - 105, 27, 8, MUTED);
}

async function createDocument(title: string, period: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 86, width: PAGE_WIDTH, height: 86, color: INDIGO });
  write(page, bold, 'GRAMEENWIFI - KALIKACCHA, SARAIL', MARGIN, PAGE_HEIGHT - 34, 9, rgb(1, 1, 1));
  write(page, bold, title, MARGIN, PAGE_HEIGHT - 60, 20, rgb(1, 1, 1));
  write(page, regular, period, PAGE_WIDTH - MARGIN - 120, PAGE_HEIGHT - 56, 10, rgb(0.9, 0.89, 1));
  return { pdf, page, regular, bold };
}

export async function createMonthlyReportPdf(report: MonthlyReportData, agents: Array<{ agentId?: number; agentName: string; commissionPercent: number; amount: number }>) {
  const period = `${monthName(report.month)} ${report.year}`;
  const { pdf, page, regular, bold } = await createDocument('Monthly financial report', period);
  let y = PAGE_HEIGHT - 122;

  write(page, bold, 'Financial summary', MARGIN, y, 13);
  y -= 24;
  const metrics = [
    ['Total revenue', report.revenue.total],
    ['Total expenses', report.expenses.total],
    ['Net profit', report.netProfit],
  ];
  const metricWidth = (PAGE_WIDTH - MARGIN * 2 - 20) / 3;
  metrics.forEach(([label, value], index) => {
    const x = MARGIN + index * (metricWidth + 10);
    page.drawRectangle({ x, y: y - 52, width: metricWidth, height: 62, color: SOFT, borderColor: LINE, borderWidth: 0.5 });
    write(page, regular, label as string, x + 11, y - 10, 9, MUTED);
    write(page, bold, `${Number(value) < 0 ? '-' : ''}${money(Number(value))}`, x + 11, y - 33, 14, Number(value) < 0 ? rgb(0.8, 0.18, 0.25) : STONE);
  });
  y -= 78;

  write(page, bold, 'Revenue and expenses', MARGIN, y, 13);
  y -= 19;
  const summaryRows = [
    ['Company commission', report.revenue.companyCommission],
    ['Hotspot revenue', report.revenue.hotspotRevenue],
    ['Agent payouts', -report.expenses.agentPayouts],
    ['Salary expenses', -report.expenses.salaryTotal],
    ['Fiber cable expenses', -report.expenses.fiberCableTotal],
    ['Rent expenses', -report.expenses.rentTotal],
    ['Utility expenses', -report.expenses.utilitiesTotal],
    ['Equipment expenses', -report.expenses.equipmentTotal],
    ['Conveyance expenses', -report.expenses.conveyanceTotal],
    ['Miscellaneous expenses', -report.expenses.miscTotal],
  ];
  summaryRows.forEach(([label, amount], index) => {
    if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 14, width: PAGE_WIDTH - MARGIN * 2, height: 21, color: SOFT });
    write(page, regular, label as string, MARGIN + 10, y - 1, 9.5, MUTED);
    const text = `${Number(amount) < 0 ? '-' : ''}${money(Number(amount))}`;
    write(page, bold, text, PAGE_WIDTH - MARGIN - 10 - bold.widthOfTextAtSize(text, 9.5), y - 1, 9.5, Number(amount) < 0 ? rgb(0.76, 0.2, 0.25) : STONE);
    y -= 21;
  });
  y -= 18;

  write(page, bold, 'Partner settlements', MARGIN, y, 13);
  y -= 18;
  const headers = ['Partner', 'Share', 'Due', 'Paid', 'Outstanding'];
  const columns = [MARGIN + 10, 245, 315, 390, 472];
  headers.forEach((header, index) => write(page, bold, header, columns[index], y, 8, MUTED));
  y -= 9;
  rule(page, y);
  y -= 15;
  report.partnerShares.slice(0, 7).forEach((partner, index) => {
    if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 10, width: PAGE_WIDTH - MARGIN * 2, height: 20, color: SOFT });
    const pName = safeText(partner.partnerName, `Partner ${partner.partnerId}`);
    write(page, regular, short(pName, 26), columns[0], y - 1, 8.5);
    write(page, regular, `${partner.sharePercent}%`, columns[1], y - 1, 8.5, MUTED);
    write(page, regular, money(partner.dueAmount), columns[2], y - 1, 8.5);
    write(page, regular, money(partner.paidAmount), columns[3], y - 1, 8.5);
    write(page, bold, money(partner.remainingAmount), columns[4], y - 1, 8.5, partner.remainingAmount > 0 ? rgb(0.76, 0.45, 0.05) : STONE);
    y -= 20;
  });
  if (report.partnerShares.length === 0) write(page, regular, 'No active partner settlements for this period.', MARGIN + 10, y, 9, MUTED);
  if (report.partnerShares.length > 7) write(page, regular, `+ ${report.partnerShares.length - 7} more partners included in system records`, MARGIN + 10, y - 4, 8, MUTED);
  y -= 27;

  write(page, bold, 'Agent commission payouts', MARGIN, y, 13);
  y -= 18;
  if (agents.length === 0) {
    write(page, regular, 'No commission entries for this period.', MARGIN + 10, y, 9, MUTED);
  } else {
    agents.slice(0, 5).forEach((agent, index) => {
      if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 10, width: PAGE_WIDTH - MARGIN * 2, height: 20, color: SOFT });
      const aName = safeText(agent.agentName, agent.agentId ? `Agent ${agent.agentId}` : 'Agent');
      write(page, regular, short(aName), MARGIN + 10, y - 1, 8.5);
      write(page, regular, `${agent.commissionPercent}% commission`, 285, y - 1, 8.5, MUTED);
      const amount = money(agent.amount);
      write(page, bold, amount, PAGE_WIDTH - MARGIN - 10 - bold.widthOfTextAtSize(amount, 8.5), y - 1, 8.5);
      y -= 20;
    });
  }
  footer(page, regular);
  return pdf.save();
}

export async function createYearlyReportPdf(year: number, months: MonthlyReportData[], totals: { revenue: number; expenses: number; netProfit: number }) {
  const { pdf, page, regular, bold } = await createDocument('Yearly financial report', `January - December ${year}`);
  let y = PAGE_HEIGHT - 122;
  write(page, bold, 'Annual summary', MARGIN, y, 13);
  y -= 24;
  const metrics = [['Revenue', totals.revenue], ['Expenses', totals.expenses], ['Net profit', totals.netProfit]];
  metrics.forEach(([label, value], index) => {
    const x = MARGIN + index * 168;
    page.drawRectangle({ x, y: y - 52, width: 158, height: 62, color: SOFT, borderColor: LINE, borderWidth: 0.5 });
    write(page, regular, label as string, x + 11, y - 10, 9, MUTED);
    write(page, bold, `${Number(value) < 0 ? '-' : ''}${money(Number(value))}`, x + 11, y - 33, 14, Number(value) < 0 ? rgb(0.8, 0.18, 0.25) : STONE);
  });
  y -= 80;
  write(page, bold, 'Monthly performance', MARGIN, y, 13);
  y -= 18;
  const columns = [MARGIN + 10, 194, 320, 435];
  ['Month', 'Revenue', 'Expenses', 'Net profit'].forEach((header, index) => write(page, bold, header, columns[index], y, 8, MUTED));
  y -= 9;
  rule(page, y);
  y -= 15;
  months.forEach((month, index) => {
    if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - 10, width: PAGE_WIDTH - MARGIN * 2, height: 20, color: SOFT });
    const values = [monthName(month.month), money(month.revenue.total), money(month.expenses.total), `${month.netProfit < 0 ? '-' : ''}${money(month.netProfit)}`];
    values.forEach((value, column) => write(page, column === 0 ? regular : bold, value, columns[column], y - 1, 8.5, column === 3 && month.netProfit < 0 ? rgb(0.8, 0.18, 0.25) : STONE));
    y -= 20;
  });
  rule(page, y + 5);
  write(page, bold, 'Total', columns[0], y - 10, 9.5);
  [money(totals.revenue), money(totals.expenses), `${totals.netProfit < 0 ? '-' : ''}${money(totals.netProfit)}`].forEach((value, index) => write(page, bold, value, columns[index + 1], y - 10, 9.5));
  footer(page, regular);
  return pdf.save();
}

