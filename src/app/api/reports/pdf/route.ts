import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { isValidPeriod } from '@/lib/period';
import { getAgentPerformanceReportData, getMonthlyReportData, getYearlyReportData } from '@/lib/report-data';
import { createMonthlyReportPdf, createYearlyReportPdf } from '@/lib/report-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.role, PermissionModule.REPORTS, PermissionAction.VIEW);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      if (!isValidPeriod(year, month)) {
        return NextResponse.json({ error: 'Invalid report period' }, { status: 400 });
      }
      const [report, agents] = await Promise.all([
        getMonthlyReportData(year, month),
        getAgentPerformanceReportData(year, month),
      ]);
      pdf = await createMonthlyReportPdf(report, agents);
      filename = `monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`;
    }

    return new Response(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.byteLength),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
