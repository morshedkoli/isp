'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSessionUser } from '@/lib/authz';

// ─── Agents CRUD ──────────────────────────────────────────────────────────────

export async function createAgent(data: {
    name: string;
    phone?: string;
    commissionPercent: number;
    notes?: string;
}) {
    try {
        await requireSessionUser();
        const agent = await prisma.commissionAgent.create({ data });
        revalidatePath('/commissions');
        return { success: true, agent };
    } catch (error: any) {
        console.error('Create agent error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateAgent(
    id: string,
    data: { name?: string; phone?: string; commissionPercent?: number; isActive?: boolean; notes?: string }
) {
    try {
        await requireSessionUser();
        const agent = await prisma.commissionAgent.update({ where: { id }, data });
        revalidatePath('/commissions');
        return { success: true, agent };
    } catch (error: any) {
        console.error('Update agent error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAgent(id: string) {
    try {
        await requireSessionUser();
        await prisma.commissionAgent.delete({ where: { id } });
        revalidatePath('/commissions');
        return { success: true };
    } catch (error: any) {
        console.error('Delete agent error:', error);
        return { success: false, error: error.message };
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
        const user = await requireSessionUser();

        // Calculate total pool from sources
        const calculatedTotalPool = data.sources.reduce((sum, src) => sum + src.amount, 0);

        // Upsert the parent record
        const record = await prisma.commissionRecord.upsert({
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
        await prisma.commissionSource.deleteMany({
            where: { commissionRecordId: record.id },
        });

        // Add new sources
        if (data.sources.length > 0) {
            await prisma.commissionSource.createMany({
                data: data.sources.map(src => ({
                    commissionRecordId: record.id,
                    description: src.description,
                    amount: src.amount,
                })),
            });
        }

        // Upsert each agent entry
        for (const [agentId, amount] of Object.entries(data.agentAmounts)) {
            await prisma.agentCommissionEntry.upsert({
                where: {
                    commissionRecordId_agentId: {
                        commissionRecordId: record.id,
                        agentId,
                    },
                },
                create: {
                    commissionRecordId: record.id,
                    agentId,
                    amount,
                },
                update: { amount },
            });
        }

        // Remove entries for agents not in this submission
        await prisma.agentCommissionEntry.deleteMany({
            where: {
                commissionRecordId: record.id,
                agentId: { notIn: Object.keys(data.agentAmounts) },
            },
        });

        revalidatePath('/commissions');
        return { success: true, record };
    } catch (error: any) {
        console.error('Save commission record error:', error);
        return { success: false, error: error.message };
    }
}

// ─── Load a month's commission record ────────────────────────────────────────

export async function getCommissionRecord(year: number, month: number) {
    try {
        await requireSessionUser();

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
    } catch (error: any) {
        console.error('Get commission record error:', error);
        return { success: false, error: error.message };
    }
}
