import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/forms.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

class ExpensesScreen extends StatelessWidget {
  const ExpensesScreen({required this.menu, super.key});
  final Widget menu;

  Future<void> _openForm(
    BuildContext context, {
    Expense? expense,
    String? type,
  }) {
    final session = AppScope.of(context);
    final repo = session.repository;
    return showFormSheet<void>(
      context,
      ExpenseForm(
        initialDate: defaultEntryDate(session.period.value),
        existing: expense,
        type: type,
        onSave: (input) => runWrite(
          context,
          () => expense == null
              ? repo.createExpense(input)
              : repo.updateExpense(expense.id, input),
          success: expense == null ? 'Expense added' : 'Expense updated',
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, Expense e) async {
    final repo = AppScope.of(context).repository;
    final ok = await confirm(
      context,
      title: 'Delete expense?',
      body: '${e.description} · ${formatTaka(e.amount)}',
    );
    if (ok && context.mounted) {
      await runWrite(
        context,
        () => repo.deleteExpense(e.id),
        success: 'Expense deleted',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = AppScope.of(context).repository;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Expenses'),
        actions: [menu, const SizedBox(width: 8)],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Expense'),
      ),
      body: Column(
        children: [
          const PeriodBar(),
          Expanded(
            child: Loader<List<Expense>>(
              load: repo.expenses,
              builder: (context, rows, _) {
                final total = rows.fold(0.0, (sum, e) => sum + e.amount);
                return ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                  children: [
                    Card(
                      color: AppColors.lossSoft,
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Eyebrow(
                              'মোট খরচ · Total expenses',
                              color: AppColors.loss,
                            ),
                            const SizedBox(height: 4),
                            Money(total, size: 30),
                            Text(
                              '${rows.length} entries',
                              style: const TextStyle(color: AppColors.muted),
                            ),
                          ],
                        ),
                      ),
                    ),
                    for (final type in expenseTypes)
                      _Category(
                        info: type,
                        rows: rows.where((e) => e.type == type.key).toList(),
                        onAdd: () => _openForm(context, type: type.key),
                        onEdit: (e) => _openForm(context, expense: e),
                        onDelete: (e) => _delete(context, e),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Category extends StatelessWidget {
  const _Category({
    required this.info,
    required this.rows,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
  });

  final ExpenseTypeInfo info;
  final List<Expense> rows;
  final VoidCallback onAdd;
  final ValueChanged<Expense> onEdit;
  final ValueChanged<Expense> onDelete;

  @override
  Widget build(BuildContext context) {
    final total = rows.fold(0.0, (sum, e) => sum + e.amount);
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            ListTile(
              title: Text(
                info.title,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                rows.isEmpty ? 'Nothing yet' : '${rows.length} entries',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Money(
                    total,
                    size: 15,
                    color: total > 0 ? AppColors.loss : AppColors.muted,
                  ),
                  IconButton(
                    tooltip: 'Add to ${info.title}',
                    onPressed: onAdd,
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ),
            for (final e in rows) ...[
              const Divider(indent: 16, endIndent: 16),
              ListTile(
                dense: true,
                onTap: () => onEdit(e),
                title: Text(
                  e.description,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  [
                    formatDate(e.date),
                    if (e.notes != null) e.notes!,
                  ].join(' · '),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Money(e.amount, size: 14, weight: FontWeight.w700),
                    IconButton(
                      tooltip: 'Delete',
                      onPressed: () => onDelete(e),
                      icon: const Icon(
                        Icons.delete_outline,
                        size: 20,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
