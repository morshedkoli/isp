import { getServerSession } from 'next-auth/next';
import { PermissionAction, PermissionModule, UserRole } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hasPermission } from '@/lib/rbac';

export type SessionUser = {
  id: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
  partnerId?: string | null;
};

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    throw new Error('UNAUTHORIZED');
  }

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    partnerId: session.user.partnerId,
  };
}

export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction
): Promise<SessionUser> {
  const user = await requireSessionUser();
  const allowed = await hasPermission(user.role, module, action);
  if (!allowed) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
