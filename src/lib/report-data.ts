import { prisma } from '@/lib/prisma';
import { calculateMonthlyPartnerSettlement } from '@/lib/settlement';

export interface MonthlyReportData {
  year: number;
  month: number;
  revenue: {
    companyCommission: number;
    hotspotRevenue: number;
    total: number;
  };
  expenses: {
    agentPayouts: number;
    salaryTotal: number;
    fiberCableTotal: number;
    rentTotal: number;
    utilitiesTotal: number;
    equipmentTotal: number;
    conveyanceTotal: number;
    miscTotal: number;
    total: number;
  };
  netProfit: number;
  partnerShares: Array<{
    partnerId: string;
    partnerName: string;
    sharePercent: number;
    dueAmount: number;
    paidAmount: number;
    remainingAmount: number;
  }>;
}

export async function getMonthlyReportData(year: number, month: number): Promise<MonthlyReportData> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

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

  return {
    year,
    month,
    revenue: {
      companyCommission: settlement.companyCommission,
      hotspotRevenue,
      total: totalRevenue,
    },
    expenses: {
      agentPayouts: settlement.agentPayouts,
      salaryTotal: settlement.salaryTotal,
      fiberCableTotal: settlement.fiberCableTotal,
      rentTotal: settlement.rentTotal,
      utilitiesTotal: settlement.utilitiesTotal,
      equipmentTotal: settlement.equipmentTotal,
      conveyanceTotal: settlement.conveyanceTotal,
      miscTotal: settlement.miscTotal,
      total: totalExpenses,
    },
    netProfit: totalRevenue - totalExpenses,
    partnerShares: settlement.partners.map((partner) => ({
      partnerId: partner.partnerId,
      partnerName: partner.partnerName,
      sharePercent: partner.sharePercent,
      dueAmount: partner.dueAmount,
      paidAmount: partner.paidAmount,
      remainingAmount: partner.remainingAmount,
    })),
  };
}

export async function getAgentPerformanceReportData(year: number, month: number) {
  const record = await prisma.commissionRecord.findUnique({
    where: { year_month: { year, month } },
    include: { agentEntries: { include: { agent: true } } },
  });

  return (record?.agentEntries ?? [])
    .map((entry) => ({
      agentId: entry.agentId,
      agentName: entry.agent.name,
      commissionPercent: entry.agent.commissionPercent,
      amount: entry.amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getYearlyReportData(year: number) {
  const months = await Promise.all(
    Array.from({ length: 12 }, (_, index) => getMonthlyReportData(year, index + 1)),
  );

  const totals = months.reduce(
    (sum, month) => ({
      revenue: sum.revenue + month.revenue.total,
      expenses: sum.expenses + month.expenses.total,
      netProfit: sum.netProfit + month.netProfit,
    }),
    { revenue: 0, expenses: 0, netProfit: 0 },
  );

  return { year, months, totals };
}
