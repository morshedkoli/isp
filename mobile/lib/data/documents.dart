import 'package:fixnum/fixnum.dart';
import 'package:mongo_dart/mongo_dart.dart';

import 'package:isp_admin/domain/models.dart';

/// Reads one collection, optionally filtered.
typedef FindDocs =
    Future<List<Map<String, dynamic>>> Function(
      String collection, [
      Map<String, dynamic>? query,
    ]);

/// Maps Prisma-shaped MongoDB documents into domain models. Pure Dart (no
/// Flutter), so the read-only `tool/smoke_check.dart` can reuse it.
///
/// Prisma stores `Int` fields as BSON int64, which mongo_dart decodes to
/// fixnum's [Int64] — not a Dart `num` — so every numeric read goes through
/// [Docs.number]/[Docs.integer].
abstract final class Docs {
  /// Loads everything the balances, monthly and overview screens need.
  static Future<LedgerSnapshot> readSnapshot(FindDocs find) async {
    // Sequential on purpose: Atlas resets the socket when mongo_dart sends
    // many concurrent requests over one connection.
    final results = <List<Map<String, dynamic>>>[];
    for (final (name, query) in const [
      ('partners', null),
      ('users', {'role': 'PARTNER'}),
      ('commission_agents', null),
      ('commission_records', null),
      ('agent_commission_entries', null),
      ('commission_sources', null),
      ('expenses', null),
      ('partner_payouts', null),
      ('partner_adjustments', null),
      ('agent_payouts', null),
      ('agent_adjustments', null),
      ('hotspot_sales', null),
    ]) {
      results.add(await find(name, query));
    }
    final usersById = {for (final u in results[1]) id(u): u};
    // Partner users may have other roles too; fetch any that are missing.
    final missing = results[0]
        .map((p) => ref(p['userId']))
        .where((id) => id != null && !usersById.containsKey(id))
        .map((id) => ObjectId.fromHexString(id!))
        .toList();
    if (missing.isNotEmpty) {
      for (final u in await find('users', {
        '_id': {r'$in': missing},
      })) {
        usersById[id(u)] = u;
      }
    }

    final entriesByRecord = <String, List<AgentCommissionEntry>>{};
    for (final e in results[4]) {
      entriesByRecord
          .putIfAbsent(ref(e['commissionRecordId']) ?? '', () => [])
          .add(
            AgentCommissionEntry(
              id: id(e),
              agentId: ref(e['agentId']) ?? '',
              amount: number(e['amount']),
            ),
          );
    }
    final sourcesByRecord = <String, List<CommissionSource>>{};
    for (final s in results[5]) {
      sourcesByRecord
          .putIfAbsent(ref(s['commissionRecordId']) ?? '', () => [])
          .add(CommissionSource(str(s['description']), number(s['amount'])));
    }

    return LedgerSnapshot(
      partners:
          results[0].map((p) {
            final user = usersById[ref(p['userId'])];
            return Partner(
              id: id(p),
              name: strOr(user?['name'], 'Partner'),
              email: strOr(user?['email'], ''),
              phone: opt(user?['phone']),
              sharePercent: number(p['sharePercent']),
              isActive: p['isActive'] != false,
              createdAt: date(p['createdAt']),
            );
          }).toList()..sort((a, b) {
            if (a.isActive != b.isActive) return a.isActive ? -1 : 1;
            final share = b.sharePercent.compareTo(a.sharePercent);
            return share != 0 ? share : a.createdAt.compareTo(b.createdAt);
          }),
      agents: (results[2].map(agent).toList()
        ..sort((a, b) {
          if (a.isActive != b.isActive) return a.isActive ? -1 : 1;
          return a.createdAt.compareTo(b.createdAt);
        })),
      records: results[3].map((r) {
        final recordId = id(r);
        return CommissionRecord(
          id: recordId,
          year: integer(r['year']),
          month: integer(r['month']),
          totalPool: number(r['totalPool']),
          notes: opt(r['notes']),
          createdAt: date(r['createdAt']),
          sources: sourcesByRecord[recordId] ?? const [],
          agentEntries: entriesByRecord[recordId] ?? const [],
        );
      }).toList(),
      expenses: results[6].map(expense).toList(),
      partnerPayouts: results[7].map((p) => payout(p, 'partnerId')).toList(),
      partnerAdjustments: results[8]
          .map((a) => adjustment(a, 'partnerId'))
          .toList(),
      agentPayouts: results[9].map((p) => payout(p, 'agentId')).toList(),
      agentAdjustments: results[10]
          .map((a) => adjustment(a, 'agentId'))
          .toList(),
      hotspotSales: results[11].map(sale).toList(),
    );
  }

