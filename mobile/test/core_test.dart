import 'package:flutter_test/flutter_test.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/domain/reports.dart';

void main() {
  group('business dates (Asia/Dhaka)', () {
    test('a calendar day is stored as UTC midnight', () {
      expect(
        calendarDay(DateTime(2026, 8, 1, 23, 30)),
        DateTime.utc(2026, 8, 1),
      );
    });

    test('periodOf reads the month in Dhaka, not UTC', () {
      // 2026-07-31 20:00 UTC is already 1 August in Dhaka.
      expect(periodOf(DateTime.utc(2026, 7, 31, 20)), const Period(2026, 8));
      expect(periodOf(DateTime.utc(2026, 8, 1)), const Period(2026, 8));
    });

    test('period bounds cover the whole month', () {
      const p = Period(2026, 2);
      expect(p.start, DateTime.utc(2026, 2, 1));
      expect(p.end, DateTime.utc(2026, 2, 28, 23, 59, 59, 999));
      expect(p.previous, const Period(2026, 1));
      expect(const Period(2026, 12).next, const Period(2027, 1));
      expect(p.key, '2026-02');
      expect(p.label, 'February 2026');
    });
  });

  group('formatting', () {
    test('formats taka with grouping and minus sign', () {
      expect(formatTaka(1234567), '৳1,234,567');
      expect(formatTaka(-500), '−৳500');
      expect(formatTaka(12.5, decimals: true), '৳12.50');
      expect(formatTaka(0.4), '৳0');
    });

    test('formats percentages like the web', () {
      expect(formatPercent(60), '60%');
      expect(formatPercent(60.87), '60.9%');
    });

    test('cleanMoney removes float dust', () {
      expect(cleanMoney(8031.806500000001 - 8031.8065), 0);
      expect(cleanMoney(1.23456789), 1.2346);
    });

    test('parseAmount accepts commas and rejects junk', () {
      expect(parseAmount('1,200'), 1200);
      expect(parseAmount('abc'), isNull);
    });
  });

  group('hotspot pricing', () {
    test('prices from the package table minus discount', () {
      expect(priceHotspotSale('SEVEN_DAY', 3, 10).amount, 140);
      expect(priceHotspotSale('THIRTY_DAY', 1, 0).amount, 200);
    });

    test('rejects a discount above the gross price', () {
      expect(priceHotspotSale('SEVEN_DAY', 1, 60).error, isNotNull);
    });

    test('rejects unknown packages and zero quantity', () {
      expect(priceHotspotSale('NOPE', 1, 0).error, isNotNull);
      expect(priceHotspotSale('SEVEN_DAY', 0, 0).error, isNotNull);
    });
  });

  test('agent suggestion matches the web calculator', () {
    expect(suggestedAgentCommission(4900, 42), 4200);
    expect(suggestedAgentCommission(4900, 0), 4200); // 0% falls back to 42
  });

  test('monthly summary computes net and partner dues', () {
    final snapshot = LedgerSnapshot(
      partners: [
        Partner(
          id: 'p',
          name: 'A',
          email: '',
          sharePercent: 50,
          isActive: true,
          createdAt: DateTime.utc(2026),
        ),
      ],
      agents: const [],
      records: [
        CommissionRecord(
          id: 'r',
          year: 2026,
          month: 2,
          totalPool: 10000,
          createdAt: DateTime.utc(2026, 3, 1),
          sources: const [CommissionSource('ISP', 10000)],
          agentEntries: const [
            AgentCommissionEntry(id: 'e', agentId: 'ag', amount: 2000),
          ],
        ),
      ],
      expenses: [
        Expense(
          id: 'x',
          type: 'RENT',
          description: 'r',
          amount: 1000,
          date: DateTime.utc(2026, 2, 3),
          year: 2026,
          month: 2,
        ),
      ],
      partnerPayouts: const [],
      partnerAdjustments: const [],
      agentPayouts: const [],
      agentAdjustments: const [],
      hotspotSales: [
        HotspotSale(
          id: 'h',
          package: 'SEVEN_DAY',
          quantity: 2,
          discount: 0,
          amount: 100,
          date: DateTime.utc(2026, 2, 10),
        ),
      ],
    );
    final m = computeMonthlySummary(
      snapshot,
      const Period(2026, 2),
      now: const Period(2026, 4),
    );
    expect(m.netCommission, 7000);
    expect(m.combinedNet, 7100);
    expect(m.partnerShares.single.dueAmount, 3500);
    expect(m.partnerShares.single.balance, 3500);
    expect(m.hotspotVouchers, 2);

    final o = computeOverview(snapshot, now: const Period(2026, 4));
    expect(o.totalNetCommission, 7000);
    expect(o.combinedBusinessNet, 7100);
    expect(o.history.single.period, const Period(2026, 2));
  });
}
