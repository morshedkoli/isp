'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSessionUser } from '@/lib/authz';
import { logCreate, logUpdate } from '@/lib/audit';
import bcrypt from 'bcryptjs';

const PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
}

function isPaymentMethod(value: string): value is PaymentMethod {
    return (PAYMENT_METHODS as readonly string[]).includes(value);
}

function settlementRef(year: number, month: number) {
    return `SETTLEMENT-${year}-${String(month).padStart(2, '0')}`;
}

async function calculateMonthlyPartnerSettlement(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [
        commissionRecord,
        salaryAgg,
        miscAgg,
        partners,
        existingSettlements,
    ] = await Promise.all([
        prisma.commissionRecord.findFirst({
            where: { year, month },
            orderBy: { createdAt: 'desc' },
            include: { agentEntries: true },
        }),
        prisma.expense.aggregate({
            where: { year, month, type: 'SALARY' },
            _sum: { amount: true },
        }),
        prisma.expense.aggregate({
            where: { year, month, type: 'MISC' },
            _sum: { amount: true },
        }),
        prisma.partner.findMany({
            where: { isActive: true },
            include: { user: { select: { name: true } } },
            orderBy: { sharePercent: 'desc' },
        }),
        prisma.partnerPayout.findMany({
            where: {
                referenceId: settlementRef(year, month),
            },
            select: {
                partnerId: true,
                amount: true,
            },
        }),
    ]);

    const companyCommission = commissionRecord?.totalPool ?? 0;
    const agentPayouts = commissionRecord?.agentEntries.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
    const salaryTotal = salaryAgg._sum.amount ?? 0;
    const miscTotal = miscAgg._sum.amount ?? 0;
    const totalExpenses = salaryTotal + miscTotal;
    const netCommission = companyCommission - agentPayouts - totalExpenses;

    const settledByPartner = new Map<string, number>();
    for (const payout of existingSettlements) {
        settledByPartner.set(
            payout.partnerId,
            (settledByPartner.get(payout.partnerId) ?? 0) + payout.amount,
        );
    }

    const partnersWithSettlement = partners.map((partner) => {
        const dueAmount = netCommission > 0 ? (netCommission * partner.sharePercent) / 100 : 0;
        const paidAmount = settledByPartner.get(partner.id) ?? 0;
        return {
            partnerId: partner.id,
            partnerName: partner.user.name,
            sharePercent: partner.sharePercent,
            dueAmount,
            paidAmount,
            remainingAmount: Math.max(dueAmount - paidAmount, 0),
        };
    });

    return {
        year,
        month,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        companyCommission,
        agentPayouts,
        salaryTotal,
        miscTotal,
        totalExpenses,
        netCommission,
        partners: partnersWithSettlement,
    };
}

