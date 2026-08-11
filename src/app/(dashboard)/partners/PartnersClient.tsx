'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HandCoins, CheckCheck, UserCheck } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { updatePartner } from './actions';
import PartnerFormModal from './PartnerFormModal';
import PartnerTable from './PartnerTable';
import RecentPayoutsTable from './RecentPayoutsTable';
import PaymentSettleModal from './PaymentSettleModal';
import MonthSettlementModal from './MonthSettlementModal';
import type { Partner, Period, RecentPayout } from './shared';
import { ui } from '@/lib/ui-tokens';

interface PartnersClientProps {
    partners: Partner[];
    recentPayouts: RecentPayout[];
    availablePeriods: Period[];
    autoOpenSettlement: { year: number; month: number } | null;
}

export default function PartnersClient({
    partners,
    recentPayouts,
    availablePeriods,
    autoOpenSettlement,
}: PartnersClientProps) {
    const router = useRouter();

    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [settlementTarget, setSettlementTarget] = useState<Period | null>(null);
    const [didAutoOpenSettlement, setDidAutoOpenSettlement] = useState(false);

    const initialPeriod = useMemo(() => {
        if (availablePeriods.length > 0) return availablePeriods[0];
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }, [availablePeriods]);

    const activePartners = useMemo(() => partners.filter((p) => p.isActive), [partners]);
    const totalShare = activePartners.reduce((sum, p) => sum + p.sharePercent, 0);

    useEffect(() => {
        if (!autoOpenSettlement || didAutoOpenSettlement) return;

        const requested = availablePeriods.find(
            (period) => period.year === autoOpenSettlement.year && period.month === autoOpenSettlement.month,
        );
        setSettlementTarget(requested || availablePeriods[0] || initialPeriod);
        setIsSettlementModalOpen(true);
        setDidAutoOpenSettlement(true);
    }, [autoOpenSettlement, availablePeriods, didAutoOpenSettlement, initialPeriod]);

    const openAddModal = () => {
        setEditingPartner(null);
        setIsPartnerModalOpen(true);
    };

    const openEditModal = (partner: Partner) => {
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

    const handleToggleActive = async (partner: Partner) => {
        const result = await updatePartner(partner.id, { isActive: !partner.isActive });
        if (result.success) {
            router.refresh();
        }
    };

    const openPaymentModal = () => setIsPaymentModalOpen(true);
    const closePaymentModal = () => setIsPaymentModalOpen(false);
    const handlePaymentSettled = () => {
        closePaymentModal();
        router.refresh();
    };

    const openSettlementModal = () => {
        setSettlementTarget(availablePeriods[0] || initialPeriod);
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
                title="Partners & Equity"
                subtitle="Partner equity shares, payout histories, and monthly settlement calculations"
                icon={UserCheck}
                accent="profit"
                toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={openPaymentModal}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                        >
                            <HandCoins size={15} />
                            Settle Partner
                        </button>
                        <button
                            type="button"
                            onClick={openSettlementModal}
                            className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100"
                        >
                            <CheckCheck size={15} />
                            Settle Month
                        </button>
                        <button
                            type="button"
                            onClick={openAddModal}
                            className={ui.buttonPrimary}
                        >
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
                recentPayoutCount={recentPayouts.length}
                onAdd={openAddModal}
                onEdit={openEditModal}
                onToggleActive={handleToggleActive}
            />

            <RecentPayoutsTable recentPayouts={recentPayouts} />

            {isPartnerModalOpen && (
                <PartnerFormModal
                    editingPartner={editingPartner}
                    totalShare={totalShare}
                    onClose={closePartnerModal}
                    onSaved={handlePartnerSaved}
                />
            )}

            {isPaymentModalOpen && (
                <PaymentSettleModal
                    activePartners={activePartners}
                    availablePeriods={availablePeriods}
                    initialPeriod={initialPeriod}
                    onClose={closePaymentModal}
                    onSettled={handlePaymentSettled}
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
        </div>
    );
}
