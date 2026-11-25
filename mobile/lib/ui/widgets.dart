import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/data/database.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/theme.dart';

sealed class AsyncState<T> {
  const AsyncState();
}

final class Loading<T> extends AsyncState<T> {
  const Loading();
}

final class Ready<T> extends AsyncState<T> {
  const Ready(this.data);
  final T data;
}

final class Failed<T> extends AsyncState<T> {
  const Failed(this.message);
  final String message;
}

/// Loads [load] and re-runs it whenever the viewed month or the data revision
/// changes. Pull down to refresh.
class Loader<T> extends StatefulWidget {
  const Loader({
    required this.load,
    required this.builder,
    this.watchPeriod = true,
    super.key,
  });

  final Future<T> Function(Period period) load;
  final Widget Function(
    BuildContext context,
    T data,
    Future<void> Function() refresh,
  )
  builder;
  final bool watchPeriod;

  @override
  State<Loader<T>> createState() => _LoaderState<T>();
}

class _LoaderState<T> extends State<Loader<T>> {
  AsyncState<T> _state = const Loading();
  AppSession? _scope;
  int _request = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = AppScope.of(context);
    if (!identical(scope, _scope)) {
      _scope?.revision.removeListener(_reload);
      _scope?.period.removeListener(_onPeriod);
      _scope = scope;
      scope.revision.addListener(_reload);
      scope.period.addListener(_onPeriod);
      _reload();
    }
  }

  @override
  void dispose() {
    _scope?.revision.removeListener(_reload);
    _scope?.period.removeListener(_onPeriod);
    super.dispose();
  }

  void _onPeriod() {
    if (widget.watchPeriod) _reload();
  }

  void _reload() => _fetch();

  Future<void> _fetch() async {
    final scope = _scope;
    if (scope == null) return;
    final request = ++_request;
    if (_state is Failed<T>) setState(() => _state = const Loading());
    try {
      final data = await widget.load(scope.period.value);
      if (mounted && request == _request) setState(() => _state = Ready(data));
    } on DataException catch (e) {
      if (mounted && request == _request) {
        setState(() => _state = Failed(e.message));
      }
    }
  }

  @override
  Widget build(BuildContext context) => switch (_state) {
    Loading() => const Center(child: CircularProgressIndicator()),
    Failed(:final message) => ErrorPanel(message: message, onRetry: _fetch),
    Ready(:final data) => RefreshIndicator(
      onRefresh: _fetch,
      child: widget.builder(context, data, _fetch),
    ),
  };
}

class ErrorPanel extends StatelessWidget {
  const ErrorPanel({required this.message, required this.onRetry, super.key});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 44, color: AppColors.loss),
          const SizedBox(height: 12),
          Text(
            'Couldn’t load data',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Try again'),
          ),
        ],
      ),
    ),
  );
}

/// Month switcher shown at the top of month-scoped tabs.
class PeriodBar extends StatelessWidget {
  const PeriodBar({super.key});

