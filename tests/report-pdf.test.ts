import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonthlyReportPdf, createYearlyReportPdf } from '../src/lib/report-pdf';
import type { MonthlyReportData } from '../src/lib/report-data';

test('createMonthlyReportPdf generates valid PDF bytes without WinAnsi errors', async () => {
  const sampleReport: MonthlyReportData = {
    year: 2026,
    month: 8,
    revenue: {
      companyCommission: 125000,
      hotspotRevenue: 45000,
      total: 170000,
    },
    expenses: {
      agentPayouts: 35000,
      salaryTotal: 25000,
      fiberCableTotal: 12000,
      rentTotal: 8000,
      utilitiesTotal: 6500,
      equipmentTotal: 15000,
      conveyanceTotal: 3000,
      miscTotal: 2500,
      total: 107000,
    },
    netProfit: 63000,
    partnerShares: [
      {
        partnerId: 'partner-1',
        partnerName: 'মোহাম্মদ করিম (Partner with Bengali Name)',
        sharePercent: 60,
        dueAmount: 37800,
        paidAmount: 30000,
        remainingAmount: 7800,
      },
      {
        partnerId: 'partner-2',
        partnerName: 'John Doe Partner — Special & "Quotes"',
        sharePercent: 40,
        dueAmount: 25200,
        paidAmount: 25200,
        remainingAmount: 0,
      },
    ],
  };

  const sampleAgents = [
    {
      agentId: 101,
      agentName: 'রহিম উল্লাহ (Agent)',
      commissionPercent: 10,
      amount: 15000,
    },
    {
      agentId: 102,
      agentName: 'Jane Smith',
      commissionPercent: 12,
      amount: 20000,
    },
  ];

  const pdfBytes = await createMonthlyReportPdf(sampleReport, sampleAgents);
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 1000, 'PDF should have non-trivial size');
  // Check PDF header %PDF-
  const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
  assert.equal(header, '%PDF-');
});

test('createYearlyReportPdf generates valid PDF bytes with full annual data', async () => {
  const months: MonthlyReportData[] = Array.from({ length: 12 }, (_, i) => ({
    year: 2026,
    month: i + 1,
    revenue: { companyCommission: 100000, hotspotRevenue: 20000, total: 120000 },
    expenses: {
      agentPayouts: 20000,
      salaryTotal: 20000,
      fiberCableTotal: 5000,
      rentTotal: 5000,
      utilitiesTotal: 3000,
      equipmentTotal: 2000,
      conveyanceTotal: 1000,
      miscTotal: 1000,
      total: 57000,
    },
    netProfit: 63000,
    partnerShares: [],
  }));

  const totals = {
    revenue: 1440000,
    expenses: 684000,
    netProfit: 756000,
  };

  const pdfBytes = await createYearlyReportPdf(2026, months, totals);
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 1000, 'PDF should have non-trivial size');
  const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
  assert.equal(header, '%PDF-');
});
