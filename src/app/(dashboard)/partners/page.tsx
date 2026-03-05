import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import PartnersClient from './PartnersClient';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const partners = await prisma.partner.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <PartnersClient partners={partners} />;
}
