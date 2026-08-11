'use server';

import { revalidatePath } from 'next/cache';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';

// ─── Agents CRUD ──────────────────────────────────────────────────────────────

export async function createAgent(data: {
    name: string;
    phone?: string;
    commissionPercent: number;
    notes?: string;
}) {
    try {
        const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.CREATE);
        const agent = await prisma.commissionAgent.create({ data });

        await logCreate(prisma, user.id, 'CommissionAgent', agent.id, {
            name: agent.name,
            commissionPercent: agent.commissionPercent,
        });

        revalidatePath('/commissions');
        return { success: true, agent };
    } catch (error: unknown) {
        console.error('Create agent error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateAgent(
    id: string,
    data: { name?: string; phone?: string; commissionPercent?: number; isActive?: boolean; notes?: string }
) {
    try {
        const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.EDIT);
        const old = await prisma.commissionAgent.findUnique({ where: { id } });
        const agent = await prisma.commissionAgent.update({ where: { id }, data });

        await logUpdate(
            prisma,
            user.id,
            'CommissionAgent',
            id,
            old ? { name: old.name, commissionPercent: old.commissionPercent, isActive: old.isActive } : {},
            data
        );

        revalidatePath('/commissions');
        return { success: true, agent };
    } catch (error: unknown) {
        console.error('Update agent error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteAgent(id: string) {
    try {
        const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.DELETE);
        const old = await prisma.commissionAgent.findUnique({ where: { id } });
        await prisma.commissionAgent.delete({ where: { id } });

        await logDelete(
            prisma,
            user.id,
            'CommissionAgent',
            id,
            old ? { name: old.name, commissionPercent: old.commissionPercent } : {}
        );

        revalidatePath('/commissions');
        return { success: true };
    } catch (error: unknown) {
        console.error('Delete agent error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Monthly Commission Record ────────────────────────────────────────────────

/**
 * Upsert the commission record for a given month.
 * agentAmounts: map of agentId → amount (manually entered or pre-calculated).
 */
export async function saveCommissionRecord(data: {
    year: number;
    month: number;
    sources: { id?: string; description: string; amount: number }[];
    ourAmount: number;
    notes?: string;
    agentAmounts: Record<string, number>; // agentId → amount
}) {
    try {
        const user = await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.EDIT);
        const old = await prisma.commissionRecord.findUnique({
            where: { year_month: { year: data.year, month: data.month } },
        });

        // Calculate total pool from sources
        const calculatedTotalPool = data.sources.reduce((sum, src) => sum + src.amount, 0);

        // Upsert the record, its sources, and its agent entries atomically — a partial
        // write here (e.g. sources replaced but agent entries not yet updated) would leave
        // the month's commission data internally inconsistent.
        const record = await prisma.$transaction(async (tx) => {
            const upsertedRecord = await tx.commissionRecord.upsert({
                where: { year_month: { year: data.year, month: data.month } },
                create: {
                    year: data.year,
                    month: data.month,
                    totalPool: calculatedTotalPool,
                    ourAmount: data.ourAmount,
                    notes: data.notes || null,
                    createdById: user.id,
                },
                update: {
                    totalPool: calculatedTotalPool,
                    ourAmount: data.ourAmount,
                    notes: data.notes || null,
                },
            });

            // Handle Sources
            // Delete all old sources
            await tx.commissionSource.deleteMany({
                where: { commissionRecordId: upsertedRecord.id },
            });

            // Add new sources
            if (data.sources.length > 0) {
                await tx.commissionSource.createMany({
                    data: data.sources.map(src => ({
                        commissionRecordId: upsertedRecord.id,
                        description: src.description,
                        amount: src.amount,
                    })),
                });
            }

            // Upsert each agent entry
            for (const [agentId, amount] of Object.entries(data.agentAmounts)) {
                await tx.agentCommissionEntry.upsert({
                    where: {
                        commissionRecordId_agentId: {
                            commissionRecordId: upsertedRecord.id,
                            agentId,
                        },
                    },
                    create: {
                        commissionRecordId: upsertedRecord.id,
                        agentId,
                        amount,
                    },
                    update: { amount },
                });
            }

            // Remove entries for agents not in this submission
            await tx.agentCommissionEntry.deleteMany({
                where: {
                    commissionRecordId: upsertedRecord.id,
                    agentId: { notIn: Object.keys(data.agentAmounts) },
                },
            });

            return upsertedRecord;
        });

        if (old) {
            await logUpdate(
                prisma,
                user.id,
                'CommissionRecord',
                record.id,
                { totalPool: old.totalPool, ourAmount: old.ourAmount },
                { totalPool: calculatedTotalPool, ourAmount: data.ourAmount }
            );
        } else {
            await logCreate(prisma, user.id, 'CommissionRecord', record.id, {
                year: data.year,
                month: data.month,
                totalPool: calculatedTotalPool,
                ourAmount: data.ourAmount,
            });
        }

        revalidatePath('/commissions');
        return { success: true, record };
    } catch (error: unknown) {
        console.error('Save commission record error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Load a month's commission record ────────────────────────────────────────

export async function getCommissionRecord(year: number, month: number) {
    try {
        await requirePermission(PermissionModule.COMMISSIONS, PermissionAction.VIEW);

        const record = await prisma.commissionRecord.findUnique({
            where: { year_month: { year, month } },
            include: {
                sources: true,
                agentEntries: {
                    include: { agent: true },
                },
            },
        });

        return { success: true, record };
    } catch (error: unknown) {
        console.error('Get commission record error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}
