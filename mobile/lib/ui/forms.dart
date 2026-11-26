import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/domain/reports.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

/// Opens [child] as a keyboard-aware bottom sheet form.
Future<T?> showFormSheet<T>(BuildContext context, Widget child) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppColors.paper,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: child,
          ),
        ),
      ),
    );

final _moneyFormatter = FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'));

class _FormHeader extends StatelessWidget {
  const _FormHeader(this.title, this.subtitle);
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: const TextStyle(color: AppColors.muted)),
        ],
      ],
    ),
  );
}

class DateField extends StatelessWidget {
  const DateField({
    required this.value,
    required this.onChanged,
    this.label = 'Date',
    super.key,
  });
  final DateTime value;
  final ValueChanged<DateTime> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(14),
    onTap: () async {
      final picked = await showDatePicker(
        context: context,
        initialDate: DateTime(value.year, value.month, value.day),
        firstDate: DateTime(2020),
        lastDate: DateTime(2100),
      );
      if (picked != null) onChanged(calendarDay(picked));
    },
    child: InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.event_outlined),
      ),
      child: Text(formatDate(value)),
    ),
  );
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({required this.busy, required this.onPressed});
  final bool busy;
  final VoidCallback onPressed;
  String get label => 'Save';

  @override
  Widget build(BuildContext context) => FilledButton(
    onPressed: busy ? null : onPressed,
    child: busy
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4),
          )
        : Text(label),
  );
}

const _gap = SizedBox(height: 14);

// ─── Hotspot sale ─────────────────────────────────────────────────────────────

class HotspotSaleForm extends StatefulWidget {
  const HotspotSaleForm({
    required this.initialDate,
    required this.onSave,
    this.existing,
    this.package,
    super.key,
  });
  final DateTime initialDate;
  final HotspotSale? existing;
  final String? package;
  final Future<bool> Function(HotspotSaleInput input) onSave;

  @override
  State<HotspotSaleForm> createState() => _HotspotSaleFormState();
}

class _HotspotSaleFormState extends State<HotspotSaleForm> {
  late String _package =
      widget.existing?.package ?? widget.package ?? 'SEVEN_DAY';
  late DateTime _date = widget.existing == null
      ? widget.initialDate
      : storedToCalendarDay(widget.existing!.date);
  late final _qty = TextEditingController(
    text: '${widget.existing?.quantity ?? 1}',
  );
  late final _discount = TextEditingController(
    text: (widget.existing?.discount ?? 0) > 0
        ? widget.existing!.discount.toStringAsFixed(0)
        : '',
  );
  late final _name = TextEditingController(
    text: widget.existing?.customerName ?? '',
  );
  late final _phone = TextEditingController(
    text: widget.existing?.customerPhone ?? '',
  );
  late final _notes = TextEditingController(text: widget.existing?.notes ?? '');
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_qty, _discount, _name, _phone, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  int get _quantity => int.tryParse(_qty.text.trim()) ?? 0;
  double get _discountValue => parseAmount(_discount.text) ?? 0;

  Future<void> _save() async {
    final priced = priceHotspotSale(_package, _quantity, _discountValue);
    if (priced.error != null) {
      showMessage(context, priced.error!, error: true);
      return;
    }
    setState(() => _busy = true);
    final ok = await widget.onSave(
      HotspotSaleInput(
        package: _package,
        quantity: _quantity,
        discount: _discountValue,
        date: _date,
        customerName: _name.text,
        customerPhone: _phone.text,
        notes: _notes.text,
      ),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final priced = priceHotspotSale(_package, _quantity, _discountValue);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FormHeader(
          widget.existing == null ? 'Record hotspot sale' : 'Edit sale',
          'Price comes from the package table',
        ),
        SegmentedButton<String>(
          segments: [
            for (final p in hotspotPackages.values)
              ButtonSegment(
                value: p.key,
                label: Text('${p.label} · ৳${p.price.toInt()}'),
              ),
          ],
          selected: {_package},
          onSelectionChanged: (s) => setState(() => _package = s.first),
        ),
        _gap,
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _qty,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(labelText: 'Quantity'),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _discount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                inputFormatters: [_moneyFormatter],
                decoration: const InputDecoration(
                  labelText: 'Discount',
                  prefixText: '৳ ',
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ],
        ),
        _gap,
        DateField(value: _date, onChanged: (d) => setState(() => _date = d)),
        _gap,
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Buyer name (optional)'),
        ),
        _gap,
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Buyer phone (optional)',
          ),
        ),
        _gap,
        TextField(
          controller: _notes,
          decoration: const InputDecoration(labelText: 'Notes (optional)'),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            const Eyebrow('Total'),
            const Spacer(),
            Money(
              priced.error == null ? priced.amount : 0,
              size: 22,
              color: AppColors.emeraldDeep,
            ),
          ],
        ),
        const SizedBox(height: 14),
        _SaveButton(busy: _busy, onPressed: _save),
      ],
    );
  }
}

