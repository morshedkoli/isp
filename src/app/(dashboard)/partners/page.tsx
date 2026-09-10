import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { periodBounds, resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import PartnersClient from './PartnersClient';

export const dynamic = 'force-dynamic';

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ settle?: string; year?: string; month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const params = await searchParams;

  // Resolved before the payout query, which now filters on it — the payout list
  // used to show the latest 20 rows of all time under a month selector.
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const selectedPeriod = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  const { start, end } = periodBounds(selectedPeriod.year, selectedPeriod.month);

  const [partners, periodPayouts] = await Promise.all([
    // Master data, not period data — the full roster is always shown.
    prisma.partner.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.partnerPayout.findMany({
      // A payout belongs to the selected month if it was *paid* in it, or if it
      // settles it — a March settlement paid in April is relevant to both.
      where: {
        OR: [
          { date: { gte: start, lte: end } },
          {
            isSettlement: true,
            settlementYear: selectedPeriod.year,
            settlementMonth: selectedPeriod.month,
          },
        ],
      },
      include: {
        partner: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  return (
    <PartnersClient
      partners={partners}
      recentPayouts={periodPayouts.map((row) => ({
        id: row.id,
        partnerName: row.partner?.user?.name ?? 'Partner',
        amount: row.amount,
        date: row.date.toISOString(),
        method: row.method,
        referenceId: row.referenceId,
        notes: row.notes,
        isSettlement: row.isSettlement,
        settlementYear: row.settlementYear,
        settlementMonth: row.settlementMonth,
      }))}
      availablePeriods={availablePeriods}
      selectedPeriod={selectedPeriod}
      autoOpenSettlement={
        params.settle === '1'
          ? {
            year: selectedPeriod.year,
            month: selectedPeriod.month,
          }
          : null
      }
    />
  );
}
