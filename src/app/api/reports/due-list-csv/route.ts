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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.role, PermissionModule.REPORTS, PermissionAction.VIEW);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const periods = await prisma.commissionRecord.findMany({
    select: { year: true, month: true },
    distinct: ['year', 'month'],
  });

  const now = new Date();
  const rows: string[] = [];
  rows.push('partner,year,month,remaining_amount,months_elapsed');

  for (const period of periods) {
    const settlement = await calculateMonthlyPartnerSettlement(period.year, period.month);
    const periodEnd = new Date(period.year, period.month, 0);
    const monthsElapsed =
      (now.getFullYear() - periodEnd.getFullYear()) * 12 + (now.getMonth() - periodEnd.getMonth());

    for (const partner of settlement.partners) {
      if (partner.remainingAmount <= 0) continue;
      rows.push(
        [
          escapeCsv(partner.partnerName),
          period.year,
          period.month,
          partner.remainingAmount,
          monthsElapsed,
        ].join(',')
      );
    }
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="partner-due-list.csv"',
    },
  });
}
