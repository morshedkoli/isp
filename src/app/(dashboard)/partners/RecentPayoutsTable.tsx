import { formatPeriod } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { formatMoney, formatMethod, type Period, type RecentPayout } from './shared';

interface RecentPayoutsTableProps {
    recentPayouts: RecentPayout[];
    period: Period;
}

export default function RecentPayoutsTable({ recentPayouts, period }: RecentPayoutsTableProps) {
    const periodLabel = formatPeriod(period.year, period.month);
    return (
        <div className={ui.card + " overflow-hidden"}>
            <div className={ui.cardHeader}>
                <div>
                    <h2 className={ui.sectionTitle}>Partner Payments</h2>
                    <p className={ui.pageSubtitle}>Payouts recorded in {periodLabel}, plus settlements for that month</p>
                </div>
            </div>

            {recentPayouts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-stone-400">No partner payments for {periodLabel}.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className={ui.table}>
                        <thead className={ui.tableHead}>
                            <tr>
                                <th className={ui.tableHeadCell}>Date</th>
                                <th className={ui.tableHeadCell}>Partner</th>
                                <th className={ui.tableHeadCell}>Method</th>
                                <th className={ui.tableHeadCell}>Reference</th>
                                <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                            {recentPayouts.map((payout) => (
                                <tr key={payout.id} className={ui.tableRow}>
                                    <td className={ui.tableCell}>{new Date(payout.date).toLocaleDateString('en-GB')}</td>
                                    <td className={ui.tableCell + " font-medium text-stone-800"}>
                                        {payout.partnerName}
                                        {/* A settlement paid outside the month it settles shows up in both
                                            periods, so say which month it belongs to. */}
                                        {payout.isSettlement && payout.settlementYear && payout.settlementMonth && (
                                            <span className="ml-2 rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-600/15">
                                                Settles {formatPeriod(payout.settlementYear, payout.settlementMonth)}
                                            </span>
                                        )}
                                    </td>
                                    <td className={ui.tableCell}>{formatMethod(payout.method)}</td>
                                    <td className={ui.tableCell}>{payout.referenceId || '-'}</td>
                                    <td className={`${ui.tableCell} text-right font-bold text-emerald-700`}>
                                        {formatMoney(payout.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

