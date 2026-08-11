import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthlyPartnerSettlement } from '../src/lib/settlement';

test('computes net commission after agent payouts and expenses', () => {
  const result = computeMonthlyPartnerSettlement({
    year: 2026,
    month: 3,
    companyCommission: 100000,
    agentPayouts: 15000,
    salaryTotal: 20000,
    fiberCableTotal: 7000,
    miscTotal: 5000,
    partners: [],
    paidByPartner: {},
  });

  assert.equal(result.totalExpenses, 32000);
  assert.equal(result.netCommission, 53000); // 100000 - 15000 - 32000
});

test('splits net commission across partners by share percent', () => {
  const result = computeMonthlyPartnerSettlement({
    year: 2026,
    month: 3,
    companyCommission: 100000,
    agentPayouts: 0,
    salaryTotal: 0,
    fiberCableTotal: 0,
    miscTotal: 0,
    partners: [
      { id: 'p1', name: 'Alice', sharePercent: 60 },
      { id: 'p2', name: 'Bob', sharePercent: 40 },
    ],
    paidByPartner: {},
  });

  assert.equal(result.netCommission, 100000);

  const alice = result.partners.find((p) => p.partnerId === 'p1');
  const bob = result.partners.find((p) => p.partnerId === 'p2');
  assert.equal(alice?.dueAmount, 60000);
  assert.equal(bob?.dueAmount, 40000);
});

test('tracks remaining amount against amounts already paid', () => {
  const result = computeMonthlyPartnerSettlement({
    year: 2026,
    month: 3,
    companyCommission: 100000,
    agentPayouts: 0,
    salaryTotal: 0,
    fiberCableTotal: 0,
    miscTotal: 0,
    partners: [{ id: 'p1', name: 'Alice', sharePercent: 50 }],
    paidByPartner: { p1: 20000 },
  });

  const alice = result.partners[0];
  assert.equal(alice.dueAmount, 50000);
  assert.equal(alice.paidAmount, 20000);
  assert.equal(alice.remainingAmount, 30000);
});

test('remaining amount never goes negative when overpaid', () => {
  const result = computeMonthlyPartnerSettlement({
    year: 2026,
    month: 3,
    companyCommission: 100000,
    agentPayouts: 0,
    salaryTotal: 0,
    fiberCableTotal: 0,
    miscTotal: 0,
    partners: [{ id: 'p1', name: 'Alice', sharePercent: 50 }],
    paidByPartner: { p1: 99999999 },
  });

  assert.equal(result.partners[0].remainingAmount, 0);
});

test('clamps partner due amounts to zero when net commission is negative', () => {
  const result = computeMonthlyPartnerSettlement({
    year: 2026,
    month: 3,
    companyCommission: 10000,
    agentPayouts: 5000,
    salaryTotal: 8000,
    fiberCableTotal: 0,
    miscTotal: 2000,
    partners: [{ id: 'p1', name: 'Alice', sharePercent: 50 }],
    paidByPartner: {},
  });

  assert.equal(result.netCommission, -5000);
  assert.equal(result.partners[0].dueAmount, 0);
  assert.equal(result.partners[0].remainingAmount, 0);
});
