'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cable, Receipt, Users, MoreHorizontal, TrendingDown, Building2, Zap, Cpu, Navigation, Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PeriodSelector from '@/components/ui/PeriodSelector';
import StatCard from '@/components/ui/StatCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatTaka } from '@/lib/format';
import { formatPeriod, type Period } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { deleteExpense } from './actions';
import ExpenseTable from './ExpenseTable';
import ExpenseFormModal from './ExpenseFormModal';
import type { Expense, ExpenseType } from './shared';

interface ExpensesClientProps {
  salaries: Expense[];
  fiberCable: Expense[];
  rent: Expense[];
  utilities: Expense[];
  equipment: Expense[];
  conveyance: Expense[];
  misc: Expense[];
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal: number;
  utilitiesTotal: number;
  equipmentTotal: number;
  conveyanceTotal: number;
  miscTotal: number;
  grandTotal: number;
  year: number;
  month: number;
  availablePeriods: Period[];
}

type ModalState = { editing: Expense | null } | null;

export default function ExpensesClient({
  salaries,
  fiberCable,
  rent,
  utilities,
  equipment,
  conveyance,
  misc,
  salaryTotal,
  fiberCableTotal,
  rentTotal,
  utilitiesTotal,
  equipmentTotal,
  conveyanceTotal,
  miscTotal,
  grandTotal,
  year,
  month,
  availablePeriods,
}: ExpensesClientProps) {
  const router = useRouter();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const allExpenses = [
    ...salaries,
    ...fiberCable,
    ...rent,
    ...utilities,
    ...equipment,
    ...conveyance,
    ...misc,
  ];

  const handleSaved = () => {
    setModal(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteExpense(deleteTarget);
      if (result.success) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="খরচের হিসাব (Expenses)"
        subtitle={`ক্যাটাগরি অনুযায়ী ব্যবসায়িক খরচ · ${formatPeriod(year, month)}`}
        icon={Receipt}
        accent="expense"
        toolbar={
          <button
            type="button"
            onClick={() => setModal({ editing: null })}
            className={ui.buttonPrimary}
          >
            <Plus size={16} /> Add Expense
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="বেতন (Salaries)"
          value={formatTaka(salaryTotal)}
          icon={Users}
          accent="partner"
          variant="soft"
        />
        <StatCard
          label="ফাইবার ক্যাবল (Fiber Cable)"
          value={formatTaka(fiberCableTotal)}
          icon={Cable}
          accent="hotspot"
          variant="soft"
        />
        <StatCard
          label="অফিস ভাড়া (Rent)"
          value={formatTaka(rentTotal)}
          icon={Building2}
          accent="profit"
          variant="soft"
        />
        <StatCard
          label="বিদ্যুৎ ও বিল (Utilities)"
          value={formatTaka(utilitiesTotal)}
          icon={Zap}
          accent="loss"
          variant="soft"
        />
        <StatCard
          label="ডিভাইস (Equipment)"
          value={formatTaka(equipmentTotal)}
          icon={Cpu}
          accent="commission"
          variant="soft"
        />
        <StatCard
          label="যাতায়াত (Conveyance)"
          value={formatTaka(conveyanceTotal)}
          icon={Navigation}
          accent="partner"
          variant="soft"
        />
        <StatCard
          label="অন্যান্য (Misc)"
          value={formatTaka(miscTotal)}
          icon={MoreHorizontal}
          accent="agent"
          variant="soft"
        />
        <div>
          <StatCard
            label="সর্বমোট খরচ (Total Expenses)"
            value={formatTaka(grandTotal)}
            icon={TrendingDown}
            accent="expense"
            variant="solid"
          />
        </div>
      </div>

      <ExpenseTable
        rows={allExpenses}
        total={grandTotal}
        onEdit={(expense) => setModal({ editing: expense })}
        onDelete={setDeleteTarget}
      />

      {modal && (
        <ExpenseFormModal
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this entry?"
          description="This expense will be permanently removed."
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
