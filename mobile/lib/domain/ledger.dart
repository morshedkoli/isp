/// Partner & field-agent balance engine — a line-for-line port of the web app's
/// `src/lib/partner-ledger.ts` and `src/lib/agent-ledger.ts`, so the app shows
/// exactly the same balances, passbooks and per-month dues as the website.
library;

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';

class LedgerEntry {
  const LedgerEntry({
    required this.id,
    required this.rawId,
    required this.kind,
    required this.direction,
    required this.amount,
    required this.balanceAfter,
    required this.date,
    required this.title,
    this.subtitle,
  });

  final String id;
  final String rawId;
  final LedgerKind kind;
  final Direction direction;
  final double amount;
  final double balanceAfter;
  final DateTime date;
  final String title;
  final String? subtitle;

  LedgerEntry withBalance(double balance) => LedgerEntry(
    id: id,
    rawId: rawId,
    kind: kind,
    direction: direction,
    amount: amount,
    balanceAfter: balance,
    date: date,
    title: title,
    subtitle: subtitle,
  );
}

class MonthlyEarningRow {
  const MonthlyEarningRow({
    required this.period,
    required this.companyCommission,
    required this.agentPayouts,
    required this.totalExpenses,
    required this.netPool,
    required this.creditedAmount,
    required this.allocatedPaid,
  });

  final Period period;
  final double companyCommission;
  final double agentPayouts;
  final double totalExpenses;
  final double netPool;
  final double creditedAmount;
  final double allocatedPaid;

  double get remainingDue => _max0(cleanMoney(creditedAmount - allocatedPaid));
}

class PersonLedger {
  const PersonLedger({
    required this.kind,
    required this.id,
    required this.name,
    required this.percent,
    required this.isActive,
    required this.totalEarned,
    required this.totalCreditAdjustments,
    required this.totalDebitAdjustments,
    required this.totalPaid,
    required this.balance,
    required this.entries,
    required this.monthlyBreakdown,
    this.phone,
  });

  final PersonKind kind;
  final String id;
  final String name;
  final String? phone;

  /// Partner share % or agent commission %.
  final double percent;
  final bool isActive;
  final double totalEarned;
  final double totalCreditAdjustments;
  final double totalDebitAdjustments;
  final double totalPaid;

  /// Positive = payable to the person; negative = advance given.
  final double balance;

  /// Newest-first passbook with running balance after each entry.
  final List<LedgerEntry> entries;

  /// Newest-first per-month dues (partners only; empty for agents).
  final List<MonthlyEarningRow> monthlyBreakdown;

  double get totalCredited => cleanMoney(totalEarned + totalCreditAdjustments);
  double get totalGiven => cleanMoney(totalPaid + totalDebitAdjustments);
}

class PartnerLedgers {
  const PartnerLedgers(this.list, this.allocatedPaidByPeriod);

  final List<PersonLedger> list;

  /// period key → partnerId → amount allocated toward that month's share.
  final Map<String, Map<String, double>> allocatedPaidByPeriod;
}

double _max0(double v) => v > 0 ? v : 0;

const Map<LedgerKind, int> _kindOrder = {
  LedgerKind.calculation: 0,
  LedgerKind.adjustment: 1,
  LedgerKind.payout: 2,
};

class _Sortable {
  _Sortable(this.entry, this.sortTime, this.createdTime);
  final LedgerEntry entry;
  final int sortTime;
  final int createdTime;
}

List<LedgerEntry> _withRunningBalance(List<_Sortable> raw) {
  raw.sort((a, b) {
    if (a.sortTime != b.sortTime) return a.sortTime.compareTo(b.sortTime);
    final kindDiff = _kindOrder[a.entry.kind]! - _kindOrder[b.entry.kind]!;
    if (kindDiff != 0) return kindDiff;
    if (a.createdTime != b.createdTime) {
      return a.createdTime.compareTo(b.createdTime);
    }
    return a.entry.id.compareTo(b.entry.id);
  });
  var running = 0.0;
  final chronological = raw.map((s) {
    final delta = s.entry.direction == Direction.credit
        ? s.entry.amount
        : -s.entry.amount;
    running = cleanMoney(running + delta);
    return s.entry.withBalance(running);
  }).toList();
  return List.unmodifiable(chronological.reversed);
}

