'use server';

import { revalidatePath } from 'next/cache';
import { AdjustmentType, PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logDelete, logUpdate } from '@/lib/audit';
import { calendarDateToDate } from '@/lib/business-date';
import { getErrorMessage } from '@/lib/errors';

export type PersonKind = 'PARTNER' | 'AGENT';

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

function revalidateAllBalanceViews() {
  revalidatePath('/balances');
  revalidatePath('/partners', 'layout');
  revalidatePath('/dashboard');
  revalidatePath('/monthly');
  revalidatePath('/commissions');
  revalidatePath('/reports');
}

export async function recordUnifiedPayment(data: {
  personKind: PersonKind;
  personId: string;
  amount: number;
  date: string;
  method: string;
  referenceId?: string;
  notes?: string;
}) {
  try {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero.' };
    }

    if (!isPaymentMethod(data.method)) {
      return { success: false, error: 'Invalid payment method.' };
    }

    const date = parseActionDate(data.date);
    if (!date) {
      return { success: false, error: 'Invalid payment date.' };
    }

    if (data.personKind === 'PARTNER') {
      const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.APPROVE);
      const partner = await prisma.partner.findUnique({
        where: { id: data.personId },
        include: { user: { select: { name: true } } },
      });
      if (!partner) return { success: false, error: 'Partner not found.' };

      const payout = await prisma.partnerPayout.create({
        data: {
          partnerId: data.personId,
          amount,
          date,
          method: data.method,
          referenceId: data.referenceId?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });

      await logCreate(prisma, user.id, 'PartnerPayout', payout.id, {
        partnerId: data.personId,
        partnerName: partner.user?.name,
        amount,
        method: data.method,
      });

      revalidateAllBalanceViews();
      return { success: true };
    }

    // AGENT payment
    const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.EDIT);
    const agent = await prisma.commissionAgent.findUnique({ where: { id: data.personId } });
    if (!agent) return { success: false, error: 'Field agent not found.' };

    const payout = await prisma.agentPayout.create({
      data: {
        agentId: data.personId,
        amount,
        date,
        method: data.method,
        referenceId: data.referenceId?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: user.id,
      },
    });

    await logCreate(prisma, user.id, 'AgentPayout', payout.id, {
      agentId: data.personId,
      agentName: agent.name,
      amount,
      method: data.method,
    });

    revalidateAllBalanceViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Record unified payment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateUnifiedPayment(data: {
  personKind: PersonKind;
  payoutId: string;
  amount: number;
  date: string;
  method: string;
  referenceId?: string;
  notes?: string;
}) {
  try {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero.' };
    }
    if (!isPaymentMethod(data.method)) {
      return { success: false, error: 'Invalid payment method.' };
    }
    const date = parseActionDate(data.date);
    if (!date) {
      return { success: false, error: 'Invalid payment date.' };
    }

    if (data.personKind === 'PARTNER') {
      const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);
      const old = await prisma.partnerPayout.findUnique({ where: { id: data.payoutId } });
      if (!old) return { success: false, error: 'Payment not found.' };

      const updated = await prisma.partnerPayout.update({
        where: { id: data.payoutId },
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
        data.payoutId,
        { amount: old.amount, method: old.method },
        { amount: updated.amount, method: updated.method },
      );

      revalidateAllBalanceViews();
      return { success: true };
    }

    const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.EDIT);
    const old = await prisma.agentPayout.findUnique({ where: { id: data.payoutId } });
    if (!old) return { success: false, error: 'Payment not found.' };

    const updated = await prisma.agentPayout.update({
      where: { id: data.payoutId },
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
      'AgentPayout',
      data.payoutId,
      { amount: old.amount, method: old.method },
      { amount: updated.amount, method: updated.method },
    );

    revalidateAllBalanceViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Update unified payment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteUnifiedPayment(personKind: PersonKind, payoutId: string) {
  try {
    if (personKind === 'PARTNER') {
      const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.DELETE);
      const old = await prisma.partnerPayout.findUnique({ where: { id: payoutId } });
      if (!old) return { success: false, error: 'Payment not found.' };

      await prisma.partnerPayout.delete({ where: { id: payoutId } });
      await logDelete(prisma, user.id, 'PartnerPayout', payoutId, {
        partnerId: old.partnerId,
        amount: old.amount,
      });

      revalidateAllBalanceViews();
      return { success: true };
    }

    const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.DELETE);
    const old = await prisma.agentPayout.findUnique({ where: { id: payoutId } });
    if (!old) return { success: false, error: 'Payment not found.' };

    await prisma.agentPayout.delete({ where: { id: payoutId } });
    await logDelete(prisma, user.id, 'AgentPayout', payoutId, {
      agentId: old.agentId,
      amount: old.amount,
    });

    revalidateAllBalanceViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete unified payment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function recordUnifiedAdjustment(data: {
  personKind: PersonKind;
  personId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  date: string;
  reason: string;
  notes?: string;
}) {
  try {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero.' };
    }
    const reason = data.reason?.trim();
    if (!reason) return { success: false, error: 'Reason is required.' };
    const date = parseActionDate(data.date);
    if (!date) return { success: false, error: 'Invalid date.' };

    const adjType = data.type === 'CREDIT' ? AdjustmentType.CREDIT : AdjustmentType.DEBIT;

    if (data.personKind === 'PARTNER') {
      const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.EDIT);
      const adj = await prisma.partnerAdjustment.create({
        data: {
          partnerId: data.personId,
          type: adjType,
          amount,
          date,
          reason,
          notes: data.notes?.trim() || null,
          createdById: user.id,
        },
      });
      await logCreate(prisma, user.id, 'PartnerAdjustment', adj.id, {
        partnerId: data.personId,
        type: data.type,
        amount,
        reason,
      });
      revalidateAllBalanceViews();
      return { success: true };
    }

    const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.EDIT);
    const adj = await prisma.agentAdjustment.create({
      data: {
        agentId: data.personId,
        type: adjType,
        amount,
        date,
        reason,
        notes: data.notes?.trim() || null,
        createdById: user.id,
      },
    });
    await logCreate(prisma, user.id, 'AgentAdjustment', adj.id, {
      agentId: data.personId,
      type: data.type,
      amount,
      reason,
    });
    revalidateAllBalanceViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Record unified adjustment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteUnifiedAdjustment(personKind: PersonKind, adjustmentId: string) {
  try {
    if (personKind === 'PARTNER') {
      const user = await requirePermission(PermissionModule.PARTNERS, PermissionAction.DELETE);
      await prisma.partnerAdjustment.delete({ where: { id: adjustmentId } });
      await logDelete(prisma, user.id, 'PartnerAdjustment', adjustmentId, {});
      revalidateAllBalanceViews();
      return { success: true };
    }

    const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.DELETE);
    await prisma.agentAdjustment.delete({ where: { id: adjustmentId } });
    await logDelete(prisma, user.id, 'AgentAdjustment', adjustmentId, {});
    revalidateAllBalanceViews();
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete unified adjustment error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
