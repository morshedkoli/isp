import { UserRole, PermissionModule, PermissionAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Check if a user has a specific permission
 * @param userRole - User's role
 * @param module - Permission module
 * @param action - Permission action
 * @returns Boolean indicating if user has permission
 */
export async function hasPermission(
  userRole: UserRole,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> {
  // Admin has all permissions
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  const permission = await prisma.rolePermission.findUnique({
    where: {
      role_module: {
        role: userRole,
        module,
      },
    },
  });

  if (!permission) {
    return false;
  }

  return permission.actions.includes(action);
}

/**
 * Get all permissions for a role
 * @param userRole - User's role
 * @returns Array of permission modules with actions
 */
export async function getRolePermissions(userRole: UserRole): Promise<
  Array<{
    module: PermissionModule;
    actions: PermissionAction[];
  }>
> {
  // Admin has all permissions
  if (userRole === UserRole.ADMIN) {
    const allModules = Object.values(PermissionModule);
    const allActions = Object.values(PermissionAction);
    return allModules.map((module) => ({
      module,
      actions: allActions,
    }));
  }

  const permissions = await prisma.rolePermission.findMany({
    where: {
      role: userRole,
    },
  });

  return permissions.map((p) => ({
    module: p.module,
    actions: p.actions,
  }));
}

/**
 * Check if user can access a specific resource
 * @param user - User session object
 * @param resourceOwnerId - ID of the resource owner
 * @returns Boolean indicating if user can access
 */
export function canAccessResource(
  user: { id: string; role: UserRole },
  resourceOwnerId?: string
): boolean {
  // Admin can access everything
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Partners can access their own resources
  if (user.role === UserRole.PARTNER) {
    return true; // Partners have limited view access by default
  }

  // Agents can only access their assigned customers
  if (user.role === UserRole.AGENT) {
    // This is checked at the query level, not here
    return true;
  }

  // Check if user owns the resource
  if (resourceOwnerId && user.id === resourceOwnerId) {
    return true;
  }

  return false;
}

/**
 * Role display names
 */
export const roleDisplayNames: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.PARTNER]: 'Partner',
  [UserRole.AGENT]: 'Agent',
  [UserRole.EMPLOYEE]: 'Employee',
};

/**
 * Module display names
 */
export const moduleDisplayNames: Record<PermissionModule, string> = {
  [PermissionModule.CUSTOMERS]: 'Customers',
  [PermissionModule.RECHARGES]: 'Recharges',
  [PermissionModule.PAYMENTS]: 'Payments',
  [PermissionModule.FINANCE_LEDGER]: 'Finance Ledger',
  [PermissionModule.REPORTS]: 'Reports',
  [PermissionModule.SETTINGS]: 'Settings',
  [PermissionModule.AUDIT_LOGS]: 'Audit Logs',
};

/**
 * Action display names
 */
export const actionDisplayNames: Record<PermissionAction, string> = {
  [PermissionAction.VIEW]: 'View',
  [PermissionAction.CREATE]: 'Create',
  [PermissionAction.EDIT]: 'Edit',
  [PermissionAction.DELETE]: 'Delete',
  [PermissionAction.APPROVE]: 'Approve',
};