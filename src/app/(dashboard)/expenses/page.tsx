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

  const result = await getMonthlyExpenses(year, month);

  return (
    <ExpensesClient
      salaries={(result.salaries ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      fiberCable={(result.fiberCable ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      rent={(result.rent ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      utilities={(result.utilities ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      equipment={(result.equipment ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      conveyance={(result.conveyance ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      misc={(result.misc ?? []).map((expense) => ({
        id: expense.id,
        type: expense.type,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        notes: expense.notes,
      }))}
      salaryTotal={result.salaryTotal ?? 0}
      fiberCableTotal={result.fiberCableTotal ?? 0}
      rentTotal={result.rentTotal ?? 0}
      utilitiesTotal={result.utilitiesTotal ?? 0}
      equipmentTotal={result.equipmentTotal ?? 0}
      conveyanceTotal={result.conveyanceTotal ?? 0}
      miscTotal={result.miscTotal ?? 0}
      grandTotal={result.grandTotal ?? 0}
      year={year}
      month={month}
      availablePeriods={availablePeriods}
    />
  );
}
