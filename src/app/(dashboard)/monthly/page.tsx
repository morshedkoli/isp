import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { calculateMonthlyPartnerSettlement } from '@/lib/settlement';
import { monthName, periodBounds, resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import MonthlyClient from './MonthlyClient';

export const dynamic = 'force-dynamic';

async function getMonthlyInfoData(year: number, month: number) {
  const { start, end } = periodBounds(year, month);

  const [
    settlement,
    commissionRecord,
    expenseRows,
    hotspotAgg,
    hotspotCount,
    recentHotspot,
    periodPayouts,
  ] = await Promise.all([
    calculateMonthlyPartnerSettlement(year, month),
    prisma.commissionRecord.findUnique({
      where: { year_month: { year, month } },
      include: {
        sources: true,
        agentEntries: { include: { agent: true } },
      },
    }),
    prisma.expense.findMany({
      where: { year, month },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    prisma.hotspotSale.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true, quantity: true },
    }),
    prisma.hotspotSale.count({
      where: { date: { gte: start, lte: end } },
    }),
    prisma.hotspotSale.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.partnerPayout.findMany({
      where: {
        OR: [
          { date: { gte: start, lte: end } },
          { isSettlement: true, settlementYear: year, settlementMonth: month },
        ],
      },
      include: {
        partner: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return {
    month: monthName(month),
    monthIndex: month,
    year,
    companyCommission: settlement.companyCommission,
    sources: (commissionRecord?.sources ?? []).map((s) => ({
      id: s.id,
      description: s.description,
      amount: s.amount,
    })),
    agentPayouts: settlement.agentPayouts,
    agentBreakdown: (commissionRecord?.agentEntries ?? []).map((entry) => ({
      id: entry.id,
      agentName: entry.agent.name,
      percent: entry.agent.commissionPercent,
      amount: entry.amount,
    })),
    salaryTotal: settlement.salaryTotal,
    fiberCableTotal: settlement.fiberCableTotal,
    rentTotal: settlement.rentTotal,
    utilitiesTotal: settlement.utilitiesTotal,
    equipmentTotal: settlement.equipmentTotal,
    conveyanceTotal: settlement.conveyanceTotal,
    miscTotal: settlement.miscTotal,
    totalExpenses: settlement.totalExpenses,
    recentExpenses: expenseRows.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      amount: e.amount,
      date: e.date.toISOString(),
    })),
    hotspotRevenue: hotspotAgg._sum.amount ?? 0,
    hotspotVouchers: hotspotAgg._sum.quantity ?? hotspotCount,
    hotspotCount,
    netCommission: settlement.netCommission,
    hasCommissionRecord: Boolean(commissionRecord),
    partnerShares: settlement.partners.map((partner) => ({
      id: partner.partnerId,
      name: partner.partnerName,
      sharePercent: partner.sharePercent,
      amount: partner.dueAmount,
      paidAmount: partner.paidAmount,
      remainingAmount: partner.remainingAmount,
      balance: partner.balance ?? partner.remainingAmount,
    })),
    recentHotspot: recentHotspot.map((sale) => ({
      id: sale.id,
      package: sale.package,
      quantity: sale.quantity,
      amount: sale.amount,
      customerName: sale.customerName,
      date: sale.date.toISOString(),
    })),
    periodPayouts: periodPayouts.map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      partnerName: p.partner?.user?.name ?? 'Partner',
      amount: p.amount,
      method: p.method,
      date: p.date.toISOString(),
      notes: p.notes,
    })),
  };
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);

  const params = await searchParams;
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const selectedPeriod = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const data = await getMonthlyInfoData(selectedPeriod.year, selectedPeriod.month);
  return <MonthlyClient data={data} />;
}
