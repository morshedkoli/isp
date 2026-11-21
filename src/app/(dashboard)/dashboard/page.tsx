import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { periodOf } from '@/lib/business-date';
import { cleanMoney, fetchAllPartnerLedgers } from '@/lib/partner-ledger';
import { formatPeriod, periodKey, sortPeriodsDesc } from '@/lib/period';
import DashboardClient, { type OverviewData } from './DashboardClient';

export const dynamic = 'force-dynamic';

async function getOverviewData(): Promise<OverviewData> {
  const [
    commissionRecords,
    expenseByType,
    expenseByMonth,
    expenseCount,
    hotspotSales,
    ledgers,
  ] = await Promise.all([
    prisma.commissionRecord.findMany({
      include: {
        agentEntries: { include: { agent: true } },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
    prisma.expense.groupBy({
      by: ['type'],
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['year', 'month'],
      _sum: { amount: true },
    }),
    prisma.expense.count(),
    prisma.hotspotSale.findMany({
      select: { amount: true, quantity: true, package: true, date: true },
    }),
    fetchAllPartnerLedgers(),
  ]);

  const totalCompanyCommission = cleanMoney(
    commissionRecords.reduce((sum, rec) => sum + rec.totalPool, 0),
  );

  // Per-agent cumulative totals across all calculated months
  const agentTotalsMap = new Map<
    string,
    { id: string; name: string; percent: number; totalAmount: number; monthsCount: number }
  >();
  let totalAgentPayouts = 0;

  for (const rec of commissionRecords) {
    for (const entry of rec.agentEntries) {
      totalAgentPayouts = cleanMoney(totalAgentPayouts + entry.amount);
      const existing = agentTotalsMap.get(entry.agentId);
      if (existing) {
        existing.totalAmount = cleanMoney(existing.totalAmount + entry.amount);
        existing.monthsCount += 1;
      } else {
        agentTotalsMap.set(entry.agentId, {
          id: entry.agentId,
          name: entry.agent.name,
          percent: entry.agent.commissionPercent,
          totalAmount: cleanMoney(entry.amount),
          monthsCount: 1,
        });
      }
    }
  }

  const expensesByCategory: Record<string, number> = {};
  for (const g of expenseByType) {
    expensesByCategory[g.type] = cleanMoney(g._sum.amount ?? 0);
  }

  const salaryTotal = expensesByCategory.SALARY ?? 0;
  const fiberCableTotal = expensesByCategory.FIBER_CABLE ?? 0;
  const rentTotal = expensesByCategory.RENT ?? 0;
  const utilitiesTotal = expensesByCategory.UTILITIES ?? 0;
  const equipmentTotal = expensesByCategory.EQUIPMENT ?? 0;
  const conveyanceTotal = expensesByCategory.CONVEYANCE ?? 0;
  const miscTotal = expensesByCategory.MISC ?? 0;
  const totalExpenses = cleanMoney(
    salaryTotal +
      fiberCableTotal +
      rentTotal +
      utilitiesTotal +
      equipmentTotal +
      conveyanceTotal +
      miscTotal,
  );

  // Hotspot all-time & monthly buckets
  let totalHotspotRevenue = 0;
  let totalHotspotVouchers = 0;
  let sevenDayVouchers = 0;
  let thirtyDayVouchers = 0;
  const hotspotByPeriod = new Map<string, { amount: number; vouchers: number }>();

  for (const sale of hotspotSales) {
    totalHotspotRevenue = cleanMoney(totalHotspotRevenue + sale.amount);
    totalHotspotVouchers += sale.quantity;
    if (sale.package === 'SEVEN_DAY') sevenDayVouchers += sale.quantity;
    if (sale.package === 'THIRTY_DAY') thirtyDayVouchers += sale.quantity;

    const p = periodOf(sale.date);
    const key = periodKey(p.year, p.month);
    const bucket = hotspotByPeriod.get(key);
    if (bucket) {
      bucket.amount = cleanMoney(bucket.amount + sale.amount);
      bucket.vouchers += sale.quantity;
    } else {
      hotspotByPeriod.set(key, { amount: cleanMoney(sale.amount), vouchers: sale.quantity });
    }
  }

  // Monthly history union across commissions, expenses, and hotspot sales
  const commissionByPeriod = new Map<
    string,
    { companyCommission: number; agentPayouts: number; hasCommission: boolean }
  >();
  for (const rec of commissionRecords) {
    const key = periodKey(rec.year, rec.month);
    const agentsSum = rec.agentEntries.reduce((s, e) => s + e.amount, 0);
    commissionByPeriod.set(key, {
      companyCommission: cleanMoney(rec.totalPool),
      agentPayouts: cleanMoney(agentsSum),
      hasCommission: true,
    });
  }

  const expenseMap = new Map<string, number>();
  for (const row of expenseByMonth) {
    expenseMap.set(periodKey(row.year, row.month), cleanMoney(row._sum.amount ?? 0));
  }

  const allPeriodKeys = new Set<string>([
    ...commissionByPeriod.keys(),
    ...expenseMap.keys(),
    ...hotspotByPeriod.keys(),
  ]);

  const sortedPeriods = sortPeriodsDesc(
    Array.from(allPeriodKeys).map((k) => {
      const [y, m] = k.split('-').map((n) => parseInt(n, 10));
      return { year: y, month: m };
    }),
  );

  const monthlyHistory = sortedPeriods.map(({ year, month }) => {
    const key = periodKey(year, month);
    const comm = commissionByPeriod.get(key);
    const companyCommission = comm?.companyCommission ?? 0;
    const agentPayouts = comm?.agentPayouts ?? 0;
    const expenses = expenseMap.get(key) ?? 0;
    const hotspot = hotspotByPeriod.get(key)?.amount ?? 0;
    const netCommission = cleanMoney(companyCommission - agentPayouts - expenses);

    return {
      year,
      month,
      hasCommission: Boolean(comm?.hasCommission),
      companyCommission,
      agentPayouts,
      expenses,
      hotspotRevenue: hotspot,
      netCommission,
    };
  });

  const totalNetCommission = cleanMoney(
    totalCompanyCommission - totalAgentPayouts - totalExpenses,
  );

  const partners = ledgers.list.map((p) => ({
    id: p.partnerId,
    name: p.name,
    sharePercent: p.sharePercent,
    isActive: p.isActive,
    totalCredited: cleanMoney(p.totalEarned + p.totalCreditAdjustments),
    totalGiven: cleanMoney(p.totalPaid + p.totalDebitAdjustments),
    balance: p.balance,
    payoutsCount: p.payoutsCount,
  }));

  const totalPartnerCredited = cleanMoney(
    partners.reduce((sum, p) => sum + p.totalCredited, 0),
  );
  const totalPartnerGiven = cleanMoney(
    partners.reduce((sum, p) => sum + p.totalGiven, 0),
  );
  const totalPartnerPayable = cleanMoney(
    partners.reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0),
  );

  const oldestPeriod = sortedPeriods[sortedPeriods.length - 1];
  const newestPeriod = sortedPeriods[0];
  const spanLabel =
    oldestPeriod && newestPeriod
      ? oldestPeriod.year === newestPeriod.year && oldestPeriod.month === newestPeriod.month
        ? formatPeriod(newestPeriod.year, newestPeriod.month)
        : `${formatPeriod(oldestPeriod.year, oldestPeriod.month)} – ${formatPeriod(newestPeriod.year, newestPeriod.month)}`
      : 'All recorded periods';

  return {
    spanLabel,
    calculatedMonthsCount: commissionRecords.length,
    activeMonthsCount: sortedPeriods.length,
    totalCompanyCommission,
    totalAgentPayouts,
    agents: Array.from(agentTotalsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    expenses: {
      salaryTotal,
      fiberCableTotal,
      rentTotal,
      utilitiesTotal,
      equipmentTotal,
      conveyanceTotal,
      miscTotal,
      total: totalExpenses,
      entriesCount: expenseCount,
    },
    hotspot: {
      totalRevenue: totalHotspotRevenue,
      totalVouchers: totalHotspotVouchers,
      salesCount: hotspotSales.length,
      sevenDayVouchers,
      thirtyDayVouchers,
    },
    totalNetCommission,
    combinedBusinessNet: cleanMoney(totalNetCommission + totalHotspotRevenue),
    partners,
    totalPartnerCredited,
    totalPartnerGiven,
    totalPartnerPayable,
    monthlyHistory,
  };
}

export default async function OverviewPage() {
  await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);
  const data = await getOverviewData();
  return <DashboardClient data={data} />;
}
