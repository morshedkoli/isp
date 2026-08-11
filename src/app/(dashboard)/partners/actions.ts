'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';
import { calculateMonthlyPartnerSettlement, settlementRef } from '@/lib/settlement';
import bcrypt from 'bcryptjs';

const PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function isPaymentMethod(value: string): value is PaymentMethod {
    return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export async function createPartner(data: {
    name: string;
    phone?: string;
    sharePercent: number;
}) {
    try {
        const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.CREATE);

        if (data.sharePercent < 0 || data.sharePercent > 100) {
            return { success: false, error: 'Share percent must be between 0 and 100' };
        }

        // Auto-generate a unique internal email (partner never logs in)
        const slug = data.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const uniqueSuffix = Date.now();
        const internalEmail = `partner.${slug}.${uniqueSuffix}@internal.local`;
        // Random, unguessable credential — this account is not meant to ever authenticate,
        // but it must not be predictable in case admin-only login is ever relaxed.
        const randomPassword = randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);

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
        const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);

        const old = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: { user: true },
        });

        const partnerData: { sharePercent?: number; isActive?: boolean } = {};
        if (data.sharePercent !== undefined) partnerData.sharePercent = data.sharePercent;
        if (data.isActive !== undefined) partnerData.isActive = data.isActive;

        const partner = await prisma.$transaction(async (tx) => {
            const updatedPartner = await tx.partner.update({
                where: { id: partnerId },
                data: partnerData,
            });

            if (data.name !== undefined || data.phone !== undefined) {
                const userUpdate: { name?: string; phone?: string } = {};
                if (data.name) userUpdate.name = data.name;
                if (data.phone !== undefined) userUpdate.phone = data.phone;
                await tx.user.update({ where: { id: updatedPartner.userId }, data: userUpdate });
            }

            return updatedPartner;
        });

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
        const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.APPROVE);

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

        await logCreate(prisma, user.id, 'PartnerPayout', payout.id, {
            partnerId: data.partnerId,
            amount,
            method,
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
        await requirePermission(PermissionModule.PARTNERS, PermissionAction.VIEW);
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
        const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.APPROVE);

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

        // Re-check for an existing settlement payout and create the new one inside a single
        // transaction, so two concurrent settle requests for the same partner/period can't
        // both slip past the "already settled" check and double-pay.
        const payout = await prisma.$transaction(async (tx) => {
            const existingSettlementPayouts = await tx.partnerPayout.findMany({
                where: {
                    partnerId: partnerRow.partnerId,
                    isSettlement: true,
                    settlementYear: data.year,
                    settlementMonth: data.month,
                },
                select: { amount: true },
            });
            const alreadyPaid = existingSettlementPayouts.reduce((sum, p) => sum + p.amount, 0);
            const remaining = partnerRow.dueAmount - alreadyPaid;
            if (remaining <= 0) {
                throw new Error(`${partnerRow.partnerName} is already settled for this month`);
            }

            return tx.partnerPayout.create({
                data: {
                    partnerId: partnerRow.partnerId,
                    amount: remaining,
                    date: paymentDate,
                    method,
                    referenceId,
                    notes: note,
                    isSettlement: true,
                    settlementYear: data.year,
                    settlementMonth: data.month,
                },
            });
        });

        await logCreate(prisma, user.id, 'PartnerPayout', payout.id, {
            partnerId: partnerRow.partnerId,
            partnerName: partnerRow.partnerName,
            amount: payout.amount,
            year: data.year,
            month: data.month,
            isSettlement: true,
        });

        revalidatePath('/partners');
        revalidatePath('/dashboard');
        return {
            success: true,
            payout,
            settledAmount: payout.amount,
            partnerName: partnerRow.partnerName,
            referenceId,
        };
    } catch (error: unknown) {
        console.error('Settle partner monthly commission error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}
