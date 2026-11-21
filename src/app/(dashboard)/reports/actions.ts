'use server';

import { PermissionAction, PermissionModule } from '@prisma/client';
import { requirePermission } from '@/lib/authz';
import { getErrorMessage } from '@/lib/errors';
import { fetchAllPartnerLedgers } from '@/lib/partner-ledger';
import { getAgentPerformanceReportData, getMonthlyReportData } from '@/lib/report-data';

export async function getMonthlyReport(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);
    return { success: true, report: await getMonthlyReportData(year, month) };
  } catch (error: unknown) {
    console.error('Get monthly report error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getAgentPerformanceReport(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);

    return { success: true, report: await getAgentPerformanceReportData(year, month) };
  } catch (error: unknown) {
    console.error('Get agent performance error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// Aging of unsettled partner commission dues, bucketed by how many months
// have elapsed since each unsettled period ended.
export async function getPartnerDueAging() {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);

    const ledgers = await fetchAllPartnerLedgers();
    const now = new Date();
    const buckets = {
      current: { count: 0, amount: 0 },
      '1-2': { count: 0, amount: 0 },
      '3-5': { count: 0, amount: 0 },
      '6+': { count: 0, amount: 0 },
    };

    const details: Array<{
      partnerName: string;
      year: number;
      month: number;
      remainingAmount: number;
      monthsElapsed: number;
    }> = [];

    for (const partner of ledgers.list) {
      for (const monthRow of partner.monthlyBreakdown) {
        if (monthRow.remainingDue <= 0) continue;

        const periodEnd = new Date(monthRow.year, monthRow.month, 0);
        const monthsElapsed =
          (now.getFullYear() - periodEnd.getFullYear()) * 12 + (now.getMonth() - periodEnd.getMonth());

        details.push({
          partnerName: partner.name,
          year: monthRow.year,
          month: monthRow.month,
          remainingAmount: monthRow.remainingDue,
          monthsElapsed,
        });

        const bucketKey =
          monthsElapsed <= 0 ? 'current' : monthsElapsed <= 2 ? '1-2' : monthsElapsed <= 5 ? '3-5' : '6+';
        buckets[bucketKey].count += 1;
        buckets[bucketKey].amount += monthRow.remainingDue;
      }
    }

    details.sort((a, b) => b.monthsElapsed - a.monthsElapsed);

    return { success: true, summary: buckets, details };
  } catch (error: unknown) {
    console.error('Get partner due aging error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
