import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import PartnersClient from './PartnersClient';

export const dynamic = 'force-dynamic';

type Period = { year: number; month: number };

async function getAvailablePartnerPeriods(): Promise<Period[]> {
  const [commissions, expenses, hotspotSales] = await Promise.all([
    prisma.commissionRecord.findMany({ select: { year: true, month: true } }),
    prisma.expense.findMany({ select: { year: true, month: true } }),
    prisma.hotspotSale.findMany({ select: { date: true } }),
  ]);

  const periods = new Set<string>();
  for (const row of commissions) periods.add(`${row.year}-${row.month}`);
  for (const row of expenses) periods.add(`${row.year}-${row.month}`);
  for (const sale of hotspotSales) {
    const date = new Date(sale.date);
    periods.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
  }

  return Array.from(periods)
    .map((value) => {
      const [year, month] = value.split('-').map((part) => parseInt(part, 10));
      return { year, month };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ settle?: string; year?: string; month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const params = await searchParams;

  const [partners, recentPayouts, availablePeriods] = await Promise.all([
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
    getAvailablePartnerPeriods(),
  ]);

  return (
    <PartnersClient
      partners={partners}
      recentPayouts={recentPayouts.map((row) => ({
        id: row.id,
        partnerName: row.partner.user.name,
        amount: row.amount,
        date: row.date.toISOString(),
        method: row.method,
        referenceId: row.referenceId,
        notes: row.notes,
      }))}
      availablePeriods={availablePeriods}
      autoOpenSettlement={
        params.settle === '1'
          ? {
            year: parseInt(params.year || String(new Date().getFullYear()), 10),
            month: parseInt(params.month || String(new Date().getMonth() + 1), 10),
          }
          : null
      }
    />
  );
}
