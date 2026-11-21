/**
 * Field Agent Ledger & Balance Engine.
 *
 * Mirrors `partner-ledger.ts` for Field Agents (`CommissionAgent`):
 *  - Every saved monthly `AgentCommissionEntry` credits (+) the agent's balance
 *  - Every `AgentPayout` recorded deducts (−) from the agent's balance
 *  - Optional `AgentAdjustment` allows opening balance or historical clearance
 */

import { prisma } from '@/lib/prisma';
import { monthBounds, periodOf } from './business-date';
import {
  cleanMoney,
  isBeforePeriod,
  type AdjustmentDirection,
  type PartnerLedgerEntry,
  type PaymentMethodType,
} from './partner-ledger';
import { formatPeriod, type Period } from './period';

export interface AgentLedgerInput {
  id: string;
  name: string;
  phone: string | null;
  commissionPercent: number;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AgentCommissionEntryInput {
  id: string;
  agentId: string;
  year: number;
  month: number;
  amount: number;
  recordCreatedAt: Date;
}

export interface AgentPayoutInput {
  id: string;
  agentId: string;
  amount: number;
  date: Date;
  method: PaymentMethodType;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface AgentAdjustmentInput {
  id: string;
  agentId: string;
  type: AdjustmentDirection;
  amount: number;
  date: Date;
  reason: string;
  notes: string | null;
  createdAt: Date;
}

export interface AgentLedgerResult {
  agentId: string;
  name: string;
  phone: string | null;
  commissionPercent: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  totalEarned: number;
  totalCreditAdjustments: number;
  totalDebitAdjustments: number;
  totalPaid: number;
  balance: number;
  calculatedMonthsCount: number;
  payoutsCount: number;
  entries: PartnerLedgerEntry[];
}

const KIND_ORDER: Record<PartnerLedgerEntry['kind'], number> = {
  CALCULATION: 0,
  ADJUSTMENT: 1,
  PAYOUT: 2,
};

export function computeAgentLedgers(inputs: {
  agents: AgentLedgerInput[];
  commissionEntries: AgentCommissionEntryInput[];
  payouts: AgentPayoutInput[];
  adjustments: AgentAdjustmentInput[];
  /** When set, excludes monthly commission entries in or after this period (e.g. current ongoing month). */
  excludeFromPeriod?: Period;
}): { byAgentId: Record<string, AgentLedgerResult>; list: AgentLedgerResult[] } {
  const eligibleEntries = inputs.excludeFromPeriod
    ? inputs.commissionEntries.filter((ce) =>
        isBeforePeriod(ce.year, ce.month, inputs.excludeFromPeriod!),
      )
    : inputs.commissionEntries;

  const entriesByAgent = new Map<string, AgentCommissionEntryInput[]>();
  for (const ce of eligibleEntries) {
    const arr = entriesByAgent.get(ce.agentId);
    if (arr) arr.push(ce);
    else entriesByAgent.set(ce.agentId, [ce]);
  }

  const payoutsByAgent = new Map<string, AgentPayoutInput[]>();
  for (const p of inputs.payouts) {
    const arr = payoutsByAgent.get(p.agentId);
    if (arr) arr.push(p);
    else payoutsByAgent.set(p.agentId, [p]);
  }

  const adjustmentsByAgent = new Map<string, AgentAdjustmentInput[]>();
  for (const a of inputs.adjustments) {
    const arr = adjustmentsByAgent.get(a.agentId);
    if (arr) arr.push(a);
    else adjustmentsByAgent.set(a.agentId, [a]);
  }

  const byAgentId: Record<string, AgentLedgerResult> = {};
  const list: AgentLedgerResult[] = [];

  for (const agent of inputs.agents) {
    const agentComms = [...(entriesByAgent.get(agent.id) ?? [])].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
    const agentPayouts = payoutsByAgent.get(agent.id) ?? [];
    const agentAdjustments = adjustmentsByAgent.get(agent.id) ?? [];

    interface SortableEntry {
      entry: Omit<PartnerLedgerEntry, 'balanceAfter'>;
      sortTime: number;
      createdTime: number;
    }
    const rawEntries: SortableEntry[] = [];

    let totalEarned = 0;
    for (const ce of agentComms) {
      if (ce.amount <= 0) continue;
      totalEarned = cleanMoney(totalEarned + ce.amount);
      const { end: periodEnd } = monthBounds(ce.year, ce.month);
      const effectiveDate =
        ce.recordCreatedAt.getTime() < periodEnd.getTime() ? ce.recordCreatedAt : periodEnd;

      rawEntries.push({
        sortTime: effectiveDate.getTime(),
        createdTime: ce.recordCreatedAt.getTime(),
        entry: {
          id: `agent-calc-${ce.year}-${String(ce.month).padStart(2, '0')}-${agent.id}`,
          rawId: ce.id,
          kind: 'CALCULATION',
          direction: 'CREDIT',
          amount: cleanMoney(ce.amount),
          date: effectiveDate.toISOString(),
          title: `${formatPeriod(ce.year, ce.month)} Agent Commission`,
          subtitle: `Rate ${agent.commissionPercent}%${agent.notes ? ` · ${agent.notes}` : ''}`,
          year: ce.year,
          month: ce.month,
          sharePercent: agent.commissionPercent,
        },
      });
    }

    let totalPaid = 0;
    for (const payout of agentPayouts) {
      totalPaid = cleanMoney(totalPaid + payout.amount);
      const subtitleParts: string[] = [];
      if (payout.notes) subtitleParts.push(payout.notes);
      else if (payout.referenceId) subtitleParts.push(`Ref: ${payout.referenceId}`);

      rawEntries.push({
        sortTime: payout.date.getTime(),
        createdTime: payout.createdAt.getTime(),
        entry: {
          id: `agent-payout-${payout.id}`,
          rawId: payout.id,
          kind: 'PAYOUT',
          direction: 'DEBIT',
          amount: payout.amount,
          date: payout.date.toISOString(),
          title: `Payment Recorded (${payout.method})`,
          subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
          method: payout.method,
          referenceId: payout.referenceId,
          notes: payout.notes,
        },
      });
    }

    let totalCreditAdjustments = 0;
    let totalDebitAdjustments = 0;
    for (const adj of agentAdjustments) {
      if (adj.type === 'CREDIT') {
        totalCreditAdjustments = cleanMoney(totalCreditAdjustments + adj.amount);
      } else {
        totalDebitAdjustments = cleanMoney(totalDebitAdjustments + adj.amount);
      }

      rawEntries.push({
        sortTime: adj.date.getTime(),
        createdTime: adj.createdAt.getTime(),
        entry: {
          id: `agent-adj-${adj.id}`,
          rawId: adj.id,
          kind: 'ADJUSTMENT',
          direction: adj.type,
          amount: adj.amount,
          date: adj.date.toISOString(),
          title: adj.type === 'CREDIT' ? `Balance Credit: ${adj.reason}` : `Balance Deduction: ${adj.reason}`,
          subtitle: adj.notes || null,
          reason: adj.reason,
          notes: adj.notes,
        },
      });
    }

    rawEntries.sort((a, b) => {
      if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
      const kindDiff = KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind];
      if (kindDiff !== 0) return kindDiff;
      if (a.createdTime !== b.createdTime) return a.createdTime - b.createdTime;
      return a.entry.id.localeCompare(b.entry.id);
    });

    let running = 0;
    const chronological = rawEntries.map(({ entry }) => {
      running = cleanMoney(running + (entry.direction === 'CREDIT' ? entry.amount : -entry.amount));
      return { ...entry, balanceAfter: running };
    });

    const balance = cleanMoney(
      totalEarned + totalCreditAdjustments - totalPaid - totalDebitAdjustments,
    );

    const result: AgentLedgerResult = {
      agentId: agent.id,
      name: agent.name,
      phone: agent.phone,
      commissionPercent: agent.commissionPercent,
      notes: agent.notes,
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
      totalEarned,
      totalCreditAdjustments,
      totalDebitAdjustments,
      totalPaid,
      balance,
      calculatedMonthsCount: agentComms.filter((c) => c.amount > 0).length,
      payoutsCount: agentPayouts.length,
      entries: [...chronological].reverse(),
    };

    byAgentId[agent.id] = result;
    list.push(result);
  }

