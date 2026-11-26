import 'package:flutter/material.dart';

import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/domain/reports.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/forms.dart';
import 'package:isp_admin/ui/screens/commission_editor.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

typedef _MonthData = ({MonthlySummary summary, LedgerSnapshot snapshot});

/// One month's settlement — the website's Monthly page.
class MonthlyScreen extends StatelessWidget {
  const MonthlyScreen({required this.menu, super.key});
  final Widget menu;

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).repository;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Monthly'),
        actions: [menu, const SizedBox(width: 8)],
      ),
      body: Column(
        children: [
          const PeriodBar(),
          Expanded(
            child: Loader<_MonthData>(
              load: (period) async {
                final snapshot = await repo.loadSnapshot();
                return (
                  summary: computeMonthlySummary(snapshot, period),
                  snapshot: snapshot,
                );
              },
              builder: (context, data, _) =>
                  _MonthBody(data.summary, data.snapshot),
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthBody extends StatelessWidget {
  const _MonthBody(this.m, this.snapshot);
  final MonthlySummary m;
  final LedgerSnapshot snapshot;

  void _editCommission(BuildContext context) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CommissionEditor(
        period: m.period,
        record: m.record,
        agents: snapshot.agents,
        expenses: m.totalExpenses,
      ),
    ),
  );

  Future<void> _pay(BuildContext context, PartnerShareRow row) {
    final repo = AppScope.of(context).repository;
    return showFormSheet<void>(
      context,
      PaymentForm(
        personName:
            '${row.name} · ${m.period.label} remaining ${formatTaka(row.remainingAmount)}',
        suggested: row.remainingAmount,
        onSave: (input) => runWrite(
          context,
          () => repo.recordPayment(PersonKind.partner, row.partnerId, input),
          success: 'Payment recorded for ${row.name}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final net = m.netCommission;
    final canEdit = AppScope.of(context).canEdit;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.ink,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(
                'Net commission · ${m.period.label}',
                color: const Color(0xB3FFFFFF),
              ),
              const SizedBox(height: 6),
              Money(
                net,
                size: 34,
                color: net >= 0
                    ? const Color(0xFF8FE3BE)
                    : const Color(0xFFFFA48A),
              ),
              const SizedBox(height: 4),
              Text(
                '+ hotspot ${formatTaka(m.hotspotRevenue)} = ${formatTaka(m.combinedNet)} combined',
                style: const TextStyle(color: Color(0xB3FFFFFF)),
              ),
            ],
          ),
        ),
        SectionTitle(
          'Commission',
          trailing: canEdit
              ? TextButton.icon(
                  onPressed: () => _editCommission(context),
                  icon: Icon(
                    m.record == null ? Icons.add : Icons.edit_outlined,
                    size: 18,
                  ),
                  label: Text(m.record == null ? 'Enter' : 'Edit'),
                )
              : null,
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                if (m.record == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'No commission entered for this month yet.',
                      style: TextStyle(color: AppColors.amber),
                    ),
                  ),
                for (final s in m.record?.sources ?? const <CommissionSource>[])
                  FigureLine(s.description, s.amount),
                FigureLine(
                  'ISP commission received',
                  m.companyCommission,
                  bold: true,
                ),
                for (final a in m.agentBreakdown)
                  FigureLine(
                    '${a.agentName} (${formatPercent(a.percent)})',
                    a.amount,
                    prefix: '− ',
                    color: AppColors.violet,
                  ),
                for (final t in expenseTypes)
                  if ((m.expenseTotals[t.key] ?? 0) > 0)
                    FigureLine(
                      t.title,
                      m.expenseTotals[t.key] ?? 0,
                      prefix: '− ',
                      color: AppColors.loss,
                    ),
                const Divider(),
                FigureLine(
                  'Net commission',
                  net,
                  bold: true,
                  color: net >= 0 ? AppColors.emeraldDeep : AppColors.loss,
                ),
              ],
            ),
          ),
        ),
        const SectionTitle('Partner shares'),
        if (m.partnerShares.isEmpty) const EmptyNote('No active partners'),
        for (final p in m.partnerShares)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${p.name} · ${formatPercent(p.sharePercent)}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        Money(p.dueAmount, size: 16),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        minHeight: 7,
                        value: p.dueAmount <= 0
                            ? 0
                            : (p.paidAmount / p.dueAmount)
                                  .clamp(0, 1)
                                  .toDouble(),
                        backgroundColor: AppColors.rule,
                        color: AppColors.emerald,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Paid ${formatTaka(p.paidAmount)} · remaining ${formatTaka(p.remainingAmount)}\n'
                            'Overall balance ${formatTaka(p.balance)}',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12.5,
                            ),
                          ),
                        ),
                        if (canEdit && p.remainingAmount > 0)
                          FilledButton.tonal(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 40),
                            ),
                            onPressed: () => _pay(context, p),
                            child: const Text('Give money'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        if (m.periodPayouts.isNotEmpty) ...[
          const SectionTitle('Money given this month'),
          Card(
            child: Column(
              children: [
                for (final (i, row) in m.periodPayouts.indexed) ...[
                  if (i > 0) const Divider(indent: 16, endIndent: 16),
                  ListTile(
                    dense: true,
                    title: Text(
                      row.partnerName,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      [
                        formatDate(row.payout.date),
                        formatPaymentMethod(row.payout.method),
                        if (row.payout.notes != null) row.payout.notes!,
                      ].join(' · '),
                    ),
                    trailing: Money(row.payout.amount, size: 14),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SectionTitle('Hotspot'),
        TileRow(
          StatTile(
            label: 'Revenue',
            amount: m.hotspotRevenue,
            accent: AppColors.amber,
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Eyebrow('Vouchers'),
                  const SizedBox(height: 4),
                  Text(
                    '${m.hotspotVouchers}',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      fontFeatures: tabular,
                    ),
                  ),
                  Text(
                    'in ${m.hotspotCount} sales',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
