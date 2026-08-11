'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Check, Save, RefreshCw, X, Edit2, Receipt, DollarSign, Sparkles, Building2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { formatTaka } from '@/lib/format';
import { accents, ui } from '@/lib/ui-tokens';
import { saveCommissionRecord } from './actions';
import CalculatorSummary from './CalculatorSummary';
import type { Agent, CommissionRecord, Partner } from './shared';

interface SourceRow {
  id: string;
  description: string;
  amount: string;
}

interface CalculatorTabProps {
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
  onGoToAgents: () => void;
}

const blankSource = (): SourceRow => ({ id: `new-${Date.now()}`, description: '', amount: '' });

function sourcesFromRecord(record: CommissionRecord | null): SourceRow[] {
  if (record?.sources?.length) {
    return record.sources.map((source) => ({
      id: source.id,
      description: source.description,
      amount: String(source.amount),
    }));
  }
  return [{ id: 'new-1', description: 'Primary ISP Commission', amount: '' }];
}

function agentAmountsFromRecord(record: CommissionRecord | null): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of record?.agentEntries ?? []) {
    map[entry.agentId] = String(entry.amount);
  }
  return map;
}

export default function CalculatorTab({
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
  onGoToAgents,
}: CalculatorTabProps) {
  const router = useRouter();

  const [sources, setSources] = useState<SourceRow[]>(() => sourcesFromRecord(record));
  const [agentBaseAmounts, setAgentBaseAmounts] = useState<Record<string, string>>({});
  const [agentAmounts, setAgentAmounts] = useState<Record<string, string>>(() =>
    agentAmountsFromRecord(record),
  );
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSources(sourcesFromRecord(record));
    setAgentAmounts(agentAmountsFromRecord(record));
    setNotes(record?.notes ?? '');
    setError('');
  }, [record]);

  const activeAgents = useMemo(() => agents.filter((agent) => agent.isActive), [agents]);
  const activePartners = useMemo(() => partners.filter((partner) => partner.isActive), [partners]);

  const pool = useMemo(
    () => sources.reduce((sum, source) => sum + (parseFloat(source.amount) || 0), 0),
    [sources],
  );
  const agentTotal = useMemo(
    () => activeAgents.reduce((sum, agent) => sum + (parseFloat(agentAmounts[agent.id] ?? '') || 0), 0),
    [activeAgents, agentAmounts],
  );

  const totalExpenses =
    salaryTotal + fiberCableTotal + rentTotal + utilitiesTotal + equipmentTotal + conveyanceTotal + miscTotal;
  const netCommission = pool - agentTotal - totalExpenses;

  const handleBaseAmountChange = (agentId: string, val: string, percent: number) => {
    setAgentBaseAmounts((prev) => ({ ...prev, [agentId]: val }));
    const base = parseFloat(val);
    if (!Number.isNaN(base) && base > 0) {
      const multiplier = percent || 42;
      const actual = ((base / 49) * multiplier).toFixed(2);
      setAgentAmounts((prev) => ({ ...prev, [agentId]: actual }));
    } else if (val === '') {
      setAgentAmounts((prev) => ({ ...prev, [agentId]: '' }));
    }
  };

  const autoCalculate = () => {
    const nextBase: Record<string, string> = {};
    const nextActual: Record<string, string> = {};
    for (const agent of activeAgents) {
      nextBase[agent.id] = pool > 0 ? pool.toString() : '';
      const multiplier = agent.commissionPercent || 42;
      nextActual[agent.id] = pool > 0 ? ((pool / 49) * multiplier).toFixed(2) : '';
    }
    setAgentBaseAmounts(nextBase);
    setAgentAmounts(nextActual);
  };

  const updateSource = (index: number, patch: Partial<SourceRow>) => {
    setSources((prev) => prev.map((source, i) => (i === index ? { ...source, ...patch } : source)));
  };

  const handleSave = async () => {
    if (pool <= 0) {
      setError('Please enter a valid ISP commission amount greater than ৳0 before saving.');
      return;
    }

    setIsSaving(true);
    setJustSaved(false);
    setError('');
    try {
      const parsedAgentAmounts: Record<string, number> = {};
      for (const agent of activeAgents) {
        const value = parseFloat(agentAmounts[agent.id] ?? '');
        if (!Number.isNaN(value) && value > 0) parsedAgentAmounts[agent.id] = value;
      }

      const formattedSources = sources
        .map((source, idx) => ({
          id: source.id.startsWith('new-') ? undefined : source.id,
          description: source.description.trim() || `ISP Commission Source #${idx + 1}`,
          amount: parseFloat(source.amount) || 0,
        }))
        .filter((source) => source.amount > 0);

      const result = await saveCommissionRecord({
        year,
        month,
        sources: formattedSources,
        ourAmount: 0,
        notes: notes.trim() || undefined,
        agentAmounts: parsedAgentAmounts,
      });

      if (result.success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
        router.refresh();
      } else {
        setError(result.error || 'Could not save this commission record.');
      }
    } catch {
      setError('An unexpected error occurred while saving the commission record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Saved Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-950/[0.04]">
        <div className="flex items-center gap-2.5">
          {record ? (
            <>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">Saved Record Loaded</p>
                <p className="text-xs text-stone-500">Record for this period is loaded from the database.</p>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Sparkles size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">New Calculation Period</p>
                <p className="text-xs text-stone-500">Enter ISP pool and agent commissions below.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className={ui.errorBanner} role="alert">
          {error}
        </div>
      )}

      {/* Top 4 KPI Metrics Banner */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-950/[0.04]">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
            <Building2 size={15} className="text-emerald-600" /> ISP Pool Received
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {formatTaka(pool)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-950/[0.04]">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
            <Users size={15} className="text-teal-600" /> Field Agent Payouts
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-teal-800">
            {formatTaka(agentTotal)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-950/[0.04]">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
            <Receipt size={15} className="text-rose-600" /> Total Expenses
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
            {formatTaka(totalExpenses)}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 shadow-sm text-white">
          <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
            <DollarSign size={15} className="text-emerald-200" /> Net Distributable
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {formatTaka(netCommission)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Main Inputs Area */}
        <div className="space-y-5 lg:col-span-3">
          {/* Commission from ISP */}
          <SectionCard title="Commission from ISP" icon={Building2} accent="agent">
            <p className="mb-4 text-xs text-stone-500">
              Record all commission payments received from upstream internet service providers.
            </p>

            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={source.id} className="flex items-center gap-3">
                  <input
                    type="text"
                    aria-label={`Source ${index + 1} description`}
                    value={source.description}
                    onChange={(e) => updateSource(index, { description: e.target.value })}
                    className={ui.input}
                    placeholder="e.g. Primary ISP Monthly Commission"
                  />
                  <div className="relative w-44 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={`Source ${index + 1} amount`}
                      value={source.amount}
                      onChange={(e) => updateSource(index, { amount: e.target.value })}
                      className={`${ui.input} pl-8 font-bold`}
                      placeholder="0.00"
                    />
                  </div>
                  {sources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSources((prev) => prev.filter((_, i) => i !== index))}
                      className={`${ui.buttonIcon} shrink-0 hover:text-rose-600`}
                      title="Remove source"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSources((prev) => [...prev, blankSource()])}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/60"
            >
              <Plus size={14} /> Add Additional Source
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-emerald-900/5 pt-4 text-sm">
              <span className="font-semibold text-stone-600">Total ISP Pool Received</span>
              <span className="text-xl font-bold tabular-nums text-stone-900">
                {formatTaka(pool, { decimals: true })}
              </span>
            </div>
          </SectionCard>

          {/* Agent Commissions */}
          <SectionCard
            title="Agent Commissions"
            icon={Users}
            accent="agent"
            aside={
              activeAgents.length > 0 && pool > 0 ? (
                <button
                  type="button"
                  onClick={autoCalculate}
                  className={ui.buttonSecondarySm}
                  title="Auto-fill using (Pool / 49) * Agent %"
                >
                  <RefreshCw size={12} /> Auto ((Pool/49) × %)
                </button>
              ) : null
            }
          >
            {activeAgents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No active agents"
                description="Add field agents and set their commission rates first."
                accent="agent"
                size="compact"
                action={
                  <button type="button" onClick={onGoToAgents} className={ui.buttonSecondarySm}>
                    Add agents
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {activeAgents.map((agent) => {
                  const suggested = pool > 0 ? (pool / 49) * (agent.commissionPercent || 42) : null;

                  return (
                    <div key={agent.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl border border-emerald-950/[0.04] bg-emerald-50/20 p-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accents.agent.soft} ${accents.agent.text}`}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">{agent.name}</p>
                          <p className="text-xs text-stone-500">
                            Rate: <span className="font-semibold">{agent.commissionPercent}%</span>
                            {suggested !== null && (
                              <span className="ml-1 text-amber-600 font-medium hidden sm:inline">
                                (≈ {formatTaka(suggested)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <div className="space-y-1 flex-1 sm:flex-initial">
                          <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                            Main Amount
                          </label>
                          <div className="relative w-full sm:w-28">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`${agent.name} main amount`}
                              value={agentBaseAmounts[agent.id] ?? ''}
                              onChange={(e) => handleBaseAmountChange(agent.id, e.target.value, agent.commissionPercent)}
                              className={`${ui.input} py-1.5 pl-6 pr-2 text-xs font-bold text-stone-900`}
                              placeholder="Main Amt"
                            />
                          </div>
                        </div>

                        <span className="text-xs text-stone-400 font-bold self-end pb-2 hidden sm:inline">→</span>

                        <div className="space-y-1 flex-1 sm:flex-initial">
                          <label className="block text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                            Actual Commission
                          </label>
                          <div className="relative w-full sm:w-32">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`${agent.name} actual commission amount`}
                              value={agentAmounts[agent.id] ?? ''}
                              onChange={(e) =>
                                setAgentAmounts({ ...agentAmounts, [agent.id]: e.target.value })
                              }
                              className={`${ui.input} py-1.5 pl-6 pr-2 text-xs font-bold text-emerald-900 bg-emerald-50/50 border-emerald-300/70 focus:border-emerald-500`}
                              placeholder="Actual Com."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Record Notes" icon={Save} accent="neutral">
            <textarea
              aria-label="Commission notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={ui.input}
              placeholder="Record any additional notes, invoice numbers, or adjustments for this month..."
              rows={2}
            />
          </SectionCard>

          {/* Save Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3.5 ${justSaved ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-md' : ui.buttonPrimary}`}
          >
            {justSaved ? (
              <>
                <Check size={18} /> Record Saved Successfully!
              </>
            ) : isSaving ? (
              <>
                <Save size={18} /> Saving Commission Record…
              </>
            ) : (
              <>
                <Save size={18} /> Save & Calculate Settlement
              </>
            )}
          </button>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-2">
          <CalculatorSummary
            year={year}
            month={month}
            pool={pool}
            activeAgents={activeAgents}
            agentAmounts={agentAmounts}
            agentTotal={agentTotal}
            salaryTotal={salaryTotal}
            fiberCableTotal={fiberCableTotal}
            rentTotal={rentTotal}
            utilitiesTotal={utilitiesTotal}
            equipmentTotal={equipmentTotal}
            conveyanceTotal={conveyanceTotal}
            miscTotal={miscTotal}
            totalExpenses={totalExpenses}
            netCommission={netCommission}
            activePartners={activePartners}
          />
        </div>
      </div>
    </div>
  );
}
