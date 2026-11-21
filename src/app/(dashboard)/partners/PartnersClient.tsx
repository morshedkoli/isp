'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Banknote, CheckCheck, UserCheck } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import { formatPeriod } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { deletePartnerPayout, updatePartner } from './actions';
import GiveMoneyModal, { type EditingPayoutData } from './GiveMoneyModal';
import MonthSettlementModal from './MonthSettlementModal';
import PartnerFormModal from './PartnerFormModal';
import PartnerTable from './PartnerTable';
import RecentPayoutsTable from './RecentPayoutsTable';
import type { PartnerSummary, Period, RecentPayout } from './shared';

interface PartnersClientProps {
  partners: PartnerSummary[];
  recentPayouts: RecentPayout[];
  availablePeriods: Period[];
  selectedPeriod?: Period;
  excludedCurrentPeriod: Period;
  autoOpenSettlement: { year: number; month: number } | null;
}

export default function PartnersClient({
  partners,
  recentPayouts,
  availablePeriods,
  selectedPeriod,
  excludedCurrentPeriod,
  autoOpenSettlement,
}: PartnersClientProps) {
  const router = useRouter();

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerSummary | null>(null);
  const [giveMoneyPartnerId, setGiveMoneyPartnerId] = useState<string | null>(null);
  const [isGiveMoneyLocked, setIsGiveMoneyLocked] = useState(false);
  const [editingPayout, setEditingPayout] = useState<EditingPayoutData | null>(null);
  const [deletingPayoutId, setDeletingPayoutId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<Period | null>(null);
  const [didAutoOpenSettlement, setDidAutoOpenSettlement] = useState(false);

  const initialPeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    if (availablePeriods.length > 0) return availablePeriods[0];
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedPeriod, availablePeriods]);

  const activePartners = useMemo(() => partners.filter((p) => p.isActive), [partners]);
  const totalShare = activePartners.reduce((sum, p) => sum + p.sharePercent, 0);

  useEffect(() => {
    if (!autoOpenSettlement || didAutoOpenSettlement) return;
    const requested = availablePeriods.find(
      (period) => period.year === autoOpenSettlement.year && period.month === autoOpenSettlement.month,
    );
    setSettlementTarget(requested || selectedPeriod || availablePeriods[0] || initialPeriod);
    setIsSettlementModalOpen(true);
    setDidAutoOpenSettlement(true);
  }, [autoOpenSettlement, availablePeriods, didAutoOpenSettlement, initialPeriod, selectedPeriod]);

  const openAddModal = () => {
    setEditingPartner(null);
    setIsPartnerModalOpen(true);
  };

  const openEditModal = (partner: PartnerSummary) => {
    setEditingPartner(partner);
    setIsPartnerModalOpen(true);
  };

  const closePartnerModal = () => {
    setIsPartnerModalOpen(false);
    setEditingPartner(null);
  };

  const handlePartnerSaved = () => {
    closePartnerModal();
    router.refresh();
  };

  const handleToggleActive = async (partner: PartnerSummary) => {
    const result = await updatePartner(partner.id, { isActive: !partner.isActive });
    if (result.success) {
      router.refresh();
    }
  };

  const openGiveMoneyGeneral = () => {
    setEditingPayout(null);
    setIsGiveMoneyLocked(false);
    setGiveMoneyPartnerId(activePartners[0]?.id || partners[0]?.id || '');
  };

  const openGiveMoneyForPartner = (partner: PartnerSummary) => {
    setEditingPayout(null);
    setIsGiveMoneyLocked(true);
    setGiveMoneyPartnerId(partner.id);
  };

  const openEditPayout = (payout: RecentPayout) => {
    setIsGiveMoneyLocked(true);
    setGiveMoneyPartnerId(payout.partnerId);
    setEditingPayout({
      id: payout.id,
      partnerId: payout.partnerId,
      amount: payout.amount,
      date: payout.date,
      method: payout.method,
      referenceId: payout.referenceId,
      notes: payout.notes,
    });
  };

  const closeGiveMoneyModal = () => {
    setGiveMoneyPartnerId(null);
    setEditingPayout(null);
    setIsGiveMoneyLocked(false);
  };

  const handleMoneyGiven = () => {
    closeGiveMoneyModal();
    router.refresh();
  };

  const handleConfirmDeletePayout = async () => {
    if (!deletingPayoutId) return;
    setIsDeleting(true);
    try {
      const res = await deletePartnerPayout(deletingPayoutId);
      if (res.success) {
        setDeletingPayoutId(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openSettlementModal = () => {
    setSettlementTarget(selectedPeriod || availablePeriods[0] || initialPeriod);
    setIsSettlementModalOpen(true);
  };
  const closeSettlementModal = () => {
    setIsSettlementModalOpen(false);
    setSettlementTarget(null);
  };
  const handleSettlementSettled = () => router.refresh();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners & Balances"
        subtitle={`Completed months up to ${formatPeriod(initialPeriod.year, initialPeriod.month)} (${formatPeriod(excludedCurrentPeriod.year, excludedCurrentPeriod.month)} excluded)`}
        icon={UserCheck}
        accent="profit"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            {partners.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={openGiveMoneyGeneral}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <Banknote size={15} />
                  Give Money
                </button>
                <button
                  type="button"
                  onClick={openSettlementModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100"
                >
                  <CheckCheck size={15} />
                  Settle Month
                </button>
              </>
            )}
            <button type="button" onClick={openAddModal} className={ui.buttonPrimary}>
              <Plus size={15} />
              Add Partner
            </button>
          </div>
        }
      />

      <PartnerTable
        partners={partners}
        activePartners={activePartners}
        totalShare={totalShare}
        period={initialPeriod}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onGiveMoney={openGiveMoneyForPartner}
        onToggleActive={handleToggleActive}
      />

      <RecentPayoutsTable
        recentPayouts={recentPayouts}
        period={initialPeriod}
        onEdit={openEditPayout}
        onDelete={(payout) => setDeletingPayoutId(payout.id)}
      />

      {isPartnerModalOpen && (
        <PartnerFormModal
          editingPartner={editingPartner}
          totalShare={totalShare}
          onClose={closePartnerModal}
          onSaved={handlePartnerSaved}
        />
      )}

      {(giveMoneyPartnerId !== null || editingPayout !== null) && (
        <GiveMoneyModal
          partners={partners}
          defaultPartnerId={giveMoneyPartnerId || undefined}
          lockedPartner={isGiveMoneyLocked}
          editingPayout={editingPayout}
          onClose={closeGiveMoneyModal}
          onSaved={handleMoneyGiven}
        />
      )}

      {isSettlementModalOpen && settlementTarget && (
        <MonthSettlementModal
          initialTarget={settlementTarget}
          availablePeriods={availablePeriods}
          onClose={closeSettlementModal}
          onSettled={handleSettlementSettled}
        />
      )}

      {deletingPayoutId && (
        <ConfirmDialog
          title="Delete this payment?"
          description="Deleting this payment will add the amount back to the partner's profile balance."
          isLoading={isDeleting}
          onConfirm={handleConfirmDeletePayout}
          onCancel={() => setDeletingPayoutId(null)}
        />
      )}
    </div>
  );
}
