'use client';

import { useState, useMemo } from 'react';
import { Receipt, Edit2, Trash2, Search, Filter } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, formatTaka } from '@/lib/format';
import { accents, ui } from '@/lib/ui-tokens';
import { EXPENSE_CONFIG, ExpenseType, type Expense } from './shared';

interface ExpenseTableProps {
  rows: Expense[];
  total: number;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_FILTERS: { key: 'ALL' | ExpenseType; label: string }[] = [
  { key: 'ALL', label: 'সকল (All)' },
  { key: 'SALARY', label: 'বেতন' },
  { key: 'FIBER_CABLE', label: 'ফাইবার ক্যাবল' },
  { key: 'RENT', label: 'অফিস ভাড়া' },
  { key: 'UTILITIES', label: 'বিদ্যুৎ ও বিল' },
  { key: 'EQUIPMENT', label: 'ডিভাইস' },
  { key: 'CONVEYANCE', label: 'যাতায়াত' },
  { key: 'MISC', label: 'অন্যান্য' },
];

export default function ExpenseTable({
  rows,
  total,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExpenseType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & sort rows by date descending
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        const matchesCategory = selectedCategory === 'ALL' || row.type === selectedCategory;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          row.description.toLowerCase().includes(query) ||
          (row.notes && row.notes.toLowerCase().includes(query));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rows, selectedCategory, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + row.amount, 0);
  }, [filteredRows]);

  return (
    <div className={`${ui.card} overflow-hidden space-y-4 p-5`}>
      {/* Header Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950/[0.04] pb-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-stone-500">
            <Filter size={13} /> Filter:
          </span>
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat.key
                  ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-600'
                  : 'bg-emerald-50/60 text-stone-600 hover:bg-emerald-100/60 hover:text-emerald-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            aria-label="Search expenses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${ui.input} py-1.5 pl-8 text-xs`}
            placeholder="Search description or notes..."
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No matching expenses found"
          description="Try selecting a different category or clearing your search term."
          accent="expense"
          size="compact"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.tableHeadCell}>Date</th>
                <th className={ui.tableHeadCell}>Category</th>
                <th className={ui.tableHeadCell}>Description</th>
                <th className={ui.tableHeadCell}>Notes</th>
                <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                <th className={`${ui.tableHeadCell} text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const config = EXPENSE_CONFIG[row.type];
                const accent = accents[config.accent];
                return (
                  <tr key={row.id} className={ui.tableRow}>
                    <td className={`${ui.tableCell} whitespace-nowrap`}>{formatDate(row.date)}</td>
                    <td className={ui.tableCell}>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${accent.soft} ${accent.text}`}>
                        {config.title}
                      </span>
                    </td>
                    <td className={ui.tableCell}>
                      <span className="font-semibold text-stone-900">{row.description}</span>
                    </td>
                    <td className={`${ui.tableCell} max-w-[180px]`}>
                      <span className="block truncate text-stone-500" title={row.notes || ''}>
                        {row.notes || '—'}
                      </span>
                    </td>
                    <td className={`${ui.tableCell} text-right`}>
                      <span className="font-bold tabular-nums text-stone-900">
                        {formatTaka(row.amount)}
                      </span>
                    </td>
                    <td className={`${ui.tableCell} text-center`}>
                      <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className={`${ui.buttonIcon} hover:text-emerald-700`}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className={`${ui.buttonIcon} hover:text-rose-600`}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={ui.tableFootRow}>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-stone-700">
                  {selectedCategory === 'ALL' ? 'সর্বমোট খরচ (Total Expenses)' : 'ফিল্টারকৃত মোট খরচ (Subtotal)'} ({filteredRows.length} entries)
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-emerald-900">
                  {formatTaka(filteredTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
