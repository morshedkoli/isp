import 'dart:convert';

import 'package:mongo_dart/mongo_dart.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/data/database.dart';
import 'package:isp_admin/data/documents.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/domain/reports.dart';

/// Reads and writes the same MongoDB collections the Prisma web app uses.
///
/// Prisma conventions this file must keep: `_id`/foreign keys are ObjectIds,
/// enums are strings, `Float` fields are doubles, `Int` fields are ints,
/// `createdAt`/`updatedAt` are set by the client, calendar dates are UTC
/// midnight. Every write is mirrored into `audit_logs` like the website does.
class Repository {
  Repository(this.userId);

  /// The logged-in admin, recorded as creator and in the audit log.
  final String userId;

  static const _client = 'isp_admin_android';

  Future<DbCollection> _c(String name) => Database.instance.collection(name);

  // ─── Reads ──────────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _find(
    String name, [
    Map<String, dynamic>? query,
  ]) async {
    final coll = await _c(name);
    return coll.find(query ?? <String, dynamic>{}).toList();
  }

  /// Every collection the balances, monthly and overview screens need.
  /// Every collection the balances, monthly and overview screens need.
  Future<LedgerSnapshot> loadSnapshot() =>
      Database.guard(() => Docs.readSnapshot(_find), retry: true);

  Future<List<HotspotSale>> hotspotSales(Period period) =>
      Database.guard(() async {
        final rows = await _find('hotspot_sales', {
          'date': {r'$gte': period.start, r'$lte': period.end},
        });
        rows.sort(_newestFirst);
        return rows.map(_sale).toList();
      }, retry: true);

  Future<List<Expense>> expenses(Period period) => Database.guard(() async {
    final rows = await _find('expenses', {
      'year': period.year,
      'month': period.month,
    });
    rows.sort(_newestFirst);
    return rows.map(_expense).toList();
  }, retry: true);

  // ─── Hotspot writes ─────────────────────────────────────────────────────────

  Map<String, dynamic> _saleFields(HotspotSaleInput input) {
    final priced = priceHotspotSale(
      input.package,
      input.quantity,
      input.discount,
    );
    if (priced.error != null) throw DataException(priced.error!);
    return {
      'package': input.package,
      'quantity': input.quantity,
      'discount': input.discount.toDouble(),
      'amount': priced.amount.toDouble(),
      'date': calendarDay(input.date),
      'customerName': _blankToNull(input.customerName),
      'customerPhone': _blankToNull(input.customerPhone),
      'notes': _blankToNull(input.notes),
    };
  }

  Future<void> createHotspotSale(HotspotSaleInput input) =>
      Database.guard(() async {
        final fields = _saleFields(input);
        final id = await _insert('hotspot_sales', {
          ...fields,
          'createdById': _oid(userId),
        });
        await _audit(
          'CREATE',
          'HotspotSale',
          id,
          newData: _pick(fields, ['package', 'quantity', 'amount']),
        );
      });

  Future<void> updateHotspotSale(String id, HotspotSaleInput input) =>
      Database.guard(() async {
        final old = await _findById(
          'hotspot_sales',
          id,
          'This sale no longer exists.',
        );
        final fields = _saleFields(input);
        await _update('hotspot_sales', id, fields);
        await _audit(
          'UPDATE',
          'HotspotSale',
          id,
          oldData: _pick(old, ['package', 'quantity', 'amount']),
          newData: _pick(fields, ['package', 'quantity', 'amount']),
        );
      });

  Future<void> deleteHotspotSale(String id) => Database.guard(() async {
    final old = await _findById(
      'hotspot_sales',
      id,
      'This sale no longer exists.',
    );
    await _delete('hotspot_sales', id);
    await _audit(
      'DELETE',
      'HotspotSale',
      id,
      oldData: _pick(old, ['package', 'quantity', 'amount']),
    );
  });

  // ─── Expense writes ─────────────────────────────────────────────────────────

  Map<String, dynamic> _expenseFields(ExpenseInput input) {
    final description = input.description.trim();
    if (description.isEmpty) {
      throw const DataException('Description is required.');
    }
    if (description.length > 200) {
      throw const DataException('Description is too long.');
    }
    if (!(input.amount > 0) || input.amount > 1e9) {
      throw const DataException('Amount must be greater than zero.');
    }
    final day = calendarDay(input.date);
    return {
      'type': input.type,
      'description': description,
      'amount': input.amount.toDouble(),
      'date': day,
      'month': day.month,
      'year': day.year,
      'notes': _blankToNull(input.notes),
    };
  }

  Future<void> createExpense(ExpenseInput input) => Database.guard(() async {
    final fields = _expenseFields(input);
    final id = await _insert('expenses', {
      ...fields,
      'createdById': _oid(userId),
    });
    await _audit(
      'CREATE',
      'Expense',
      id,
      newData: _pick(fields, ['type', 'description', 'amount']),
    );
  });

  Future<void> updateExpense(String id, ExpenseInput input) =>
      Database.guard(() async {
        final old = await _findById(
          'expenses',
          id,
          'This expense no longer exists.',
        );
        final fields = _expenseFields(input);
        await _update('expenses', id, fields);
        await _audit(
          'UPDATE',
          'Expense',
          id,
          oldData: _pick(old, ['description', 'amount', 'date']),
          newData: _pick(fields, ['description', 'amount', 'date']),
        );
      });

  Future<void> deleteExpense(String id) => Database.guard(() async {
    final old = await _findById(
      'expenses',
      id,
      'This expense no longer exists.',
    );
    await _delete('expenses', id);
    await _audit(
      'DELETE',
      'Expense',
      id,
      oldData: _pick(old, ['type', 'description', 'amount']),
    );
  });

  // ─── Payments & adjustments (partners and field agents) ────────────────────

  static String _payoutCollection(PersonKind k) =>
      k == PersonKind.partner ? 'partner_payouts' : 'agent_payouts';
  static String _adjustmentCollection(PersonKind k) =>
      k == PersonKind.partner ? 'partner_adjustments' : 'agent_adjustments';
  static String _personField(PersonKind k) =>
      k == PersonKind.partner ? 'partnerId' : 'agentId';
  static String _payoutEntity(PersonKind k) =>
      k == PersonKind.partner ? 'PartnerPayout' : 'AgentPayout';
  static String _adjustmentEntity(PersonKind k) =>
      k == PersonKind.partner ? 'PartnerAdjustment' : 'AgentAdjustment';

  Map<String, dynamic> _paymentFields(PaymentInput input) {
    if (!(input.amount > 0)) {
      throw const DataException('Amount must be greater than zero.');
    }
    if (!paymentMethods.contains(input.method)) {
      throw const DataException('Invalid payment method.');
    }
    return {
      'amount': input.amount.toDouble(),
      'date': calendarDay(input.date),
      'method': input.method,
      'referenceId': _blankToNull(input.referenceId),
      'notes': _blankToNull(input.notes),
    };
  }

  Future<void> recordPayment(
    PersonKind kind,
    String personId,
    PaymentInput input,
  ) => Database.guard(() async {
    final fields = _paymentFields(input);
    final doc = <String, dynamic>{
      ...fields,
      _personField(kind): _oid(personId),
    };
    if (kind == PersonKind.partner) {
      doc['isSettlement'] = false;
    } else {
      doc['createdById'] = _oid(userId);
    }
    final id = await _insert(_payoutCollection(kind), doc);
    await _audit(
      'CREATE',
      _payoutEntity(kind),
      id,
      newData: {
        _personField(kind): personId,
        'amount': fields['amount'],
        'method': fields['method'],
      },
    );
  });

  Future<void> updatePayment(
    PersonKind kind,
    String payoutId,
    PaymentInput input,
  ) => Database.guard(() async {
    final old = await _findById(
      _payoutCollection(kind),
      payoutId,
      'Payment not found.',
    );
    final fields = _paymentFields(input);
    await _update(_payoutCollection(kind), payoutId, fields);
    await _audit(
      'UPDATE',
      _payoutEntity(kind),
      payoutId,
      oldData: _pick(old, ['amount', 'method']),
      newData: _pick(fields, ['amount', 'method']),
    );
  });

  Future<void> deletePayment(PersonKind kind, String payoutId) =>
      Database.guard(() async {
        final old = await _findById(
          _payoutCollection(kind),
          payoutId,
          'Payment not found.',
        );
        await _delete(_payoutCollection(kind), payoutId);
        await _audit(
          'DELETE',
          _payoutEntity(kind),
          payoutId,
          oldData: {
            _personField(kind): _ref(old[_personField(kind)]),
            'amount': old['amount'],
          },
        );
      });

  Future<void> recordAdjustment(
    PersonKind kind,
    String personId,
    AdjustmentInput input,
  ) => Database.guard(() async {
    if (!(input.amount > 0)) {
      throw const DataException('Amount must be greater than zero.');
    }
    final reason = input.reason.trim();
    if (reason.isEmpty) throw const DataException('Reason is required.');
    final type = input.type == Direction.credit ? 'CREDIT' : 'DEBIT';
    final id = await _insert(_adjustmentCollection(kind), {
      _personField(kind): _oid(personId),
      'type': type,
      'amount': input.amount.toDouble(),
      'date': calendarDay(input.date),
      'reason': reason,
      'notes': _blankToNull(input.notes),
      'createdById': _oid(userId),
    });
    await _audit(
      'CREATE',
      _adjustmentEntity(kind),
      id,
      newData: {
        _personField(kind): personId,
        'type': type,
        'amount': input.amount,
        'reason': reason,
      },
    );
  });

  Future<void> deleteAdjustment(PersonKind kind, String adjustmentId) =>
      Database.guard(() async {
        await _delete(_adjustmentCollection(kind), adjustmentId);
        await _audit(
          'DELETE',
          _adjustmentEntity(kind),
          adjustmentId,
          oldData: {},
        );
      });

  // ─── Monthly commission record ──────────────────────────────────────────────

  /// Port of `saveCommissionRecord`: upsert the month, replace its sources and
  /// set each agent's amount (agents left out are removed from the month).
  Future<void> saveCommissionRecord({
    required Period period,
    required List<CommissionSource> sources,
    required Map<String, double> agentAmounts,
    String? notes,
  }) => Database.guard(() async {
    final pool = sources.fold(0.0, (sum, s) => sum + s.amount);
    if (pool <= 0) {
      throw const DataException(
        'Enter an ISP commission amount greater than ৳0 before saving.',
      );
    }
    final records = await _c('commission_records');
    final existing = await records.findOne({
      'year': period.year,
      'month': period.month,
    });
    final String recordId;
    if (existing == null) {
      recordId = await _insert('commission_records', {
        'year': period.year,
        'month': period.month,
        'totalPool': pool,
        'ourAmount': 0.0,
        'notes': _blankToNull(notes),
        'createdById': _oid(userId),
      });
    } else {
      recordId = _id(existing);
      await _update('commission_records', recordId, {
        'totalPool': pool,
        'ourAmount': 0.0,
        'notes': _blankToNull(notes),
      });
    }
    final recordOid = _oid(recordId);

    final sourceColl = await _c('commission_sources');
    await sourceColl.deleteMany({'commissionRecordId': recordOid});
    final now = DateTime.now().toUtc();
    final newSources = sources
        .where((s) => s.amount > 0)
        .map(
          (s) => <String, dynamic>{
            '_id': ObjectId(),
            'commissionRecordId': recordOid,
            'description': s.description,
            'amount': s.amount.toDouble(),
            'createdAt': now,
          },
        )
        .toList();
    if (newSources.isNotEmpty) await sourceColl.insertMany(newSources);

    final entries = await _c('agent_commission_entries');
    for (final MapEntry(key: agentId, value: amount) in agentAmounts.entries) {
      final selector = {
        'commissionRecordId': recordOid,
        'agentId': _oid(agentId),
      };
      final found = await entries.findOne(selector);
      if (found == null) {
        await entries.insertOne({
          '_id': ObjectId(),
          ...selector,
          'amount': amount.toDouble(),
          'createdAt': now,
        });
      } else {
        await entries.updateOne(
          {'_id': found['_id']},
          {
            r'$set': {'amount': amount.toDouble()},
          },
        );
      }
    }
    await entries.deleteMany({
      'commissionRecordId': recordOid,
      'agentId': {r'$nin': agentAmounts.keys.map(_oid).toList()},
    });

    if (existing == null) {
      await _audit(
        'CREATE',
        'CommissionRecord',
        recordId,
        newData: {
          'year': period.year,
          'month': period.month,
          'totalPool': pool,
          'ourAmount': 0,
        },
      );
    } else {
      await _audit(
        'UPDATE',
        'CommissionRecord',
        recordId,
        oldData: _pick(existing, ['totalPool', 'ourAmount']),
        newData: {'totalPool': pool, 'ourAmount': 0},
      );
    }
  });

  // ─── Low-level helpers ──────────────────────────────────────────────────────

  Future<String> _insert(String name, Map<String, dynamic> fields) async {
    final now = DateTime.now().toUtc();
    final id = ObjectId();
    final result = await (await _c(
      name,
    )).insertOne({'_id': id, ...fields, 'createdAt': now, 'updatedAt': now});
    if (!result.isSuccess) {
      throw DataException(result.writeError?.errmsg ?? 'Could not save.');
    }
    return id.oid;
  }

  Future<void> _update(
    String name,
    String id,
    Map<String, dynamic> fields,
  ) async {
    final result = await (await _c(name)).updateOne(
      {'_id': _oid(id)},
      {
        r'$set': {...fields, 'updatedAt': DateTime.now().toUtc()},
      },
    );
    if (!result.isSuccess) {
      throw DataException(result.writeError?.errmsg ?? 'Could not update.');
    }
  }

  Future<void> _delete(String name, String id) async {
    final result = await (await _c(name)).deleteOne({'_id': _oid(id)});
    if (!result.isSuccess) {
      throw DataException(result.writeError?.errmsg ?? 'Could not delete.');
    }
  }

  Future<Map<String, dynamic>> _findById(
    String name,
    String id,
    String notFound,
  ) async {
    final doc = await (await _c(name)).findOne({'_id': _oid(id)});
    if (doc == null) throw DataException(notFound);
    return doc;
  }

  /// Best-effort, like the web `createAuditLog`: a failed audit write never
  /// fails the operation it records.
  Future<void> _audit(
    String action,
    String entityType,
    String entityId, {
    Map<String, dynamic>? oldData,
    Map<String, dynamic>? newData,
  }) async {
    try {
      await (await _c('audit_logs')).insertOne({
        '_id': ObjectId(),
        'userId': _oid(userId),
        'action': action,
        'entityType': entityType,
        'entityId': entityId,
        'oldData': oldData == null ? null : jsonEncode(_jsonSafe(oldData)),
        'newData': newData == null ? null : jsonEncode(_jsonSafe(newData)),
        'ipAddress': null,
        'userAgent': _client,
        'createdAt': DateTime.now().toUtc(),
      });
    } on MongoDartError {
      // Intentionally ignored — see doc comment.
    } on Exception {
      // Intentionally ignored — see doc comment.
    }
  }

  static Map<String, dynamic> _jsonSafe(Map<String, dynamic> data) =>
      data.map((k, v) => MapEntry(k, Docs.jsonSafe(v)));

  static Map<String, dynamic> _pick(
    Map<String, dynamic> source,
    List<String> keys,
  ) => {for (final k in keys) k: source[k]};

  static int _newestFirst(Map<String, dynamic> a, Map<String, dynamic> b) =>
      Docs.newestFirst(a, b);
  static ObjectId _oid(String hex) => Docs.oid(hex);
  static String _id(Map<String, dynamic> doc) => Docs.id(doc);
  static String? _ref(Object? v) => Docs.ref(v);
  static String? _blankToNull(String? v) =>
      (v == null || v.trim().isEmpty) ? null : v.trim();
  static HotspotSale _sale(Map<String, dynamic> s) => Docs.sale(s);
  static Expense _expense(Map<String, dynamic> e) => Docs.expense(e);
}
