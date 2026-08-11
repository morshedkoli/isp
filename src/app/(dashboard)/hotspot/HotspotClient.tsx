'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wifi, TrendingUp, Banknote } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PeriodSelector from '@/components/ui/PeriodSelector';
import { formatTaka } from '@/lib/format';
import { formatPeriod, type Period } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import QuickAddCards from './QuickAddCards';
import SalesTable from './SalesTable';
import SaleFormModal from './SaleFormModal';
import type { Sale, Summary } from './shared';

interface HotspotClientProps {
  sales: Sale[];
  summary: Summary;
  year: number;
  month: number;
  availablePeriods: Period[];
}

export default function HotspotClient({
  sales,
  summary,
  year,
  month,
  availablePeriods,
}: HotspotClientProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const totalPasses = summary.sevenDay.count + summary.thirtyDay.count;

  const openAdd = () => {
    setEditingSale(null);
    setIsModalOpen(true);
  };

  const openEdit = (sale: Sale) => {
    setEditingSale(sale);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSale(null);
  };

  const handleSaved = () => {
    closeModal();
    setError(undefined);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotspot Sales"
        subtitle={`Cash voucher tracker · ${formatPeriod(year, month)}`}
        icon={Wifi}
        accent="hotspot"
        actions={
          <button type="button" onClick={openAdd} className={ui.buttonPrimary}>
            <Plus size={16} /> Record Sale
          </button>
        }
      />

      {error && (
        <div className={ui.errorBanner} role="alert">
          {error}
        </div>
      )}

      <QuickAddCards
        summary={summary}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onAdded={() => {
          setError(undefined);
          router.refresh();
        }}
        onError={setError}
      />

      {/* Revenue banner — the one deliberately loud element on the page. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-gradient-to-r from-sky-600 to-violet-600 px-6 py-4 shadow-[0_12px_32px_-16px_rgba(2,132,199,0.7)]">
        <div className="flex items-center gap-2">
          <Banknote size={20} className="text-white/80" />
          <span className="text-sm font-medium text-white/80">Total Revenue</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-white">
          {formatTaka(summary.totalRevenue)}
        </span>
        <span className="ml-auto text-sm text-white/60">{formatPeriod(year, month)}</span>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={16} className="text-white/70" />
          <span className="text-sm font-semibold text-white">
            {totalPasses} {totalPasses === 1 ? 'pass' : 'passes'} sold
          </span>
        </div>
      </div>

      <SalesTable
        sales={sales}
        onEdit={openEdit}
        onDeleted={() => {
          setError(undefined);
          router.refresh();
        }}
        onError={setError}
      />

      {isModalOpen && (
        <SaleFormModal editingSale={editingSale} onClose={closeModal} onSaved={handleSaved} />
      )}
    </div>
  );
}
