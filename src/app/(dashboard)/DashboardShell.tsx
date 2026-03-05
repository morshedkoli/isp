'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
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
} from 'lucide-react';

type ShellUser = {
  name?: string | null;
  role?: string;
};

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Hotspot', href: '/hotspot', icon: Wifi },
  { name: 'Commissions', href: '/commissions', icon: Calculator },
  { name: 'Partners', href: '/partners', icon: UserCheck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-soft-pattern">
      {/* Sidebar for desktop */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out hidden lg:block ${isSidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-stone-100 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <span className="text-lg font-bold text-white">I</span>
            </div>
            {isSidebarOpen && (
              <span className="text-lg font-bold text-stone-800">ISP Admin</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-indigo-50/70 text-indigo-700'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
              >
                <item.icon
                  size={20}
                  className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-stone-400 group-hover:text-stone-600'
                    }`}
                />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut
              size={20}
              className="text-stone-400 transition-colors group-hover:text-red-500"
            />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                  <span className="text-lg font-bold text-white">I</span>
                </div>
                <span className="text-lg font-bold text-stone-800">ISP Admin</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                  >
                    <item.icon
                      size={20}
                      className={isActive ? 'text-indigo-600' : 'text-stone-400'}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-stone-200 p-3">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
          }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.02)] border-b border-stone-100/50">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            {/* Left: Toggle & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 lg:block"
              >
                <Menu size={20} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 lg:hidden"
              >
                <Menu size={20} />
              </button>
            </div>

            {/* Right: User */}
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-3 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                  <span className="text-sm font-semibold text-indigo-600">
                    {user.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-stone-900">{user.name}</p>
                  <p className="text-xs text-stone-500">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
