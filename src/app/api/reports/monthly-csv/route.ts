import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hasPermission } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { calculateMonthlyPartnerSettlement } from '@/lib/settlement';

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

  const [settlement, hotspotAgg] = await Promise.all([
    calculateMonthlyPartnerSettlement(year, month),
    prisma.hotspotSale.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
  ]);

  const hotspotRevenue = hotspotAgg._sum.amount ?? 0;
  const totalRevenue = settlement.companyCommission + hotspotRevenue;
  const totalExpenses = settlement.agentPayouts + settlement.totalExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const rows: string[] = [];
  rows.push('metric,value');
  rows.push(`company_commission,${settlement.companyCommission}`);
  rows.push(`hotspot_revenue,${hotspotRevenue}`);
  rows.push(`total_revenue,${totalRevenue}`);
  rows.push(`agent_payouts,${settlement.agentPayouts}`);
  rows.push(`salary_expenses,${settlement.salaryTotal}`);
  rows.push(`fiber_cable_expenses,${settlement.fiberCableTotal}`);
  rows.push(`misc_expenses,${settlement.miscTotal}`);
  rows.push(`total_expenses,${totalExpenses}`);
  rows.push(`net_profit,${netProfit}`);
  rows.push('');
  rows.push('partner,share_percent,due_amount,paid_amount,remaining_amount');
  for (const p of settlement.partners) {
    rows.push(
      [
        escapeCsv(p.partnerName),
        p.sharePercent,
        p.dueAmount,
        p.paidAmount,
        p.remainingAmount,
      ].join(',')
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
