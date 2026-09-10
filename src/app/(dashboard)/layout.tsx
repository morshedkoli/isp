import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { resolvePeriod } from '@/lib/period';
import { getAvailablePeriods, getStoredPeriod } from '@/lib/period-server';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // The header's period selector has to agree with whatever the page rendered.
  // Layouts can't read searchParams, so resolve the *param-less* half of the
  // chain here — the same `[storedPeriod, availablePeriods[0]]` fallback every
  // page uses — and let the selector apply the URL params on the client.
  // Without this the selector fell back to today's month while the page fell
  // back to the stored cookie, so a bare /dashboard showed July's data under an
  // "August" selector.
  const [availablePeriods, storedPeriod] = await Promise.all([
    getAvailablePeriods(),
    getStoredPeriod(),
  ]);
  const fallbackPeriod = resolvePeriod(undefined, undefined, [
    storedPeriod,
    availablePeriods[0],
  ]);

  return (
    <DashboardShell
      user={session.user}
      fallbackPeriod={fallbackPeriod}
      availablePeriods={availablePeriods}
    >
      {children}
    </DashboardShell>
  );
}
