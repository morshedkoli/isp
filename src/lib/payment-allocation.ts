/**
 * Payment Allocation Algorithm
 * 
 * Allocates payments to cycle charges using the "oldest unpaid first" method.
 * This ensures fairness and helps track which cycles are paid vs unpaid.
 */

import { PrismaClient, CycleCharge, Payment } from '@prisma/client';

export interface AllocationResult {
  success: boolean;
  allocatedAmount: number;
  remainingAmount: number;
  allocations: {
    cycleChargeId: string;
    amount: number;
  }[];
}

export interface ChargeSlice {
  id: string;
  remainingAmount: number;
}

export function allocateOldestFirst(charges: ChargeSlice[], paymentAmount: number) {
  const allocations: { cycleChargeId: string; amount: number }[] = [];
  let remainingAmount = paymentAmount;

  for (const charge of charges) {
    if (remainingAmount <= 0) break;

    const amountToAllocate = Math.min(charge.remainingAmount, remainingAmount);
    if (amountToAllocate > 0) {
      allocations.push({ cycleChargeId: charge.id, amount: amountToAllocate });
      remainingAmount -= amountToAllocate;
    }
  }

  return {
    allocatedAmount: paymentAmount - remainingAmount,
    remainingAmount,
    allocations,
  };
}

/**
 * Allocate a payment amount to unpaid cycle charges (oldest first)
 * @param prisma - Prisma client instance
 * @param customerId - Customer ID
 * @param paymentAmount - Total payment amount to allocate
 * @param excludePaymentId - Optional payment ID to exclude (for updates)
 * @returns Allocation result
 */
export async function allocatePayment(
  prisma: PrismaClient,
  customerId: string,
  paymentAmount: number,
  excludePaymentId?: string
): Promise<AllocationResult> {
  // Get all unpaid cycle charges for this customer, ordered by cycle index (oldest first)
  const unpaidCharges = await prisma.cycleCharge.findMany({
    where: {
      customerId,
      remainingAmount: { gt: 0 },
    },
    orderBy: {
      cycleIndex: 'asc',
    },
  });

  const pure = allocateOldestFirst(
    unpaidCharges.map((c) => ({ id: c.id, remainingAmount: c.remainingAmount })),
    paymentAmount
  );

  return {
    success: true,
    allocatedAmount: pure.allocatedAmount,
    remainingAmount: pure.remainingAmount,
    allocations: pure.allocations,
  };
}

/**
 * Create or update cycle charges when a recharge is made
 * @param prisma - Prisma client instance
 * @param customerId - Customer ID
 * @param planPrice - Monthly plan price
 * @param firstRechargeAt - First recharge timestamp
 * @returns Array of created/updated cycle charges
 */
export async function ensureCycleCharges(
  prisma: PrismaClient,
  customerId: string,
  planPrice: number,
  firstRechargeAt: Date,
  upToCycles: number = 12
): Promise<CycleCharge[]> {
  const { calculateAllCycles } = await import('./billing');
  const cycles = calculateAllCycles(firstRechargeAt, new Date());

  const cycleCharges: CycleCharge[] = [];

  for (const cycle of cycles.slice(0, upToCycles)) {
    const existingCharge = await prisma.cycleCharge.findUnique({
      where: {
        customerId_cycleIndex: {
          customerId,
          cycleIndex: cycle.cycleIndex,
        },
      },
    });

    if (!existingCharge) {
      const newCharge = await prisma.cycleCharge.create({
        data: {
          customerId,
          cycleIndex: cycle.cycleIndex,
          cycleStart: cycle.cycleStart,
          cycleEnd: cycle.cycleEnd,
          amount: planPrice,
          remainingAmount: planPrice,
          isPaid: false,
          paidAmount: 0,
        },
      });
      cycleCharges.push(newCharge);
    } else {
      cycleCharges.push(existingCharge);
    }
  }

  return cycleCharges;
}

/**
 * Recalculate and update cycle charge payment status
 * @param prisma - Prisma client instance
 * @param cycleChargeId - Cycle charge ID
 */
export async function updateCycleChargeStatus(
  prisma: PrismaClient,
  cycleChargeId: string
): Promise<void> {
  const charge = await prisma.cycleCharge.findUnique({
    where: { id: cycleChargeId },
    include: {
      allocations: true,
    },
  });

  if (!charge) return;

  const totalAllocated = charge.allocations.reduce(
    (sum, alloc) => sum + alloc.amount,
    0
  );

  const remainingAmount = charge.amount - totalAllocated;

  await prisma.cycleCharge.update({
    where: { id: cycleChargeId },
    data: {
      paidAmount: totalAllocated,
      remainingAmount: Math.max(0, remainingAmount),
      isPaid: remainingAmount <= 0,
    },
  });
}

/**
 * Get customer's total due amount across all unpaid cycles
 * @param prisma - Prisma client instance
 * @param customerId - Customer ID
 * @returns Total due amount
 */
export async function getCustomerTotalDue(
  prisma: PrismaClient,
  customerId: string
): Promise<number> {
  const result = await prisma.cycleCharge.aggregate({
    where: {
      customerId,
      remainingAmount: { gt: 0 },
    },
    _sum: {
      remainingAmount: true,
    },
  });

  return result._sum.remainingAmount || 0;
}

/**
 * Get customer's payment summary
 * @param prisma - Prisma client instance
 * @param customerId - Customer ID
 * @returns Summary object with totals
 */
export async function getCustomerPaymentSummary(
  prisma: PrismaClient,
  customerId: string
): Promise<{
  totalCharges: number;
  totalPaid: number;
  totalDue: number;
  cycleCount: number;
}> {
  const charges = await prisma.cycleCharge.findMany({
    where: { customerId },
  });

  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = charges.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalDue = charges.reduce((sum, c) => sum + c.remainingAmount, 0);

  return {
    totalCharges,
    totalPaid,
    totalDue,
    cycleCount: charges.length,
  };
}
