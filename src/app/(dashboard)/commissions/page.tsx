import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import CommissionsClient from './CommissionsClient';
import { getCommissionRecord } from './actions';
import { getExpenseTotals } from '../expenses/actions';

export const dynamic = 'force-dynamic';

type Period = { year: number; month: number };

async function getAvailableCommissionPeriods(): Promise<Period[]> {
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

export default async function CommissionsPage({
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

    const availablePeriods = await getAvailableCommissionPeriods();
    const fallbackPeriod = availablePeriods[0] ?? {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    };

    const selectedPeriod = availablePeriods.some(
        (period) => period.year === requestedYear && period.month === requestedMonth,
    )
        ? { year: requestedYear, month: requestedMonth }
        : fallbackPeriod;

    const [agents, partners, recordResult, expensesResult] = await Promise.all([
        prisma.commissionAgent.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.partner.findMany({
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
        }),
        getCommissionRecord(selectedPeriod.year, selectedPeriod.month),
        getExpenseTotals(selectedPeriod.year, selectedPeriod.month),
    ]);

    const record = recordResult.success ? (recordResult.record ?? null) : null;

    return (
        <CommissionsClient
            agents={agents}
            partners={partners}
            record={record}
            year={selectedPeriod.year}
            month={selectedPeriod.month}
            salaryTotal={expensesResult.salaryTotal ?? 0}
            miscTotal={expensesResult.miscTotal ?? 0}
            availablePeriods={availablePeriods}
        />
    );
}
