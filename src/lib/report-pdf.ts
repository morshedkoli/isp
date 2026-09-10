import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import type { MonthlyReportData } from '@/lib/report-data';
import { monthName } from '@/lib/period';
import { formatTaka } from '@/lib/format';
import { drawText, measureText, truncateToWidth, type FontWeight } from '@/lib/pdf-font';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const BANNER_HEIGHT = 86;
const CONTINUED_BANNER_HEIGHT = 52;
const FOOTER_TOP = 56;
const ROW_HEIGHT = 20;

const INDIGO = rgb(0.31, 0.27, 0.9);
const STONE = rgb(0.17, 0.15, 0.14);
const MUTED = rgb(0.45, 0.43, 0.4);
const LINE = rgb(0.9, 0.89, 0.87);
const SOFT = rgb(0.97, 0.97, 0.96);
const WHITE = rgb(1, 1, 1);
const NEGATIVE = rgb(0.76, 0.2, 0.25);
const WARNING = rgb(0.76, 0.45, 0.05);

const COMPANY = 'GrameenWifi - Kalikaccha, Sarail, Brahmanbaria';

/**
 * A report in progress: the document, the page currently being drawn on, the
 * fonts, and the baseline the next block starts from.
 */
interface ReportDoc {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  title: string;
  period: string;
  y: number;
}

interface TextStyle {
  weight?: FontWeight;
  color?: Color;
}

/**
 * Money in the app's own format. The taka sign has no glyph in either PDF font,
 * so the text layer rewrites it to "BDT " — see `pdf-font.ts`.
 */
function money(value: number): string {
  return formatTaka(Math.abs(value));
}

/** Signed money, e.g. "-BDT 32,000" for an outgoing amount. */
function signedMoney(value: number): string {
  return formatTaka(value);
}

function amountColor(value: number): Color {
  return value < 0 ? NEGATIVE : STONE;
}

function font(doc: ReportDoc, weight: FontWeight): PDFFont {
  return weight === 'bold' ? doc.bold : doc.regular;
}

function text(doc: ReportDoc, value: string, x: number, y: number, size: number, style: TextStyle = {}): number {
  const weight = style.weight ?? 'regular';
  return drawText(doc.page, value, { x, y, size, helvetica: font(doc, weight), weight, color: style.color ?? STONE });
}

/** Draws text so that it ends at `right` — used for every money column. */
function textRight(doc: ReportDoc, value: string, right: number, y: number, size: number, style: TextStyle = {}): number {
  const weight = style.weight ?? 'regular';
  const width = measureText(value, size, font(doc, weight), weight);
  return text(doc, value, right - width, y, size, style);
}

function rule(page: PDFPage, y: number): void {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: CONTENT_RIGHT, y }, thickness: 1, color: LINE });
}

function zebra(page: PDFPage, y: number, index: number): void {
  if (index % 2 !== 0) return;
  page.drawRectangle({ x: MARGIN, y: y - 10, width: PAGE_WIDTH - MARGIN * 2, height: ROW_HEIGHT, color: SOFT });
}

function drawFooter(doc: ReportDoc): void {
  rule(doc.page, 42);
  text(doc, COMPANY, MARGIN, 27, 8, { color: MUTED });
  textRight(doc, `Generated ${new Date().toLocaleDateString('en-GB')}`, CONTENT_RIGHT, 27, 8, { color: MUTED });
}

function drawBanner(doc: ReportDoc, isContinuation: boolean): void {
  const height = isContinuation ? CONTINUED_BANNER_HEIGHT : BANNER_HEIGHT;
  doc.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - height, width: PAGE_WIDTH, height, color: INDIGO });

  if (isContinuation) {
    text(doc, `${doc.title} (continued)`, MARGIN, PAGE_HEIGHT - 32, 12, { weight: 'bold', color: WHITE });
    textRight(doc, doc.period, CONTENT_RIGHT, PAGE_HEIGHT - 31, 9, { color: rgb(0.9, 0.89, 1) });
    return;
  }

  text(doc, 'GRAMEENWIFI - KALIKACCHA, SARAIL', MARGIN, PAGE_HEIGHT - 34, 9, { weight: 'bold', color: WHITE });
  text(doc, doc.title, MARGIN, PAGE_HEIGHT - 60, 20, { weight: 'bold', color: WHITE });
  textRight(doc, doc.period, CONTENT_RIGHT, PAGE_HEIGHT - 56, 10, { color: rgb(0.9, 0.89, 1) });
}

