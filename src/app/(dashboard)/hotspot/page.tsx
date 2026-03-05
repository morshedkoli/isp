import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import HotspotClient from './HotspotClient';
import { getHotspotSummary } from './actions';

export const dynamic = 'force-dynamic';

export default async function HotspotPage({
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [rawSales, summaryResult] = await Promise.all([
        prisma.hotspotSale.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            // No include — avoid null-relation crash if creator was deleted
            orderBy: { date: 'desc' },
        }),
        getHotspotSummary(year, month),
    ]);

    // Attach a safe fallback for createdBy so the client type is satisfied
    const sales = rawSales.map(s => ({ ...s, createdBy: { name: '—' } }));

    const summary = summaryResult.success && summaryResult.summary
        ? summaryResult.summary
        : { sevenDay: { count: 0, revenue: 0 }, thirtyDay: { count: 0, revenue: 0 }, totalRevenue: 0 };

    return (
        <HotspotClient
            sales={sales as any}
            summary={summary}
            year={year}
            month={month}
        />
    );
}
