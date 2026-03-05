'use server';

import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function getMonthlyReport(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all revenue sources
    const [payments, recharges, otherIncome, expenses, partners] = await Promise.all([
      // Payments from customers
      prisma.payment.aggregate({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Recharges
      prisma.recharge.aggregate({
        where: {
          status: 'CONFIRMED',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Other income from ledger
      prisma.ledgerEntry.aggregate({
        where: {
          type: 'INCOME',
          date: { gte: startDate, lte: endDate },
          isDeleted: false,
        },
        _sum: { amount: true },
      }),
      // Expenses from ledger
      prisma.ledgerEntry.aggregate({
        where: {
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
          isDeleted: false,
        },
        _sum: { amount: true },
      }),
      // Active partners
      prisma.partner.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Calculate totals
    const paymentRevenue = payments._sum.amount || 0;
    const rechargeRevenue = recharges._sum.amount || 0;
    const ledgerIncome = otherIncome._sum.amount || 0;
    const totalRevenue = paymentRevenue + rechargeRevenue + ledgerIncome;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Calculate partner shares
    const partnerShares = partners.map((partner) => ({
      partnerId: partner.id,
      partnerName: partner.user.name,
      sharePercent: partner.sharePercent,
      shareAmount: (netProfit * partner.sharePercent) / 100,
    }));

    return {
      success: true,
      report: {
        year,
        month,
        revenue: {
          payments: paymentRevenue,
          recharges: rechargeRevenue,
          otherIncome: ledgerIncome,
          total: totalRevenue,
        },
        expenses: totalExpenses,
        netProfit,
        partnerShares,
      },
    };
  } catch (error: any) {
    console.error('Get monthly report error:', error);
    return { success: false, error: error.message };
  }
}

export async function getAgentPerformanceReport(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        payments: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            assignedCustomers: true,
            payments: {
              where: {
                date: { gte: startDate, lte: endDate },
              },
            },
          },
        },
      },
    });

    const report = agents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      totalCollections: agent.payments.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: agent._count.payments,
      customerCount: agent._count.assignedCustomers,
    }));

    return {
      success: true,
      report,
    };
  } catch (error: any) {
    console.error('Get agent performance error:', error);
    return { success: false, error: error.message };
  }
}

export async function getDueAgingReport() {
  try {
    await requirePermission(PermissionModule.REPORTS, PermissionAction.VIEW);
    const now = new Date();

    // Get all unpaid cycle charges with customer info
    const unpaidCharges = await prisma.cycleCharge.findMany({
      where: {
        remainingAmount: { gt: 0 },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            customerId: true,
          },
        },
      },
      orderBy: {
        cycleEnd: 'asc',
      },
    });

    // Categorize by aging buckets
    const agingBuckets = {
      '0-30': [] as typeof unpaidCharges,
      '31-60': [] as typeof unpaidCharges,
      '61-90': [] as typeof unpaidCharges,
      '90+': [] as typeof unpaidCharges,
    };

    for (const charge of unpaidCharges) {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(charge.cycleEnd).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 30) {
        agingBuckets['0-30'].push(charge);
      } else if (daysOverdue <= 60) {
        agingBuckets['31-60'].push(charge);
      } else if (daysOverdue <= 90) {
        agingBuckets['61-90'].push(charge);
      } else {
        agingBuckets['90+'].push(charge);
      }
    }

    // Calculate totals per bucket
    const summary = {
      '0-30': {
        count: agingBuckets['0-30'].length,
        amount: agingBuckets['0-30'].reduce((sum, c) => sum + c.remainingAmount, 0),
      },
      '31-60': {
        count: agingBuckets['31-60'].length,
        amount: agingBuckets['31-60'].reduce((sum, c) => sum + c.remainingAmount, 0),
      },
      '61-90': {
        count: agingBuckets['61-90'].length,
        amount: agingBuckets['61-90'].reduce((sum, c) => sum + c.remainingAmount, 0),
      },
      '90+': {
        count: agingBuckets['90+'].length,
        amount: agingBuckets['90+'].reduce((sum, c) => sum + c.remainingAmount, 0),
      },
    };

    return {
      success: true,
      summary,
      details: unpaidCharges,
    };
  } catch (error: any) {
    console.error('Get due aging error:', error);
    return { success: false, error: error.message };
  }
}
