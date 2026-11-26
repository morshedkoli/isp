import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/data/repository.dart';
import 'package:isp_admin/domain/ledger.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/forms.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

typedef Balances = ({
  List<PersonLedger> partners,
  List<PersonLedger> agents,
  LedgerSnapshot snapshot,
});

/// Partner & agent balances, same numbers as the website's Balances page.
Future<Balances> loadBalances(Repository repo) async {
  final s = await repo.loadSnapshot();
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
  return (partners: partners, agents: agents, snapshot: s);
}

class BalancesScreen extends StatefulWidget {
  const BalancesScreen({required this.menu, super.key});
  final Widget menu;

  @override
  State<BalancesScreen> createState() => _BalancesScreenState();
}

class _BalancesScreenState extends State<BalancesScreen> {
  PersonKind _kind = PersonKind.partner;

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).repository;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Balances'),
        actions: [widget.menu, const SizedBox(width: 8)],
      ),
      body: Loader<Balances>(
        watchPeriod: false,
        load: (_) => loadBalances(repo),
        builder: (context, data, _) {
          final people = _kind == PersonKind.partner
              ? data.partners
              : data.agents;
          final payable = people.fold(
            0.0,
            (sum, p) => sum + (p.balance > 0 ? p.balance : 0),
          );
          final advance = people.fold(
            0.0,
            (sum, p) => sum + (p.balance < 0 ? -p.balance : 0),
          );
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
            children: [
              SegmentedButton<PersonKind>(
                segments: [
                  ButtonSegment(
                    value: PersonKind.partner,
                    icon: const Icon(Icons.handshake_outlined),
                    label: Text('Partners (${data.partners.length})'),
                  ),
                  ButtonSegment(
                    value: PersonKind.agent,
                    icon: const Icon(Icons.badge_outlined),
                    label: Text('Agents (${data.agents.length})'),
                  ),
                ],
                selected: {_kind},
                onSelectionChanged: (s) => setState(() => _kind = s.first),
              ),
              const SizedBox(height: 12),
              TileRow(
                StatTile(
                  label: 'We owe',
                  amount: payable,
                  accent: AppColors.emerald,
                ),
                StatTile(
                  label: 'Advance given',
                  amount: advance,
                  accent: AppColors.loss,
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(4, 10, 4, 0),
                child: Text(
                  'Current month is credited after it ends, same as the website.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ),
              const SizedBox(height: 6),
              if (people.isEmpty) const EmptyNote('Nobody here yet'),
              for (final p in people) _PersonCard(p),
            ],
          );
        },
      ),
    );
  }
}

class _PersonCard extends StatelessWidget {
  const _PersonCard(this.p);
  final PersonLedger p;

