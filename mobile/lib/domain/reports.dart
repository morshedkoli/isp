/// Monthly settlement and all-time overview math — ports of the web app's
/// `src/lib/settlement.ts`, the Monthly page loader and the Dashboard loader.
library;

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/ledger.dart';
import 'package:isp_admin/domain/models.dart';

class PartnerShareRow {
  const PartnerShareRow({
    required this.partnerId,
    required this.name,
    required this.sharePercent,
    required this.dueAmount,
    required this.paidAmount,
    required this.balance,
  });

  final String partnerId;
  final String name;
  final double sharePercent;
  final double dueAmount;
  final double paidAmount;
  final double balance;

  double get remainingAmount {
    final raw = dueAmount - paidAmount;
    return raw > 0.005 ? raw : 0;
  }
}

class AgentShareRow {
  const AgentShareRow(this.agentName, this.percent, this.amount);
  final String agentName;
  final double percent;
  final double amount;
}

class PeriodPayoutRow {
  const PeriodPayoutRow(this.partnerName, this.payout);
  final String partnerName;
  final Payout payout;
}

class MonthlySummary {
  const MonthlySummary({
    required this.period,
    required this.record,
    required this.companyCommission,
    required this.agentPayouts,
    required this.agentBreakdown,
    required this.expenseTotals,
    required this.totalExpenses,
    required this.netCommission,
    required this.hotspotRevenue,
    required this.hotspotVouchers,
    required this.hotspotCount,
    required this.partnerShares,
    required this.periodPayouts,
  });

  final Period period;
  final CommissionRecord? record;
  final double companyCommission;
  final double agentPayouts;
  final List<AgentShareRow> agentBreakdown;

  /// Expense type key → total for the month.
  final Map<String, double> expenseTotals;
  final double totalExpenses;
  final double netCommission;
  final double hotspotRevenue;
  final int hotspotVouchers;
  final int hotspotCount;
  final List<PartnerShareRow> partnerShares;
  final List<PeriodPayoutRow> periodPayouts;

  double get combinedNet => cleanMoney(netCommission + hotspotRevenue);
}

MonthlySummary computeMonthlySummary(
  LedgerSnapshot s,
  Period period, {
  Period? now,
}) {
  final record = s.records.where(
    (r) => r.year == period.year && r.month == period.month,
  );
  final rec = record.isEmpty ? null : record.first;

  final expenseTotals = {for (final t in expenseTypes) t.key: 0.0};
  for (final e in s.expenses.where(
    (e) => e.year == period.year && e.month == period.month,
  )) {
    expenseTotals[e.type] = (expenseTotals[e.type] ?? 0) + e.amount;
  }
  final totalExpenses = expenseTotals.values.fold(0.0, (a, b) => a + b);
  final companyCommission = rec?.totalPool ?? 0;
  final agentPayouts = rec?.agentTotal ?? 0;
  final netCommission = companyCommission - agentPayouts - totalExpenses;

  final ledgers = computePartnerLedgers(
    partners: s.partners,
    records: s.records,
    expenses: s.expenses,
    payouts: s.partnerPayouts,
    adjustments: s.partnerAdjustments,
    excludeFrom: now ?? currentPeriod(),
  );
  final paidBy = ledgers.allocatedPaidByPeriod[period.key] ?? const {};
  final shares = ledgers.list.where((p) => p.isActive).map((p) {
    final due = netCommission > 0 ? netCommission * p.percent / 100 : 0.0;
    return PartnerShareRow(
      partnerId: p.id,
      name: p.name,
      sharePercent: p.percent,
      dueAmount: due,
      paidAmount: paidBy[p.id] ?? 0,
      balance: cleanMoney(p.balance),
    );
  }).toList();

  final agentsById = {for (final a in s.agents) a.id: a};
  final agentBreakdown = (rec?.agentEntries ?? const <AgentCommissionEntry>[])
      .map((e) {
        final agent = agentsById[e.agentId];
        return AgentShareRow(
          agent?.name ?? 'Agent',
          agent?.commissionPercent ?? 0,
          e.amount,
        );
      })
      .toList();

  var hotspotRevenue = 0.0;
  var vouchers = 0;
  var count = 0;
  for (final sale in s.hotspotSales) {
    if (!_inPeriod(sale.date, period)) continue;
    hotspotRevenue += sale.amount;
    vouchers += sale.quantity;
    count++;
  }

  final partnersById = {for (final p in s.partners) p.id: p};
  final payouts =
      s.partnerPayouts
          .where(
            (p) =>
                _inPeriod(p.date, period) ||
                (p.isSettlement &&
                    p.settlementYear == period.year &&
                    p.settlementMonth == period.month),
          )
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));

  return MonthlySummary(
    period: period,
    record: rec,
    companyCommission: companyCommission,
    agentPayouts: agentPayouts,
    agentBreakdown: agentBreakdown,
    expenseTotals: expenseTotals,
    totalExpenses: totalExpenses,
    netCommission: netCommission,
    hotspotRevenue: hotspotRevenue,
    hotspotVouchers: vouchers,
    hotspotCount: count,
    partnerShares: shares,
    periodPayouts: payouts
        .map(
          (p) =>
              PeriodPayoutRow(partnersById[p.personId]?.name ?? 'Partner', p),
        )
        .toList(),
  );
}

/// Matches the web's `date >= start && date <= end` range filter.
bool _inPeriod(DateTime date, Period period) =>
    !date.isBefore(period.start) && !date.isAfter(period.end);

