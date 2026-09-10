'use client';

import { createContext, useContext, useMemo, useTransition } from 'react';

interface PeriodTransitionValue {
  /** True while a period change is being fetched and re-rendered on the server. */
  isPending: boolean;
  /**
   * Runs a navigation inside a transition so the whole shell — not just the
   * selector — can show that new data is on the way.
   */
  startPeriodTransition: (navigate: () => void) => void;
}

/**
 * Default is a pass-through, so a `PeriodSelector` rendered outside the
 * dashboard shell still navigates (it just won't drive the shell's spinner).
 */
const PeriodTransitionContext = createContext<PeriodTransitionValue>({
  isPending: false,
  startPeriodTransition: (navigate) => navigate(),
});

/**
 * Shares one pending flag between the period selector and the page content.
 *
 * Changing the month is a server round-trip on `force-dynamic` pages: without
 * this the selects snapped to the new month while the numbers below them sat
 * unchanged for a second or two, with nothing on screen saying a fetch was in
 * flight.
 */
export function PeriodTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();

  const value = useMemo(
    () => ({ isPending, startPeriodTransition: startTransition }),
    [isPending, startTransition],
  );

  return (
    <PeriodTransitionContext.Provider value={value}>
      {children}
    </PeriodTransitionContext.Provider>
  );
}

export function usePeriodTransition(): PeriodTransitionValue {
  return useContext(PeriodTransitionContext);
}
