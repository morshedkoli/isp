import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { calculateMonthlyPartnerSettlement } from '@/lib/settlement';
import { monthName, periodBounds, resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

async function getDashboardData(year: number, month: number) {
  const { start, end } = periodBounds(year, month);

  const [settlement, hotspotAgg, hotspotCount, recentHotspot] = await Promise.all([
    calculateMonthlyPartnerSettlement(year, month),
    prisma.hotspotSale.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.hotspotSale.count({
      where: { date: { gte: start, lte: end } },
    }),
    prisma.hotspotSale.findMany({
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ]);

  return {
    month: monthName(month),
    monthIndex: month,
    year,
    companyCommission: settlement.companyCommission,
    agentPayouts: settlement.agentPayouts,
    salaryTotal: settlement.salaryTotal,
    fiberCableTotal: settlement.fiberCableTotal,
    miscTotal: settlement.miscTotal,
    totalExpenses: settlement.totalExpenses,
    hotspotRevenue: hotspotAgg._sum.amount ?? 0,
    hotspotCount,
    netCommission: settlement.netCommission,
    // Renamed to match DashboardClient's prop shape.
    partnerShares: settlement.partners.map((partner) => ({
      id: partner.partnerId,
      name: partner.partnerName,
      sharePercent: partner.sharePercent,
      amount: partner.dueAmount,
      paidAmount: partner.paidAmount,
      remainingAmount: partner.remainingAmount,
    })),
    recentHotspot: recentHotspot.map((sale) => ({
      id: sale.id,
      package: sale.package,
      amount: sale.amount,
      customerName: sale.customerName,
      date: sale.date.toISOString(),
    })),
  };
}

export default async function DashboardPage({
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

  // An explicitly-picked period always wins, even with no data yet. Otherwise
  // fall back to the app-wide selection (proxy.ts), then the newest active month.
  const selectedPeriod = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const data = await getDashboardData(selectedPeriod.year, selectedPeriod.month);
  return <DashboardClient data={data} availablePeriods={availablePeriods} />;
}
