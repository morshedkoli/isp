import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { periodBounds, resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import HotspotClient from './HotspotClient';
import { getHotspotSummary } from './actions';
import type { PkgKey } from './shared';

export const dynamic = 'force-dynamic';

const EMPTY_SUMMARY = {
  sevenDay: { count: 0, revenue: 0 },
  thirtyDay: { count: 0, revenue: 0 },
  totalRevenue: 0,
};

export default async function HotspotPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requirePermission(PermissionModule.HOTSPOT, PermissionAction.VIEW);

  const params = await searchParams;
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const { year, month } = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const { start, end } = periodBounds(year, month);

  const [rawSales, summaryResult] = await Promise.all([
    prisma.hotspotSale.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'desc' },
    }),
    getHotspotSummary(year, month),
  ]);

  // Mapped explicitly rather than cast, so a schema change surfaces as a type error.
  const sales = rawSales.map((sale) => ({
    id: sale.id,
    package: sale.package as PkgKey,
    quantity: sale.quantity,
    discount: sale.discount,
    amount: sale.amount,
    date: sale.date.toISOString(),
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    notes: sale.notes,
  }));

  const summary =
    summaryResult.success && summaryResult.summary ? summaryResult.summary : EMPTY_SUMMARY;

  return (
    <HotspotClient
      sales={sales}
      summary={summary}
      year={year}
      month={month}
      availablePeriods={availablePeriods}
    />
  );
}
