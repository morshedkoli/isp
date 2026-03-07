import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

type Period = { year: number; month: number };

function settlementRef(year: number, month: number) {
  return `SETTLEMENT-${year}-${String(month).padStart(2, '0')}`;
}

async function getAvailableDashboardPeriods(): Promise<Period[]> {
  const [commissions, expenses, hotspotSales] = await Promise.all([
    prisma.commissionRecord.findMany({
      select: { year: true, month: true },
    }),
    prisma.expense.findMany({
      select: { year: true, month: true },
    }),
    prisma.hotspotSale.findMany({
      select: { date: true },
    }),
  ]);

  const periods = new Set<string>();

  for (const row of commissions) {
    periods.add(`${row.year}-${row.month}`);
  }

  for (const row of expenses) {
    periods.add(`${row.year}-${row.month}`);
  }

  for (const sale of hotspotSales) {
    const date = new Date(sale.date);
    periods.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
  }

  return Array.from(periods)
    .map((value) => {
      const [year, month] = value.split('-').map((part) => parseInt(part, 10));
      return { year, month };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

async function getDashboardData(year: number, month: number) {
  // Date constructor uses 0-indexed month (0-11)
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // ── parallel fetches ─────────────────────────────────────────────────────────
  const [
    commissionRecord,
    salaryAgg,
    miscAgg,
    hotspotAgg,
    hotspotCount,
    partners,
    monthlySettlements,
    recentHotspot,
  ] = await Promise.all([
    // Latest saved commission record for current month
    prisma.commissionRecord.findFirst({
      where: { year, month },
      orderBy: { createdAt: 'desc' },
      include: {
        agentEntries: true
      }
    }),

    // Salary expenses this month
    prisma.expense.aggregate({
      where: { year, month, type: 'SALARY' },
      _sum: { amount: true },
    }),

    // Misc expenses this month
    prisma.expense.aggregate({
      where: { year, month, type: 'MISC' },
      _sum: { amount: true },
    }),

    // Hotspot revenue this month
    prisma.hotspotSale.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),

    // Hotspot count this month
    prisma.hotspotSale.count({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),

    // All active partners with user info
    prisma.partner.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { sharePercent: 'desc' },
    }),

    prisma.partnerPayout.findMany({
      where: { referenceId: settlementRef(year, month) },
      select: { partnerId: true, amount: true },
    }),

    // Recent hotspot sales (last 5)
    prisma.hotspotSale.findMany({
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ]);

  // ── calculations ─────────────────────────────────────────────────────────────
  const companyCommission = commissionRecord?.totalPool ?? 0;
  const agentPayouts = commissionRecord?.agentEntries.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
  const salaryTotal = salaryAgg._sum.amount ?? 0;
  const miscTotal = miscAgg._sum.amount ?? 0;
  const totalExpenses = salaryTotal + miscTotal;
  const hotspotRevenue = hotspotAgg._sum.amount ?? 0;

  // Net = company commission − agent payouts − expenses
  const netCommission = companyCommission - agentPayouts - totalExpenses;

  const paidByPartner = new Map<string, number>();
  for (const payout of monthlySettlements) {
    paidByPartner.set(payout.partnerId, (paidByPartner.get(payout.partnerId) ?? 0) + payout.amount);
  }

  // Partner shares
  const partnerShares = partners.map(p => ({
    id: p.id,
    name: p.user.name,
    sharePercent: p.sharePercent,
    amount: netCommission > 0 ? (netCommission * p.sharePercent) / 100 : 0,
    paidAmount: paidByPartner.get(p.id) ?? 0,
    remainingAmount: Math.max(
      (netCommission > 0 ? (netCommission * p.sharePercent) / 100 : 0) - (paidByPartner.get(p.id) ?? 0),
      0,
    ),
  }));

  // Ensure the month name is based on the selected period
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

  return {
    month: monthName,
    monthIndex: month,
    year,
    companyCommission,
    agentPayouts,
    salaryTotal,
    miscTotal,
    totalExpenses,
    hotspotRevenue,
    hotspotCount,
    netCommission,
    partnerShares,
    recentHotspot: recentHotspot.map(s => ({
      id: s.id,
      package: s.package,
      amount: s.amount,
      customerName: s.customerName,
      date: s.date.toISOString(),
    })),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const params = await searchParams;
  const now = new Date();
  const requestedYear = parseInt(params.year || String(now.getFullYear()), 10);
  const requestedMonth = parseInt(params.month || String(now.getMonth() + 1), 10);

  const availablePeriods = await getAvailableDashboardPeriods();
  const fallbackPeriod = availablePeriods[0] ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const selectedPeriod = availablePeriods.some(
    (period) => period.year === requestedYear && period.month === requestedMonth,
  )
    ? { year: requestedYear, month: requestedMonth }
    : fallbackPeriod;

  const data = await getDashboardData(selectedPeriod.year, selectedPeriod.month);
  return <DashboardClient data={data} availablePeriods={availablePeriods} />;
}
