'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Users, Calculator, Edit2, Trash2, X, Calendar,
    Check, TrendingUp, UserPlus, Percent, Wallet, ArrowRight,
    Save, RefreshCw, PieChart,
} from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { createAgent, updateAgent, deleteAgent, saveCommissionRecord } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
    id: string;
    name: string;
    phone?: string | null;
    commissionPercent: number;
    isActive: boolean;
    notes?: string | null;
}

interface AgentEntry {
    agentId: string;
    amount: number;
    agent: Agent;
}

interface CommissionSource {
    id: string;
    description: string;
    amount: number;
}

interface CommissionRecord {
    id: string;
    totalPool: number;
    ourAmount: number;
    notes?: string | null;
    agentEntries: AgentEntry[];
    sources: CommissionSource[];
}

interface Partner {
    id: string;
    sharePercent: number;
    isActive: boolean;
    user: { name: string };
}

interface Props {
    agents: Agent[];
    partners: Partner[];
    record: CommissionRecord | null;
    year: number;
    month: number;
    salaryTotal: number;
    miscTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyAgentForm = { name: '', phone: '', commissionPercent: '', notes: '' };

// ─── Color palette for partner slices ────────────────────────────────────────
const PARTNER_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-fuchsia-500', 'bg-teal-500',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommissionsClient({ agents, partners, record, year, month, salaryTotal, miscTotal }: Props) {
    const router = useRouter();

    const [tab, setTab] = useState<'calculator' | 'agents'>('calculator');

