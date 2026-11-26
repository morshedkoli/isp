import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

/// Enter or edit a month's ISP commission — the website's Calculator tab:
/// commission sources, then each active agent's actual commission (with the
/// same (main amount / 49) × rate suggestion).
class CommissionEditor extends StatefulWidget {
  const CommissionEditor({
    required this.period,
    required this.record,
    required this.agents,
    required this.expenses,
    super.key,
  });

  final Period period;
  final CommissionRecord? record;
  final List<CommissionAgent> agents;
  final double expenses;

  @override
  State<CommissionEditor> createState() => _CommissionEditorState();
}

class _SourceRow {
  _SourceRow(String description, String amount)
    : description = TextEditingController(text: description),
      amount = TextEditingController(text: amount);
  final TextEditingController description;
  final TextEditingController amount;

  void dispose() {
    description.dispose();
    amount.dispose();
  }
}

class _CommissionEditorState extends State<CommissionEditor> {
  late final List<_SourceRow> _sources;
  late final Map<String, TextEditingController> _agentAmounts;
  late final TextEditingController _notes;
  bool _busy = false;

  List<CommissionAgent> get _activeAgents =>
      widget.agents.where((a) => a.isActive).toList();

  @override
  void initState() {
    super.initState();
    final rec = widget.record;
    _sources = (rec?.sources ?? const <CommissionSource>[])
        .map((s) => _SourceRow(s.description, _plain(s.amount)))
        .toList();
    if (_sources.isEmpty) _sources.add(_SourceRow('', ''));
    final existing = {
      for (final e in rec?.agentEntries ?? const <AgentCommissionEntry>[])
        e.agentId: e.amount,
    };
    _agentAmounts = {
      for (final a in _activeAgents)
        a.id: TextEditingController(
          text: existing[a.id] == null ? '' : _plain(existing[a.id]!),
        ),
    };
    _notes = TextEditingController(text: rec?.notes ?? '');
  }

  @override
  void dispose() {
    for (final s in _sources) {
      s.dispose();
    }
    for (final c in _agentAmounts.values) {
      c.dispose();
    }
    _notes.dispose();
    super.dispose();
  }

  double get _pool =>
      _sources.fold(0.0, (sum, s) => sum + (parseAmount(s.amount.text) ?? 0));
  double get _agentTotal => _agentAmounts.values.fold(
    0.0,
    (sum, c) => sum + (parseAmount(c.text) ?? 0),
  );

  void _autoCalculate() {
    final pool = _pool;
    setState(() {
      for (final a in _activeAgents) {
        _agentAmounts[a.id]?.text = pool > 0
            ? suggestedAgentCommission(
                pool,
                a.commissionPercent,
              ).toStringAsFixed(2)
            : '';
      }
    });
  }

  Future<void> _save() async {
    final sources = <CommissionSource>[];
    for (final (i, s) in _sources.indexed) {
      final amount = parseAmount(s.amount.text) ?? 0;
      if (amount <= 0) continue;
      final description = s.description.text.trim();
      sources.add(
        CommissionSource(
          description.isEmpty ? 'ISP Commission Source #${i + 1}' : description,
          amount,
        ),
      );
    }
    final agentAmounts = <String, double>{};
    for (final MapEntry(key: id, value: c) in _agentAmounts.entries) {
      final v = parseAmount(c.text);
      if (v != null && v > 0) agentAmounts[id] = v;
    }
    setState(() => _busy = true);
    final repo = AppScope.of(context).repository;
    final ok = await runWrite(
      context,
      () => repo.saveCommissionRecord(
        period: widget.period,
        sources: sources,
        agentAmounts: agentAmounts,
        notes: _notes.text,
      ),
      success: '${widget.period.label} commission saved',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final net = _pool - _agentTotal - widget.expenses;
    return Scaffold(
      appBar: AppBar(title: Text('${widget.period.label} commission')),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: AppColors.card,
            border: Border(top: BorderSide(color: AppColors.rule)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const Expanded(child: Eyebrow('Net after agents & expenses')),
                  Money(
                    net,
                    size: 18,
                    color: net >= 0 ? AppColors.emeraldDeep : AppColors.loss,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4),
                      )
                    : const Text('Save commission'),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          SectionTitle(
            'Commission sources',
            trailing: TextButton.icon(
              onPressed: () => setState(() => _sources.add(_SourceRow('', ''))),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Source'),
            ),
          ),
          for (final (i, s) in _sources.indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: s.description,
                      decoration: InputDecoration(
                        labelText: 'Source #${i + 1}',
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: s.amount,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        prefixText: '৳ ',
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  if (_sources.length > 1)
                    IconButton(
                      tooltip: 'Remove source',
                      onPressed: () =>
                          setState(() => _sources.removeAt(i).dispose()),
                      icon: const Icon(Icons.close, color: AppColors.muted),
                    ),
                ],
              ),
            ),
          FigureLine('Total pool', _pool, bold: true),
          SectionTitle(
            'Agent commissions',
            trailing: TextButton.icon(
              onPressed: _activeAgents.isEmpty ? null : _autoCalculate,
              icon: const Icon(Icons.auto_fix_high, size: 18),
              label: const Text('Auto-fill'),
            ),
          ),
          if (_activeAgents.isEmpty)
            const EmptyNote(
              'No active field agents. Add agents on the website.',
            ),
          for (final a in _activeAgents)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          a.name,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          'Rate ${formatPercent(a.commissionPercent)}'
                          '${_pool > 0 ? ' · ≈ ${formatTaka(suggestedAgentCommission(_pool, a.commissionPercent))}' : ''}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 140,
                    child: TextField(
                      controller: _agentAmounts[a.id],
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Commission',
                        prefixText: '৳ ',
                        isDense: true,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
            ),
          FigureLine(
            'Agents total',
            _agentTotal,
            prefix: '− ',
            color: AppColors.violet,
          ),
          FigureLine(
            'Expenses this month',
            widget.expenses,
            prefix: '− ',
            color: AppColors.loss,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
          ),
        ],
      ),
    );
  }
}

String _plain(double v) =>
    v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