  @override
  Widget build(BuildContext context) {
    final color = p.balance > 0
        ? AppColors.emeraldDeep
        : (p.balance < 0 ? AppColors.loss : AppColors.muted);
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) =>
                  StatementScreen(kind: p.kind, personId: p.id, name: p.name),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: p.kind == PersonKind.partner
                      ? AppColors.mint
                      : AppColors.violetSoft,
                  child: Text(
                    p.name.isEmpty ? '?' : p.name[0].toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: p.kind == PersonKind.partner
                          ? AppColors.emeraldDeep
                          : AppColors.violet,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.name,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '${formatPercent(p.percent)} · earned ${formatTaka(p.totalCredited)} · given ${formatTaka(p.totalGiven)}'
                        '${p.isActive ? '' : ' · inactive'}',
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Money(p.balance.abs(), color: color),
                    Text(
                      p.balance > 0
                          ? 'payable'
                          : (p.balance < 0 ? 'advance' : 'settled'),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
                const Icon(Icons.chevron_right, color: AppColors.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A person's passbook with running balance, plus record/edit/delete actions.
class StatementScreen extends StatelessWidget {
  const StatementScreen({
    required this.kind,
    required this.personId,
    required this.name,
    super.key,
  });
  final PersonKind kind;
  final String personId;
  final String name;

  PersonLedger? _find(Balances b) {
    final list = kind == PersonKind.partner ? b.partners : b.agents;
    final match = list.where((p) => p.id == personId);
    return match.isEmpty ? null : match.first;
  }

  Payout? _payout(Balances b, String id) {
    final list = kind == PersonKind.partner
        ? b.snapshot.partnerPayouts
        : b.snapshot.agentPayouts;
    final match = list.where((p) => p.id == id);
    return match.isEmpty ? null : match.first;
  }

  Future<void> _recordPayment(BuildContext context, PersonLedger p) {
    final repo = AppScope.of(context).repository;
    return showFormSheet<void>(
      context,
      PaymentForm(
        personName: '${p.name} · balance ${formatTaka(p.balance)}',
        suggested: p.balance > 0 ? p.balance : null,
        onSave: (input) => runWrite(
          context,
          () => repo.recordPayment(kind, personId, input),
          success: 'Payment recorded',
        ),
      ),
    );
  }

  Future<void> _adjust(BuildContext context, PersonLedger p) {
    final repo = AppScope.of(context).repository;
    return showFormSheet<void>(
      context,
      AdjustmentForm(
        personName: p.name,
        onSave: (input) => runWrite(
          context,
          () => repo.recordAdjustment(kind, personId, input),
          success: 'Adjustment saved',
        ),
      ),
    );
  }

  Future<void> _entryActions(
    BuildContext context,
    Balances b,
    LedgerEntry e,
  ) async {
    final repo = AppScope.of(context).repository;
    if (e.kind == LedgerKind.calculation) {
      showMessage(
        context,
        'Monthly credits come from the commission record — edit it on the Monthly tab.',
      );
      return;
    }
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(e.title),
              subtitle: Text('${formatDate(e.date)} · ${formatTaka(e.amount)}'),
            ),
            if (e.kind == LedgerKind.payout)
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Edit payment'),
                onTap: () => Navigator.pop(context, 'edit'),
              ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.loss),
              title: const Text(
                'Delete',
                style: TextStyle(color: AppColors.loss),
              ),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted || action == null) return;

    if (action == 'edit') {
      final payout = _payout(b, e.rawId);
      if (payout == null) return;
      await showFormSheet<void>(
        context,
        PaymentForm(
          personName: name,
          existing: payout,
          onSave: (input) => runWrite(
            context,
            () => repo.updatePayment(kind, payout.id, input),
            success: 'Payment updated',
          ),
        ),
      );
      return;
    }

    final ok = await confirm(
      context,
      title: 'Delete this entry?',
      body: '${e.title}\n${formatTaka(e.amount)} on ${formatDate(e.date)}',
    );
    if (!ok || !context.mounted) return;
    await runWrite(
      context,
      () => e.kind == LedgerKind.payout
          ? repo.deletePayment(kind, e.rawId)
          : repo.deleteAdjustment(kind, e.rawId),
      success: 'Entry deleted',
    );
  }

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).repository;
    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: Loader<Balances>(
        watchPeriod: false,
        load: (_) => loadBalances(repo),
        builder: (context, b, _) {
          final p = _find(b);
          if (p == null) {
            return ListView(
              children: const [EmptyNote('This person no longer exists.')],
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: p.balance >= 0
                      ? AppColors.emeraldDeep
                      : AppColors.loss,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Eyebrow(
                      p.balance > 0
                          ? 'Payable to ${p.name}'
                          : (p.balance < 0 ? 'Advance given' : 'Settled'),
                      color: const Color(0xCCFFFFFF),
                    ),
                    const SizedBox(height: 6),
                    Money(p.balance.abs(), size: 34, color: Colors.white),
                    const SizedBox(height: 10),
                    Text(
                      'Earned ${formatTaka(p.totalEarned)} · credits ${formatTaka(p.totalCreditAdjustments)}\n'
                      'Paid ${formatTaka(p.totalPaid)} · deductions ${formatTaka(p.totalDebitAdjustments)}',
                      style: const TextStyle(
                        color: Color(0xCCFFFFFF),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _recordPayment(context, p),
                      icon: const Icon(Icons.payments_outlined),
                      label: Text(
                        kind == PersonKind.partner ? 'Give money' : 'Pay agent',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                      ),
                      onPressed: () => _adjust(context, p),
                      icon: const Icon(Icons.tune),
                      label: const Text('Adjust'),
                    ),
                  ),
                ],
              ),
              if (p.monthlyBreakdown.any((m) => m.remainingDue > 0)) ...[
                const SectionTitle('Unpaid months'),
                Card(
                  child: Column(
                    children: [
                      for (final m in p.monthlyBreakdown.where(
                        (m) => m.remainingDue > 0,
                      ))
                        ListTile(
                          dense: true,
                          title: Text(
                            m.period.label,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          subtitle: Text(
                            'Share ${formatTaka(m.creditedAmount)} · paid ${formatTaka(m.allocatedPaid)}',
                          ),
                          trailing: Money(
                            m.remainingDue,
                            size: 14,
                            color: AppColors.amber,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              const SectionTitle('Passbook'),
              if (p.entries.isEmpty) const EmptyNote('No transactions yet'),
              if (p.entries.isNotEmpty)
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      for (final (i, e) in p.entries.indexed) ...[
                        if (i > 0) const Divider(indent: 16, endIndent: 16),
                        _EntryTile(
                          e,
                          onTap: () => _entryActions(context, b, e),
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile(this.e, {required this.onTap});
  final LedgerEntry e;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final credit = e.direction == Direction.credit;
    final icon = switch (e.kind) {
      LedgerKind.calculation => Icons.calendar_month,
      LedgerKind.payout => Icons.payments,
      LedgerKind.adjustment => Icons.tune,
    };
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: credit ? AppColors.mint : AppColors.lossSoft,
        child: Icon(
          icon,
          size: 18,
          color: credit ? AppColors.emeraldDeep : AppColors.loss,
        ),
      ),
      title: Text(
        e.title,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
      ),
      subtitle: Text(
        [formatDate(e.date), if (e.subtitle != null) e.subtitle!].join(' · '),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${credit ? '+' : '−'}${formatTaka(e.amount)}',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontFeatures: tabular,
              color: credit ? AppColors.emeraldDeep : AppColors.loss,
            ),
          ),
          Text(
            'bal ${formatTaka(e.balanceAfter)}',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.muted,
              fontFeatures: tabular,
            ),
          ),
        ],
      ),
    );
  }
}
