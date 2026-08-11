'use server';

import { revalidatePath } from 'next/cache';
import { PermissionAction, PermissionModule } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { logCreate, logUpdate, logDelete } from '@/lib/audit';
import { getErrorMessage } from '@/lib/errors';
import { HOTSPOT_PACKAGES, HotspotPackageKey } from './constants';

// ─── Record a sale ────────────────────────────────────────────────────────────

export async function recordHotspotSale(data: {
    package: HotspotPackageKey;
    quantity: number;
    discount?: number;
    date: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
}) {
    try {
        const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.CREATE);

        const pkg = HOTSPOT_PACKAGES[data.package];
        const discountAmount = data.discount || 0;
        const amount = Math.max(0, (pkg.price * data.quantity) - discountAmount);

        const sale = await prisma.hotspotSale.create({
            data: {
                package: data.package,
                quantity: data.quantity,
                discount: discountAmount,
                amount,
                date: new Date(data.date),
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
        return { success: true, sale };
    } catch (error: unknown) {
        console.error('Record hotspot sale error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Update a sale ────────────────────────────────────────────────────────────

export async function updateHotspotSale(
    id: string,
    data: {
        package: HotspotPackageKey;
        quantity: number;
        discount?: number;
        date: string;
        customerName?: string;
        customerPhone?: string;
        notes?: string;
    }
) {
    try {
        const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.EDIT);
        const old = await prisma.hotspotSale.findUnique({ where: { id } });

        const pkg = HOTSPOT_PACKAGES[data.package];
        const discountAmount = data.discount || 0;
        const amount = Math.max(0, (pkg.price * data.quantity) - discountAmount);

        const sale = await prisma.hotspotSale.update({
            where: { id },
            data: {
                package: data.package,
                quantity: data.quantity,
                discount: discountAmount,
                amount,
                date: new Date(data.date),
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
            old ? { package: old.package, quantity: old.quantity, amount: old.amount } : {},
            { package: sale.package, quantity: sale.quantity, amount: sale.amount }
        );

        revalidatePath('/hotspot');
        return { success: true, sale };
    } catch (error: unknown) {
        console.error('Update hotspot sale error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Delete a sale ────────────────────────────────────────────────────────────

export async function deleteHotspotSale(id: string) {
    try {
        const user = await requirePermission(PermissionModule.HOTSPOT, PermissionAction.DELETE);
        const old = await prisma.hotspotSale.findUnique({ where: { id } });
        await prisma.hotspotSale.delete({ where: { id } });

        await logDelete(
            prisma,
            user.id,
            'HotspotSale',
            id,
            old ? { package: old.package, quantity: old.quantity, amount: old.amount } : {}
        );

        revalidatePath('/hotspot');
        return { success: true };
    } catch (error: unknown) {
        console.error('Delete hotspot sale error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// ─── Summary for a period ─────────────────────────────────────────────────────

export async function getHotspotSummary(year: number, month: number) {
    try {
        await requirePermission(PermissionModule.HOTSPOT, PermissionAction.VIEW);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const [sevenDay, thirtyDay, total] = await Promise.all([
            prisma.hotspotSale.aggregate({
                where: { package: 'SEVEN_DAY', date: { gte: startDate, lte: endDate } },
                _sum: { quantity: true, amount: true },
                _count: { id: true },
            }),
            prisma.hotspotSale.aggregate({
                where: { package: 'THIRTY_DAY', date: { gte: startDate, lte: endDate } },
                _sum: { quantity: true, amount: true },
                _count: { id: true },
            }),
            prisma.hotspotSale.aggregate({
                where: { date: { gte: startDate, lte: endDate } },
                _sum: { amount: true },
            }),
        ]);

        return {
            success: true,
            summary: {
                sevenDay: {
                    count: sevenDay._sum.quantity ?? 0,
                    revenue: sevenDay._sum.amount ?? 0,
                },
                thirtyDay: {
                    count: thirtyDay._sum.quantity ?? 0,
                    revenue: thirtyDay._sum.amount ?? 0,
                },
                totalRevenue: total._sum.amount ?? 0,
            },
        };
    } catch (error: unknown) {
        console.error('Get hotspot summary error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}
