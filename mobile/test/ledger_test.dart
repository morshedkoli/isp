import 'package:flutter_test/flutter_test.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/domain/ledger.dart';
import 'package:isp_admin/domain/models.dart';

/// Mirrors the web app's tests/partner-ledger.test.ts so the Dart port is
/// held to the same expected numbers.
Partner partner(String id, String name, double share) => Partner(
  id: id,
  name: name,
  email: '$id@internal.local',
  sharePercent: share,
  isActive: true,
  createdAt: DateTime.utc(2026),
);

CommissionRecord record(
  String id,
  int year,
  int month,
  double pool,
  double agents,
  DateTime createdAt,
) => CommissionRecord(
  id: id,
  year: year,
  month: month,
  totalPool: pool,
  createdAt: createdAt,
  sources: [CommissionSource('ISP', pool)],
  agentEntries: [
    if (agents > 0)
      AgentCommissionEntry(id: '$id-a', agentId: 'ag', amount: agents),
  ],
);

Expense expense(int year, int month, double amount) => Expense(
  id: 'e-$year-$month',
  type: 'MISC',
  description: 'x',
  amount: amount,
  date: DateTime.utc(year, month, 2),
  year: year,
  month: month,
);

Payout payout(
  String id,
  String personId,
  double amount,
  DateTime date, {
  int? settlementYear,
  int? settlementMonth,
  DateTime? createdAt,
}) => Payout(
  id: id,
  personId: personId,
  amount: amount,
  date: date,
  method: 'CASH',
  createdAt: createdAt ?? date,
  isSettlement: settlementYear != null,
  settlementYear: settlementYear,
  settlementMonth: settlementMonth,
);

void main() {
  final partners = [
    partner('p1', 'Murshed', 60.87),
    partner('p2', 'Halim', 26.09),
    partner('p3', 'Tanzina', 13.04),
  ];

  test('credits monthly shares, deducts payouts, keeps running balance', () {
    final result = computePartnerLedgers(
      partners: partners,
      records: [
        record('rec-feb', 2026, 2, 150000, 30000, DateTime.utc(2026, 3, 5, 8)),
        record('rec-mar', 2026, 3, 110000, 40000, DateTime.utc(2026, 4, 5, 8)),
      ],
      expenses: [expense(2026, 2, 20000), expense(2026, 3, 20000)],
      payouts: [
        payout(
          'pay-1',
          'p2',
          26090,
          DateTime.utc(2026, 3, 7),
          settlementYear: 2026,
          settlementMonth: 2,
          createdAt: DateTime.utc(2026, 3, 7, 8),
        ),
        payout(
          'pay-2',
          'p2',
          5000,
          DateTime.utc(2026, 4, 10),
          createdAt: DateTime.utc(2026, 4, 10, 8),
        ),
      ],
      adjustments: const [],
    );

    final murshed = result.list.firstWhere((p) => p.id == 'p1');
    expect(murshed.totalEarned, 91305);
    expect(murshed.balance, 91305);

    final halim = result.list.firstWhere((p) => p.id == 'p2');
    expect(halim.totalEarned, 39135);
    expect(halim.totalPaid, 31090);
    expect(halim.balance, 8045);

    final chronological = halim.entries.reversed
        .map((e) => e.balanceAfter)
        .toList();
    expect(chronological, [26090, 0, 13045, 8045]);

    expect(result.allocatedPaidByPeriod['2026-02']!['p2'], 26090);
    expect(result.allocatedPaidByPeriod['2026-03']!['p2'], 5000);
  });

  test('credit and debit adjustments allow an advance (negative balance)', () {
    final result = computePartnerLedgers(
      partners: [partners[2]],
      records: [
        record('rec-feb', 2026, 2, 150000, 30000, DateTime.utc(2026, 3, 5)),
      ],
      expenses: [expense(2026, 2, 20000)],
      payouts: [payout('pay', 'p3', 15000, DateTime.utc(2026, 3, 10))],
      adjustments: [
        Adjustment(
          id: 'a1',
          personId: 'p3',
          type: Direction.credit,
          amount: 1000,
          date: DateTime.utc(2026, 3, 1),
          reason: 'Bonus',
          createdAt: DateTime.utc(2026, 3, 1),
        ),
        Adjustment(
          id: 'a2',
          personId: 'p3',
          type: Direction.debit,
          amount: 500,
          date: DateTime.utc(2026, 3, 2),
          reason: 'Write-off',
          createdAt: DateTime.utc(2026, 3, 2),
        ),
      ],
    );
    final tanzina = result.list.single;
    expect(tanzina.totalEarned, 13040);
    expect(tanzina.balance, -1460);
  });

  test('eliminates floating point dust on exact settlements', () {
    final result = computePartnerLedgers(
      partners: [partners[1]],
      records: [record('rec-mar', 2026, 3, 30785, 0, DateTime.utc(2026, 4, 5))],
      expenses: const [],
      payouts: [
        payout(
          'pay',
          'p2',
          8031.806500000001,
          DateTime.utc(2026, 4, 7),
          settlementYear: 2026,
          settlementMonth: 3,
        ),
      ],
      adjustments: const [],
    );
    expect(result.list.single.balance, 0);
    expect(result.list.single.monthlyBreakdown.single.remainingDue, 0);
  });

  test('excludes the ongoing month but still deducts its payments', () {
    final result = computePartnerLedgers(
      partners: [partners[1]],
      records: [
        record('feb', 2026, 2, 150000, 30000, DateTime.utc(2026, 3, 5)),
        record('mar', 2026, 3, 110000, 40000, DateTime.utc(2026, 3, 20)),
      ],
      expenses: [expense(2026, 2, 20000), expense(2026, 3, 20000)],
      payouts: [payout('pay', 'p2', 6090, DateTime.utc(2026, 3, 21))],
      adjustments: const [],
      excludeFrom: const Period(2026, 3),
    );
    expect(result.list.single.totalEarned, 26090);
    expect(result.list.single.balance, 20000);
  });

  test('agent ledger credits entries and deducts payments', () {
    final agents = [
      CommissionAgent(
        id: 'ag',
        name: 'Sourab',
        commissionPercent: 42,
        isActive: true,
        createdAt: DateTime.utc(2026),
      ),
    ];
    final list = computeAgentLedgers(
      agents: agents,
      records: [
        record('feb', 2026, 2, 100000, 40000, DateTime.utc(2026, 3, 5)),
        record('mar', 2026, 3, 100000, 39340, DateTime.utc(2026, 4, 5)),
      ],
      payouts: [payout('p', 'ag', 49340, DateTime.utc(2026, 4, 6))],
      adjustments: const [],
    );
    expect(list.single.totalEarned, 79340);
    expect(list.single.balance, 30000);
    expect(list.single.entries.length, 3);
  });
}
