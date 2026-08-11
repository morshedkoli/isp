'use server';

import { revalidatePath } from 'next/cache';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';

import { ExpenseType } from '@prisma/client';

// ─── Get monthly expenses ─────────────────────────────────────────────────────

export async function getMonthlyExpenses(year: number, month: number) {
    try {
        await requirePermission(PermissionModule.EXPENSES, PermissionAction.VIEW);

        const [salaries, fiberCable, rent, utilities, equipment, conveyance, misc] = await Promise.all([
            prisma.expense.findMany({
                where: { year, month, type: 'SALARY' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'FIBER_CABLE' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'RENT' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'UTILITIES' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'EQUIPMENT' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'CONVEYANCE' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.expense.findMany({
                where: { year, month, type: 'MISC' },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
        ]);

        const salaryTotal = salaries.reduce((s, e) => s + e.amount, 0);
        const fiberCableTotal = fiberCable.reduce((s, e) => s + e.amount, 0);
        const rentTotal = rent.reduce((s, e) => s + e.amount, 0);
        const utilitiesTotal = utilities.reduce((s, e) => s + e.amount, 0);
        const equipmentTotal = equipment.reduce((s, e) => s + e.amount, 0);
        const conveyanceTotal = conveyance.reduce((s, e) => s + e.amount, 0);
        const miscTotal = misc.reduce((s, e) => s + e.amount, 0);

        return {
            success: true,
            salaries,
            fiberCable,
            rent,
            utilities,
            equipment,
            conveyance,
            misc,
            salaryTotal,
            fiberCableTotal,
            rentTotal,
            utilitiesTotal,
            equipmentTotal,
            conveyanceTotal,
            miscTotal,
            grandTotal: salaryTotal + fiberCableTotal + rentTotal + utilitiesTotal + equipmentTotal + conveyanceTotal + miscTotal,
        };
    } catch (error: unknown) {
        console.error('Get expenses error:', error);
        return {
            success: false,
            error: getErrorMessage(error),
            salaries: [],
            fiberCable: [],
            rent: [],
            utilities: [],
            equipment: [],
            conveyance: [],
            misc: [],
            salaryTotal: 0,
            fiberCableTotal: 0,
            rentTotal: 0,
            utilitiesTotal: 0,
            equipmentTotal: 0,
            conveyanceTotal: 0,
            miscTotal: 0,
            grandTotal: 0,
        };
    }
}

// ─── Get expense totals for a period (used by commissions page) ───────────────

export async function getExpenseTotals(year: number, month: number) {
    try {
        await requirePermission(PermissionModule.EXPENSES, PermissionAction.VIEW);
        const agg = await prisma.expense.aggregate({
            where: { year, month },
            _sum: { amount: true },
        });
        const salaryAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'SALARY' },
            _sum: { amount: true },
        });
        const fiberCableAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'FIBER_CABLE' },
            _sum: { amount: true },
        });
        const rentAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'RENT' },
            _sum: { amount: true },
        });
        const utilitiesAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'UTILITIES' },
            _sum: { amount: true },
        });
        const equipmentAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'EQUIPMENT' },
            _sum: { amount: true },
        });
        const conveyanceAgg = await prisma.expense.aggregate({
            where: { year, month, type: 'CONVEYANCE' },
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
            fiberCableTotal: fiberCableAgg._sum.amount ?? 0,
            rentTotal: rentAgg._sum.amount ?? 0,
            utilitiesTotal: utilitiesAgg._sum.amount ?? 0,
            equipmentTotal: equipmentAgg._sum.amount ?? 0,
            conveyanceTotal: conveyanceAgg._sum.amount ?? 0,
            miscTotal: miscAgg._sum.amount ?? 0,
        };
    } catch (error: unknown) {
        return {
            success: false,
            error: getErrorMessage(error),
            total: 0,
            salaryTotal: 0,
            fiberCableTotal: 0,
            rentTotal: 0,
            utilitiesTotal: 0,
            equipmentTotal: 0,
            conveyanceTotal: 0,
            miscTotal: 0,
        };
    }
}

// ─── Create expense ────────────────────────────────────────────────────────────

export async function createExpense(data: {
    type: ExpenseType;
    description: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    try {
        const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.CREATE);
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

        await logCreate(prisma, user.id, 'Expense', expense.id, {
            type: expense.type,
            description: expense.description,
            amount: expense.amount,
        });

        revalidatePath('/expenses');
        return { success: true, expense };
    } catch (error: unknown) {
        console.error('Create expense error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Update expense ────────────────────────────────────────────────────────────

export async function updateExpense(id: string, data: {
    type: ExpenseType;
    description: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    try {
        const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.EDIT);
        const old = await prisma.expense.findUnique({ where: { id } });

        const date = new Date(data.date);
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                type: data.type,
                description: data.description.trim(),
                amount: data.amount,
                date,
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                notes: data.notes || null,
            },
        });

        await logUpdate(
            prisma,
            user.id,
            'Expense',
            id,
            old ? { description: old.description, amount: old.amount, date: old.date } : {},
            { description: expense.description, amount: expense.amount, date: expense.date }
        );

        revalidatePath('/expenses');
        return { success: true, expense };
    } catch (error: unknown) {
        console.error('Update expense error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Delete expense ────────────────────────────────────────────────────────────

export async function deleteExpense(id: string) {
    try {
        const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.DELETE);
        const old = await prisma.expense.findUnique({ where: { id } });
        await prisma.expense.delete({ where: { id } });

        await logDelete(
            prisma,
            user.id,
            'Expense',
            id,
            old ? { type: old.type, description: old.description, amount: old.amount } : {}
        );

        revalidatePath('/expenses');
        return { success: true };
    } catch (error: unknown) {
        console.error('Delete expense error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}
