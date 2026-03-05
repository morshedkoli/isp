'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSessionUser } from '@/lib/authz';
import { logCreate, logUpdate } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function createPartner(data: {
    name: string;
    phone?: string;
    sharePercent: number;
}) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can create partners' };
        }

        if (data.sharePercent < 0 || data.sharePercent > 100) {
            return { success: false, error: 'Share percent must be between 0 and 100' };
        }

        // Auto-generate a unique internal email (partner never logs in)
        const slug = data.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const uniqueSuffix = Date.now();
        const internalEmail = `partner.${slug}.${uniqueSuffix}@internal.local`;
        const passwordHash = await bcrypt.hash(`partner_${uniqueSuffix}`, 10);

        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: internalEmail,
                    name: data.name,
                    phone: data.phone || undefined,
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

            return { user: newUser, partner };
        });

        await logCreate(prisma, user.id, 'Partner', result.partner.id, {
            name: data.name,
            sharePercent: data.sharePercent,
        });

        revalidatePath('/partners');
        return { success: true, partner: result.partner };
    } catch (error: any) {
        console.error('Create partner error:', error);
        return { success: false, error: error.message };
    }
}

export async function updatePartner(
    partnerId: string,
    data: { sharePercent?: number; isActive?: boolean; name?: string; phone?: string }
) {
    try {
        const user = await requireSessionUser();
        if (user.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can update partners' };
        }

        const old = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: { user: true },
        });

        const partnerData: any = {};
        if (data.sharePercent !== undefined) partnerData.sharePercent = data.sharePercent;
        if (data.isActive !== undefined) partnerData.isActive = data.isActive;

        const partner = await prisma.partner.update({
            where: { id: partnerId },
            data: partnerData,
        });

        if (data.name !== undefined || data.phone !== undefined) {
            const userUpdate: any = {};
            if (data.name) userUpdate.name = data.name;
            if (data.phone !== undefined) userUpdate.phone = data.phone;
            await prisma.user.update({ where: { id: partner.userId }, data: userUpdate });
        }

        await logUpdate(prisma, user.id, 'Partner', partnerId, old || {}, data);

        revalidatePath('/partners');
        return { success: true, partner };
    } catch (error: any) {
        console.error('Update partner error:', error);
        return { success: false, error: error.message };
    }
}
