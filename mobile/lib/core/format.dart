import 'package:isp_admin/core/business_date.dart';

const String _taka = '৳';
const String _minus = '−';

/// Clean floating-point dust (e.g. 1e-12 → 0), matching the web `cleanMoney`.
double cleanMoney(num value) {
  final v = value.toDouble();
  if (!v.isFinite || v.abs() < 0.005) return 0;
  return (v * 10000).roundToDouble() / 10000;
}

String _groupDigits(String digits) {
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

/// `৳12,345` (or `৳12,345.50` with [decimals]); negatives keep a minus sign.
String formatTaka(num amount, {bool decimals = false, bool signed = false}) {
  final safe = amount.isFinite ? amount.toDouble() : 0.0;
  final fixed = safe.abs().toStringAsFixed(decimals ? 2 : 0);
  final dot = fixed.indexOf('.');
  final whole = dot == -1 ? fixed : fixed.substring(0, dot);
  final fraction = dot == -1 ? '' : fixed.substring(dot);
  final sign = safe < 0 && fixed.replaceAll(RegExp(r'[0.]'), '').isNotEmpty
      ? _minus
      : (signed && safe > 0 ? '+' : '');
  return '$sign$_taka${_groupDigits(whole)}$fraction';
}

/// `60%` / `60.9%`.
String formatPercent(num value) {
  final v = value.toDouble();
  final rounded = (v * 10).roundToDouble() / 10;
  return rounded == rounded.roundToDouble()
      ? '${rounded.toInt()}%'
      : '${rounded.toStringAsFixed(1)}%';
}

/// `05 Oct 2026`, read in Dhaka time.
String formatDate(DateTime value) {
  final d = toDhaka(value);
  return '${d.day.toString().padLeft(2, '0')} ${monthShortNames[d.month - 1]} ${d.year}';
}

/// `05 Oct`, read in Dhaka time.
String formatDateShort(DateTime value) {
  final d = toDhaka(value);
  return '${d.day.toString().padLeft(2, '0')} ${monthShortNames[d.month - 1]}';
}

const Map<String, String> paymentMethodLabels = {
  'CASH': 'Cash',
  'BKASH': 'bKash',
  'NAGAD': 'Nagad',
  'BANK': 'Bank',
  'OTHER': 'Other',
};

String formatPaymentMethod(String method) =>
    paymentMethodLabels[method] ?? method;

/// Parse user-typed money, accepting commas. Returns null when invalid.
double? parseAmount(String raw) {
  final value = double.tryParse(raw.replaceAll(',', '').trim());
  if (value == null || !value.isFinite) return null;
  return value;
}