/// A monthly calculation is anchored at its createdAt when it was saved during
/// the month, otherwise at the month's end — same rule as the web app.
DateTime _effectiveDate(Period period, DateTime createdAt) =>
    createdAt.isBefore(period.end) ? createdAt : period.end;

String _wholeTaka(double v) => formatTaka(v.roundToDouble()).substring(1);

_Sortable _payoutEntry(
  Payout p, {
  required String idPrefix,
  required String title,
}) {
  final parts = <String>[];
  if (p.isSettlement && p.settlementYear != null && p.settlementMonth != null) {
    parts.add(
      'Settlement for ${Period(p.settlementYear!, p.settlementMonth!).label}',
    );
  }
  if (p.notes != null && p.notes!.isNotEmpty) {
    parts.add(p.notes!);
  } else if (p.referenceId != null && p.referenceId!.isNotEmpty) {
    parts.add('Ref: ${p.referenceId}');
  }
  return _Sortable(
    LedgerEntry(
      id: '$idPrefix${p.id}',
      rawId: p.id,
      kind: LedgerKind.payout,
      direction: Direction.debit,
      amount: p.amount,
      balanceAfter: 0,
      date: p.date,
      title: '$title (${p.method})',
      subtitle: parts.isEmpty ? null : parts.join(' · '),
    ),
    p.date.millisecondsSinceEpoch,
    p.createdAt.millisecondsSinceEpoch,
  );
}

_Sortable _adjustmentEntry(Adjustment a, String idPrefix) => _Sortable(
  LedgerEntry(
    id: '$idPrefix${a.id}',
    rawId: a.id,
    kind: LedgerKind.adjustment,
    direction: a.type,
    amount: a.amount,
    balanceAfter: 0,
    date: a.date,
    title: a.type == Direction.credit
        ? 'Balance Credit: ${a.reason}'
        : 'Balance Deduction: ${a.reason}',
    subtitle: (a.notes == null || a.notes!.isEmpty) ? null : a.notes,
  ),
  a.date.millisecondsSinceEpoch,
  a.createdAt.millisecondsSinceEpoch,
);

Map<String, List<T>> _groupBy<T>(Iterable<T> items, String Function(T) key) {
  final map = <String, List<T>>{};
  for (final item in items) {
    map.putIfAbsent(key(item), () => []).add(item);
  }
  return map;
}

/// Expenses summed per period key.
Map<String, double> expensesByPeriod(List<Expense> expenses) {
  final map = <String, double>{};
  for (final e in expenses) {
    final key = Period(e.year, e.month).key;
    map[key] = (map[key] ?? 0) + e.amount;
  }
  return map;
}

