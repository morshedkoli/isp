import test from 'node:test';
import assert from 'node:assert/strict';
import { computePartnerLedgers } from '../src/lib/partner-ledger';

const samplePartners = [
  {
    id: 'p1',
    name: 'Murshed',
    email: 'murshed@internal.local',
    phone: '01700000001',
    sharePercent: 60.87,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'p2',
    name: 'Halim',
    email: 'halim@internal.local',
    phone: '01700000002',
    sharePercent: 26.09,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'p3',
    name: 'Tanzina',
    email: 'tanzina@internal.local',
    phone: null,
    sharePercent: 13.04,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  },
];

test('credits calculated monthly shares to partner balances and deducts payouts', () => {
  const result = computePartnerLedgers({
    partners: samplePartners,
    monthlyCalculations: [
      {
        id: 'rec-feb',
        year: 2026,
        month: 2,
        totalPool: 150000,
        agentPayouts: 30000,
        totalExpenses: 20000, // netPool = 100,000
        createdAt: new Date('2026-03-05T08:00:00Z'),
      },
      {
        id: 'rec-mar',
        year: 2026,
        month: 3,
        totalPool: 110000,
        agentPayouts: 40000,
        totalExpenses: 20000, // netPool = 50,000
        createdAt: new Date('2026-04-05T08:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'pay-1',
        partnerId: 'p2',
        amount: 26090, // settles Feb completely
        date: new Date('2026-03-07T00:00:00Z'),
        method: 'CASH',
        referenceId: 'SETTLEMENT-2026-02',
        notes: null,
        isSettlement: true,
        settlementYear: 2026,
        settlementMonth: 2,
        createdAt: new Date('2026-03-07T08:00:00Z'),
      },
      {
        id: 'pay-2',
        partnerId: 'p2',
        amount: 5000, // partial general money given in April
        date: new Date('2026-04-10T00:00:00Z'),
        method: 'BKASH',
        referenceId: null,
        notes: 'Partial payout',
        isSettlement: false,
        settlementYear: null,
        settlementMonth: null,
        createdAt: new Date('2026-04-10T08:00:00Z'),
      },
    ],
    adjustments: [],
    selectedPeriod: { year: 2026, month: 3 },
  });

  // Murshed: 60,870 + 30,435 = 91,305, paid 0
  const murshed = result.byPartnerId.p1;
  assert.equal(murshed.totalEarned, 91305);
  assert.equal(murshed.totalPaid, 0);
  assert.equal(murshed.balance, 91305);
  assert.equal(murshed.thisMonthEarned, 30435);

  // Halim: 26,090 + 13,045 = 39,135; paid 26,090 + 5,000 = 31,090 -> balance = 8,045
  const halim = result.byPartnerId.p2;
  assert.equal(halim.totalEarned, 39135);
  assert.equal(halim.totalPaid, 31090);
  assert.equal(halim.balance, 8045);

  // Verify chronological running balances (entries returned newest-first)
  const chronological = [...halim.entries].reverse();
  assert.equal(chronological.length, 4);
  assert.equal(chronological[0].balanceAfter, 26090); // Feb share (+26,090)
  assert.equal(chronological[1].balanceAfter, 0);     // Mar 7 payout (-26,090)
  assert.equal(chronological[2].balanceAfter, 13045); // Mar share (+13,045)
  assert.equal(chronological[3].balanceAfter, 8045);  // Apr 10 payout (-5,000)

  // Verify FIFO period allocation reflects the general ৳5,000 payout on March 2026
  assert.equal(result.allocatedPaidByPeriod['2026-02'].p2, 26090);
  assert.equal(result.allocatedPaidByPeriod['2026-03'].p2, 5000);
});

test('supports credit and debit balance adjustments and advance overpayments', () => {
  const result = computePartnerLedgers({
    partners: [samplePartners[2]], // Tanzina (13.04%)
    monthlyCalculations: [
      {
        id: 'rec-1',
        year: 2026,
        month: 5,
        totalPool: 100000,
        agentPayouts: 0,
        totalExpenses: 0, // Tanzina share = 13,040
        createdAt: new Date('2026-05-15T10:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'pay-adv',
        partnerId: 'p3',
        amount: 15000, // more than 13,040 + 1,000 - 500 = 13,540 -> advance of -1,460
        date: new Date('2026-05-20T00:00:00Z'),
        method: 'CASH',
        referenceId: null,
        notes: null,
        isSettlement: false,
        settlementYear: null,
        settlementMonth: null,
        createdAt: new Date('2026-05-20T12:00:00Z'),
      },
    ],
    adjustments: [
      {
        id: 'adj-credit',
        partnerId: 'p3',
        type: 'CREDIT',
        amount: 1000,
        date: new Date('2026-05-01T00:00:00Z'),
        reason: 'Opening balance',
        notes: null,
        createdAt: new Date('2026-05-01T00:00:00Z'),
      },
      {
        id: 'adj-debit',
        partnerId: 'p3',
        type: 'DEBIT',
        amount: 500,
        date: new Date('2026-05-18T00:00:00Z'),
        reason: 'Offset',
        notes: null,
        createdAt: new Date('2026-05-18T00:00:00Z'),
      },
    ],
  });

  const tanzina = result.byPartnerId.p3;
  assert.equal(tanzina.totalEarned, 13040);
  assert.equal(tanzina.totalCreditAdjustments, 1000);
  assert.equal(tanzina.totalDebitAdjustments, 500);
  assert.equal(tanzina.totalPaid, 15000);
  assert.equal(tanzina.balance, -1460); // 13040 + 1000 - 500 - 15000 = -1460 advance
});

test('eliminates floating point epsilon dust on exact settlements', () => {
  const result = computePartnerLedgers({
    partners: [samplePartners[1]], // Halim 26.09%
    monthlyCalculations: [
      {
        id: 'rec-mar',
        year: 2026,
        month: 3,
        totalPool: 30785,
        agentPayouts: 0,
        totalExpenses: 0, // 30785 * 26.09 / 100 = 8031.8065
        createdAt: new Date('2026-04-05T00:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'pay-exact',
        partnerId: 'p2',
        amount: 8031.806500000001,
        date: new Date('2026-04-07T00:00:00Z'),
        method: 'CASH',
        referenceId: 'SETTLEMENT-2026-03',
        notes: null,
        isSettlement: true,
        settlementYear: 2026,
        settlementMonth: 3,
        createdAt: new Date('2026-04-07T00:00:00Z'),
      },
    ],
    adjustments: [],
  });

  assert.equal(result.byPartnerId.p2.balance, 0);
  assert.equal(result.byPartnerId.p2.monthlyBreakdown[0].remainingDue, 0);
});

import { computeAgentLedgers } from '../src/lib/agent-ledger';

test('computes field agent commission credits, recorded payments, and running balance', () => {
  const result = computeAgentLedgers({
    agents: [
      {
        id: 'ag1',
        name: 'Sourab',
        phone: null,
        commissionPercent: 42,
        notes: 'Kunda',
        isActive: true,
        createdAt: new Date('2026-03-01T00:00:00Z'),
      },
    ],
    commissionEntries: [
      {
        id: 'ce1',
        agentId: 'ag1',
        year: 2026,
        month: 2,
        amount: 38610,
        recordCreatedAt: new Date('2026-03-05T08:00:00Z'),
      },
      {
        id: 'ce2',
        agentId: 'ag1',
        year: 2026,
        month: 3,
        amount: 40730,
        recordCreatedAt: new Date('2026-04-06T04:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'ap1',
        agentId: 'ag1',
        amount: 38610,
        date: new Date('2026-03-08T00:00:00Z'),
        method: 'CASH',
        referenceId: null,
        notes: 'Feb payout',
        createdAt: new Date('2026-03-08T10:00:00Z'),
      },
      {
        id: 'ap2',
        agentId: 'ag1',
        amount: 10730,
        date: new Date('2026-04-10T00:00:00Z'),
        method: 'BKASH',
        referenceId: null,
        notes: 'Partial March payout',
        createdAt: new Date('2026-04-10T10:00:00Z'),
      },
    ],
    adjustments: [],
  });

  const sourab = result.byAgentId.ag1;
  assert.equal(sourab.totalEarned, 79340);
  assert.equal(sourab.totalPaid, 49340);
  assert.equal(sourab.balance, 30000);
  assert.equal(sourab.entries.length, 4);
});

test('excludes current ongoing month calculations while still deducting current month payments', () => {
  const partnerRes = computePartnerLedgers({
    partners: [samplePartners[1]], // Halim 26.09%
    monthlyCalculations: [
      {
        id: 'rec-oct',
        year: 2026,
        month: 10,
        totalPool: 100000,
        agentPayouts: 0,
        totalExpenses: 0, // Halim Oct share = 26,090
        createdAt: new Date('2026-11-05T08:00:00Z'),
      },
      {
        id: 'rec-nov-ongoing',
        year: 2026,
        month: 11,
        totalPool: 100000,
        agentPayouts: 0,
        totalExpenses: 0, // Ongoing Nov — must be excluded!
        createdAt: new Date('2026-11-20T08:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'pay-nov',
        partnerId: 'p2',
        amount: 6090, // Paid during Nov against Oct balance
        date: new Date('2026-11-21T00:00:00Z'),
        method: 'CASH',
        referenceId: null,
        notes: null,
        isSettlement: false,
        settlementYear: null,
        settlementMonth: null,
        createdAt: new Date('2026-11-21T08:00:00Z'),
      },
    ],
    adjustments: [],
    excludeFromPeriod: { year: 2026, month: 11 },
  });

  assert.equal(partnerRes.byPartnerId.p2.totalEarned, 26090);
  assert.equal(partnerRes.byPartnerId.p2.totalPaid, 6090);
  assert.equal(partnerRes.byPartnerId.p2.balance, 20000);
  assert.equal(partnerRes.byPartnerId.p2.calculatedMonthsCount, 1);

  const agentRes = computeAgentLedgers({
    agents: [
      {
        id: 'ag1',
        name: 'Sourab',
        phone: null,
        commissionPercent: 42,
        notes: 'Kunda',
        isActive: true,
        createdAt: new Date('2026-03-01T00:00:00Z'),
      },
    ],
    commissionEntries: [
      {
        id: 'ce-oct',
        agentId: 'ag1',
        year: 2026,
        month: 10,
        amount: 40000,
        recordCreatedAt: new Date('2026-11-05T00:00:00Z'),
      },
      {
        id: 'ce-nov-ongoing',
        agentId: 'ag1',
        year: 2026,
        month: 11,
        amount: 45000, // Ongoing Nov — must be excluded!
        recordCreatedAt: new Date('2026-11-20T00:00:00Z'),
      },
    ],
    payouts: [
      {
        id: 'ap-nov',
        agentId: 'ag1',
        amount: 15000,
        date: new Date('2026-11-21T00:00:00Z'),
        method: 'CASH',
        referenceId: null,
        notes: null,
        createdAt: new Date('2026-11-21T08:00:00Z'),
      },
    ],
    adjustments: [],
    excludeFromPeriod: { year: 2026, month: 11 },
  });

  assert.equal(agentRes.byAgentId.ag1.totalEarned, 40000);
  assert.equal(agentRes.byAgentId.ag1.totalPaid, 15000);
  assert.equal(agentRes.byAgentId.ag1.balance, 25000);
  assert.equal(agentRes.byAgentId.ag1.calculatedMonthsCount, 1);
});
