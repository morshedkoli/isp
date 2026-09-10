'use server';

import { revalidatePath } from 'next/cache';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';
import { calendarDateToDate, parseCalendarDate } from '@/lib/business-date';
import { expenseSchema } from '@/types/schemas';
import { emptyExpenseBuckets, emptyExpenseTotals } from './shared';

// ─── Get monthly expenses ─────────────────────────────────────────────────────

export async function getMonthlyExpenses(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.EXPENSES, PermissionAction.VIEW);

    // One query grouped in memory, rather than a findMany per category.
    const rows = await prisma.expense.findMany({
      where: { year, month },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Serialised here so the page can hand buckets straight to the client
    // component — Date instances don't cross that boundary.
    const byType = emptyExpenseBuckets();
    const totals = emptyExpenseTotals();
    for (const row of rows) {
      byType[row.type].push({
        id: row.id,
        type: row.type,
        description: row.description,
        amount: row.amount,
        date: row.date.toISOString(),
        notes: row.notes,
      });
      totals[row.type] += row.amount;
    }

    return {
      success: true as const,
      byType,
      totals,
      grandTotal: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  } catch (error: unknown) {
    console.error('Get expenses error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error),
      byType: emptyExpenseBuckets(),
      totals: emptyExpenseTotals(),
      grandTotal: 0,
    };
  }
}

// ─── Get expense totals for a period (used by commissions page) ───────────────

export async function getExpenseTotals(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.EXPENSES, PermissionAction.VIEW);

    // A single grouped aggregate replaces the eight sequential ones this
    // previously issued (one per category, plus an overall total).
    const grouped = await prisma.expense.groupBy({
      by: ['type'],
      where: { year, month },
      _sum: { amount: true },
    });

    const totals = emptyExpenseTotals();
    for (const group of grouped) {
      totals[group.type] = group._sum.amount ?? 0;
    }

    return {
      success: true as const,
      total: Object.values(totals).reduce((sum, amount) => sum + amount, 0),
      totals,
    };
  } catch (error: unknown) {
    console.error('Get expense totals error:', error);
    return {
      success: false as const,
      error: getErrorMessage(error),
      total: 0,
      totals: emptyExpenseTotals(),
    };
  }
}

// ─── Create expense ────────────────────────────────────────────────────────────

export async function createExpense(input: unknown) {
  try {
    const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.CREATE);

    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid expense.' };
    }
    const data = parsed.data;

    // `month`/`year` come from the calendar string, not from the parsed Date's
    // local getters, so the row files into the month the user actually picked.
    const parts = parseCalendarDate(data.date)!;
    const expense = await prisma.expense.create({
      data: {
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: calendarDateToDate(data.date)!,
        month: parts.month,
        year: parts.year,
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
    return { success: true as const, expense, period: { year: parts.year, month: parts.month } };
  } catch (error: unknown) {
    console.error('Create expense error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}

// ─── Update expense ────────────────────────────────────────────────────────────

export async function updateExpense(id: string, input: unknown) {
  try {
    const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.EDIT);

    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid expense.' };
    }
    const data = parsed.data;

    const old = await prisma.expense.findUnique({ where: { id } });
    if (!old) {
      return { success: false as const, error: 'This expense no longer exists.' };
    }

    const parts = parseCalendarDate(data.date)!;
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: calendarDateToDate(data.date)!,
        month: parts.month,
        year: parts.year,
        notes: data.notes || null,
      },
    });

    await logUpdate(
      prisma,
      user.id,
      'Expense',
      id,
      { description: old.description, amount: old.amount, date: old.date },
      { description: expense.description, amount: expense.amount, date: expense.date }
    );

    revalidatePath('/expenses');
    return { success: true as const, expense, period: { year: parts.year, month: parts.month } };
  } catch (error: unknown) {
    console.error('Update expense error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}

// ─── Delete expense ────────────────────────────────────────────────────────────

export async function deleteExpense(id: string) {
  try {
    const user = await requirePermission(PermissionModule.EXPENSES, PermissionAction.DELETE);

    const old = await prisma.expense.findUnique({ where: { id } });
    if (!old) {
      return { success: false as const, error: 'This expense no longer exists.' };
    }

    await prisma.expense.delete({ where: { id } });

    await logDelete(prisma, user.id, 'Expense', id, {
      type: old.type,
      description: old.description,
      amount: old.amount,
    });

    revalidatePath('/expenses');
    return { success: true as const };
  } catch (error: unknown) {
    console.error('Delete expense error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}
