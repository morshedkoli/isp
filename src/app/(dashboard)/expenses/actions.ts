'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSessionUser } from '@/lib/authz';

// ─── Get monthly expenses ─────────────────────────────────────────────────────

export async function getMonthlyExpenses(year: number, month: number) {
    try {
        await requireSessionUser();

        const [salaries, misc] = await Promise.all([
            prisma.expense.findMany({
                where: { year, month, type: 'SALARY' },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'MISC' },
                orderBy: { date: 'asc' },
            }),
        ]);

        const salaryTotal = salaries.reduce((s, e) => s + e.amount, 0);
        const miscTotal = misc.reduce((s, e) => s + e.amount, 0);

        return {
            success: true,
            salaries,
            misc,
            salaryTotal,
            miscTotal,
            grandTotal: salaryTotal + miscTotal,
        };
    } catch (error: any) {
        console.error('Get expenses error:', error);
        return { success: false, error: error.message, salaries: [], misc: [], salaryTotal: 0, miscTotal: 0, grandTotal: 0 };
    }
}

// ─── Get expense totals for a period (used by commissions page) ───────────────

export async function getExpenseTotals(year: number, month: number) {
    try {
        await requireSessionUser();
        const agg = await prisma.expense.aggregate({
            where: { year, month },
            _sum: { amount: true },
        });
        const salaryAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'SALARY' },
            _sum: { amount: true },
        });
        const miscAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'MISC' },
            _sum: { amount: true },
        });
        return {
            success: true,
            total: agg._sum.amount ?? 0,
            salaryTotal: salaryAgg._sum.amount ?? 0,
            miscTotal: miscAgg._sum.amount ?? 0,
        };
    } catch (error: any) {
        return { success: false, error: error.message, total: 0, salaryTotal: 0, miscTotal: 0 };
    }
}

// ─── Create expense ────────────────────────────────────────────────────────────

export async function createExpense(data: {
    type: 'SALARY' | 'MISC';
    description: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    try {
        const user = await requireSessionUser();
        const date = new Date(data.date);
        const expense = await prisma.expense.create({
            data: {
                type: data.type,
                description: data.description.trim(),
                amount: data.amount,
                date,
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                notes: data.notes || null,
                createdById: user.id,
            },
        });
        revalidatePath('/expenses');
        return { success: true, expense };
    } catch (error: any) {
        console.error('Create expense error:', error);
        return { success: false, error: error.message };
    }
}

// ─── Update expense ────────────────────────────────────────────────────────────

export async function updateExpense(id: string, data: {
    description: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    try {
        await requireSessionUser();
        const date = new Date(data.date);
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                description: data.description.trim(),
                amount: data.amount,
                date,
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                notes: data.notes || null,
            },
        });
        revalidatePath('/expenses');
        return { success: true, expense };
    } catch (error: any) {
        console.error('Update expense error:', error);
        return { success: false, error: error.message };
    }
}

// ─── Delete expense ────────────────────────────────────────────────────────────

export async function deleteExpense(id: string) {
    try {
        await requireSessionUser();
        await prisma.expense.delete({ where: { id } });
        revalidatePath('/expenses');
        return { success: true };
    } catch (error: any) {
        console.error('Delete expense error:', error);
        return { success: false, error: error.message };
    }
}
