import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import CommissionsClient from './CommissionsClient';
import { getCommissionRecord } from './actions';
import { getExpenseTotals } from '../expenses/actions';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage({
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

    const [agents, partners, recordResult, expensesResult] = await Promise.all([
        prisma.commissionAgent.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.partner.findMany({
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
        }),
        getCommissionRecord(year, month),
        getExpenseTotals(year, month),
    ]);

    const record = recordResult.success ? recordResult.record : null;

    return (
        <CommissionsClient
            agents={agents}
            partners={partners as any}
            record={record as any}
            year={year}
            month={month}
            salaryTotal={expensesResult.salaryTotal ?? 0}
            miscTotal={expensesResult.miscTotal ?? 0}
        />
    );
}
