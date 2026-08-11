'use client';

import { useMemo, useState } from 'react';
import { Wifi, Trash2, Edit2, Search, ChevronDown } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDate, formatTaka } from '@/lib/format';
import { accents, ui } from '@/lib/ui-tokens';
import { deleteHotspotSale } from './actions';
import { PKG_CONFIG, PKG_KEYS, type PkgKey, type Sale } from './shared';

interface SalesTableProps {
  sales: Sale[];
  onEdit: (sale: Sale) => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}

export default function SalesTable({ sales, onEdit, onDeleted, onError }: SalesTableProps) {
  const [search, setSearch] = useState('');
  const [filterPkg, setFilterPkg] = useState<PkgKey | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesPackage = !filterPkg || sale.package === filterPkg;
      const matchesSearch =
        !query ||
        [sale.notes ?? '', sale.customerName ?? '', sale.customerPhone ?? ''].some((field) =>
          field.toLowerCase().includes(query),
        );
      return matchesPackage && matchesSearch;
    });
  }, [sales, filterPkg, search]);

  const filteredTotal = filtered.reduce((sum, sale) => sum + sale.amount, 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteHotspotSale(deleteTarget);
      if (result.success) {
        setDeleteTarget(null);
        onDeleted();
      } else {
        onError(result.error || 'Could not delete this sale.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={`${ui.card} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-stone-400" />
            <span className="font-semibold text-stone-900">
              {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="search"
                aria-label="Search sales"
                placeholder="Search name / phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${ui.inputBase} w-full py-2 pl-8 pr-3 sm:w-48`}
              />
            </div>
            <div className="relative">
              <select
                aria-label="Filter by package"
                value={filterPkg}
                onChange={(e) => setFilterPkg(e.target.value as PkgKey | '')}
                className={`${ui.select} appearance-none pr-8`}
              >
                <option value="">All Packages</option>
                {PKG_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PKG_CONFIG[key].label} · {formatTaka(PKG_CONFIG[key].price)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Wifi}
            title="No sales recorded"
            description={
              sales.length === 0
                ? 'Use the Quick Add buttons above to record your first sale.'
                : 'No sales match the current filter.'
            }
            accent="hotspot"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={ui.table}>
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.tableHeadCell}>Date</th>
                  <th className={ui.tableHeadCell}>Package</th>
                  <th className={ui.tableHeadCell}>Customer</th>
                  <th className={ui.tableHeadCell}>Qty</th>
                  <th className={ui.tableHeadCell}>Notes</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                  <th className={`${ui.tableHeadCell} text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const config = PKG_CONFIG[sale.package];
                  const accent = accents[config.accent];

                  return (
                    <tr key={sale.id} className={ui.tableRow}>
                      <td className={`${ui.tableCell} whitespace-nowrap font-medium text-stone-700`}>
                        {formatDate(sale.date)}
                      </td>
                      <td className={ui.tableCell}>
                        <span className={`${ui.badge} ${accent.soft} ${accent.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.bar}`} />
                          {config.label} · {formatTaka(config.price)}
                        </span>
                      </td>
                      <td className={ui.tableCell}>
                        {sale.customerName ? (
                          <div>
                            <p className="font-medium text-stone-800">{sale.customerName}</p>
                            {sale.customerPhone && (
                              <p className="text-xs text-stone-400">{sale.customerPhone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className={ui.tableCell}>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">
                          ×{sale.quantity}
                        </span>
                      </td>
                      <td className={`${ui.tableCell} max-w-[140px]`}>
                        <span className="block truncate text-stone-500" title={sale.notes || ''}>
                          {sale.notes || '—'}
                        </span>
                      </td>
                      <td className={`${ui.tableCell} text-right`}>
                        <div className="flex flex-col items-end">
                          <span className="font-bold tabular-nums text-emerald-600">
                            {formatTaka(sale.amount)}
                          </span>
                          {sale.discount ? (
                            <span className="mt-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-100">
                              −{formatTaka(sale.discount)} disc.
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${ui.tableCell} text-center`}>
                        <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => onEdit(sale)}
                            className={`${ui.buttonIcon} hover:text-emerald-700`}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sale.id)}
                            className={`${ui.buttonIcon} hover:text-rose-600`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={ui.tableFootRow}>
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-stone-600">
                    {filterPkg ? `Total for ${PKG_CONFIG[filterPkg].label}` : 'Total (filtered)'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-emerald-600">
                    {formatTaka(filteredTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this record?"
          description="This sale entry will be permanently removed."
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
