/**
 * Unified Partner Ledger & Balance Engine.
 *
 * Single source of truth for:
 *  - Automatic monthly commission share credits (synced live with CommissionRecord & Expense)
 *  - Partner payouts ("Give Money" — deducts from partner balance)
 *  - Manual balance adjustments (opening balance, bonus credit, write-off debit)
 *  - Chronological passbook transactions with running balance after each entry
 *  - FIFO + targeted period allocation so Dashboard & Reports always match Partner Profiles
 */

import { prisma } from '@/lib/prisma';
import { monthBounds, periodOf } from './business-date';
import { formatPeriod, periodKey, type Period } from './period';

export type PaymentMethodType = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
export type AdjustmentDirection = 'CREDIT' | 'DEBIT';

export interface LedgerPartnerInput {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sharePercent: number;
  isActive: boolean;
  createdAt: Date;
}

export interface LedgerMonthlyCalculationInput {
  id: string;
  year: number;
  month: number;
  totalPool: number;
  agentPayouts: number;
  totalExpenses: number;
  createdAt: Date;
}

export interface LedgerPayoutInput {
  id: string;
  partnerId: string;
  amount: number;
  date: Date;
  method: PaymentMethodType;
  referenceId: string | null;
  notes: string | null;
  isSettlement: boolean;
  settlementYear: number | null;
  settlementMonth: number | null;
  createdAt: Date;
}

export interface LedgerAdjustmentInput {
  id: string;
  partnerId: string;
  type: AdjustmentDirection;
  amount: number;
  date: Date;
  reason: string;
  notes: string | null;
  createdAt: Date;
}

export interface PartnerLedgerEntry {
  id: string;
  rawId: string;
  kind: 'CALCULATION' | 'PAYOUT' | 'ADJUSTMENT';
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  date: string; // ISO string
  title: string;
  subtitle: string | null;
  // Present on CALCULATION entries
  year?: number;
  month?: number;
  sharePercent?: number;
  netPool?: number;
  companyCommission?: number;
  totalDeductions?: number;
  // Present on PAYOUT entries
  method?: PaymentMethodType;
  referenceId?: string | null;
  notes?: string | null;
  isSettlement?: boolean;
  settlementYear?: number | null;
  settlementMonth?: number | null;
  // Present on ADJUSTMENT entries
  reason?: string;
}

export interface PartnerMonthlyEarningRow {
  year: number;
  month: number;
  companyCommission: number;
  agentPayouts: number;
  totalExpenses: number;
  netPool: number;
  sharePercent: number;
  creditedAmount: number;
  allocatedPaid: number;
  remainingDue: number;
}

export interface PartnerLedgerResult {
  partnerId: string;
  name: string;
  email: string;
  phone: string | null;
  sharePercent: number;
  isActive: boolean;
  createdAt: string;
  totalEarned: number;
  totalCreditAdjustments: number;
  totalDebitAdjustments: number;
  totalPaid: number;
  /** Positive = payable owed to partner; 0 = settled; Negative = advance given to partner */
  balance: number;
  thisMonthEarned: number;
  thisMonthPaid: number;
  calculatedMonthsCount: number;
  payoutsCount: number;
  adjustmentsCount: number;
  /** Newest-first passbook transactions with running balance after each transaction */
  entries: PartnerLedgerEntry[];
  /** Newest-first per-month calculation summary */
  monthlyBreakdown: PartnerMonthlyEarningRow[];
}

export interface ComputedPartnerLedgers {
  byPartnerId: Record<string, PartnerLedgerResult>;
  list: PartnerLedgerResult[];
  /** `${year}-${pad(month)}` -> partnerId -> allocated paid amount toward that month */
  allocatedPaidByPeriod: Record<string, Record<string, number>>;
}

/** Clean floating-point epsilon dust (e.g. 8031.806500000001 - 8031.8065 = 1e-12 -> 0). */
export function cleanMoney(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return 0;
  return Math.round(value * 10000) / 10000;
}

/** True when (year, month) is strictly before `cutoff` (excludes current & future months). */
export function isBeforePeriod(year: number, month: number, cutoff: Period): boolean {
  return year < cutoff.year || (year === cutoff.year && month < cutoff.month);
}

/** Returns the calendar month immediately preceding `period`. */
export function getPreviousPeriod(period: Period): Period {
  return period.month === 1
    ? { year: period.year - 1, month: 12 }
    : { year: period.year, month: period.month - 1 };
}

const KIND_ORDER: Record<PartnerLedgerEntry['kind'], number> = {
  CALCULATION: 0,
  ADJUSTMENT: 1,
  PAYOUT: 2,
};

