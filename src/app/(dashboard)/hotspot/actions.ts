'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSessionUser } from '@/lib/authz';
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
        const user = await requireSessionUser();

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

        revalidatePath('/hotspot');
        return { success: true, sale };
    } catch (error: any) {
        console.error('Record hotspot sale error:', error);
        return { success: false, error: error.message };
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
        await requireSessionUser();

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

        revalidatePath('/hotspot');
        return { success: true, sale };
    } catch (error: any) {
        console.error('Update hotspot sale error:', error);
        return { success: false, error: error.message };
    }
}

// ─── Delete a sale ────────────────────────────────────────────────────────────

export async function deleteHotspotSale(id: string) {
    try {
        await requireSessionUser();
        await prisma.hotspotSale.delete({ where: { id } });
        revalidatePath('/hotspot');
        return { success: true };
    } catch (error: any) {
        console.error('Delete hotspot sale error:', error);
        return { success: false, error: error.message };
    }
}

// ─── Summary for a period ─────────────────────────────────────────────────────

export async function getHotspotSummary(year: number, month: number) {
    try {
        await requireSessionUser();
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
    } catch (error: any) {
        console.error('Get hotspot summary error:', error);
        return { success: false, error: error.message };
    }
}
