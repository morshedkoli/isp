'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { AdjustmentType, PermissionAction, PermissionModule } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logDelete, logUpdate } from '@/lib/audit';
import { calendarDateToDate } from '@/lib/business-date';
import { getErrorMessage } from '@/lib/errors';
import { calculateMonthlyPartnerSettlement, settlementRef } from '@/lib/settlement';

const PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

function parseActionDate(raw?: string): Date | null {
  if (!raw) return new Date();
  const cal = calendarDateToDate(raw);
  if (cal) return cal;
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function revalidatePartnerViews() {
  revalidatePath('/balances');
  revalidatePath('/partners', 'layout');
  revalidatePath('/dashboard');
  revalidatePath('/monthly');
  revalidatePath('/reports');
  revalidatePath('/commissions');
}

// ─── Partner CRUD ─────────────────────────────────────────────────────────────

export async function createPartner(data: {
  name: string;
  phone?: string;
  sharePercent: number;
  openingBalance?: number;
}) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.CREATE);

    const name = data.name?.trim();
    if (!name) {
      return { success: false, error: 'Partner name is required' };
    }

    if (Number.isNaN(data.sharePercent) || data.sharePercent < 0 || data.sharePercent > 100) {
      return { success: false, error: 'Share percent must be between 0 and 100' };
    }

    const openingBalance = data.openingBalance ? Number(data.openingBalance) : 0;
    if (Number.isNaN(openingBalance) || openingBalance < 0) {
      return { success: false, error: 'Opening balance cannot be negative' };
    }

    const cleanPhone = data.phone?.trim() || null;

    // Auto-generate a unique internal email (partner never logs in)
    const slug = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || 'member';
    const uniqueSuffix = `${Date.now()}.${randomBytes(3).toString('hex')}`;
    const internalEmail = `partner.${slug}.${uniqueSuffix}@internal.local`;
    const randomPassword = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: internalEmail,
          name,
          phone: cleanPhone,
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

      if (openingBalance > 0) {
        await tx.partnerAdjustment.create({
          data: {
            partnerId: partner.id,
            type: AdjustmentType.CREDIT,
            amount: openingBalance,
            date: new Date(),
            reason: 'Opening balance',
            createdById: user.id,
          },
        });
      }

      return { user: newUser, partner };
    });

    await logCreate(prisma, user.id, 'Partner', result.partner.id, {
      name,
      sharePercent: data.sharePercent,
      openingBalance,
    });

    revalidatePartnerViews();
    return { success: true, partner: result.partner };
  } catch (error: unknown) {
    console.error('Create partner error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updatePartner(
  partnerId: string,
  data: { sharePercent?: number; isActive?: boolean; name?: string; phone?: string },
) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);

    if (
      data.sharePercent !== undefined &&
      (Number.isNaN(data.sharePercent) || data.sharePercent < 0 || data.sharePercent > 100)
    ) {
      return { success: false, error: 'Share percent must be between 0 and 100' };
    }

    const old = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: { user: true },
    });
    if (!old) {
      return { success: false, error: 'Partner not found' };
    }

    const partnerData: { sharePercent?: number; isActive?: boolean } = {};
    if (data.sharePercent !== undefined) partnerData.sharePercent = data.sharePercent;
    if (data.isActive !== undefined) partnerData.isActive = data.isActive;

    const partner = await prisma.$transaction(async (tx) => {
      const updatedPartner = await tx.partner.update({
        where: { id: partnerId },
        data: partnerData,
      });

      if (data.name !== undefined || data.phone !== undefined) {
        const userUpdate: { name?: string; phone?: string | null } = {};
        if (data.name?.trim()) userUpdate.name = data.name.trim();
        if (data.phone !== undefined) userUpdate.phone = data.phone.trim() || null;
        await tx.user.update({ where: { id: updatedPartner.userId }, data: userUpdate });
      }

      return updatedPartner;
    });

    await logUpdate(
      prisma,
      user.id,
      'Partner',
      partnerId,
      { name: old.user?.name, sharePercent: old.sharePercent, isActive: old.isActive },
      data,
    );

    revalidatePartnerViews();
    return { success: true, partner };
  } catch (error: unknown) {
    console.error('Update partner error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Give Money / Payouts (Deducts from Partner Balance) ──────────────────────

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
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    if (!isPaymentMethod(data.method)) {
      return { success: false, error: 'Invalid payment method' };
    }
    const method: PaymentMethod = data.method;

    const date = parseActionDate(data.date);
    if (!date) {
      return { success: false, error: 'Invalid payment date' };
    }

    const partner = await prisma.partner.findUnique({
      where: { id: data.partnerId },
      include: { user: { select: { name: true } } },
    });
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
      partnerName: partner.user?.name,
      amount,
      method,
    });

    revalidatePartnerViews();
    return { success: true, payout };
  } catch (error: unknown) {
    console.error('Create partner payout error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updatePartnerPayout(
  payoutId: string,
  data: {
    amount: number;
    date: string;
    method: string;
    referenceId?: string;
    notes?: string;
  },
) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    if (!isPaymentMethod(data.method)) {
      return { success: false, error: 'Invalid payment method' };
    }

    const date = parseActionDate(data.date);
    if (!date) {
      return { success: false, error: 'Invalid payment date' };
    }

    const old = await prisma.partnerPayout.findUnique({ where: { id: payoutId } });
    if (!old) {
      return { success: false, error: 'Payout record not found' };
    }

    const payout = await prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        amount,
        date,
        method: data.method,
        referenceId: data.referenceId?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logUpdate(
      prisma,
      user.id,
      'PartnerPayout',
      payoutId,
      { amount: old.amount, date: old.date, method: old.method, notes: old.notes },
      { amount: payout.amount, date: payout.date, method: payout.method, notes: payout.notes },
    );

    revalidatePartnerViews();
    return { success: true, payout };
  } catch (error: unknown) {
    console.error('Update partner payout error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deletePartnerPayout(payoutId: string) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.DELETE);

    const old = await prisma.partnerPayout.findUnique({ where: { id: payoutId } });
    if (!old) {
      return { success: false, error: 'Payout record not found' };
    }

    await prisma.partnerPayout.delete({ where: { id: payoutId } });

    await logDelete(prisma, user.id, 'PartnerPayout', payoutId, {
      partnerId: old.partnerId,
      amount: old.amount,
      method: old.method,
      date: old.date,
    });

    revalidatePartnerViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete partner payout error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Balance Adjustments (Credit / Debit) ─────────────────────────────────────

export async function createPartnerAdjustment(data: {
  partnerId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  date: string;
  reason: string;
  notes?: string;
}) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    if (data.type !== 'CREDIT' && data.type !== 'DEBIT') {
      return { success: false, error: 'Invalid adjustment type' };
    }

    const reason = data.reason?.trim();
    if (!reason) {
      return { success: false, error: 'Reason is required' };
    }

    const date = parseActionDate(data.date);
    if (!date) {
      return { success: false, error: 'Invalid date' };
    }

    const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
    if (!partner) {
      return { success: false, error: 'Partner not found' };
    }

    const adjustment = await prisma.partnerAdjustment.create({
      data: {
        partnerId: data.partnerId,
        type: data.type === 'CREDIT' ? AdjustmentType.CREDIT : AdjustmentType.DEBIT,
        amount,
        date,
        reason,
        notes: data.notes?.trim() || null,
        createdById: user.id,
      },
    });

    await logCreate(prisma, user.id, 'PartnerAdjustment', adjustment.id, {
      partnerId: data.partnerId,
      type: data.type,
      amount,
      reason,
    });

    revalidatePartnerViews();
    return { success: true, adjustment };
  } catch (error: unknown) {
    console.error('Create partner adjustment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deletePartnerAdjustment(adjustmentId: string) {
  try {
    const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.DELETE);

    const old = await prisma.partnerAdjustment.findUnique({ where: { id: adjustmentId } });
    if (!old) {
      return { success: false, error: 'Adjustment record not found' };
    }

    await prisma.partnerAdjustment.delete({ where: { id: adjustmentId } });

    await logDelete(prisma, user.id, 'PartnerAdjustment', adjustmentId, {
      partnerId: old.partnerId,
      type: old.type,
      amount: old.amount,
      reason: old.reason,
    });

    revalidatePartnerViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete partner adjustment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Monthly Settlement Preview / One-Click Period Settlement ─────────────────

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

    const paymentDate = parseActionDate(data.date);
    if (!paymentDate) {
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
      const remaining = Math.min(partnerRow.remainingAmount, partnerRow.dueAmount - alreadyPaid);
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

    revalidatePartnerViews();
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