/**
 * Pure ledger computation — zero I/O so every rule is fast and unit-testable.
 */
export function computePartnerLedgers(inputs: {
  partners: LedgerPartnerInput[];
  monthlyCalculations: LedgerMonthlyCalculationInput[];
  payouts: LedgerPayoutInput[];
  adjustments: LedgerAdjustmentInput[];
  selectedPeriod?: Period;
  /** When set, excludes monthly calculations in or after this period (e.g. current ongoing month). */
  excludeFromPeriod?: Period;
}): ComputedPartnerLedgers {
  const eligibleCalculations = inputs.excludeFromPeriod
    ? inputs.monthlyCalculations.filter((m) =>
        isBeforePeriod(m.year, m.month, inputs.excludeFromPeriod!),
      )
    : inputs.monthlyCalculations;

  const sortedMonths = [...eligibleCalculations].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  const payoutsByPartner = new Map<string, LedgerPayoutInput[]>();
  for (const payout of inputs.payouts) {
    const arr = payoutsByPartner.get(payout.partnerId);
    if (arr) arr.push(payout);
    else payoutsByPartner.set(payout.partnerId, [payout]);
  }

  const adjustmentsByPartner = new Map<string, LedgerAdjustmentInput[]>();
  for (const adj of inputs.adjustments) {
    const arr = adjustmentsByPartner.get(adj.partnerId);
    if (arr) arr.push(adj);
    else adjustmentsByPartner.set(adj.partnerId, [adj]);
  }

  const allocatedPaidByPeriod: Record<string, Record<string, number>> = {};
  for (const m of sortedMonths) {
    allocatedPaidByPeriod[periodKey(m.year, m.month)] = {};
  }

  const byPartnerId: Record<string, PartnerLedgerResult> = {};
  const list: PartnerLedgerResult[] = [];

  for (const partner of inputs.partners) {
    const partnerPayouts = payoutsByPartner.get(partner.id) ?? [];
    const partnerAdjustments = adjustmentsByPartner.get(partner.id) ?? [];

    interface SortableEntry {
      entry: Omit<PartnerLedgerEntry, 'balanceAfter'>;
      sortTime: number;
      createdTime: number;
    }

    const rawEntries: SortableEntry[] = [];
    const chronologicalMonths: Array<{
      year: number;
      month: number;
      companyCommission: number;
      agentPayouts: number;
      totalExpenses: number;
      netPool: number;
      creditedAmount: number;
      paid: number;
    }> = [];

    let totalEarned = 0;

    for (const calc of sortedMonths) {
      const netPool = calc.totalPool - calc.agentPayouts - calc.totalExpenses;
      const creditedAmount =
        partner.isActive && partner.sharePercent > 0 && netPool > 0
          ? cleanMoney((netPool * partner.sharePercent) / 100)
          : 0;

      chronologicalMonths.push({
        year: calc.year,
        month: calc.month,
        companyCommission: calc.totalPool,
        agentPayouts: calc.agentPayouts,
        totalExpenses: calc.totalExpenses,
        netPool,
        creditedAmount,
        paid: 0,
      });

      if (creditedAmount > 0) {
        totalEarned = cleanMoney(totalEarned + creditedAmount);
        const { end: periodEnd } = monthBounds(calc.year, calc.month);
        // If calculated after the month ended (e.g. Feb calculated on Mar 5), anchor at
        // the end of Feb so March's payout appears after February's credit. If calculated
        // mid-month (e.g. Nov 21), use createdAt so a same-day payout appears after it.
        const effectiveDate =
          calc.createdAt.getTime() < periodEnd.getTime() ? calc.createdAt : periodEnd;

        rawEntries.push({
          sortTime: effectiveDate.getTime(),
          createdTime: calc.createdAt.getTime(),
          entry: {
            id: `calc-${calc.year}-${String(calc.month).padStart(2, '0')}-${partner.id}`,
            rawId: calc.id,
            kind: 'CALCULATION',
            direction: 'CREDIT',
            amount: creditedAmount,
            date: effectiveDate.toISOString(),
            title: `${formatPeriod(calc.year, calc.month)} Commission Share`,
            subtitle: `${partner.sharePercent}% of ৳${Math.round(netPool).toLocaleString('en-US')} net pool`,
            year: calc.year,
            month: calc.month,
            sharePercent: partner.sharePercent,
            netPool,
            companyCommission: calc.totalPool,
            totalDeductions: calc.agentPayouts + calc.totalExpenses,
          },
        });
      }
    }

    let totalPaid = 0;
    let thisMonthPaid = 0;
    for (const payout of partnerPayouts) {
      totalPaid = cleanMoney(totalPaid + payout.amount);
      if (inputs.selectedPeriod) {
        const pPeriod = periodOf(payout.date);
        if (
          pPeriod.year === inputs.selectedPeriod.year &&
          pPeriod.month === inputs.selectedPeriod.month
        ) {
          thisMonthPaid = cleanMoney(thisMonthPaid + payout.amount);
        }
      }

      const subtitleParts: string[] = [];
      if (payout.isSettlement && payout.settlementYear && payout.settlementMonth) {
        subtitleParts.push(`Settlement for ${formatPeriod(payout.settlementYear, payout.settlementMonth)}`);
      }
      if (payout.notes) subtitleParts.push(payout.notes);
      else if (payout.referenceId) subtitleParts.push(`Ref: ${payout.referenceId}`);

      rawEntries.push({
        sortTime: payout.date.getTime(),
        createdTime: payout.createdAt.getTime(),
        entry: {
          id: `payout-${payout.id}`,
          rawId: payout.id,
          kind: 'PAYOUT',
          direction: 'DEBIT',
          amount: payout.amount,
          date: payout.date.toISOString(),
          title: `Money Given (${payout.method})`,
          subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
          method: payout.method,
          referenceId: payout.referenceId,
          notes: payout.notes,
          isSettlement: payout.isSettlement,
          settlementYear: payout.settlementYear,
          settlementMonth: payout.settlementMonth,
        },
      });
    }

    let totalCreditAdjustments = 0;
    let totalDebitAdjustments = 0;
    for (const adj of partnerAdjustments) {
      if (adj.type === 'CREDIT') {
        totalCreditAdjustments = cleanMoney(totalCreditAdjustments + adj.amount);
      } else {
        totalDebitAdjustments = cleanMoney(totalDebitAdjustments + adj.amount);
      }

      rawEntries.push({
        sortTime: adj.date.getTime(),
        createdTime: adj.createdAt.getTime(),
        entry: {
          id: `adj-${adj.id}`,
          rawId: adj.id,
          kind: 'ADJUSTMENT',
          direction: adj.type,
          amount: adj.amount,
          date: adj.date.toISOString(),
          title: adj.type === 'CREDIT' ? `Balance Credit: ${adj.reason}` : `Balance Deduction: ${adj.reason}`,
          subtitle: adj.notes || null,
          reason: adj.reason,
          notes: adj.notes,
        },
      });
    }

    // Allocate payouts to monthly breakdown: targeted settlements first, then FIFO general pool.
    let generalPool = 0;
    for (const payout of partnerPayouts) {
      if (payout.isSettlement && payout.settlementYear && payout.settlementMonth) {
        const target = chronologicalMonths.find(
          (m) => m.year === payout.settlementYear && m.month === payout.settlementMonth,
        );
        if (target) {
          const room = Math.max(0, cleanMoney(target.creditedAmount - target.paid));
          const applied = Math.min(room, payout.amount);
          target.paid = cleanMoney(target.paid + applied);
          generalPool = cleanMoney(generalPool + (payout.amount - applied));
          continue;
        }
      }
      generalPool = cleanMoney(generalPool + payout.amount);
    }

    // Debit adjustments also settle unpaid due amounts; credit adjustments absorb general pool first.
    generalPool = cleanMoney(generalPool + totalDebitAdjustments - totalCreditAdjustments);
    if (generalPool > 0) {
      for (const monthRow of chronologicalMonths) {
        if (generalPool <= 0) break;
        const room = Math.max(0, cleanMoney(monthRow.creditedAmount - monthRow.paid));
        if (room <= 0) continue;
        const applied = Math.min(room, generalPool);
        monthRow.paid = cleanMoney(monthRow.paid + applied);
        generalPool = cleanMoney(generalPool - applied);
      }
    }

    for (const monthRow of chronologicalMonths) {
      const key = periodKey(monthRow.year, monthRow.month);
      if (!allocatedPaidByPeriod[key]) allocatedPaidByPeriod[key] = {};
      allocatedPaidByPeriod[key][partner.id] = monthRow.paid;
    }

    // Sort chronologically oldest-first to compute running balance accurately.
    rawEntries.sort((a, b) => {
      if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
      const kindDiff = KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind];
      if (kindDiff !== 0) return kindDiff;
      if (a.createdTime !== b.createdTime) return a.createdTime - b.createdTime;
      return a.entry.id.localeCompare(b.entry.id);
    });

    let runningBalance = 0;
    const chronologicalWithBalance: PartnerLedgerEntry[] = rawEntries.map(({ entry }) => {
      const delta = entry.direction === 'CREDIT' ? entry.amount : -entry.amount;
      runningBalance = cleanMoney(runningBalance + delta);
      return {
        ...entry,
        balanceAfter: runningBalance,
      };
    });

    const balance = cleanMoney(
      totalEarned + totalCreditAdjustments - totalPaid - totalDebitAdjustments,
    );

    const thisMonthRow = inputs.selectedPeriod
      ? chronologicalMonths.find(
          (m) => m.year === inputs.selectedPeriod!.year && m.month === inputs.selectedPeriod!.month,
        )
      : undefined;

    const monthlyBreakdown: PartnerMonthlyEarningRow[] = [...chronologicalMonths]
      .reverse()
      .map((m) => ({
        year: m.year,
        month: m.month,
        companyCommission: m.companyCommission,
        agentPayouts: m.agentPayouts,
        totalExpenses: m.totalExpenses,
        netPool: m.netPool,
        sharePercent: partner.sharePercent,
        creditedAmount: m.creditedAmount,
        allocatedPaid: m.paid,
        remainingDue: Math.max(0, cleanMoney(m.creditedAmount - m.paid)),
      }));

    const result: PartnerLedgerResult = {
      partnerId: partner.id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      sharePercent: partner.sharePercent,
      isActive: partner.isActive,
      createdAt: partner.createdAt.toISOString(),
      totalEarned,
      totalCreditAdjustments,
      totalDebitAdjustments,
      totalPaid,
      balance,
      thisMonthEarned: thisMonthRow?.creditedAmount ?? 0,
      thisMonthPaid,
      calculatedMonthsCount: chronologicalMonths.filter((m) => m.creditedAmount > 0).length,
      payoutsCount: partnerPayouts.length,
      adjustmentsCount: partnerAdjustments.length,
      entries: [...chronologicalWithBalance].reverse(),
      monthlyBreakdown,
    };

    byPartnerId[partner.id] = result;
    list.push(result);
  }

  return {
    byPartnerId,
    list,
    allocatedPaidByPeriod,
  };
}