class MonthHistoryRow {
  const MonthHistoryRow({
    required this.period,
    required this.hasCommission,
    required this.companyCommission,
    required this.agentPayouts,
    required this.expenses,
    required this.hotspotRevenue,
  });

  final Period period;
  final bool hasCommission;
  final double companyCommission;
  final double agentPayouts;
  final double expenses;
  final double hotspotRevenue;

  double get netCommission =>
      cleanMoney(companyCommission - agentPayouts - expenses);
}

class Overview {
  const Overview({
    required this.spanLabel,
    required this.totalCompanyCommission,
    required this.totalAgentPayouts,
    required this.totalExpenses,
    required this.expensesByType,
    required this.hotspotRevenue,
    required this.hotspotVouchers,
    required this.sevenDayVouchers,
    required this.thirtyDayVouchers,
    required this.partners,
    required this.history,
  });

  final String spanLabel;
  final double totalCompanyCommission;
  final double totalAgentPayouts;
  final double totalExpenses;
  final Map<String, double> expensesByType;
  final double hotspotRevenue;
  final int hotspotVouchers;
  final int sevenDayVouchers;
  final int thirtyDayVouchers;
  final List<PersonLedger> partners;
  final List<MonthHistoryRow> history;

  double get totalNetCommission =>
      cleanMoney(totalCompanyCommission - totalAgentPayouts - totalExpenses);
  double get combinedBusinessNet =>
      cleanMoney(totalNetCommission + hotspotRevenue);
  double get totalPartnerPayable => cleanMoney(
    partners.fold(0.0, (sum, p) => sum + (p.balance > 0 ? p.balance : 0)),
  );
  double get totalPartnerGiven =>
      cleanMoney(partners.fold(0.0, (sum, p) => sum + p.totalGiven));
}

/// Port of the Dashboard page's all-time `getOverviewData`.
Overview computeOverview(LedgerSnapshot s, {Period? now}) {
  final totalCommission = cleanMoney(
    s.records.fold(0.0, (sum, r) => sum + r.totalPool),
  );
  final totalAgent = cleanMoney(
    s.records.fold(0.0, (sum, r) => sum + r.agentTotal),
  );

  final byType = {for (final t in expenseTypes) t.key: 0.0};
  for (final e in s.expenses) {
    byType[e.type] = cleanMoney((byType[e.type] ?? 0) + e.amount);
  }
  final totalExpenses = cleanMoney(byType.values.fold(0.0, (a, b) => a + b));

  var hotspotRevenue = 0.0;
  var vouchers = 0;
  var seven = 0;
  var thirty = 0;
  final hotspotByPeriod = <String, double>{};
  for (final sale in s.hotspotSales) {
    hotspotRevenue = cleanMoney(hotspotRevenue + sale.amount);
    vouchers += sale.quantity;
    if (sale.package == 'SEVEN_DAY') seven += sale.quantity;
    if (sale.package == 'THIRTY_DAY') thirty += sale.quantity;
    final key = periodOf(sale.date).key;
    hotspotByPeriod[key] = cleanMoney(
      (hotspotByPeriod[key] ?? 0) + sale.amount,
    );
  }

  final recordsByKey = {
    for (final r in s.records) Period(r.year, r.month).key: r,
  };
  final expenseMap = expensesByPeriod(s.expenses);
  final keys = {
    ...recordsByKey.keys,
    ...expenseMap.keys,
    ...hotspotByPeriod.keys,
  }.map(Period.parseKey).toList()..sort((a, b) => b.compareTo(a));

  final history = keys.map((p) {
    final rec = recordsByKey[p.key];
    return MonthHistoryRow(
      period: p,
      hasCommission: rec != null,
      companyCommission: cleanMoney(rec?.totalPool ?? 0),
      agentPayouts: cleanMoney(rec?.agentTotal ?? 0),
      expenses: cleanMoney(expenseMap[p.key] ?? 0),
      hotspotRevenue: hotspotByPeriod[p.key] ?? 0,
    );
  }).toList();

  final ledgers = computePartnerLedgers(
    partners: s.partners,
    records: s.records,
    expenses: s.expenses,
    payouts: s.partnerPayouts,
    adjustments: s.partnerAdjustments,
    excludeFrom: now ?? currentPeriod(),
  );

  final span = keys.isEmpty
      ? 'All recorded periods'
      : keys.first == keys.last
      ? keys.first.label
      : '${keys.last.label} – ${keys.first.label}';

  return Overview(
    spanLabel: span,
    totalCompanyCommission: totalCommission,
    totalAgentPayouts: totalAgent,
    totalExpenses: totalExpenses,
    expensesByType: byType,
    hotspotRevenue: hotspotRevenue,
    hotspotVouchers: vouchers,
    sevenDayVouchers: seven,
    thirtyDayVouchers: thirty,
    partners: ledgers.list,
    history: history,
  );
}

/// Hotspot sale pricing from the fixed package table (never trust a typed amount).
({double amount, String? error}) priceHotspotSale(
  String package,
  int quantity,
  double discount,
) {
  final pkg = hotspotPackages[package];
  if (pkg == null) return (amount: 0, error: 'Unknown hotspot package.');
  if (quantity < 1) return (amount: 0, error: 'Quantity must be at least 1.');
  if (discount < 0) return (amount: 0, error: 'Discount cannot be negative.');
  final gross = pkg.price * quantity;
  if (discount > gross) {
    return (
      amount: 0,
      error: 'Discount cannot exceed the total package price.',
    );
  }
  return (amount: gross - discount, error: null);
}
