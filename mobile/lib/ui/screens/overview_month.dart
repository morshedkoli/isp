import 'package:flutter/material.dart';

import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/reports.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

/// The current month at the top of the Overview tab: this month's net,
/// commission, agent payouts, expenses, hotspot and partner shares.
class CurrentMonthSection extends StatelessWidget {
  const CurrentMonthSection(this.m, {super.key});
  final MonthlySummary m;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _MonthHero(m),
      const SizedBox(height: 12),
      TileRow(
        StatTile(
          label: 'ISP commission',
          amount: m.companyCommission,
          accent: AppColors.emerald,
        ),
        StatTile(
          label: 'Agent payouts',
          amount: m.agentPayouts,
          accent: AppColors.violet,
        ),
      ),
      const SizedBox(height: 10),
      TileRow(
        StatTile(
          label: 'Expenses',
          amount: m.totalExpenses,
          accent: AppColors.loss,
        ),
        StatTile(
          label: 'Hotspot',
          amount: m.hotspotRevenue,
          accent: AppColors.amber,
          caption: '${m.hotspotVouchers} vouchers',
        ),
      ),
      if (m.partnerShares.isNotEmpty) ...[
        SectionTitle('Partner shares · ${m.period.label}'),
        Card(
          child: Column(
            children: [
              for (final (i, p) in m.partnerShares.indexed) ...[
                if (i > 0) const Divider(indent: 16, endIndent: 16),
                _ShareTile(p),
              ],
            ],
          ),
        ),
      ],
    ],
  );
}

class _MonthHero extends StatelessWidget {
  const _MonthHero(this.m);
  final MonthlySummary m;

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
        Eyebrow(
          'This month · ${m.period.label}',
          color: const Color(0xCCDDF1E7),
        ),
        const SizedBox(height: 8),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Money(m.combinedNet, size: 38, color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(
          m.record == null
              ? 'Combined net · commission not entered yet'
              : 'Combined net · commission + hotspot',
          style: const TextStyle(color: Color(0xCCDDF1E7)),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            _HeroFigure('Net commission', m.netCommission),
            _HeroFigure('Hotspot', m.hotspotRevenue),
            _HeroFigure('Expenses', m.totalExpenses),
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

class _ShareTile extends StatelessWidget {
  const _ShareTile(this.p);
  final PartnerShareRow p;

  @override
  Widget build(BuildContext context) {
    final remaining = p.remainingAmount;
    return ListTile(
      title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(
        '${formatPercent(p.sharePercent)} · due ${formatTaka(p.dueAmount)}'
        ' · paid ${formatTaka(p.paidAmount)}',
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Money(
            remaining,
            color: remaining > 0 ? AppColors.loss : AppColors.emeraldDeep,
          ),
          Text(
            remaining > 0 ? 'to pay' : 'paid',
            style: const TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
