import Link from 'next/link';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { formatMoney, formatMethod, type Period, type RecentPayout } from './shared';

interface RecentPayoutsTableProps {
  recentPayouts: RecentPayout[];
  period: Period;
  onEdit?: (payout: RecentPayout) => void;
  onDelete?: (payout: RecentPayout) => void;
}

export default function RecentPayoutsTable({
  recentPayouts,
  period,
  onEdit,
  onDelete,
}: RecentPayoutsTableProps) {
  return (
    <div className={ui.card + ' overflow-hidden'}>
      <div className={ui.cardHeader}>
        <div>
          <h2 className={ui.sectionTitle}>Recent Money Given</h2>
          <p className={ui.pageSubtitle}>
            Payments given to partners — each entry deducts from the partner&apos;s balance
          </p>
        </div>
      </div>

      {recentPayouts.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-stone-400">
          No payments recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.tableHeadCell}>Date</th>
                <th className={ui.tableHeadCell}>Partner</th>
                <th className={ui.tableHeadCell}>Method</th>
                <th className={ui.tableHeadCell}>Notes / Reference</th>
                <th className={`${ui.tableHeadCell} text-right`}>Deducted Amount</th>
                {(onEdit || onDelete) && (
                  <th className={`${ui.tableHeadCell} text-right`}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
              {recentPayouts.map((payout) => (
                <tr key={payout.id} className={ui.tableRow}>
                  <td className={ui.tableCell}>{formatDate(payout.date)}</td>
                  <td className={ui.tableCell + ' font-medium text-stone-800'}>
                    <Link
                      href={`/partners/${payout.partnerId}?year=${period.year}&month=${period.month}`}
                      className="font-semibold text-stone-900 hover:text-emerald-700 hover:underline"
                    >
                      {payout.partnerName}
                    </Link>
                    {payout.isSettlement && payout.settlementYear && payout.settlementMonth && (
                      <span className="ml-2 rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-600/15">
                        {formatPeriod(payout.settlementYear, payout.settlementMonth)}
                      </span>
                    )}
                  </td>
                  <td className={ui.tableCell}>
                    <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {formatMethod(payout.method)}
                    </span>
                  </td>
                  <td className={ui.tableCell + ' text-stone-600'}>
                    {payout.notes || payout.referenceId || '-'}
                  </td>
                  <td className={`${ui.tableCell} text-right font-bold tabular-nums text-rose-700`}>
                    −{formatMoney(payout.amount)}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className={`${ui.tableCell} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(payout)}
                            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title="Edit payment"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(payout)}
                            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Delete payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
