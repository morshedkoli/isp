'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cable, Receipt, Users, MoreHorizontal, TrendingDown, Building2, Zap, Cpu, Navigation, Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatTaka } from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { deleteExpense } from './actions';
import ExpenseTable from './ExpenseTable';
import ExpenseFormModal from './ExpenseFormModal';
import { EXPENSE_TYPES, type Expense, type ExpenseBuckets, type ExpenseTotals } from './shared';

interface ExpensesClientProps {
  byType: ExpenseBuckets;
  totals: ExpenseTotals;
  grandTotal: number;
  year: number;
  month: number;
}

type ModalState = { editing: Expense | null } | null;

export default function ExpensesClient({
  byType,
  totals,
  grandTotal,
  year,
  month,
}: ExpensesClientProps) {
  const router = useRouter();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const allExpenses = EXPENSE_TYPES.flatMap((type) => byType[type]);

  /**
   * An entry dated outside the month on screen is saved to *its own* month, so
   * jump there instead of refreshing a period that will not contain it — it
   * previously just vanished with no explanation.
   */
  const handleSaved = (period: { year: number; month: number }) => {
    setModal(null);
    if (period.year !== year || period.month !== month) {
      router.push(`/expenses?year=${period.year}&month=${period.month}`);
    }
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
          value={formatTaka(totals.SALARY)}
          icon={Users}
          accent="partner"
          variant="soft"
        />
        <StatCard
          label="ফাইবার ক্যাবল (Fiber Cable)"
          value={formatTaka(totals.FIBER_CABLE)}
          icon={Cable}
          accent="hotspot"
          variant="soft"
        />
        <StatCard
          label="অফিস ভাড়া (Rent)"
          value={formatTaka(totals.RENT)}
          icon={Building2}
          accent="profit"
          variant="soft"
        />
        <StatCard
          label="বিদ্যুৎ ও বিল (Utilities)"
          value={formatTaka(totals.UTILITIES)}
          icon={Zap}
          accent="loss"
          variant="soft"
        />
        <StatCard
          label="ডিভাইস (Equipment)"
          value={formatTaka(totals.EQUIPMENT)}
          icon={Cpu}
          accent="commission"
          variant="soft"
        />
        <StatCard
          label="যাতায়াত (Conveyance)"
          value={formatTaka(totals.CONVEYANCE)}
          icon={Navigation}
          accent="partner"
          variant="soft"
        />
        <StatCard
          label="অন্যান্য (Misc)"
          value={formatTaka(totals.MISC)}
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
        onEdit={(expense) => setModal({ editing: expense })}
        onDelete={setDeleteTarget}
      />

      {modal && (
        <ExpenseFormModal
          editing={modal.editing}
          year={year}
          month={month}
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
