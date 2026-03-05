import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [plans, settings] = await Promise.all([
    prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' } }),
    prisma.setting.findMany({ orderBy: { key: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Plans and system configuration</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Plans</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{plan.name} ({plan.speedLabel})</p>
              <p className="text-slate-600">Price: {plan.monthlyPrice}</p>
              <p className={plan.isActive ? 'text-emerald-600' : 'text-rose-600'}>
                Status: {plan.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">System Settings</h2>
        <div className="space-y-2 text-sm">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-700">{setting.key}</span>
              <span className="text-slate-500">{setting.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