  return { byAgentId, list };
}

export async function fetchAllAgentLedgers(options?: { includeCurrentMonth?: boolean }) {
  const currentPeriod = periodOf(new Date());
  const excludeFromPeriod = options?.includeCurrentMonth ? undefined : currentPeriod;
  const [agents, records, payouts, adjustments] = await Promise.all([
    prisma.commissionAgent.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.commissionRecord.findMany({
      include: { agentEntries: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
    prisma.agentPayout.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.agentAdjustment.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const commissionEntries: AgentCommissionEntryInput[] = [];
  for (const rec of records) {
    for (const entry of rec.agentEntries) {
      commissionEntries.push({
        id: entry.id,
        agentId: entry.agentId,
        year: rec.year,
        month: rec.month,
        amount: entry.amount,
        recordCreatedAt: rec.createdAt,
      });
    }
  }

  return computeAgentLedgers({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      commissionPercent: a.commissionPercent,
      notes: a.notes,
      isActive: a.isActive,
      createdAt: a.createdAt,
    })),
    commissionEntries,
    payouts: payouts.map((p) => ({
      id: p.id,
      agentId: p.agentId,
      amount: p.amount,
      date: p.date,
      method: p.method as PaymentMethodType,
      referenceId: p.referenceId,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    adjustments: adjustments.map((a) => ({
      id: a.id,
      agentId: a.agentId,
      type: a.type as AdjustmentDirection,
      amount: a.amount,
      date: a.date,
      reason: a.reason,
      notes: a.notes,
      createdAt: a.createdAt,
    })),
    excludeFromPeriod,
  });
}
