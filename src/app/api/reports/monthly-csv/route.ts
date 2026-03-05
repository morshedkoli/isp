import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hasPermission } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: string | number) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.role, PermissionModule.REPORTS, PermissionAction.VIEW);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
  const month = Number(url.searchParams.get('month')) || new Date().getMonth() + 1;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [payments, recharges, otherIncome, expenses, partners] = await Promise.all([
    prisma.payment.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { amount: true } }),
    prisma.recharge.aggregate({
      where: { status: 'CONFIRMED', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: 'INCOME', date: { gte: startDate, lte: endDate }, isDeleted: false },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: 'EXPENSE', date: { gte: startDate, lte: endDate }, isDeleted: false },
      _sum: { amount: true },
    }),
    prisma.partner.findMany({ where: { isActive: true }, include: { user: { select: { name: true } } } }),
  ]);

  const paymentRevenue = payments._sum.amount || 0;
  const rechargeRevenue = recharges._sum.amount || 0;
  const ledgerIncome = otherIncome._sum.amount || 0;
  const totalRevenue = paymentRevenue + rechargeRevenue + ledgerIncome;
  const totalExpenses = expenses._sum.amount || 0;
  const netProfit = totalRevenue - totalExpenses;

  const rows: string[] = [];
  rows.push('metric,value');
  rows.push(`payments,${paymentRevenue}`);
  rows.push(`recharges,${rechargeRevenue}`);
  rows.push(`other_income,${ledgerIncome}`);
  rows.push(`total_revenue,${totalRevenue}`);
  rows.push(`total_expenses,${totalExpenses}`);
  rows.push(`net_profit,${netProfit}`);
  rows.push('');
  rows.push('partner,share_percent,share_amount');
  for (const p of partners) {
    const shareAmount = (netProfit * p.sharePercent) / 100;
    rows.push(
      `${escapeCsv(p.user.name)},${p.sharePercent},${shareAmount}`
    );
  }

  const csv = rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="monthly-report-${year}-${String(month).padStart(2, '0')}.csv"`,
    },
  });
}