export async function createPartner(data: {
    name: string;
    phone?: string;
    sharePercent: number;
}) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can create partners' };
        }

        if (data.sharePercent < 0 || data.sharePercent > 100) {
            return { success: false, error: 'Share percent must be between 0 and 100' };
        }

        // Auto-generate a unique internal email (partner never logs in)
        const slug = data.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const uniqueSuffix = Date.now();
        const internalEmail = `partner.${slug}.${uniqueSuffix}@internal.local`;
        const passwordHash = await bcrypt.hash(`partner_${uniqueSuffix}`, 10);

        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: internalEmail,
                    name: data.name,
                    phone: data.phone || undefined,
                    password: passwordHash,
                    role: 'PARTNER',
                    isActive: true,
                },
            });

            const partner = await tx.partner.create({
                data: {
                    userId: newUser.id,
                    sharePercent: data.sharePercent,
                    isActive: true,
                },
            });

            return { user: newUser, partner };
        });

        await logCreate(prisma, user.id, 'Partner', result.partner.id, {
            name: data.name,
            sharePercent: data.sharePercent,
        });

        revalidatePath('/partners');
        return { success: true, partner: result.partner };
    } catch (error: unknown) {
        console.error('Create partner error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updatePartner(
    partnerId: string,
    data: { sharePercent?: number; isActive?: boolean; name?: string; phone?: string }
) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can update partners' };
        }

        const old = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: { user: true },
        });

        const partnerData: { sharePercent?: number; isActive?: boolean } = {};
        if (data.sharePercent !== undefined) partnerData.sharePercent = data.sharePercent;
        if (data.isActive !== undefined) partnerData.isActive = data.isActive;

        const partner = await prisma.partner.update({
            where: { id: partnerId },
            data: partnerData,
        });

        if (data.name !== undefined || data.phone !== undefined) {
            const userUpdate: { name?: string; phone?: string } = {};
            if (data.name) userUpdate.name = data.name;
            if (data.phone !== undefined) userUpdate.phone = data.phone;
            await prisma.user.update({ where: { id: partner.userId }, data: userUpdate });
        }

        await logUpdate(prisma, user.id, 'Partner', partnerId, old || {}, data);

        revalidatePath('/partners');
        return { success: true, partner };
    } catch (error: unknown) {
        console.error('Update partner error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function createPartnerPayout(data: {
    partnerId: string;
    amount: number;
    date: string;
    method: string;
    referenceId?: string;
    notes?: string;
}) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can record partner payouts' };
        }

        const amount = Number(data.amount);
        if (!amount || amount <= 0) {
            return { success: false, error: 'Amount must be greater than zero' };
        }

        if (!isPaymentMethod(data.method)) {
            return { success: false, error: 'Invalid payment method' };
        }
        const method: PaymentMethod = data.method;

        const date = new Date(data.date);
        if (Number.isNaN(date.getTime())) {
            return { success: false, error: 'Invalid payment date' };
        }

        const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
        if (!partner) {
            return { success: false, error: 'Partner not found' };
        }

        const payout = await prisma.partnerPayout.create({
            data: {
                partnerId: data.partnerId,
                amount,
                date,
                method,
                referenceId: data.referenceId?.trim() || null,
                notes: data.notes?.trim() || null,
            },
        });

        revalidatePath('/partners');
        revalidatePath('/dashboard');
        return { success: true, payout };
    } catch (error: unknown) {
        console.error('Create partner payout error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getMonthlyPartnerSettlement(year: number, month: number) {
    try {
        await requireSessionUser();
        if (year < 2000 || month < 1 || month > 12) {
            return { success: false, error: 'Invalid period' };
        }

        const snapshot = await calculateMonthlyPartnerSettlement(year, month);

        return {
            success: true,
            ...snapshot,
        };
    } catch (error: unknown) {
        console.error('Get monthly settlement error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function settlePartnerMonthlyCommission(data: {
    partnerId: string;
    year: number;
    month: number;
    method: string;
    date?: string;
    notes?: string;
}) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can settle monthly commission' };
        }

        if (!isPaymentMethod(data.method)) {
            return { success: false, error: 'Invalid payment method' };
        }
        const method: PaymentMethod = data.method;

        if (data.year < 2000 || data.month < 1 || data.month > 12) {
            return { success: false, error: 'Invalid settlement period' };
        }

        const paymentDate = data.date ? new Date(data.date) : new Date();
        if (Number.isNaN(paymentDate.getTime())) {
            return { success: false, error: 'Invalid payout date' };
        }

        const snapshot = await calculateMonthlyPartnerSettlement(data.year, data.month);
        const partnerRow = snapshot.partners.find((partner) => partner.partnerId === data.partnerId);
        if (!partnerRow) {
            return { success: false, error: 'Partner not found in this period' };
        }

        if (partnerRow.remainingAmount <= 0) {
            return { success: false, error: `${partnerRow.partnerName} is already settled for this month` };
        }

        const referenceId = settlementRef(data.year, data.month);
        const monthLabel = new Date(data.year, data.month - 1, 1).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
        });

        const noteParts = [`Monthly commission settlement (${monthLabel})`];
        if (data.notes?.trim()) noteParts.push(data.notes.trim());
        const note = noteParts.join(' - ');

        const payout = await prisma.partnerPayout.create({
            data: {
                partnerId: partnerRow.partnerId,
                amount: partnerRow.remainingAmount,
                date: paymentDate,
                method,
                referenceId,
                notes: note,
            },
        });

        revalidatePath('/partners');
        revalidatePath('/dashboard');
        return {
            success: true,
            payout,
            settledAmount: partnerRow.remainingAmount,
            partnerName: partnerRow.partnerName,
            referenceId,
        };
    } catch (error: unknown) {
        console.error('Settle partner monthly commission error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}