// ─── Expense ──────────────────────────────────────────────────────────────────

class ExpenseForm extends StatefulWidget {
  const ExpenseForm({
    required this.initialDate,
    required this.onSave,
    this.existing,
    this.type,
    super.key,
  });
  final DateTime initialDate;
  final Expense? existing;
  final String? type;
  final Future<bool> Function(ExpenseInput input) onSave;

  @override
  State<ExpenseForm> createState() => _ExpenseFormState();
}

class _ExpenseFormState extends State<ExpenseForm> {
  late String _type = widget.existing?.type ?? widget.type ?? 'SALARY';
  late DateTime _date = widget.existing == null
      ? widget.initialDate
      : storedToCalendarDay(widget.existing!.date);
  late final _description = TextEditingController(
    text: widget.existing?.description ?? '',
  );
  late final _amount = TextEditingController(
    text: widget.existing == null ? '' : _plain(widget.existing!.amount),
  );
  late final _notes = TextEditingController(text: widget.existing?.notes ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = parseAmount(_amount.text);
    if (_description.text.trim().isEmpty) {
      showMessage(context, 'Description is required.', error: true);
      return;
    }
    if (amount == null || amount <= 0) {
      showMessage(context, 'Amount must be greater than zero.', error: true);
      return;
    }
    setState(() => _busy = true);
    final ok = await widget.onSave(
      ExpenseInput(
        type: _type,
        description: _description.text,
        amount: amount,
        date: _date,
        notes: _notes.text,
      ),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final info = expenseTypeInfo(_type);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FormHeader(
          widget.existing == null ? 'Add expense' : 'Edit expense',
          null,
        ),
        DropdownButtonFormField<String>(
          initialValue: _type,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Category'),
          items: [
            for (final t in expenseTypes)
              DropdownMenuItem(value: t.key, child: Text(t.title)),
          ],
          onChanged: (v) => setState(() => _type = v ?? _type),
        ),
        _gap,
        TextField(
          controller: _description,
          maxLength: 200,
          decoration: InputDecoration(
            labelText: info.nameLabel,
            hintText: info.hint,
            counterText: '',
          ),
        ),
        _gap,
        TextField(
          controller: _amount,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [_moneyFormatter],
          decoration: const InputDecoration(
            labelText: 'Amount',
            prefixText: '৳ ',
          ),
        ),
        _gap,
        DateField(value: _date, onChanged: (d) => setState(() => _date = d)),
        _gap,
        TextField(
          controller: _notes,
          maxLength: 500,
          decoration: const InputDecoration(
            labelText: 'Notes (optional)',
            counterText: '',
          ),
        ),
        const SizedBox(height: 18),
        _SaveButton(busy: _busy, onPressed: _save),
      ],
    );
  }
}

// ─── Payment (money given to partner / paid to agent) ─────────────────────────

class PaymentForm extends StatefulWidget {
  const PaymentForm({
    required this.personName,
    required this.onSave,
    this.existing,
    this.suggested,
    super.key,
  });
  final String personName;
  final Payout? existing;
  final double? suggested;
  final Future<bool> Function(PaymentInput input) onSave;

