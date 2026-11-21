import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { fetchAllAgentLedgers } from '@/lib/agent-ledger';
import { periodOf } from '@/lib/business-date';
import {
  cleanMoney,
  fetchAllPartnerLedgers,
  getPreviousPeriod,
  type PaymentMethodType,
} from '@/lib/partner-ledger';
import { formatPeriod } from '@/lib/period';
import { prisma } from '@/lib/prisma';
import BalancesClient, { type UnifiedRecentPaymentRow } from './BalancesClient';
import type { UnifiedPersonRow } from './RecordPaymentModal';

export const dynamic = 'force-dynamic';

export default async function BalancesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const currentPeriod = periodOf(new Date());
  const lastCompletedPeriod = getPreviousPeriod(currentPeriod);

  const [partnerLedgers, agentLedgers, partnerPayouts, agentPayouts] = await Promise.all([
    fetchAllPartnerLedgers(),
    fetchAllAgentLedgers(),
    prisma.partnerPayout.findMany({
      include: { partner: { include: { user: { select: { name: true } } } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 25,
    }),
    prisma.agentPayout.findMany({
      include: { agent: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 25,
    }),
  ]);

  const people: UnifiedPersonRow[] = [
    ...partnerLedgers.list.map((p) => ({
      key: `PARTNER:${p.partnerId}`,
      id: p.partnerId,
      kind: 'PARTNER' as const,
      name: p.name,
      phone: p.phone,
      ratePercent: p.sharePercent,
      territoryOrNote: null,
      isActive: p.isActive,
      totalCredited: cleanMoney(p.totalEarned + p.totalCreditAdjustments),
      totalPaid: cleanMoney(p.totalPaid + p.totalDebitAdjustments),
      balance: p.balance,
      calculatedMonthsCount: p.calculatedMonthsCount,
      payoutsCount: p.payoutsCount,
      entries: p.entries,
    })),
    ...agentLedgers.list.map((a) => ({
      key: `AGENT:${a.agentId}`,
      id: a.agentId,
      kind: 'AGENT' as const,
      name: a.name,
      phone: a.phone,
      ratePercent: a.commissionPercent,
      territoryOrNote: a.notes,
      isActive: a.isActive,
      totalCredited: cleanMoney(a.totalEarned + a.totalCreditAdjustments),
      totalPaid: cleanMoney(a.totalPaid + a.totalDebitAdjustments),
      balance: a.balance,
      calculatedMonthsCount: a.calculatedMonthsCount,
      payoutsCount: a.payoutsCount,
      entries: a.entries,
    })),
  ];

  const recentPayments: UnifiedRecentPaymentRow[] = [
    ...partnerPayouts.map((p) => ({
      id: `p-${p.id}`,
      payoutId: p.id,
      personKind: 'PARTNER' as const,
      personId: p.partnerId,
      personName: p.partner?.user?.name ?? 'Partner',
      amount: p.amount,
      date: p.date.toISOString(),
      method: p.method as PaymentMethodType,
      referenceId: p.referenceId,
      notes: p.notes,
    })),
    ...agentPayouts.map((a) => ({
      id: `a-${a.id}`,
      payoutId: a.id,
      personKind: 'AGENT' as const,
      personId: a.agentId,
      personName: a.agent?.name ?? 'Field Agent',
      amount: a.amount,
      date: a.date.toISOString(),
      method: a.method as PaymentMethodType,
      referenceId: a.referenceId,
      notes: a.notes,
    })),
  ]
    .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
    .slice(0, 30);

  return (
    <BalancesClient
      people={people}
      recentPayments={recentPayments}
      cutoffLabel={formatPeriod(lastCompletedPeriod.year, lastCompletedPeriod.month)}
      excludedCurrentMonthLabel={formatPeriod(currentPeriod.year, currentPeriod.month)}
    />
  );
}