function startPage(doc: ReportDoc, isContinuation: boolean): void {
  doc.page = doc.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBanner(doc, isContinuation);
  doc.y = PAGE_HEIGHT - (isContinuation ? CONTINUED_BANNER_HEIGHT : BANNER_HEIGHT) - 36;
}

/**
 * Makes sure `needed` points of vertical space remain, breaking to a new page
 * when they do not. Reports grow with the number of partners and agents, so
 * rows are never dropped to fit a single page.
 */
function ensureSpace(doc: ReportDoc, needed: number): void {
  if (doc.y - needed >= FOOTER_TOP) return;
  drawFooter(doc);
  startPage(doc, true);
}

async function createDocument(title: string, period: string): Promise<ReportDoc> {
  const pdf = await PDFDocument.create();
  const doc: ReportDoc = {
    pdf,
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    title,
    period,
    y: 0,
  };
  // Replace the placeholder page with a properly bannered first page.
  pdf.removePage(0);
  startPage(doc, false);
  return doc;
}

function sectionHeading(doc: ReportDoc, heading: string, gap = 19): void {
  ensureSpace(doc, 40);
  text(doc, heading, MARGIN, doc.y, 13, { weight: 'bold' });
  doc.y -= gap;
}

function metricCards(doc: ReportDoc, metrics: Array<[string, number]>): void {
  ensureSpace(doc, 70);
  const width = (PAGE_WIDTH - MARGIN * 2 - 20) / metrics.length;
  metrics.forEach(([label, value], index) => {
    const x = MARGIN + index * (width + 10);
    doc.page.drawRectangle({ x, y: doc.y - 52, width, height: 62, color: SOFT, borderColor: LINE, borderWidth: 0.5 });
    text(doc, label, x + 11, doc.y - 10, 9, { color: MUTED });
    text(doc, signedMoney(value), x + 11, doc.y - 33, 14, { weight: 'bold', color: amountColor(value) });
  });
  doc.y -= 78;
}

interface TableColumn {
  header: string;
  x: number;
  align?: 'left' | 'right';
}

function tableHeader(doc: ReportDoc, columns: TableColumn[]): void {
  ensureSpace(doc, 46);
  columns.forEach((column) => {
    const style: TextStyle = { weight: 'bold', color: MUTED };
    if (column.align === 'right') textRight(doc, column.header, column.x, doc.y, 8, style);
    else text(doc, column.header, column.x, doc.y, 8, style);
  });
  doc.y -= 9;
  rule(doc.page, doc.y);
  doc.y -= 15;
}

/** Renders one table row, breaking the page first when the row would not fit. */
function tableRow(doc: ReportDoc, index: number, render: (doc: ReportDoc, baseline: number) => void): void {
  ensureSpace(doc, ROW_HEIGHT + 6);
  zebra(doc.page, doc.y, index);
  render(doc, doc.y - 1);
  doc.y -= ROW_HEIGHT;
}

function emptyNote(doc: ReportDoc, note: string): void {
  ensureSpace(doc, 24);
  text(doc, note, MARGIN + 10, doc.y, 9, { color: MUTED });
  doc.y -= 20;
}

function finish(doc: ReportDoc): Promise<Uint8Array> {
  drawFooter(doc);
  return doc.pdf.save();
}

export interface AgentPayoutRow {
  agentId?: string;
  agentName: string;
  commissionPercent: number;
  amount: number;
}