    // ── Agent modal state ─────────────────────────────────────────────────────
    const [agentModalOpen, setAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [agentForm, setAgentForm] = useState(emptyAgentForm);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentError, setAgentError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // ── Commission calculator state ───────────────────────────────────────────
    const [sources, setSources] = useState<{ id: string; description: string; amount: string }[]>(() => {
        if (record && record.sources && record.sources.length > 0) {
            return record.sources.map(s => ({ id: s.id, description: s.description, amount: s.amount.toString() }));
        }
        return [{ id: 'new-1', description: '', amount: '' }]; // Default empty source
    });

    const [agentAmounts, setAgentAmounts] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        if (record) {
            for (const e of record.agentEntries) map[e.agentId] = e.amount.toString();
        }
        return map;
    });
    const [calcNotes, setCalcNotes] = useState(record?.notes ?? '');
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcSaved, setCalcSaved] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Re-sync when period/record prop changes
    useEffect(() => {
        if (record && record.sources && record.sources.length > 0) {
            setSources(record.sources.map(s => ({ id: s.id, description: s.description, amount: s.amount.toString() })));
        } else {
            setSources([{ id: 'new-1', description: '', amount: '' }]);
        }
        setCalcNotes(record?.notes ?? '');
        const map: Record<string, string> = {};
        if (record) {
            for (const e of record.agentEntries) map[e.agentId] = e.amount.toString();
        }
        setAgentAmounts(map);
    }, [record]);

    // ── Core calculations ─────────────────────────────────────────────────────
    const pool = useMemo(() => sources.reduce((sum, src) => sum + (parseFloat(src.amount) || 0), 0), [sources]);

    const agentTotal = useMemo(() =>
        agents.filter(a => a.isActive).reduce((sum, a) =>
            sum + (parseFloat(agentAmounts[a.id] ?? '') || 0), 0),
        [agents, agentAmounts]);

    // Net = pool − agent commissions − salaries − misc expenses
    const netCommission = pool - agentTotal - salaryTotal - miscTotal;
    const totalExpenses = salaryTotal + miscTotal;

    // Partner distributions based on share%
    const activePartners = partners.filter(p => p.isActive);
    const totalSharePct = activePartners.reduce((s, p) => s + p.sharePercent, 0);
    const partnerDistributions = activePartners.map(p => ({
        ...p,
        amount: netCommission > 0 ? (netCommission * p.sharePercent) / 100 : 0,
    }));

    // Auto-calculate agent amounts from %
    const autoCalculate = () => {
        const newAmounts: Record<string, string> = {};
        for (const agent of agents.filter(a => a.isActive)) {
            newAmounts[agent.id] = ((pool * agent.commissionPercent) / 100).toFixed(2);
        }
        setAgentAmounts(newAmounts);
    };

    // ── Agent CRUD ────────────────────────────────────────────────────────────

    const openAddAgent = () => { setEditingAgent(null); setAgentForm(emptyAgentForm); setAgentError(''); setAgentModalOpen(true); };
    const openEditAgent = (a: Agent) => {
        setEditingAgent(a);
        setAgentForm({ name: a.name, phone: a.phone ?? '', commissionPercent: a.commissionPercent.toString(), notes: a.notes ?? '' });
        setAgentError(''); setAgentModalOpen(true);
    };
    const closeAgentModal = () => { setAgentModalOpen(false); setEditingAgent(null); setAgentForm(emptyAgentForm); setAgentError(''); };

    const handleAgentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pct = parseFloat(agentForm.commissionPercent);
        if (isNaN(pct) || pct < 0 || pct > 100) { setAgentError('Commission % must be 0–100.'); return; }
        setAgentLoading(true); setAgentError('');
        try {
            const payload = { name: agentForm.name.trim(), phone: agentForm.phone.trim() || undefined, commissionPercent: pct, notes: agentForm.notes.trim() || undefined };
            const result = editingAgent ? await updateAgent(editingAgent.id, payload) : await createAgent(payload);
            if (result.success) { closeAgentModal(); router.refresh(); }
            else setAgentError(result.error || 'An error occurred');
        } catch { setAgentError('Unexpected error'); }
        finally { setAgentLoading(false); }
    };

    const handleDeleteAgent = async (id: string) => {
        setAgentLoading(true);
        try {
            const result = await deleteAgent(id);
            if (result.success) { setDeleteConfirm(null); router.refresh(); }
            else alert(result.error || 'Failed to delete agent');
        } finally { setAgentLoading(false); }
    };

    const handleToggleActive = async (a: Agent) => { await updateAgent(a.id, { isActive: !a.isActive }); router.refresh(); };

    // ── Save commission ───────────────────────────────────────────────────────

    const handleSaveCommission = async () => {
        if (pool <= 0) return;
        setCalcLoading(true); setCalcSaved(false);
        try {
            const agentAmountsParsed: Record<string, number> = {};
            for (const agent of agents.filter(a => a.isActive)) {
                const val = parseFloat(agentAmounts[agent.id] ?? '');
                if (!isNaN(val) && val > 0) agentAmountsParsed[agent.id] = val;
            }
            const result = await saveCommissionRecord({
                year, month,
                sources: sources.map(s => ({ id: s.id.startsWith('new-') ? undefined : s.id, description: s.description, amount: parseFloat(s.amount) || 0 })).filter(s => s.amount > 0),
                ourAmount: 0, // Net goes to partners — no separate "our" cut
                notes: calcNotes || undefined,
                agentAmounts: agentAmountsParsed,
            });
            if (result.success) { setCalcSaved(true); setTimeout(() => setCalcSaved(false), 2500); router.refresh(); }
        } finally { setCalcLoading(false); }
    };

    const handlePeriod = (y: number, m: number) => router.push(`/commissions?year=${y}&month=${m}`);
    const activeAgents = agents.filter(a => a.isActive);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-400/30">
                        <Calculator size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
                        <p className="text-sm text-slate-500">Agent payouts &amp; partner distribution</p>
                    </div>
                </div>
                {tab === 'agents' && (
                    <button onClick={openAddAgent}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-400/25 transition hover:bg-amber-600">
                        <UserPlus size={16} /> Add Agent
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
                {([
                    { key: 'calculator', label: 'Calculator', icon: Calculator },
                    { key: 'agents', label: 'Agents', icon: Users },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Icon size={15} />{label}
                    </button>
                ))}
            </div>

            {/* ══ AGENTS TAB ═══════════════════════════════════════════════════════ */}
            {tab === 'agents' && (
                <div>
                    {agents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 shadow-sm ring-1 ring-slate-200">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                                <Users size={26} className="text-amber-400" />
                            </div>
                            <p className="font-semibold text-slate-700">No agents yet</p>
                            <p className="mt-1 text-sm text-slate-400">Add field agents and their commission rates</p>
                            <button onClick={openAddAgent}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600">
                                <Plus size={15} /> Add First Agent
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {agents.map((agent) => (
                                <div key={agent.id}
                                    className={`relative rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all hover:shadow-md ${agent.isActive ? 'ring-slate-200' : 'opacity-60 ring-slate-200'}`}>
                                    <div className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl ${agent.isActive ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                    <div className="pt-1">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                                                    {agent.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{agent.name}</p>
                                                    {agent.phone && <p className="text-xs text-slate-400">{agent.phone}</p>}
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agent.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {agent.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
                                            <Percent size={16} className="text-amber-500" />
                                            <span className="text-sm text-amber-700">Commission rate</span>
                                            <span className="ml-auto text-xl font-bold text-amber-700">{agent.commissionPercent}%</span>
                                        </div>
                                        {agent.notes && <p className="mb-3 text-xs text-slate-400 italic">{agent.notes}</p>}
                                        <div className="flex gap-2">
                                            <button onClick={() => handleToggleActive(agent)}
                                                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${agent.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                {agent.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => openEditAgent(agent)} className="rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50" title="Edit"><Edit2 size={14} /></button>
                                            <button onClick={() => setDeleteConfirm(agent.id)} className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ CALCULATOR TAB ════════════════════════════════════════════════════ */}
            {tab === 'calculator' && (
                <div className="space-y-5">
                    {/* Period selector */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <Calendar size={15} className="text-slate-400" />
                            <select value={month} onChange={e => handlePeriod(year, parseInt(e.target.value))} className="text-sm font-medium text-slate-700 outline-none">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <select value={year} onChange={e => handlePeriod(parseInt(e.target.value), month)} className="text-sm font-medium text-slate-700 outline-none">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        {record && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <Check size={13} /> Saved record
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        {/* ── Left: Inputs (3/5) ─────────────────────────────────── */}
                        <div className="space-y-4 lg:col-span-3">

                            {/* Commission Sources */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Commission Received Details
                                </label>
                                <p className="mb-3 text-xs text-slate-400">Breakdown of commission received from the ISP company</p>
                                <div className="space-y-3">
                                    {sources.map((src, idx) => (
                                        <div key={src.id} className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={src.description}
                                                onChange={e => setSources(prev => prev.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
                                                placeholder="e.g., Target Bonus"
                                            />
                                            <div className="relative w-40 shrink-0">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={src.amount}
                                                    onChange={e => setSources(prev => prev.map((s, i) => i === idx ? { ...s, amount: e.target.value } : s))}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            {sources.length > 1 && (
                                                <button onClick={() => setSources(prev => prev.filter((_, i) => i !== idx))}
                                                    className="shrink-0 p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setSources(prev => [...prev, { id: `new-${Date.now()}`, description: '', amount: '' }])}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition"
                                >
                                    <Plus size={14} /> Add Source
                                </button>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-500">Total Pool this month:</span>
                                    <span className="font-bold text-xl text-slate-800">৳{pool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Agent Commissions */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Agent Commissions (Pay Out)
                                        </label>
                                        <p className="mt-0.5 text-xs text-slate-400">Amount paid to each agent</p>
                                    </div>
                                    {activeAgents.length > 0 && pool > 0 && (
                                        <button type="button" onClick={autoCalculate}
                                            className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                                            title="Auto-fill from each agent's commission %">
                                            <RefreshCw size={12} /> Auto from %
                                        </button>
                                    )}
                                </div>

                                {activeAgents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
                                        <Users size={22} className="mb-2 text-slate-300" />
                                        <p className="text-sm text-slate-400">No active agents</p>
                                        <button onClick={() => setTab('agents')} className="mt-2 text-xs text-amber-600 hover:underline">Add agents →</button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeAgents.map((agent) => {
                                            const val = agentAmounts[agent.id] ?? '';
                                            const suggested = pool > 0 ? ((pool * agent.commissionPercent) / 100).toFixed(2) : null;
                                            return (
                                                <div key={agent.id} className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                                        {agent.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{agent.name}</p>
                                                        <p className="text-xs text-slate-400">{agent.commissionPercent}%
                                                            {suggested && <span className="ml-1 text-amber-500">≈ ৳{suggested}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="relative w-32">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                                                        <input
                                                            type="number" min="0" step="0.01" value={val}
                                                            onChange={e => setAgentAmounts({ ...agentAmounts, [agent.id]: e.target.value })}
                                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                <label className={ui.label}>Notes <span className="font-normal text-slate-400">(optional)</span></label>
                                <textarea value={calcNotes} onChange={e => setCalcNotes(e.target.value)} className={ui.input}
                                    placeholder="Any notes for this month's commission…" rows={2} />
                            </div>

                            {/* Save */}
                            <button onClick={handleSaveCommission} disabled={calcLoading || pool <= 0}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${calcSaved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-400/25 hover:bg-amber-600 disabled:opacity-50'}`}>
                                {calcSaved ? <><Check size={16} /> Saved!</> : calcLoading ? <><Save size={16} /> Saving…</> : <><Save size={16} /> Save Commission Record</>}
                            </button>
                        </div>

                        {/* ── Right: Summary (2/5) ───────────────────────────────── */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-24 space-y-4">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {MONTHS[month - 1]} {year} Summary
                                </h2>

                                {/* Breakdown */}
                                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-500"><Wallet size={15} /> Company Commission</div>
                                        <span className="font-bold text-slate-800">৳{pool.toLocaleString()}</span>
                                    </div>
                                    {activeAgents.map(agent => {
                                        const amt = parseFloat(agentAmounts[agent.id] ?? '') || 0;
                                        if (amt <= 0) return null;
                                        return (
                                            <div key={agent.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-amber-600">
                                                    <ArrowRight size={13} />
                                                    <span className="truncate max-w-[120px]">{agent.name}</span>
                                                </div>
                                                <span className="font-semibold text-amber-600">− ৳{amt.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    {agentTotal > 0 && (
                                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs text-slate-400">
                                            <span>Total agent payouts</span>
                                            <span>৳{agentTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {salaryTotal > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-violet-600">
                                                <ArrowRight size={13} /> Employee Salaries
                                            </div>
                                            <span className="font-semibold text-violet-600">− ৳{salaryTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {miscTotal > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-orange-500">
                                                <ArrowRight size={13} /> Misc. Expenses
                                            </div>
                                            <span className="font-semibold text-orange-500">− ৳{miscTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {totalExpenses > 0 && (
                                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs text-slate-400">
                                            <span>Total expenses</span>
                                            <span>৳{totalExpenses.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Net Commission */}
                                <div className={`rounded-2xl p-5 text-center shadow-lg ${netCommission >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-rose-700'}`}>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Net Distributable</p>
                                    <p className="mt-2 text-4xl font-black text-white">৳{Math.abs(netCommission).toLocaleString()}</p>
                                    {netCommission < 0 && <p className="mt-1 text-xs text-rose-200">Deficit — agent payouts exceed pool</p>}
                                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-white/60">
                                        <TrendingUp size={12} /> {MONTHS[month - 1]} {year}
                                    </div>
                                </div>

                                {/* Partner Distribution */}
                                {activePartners.length > 0 && netCommission > 0 && (
                                    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <PieChart size={13} /> Partner Distribution
                                            </p>
                                            {totalSharePct !== 100 && (
                                                <span className="text-xs text-amber-500">{totalSharePct.toFixed(0)}% allocated</span>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {partnerDistributions.map((p, idx) => (
                                                <div key={p.id}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2.5 w-2.5 rounded-full ${PARTNER_COLORS[idx % PARTNER_COLORS.length]}`} />
                                                            <span className="text-sm font-medium text-slate-700">{p.user.name}</span>
                                                            <span className="text-xs text-slate-400">{p.sharePercent}%</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-indigo-700">
                                                            ৳{p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className={`h-full rounded-full ${PARTNER_COLORS[idx % PARTNER_COLORS.length]}`}
                                                            style={{ width: `${p.sharePercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {totalSharePct < 100 && (
                                            <p className="mt-3 text-xs text-slate-400">
                                                Unallocated: ৳{(netCommission * (100 - totalSharePct) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({(100 - totalSharePct).toFixed(0)}%)
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activePartners.length === 0 && (
                                    <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                                        <p className="text-xs text-slate-400">No active partners yet.</p>
                                        <a href="/partners" className="mt-1 block text-xs text-indigo-600 hover:underline">Manage partners →</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Agent Modal ─────────────────────────────────────────────────────── */}
            {agentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAgentModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{editingAgent ? 'Edit Agent' : 'Add Agent'}</h2>
                                <p className="text-sm text-slate-500">{editingAgent ? 'Update details' : 'Add a field agent with commission rate'}</p>
                            </div>
                            <button onClick={closeAgentModal} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"><X size={18} /></button>
                        </div>
                        {agentError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{agentError}</div>}
                        <form onSubmit={handleAgentSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>Agent Name *</label>
                                <input type="text" value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })}
                                    className={ui.input} placeholder="e.g. Rahim" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={ui.label}>Phone</label>
                                    <input type="text" value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })}
                                        className={ui.input} placeholder="01XXXXXXXXX" />
                                </div>
                                <div>
                                    <label className={ui.label}>Commission % *</label>
                                    <div className="relative">
                                        <input type="number" min="0" max="100" step="0.01" value={agentForm.commissionPercent}
                                            onChange={e => setAgentForm({ ...agentForm, commissionPercent: e.target.value })}
                                            className={`${ui.input} pr-7`} placeholder="10" required />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={ui.label}>Notes <span className="font-normal text-slate-400">(optional)</span></label>
                                <input type="text" value={agentForm.notes} onChange={e => setAgentForm({ ...agentForm, notes: e.target.value })}
                                    className={ui.input} placeholder="e.g. Area: Mirpur" />
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button type="button" onClick={closeAgentModal} className={ui.buttonSecondary}>Cancel</button>
                                <button type="submit" disabled={agentLoading}
                                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60">
                                    {agentLoading ? (editingAgent ? 'Saving…' : 'Adding…') : (editingAgent ? 'Save Changes' : 'Add Agent')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100"><Trash2 size={22} className="text-rose-600" /></div>
                        <h3 className="text-lg font-bold text-slate-900">Delete agent?</h3>
                        <p className="mt-1 text-sm text-slate-500">This will permanently remove the agent.</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className={`flex-1 ${ui.buttonSecondary}`}>Cancel</button>
                            <button onClick={() => handleDeleteAgent(deleteConfirm)} disabled={agentLoading} className={`flex-1 ${ui.buttonDanger}`}>
                                {agentLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
