import { PrismaClient, AuditAction } from '@prisma/client';

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * @param prisma - Prisma client instance
 * @param data - Audit log data
 */
export async function createAuditLog(
  prisma: PrismaClient,
  data: AuditLogData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failures shouldn't break the main operation
  }
}

/**
 * Log a create action
 */
export async function logCreate(
  prisma: PrismaClient,
  userId: string,
  entityType: string,
  entityId: string,
  newData: Record<string, any>,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await createAuditLog(prisma, {
    userId,
    action: AuditAction.CREATE,
    entityType,
    entityId,
    newData,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Log an update action
 */
export async function logUpdate(
  prisma: PrismaClient,
  userId: string,
  entityType: string,
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await createAuditLog(prisma, {
    userId,
    action: AuditAction.UPDATE,
    entityType,
    entityId,
    oldData,
    newData,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Log a delete action
 */
export async function logDelete(
  prisma: PrismaClient,
  userId: string,
  entityType: string,
  entityId: string,
  oldData: Record<string, any>,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await createAuditLog(prisma, {
    userId,
    action: AuditAction.DELETE,
    entityType,
    entityId,
    oldData,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Log a login action
 */
export async function logLogin(
  prisma: PrismaClient,
  userId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await createAuditLog(prisma, {
    userId,
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: userId,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}

/**
 * Log a logout action
 */
export async function logLogout(
  prisma: PrismaClient,
  userId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await createAuditLog(prisma, {
    userId,
    action: AuditAction.LOGOUT,
    entityType: 'User',
    entityId: userId,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  });
}