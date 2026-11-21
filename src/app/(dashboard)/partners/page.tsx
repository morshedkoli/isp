import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { periodOf } from '@/lib/business-date';
import { prisma } from '@/lib/prisma';
import {
  fetchAllPartnerLedgers,
  getPreviousPeriod,
  isBeforePeriod,
} from '@/lib/partner-ledger';
import { resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import PartnersClient from './PartnersClient';
import type { PartnerSummary, PaymentMethodType } from './shared';

export const dynamic = 'force-dynamic';

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ settle?: string; year?: string; month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const params = await searchParams;
  const currentPeriod = periodOf(new Date());
  const lastCompletedPeriod = getPreviousPeriod(currentPeriod);

  const [allPeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  // Partner account & pay views always exclude the ongoing current month.
  const availablePeriods = allPeriods.filter((p) =>
    isBeforePeriod(p.year, p.month, currentPeriod),
  );
  const safeStored =
    storedPeriod && isBeforePeriod(storedPeriod.year, storedPeriod.month, currentPeriod)
      ? storedPeriod
      : null;

  const candidate = resolvePeriod(params.year, params.month, [
    safeStored,
    availablePeriods[0],
    lastCompletedPeriod,
  ]);
  const selectedPeriod = isBeforePeriod(candidate.year, candidate.month, currentPeriod)
    ? candidate
    : availablePeriods[0] || lastCompletedPeriod;

  const [ledgers, recentPayouts] = await Promise.all([
    fetchAllPartnerLedgers(selectedPeriod),
    prisma.partnerPayout.findMany({
      include: {
        partner: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    }),
  ]);

  const partners: PartnerSummary[] = ledgers.list.map((p) => ({
    id: p.partnerId,
    name: p.name,
    email: p.email,
    phone: p.phone,
    sharePercent: p.sharePercent,
    isActive: p.isActive,
    createdAt: p.createdAt,
    totalEarned: p.totalEarned,
    totalCreditAdjustments: p.totalCreditAdjustments,
    totalDebitAdjustments: p.totalDebitAdjustments,
    totalPaid: p.totalPaid,
    balance: p.balance,
    thisMonthEarned: p.thisMonthEarned,
    thisMonthPaid: p.thisMonthPaid,
    calculatedMonthsCount: p.calculatedMonthsCount,
    payoutsCount: p.payoutsCount,
  }));

  return (
    <PartnersClient
      partners={partners}
      recentPayouts={recentPayouts.map((row) => ({
        id: row.id,
        partnerId: row.partnerId,
        partnerName: row.partner?.user?.name ?? 'Partner',
        amount: row.amount,
        date: row.date.toISOString(),
        method: row.method as PaymentMethodType,
        referenceId: row.referenceId,
        notes: row.notes,
        isSettlement: row.isSettlement,
        settlementYear: row.settlementYear,
        settlementMonth: row.settlementMonth,
      }))}
      availablePeriods={availablePeriods}
      selectedPeriod={selectedPeriod}
      excludedCurrentPeriod={currentPeriod}
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
