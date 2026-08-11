'use client';

import { useState } from 'react';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { formatTaka } from '@/lib/format';
import { accents, ui } from '@/lib/ui-tokens';
import { recordHotspotSale } from './actions';
import { PKG_CONFIG, PKG_KEYS, type PkgKey, type Summary } from './shared';

interface QuickAddCardsProps {
  summary: Summary;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

export default function QuickAddCards({
  summary,
  isLoading,
  setIsLoading,
  onAdded,
  onError,
}: QuickAddCardsProps) {
  const [justAdded, setJustAdded] = useState<PkgKey | null>(null);

  const handleQuickAdd = async (pkg: PkgKey) => {
    setIsLoading(true);
    try {
      const result = await recordHotspotSale({
        package: pkg,
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
      });
      if (result.success) {
        setJustAdded(pkg);
        setTimeout(() => setJustAdded(null), 1800);
        onAdded();
      } else {
        onError(result.error || 'Could not record the sale.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {PKG_KEYS.map((key) => {
        const config = PKG_CONFIG[key];
        const accent = accents[config.accent];
        const stat = key === 'SEVEN_DAY' ? summary.sevenDay : summary.thirtyDay;
        const isSuccess = justAdded === key;

        return (
          <div key={key} className={`${ui.card} relative overflow-hidden p-5`}>
            {/* Tinted bleed anchors the card to its package colour. */}
            <div
              className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${accent.soft} opacity-70`}
            />

            <div className="relative">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent.bar}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${accent.text}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight text-stone-900">
                    {formatTaka(config.price)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                    <Clock size={11} />
                    <span>{config.days} days validity</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-stone-400">This month</p>
                  <p className="text-xl font-bold tabular-nums text-stone-800">{stat.count} sold</p>
                  <p className={`text-sm font-semibold tabular-nums ${accent.text}`}>
                    {formatTaka(stat.revenue)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleQuickAdd(key)}
                disabled={isLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                  isSuccess
                    ? 'bg-emerald-500 text-white'
                    : `${accent.soft} ${accent.text} hover:brightness-95`
                }`}
              >
                {isSuccess ? (
                  <>
                    <CheckCircle size={16} /> Recorded!
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Quick Add ×1
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
