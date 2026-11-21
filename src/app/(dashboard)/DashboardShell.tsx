'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, Suspense } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  Settings,
  Menu,
  LogOut,
  X,
  Wifi,
  Calculator,
  Receipt,
  Calendar,
  CalendarRange,
  Layers,
  Wallet,
} from 'lucide-react';
import { getClientPeriod, type Period } from '@/lib/period';
import PeriodSelector from '@/components/ui/PeriodSelector';
import { usePeriodTransition } from '@/components/ui/PeriodTransition';

type ShellUser = {
  name?: string | null;
  role?: string;
};

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Monthly', href: '/monthly', icon: CalendarRange },
  { name: 'Balances & Pay', href: '/balances', icon: Wallet },
  { name: 'Commissions', href: '/commissions', icon: Calculator },
  { name: 'Partners', href: '/partners', icon: UserCheck },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Hotspot', href: '/hotspot', icon: Wifi },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function NavItems({
  pathname,
  fallbackPeriod,
  isSidebarOpen,
  onItemClick,
}: {
  pathname: string;
  fallbackPeriod?: Period;
  isSidebarOpen?: boolean;
  onItemClick?: () => void;
}) {
  const searchParams = useSearchParams();
  const now = new Date();
  const cookiePeriod = getClientPeriod();
  const currentYear = parseInt(searchParams?.get('year') || '', 10) || cookiePeriod?.year || fallbackPeriod?.year || now.getFullYear();
  const currentMonth = parseInt(searchParams?.get('month') || '', 10) || cookiePeriod?.month || fallbackPeriod?.month || (now.getMonth() + 1);

  return (
    <>
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isAccountOrOverview =
          item.href === '/settings' ||
          item.href === '/dashboard' ||
          item.href === '/balances' ||
          item.href === '/partners';
        const itemHref = isAccountOrOverview
          ? item.href
          : `${item.href}?year=${currentYear}&month=${currentMonth}`;

        return (
          <Link
            key={item.name}
            href={itemHref}
            onClick={onItemClick}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-sm ring-1 ring-emerald-500/10'
                : 'text-stone-600 hover:bg-emerald-50/50 hover:text-stone-900'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-600" />
            )}
            <item.icon
              size={20}
              className={`transition-colors ${isActive ? 'text-emerald-600' : 'text-stone-400 group-hover:text-emerald-600'}`}
            />
            {isSidebarOpen !== false && <span>{item.name}</span>}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardShell({
  user,
  fallbackPeriod,
  availablePeriods = [],
  children,
}: {
  user: ShellUser;
  /** Period the pages fall back to when the URL carries no year/month. */
  fallbackPeriod?: Period;
  /** Months that actually have data — widens the selector's year dropdown. */
  availablePeriods?: Period[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isPending } = usePeriodTransition();

  return (
    <div className="min-h-screen bg-soft-pattern text-stone-900" suppressHydrationWarning>
      {/* Indeterminate progress bar — the only full-width signal that a period
          change is still fetching, visible no matter where the page is scrolled. */}
      {isPending && (
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-emerald-100/80">
          <div className="animate-progress-slide h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-500" />
        </div>
      )}

      {/* Sidebar for desktop */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-white/90 backdrop-blur-md border-r border-emerald-900/5 shadow-[4px_0_24px_rgba(16,185,129,0.03)] transition-all duration-300 ease-in-out hidden lg:block ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-emerald-900/5 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/20">
              <img src="/logo.png" alt="GrameenWifi Logo" className="h-full w-full object-cover" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold tracking-tight text-stone-900 truncate">GrameenWifi</span>
                <span className="text-[10px] font-medium text-emerald-700 truncate" title="Kalikaccha, Sarail, Brahmanbaria">
                  Kalikaccha, Sarail
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          <Suspense fallback={null}>
            <NavItems
              pathname={pathname}
              fallbackPeriod={fallbackPeriod}
              isSidebarOpen={isSidebarOpen}
            />
          </Suspense>
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-emerald-900/5 p-3 bg-stone-50/50">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={20} className="text-stone-400 transition-colors group-hover:text-rose-500" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-emerald-900/5 px-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/20">
                  <img src="/logo.png" alt="GrameenWifi Logo" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-stone-900">GrameenWifi</span>
                  <span className="text-[10px] font-medium text-emerald-700">Kalikaccha, Sarail, Brahmanbaria</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-stone-400 hover:bg-emerald-50 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              <Suspense fallback={null}>
                <NavItems
                  pathname={pathname}
                  fallbackPeriod={fallbackPeriod}
                  isSidebarOpen={true}
                  onItemClick={() => setIsMobileMenuOpen(false)}
                />
              </Suspense>
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-emerald-900/5 p-3">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-all duration-200 hover:bg-rose-50"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-emerald-900/5 shadow-[0_1px_15px_rgba(0,0,0,0.02)]">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            {/* Left: Toggle & Mobile Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden rounded-lg p-2 text-stone-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:block"
                title="Toggle Sidebar"
              >
                <Menu size={20} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
                title="Open Navigation"
              >
                <Menu size={20} />
              </button>
            </div>

            {/* Center/Right: Topbar Period Selector & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Month & Year Selection inside Topbar (or All-Time / Completed Months badge) */}
              {pathname === '/dashboard' ||
              pathname === '/balances' ||
              pathname === '/partners' ||
              pathname.startsWith('/partners/') ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <Layers size={14} className="text-emerald-600" />
                    {pathname === '/dashboard' ? 'All-Time Totals' : 'Completed Months Only'}
                  </span>
                  <Link
                    href="/monthly"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs transition-colors hover:border-emerald-600/30 hover:text-emerald-800"
                  >
                    <CalendarRange size={14} className="text-emerald-600" />
                    Monthly Info
                  </Link>
                </div>
              ) : pathname !== '/settings' ? (
                <Suspense
                  fallback={
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-1.5 text-xs text-stone-400">
                      <Calendar size={15} /> Loading period…
                    </div>
                  }
                >
                  <PeriodSelector
                    basePath={pathname}
                    fallbackPeriod={fallbackPeriod}
                    availablePeriods={availablePeriods}
                  />
                </Suspense>
              ) : null}

              {/* User Avatar */}
              <div className="hidden items-center gap-3 sm:flex rounded-full bg-emerald-50/60 ring-1 ring-emerald-900/5 px-3 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm">
                  <span className="text-xs font-bold">{user.name?.charAt(0).toUpperCase() || 'A'}</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-stone-900">{user.name}</p>
                  <p className="text-[10px] font-medium text-emerald-700">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {/* Stale figures are dimmed and made inert rather than hidden, so the
              layout does not jump and the previous month stays readable. */}
          <div
            aria-busy={isPending}
            className={`transition-opacity duration-200 ${
              isPending ? 'pointer-events-none select-none opacity-40' : 'opacity-100'
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
