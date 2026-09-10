import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolvePeriod } from '@/lib/period';
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

  const [partners, recentPayouts, availablePeriods, storedPeriod] = await Promise.all([
    prisma.partner.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.partnerPayout.findMany({
      include: {
        partner: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const selectedPeriod = resolvePeriod(params.year, params.month, [
    storedPeriod,
    availablePeriods[0],
  ]);

  return (
    <PartnersClient
      partners={partners}
      recentPayouts={recentPayouts.map((row) => ({
        id: row.id,
        partnerName: row.partner?.user?.name ?? 'Partner',
        amount: row.amount,
        date: row.date.toISOString(),
        method: row.method,
        referenceId: row.referenceId,
        notes: row.notes,
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