/**
 * Fetch all raw inputs needed to compute partner ledgers in 4 parallel queries.
 */
export async function fetchAllPartnerLedgers(
  selectedPeriod?: Period,
  options?: { includeCurrentMonth?: boolean },
): Promise<ComputedPartnerLedgers> {
  const currentPeriod = periodOf(new Date());
  const excludeFromPeriod = options?.includeCurrentMonth ? undefined : currentPeriod;
  const [partners, commissionRecords, expenseByMonth, payouts, adjustments] = await Promise.all([
    prisma.partner.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: [{ isActive: 'desc' }, { sharePercent: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.commissionRecord.findMany({
      include: { agentEntries: { select: { amount: true } } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
    prisma.expense.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
    }),
    prisma.partnerPayout.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.partnerAdjustment.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const expenseMap = new Map<string, number>();
  for (const row of expenseByMonth) {
    expenseMap.set(periodKey(row.year, row.month), row._sum.amount ?? 0);
  }

  const monthlyCalculations: LedgerMonthlyCalculationInput[] = commissionRecords.map((rec) => ({
    id: rec.id,
    year: rec.year,
    month: rec.month,
    totalPool: rec.totalPool,
    agentPayouts: rec.agentEntries.reduce((sum, e) => sum + e.amount, 0),
    totalExpenses: expenseMap.get(periodKey(rec.year, rec.month)) ?? 0,
    createdAt: rec.createdAt,
  }));

  return computePartnerLedgers({
    partners: partners.map((p) => ({
      id: p.id,
      name: p.user?.name ?? 'Partner',
      email: p.user?.email ?? '',
      phone: p.user?.phone || null,
      sharePercent: p.sharePercent,
      isActive: p.isActive,
      createdAt: p.createdAt,
    })),
    monthlyCalculations,
    payouts: payouts.map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      amount: p.amount,
      date: p.date,
      method: p.method as PaymentMethodType,
      referenceId: p.referenceId,
      notes: p.notes,
      isSettlement: p.isSettlement,
      settlementYear: p.settlementYear,
      settlementMonth: p.settlementMonth,
      createdAt: p.createdAt,
    })),
    adjustments: adjustments.map((a) => ({
      id: a.id,
      partnerId: a.partnerId,
      type: a.type as AdjustmentDirection,
      amount: a.amount,
      date: a.date,
      reason: a.reason,
      notes: a.notes,
      createdAt: a.createdAt,
    })),
    selectedPeriod,
    excludeFromPeriod,
  });
}
