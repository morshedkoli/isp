/// Calendar-date handling for the business timezone (Asia/Dhaka, UTC+6, no DST).
///
/// Mirrors `src/lib/business-date.ts` in the web app so both write and read
/// the same values:
///  * a calendar date is stored as UTC midnight of that day;
///  * the month a stored instant belongs to is read in Dhaka time.
library;

const Duration dhakaOffset = Duration(hours: 6);

const List<String> monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const List<String> monthShortNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// A calendar month, e.g. October 2026.
class Period implements Comparable<Period> {
  const Period(this.year, this.month);

  final int year;
  final int month;

  /// `2026-10`, matching the web app's `periodKey`.
  String get key => '$year-${month.toString().padLeft(2, '0')}';

  /// `October 2026`, matching the web app's `formatPeriod`.
  String get label => '${monthNames[month - 1]} $year';

  Period get previous =>
      month == 1 ? Period(year - 1, 12) : Period(year, month - 1);
  Period get next =>
      month == 12 ? Period(year + 1, 1) : Period(year, month + 1);

  /// True when this period is strictly before [cutoff].
  bool isBefore(Period cutoff) =>
      year < cutoff.year || (year == cutoff.year && month < cutoff.month);

  /// First instant of the month, as stored rows are anchored (UTC midnight).
  DateTime get start => DateTime.utc(year, month, 1);

  /// Last millisecond of the month's last calendar day (UTC).
  DateTime get end => DateTime.utc(year, month + 1, 0, 23, 59, 59, 999);

  static Period parseKey(String key) {
    final parts = key.split('-');
    return Period(int.parse(parts[0]), int.parse(parts[1]));
  }

  @override
  int compareTo(Period other) =>
      year != other.year ? year - other.year : month - other.month;

  @override
  bool operator ==(Object other) =>
      other is Period && other.year == year && other.month == month;

  @override
  int get hashCode => Object.hash(year, month);

  @override
  String toString() => key;
}

/// The instant shifted into Dhaka wall-clock time (as a UTC DateTime).
DateTime toDhaka(DateTime value) => value.toUtc().add(dhakaOffset);

/// The period a stored date belongs to in the business timezone.
Period periodOf(DateTime value) {
  final local = toDhaka(value);
  return Period(local.year, local.month);
}

/// The current month in Dhaka.
Period currentPeriod() => periodOf(DateTime.now());

/// Today's calendar date in Dhaka, as a UTC-midnight DateTime.
DateTime businessToday() {
  final local = toDhaka(DateTime.now());
  return DateTime.utc(local.year, local.month, local.day);
}

/// A picked calendar day (from a date picker, in any timezone) → the stored
/// UTC-midnight instant.
DateTime calendarDay(DateTime picked) =>
    DateTime.utc(picked.year, picked.month, picked.day);

/// A stored instant → the calendar day it represents in Dhaka (UTC midnight).
DateTime storedToCalendarDay(DateTime stored) {
  final local = toDhaka(stored);
  return DateTime.utc(local.year, local.month, local.day);
}

/// The date an entry form should open on for [period]: today when that is the
/// current month, otherwise the 1st, so new entries land in the viewed month.
DateTime defaultEntryDate(Period period) {
  final today = businessToday();
  if (today.year == period.year && today.month == period.month) return today;
  return DateTime.utc(period.year, period.month, 1);
}