  @override
  State<PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends State<PaymentForm> {
  late String _method = widget.existing?.method ?? 'CASH';
  late DateTime _date = widget.existing == null
      ? businessToday()
      : storedToCalendarDay(widget.existing!.date);
  late final _amount = TextEditingController(
    text: widget.existing != null
        ? _plain(widget.existing!.amount)
        : (widget.suggested != null && widget.suggested! > 0
              ? _plain(widget.suggested!)
              : ''),
  );
  late final _reference = TextEditingController(
    text: widget.existing?.referenceId ?? '',
  );
  late final _notes = TextEditingController(text: widget.existing?.notes ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = parseAmount(_amount.text);
    if (amount == null || amount <= 0) {
      showMessage(context, 'Amount must be greater than zero.', error: true);
      return;
    }
    setState(() => _busy = true);
    final ok = await widget.onSave(
      PaymentInput(
        amount: amount,
        date: _date,
        method: _method,
        referenceId: _reference.text,
        notes: _notes.text,
      ),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _FormHeader(
        widget.existing == null ? 'Record payment' : 'Edit payment',
        widget.personName,
      ),
      TextField(
        controller: _amount,
        autofocus: widget.existing == null,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [_moneyFormatter],
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          fontFeatures: tabular,
        ),
        decoration: const InputDecoration(
          labelText: 'Amount',
          prefixText: '৳ ',
        ),
      ),
      _gap,
      Wrap(
        spacing: 8,
        children: [
          for (final m in paymentMethods)
            ChoiceChip(
              label: Text(formatPaymentMethod(m)),
              selected: _method == m,
              onSelected: (_) => setState(() => _method = m),
            ),
        ],
      ),
      _gap,
      DateField(value: _date, onChanged: (d) => setState(() => _date = d)),
      _gap,
      TextField(
        controller: _reference,
        decoration: const InputDecoration(
          labelText: 'Reference / TrxID (optional)',
        ),
      ),
      _gap,
      TextField(
        controller: _notes,
        decoration: const InputDecoration(labelText: 'Notes (optional)'),
      ),
      const SizedBox(height: 18),
      _SaveButton(busy: _busy, onPressed: _save),
    ],
  );
}

// ─── Balance adjustment ───────────────────────────────────────────────────────

class AdjustmentForm extends StatefulWidget {
  const AdjustmentForm({
    required this.personName,
    required this.onSave,
    super.key,
  });
  final String personName;
  final Future<bool> Function(AdjustmentInput input) onSave;

  @override
  State<AdjustmentForm> createState() => _AdjustmentFormState();
}

class _AdjustmentFormState extends State<AdjustmentForm> {
  Direction _type = Direction.credit;
  DateTime _date = businessToday();
  final _amount = TextEditingController();
  final _reason = TextEditingController();
  final _notes = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = parseAmount(_amount.text);
    if (amount == null || amount <= 0) {
      showMessage(context, 'Amount must be greater than zero.', error: true);
      return;
    }
    if (_reason.text.trim().isEmpty) {
      showMessage(context, 'Reason is required.', error: true);
      return;
    }
    setState(() => _busy = true);
    final ok = await widget.onSave(
      AdjustmentInput(
        type: _type,
        amount: amount,
        date: _date,
        reason: _reason.text,
        notes: _notes.text,
      ),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _FormHeader('Balance adjustment', widget.personName),
      SegmentedButton<Direction>(
        segments: const [
          ButtonSegment(
            value: Direction.credit,
            icon: Icon(Icons.add),
            label: Text('Credit (owe more)'),
          ),
          ButtonSegment(
            value: Direction.debit,
            icon: Icon(Icons.remove),
            label: Text('Debit (owe less)'),
          ),
        ],
        selected: {_type},
        onSelectionChanged: (s) => setState(() => _type = s.first),
      ),
      _gap,
      TextField(
        controller: _amount,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [_moneyFormatter],
        decoration: const InputDecoration(
          labelText: 'Amount',
          prefixText: '৳ ',
        ),
      ),
      _gap,
      TextField(
        controller: _reason,
        decoration: const InputDecoration(
          labelText: 'Reason',
          hintText: 'Opening balance, bonus, write-off…',
        ),
      ),
      _gap,
      DateField(value: _date, onChanged: (d) => setState(() => _date = d)),
      _gap,
      TextField(
        controller: _notes,
        decoration: const InputDecoration(labelText: 'Notes (optional)'),
      ),
      const SizedBox(height: 18),
      _SaveButton(busy: _busy, onPressed: _save),
    ],
  );
}

String _plain(double v) =>
    v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
