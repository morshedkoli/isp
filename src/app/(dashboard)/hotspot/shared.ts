import type { AccentName } from '@/lib/ui-tokens';
import { HOTSPOT_PACKAGES, type HotspotPackageKey } from './constants';

export type PkgKey = HotspotPackageKey;

export interface Sale {
  id: string;
  package: PkgKey;
  quantity: number;
  discount?: number | null;
  amount: number;
  date: string | Date;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
}

export interface Summary {
  sevenDay: { count: number; revenue: number };
  thirtyDay: { count: number; revenue: number };
  totalRevenue: number;
}

/** Presentation-only accent per package. */
const PKG_ACCENTS: Record<PkgKey, AccentName> = {
  SEVEN_DAY: 'hotspot',
  THIRTY_DAY: 'partner',
};

/**
 * UI config derived from HOTSPOT_PACKAGES rather than restating it — price and
 * duration previously lived in two places, so editing one silently desynced the
 * displayed price from the amount the server actually charges.
 */
export const PKG_CONFIG = (Object.keys(HOTSPOT_PACKAGES) as PkgKey[]).reduce(
  (config, key) => {
    config[key] = { ...HOTSPOT_PACKAGES[key], accent: PKG_ACCENTS[key] };
    return config;
  },
  {} as Record<PkgKey, { label: string; price: number; days: number; accent: AccentName }>,
);

export const PKG_KEYS = Object.keys(PKG_CONFIG) as PkgKey[];
