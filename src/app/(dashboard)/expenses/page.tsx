import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ExpensesClient from './ExpensesClient';
import { getMonthlyExpenses } from './actions';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage({
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

    const result = await getMonthlyExpenses(year, month);

    return (
        <ExpensesClient
            salaries={(result.salaries ?? []) as any}
            misc={(result.misc ?? []) as any}
            salaryTotal={result.salaryTotal ?? 0}
            miscTotal={result.miscTotal ?? 0}
            grandTotal={result.grandTotal ?? 0}
            year={year}
            month={month}
        />
    );
}
