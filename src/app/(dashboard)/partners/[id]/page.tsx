import { getServerSession } from 'next-auth/next';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { periodOf } from '@/lib/business-date';
import {
  fetchAllPartnerLedgers,
  getPreviousPeriod,
  isBeforePeriod,
} from '@/lib/partner-ledger';
import { resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import PartnerProfileClient from './PartnerProfileClient';
import type { PartnerSummary } from '../shared';

export const dynamic = 'force-dynamic';

export default async function PartnerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const currentPeriod = periodOf(new Date());
  const lastCompletedPeriod = getPreviousPeriod(currentPeriod);

  const [allPeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);

  const completedPeriods = allPeriods.filter((p) =>
    isBeforePeriod(p.year, p.month, currentPeriod),
  );
  const safeStored =
    storedPeriod && isBeforePeriod(storedPeriod.year, storedPeriod.month, currentPeriod)
      ? storedPeriod
      : null;

  const candidate = resolvePeriod(query.year, query.month, [
    safeStored,
    completedPeriods[0],
    lastCompletedPeriod,
  ]);
  const selectedPeriod = isBeforePeriod(candidate.year, candidate.month, currentPeriod)
    ? candidate
    : completedPeriods[0] || lastCompletedPeriod;

  const ledgers = await fetchAllPartnerLedgers(selectedPeriod);
  const profile = ledgers.byPartnerId[id];
  if (!profile) {
    notFound();
  }

  const allPartners: PartnerSummary[] = ledgers.list.map((p) => ({
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

  const currentSummary = allPartners.find((p) => p.id === id)!;

  return (
    <PartnerProfileClient
      profile={profile}
      partnerSummary={currentSummary}
      allPartners={allPartners}
      selectedPeriod={selectedPeriod}
      excludedCurrentPeriod={currentPeriod}
    />
  );
}
