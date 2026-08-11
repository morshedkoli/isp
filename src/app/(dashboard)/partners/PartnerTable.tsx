import { Plus, UserCheck, Edit2, CheckCircle, XCircle, Phone, PieChart } from 'lucide-react';
import type { Partner } from './shared';

interface PartnerTableProps {
    partners: Partner[];
    activePartners: Partner[];
    totalShare: number;
    recentPayoutCount: number;
    onAdd: () => void;
    onEdit: (partner: Partner) => void;
    onToggleActive: (partner: Partner) => void;
}

export default function PartnerTable({
    partners,
    activePartners,
    totalShare,
    recentPayoutCount,
    onAdd,
    onEdit,
    onToggleActive,
}: PartnerTableProps) {
    const showHeaderStats = partners.length > 0;
    return (
        <>
            {showHeaderStats && (
                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Total Partners</p>
                        <p className="mt-1 text-2xl font-bold text-stone-900">{partners.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Active Partners</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">{activePartners.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Total Share Allocated</p>
                        <p className={`mt-1 text-2xl font-bold ${totalShare > 100 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {totalShare.toFixed(1)}%
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Recent Payouts</p>
                        <p className="mt-1 text-2xl font-bold text-stone-900">{recentPayoutCount}</p>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
                {partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 rounded-full bg-emerald-50 p-5 ring-1 ring-emerald-200/50">
                            <UserCheck className="h-8 w-8 text-emerald-600" />
                        </div>
                        <p className="text-lg font-semibold text-stone-800">No partners yet</p>
                        <p className="mt-1 text-sm text-stone-400">Add partners to track profit sharing</p>
                        <button
                            onClick={onAdd}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-teal-700"
                        >
                            <Plus size={16} />
                            Add First Partner
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-emerald-900/[0.04]">
                            <thead className="bg-emerald-50/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Partner</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Contact</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Share %</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Status</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                                {partners.map((partner) => (
                                    <tr key={partner.id} className="group transition-colors hover:bg-emerald-50/30">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 font-bold text-white shadow-sm">
                                                    {(partner.user?.name || 'P').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-semibold text-stone-900">{partner.user?.name ?? 'Partner'}</div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {partner.user?.phone ? (
                                                <div className="flex items-center gap-1.5 text-sm text-stone-600">
                                                    <Phone size={13} className="text-stone-400" />
                                                    {partner.user.phone}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-stone-400">-</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200/60">
                                                <PieChart size={13} className="text-emerald-600" />
                                                {partner.sharePercent}%
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${partner.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'}`}>
                                                {partner.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                                {partner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => onEdit(partner)}
                                                    className="rounded-lg p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50"
                                                    title="Edit partner"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => onToggleActive(partner)}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${partner.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                                                    title={partner.isActive ? 'Deactivate partner' : 'Activate partner'}
                                                >
                                                    {partner.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
