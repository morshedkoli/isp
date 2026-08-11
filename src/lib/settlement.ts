/**
 * Monthly partner commission settlement calculation.
 *
 * netCommission = companyCommission (total pool) − agent payouts − operating expenses
 * Each partner's due share = netCommission × sharePercent / 100
 *
 * Shared between the Dashboard and Partners pages so the two never drift.
 */

import { prisma } from '@/lib/prisma';

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
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      sharePercent: partner.sharePercent,
      dueAmount,
      paidAmount,
      remainingAmount: Math.max(dueAmount - paidAmount, 0),
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
  const [
    commissionRecord,
    salaryAgg,
    fiberCableAgg,
    rentAgg,
    utilitiesAgg,
    equipmentAgg,
    conveyanceAgg,
    miscAgg,
    partners,
    settlementPayouts,
  ] = await Promise.all([
    prisma.commissionRecord.findFirst({
      where: { year, month },
      orderBy: { createdAt: 'desc' },
      include: { agentEntries: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'SALARY' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'FIBER_CABLE' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'RENT' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'UTILITIES' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'EQUIPMENT' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'CONVEYANCE' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { year, month, type: 'MISC' },
      _sum: { amount: true },
    }),
    prisma.partner.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { sharePercent: 'desc' },
    }),
    prisma.partnerPayout.findMany({
      where: { isSettlement: true, settlementYear: year, settlementMonth: month },
      select: { partnerId: true, amount: true },
    }),
  ]);

  const companyCommission = commissionRecord?.totalPool ?? 0;
  const agentPayouts = commissionRecord?.agentEntries.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
  const salaryTotal = salaryAgg._sum.amount ?? 0;
  const fiberCableTotal = fiberCableAgg._sum.amount ?? 0;
  const rentTotal = rentAgg._sum.amount ?? 0;
  const utilitiesTotal = utilitiesAgg._sum.amount ?? 0;
  const equipmentTotal = equipmentAgg._sum.amount ?? 0;
  const conveyanceTotal = conveyanceAgg._sum.amount ?? 0;
  const miscTotal = miscAgg._sum.amount ?? 0;

  const paidByPartner: Record<string, number> = {};
  for (const payout of settlementPayouts) {
    paidByPartner[payout.partnerId] = (paidByPartner[payout.partnerId] ?? 0) + payout.amount;
  }

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
    partners: partners.map((partner) => ({
      id: partner.id,
      name: partner.user?.name ?? 'Partner',
      sharePercent: partner.sharePercent,
    })),
    paidByPartner,
  });
}
