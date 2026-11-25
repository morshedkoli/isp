// Read-only check against the real database. Writes nothing.
//   MONGO_URL=... dart run tool/smoke_check.dart
// Prints partner/agent balances and per-month settlement figures as JSON so
// they can be compared with the website's own calculations.
import 'dart:convert';
import 'dart:io';

import 'package:mongo_dart/mongo_dart.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/data/documents.dart';
import 'package:isp_admin/domain/ledger.dart';
import 'package:isp_admin/domain/reports.dart';

double r2(double v) => (v * 100).roundToDouble() / 100;

Future<void> main() async {
  final url = Platform.environment['MONGO_URL'];
  if (url == null || url.isEmpty) {
    stderr.writeln('Set MONGO_URL');
    exit(2);
  }
  final db = await Db.create(url);
  await db.open(secure: url.startsWith('mongodb+srv://'));
  try {
    final s = await Docs.readSnapshot(
      (name, [query]) => db.collection(name).find(query ?? {}).toList(),
    );
    final now = currentPeriod();
    final partners = computePartnerLedgers(
      partners: s.partners,
      records: s.records,
      expenses: s.expenses,
      payouts: s.partnerPayouts,
      adjustments: s.partnerAdjustments,
      excludeFrom: now,
    ).list;
    final agents = computeAgentLedgers(
      agents: s.agents,
      records: s.records,
      payouts: s.agentPayouts,
      adjustments: s.agentAdjustments,
      excludeFrom: now,
    );
    final months = <String, Object>{};
    for (final rec in s.records) {
      final m = computeMonthlySummary(s, Period(rec.year, rec.month));
      months[m.period.key] = {
        'net': r2(m.netCommission),
        'expenses': r2(m.totalExpenses),
        'hotspot': r2(m.hotspotRevenue),
        'shares': {
          for (final p in m.partnerShares)
            p.partnerId: [r2(p.dueAmount), r2(p.paidAmount)],
        },
      };
    }
    final o = computeOverview(s);
    stdout.writeln(
      const JsonEncoder.withIndent(' ').convert({
        'partners': {for (final p in partners) p.id: r2(p.balance)},
        'agents': {for (final a in agents) a.id: r2(a.balance)},
        'months': months,
        'overview': {
          'combined': r2(o.combinedBusinessNet),
          'hotspot': r2(o.hotspotRevenue),
          'vouchers': o.hotspotVouchers,
          'expenses': r2(o.totalExpenses),
        },
      }),
    );
  } finally {
    await db.close();
  }
}
