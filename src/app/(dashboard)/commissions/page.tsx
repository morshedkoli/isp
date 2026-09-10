import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import CommissionsClient from './CommissionsClient';
import { getCommissionRecord } from './actions';
import { getExpenseTotals } from '../expenses/actions';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.VIEW);

  const params = await searchParams;
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const selectedPeriod = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const [agents, partners, recordResult, expenseTotals] = await Promise.all([
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
      salaryTotal={expenseTotals.totals.SALARY}
      fiberCableTotal={expenseTotals.totals.FIBER_CABLE}
      rentTotal={expenseTotals.totals.RENT}
      utilitiesTotal={expenseTotals.totals.UTILITIES}
      equipmentTotal={expenseTotals.totals.EQUIPMENT}
      conveyanceTotal={expenseTotals.totals.CONVEYANCE}
      miscTotal={expenseTotals.totals.MISC}
      availablePeriods={availablePeriods}
    />
  );
}
