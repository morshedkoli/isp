/**
 * Monthly partner commission settlement calculation.
 *
 * netCommission = companyCommission (total pool) − agent payouts − operating expenses
 * Each partner's due share = netCommission × sharePercent / 100
 *
 * Shared between the Dashboard, Reports, and Partners pages so they never drift.
 */

import { prisma } from '@/lib/prisma';
import { cleanMoney, fetchAllPartnerLedgers } from './partner-ledger';
import { periodKey } from './period';

export function settlementRef(year: number, month: number): string {
  return `SETTLEMENT-${year}-${String(month).padStart(2, '0')}`;
}

export interface PartnerSettlementRow {
  partnerId: string;
  partnerName: string;
  sharePercent: number;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
  /** Overall cumulative balance on this partner's profile across all months */
  balance?: number;
}

export interface MonthlyCommissionSettlement {
  year: number;
  month: number;
  periodStart: Date;
  periodEnd: Date;
  companyCommission: number;
  agentPayouts: number;
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal: number;
  utilitiesTotal: number;
  equipmentTotal: number;
  conveyanceTotal: number;
  miscTotal: number;
  totalExpenses: number;
  netCommission: number;
  partners: PartnerSettlementRow[];
}

export interface SettlementPartnerInput {
  id: string;
  name: string;
  sharePercent: number;
  balance?: number;
}

export interface SettlementCalculationInputs {
  year: number;
  month: number;
  companyCommission: number;
  agentPayouts: number;
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal?: number;
  utilitiesTotal?: number;
  equipmentTotal?: number;
  conveyanceTotal?: number;
  miscTotal: number;
  partners: SettlementPartnerInput[];
  /** partnerId → total amount already paid toward this period's settlement */
  paidByPartner: Record<string, number>;
}

/**
 * Pure settlement math — no I/O. Kept separate from the DB-fetching wrapper below
 * so the calculation can be unit tested without a database.
 */
export function computeMonthlyPartnerSettlement(
  inputs: SettlementCalculationInputs
): MonthlyCommissionSettlement {
  const periodStart = new Date(inputs.year, inputs.month - 1, 1);
  const periodEnd = new Date(inputs.year, inputs.month, 0, 23, 59, 59);

  const rentTotal = inputs.rentTotal ?? 0;
  const utilitiesTotal = inputs.utilitiesTotal ?? 0;
  const equipmentTotal = inputs.equipmentTotal ?? 0;
  const conveyanceTotal = inputs.conveyanceTotal ?? 0;

  const totalExpenses =
    inputs.salaryTotal +
    inputs.fiberCableTotal +
    rentTotal +
    utilitiesTotal +
    equipmentTotal +
    conveyanceTotal +
    inputs.miscTotal;

  const netCommission = inputs.companyCommission - inputs.agentPayouts - totalExpenses;

  const partners: PartnerSettlementRow[] = inputs.partners.map((partner) => {
    const dueAmount = netCommission > 0 ? (netCommission * partner.sharePercent) / 100 : 0;
    const paidAmount = inputs.paidByPartner[partner.id] ?? 0;
    const rawRemaining = dueAmount - paidAmount;
    const remainingAmount = rawRemaining > 0.005 ? rawRemaining : 0;
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      sharePercent: partner.sharePercent,
      dueAmount,
      paidAmount,
      remainingAmount,
      ...(partner.balance !== undefined ? { balance: partner.balance } : {}),
    };
  });

  return {
    year: inputs.year,
    month: inputs.month,
    periodStart,
    periodEnd,
    companyCommission: inputs.companyCommission,
    agentPayouts: inputs.agentPayouts,
    salaryTotal: inputs.salaryTotal,
    fiberCableTotal: inputs.fiberCableTotal,
    rentTotal,
    utilitiesTotal,
    equipmentTotal,
    conveyanceTotal,
    miscTotal: inputs.miscTotal,
    totalExpenses,
    netCommission,
    partners,
  };
}

export async function calculateMonthlyPartnerSettlement(
  year: number,
  month: number
): Promise<MonthlyCommissionSettlement> {
  const [commissionRecord, expenseGroups, ledgers] = await Promise.all([
    prisma.commissionRecord.findFirst({
      where: { year, month },
      orderBy: { createdAt: 'desc' },
      include: { agentEntries: true },
    }),
    prisma.expense.groupBy({
      by: ['type'],
      where: { year, month },
      _sum: { amount: true },
    }),
    fetchAllPartnerLedgers({ year, month }),
  ]);

  const byType: Record<string, number> = {};
  for (const g of expenseGroups) {
    byType[g.type] = g._sum.amount ?? 0;
  }

  const companyCommission = commissionRecord?.totalPool ?? 0;
  const agentPayouts = commissionRecord?.agentEntries.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
  const salaryTotal = byType.SALARY ?? 0;
  const fiberCableTotal = byType.FIBER_CABLE ?? 0;
  const rentTotal = byType.RENT ?? 0;
  const utilitiesTotal = byType.UTILITIES ?? 0;
  const equipmentTotal = byType.EQUIPMENT ?? 0;
  const conveyanceTotal = byType.CONVEYANCE ?? 0;
  const miscTotal = byType.MISC ?? 0;

  const activeLedgers = ledgers.list.filter((p) => p.isActive);
  const key = periodKey(year, month);
  const paidByPartner = ledgers.allocatedPaidByPeriod[key] ?? {};

  return computeMonthlyPartnerSettlement({
    year,
    month,
    companyCommission,
    agentPayouts,
    salaryTotal,
    fiberCableTotal,
    rentTotal,
    utilitiesTotal,
    equipmentTotal,
    conveyanceTotal,
    miscTotal,
    partners: activeLedgers.map((partner) => ({
      id: partner.partnerId,
      name: partner.name,
      sharePercent: partner.sharePercent,
      balance: cleanMoney(partner.balance),
    })),
    paidByPartner,
  });
}
