'use server';

import { revalidatePath } from 'next/cache';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';
import { calendarDateToDate, monthBounds, periodOf } from '@/lib/business-date';
import { hotspotSaleSchema } from '@/types/schemas';
import { HOTSPOT_PACKAGES } from './constants';
import type { HotspotSaleInput } from '@/types/schemas';

/**
 * Price a sale from the server-side package table. The client sends only the
 * package key and quantity — never an amount — so a tampered request can't
 * record a sale at an arbitrary price.
 */
function priceSale(data: HotspotSaleInput): { amount: number; discount: number } | { error: string } {
  const pkg = HOTSPOT_PACKAGES[data.package];
  if (!pkg) {
    return { error: 'Unknown hotspot package.' };
  }

  const gross = pkg.price * data.quantity;
  const discount = data.discount ?? 0;
  if (discount > gross) {
    return { error: 'Discount cannot exceed the total package price.' };
  }

  return { amount: gross - discount, discount };
}

// ─── Record a sale ────────────────────────────────────────────────────────────

export async function recordHotspotSale(input: unknown) {
  try {
    const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.CREATE);

    const parsed = hotspotSaleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid sale.' };
    }
    const data = parsed.data;

    const priced = priceSale(data);
    if ('error' in priced) {
      return { success: false as const, error: priced.error };
    }

    const date = calendarDateToDate(data.date)!;
    const sale = await prisma.hotspotSale.create({
      data: {
        package: data.package,
        quantity: data.quantity,
        discount: priced.discount,
        amount: priced.amount,
        date,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    await logCreate(prisma, user.id, 'HotspotSale', sale.id, {
      package: sale.package,
      quantity: sale.quantity,
      amount: sale.amount,
    });

    revalidatePath('/hotspot');
    revalidatePath('/dashboard');
    revalidatePath('/monthly');
    revalidatePath('/reports');
    return { success: true as const, sale, period: periodOf(date) };
  } catch (error: unknown) {
    console.error('Record hotspot sale error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}

// ─── Update a sale ────────────────────────────────────────────────────────────

export async function updateHotspotSale(id: string, input: unknown) {
  try {
    const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.EDIT);

    const parsed = hotspotSaleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid sale.' };
    }
    const data = parsed.data;

    const priced = priceSale(data);
    if ('error' in priced) {
      return { success: false as const, error: priced.error };
    }

    const old = await prisma.hotspotSale.findUnique({ where: { id } });
    if (!old) {
      return { success: false as const, error: 'This sale no longer exists.' };
    }

    const date = calendarDateToDate(data.date)!;
    const sale = await prisma.hotspotSale.update({
      where: { id },
      data: {
        package: data.package,
        quantity: data.quantity,
        discount: priced.discount,
        amount: priced.amount,
        date,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        notes: data.notes || null,
      },
    });

    await logUpdate(
      prisma,
      user.id,
      'HotspotSale',
      id,
      { package: old.package, quantity: old.quantity, amount: old.amount },
      { package: sale.package, quantity: sale.quantity, amount: sale.amount }
    );

    revalidatePath('/hotspot');
    revalidatePath('/dashboard');
    revalidatePath('/monthly');
    revalidatePath('/reports');
    return { success: true as const, sale, period: periodOf(date) };
  } catch (error: unknown) {
    console.error('Update hotspot sale error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}

// ─── Delete a sale ────────────────────────────────────────────────────────────

export async function deleteHotspotSale(id: string) {
  try {
    const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.DELETE);

    const old = await prisma.hotspotSale.findUnique({ where: { id } });
    if (!old) {
      return { success: false as const, error: 'This sale no longer exists.' };
    }

    await prisma.hotspotSale.delete({ where: { id } });

    await logDelete(prisma, user.id, 'HotspotSale', id, {
      package: old.package,
      quantity: old.quantity,
      amount: old.amount,
    });

    revalidatePath('/hotspot');
    revalidatePath('/dashboard');
    revalidatePath('/monthly');
    revalidatePath('/reports');
    return { success: true as const };
  } catch (error: unknown) {
    console.error('Delete hotspot sale error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}

// ─── Summary for a period ─────────────────────────────────────────────────────

export async function getHotspotSummary(year: number, month: number) {
  try {
    await requirePermission(PermissionModule.HOTSPOT, PermissionAction.VIEW);

    // Shares `monthBounds` with the page's sale list, which previously built
    // its own range — the two could disagree on the first day of a month.
    const { start, end } = monthBounds(year, month);

    const grouped = await prisma.hotspotSale.groupBy({
      by: ['package'],
      where: { date: { gte: start, lte: end } },
      _sum: { quantity: true, amount: true },
    });

    const byPackage = new Map(grouped.map((row) => [row.package, row._sum]));
    const read = (key: keyof typeof HOTSPOT_PACKAGES) => ({
      count: byPackage.get(key)?.quantity ?? 0,
      revenue: byPackage.get(key)?.amount ?? 0,
    });

    const sevenDay = read('SEVEN_DAY');
    const thirtyDay = read('THIRTY_DAY');

    return {
      success: true as const,
      summary: {
        sevenDay,
        thirtyDay,
        totalRevenue: grouped.reduce((sum, row) => sum + (row._sum.amount ?? 0), 0),
      },
    };
  } catch (error: unknown) {
    console.error('Get hotspot summary error:', error);
    return { success: false as const, error: getErrorMessage(error) };
  }
}
