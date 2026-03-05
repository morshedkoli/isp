'use client';

import Link from 'next/link';
import {
  Wifi, Receipt, Calculator, TrendingDown, Users,
  ArrowRight, Banknote, PieChart, ShoppingBag, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  month: string;
  monthIndex: number;
  year: number;
  companyCommission: number;
  agentPayouts: number;
  salaryTotal: number;
  miscTotal: number;
  totalExpenses: number;
  hotspotRevenue: number;
  hotspotCount: number;
  netCommission: number;
  partnerShares: { name: string; sharePercent: number; amount: number }[];
  recentHotspot: { id: string; package: string; amount: number; customerName?: string | null; date: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '৳' + Math.abs(n).toLocaleString('en-BD', { minimumFractionDigits: 0 });

const PKG_LABEL: Record<string, string> = {
  SEVEN_DAY: '7-Day (৳50)',
  THIRTY_DAY: '30-Day (৳200)',
};

const PARTNER_COLORS = [
  { bar: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
  { bar: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
  { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
  { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
];

// ─── Small components ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
          {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
        </div>
        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          <Icon size={22} className="opacity-90" />
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();

  const {
    month, monthIndex, year,
    companyCommission, agentPayouts,
    salaryTotal, miscTotal, totalExpenses,
    hotspotRevenue, hotspotCount,
    netCommission, partnerShares, recentHotspot,
  } = data;

  const totalAllocated = partnerShares.reduce((s, p) => s + p.amount, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    router.push(`/dashboard?year=${newYear}&month=${newMonth}`);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">{month} {year} overview</p>
        </div>

        {/* Metric period selector */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Calendar size={15} className="text-slate-400" />
            <select
              value={monthIndex}
              onChange={e => handlePeriodChange(year, parseInt(e.target.value))}
              className="text-sm font-medium text-slate-700 outline-none"
            >
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <select
              value={year}
              onChange={e => handlePeriodChange(parseInt(e.target.value), monthIndex)}
              className="text-sm font-medium text-slate-700 outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/expenses" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Receipt size={15} /> Add Expense
          </Link>
          <Link href="/hotspot" className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-700">
            <Wifi size={15} /> Hotspot Sale
          </Link>
          <Link href="/commissions" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700">
            <Calculator size={15} /> Commissions
          </Link>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Company Commission" value={fmt(companyCommission)}
          sub={`Agent payout: ${fmt(agentPayouts)}`}
          icon={Banknote}
          accent="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white ring-indigo-500/20"
        />
        <KpiCard
          label="Total Expenses" value={fmt(totalExpenses)}
          sub={`Salary ${fmt(salaryTotal)} · Misc ${fmt(miscTotal)}`}
          icon={Receipt}
          accent="bg-gradient-to-br from-rose-600 to-rose-500 text-white ring-rose-500/20"
        />
        <KpiCard
          label="Net (to Partners)" value={fmt(netCommission)}
          sub={netCommission >= 0 ? 'Distributable profit' : 'Net loss this month'}
          icon={PieChart}
          accent={
            netCommission >= 0
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white ring-emerald-500/20'
              : 'bg-gradient-to-br from-amber-600 to-amber-500 text-white ring-amber-500/20'
          }
        />
        <KpiCard
          label="Hotspot Sales" value={fmt(hotspotRevenue)}
          sub={`${hotspotCount} voucher${hotspotCount !== 1 ? 's' : ''} sold`}
          icon={Wifi}
          accent="bg-gradient-to-br from-sky-600 to-sky-500 text-white ring-sky-500/20"
        />
      </div>

      {/* ── Commission Breakdown + Partner Distribution ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Left: breakdown waterfall */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-2">
            <Calculator size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">Commission Breakdown</h2>
            <span className="ml-auto text-xs text-slate-400">{month} {year}</span>
          </div>

          <div className="space-y-3">
            {/* Company commission */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
              <span className="text-sm font-medium text-indigo-700">Company Commission</span>
              <span className="font-bold text-indigo-700">{fmt(companyCommission)}</span>
            </div>

            {/* Agent payouts */}
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <ArrowRight size={13} /> Agent Payouts
              </div>
              <span className="font-semibold text-amber-700">− {fmt(agentPayouts)}</span>
            </div>

            {/* Salaries */}
            <div className="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <ArrowRight size={13} /> Employee Salaries
              </div>
              <span className="font-semibold text-violet-700">− {fmt(salaryTotal)}</span>
            </div>

            {/* Misc */}
            <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <ArrowRight size={13} /> Misc. Expenses
              </div>
              <span className="font-semibold text-orange-700">− {fmt(miscTotal)}</span>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-slate-200" />

            {/* Net */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-4 ${netCommission >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <span className={`font-bold ${netCommission >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                Net Distributable
              </span>
              <span className={`text-xl font-extrabold ${netCommission >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netCommission < 0 ? '−' : ''}{fmt(netCommission)}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/commissions" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
              Go to full commission calculator <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Right: partner distribution */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            <h2 className="text-base font-semibold text-slate-900">Partner Distribution</h2>
            <span className="ml-auto text-xs text-slate-400">Based on share %</span>
          </div>

          {partnerShares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={32} className="mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">No partners added yet</p>
              <Link href="/partners" className="mt-2 text-xs font-medium text-indigo-600 hover:underline">Add partners →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {partnerShares.map((p, i) => {
                const col = PARTNER_COLORS[i % PARTNER_COLORS.length];
                const barWidth = partnerShares.length > 0 && netCommission > 0
                  ? Math.min((p.amount / netCommission) * 100, 100)
                  : p.sharePercent;
                return (
                  <div key={p.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${col.bg} text-xs font-bold ${col.text}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                        <span className={`rounded-full ${col.bg} px-2 py-0.5 text-xs font-semibold ${col.text}`}>
                          {p.sharePercent}%
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${col.text}`}>{fmt(p.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${col.bar} transition-all`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* Total allocated */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total allocated ({partnerShares.reduce((s, p) => s + p.sharePercent, 0).toFixed(1)}%)</span>
                  <span className="font-semibold text-slate-700">{fmt(totalAllocated)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Link href="/partners" className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline">
              Manage partners <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Expense Summary + Recent Hotspot ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Expense breakdown mini */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-2">
            <TrendingDown size={18} className="text-rose-500" />
            <h2 className="text-base font-semibold text-slate-900">Expenses This Month</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-violet-800">Employee Salaries</p>
              </div>
              <span className="text-lg font-bold text-violet-700">{fmt(salaryTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-orange-800">Misc. Expenses</p>
              </div>
              <span className="text-lg font-bold text-orange-700">{fmt(miscTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-4">
              <span className="font-bold text-rose-700">Grand Total</span>
              <span className="text-xl font-extrabold text-rose-700">{fmt(totalExpenses)}</span>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/expenses" className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline">
              Manage expenses <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Recent hotspot sales */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-2">
            <ShoppingBag size={18} className="text-sky-500" />
            <h2 className="text-base font-semibold text-slate-900">Recent Hotspot Sales</h2>
            <Link href="/hotspot" className="ml-auto text-xs font-medium text-sky-600 hover:underline">View all</Link>
          </div>

          {recentHotspot.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Wifi size={32} className="mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">No hotspot sales yet</p>
              <Link href="/hotspot" className="mt-2 text-xs font-medium text-sky-600 hover:underline">Record a sale →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentHotspot.map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                      <Wifi size={15} className="text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {sale.customerName || 'Walk-in'}
                      </p>
                      <p className="text-xs text-slate-400">{PKG_LABEL[sale.package] || sale.package}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{fmt(sale.amount)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