/// Port of `computePartnerLedgers`. Months in or after [excludeFrom] (the
/// ongoing month, by default) are not credited yet.
PartnerLedgers computePartnerLedgers({
  required List<Partner> partners,
  required List<CommissionRecord> records,
  required List<Expense> expenses,
  required List<Payout> payouts,
  required List<Adjustment> adjustments,
  Period? excludeFrom,
}) {
  final expenseMap = expensesByPeriod(expenses);
  final months =
      records
          .where(
            (r) =>
                excludeFrom == null ||
                Period(r.year, r.month).isBefore(excludeFrom),
          )
          .toList()
        ..sort(
          (a, b) => Period(a.year, a.month).compareTo(Period(b.year, b.month)),
        );

  final payoutsBy = _groupBy(payouts, (p) => p.personId);
  final adjustmentsBy = _groupBy(adjustments, (a) => a.personId);
  final allocated = <String, Map<String, double>>{
    for (final m in months) Period(m.year, m.month).key: <String, double>{},
  };

  final list = <PersonLedger>[];
  for (final partner in partners) {
    final partnerPayouts = payoutsBy[partner.id] ?? const <Payout>[];
    final partnerAdjustments =
        adjustmentsBy[partner.id] ?? const <Adjustment>[];
    final raw = <_Sortable>[];
    final rows = <_MutableMonth>[];
    var totalEarned = 0.0;

    for (final calc in months) {
      final period = Period(calc.year, calc.month);
      final agentPayouts = calc.agentTotal;
      final totalExpenses = expenseMap[period.key] ?? 0;
      final netPool = calc.totalPool - agentPayouts - totalExpenses;
      final credited =
          partner.isActive && partner.sharePercent > 0 && netPool > 0
          ? cleanMoney(netPool * partner.sharePercent / 100)
          : 0.0;
      rows.add(
        _MutableMonth(
          period,
          calc.totalPool,
          agentPayouts,
          totalExpenses,
          netPool,
          credited,
        ),
      );

      if (credited > 0) {
        totalEarned = cleanMoney(totalEarned + credited);
        final effective = _effectiveDate(period, calc.createdAt);
        raw.add(
          _Sortable(
            LedgerEntry(
              id: 'calc-${period.key}-${partner.id}',
              rawId: calc.id,
              kind: LedgerKind.calculation,
              direction: Direction.credit,
              amount: credited,
              balanceAfter: 0,
              date: effective,
              title: '${period.label} Commission Share',
              subtitle:
                  '${_fmtNum(partner.sharePercent)}% of ৳${_wholeTaka(netPool)} net pool',
            ),
            effective.millisecondsSinceEpoch,
            calc.createdAt.millisecondsSinceEpoch,
          ),
        );
      }
    }

    var totalPaid = 0.0;
    for (final p in partnerPayouts) {
      totalPaid = cleanMoney(totalPaid + p.amount);
      raw.add(_payoutEntry(p, idPrefix: 'payout-', title: 'Money Given'));
    }

    var creditAdj = 0.0;
    var debitAdj = 0.0;
    for (final a in partnerAdjustments) {
      if (a.type == Direction.credit) {
        creditAdj = cleanMoney(creditAdj + a.amount);
      } else {
        debitAdj = cleanMoney(debitAdj + a.amount);
      }
      raw.add(_adjustmentEntry(a, 'adj-'));
    }

    // Targeted settlements first, then FIFO from a general pool.
    var pool = 0.0;
    final sortedPayouts = [...partnerPayouts]..sort(_byDateThenCreated);
    for (final p in sortedPayouts) {
      if (p.isSettlement &&
          p.settlementYear != null &&
          p.settlementMonth != null) {
        final target = rows.where(
          (m) =>
              m.period.year == p.settlementYear &&
              m.period.month == p.settlementMonth,
        );
        if (target.isNotEmpty) {
          final row = target.first;
          final room = _max0(cleanMoney(row.credited - row.paid));
          final applied = room < p.amount ? room : p.amount;
          row.paid = cleanMoney(row.paid + applied);
          pool = cleanMoney(pool + (p.amount - applied));
          continue;
        }
      }
      pool = cleanMoney(pool + p.amount);
    }
    pool = cleanMoney(pool + debitAdj - creditAdj);
    if (pool > 0) {
      for (final row in rows) {
        if (pool <= 0) break;
        final room = _max0(cleanMoney(row.credited - row.paid));
        if (room <= 0) continue;
        final applied = room < pool ? room : pool;
        row.paid = cleanMoney(row.paid + applied);
        pool = cleanMoney(pool - applied);
      }
    }
    for (final row in rows) {
      allocated.putIfAbsent(row.period.key, () => {})[partner.id] = row.paid;
    }

    list.add(
      PersonLedger(
        kind: PersonKind.partner,
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        percent: partner.sharePercent,
        isActive: partner.isActive,
        totalEarned: totalEarned,
        totalCreditAdjustments: creditAdj,
        totalDebitAdjustments: debitAdj,
        totalPaid: totalPaid,
        balance: cleanMoney(totalEarned + creditAdj - totalPaid - debitAdj),
        entries: _withRunningBalance(raw),
        monthlyBreakdown: List.unmodifiable(
          rows.reversed.map((r) => r.freeze()),
        ),
      ),
    );
  }

  return PartnerLedgers(List.unmodifiable(list), allocated);
}

