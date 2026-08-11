'use client';

import { useState } from 'react';
import { Calculator, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PeriodSelector from '@/components/ui/PeriodSelector';
import { formatPeriod, type Period } from '@/lib/period';
import AgentsTab from './AgentsTab';
import CalculatorTab from './CalculatorTab';
import type { Agent, CommissionRecord, Partner } from './shared';

interface CommissionsClientProps {
  agents: Agent[];
  partners: Partner[];
  record: CommissionRecord | null;
  year: number;
  month: number;
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal: number;
  utilitiesTotal: number;
  equipmentTotal: number;
  conveyanceTotal: number;
  miscTotal: number;
  availablePeriods: Period[];
}

const TABS = [
  { key: 'calculator', label: 'Commission Calculator', icon: Calculator },
  { key: 'agents', label: 'Field Agents', icon: Users },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function CommissionsClient({
  agents,
  partners,
  record,
  year,
  month,
  salaryTotal,
  fiberCableTotal,
  rentTotal,
  utilitiesTotal,
  equipmentTotal,
  conveyanceTotal,
  miscTotal,
  availablePeriods,
}: CommissionsClientProps) {
  const [tab, setTab] = useState<TabKey>('calculator');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        subtitle={`Agent payouts & partner distribution · ${formatPeriod(year, month)}`}
        icon={Calculator}
        accent="agent"
        toolbar={
          <div
            role="tablist"
            aria-label="Commissions view"
            className="flex items-center gap-1 rounded-xl bg-emerald-950/[0.04] p-1 ring-1 ring-emerald-950/[0.04]"
          >
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  tab === key
                    ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-900/5'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'agents' ? (
        <AgentsTab agents={agents} />
      ) : (
        <CalculatorTab
          agents={agents}
          partners={partners}
          record={record}
          year={year}
          month={month}
          salaryTotal={salaryTotal}
          fiberCableTotal={fiberCableTotal}
          rentTotal={rentTotal}
          utilitiesTotal={utilitiesTotal}
          equipmentTotal={equipmentTotal}
          conveyanceTotal={conveyanceTotal}
          miscTotal={miscTotal}
          onGoToAgents={() => setTab('agents')}
        />
      )}
    </div>
  );
}
