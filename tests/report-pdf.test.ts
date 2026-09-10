import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { measureText, toWinAnsi, truncateToWidth } from '../src/lib/pdf-font';
import { createMonthlyReportPdf, createYearlyReportPdf } from '../src/lib/report-pdf';
import type { MonthlyReportData } from '../src/lib/report-data';

const BENGALI_NAME = 'মোরশেদ আল মাইন';

async function helvetica() {
  const pdf = await PDFDocument.create();
  return pdf.embedFont(StandardFonts.Helvetica);
}

function monthlyReport(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    year: 2026,
    month: 9,
    revenue: { companyCommission: 120000, hotspotRevenue: 45000, total: 165000 },
    expenses: {
      agentPayouts: 30000, salaryTotal: 25000, fiberCableTotal: 12000, rentTotal: 8000,
      utilitiesTotal: 4000, equipmentTotal: 9000, conveyanceTotal: 2000, miscTotal: 1500, total: 91500,
    },
    netProfit: 73500,
    partnerShares: [
      { partnerId: 'p1', partnerName: BENGALI_NAME, sharePercent: 60, dueAmount: 40000, paidAmount: 10000, remainingAmount: 30000 },
    ],
    ...overrides,
  };
}

test('toWinAnsi rewrites the taka sign and typographic punctuation', () => {
  assert.equal(toWinAnsi('৳1,234'), 'BDT 1,234');
  assert.equal(toWinAnsi('−500'), '-500');
  assert.equal(toWinAnsi('Rahim – “Kalikaccha”'), 'Rahim - "Kalikaccha"');
});

test('toWinAnsi drops characters Helvetica cannot encode', () => {
  // Bengali letters are drawn as outlines instead, so the Helvetica layer only
  // keeps the ASCII around them.
  assert.equal(toWinAnsi(BENGALI_NAME).trim(), '');
  assert.equal(toWinAnsi(`Agent ${BENGALI_NAME} 12`).replace(/\s+/g, ' '), 'Agent 12');
});

test('measureText gives Bengali a real width instead of zero', async () => {
  const font = await helvetica();
  const bengaliWidth = measureText(BENGALI_NAME, 10, font);

  assert.ok(bengaliWidth > 0, 'Bengali text must measure wider than nothing');
  assert.ok(measureText(`${BENGALI_NAME} x`, 10, font) > bengaliWidth);
});

test('truncateToWidth keeps text that fits and ellipsises text that does not', async () => {
  const font = await helvetica();

  assert.equal(truncateToWidth('Rahim Uddin', 200, 9, font), 'Rahim Uddin');

  const truncated = truncateToWidth('Rahim Uddin of Kalikaccha, Sarail', 40, 9, font);
  assert.ok(truncated.endsWith('...'));
  assert.ok(measureText(truncated, 9, font) <= 40);
});

test('monthly report keeps every partner and agent instead of dropping rows', async () => {
  const partnerShares = Array.from({ length: 30 }, (_, index) => ({
    partnerId: `p${index}`,
    partnerName: index === 0 ? BENGALI_NAME : `Partner ${index}`,
    sharePercent: 3,
    dueAmount: 1000,
    paidAmount: 0,
    remainingAmount: 1000,
  }));
  const agents = Array.from({ length: 30 }, (_, index) => ({
    agentId: `a${index}`,
    agentName: index === 0 ? BENGALI_NAME : `Agent ${index}`,
    commissionPercent: 8,
    amount: 900,
  }));

  const bytes = await createMonthlyReportPdf(monthlyReport({ partnerShares }), agents);
  const pdf = await PDFDocument.load(bytes);

  assert.ok(pdf.getPageCount() >= 3, `expected the rows to flow onto extra pages, got ${pdf.getPageCount()}`);
});

test('monthly report renders with no partners and no agents', async () => {
  const bytes = await createMonthlyReportPdf(monthlyReport({ partnerShares: [] }), []);
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getPageCount(), 1);
});

test('yearly report renders all twelve months on one page', async () => {
  const months = Array.from({ length: 12 }, (_, index) => monthlyReport({ month: index + 1 }));
  const totals = { revenue: 1980000, expenses: 1098000, netProfit: 882000 };

  const bytes = await createYearlyReportPdf(2026, months, totals);
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getPageCount(), 1);
});
