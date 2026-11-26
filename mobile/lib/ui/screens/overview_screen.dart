import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/domain/reports.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/screens/overview_month.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

typedef _OverviewData = ({MonthlySummary month, Overview all});

/// The current month first, then the all-time overview (the website's
/// Dashboard page).
class OverviewScreen extends StatelessWidget {
  const OverviewScreen({required this.menu, super.key});
  final Widget menu;

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).repository;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Overview'),
        actions: [menu, const SizedBox(width: 8)],
      ),
      body: Loader<_OverviewData>(
        watchPeriod: false,
        load: (_) async {
          final snapshot = await repo.loadSnapshot();
          return (
            month: computeMonthlySummary(snapshot, currentPeriod()),
            all: computeOverview(snapshot),
          );
        },
        builder: (context, data, _) => _body(data),
      ),
    );
  }

  Widget _body(_OverviewData data) {
    final o = data.all;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        CurrentMonthSection(data.month),
        const SectionTitle('All time'),
        _Hero(o),
        const SizedBox(height: 12),
        TileRow(
          StatTile(
            label: 'ISP commission',
            amount: o.totalCompanyCommission,
            accent: AppColors.emerald,
          ),
          StatTile(
            label: 'Agent payouts',
            amount: o.totalAgentPayouts,
            accent: AppColors.violet,
          ),
        ),
        const SizedBox(height: 10),
        TileRow(
          StatTile(
            label: 'Expenses',
            amount: o.totalExpenses,
            accent: AppColors.loss,
          ),
          StatTile(
            label: 'Hotspot',
            amount: o.hotspotRevenue,
            accent: AppColors.amber,
            caption:
                '${o.hotspotVouchers} vouchers · ${o.sevenDayVouchers}×7d · ${o.thirtyDayVouchers}×30d',
          ),
        ),
        SectionTitle(
          'Partners',
          trailing: Text(
            'Payable ${formatTaka(o.totalPartnerPayable)}',
            style: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Card(
          child: Column(
            children: [
              for (final (i, p) in o.partners.indexed) ...[
                if (i > 0) const Divider(indent: 16, endIndent: 16),
                ListTile(
                  title: Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    '${formatPercent(p.percent)} share · given ${formatTaka(p.totalGiven)}'
                    '${p.isActive ? '' : ' · inactive'}',
                  ),
                  trailing: _BalanceText(p.balance),
                ),
              ],
              if (o.partners.isEmpty) const EmptyNote('No partners yet'),
            ],
          ),
        ),
        const SectionTitle('Expenses by category'),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                for (final t in expenseTypes)
                  if ((o.expensesByType[t.key] ?? 0) > 0)
                    FigureLine(t.title, o.expensesByType[t.key] ?? 0),
                const Divider(),
                FigureLine(
                  'Total',
                  o.totalExpenses,
                  bold: true,
                  color: AppColors.loss,
                ),
              ],
            ),
          ),
        ),
        const SectionTitle('Month by month'),
        if (o.history.isEmpty) const EmptyNote('Nothing recorded yet'),
        for (final row in o.history) _HistoryCard(row),
      ],
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero(this.o);
  final Overview o;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(24),
      gradient: const LinearGradient(
        colors: [AppColors.emeraldDeep, AppColors.emerald],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      boxShadow: const [
        BoxShadow(
          color: Color(0x33064532),
          blurRadius: 24,
          offset: Offset(0, 12),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Eyebrow(
          'Combined business net · all time',
          color: Color(0xCCDDF1E7),
        ),
        const SizedBox(height: 8),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Money(o.combinedBusinessNet, size: 38, color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(o.spanLabel, style: const TextStyle(color: Color(0xCCDDF1E7))),
        const SizedBox(height: 16),
        Row(
          children: [
            _HeroFigure('Net commission', o.totalNetCommission),
            _HeroFigure('Hotspot', o.hotspotRevenue),
            _HeroFigure('Given to partners', o.totalPartnerGiven),
          ],
        ),
      ],
    ),
  );
}

class _HeroFigure extends StatelessWidget {
  const _HeroFigure(this.label, this.amount);
  final String label;
  final double amount;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xB3DDF1E7), fontSize: 11),
        ),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Money(amount, size: 15, color: Colors.white),
        ),
      ],
    ),
  );
}

class _BalanceText extends StatelessWidget {
  const _BalanceText(this.balance);
  final double balance;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Money(
        balance.abs(),
        color: balance >= 0 ? AppColors.emeraldDeep : AppColors.loss,
      ),
      Text(
        balance > 0 ? 'payable' : (balance < 0 ? 'advance' : 'settled'),
        style: const TextStyle(fontSize: 11, color: AppColors.muted),
      ),
    ],
  );
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard(this.row);
  final MonthHistoryRow row;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  row.period.label,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(width: 8),
                if (!row.hasCommission)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.amberSoft,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'no commission',
                      style: TextStyle(fontSize: 10.5, color: AppColors.amber),
                    ),
                  ),
                const Spacer(),
                Money(
                  row.netCommission,
                  size: 15,
                  color: row.netCommission >= 0
                      ? AppColors.emeraldDeep
                      : AppColors.loss,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 14,
              runSpacing: 4,
              children: [
                _mini('Commission', row.companyCommission),
                _mini('Agents', row.agentPayouts),
                _mini('Expenses', row.expenses),
                _mini('Hotspot', row.hotspotRevenue),
              ],
            ),
          ],
        ),
      ),
    ),
  );

  Widget _mini(String label, double v) => Text.rich(
    TextSpan(
      children: [
        TextSpan(
          text: '$label ',
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        TextSpan(
          text: formatTaka(v),
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 12,
            fontFeatures: tabular,
          ),
        ),
      ],
    ),
  );
}