  @override
  Widget build(BuildContext context) {
    final notifier = AppScope.of(context).period;
    return ValueListenableBuilder<Period>(
      valueListenable: notifier,
      builder: (context, period, _) {
        final isCurrent = period == currentPeriod();
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.rule),
          ),
          child: Row(
            children: [
              IconButton(
                tooltip: 'Previous month',
                onPressed: () => notifier.value = period.previous,
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => _pickMonth(context, notifier),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      children: [
                        Text(
                          period.label,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          isCurrent ? 'CURRENT MONTH' : 'TAP TO PICK',
                          style: const TextStyle(
                            fontSize: 10,
                            letterSpacing: 1.2,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Next month',
                onPressed: () => notifier.value = period.next,
                icon: const Icon(Icons.chevron_right_rounded),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickMonth(
    BuildContext context,
    ValueNotifier<Period> notifier,
  ) async {
    final picked = await showModalBottomSheet<Period>(
      context: context,
      showDragHandle: true,
      builder: (_) => _MonthPicker(initial: notifier.value),
    );
    if (picked != null) notifier.value = picked;
  }
}

class _MonthPicker extends StatefulWidget {
  const _MonthPicker({required this.initial});
  final Period initial;

  @override
  State<_MonthPicker> createState() => _MonthPickerState();
}

class _MonthPickerState extends State<_MonthPicker> {
  late int _year = widget.initial.year;

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: () => setState(() => _year--),
                icon: const Icon(Icons.chevron_left),
              ),
              Text('$_year', style: Theme.of(context).textTheme.titleLarge),
              IconButton(
                onPressed: () => setState(() => _year++),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.8,
            children: [
              for (var m = 1; m <= 12; m++) _monthChip(Period(_year, m)),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _monthChip(Period p) {
    final selected = p == widget.initial;
    return Material(
      color: selected ? AppColors.emerald : AppColors.card,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.pop(context, p),
        child: Center(
          child: Text(
            monthShortNames[p.month - 1],
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.ink,
            ),
          ),
        ),
      ),
    );
  }
}

/// Small uppercase label above a figure.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {this.color = AppColors.muted, super.key});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontSize: 10.5,
      letterSpacing: 1.2,
      fontWeight: FontWeight.w800,
      color: color,
    ),
  );
}

class Money extends StatelessWidget {
  const Money(
    this.amount, {
    this.size = 16,
    this.color,
    this.weight = FontWeight.w800,
    this.signed = false,
    super.key,
  });
  final num amount;
  final double size;
  final Color? color;
  final FontWeight weight;
  final bool signed;

  @override
  Widget build(BuildContext context) => Text(
    formatTaka(amount, signed: signed),
    style: TextStyle(
      fontSize: size,
      fontWeight: weight,
      color: color ?? AppColors.ink,
      fontFeatures: tabular,
      letterSpacing: -0.3,
    ),
  );
}

/// A compact figure tile with a colored accent rail.
class StatTile extends StatelessWidget {
  const StatTile({
    required this.label,
    required this.amount,
    required this.accent,
    this.caption,
    super.key,
  });
  final String label;
  final num amount;
  final Color accent;
  final String? caption;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(label),
                const SizedBox(height: 4),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Money(amount, size: 19),
                ),
                if (caption != null)
                  Text(
                    caption!,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.muted,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

/// Two tiles side by side.
class TileRow extends StatelessWidget {
  const TileRow(this.left, this.right, {super.key});
  final Widget left;
  final Widget right;

  @override
  Widget build(BuildContext context) => IntrinsicHeight(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(child: left),
        const SizedBox(width: 10),
        Expanded(child: right),
      ],
    ),
  );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {this.trailing, super.key});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 22, 4, 10),
    child: Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        ?trailing,
      ],
    ),
  );
}

/// A label/value line inside a breakdown card.
class FigureLine extends StatelessWidget {
  const FigureLine(
    this.label,
    this.amount, {
    this.color,
    this.bold = false,
    this.prefix = '',
    super.key,
  });
  final String label;
  final num amount;
  final Color? color;
  final bool bold;
  final String prefix;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              color: AppColors.ink,
            ),
          ),
        ),
        Text(
          '$prefix${formatTaka(amount)}',
          style: TextStyle(
            fontFeatures: tabular,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: color ?? AppColors.ink,
          ),
        ),
      ],
    ),
  );
}

class EmptyNote extends StatelessWidget {
  const EmptyNote(this.text, {this.icon = Icons.inbox_outlined, super.key});
  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 28),
    child: Column(
      children: [
        Icon(icon, color: AppColors.rule, size: 40),
        const SizedBox(height: 8),
        Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.muted),
        ),
      ],
    ),
  );
}

void showMessage(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? AppColors.loss : AppColors.emeraldDeep,
      ),
    );
}

Future<bool> confirm(
  BuildContext context, {
  required String title,
  required String body,
  String action = 'Delete',
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.loss,
            minimumSize: const Size(88, 44),
          ),
          onPressed: () => Navigator.pop(context, true),
          child: Text(action),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// Runs a write, shows the outcome, and refreshes every tab on success.
Future<bool> runWrite(
  BuildContext context,
  Future<void> Function() action, {
  required String success,
}) async {
  final scope = AppScope.of(context);
  try {
    await action();
    if (context.mounted) showMessage(context, success);
    scope.dataChanged();
    return true;
  } on DataException catch (e) {
    if (context.mounted) showMessage(context, e.message, error: true);
    return false;
  }
}