export async function createMonthlyReportPdf(report: MonthlyReportData, agents: AgentPayoutRow[]): Promise<Uint8Array> {
  const doc = await createDocument('Monthly financial report', `${monthName(report.month)} ${report.year}`);

  sectionHeading(doc, 'Financial summary', 24);
  metricCards(doc, [
    ['Total revenue', report.revenue.total],
    ['Total expenses', report.expenses.total],
    ['Net profit', report.netProfit],
  ]);

  sectionHeading(doc, 'Revenue and expenses');
  const summaryRows: Array<[string, number]> = [
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
    tableRow(doc, index, (target, baseline) => {
      text(target, label, MARGIN + 10, baseline, 9.5, { color: MUTED });
      textRight(target, signedMoney(amount), CONTENT_RIGHT - 10, baseline, 9.5, { weight: 'bold', color: amountColor(amount) });
    });
  });
  doc.y -= 18;

  sectionHeading(doc, 'Partner settlements', 18);
  const partnerColumns: TableColumn[] = [
    { header: 'Partner', x: MARGIN + 10 },
    { header: 'Share', x: 300, align: 'right' },
    { header: 'Due', x: 385, align: 'right' },
    { header: 'Paid', x: 465, align: 'right' },
    { header: 'Outstanding', x: CONTENT_RIGHT - 10, align: 'right' },
  ];
  tableHeader(doc, partnerColumns);
  if (report.partnerShares.length === 0) {
    emptyNote(doc, 'No active partner settlements for this period.');
  } else {
    report.partnerShares.forEach((partner, index) => {
      tableRow(doc, index, (target, baseline) => {
        const name = partner.partnerName.trim() || 'Unnamed partner';
        text(target, truncateToWidth(name, 240, 8.5, target.regular), partnerColumns[0].x, baseline, 8.5);
        textRight(target, `${partner.sharePercent}%`, partnerColumns[1].x, baseline, 8.5, { color: MUTED });
        textRight(target, money(partner.dueAmount), partnerColumns[2].x, baseline, 8.5);
        textRight(target, money(partner.paidAmount), partnerColumns[3].x, baseline, 8.5);
        textRight(target, money(partner.remainingAmount), partnerColumns[4].x, baseline, 8.5, {
          weight: 'bold',
          color: partner.remainingAmount > 0 ? WARNING : STONE,
        });
      });
    });
  }
  doc.y -= 12;

  sectionHeading(doc, 'Agent commission payouts', 18);
  const agentColumns: TableColumn[] = [
    { header: 'Agent', x: MARGIN + 10 },
    { header: 'Commission', x: 380, align: 'right' },
    { header: 'Payout', x: CONTENT_RIGHT - 10, align: 'right' },
  ];
  tableHeader(doc, agentColumns);
  if (agents.length === 0) {
    emptyNote(doc, 'No commission entries for this period.');
  } else {
    agents.forEach((agent, index) => {
      tableRow(doc, index, (target, baseline) => {
        const name = agent.agentName.trim() || 'Unnamed agent';
        text(target, truncateToWidth(name, 300, 8.5, target.regular), agentColumns[0].x, baseline, 8.5);
        textRight(target, `${agent.commissionPercent}%`, agentColumns[1].x, baseline, 8.5, { color: MUTED });
        textRight(target, money(agent.amount), agentColumns[2].x, baseline, 8.5, { weight: 'bold' });
      });
    });
  }

  return finish(doc);
}

export async function createYearlyReportPdf(
  year: number,
  months: MonthlyReportData[],
  totals: { revenue: number; expenses: number; netProfit: number },
): Promise<Uint8Array> {
  const doc = await createDocument('Yearly financial report', `January - December ${year}`);

  sectionHeading(doc, 'Annual summary', 24);
  metricCards(doc, [
    ['Revenue', totals.revenue],
    ['Expenses', totals.expenses],
    ['Net profit', totals.netProfit],
  ]);

  sectionHeading(doc, 'Monthly performance', 18);
  const columns: TableColumn[] = [
    { header: 'Month', x: MARGIN + 10 },
    { header: 'Revenue', x: 300, align: 'right' },
    { header: 'Expenses', x: 415, align: 'right' },
    { header: 'Net profit', x: CONTENT_RIGHT - 10, align: 'right' },
  ];
  tableHeader(doc, columns);
  months.forEach((month, index) => {
    tableRow(doc, index, (target, baseline) => {
      text(target, monthName(month.month), columns[0].x, baseline, 8.5);
      textRight(target, money(month.revenue.total), columns[1].x, baseline, 8.5, { weight: 'bold' });
      textRight(target, money(month.expenses.total), columns[2].x, baseline, 8.5, { weight: 'bold' });
      textRight(target, signedMoney(month.netProfit), columns[3].x, baseline, 8.5, { weight: 'bold', color: amountColor(month.netProfit) });
    });
  });

  ensureSpace(doc, 30);
  rule(doc.page, doc.y + 5);
  const totalsRow: Array<[number, number]> = [
    [columns[1].x, totals.revenue],
    [columns[2].x, totals.expenses],
    [columns[3].x, totals.netProfit],
  ];
  text(doc, 'Total', columns[0].x, doc.y - 10, 9.5, { weight: 'bold' });
  totalsRow.forEach(([x, value]) => {
    textRight(doc, signedMoney(value), x, doc.y - 10, 9.5, { weight: 'bold', color: amountColor(value) });
  });

  return finish(doc);
}
