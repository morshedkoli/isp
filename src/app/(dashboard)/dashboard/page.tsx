import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

async function getDashboardData(year: number, month: number) {
  const now = new Date();

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

  // Partner shares
  const partnerShares = partners.map(p => ({
    name: p.user.name,
    sharePercent: p.sharePercent,
    amount: netCommission > 0 ? (netCommission * p.sharePercent) / 100 : 0,
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
  const year = parseInt(params.year || String(now.getFullYear()));
  const month = parseInt(params.month || String(now.getMonth() + 1));

  const data = await getDashboardData(year, month);
  return <DashboardClient data={data} />;
}
