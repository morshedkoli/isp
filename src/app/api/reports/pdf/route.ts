import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hasPermission } from '@/lib/rbac';
import { isValidPeriod } from '@/lib/period';
import { getAgentPerformanceReportData, getMonthlyReportData, getYearlyReportData } from '@/lib/report-data';
import { createMonthlyReportPdf, createYearlyReportPdf } from '@/lib/report-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await hasPermission(session.user.role, PermissionModule.REPORTS, PermissionAction.VIEW);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year'));
  const scope = url.searchParams.get('scope') ?? 'monthly';
  const month = Number(url.searchParams.get('month'));

  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !['monthly', 'yearly'].includes(scope)) {
    return NextResponse.json({ error: 'Invalid report period' }, { status: 400 });
  }

  let pdf: Uint8Array;
  let filename: string;
  if (scope === 'yearly') {
    const report = await getYearlyReportData(year);
    pdf = await createYearlyReportPdf(report.year, report.months, report.totals);
    filename = `yearly-report-${year}.pdf`;
  } else {
    if (!isValidPeriod(year, month)) return NextResponse.json({ error: 'Invalid report period' }, { status: 400 });
    const [report, agents] = await Promise.all([
      getMonthlyReportData(year, month),
      getAgentPerformanceReportData(year, month),
    ]);
    pdf = await createMonthlyReportPdf(report, agents);
    filename = `monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`;
  }

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
