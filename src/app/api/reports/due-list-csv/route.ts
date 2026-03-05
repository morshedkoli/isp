import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule, UserRole } from '@prisma/client';
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission(session.user.role, PermissionModule.REPORTS, PermissionAction.VIEW);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const where: any = {};
  if (session.user.role === UserRole.AGENT) {
    where.assignedAgentId = session.user.id;
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      assignedAgent: { select: { name: true } },
      cycleCharges: {
        where: { remainingAmount: { gt: 0 } },
        select: { remainingAmount: true, cycleEnd: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = Date.now();
  const rows: string[] = [];
  rows.push('customer_id,name,phone,agent,total_due,max_days_overdue,aging_bucket');

  for (const c of customers) {
    const totalDue = c.cycleCharges.reduce((sum, cc) => sum + cc.remainingAmount, 0);
    if (totalDue <= 0) continue;

    const maxDaysOverdue = c.cycleCharges.reduce((max, cc) => {
      const days = Math.floor((now - new Date(cc.cycleEnd).getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(max, days);
    }, 0);

    let bucket = '0-30';
    if (maxDaysOverdue > 90) bucket = '90+';
    else if (maxDaysOverdue > 60) bucket = '61-90';
    else if (maxDaysOverdue > 30) bucket = '31-60';

    rows.push(
      [
        escapeCsv(c.customerId),
        escapeCsv(c.name),
        escapeCsv(c.phone),
        escapeCsv(c.assignedAgent?.name || ''),
        totalDue,
        maxDaysOverdue,
        bucket,
      ].join(',')
    );
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="customer-due-list.csv"',
    },
  });
}
