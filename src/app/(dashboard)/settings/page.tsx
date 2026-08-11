import { prisma } from '@/lib/prisma';
import PageHeader from '@/components/ui/PageHeader';
import { Settings, ShieldCheck, Layers, MapPin, Building2 } from 'lucide-react';
import { ui } from '@/lib/ui-tokens';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [plans, settings] = await Promise.all([
    prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' } }),
    prisma.setting.findMany({ orderBy: { key: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="GrameenWifi system configuration & organization profile"
        icon={Settings}
        accent="commission"
      />

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <Building2 size={18} className="text-emerald-600" />
          <h2 className={ui.sectionTitle}>Company Information</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className={`${ui.cardSoft} p-4`}>
            <p className={ui.eyebrow}>Application Name</p>
            <p className="mt-1 text-lg font-bold text-stone-900">GrameenWifi</p>
          </div>
          <div className={`${ui.cardSoft} p-4`}>
            <p className={ui.eyebrow}>Network Location / Address</p>
            <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-800">
              <MapPin size={15} className="text-emerald-600 shrink-0" />
              <span>Kalikaccha, Sarail, Brahmanbaria</span>
            </div>
          </div>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <Layers size={18} className="text-emerald-600" />
          <h2 className={ui.sectionTitle}>Hotspot & Bandwidth Plans</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
            {plans.map((plan) => (
              <div key={plan.id} className={`${ui.cardSoft} p-4 transition-all hover:border-emerald-600/30`}>
                <p className="font-semibold text-stone-900">{plan.name} ({plan.speedLabel})</p>
                <p className="mt-1 text-stone-600 font-medium">Price: {plan.monthlyPrice} BDT</p>
                <p className={`mt-1.5 text-xs font-semibold ${plan.isActive ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Status: {plan.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <ShieldCheck size={18} className="text-emerald-600" />
          <h2 className={ui.sectionTitle}>System Configurations</h2>
        </div>
        <div className="p-5 space-y-2 text-sm">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between rounded-xl bg-emerald-50/40 border border-emerald-900/[0.04] px-4 py-2.5">
              <span className="font-semibold text-stone-700">{setting.key}</span>
              <span className="text-stone-600 font-mono text-xs bg-white px-2.5 py-1 rounded-md border border-emerald-900/10">{setting.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

