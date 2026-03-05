// Fixed hotspot package definitions — single source of truth for pricing

export const HOTSPOT_PACKAGES = {
    SEVEN_DAY: { label: '7-Day Pass', price: 50, days: 7 },
    THIRTY_DAY: { label: '30-Day Pass', price: 200, days: 30 },
} as const;

export type HotspotPackageKey = keyof typeof HOTSPOT_PACKAGES;
