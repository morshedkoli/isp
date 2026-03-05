/**
 * Billing Cycle Calculation Utilities
 * 
 * CRITICAL BILLING RULE:
 * Billing cycle length is 30 days and is ANCHORED to the customer's FIRST successful recharge timestamp.
 * 
 * Definitions:
 * - firstRechargeAt = timestamp of first confirmed recharge for that customer
 * - cycleIndex = floor((now - firstRechargeAt) / (30 days)) + 1
 * - cycleStart = firstRechargeAt + (cycleIndex-1)*30 days
 * - cycleEnd   = firstRechargeAt + cycleIndex*30 days
 */

import { addDays } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Dhaka';
const CYCLE_LENGTH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MS = CYCLE_LENGTH_DAYS * DAY_MS;

export interface CycleInfo {
  cycleIndex: number;
  cycleStart: Date;
  cycleEnd: Date;
  isActive: boolean;
  daysRemaining: number;
  daysElapsed: number;
}

/**
 * Calculate the current billing cycle information for a customer
 * @param firstRechargeAt - Date of first recharge (or null if not recharged)
 * @param referenceDate - Date to calculate for (defaults to now)
 * @returns CycleInfo or null if no first recharge
 */
export function calculateCurrentCycle(
  firstRechargeAt: Date | null | undefined,
  referenceDate: Date = new Date()
): CycleInfo | null {
  if (!firstRechargeAt) {
    return null;
  }

  const firstRecharge = new Date(firstRechargeAt);
  const now = new Date(referenceDate);

  const elapsedMs = now.getTime() - firstRecharge.getTime();
  const cycleIndex = Math.max(1, Math.floor(elapsedMs / CYCLE_MS) + 1);

  // Calculate cycle boundaries
  const cycleStart = addDays(firstRecharge, (cycleIndex - 1) * CYCLE_LENGTH_DAYS);
  const cycleEnd = addDays(firstRecharge, cycleIndex * CYCLE_LENGTH_DAYS);

  // Calculate remaining days
  const daysElapsed = Math.floor((now.getTime() - cycleStart.getTime()) / DAY_MS);
  const daysRemaining = CYCLE_LENGTH_DAYS - daysElapsed;

  return {
    cycleIndex,
    cycleStart,
    cycleEnd,
    isActive: elapsedMs >= 0,
    daysRemaining: Math.max(0, daysRemaining),
    daysElapsed: Math.min(CYCLE_LENGTH_DAYS, Math.max(0, daysElapsed)),
  };
}

/**
 * Calculate all cycles up to a specific date
 * @param firstRechargeAt - Date of first recharge
 * @param upToDate - Date to calculate cycles up to (defaults to now + 30 days)
 * @returns Array of cycle information
 */
export function calculateAllCycles(
  firstRechargeAt: Date,
  upToDate: Date = addDays(new Date(), 30)
): CycleInfo[] {
  const firstRecharge = new Date(firstRechargeAt);
  const endDate = new Date(upToDate);

  const cycles: CycleInfo[] = [];
  let cycleIndex = 1;

  while (true) {
    const cycleStart = addDays(firstRecharge, (cycleIndex - 1) * CYCLE_LENGTH_DAYS);
    const cycleEnd = addDays(firstRecharge, cycleIndex * CYCLE_LENGTH_DAYS);

    const daysSinceFirstRecharge = Math.floor((endDate.getTime() - firstRecharge.getTime()) / DAY_MS);
    const daysElapsed = Math.floor((endDate.getTime() - cycleStart.getTime()) / DAY_MS);
    const daysRemaining = CYCLE_LENGTH_DAYS - daysElapsed;

    cycles.push({
      cycleIndex,
      cycleStart,
      cycleEnd,
      isActive: daysSinceFirstRecharge >= 0,
      daysRemaining: Math.max(0, daysRemaining),
      daysElapsed: Math.min(CYCLE_LENGTH_DAYS, Math.max(0, daysElapsed)),
    });

    // Stop if we've passed the end date
    if (cycleStart > endDate) {
      break;
    }

    cycleIndex++;
  }

  return cycles;
}

/**
 * Get cycle info for a specific cycle index
 * @param firstRechargeAt - Date of first recharge
 * @param cycleIndex - The cycle index to get (1-indexed)
 * @returns CycleInfo
 */
export function getCycleByIndex(
  firstRechargeAt: Date,
  cycleIndex: number
): CycleInfo {
  const firstRecharge = new Date(firstRechargeAt);
  const cycleStart = addDays(firstRecharge, (cycleIndex - 1) * CYCLE_LENGTH_DAYS);
  const cycleEnd = addDays(firstRecharge, cycleIndex * CYCLE_LENGTH_DAYS);

  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - cycleStart.getTime()) / DAY_MS);

  return {
    cycleIndex,
    cycleStart,
    cycleEnd,
    isActive: now >= cycleStart,
    daysRemaining: Math.max(0, CYCLE_LENGTH_DAYS - Math.max(0, daysElapsed)),
    daysElapsed: Math.min(CYCLE_LENGTH_DAYS, Math.max(0, daysElapsed)),
  };
}

/**
 * Format a date for display in Asia/Dhaka timezone
 * @param date - Date to format
 * @param format - Format string (defaults to 'dd MMM yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, format: string = 'dd MMM yyyy'): string {
  return formatInTimeZone(new Date(date), TIMEZONE, format);
}

/**
 * Format a date with time in Asia/Dhaka timezone
 * @param date - Date to format
 * @returns Formatted date string with time
 */
export function formatDateTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format currency amount
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the current date in Asia/Dhaka timezone
 * @returns Current date in Dhaka timezone
 */
export function getCurrentDateInDhaka(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Get month range for a specific year and month
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Object with start and end dates
 */
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Calculate the due date for a cycle
 * @param cycleEnd - Cycle end date
 * @param graceDays - Number of grace days (default 3)
 * @returns Due date
 */
export function calculateDueDate(cycleEnd: Date, graceDays: number = 3): Date {
  return addDays(cycleEnd, graceDays);
}

/**
 * Check if a customer is overdue
 * @param firstRechargeAt - First recharge date
 * @param graceDays - Number of grace days
 * @returns Boolean indicating if overdue
 */
export function isCustomerOverdue(
  firstRechargeAt: Date | null,
  graceDays: number = 3
): boolean {
  if (!firstRechargeAt) return false;

  const cycleInfo = calculateCurrentCycle(firstRechargeAt);
  if (!cycleInfo) return false;

  const dueDate = calculateDueDate(cycleInfo.cycleEnd, graceDays);
  return new Date() > dueDate;
}