  static int newestFirst(Map<String, dynamic> a, Map<String, dynamic> b) {
    final d = date(b['date']).compareTo(date(a['date']));
    return d != 0 ? d : date(b['createdAt']).compareTo(date(a['createdAt']));
  }

  static ObjectId oid(String hex) => ObjectId.fromHexString(hex);
  static String id(Map<String, dynamic> doc) => ref(doc['_id']) ?? '';
  static String? ref(Object? v) => switch (v) {
    ObjectId() => v.oid,
    String() => v,
    _ => null,
  };

  static bool isNumber(Object? v) => v is num || v is Int64 || v is Int32;

  static double number(Object? v) => switch (v) {
    num() => v.toDouble(),
    Int64() => v.toDouble(),
    Int32() => v.toDouble(),
    _ => 0,
  };

  static int integer(Object? v) => switch (v) {
    num() => v.toInt(),
    Int64() => v.toInt(),
    Int32() => v.toInt(),
    _ => 0,
  };

  /// A value safe for `jsonEncode` (audit log payloads).
  static Object? jsonSafe(Object? v) => switch (v) {
    DateTime() => v.toUtc().toIso8601String(),
    ObjectId() => v.oid,
    Int64() => v.toInt(),
    Int32() => v.toInt(),
    _ => v,
  };

  static String str(Object? v) => v is String ? v : '';
  static String strOr(Object? v, String fallback) =>
      v is String && v.isNotEmpty ? v : fallback;
  static String? opt(Object? v) => v is String && v.isNotEmpty ? v : null;
  static DateTime date(Object? v) => v is DateTime
      ? v.toUtc()
      : DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

  static CommissionAgent agent(Map<String, dynamic> a) => CommissionAgent(
    id: id(a),
    name: str(a['name']),
    phone: opt(a['phone']),
    commissionPercent: number(a['commissionPercent']),
    isActive: a['isActive'] != false,
    notes: opt(a['notes']),
    createdAt: date(a['createdAt']),
  );

  static Expense expense(Map<String, dynamic> e) => Expense(
    id: id(e),
    type: str(e['type']),
    description: str(e['description']),
    amount: number(e['amount']),
    date: date(e['date']),
    year: integer(e['year']),
    month: integer(e['month']),
    notes: opt(e['notes']),
  );

  static HotspotSale sale(Map<String, dynamic> s) => HotspotSale(
    id: id(s),
    package: str(s['package']),
    quantity: integer(s['quantity']),
    discount: number(s['discount']),
    amount: number(s['amount']),
    date: date(s['date']),
    customerName: opt(s['customerName']),
    customerPhone: opt(s['customerPhone']),
    notes: opt(s['notes']),
  );

  static Payout payout(Map<String, dynamic> p, String personField) => Payout(
    id: id(p),
    personId: ref(p[personField]) ?? '',
    amount: number(p['amount']),
    date: date(p['date']),
    method: strOr(p['method'], 'OTHER'),
    referenceId: opt(p['referenceId']),
    notes: opt(p['notes']),
    isSettlement: p['isSettlement'] == true,
    settlementYear: isNumber(p['settlementYear'])
        ? integer(p['settlementYear'])
        : null,
    settlementMonth: isNumber(p['settlementMonth'])
        ? integer(p['settlementMonth'])
        : null,
    createdAt: date(p['createdAt']),
  );

  static Adjustment adjustment(Map<String, dynamic> a, String personField) =>
      Adjustment(
        id: id(a),
        personId: ref(a[personField]) ?? '',
        type: a['type'] == 'CREDIT' ? Direction.credit : Direction.debit,
        amount: number(a['amount']),
        date: date(a['date']),
        reason: str(a['reason']),
        notes: opt(a['notes']),
        createdAt: date(a['createdAt']),
      );
}