/// Port of `computeAgentLedgers`.
List<PersonLedger> computeAgentLedgers({
  required List<CommissionAgent> agents,
  required List<CommissionRecord> records,
  required List<Payout> payouts,
  required List<Adjustment> adjustments,
  Period? excludeFrom,
}) {
  final payoutsBy = _groupBy(payouts, (p) => p.personId);
  final adjustmentsBy = _groupBy(adjustments, (a) => a.personId);
  final eligible =
      records
          .where(
            (r) =>
                excludeFrom == null ||
                Period(r.year, r.month).isBefore(excludeFrom),
          )
          .toList()
        ..sort(
          (a, b) => Period(a.year, a.month).compareTo(Period(b.year, b.month)),
        );

  final list = <PersonLedger>[];
  for (final agent in agents) {
    final raw = <_Sortable>[];
    var totalEarned = 0.0;

    for (final rec in eligible) {
      for (final ce in rec.agentEntries.where((e) => e.agentId == agent.id)) {
        if (ce.amount <= 0) continue;
        totalEarned = cleanMoney(totalEarned + ce.amount);
        final period = Period(rec.year, rec.month);
        final effective = _effectiveDate(period, rec.createdAt);
        final note = agent.notes == null || agent.notes!.isEmpty
            ? ''
            : ' · ${agent.notes}';
        raw.add(
          _Sortable(
            LedgerEntry(
              id: 'agent-calc-${period.key}-${agent.id}',
              rawId: ce.id,
              kind: LedgerKind.calculation,
              direction: Direction.credit,
              amount: cleanMoney(ce.amount),
              balanceAfter: 0,
              date: effective,
              title: '${period.label} Agent Commission',
              subtitle: 'Rate ${_fmtNum(agent.commissionPercent)}%$note',
            ),
            effective.millisecondsSinceEpoch,
            rec.createdAt.millisecondsSinceEpoch,
          ),
        );
      }
    }

    final agentPayouts = payoutsBy[agent.id] ?? const <Payout>[];
    var totalPaid = 0.0;
    for (final p in agentPayouts) {
      totalPaid = cleanMoney(totalPaid + p.amount);
      raw.add(
        _payoutEntry(p, idPrefix: 'agent-payout-', title: 'Payment Recorded'),
      );
    }

    var creditAdj = 0.0;
    var debitAdj = 0.0;
    for (final a in adjustmentsBy[agent.id] ?? const <Adjustment>[]) {
      if (a.type == Direction.credit) {
        creditAdj = cleanMoney(creditAdj + a.amount);
      } else {
        debitAdj = cleanMoney(debitAdj + a.amount);
      }
      raw.add(_adjustmentEntry(a, 'agent-adj-'));
    }

    list.add(
      PersonLedger(
        kind: PersonKind.agent,
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        percent: agent.commissionPercent,
        isActive: agent.isActive,
        totalEarned: totalEarned,
        totalCreditAdjustments: creditAdj,
        totalDebitAdjustments: debitAdj,
        totalPaid: totalPaid,
        balance: cleanMoney(totalEarned + creditAdj - totalPaid - debitAdj),
        entries: _withRunningBalance(raw),
        monthlyBreakdown: const [],
      ),
    );
  }
  return List.unmodifiable(list);
}

int _byDateThenCreated(Payout a, Payout b) {
  final d = a.date.compareTo(b.date);
  return d != 0 ? d : a.createdAt.compareTo(b.createdAt);
}

/// `40` or `40.5` — JS-style number printing for percentages.
String _fmtNum(double v) =>
    v == v.roundToDouble() ? v.toInt().toString() : v.toString();

class _MutableMonth {
  _MutableMonth(
    this.period,
    this.commission,
    this.agentPayouts,
    this.expenses,
    this.netPool,
    this.credited,
  );
  final Period period;
  final double commission;
  final double agentPayouts;
  final double expenses;
  final double netPool;
  final double credited;
  double paid = 0;

  MonthlyEarningRow freeze() => MonthlyEarningRow(
    period: period,
    companyCommission: commission,
    agentPayouts: agentPayouts,
    totalExpenses: expenses,
    netPool: netPool,
    creditedAmount: credited,
    allocatedPaid: paid,
  );
}
