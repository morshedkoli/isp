import { PermissionAction, PermissionModule } from '@prisma/client';
import { requirePermission } from '@/lib/authz';
import { resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import ExpensesClient from './ExpensesClient';
import { getMonthlyExpenses } from './actions';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requirePermission(PermissionModule.EXPENSES, PermissionAction.VIEW);

  const params = await searchParams;
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const { year, month } = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const { byType, totals, grandTotal } = await getMonthlyExpenses(year, month);

  return (
    <ExpensesClient
      byType={byType}
      totals={totals}
      grandTotal={grandTotal}
      year={year}
      month={month}
    />
  );
}
