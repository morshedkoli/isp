'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Edit2, Trash2, Percent, UserPlus, Phone, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { formatPercent } from '@/lib/format';
import { accents, statusBadge, ui } from '@/lib/ui-tokens';
import { createAgent, updateAgent, deleteAgent } from './actions';
import type { Agent } from './shared';

interface AgentsTabProps {
  agents: Agent[];
}

const emptyForm = { name: '', phone: '', commissionPercent: '', notes: '' };

export default function AgentsTab({ agents }: AgentsTabProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      phone: agent.phone ?? '',
      commissionPercent: String(agent.commissionPercent),
      notes: agent.notes ?? '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const percent = parseFloat(form.commissionPercent);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setFormError('Commission % must be between 0 and 100.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Agent name is required.');
      return;
    }

    setIsLoading(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        commissionPercent: percent,
        notes: form.notes.trim() || undefined,
      };
      const result = editing
        ? await updateAgent(editing.id, payload)
        : await createAgent(payload);

      if (result.success) {
        closeModal();
        router.refresh();
      } else {
        setFormError(result.error || 'Could not save this agent.');
      }
    } catch {
      setFormError('Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    try {
      const result = await deleteAgent(deleteTarget);
      if (result.success) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        setDeleteTarget(null);
        setPageError(result.error || 'Could not delete this agent.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    const result = await updateAgent(agent.id, { isActive: !agent.isActive });
    if (result.success) {
      router.refresh();
    } else {
      setPageError(result.error || 'Could not update this agent.');
    }
  };

  return (
    <div className="space-y-5">
      {pageError && (
        <div className={ui.errorBanner} role="alert">
          {pageError}
        </div>
      )}

      {/* Action Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-950/[0.04]">
        <div>
          <h3 className="text-sm font-bold text-stone-900">Field Agents Roster</h3>
          <p className="text-xs text-stone-500">Manage field sales agents and their individual commission percentage rates.</p>
        </div>
        <button type="button" onClick={openAdd} className={ui.buttonPrimary}>
          <UserPlus size={16} /> Add Field Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className={ui.card}>
          <EmptyState
            icon={Users}
            title="No agents registered"
            description="Add field agents and their commission rates to start allocating payouts automatically."
            accent="agent"
            action={
              <button type="button" onClick={openAdd} className={ui.buttonPrimary}>
                <Plus size={15} /> Add First Agent
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <article
              key={agent.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-950/[0.05] transition-all hover:shadow-md hover:ring-emerald-950/10 ${
                agent.isActive ? '' : 'opacity-65 bg-stone-50/50'
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${agent.isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-stone-300'}`}
              />

              <div>
                <div className="mb-3 flex items-start justify-between gap-2 pt-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${accents.agent.soft} ${accents.agent.text}`}
                    >
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-stone-900 text-base">{agent.name}</p>
                      {agent.phone ? (
                        <p className="truncate text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="text-stone-400" /> {agent.phone}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-stone-400 italic">No phone listed</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`${ui.badge} shrink-0 ${agent.isActive ? statusBadge.active : statusBadge.inactive}`}
                  >
                    {agent.isActive ? (
                      <>
                        <CheckCircle2 size={11} /> Active
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Inactive
                      </>
                    )}
                  </span>
                </div>

                <div className="my-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 p-3 ring-1 ring-emerald-900/10">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Percent size={14} />
                    </div>
                    <span className="text-xs font-semibold text-emerald-900">Commission Rate</span>
                  </div>
                  <span className="text-2xl font-black tabular-nums text-emerald-800">
                    {formatPercent(agent.commissionPercent)}
                  </span>
                </div>

                {agent.notes && (
                  <p className="mb-4 text-xs text-stone-600 flex items-start gap-1.5 bg-stone-50 p-2 rounded-lg border border-stone-100">
                    <FileText size={13} className="shrink-0 text-stone-400 mt-0.5" />
                    <span>{agent.notes}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-emerald-950/[0.04]">
                <button
                  type="button"
                  onClick={() => handleToggleActive(agent)}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                    agent.isActive
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  {agent.isActive ? 'Deactivate Agent' : 'Activate Agent'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(agent)}
                  className={`${ui.buttonIcon} p-2 hover:bg-emerald-50 hover:text-emerald-700`}
                  title="Edit agent"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(agent.id)}
                  className={`${ui.buttonIcon} p-2 hover:bg-rose-50 hover:text-rose-600`}
                  title="Delete agent"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal
          title={editing ? 'Edit Agent' : 'Add Field Agent'}
          description={editing ? 'Update agent details and commission rate' : 'Register a new field agent for payout calculations'}
          icon={UserPlus}
          accent="agent"
          error={formError}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="agent-name" className={ui.label}>
                Agent Full Name *
              </label>
              <input
                id="agent-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={ui.input}
                placeholder="e.g. Mohammad Rahim"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="agent-phone" className={ui.label}>
                  Phone Number
                </label>
                <input
                  id="agent-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={ui.input}
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="agent-percent" className={ui.label}>
                  Commission % *
                </label>
                <div className="relative">
                  <input
                    id="agent-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commissionPercent}
                    onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                    className={`${ui.input} pr-7 font-bold`}
                    placeholder="10"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="agent-notes" className={ui.label}>
                Notes <span className="font-normal text-stone-400">(optional area/territory)</span>
              </label>
              <input
                id="agent-notes"
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={ui.input}
                placeholder="e.g. Covers Kalikaccha Market Area"
              />
            </div>

            <ModalActions>
              <button type="button" onClick={closeModal} className={ui.buttonSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className={ui.buttonPrimary}>
                {isLoading ? 'Saving…' : editing ? 'Save Changes' : 'Add Agent'}
              </button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete agent?"
          description="This will permanently remove the agent from the roster. Historical entries remain preserved."
          isLoading={isLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
