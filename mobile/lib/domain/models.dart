/// Plain data types mirroring the Prisma models the app reads and writes.
library;

const List<String> paymentMethods = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

enum PersonKind { partner, agent }

enum LedgerKind { calculation, adjustment, payout }

enum Direction { credit, debit }

// ─── Hotspot ──────────────────────────────────────────────────────────────────

class HotspotPackageInfo {
  const HotspotPackageInfo(this.key, this.label, this.price, this.days);
  final String key;
  final String label;
  final double price;
  final int days;
}

/// Single source of truth for hotspot pricing, same as the web `constants.ts`.
const Map<String, HotspotPackageInfo> hotspotPackages = {
  'SEVEN_DAY': HotspotPackageInfo('SEVEN_DAY', '7-Day Pass', 50, 7),
  'THIRTY_DAY': HotspotPackageInfo('THIRTY_DAY', '30-Day Pass', 200, 30),
};

class HotspotSale {
  const HotspotSale({
    required this.id,
    required this.package,
    required this.quantity,
    required this.discount,
    required this.amount,
    required this.date,
    this.customerName,
    this.customerPhone,
    this.notes,
  });

  final String id;
  final String package;
  final int quantity;
  final double discount;
  final double amount;
  final DateTime date;
  final String? customerName;
  final String? customerPhone;
  final String? notes;
}

class HotspotSaleInput {
  const HotspotSaleInput({
    required this.package,
    required this.quantity,
    required this.discount,
    required this.date,
    this.customerName,
    this.customerPhone,
    this.notes,
  });

  final String package;
  final int quantity;
  final double discount;
  final DateTime date;
  final String? customerName;
  final String? customerPhone;
  final String? notes;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

class ExpenseTypeInfo {
  const ExpenseTypeInfo(this.key, this.title, this.nameLabel, this.hint);
  final String key;
  final String title;
  final String nameLabel;
  final String hint;
}

/// Display order and labels, same as the web `expenses/shared.ts`.
const List<ExpenseTypeInfo> expenseTypes = [
  ExpenseTypeInfo(
    'SALARY',
    'বেতন (Salaries)',
    'কর্মচারীর নাম',
    'যেমন: রহিম, করিম',
  ),
  ExpenseTypeInfo(
    'FIBER_CABLE',
    'ফাইবার ক্যাবল (Fiber Cable)',
    'ক্যাবল খরচ বিবরণ',
    'যেমন: মেইন লাইন ক্যাবল',
  ),
  ExpenseTypeInfo(
    'RENT',
    'স্থান ও অফিস ভাড়া (Office Rent)',
    'ভাড়ার বিবরণ',
    'যেমন: মেইন অফিস ভাড়া',
  ),
  ExpenseTypeInfo(
    'UTILITIES',
    'বিদ্যুৎ ও বিল (Utilities)',
    'বিল বিবরণ',
    'যেমন: বিদ্যুৎ বিল',
  ),
  ExpenseTypeInfo(
    'EQUIPMENT',
    'ডিভাইস ও যন্ত্রপাতি (Equipment)',
    'যন্ত্রপাতির বিবরণ',
    'যেমন: Mikrotik Router, OLT',
  ),
  ExpenseTypeInfo(
    'CONVEYANCE',
    'যাতায়াত (Conveyance)',
    'যাতায়াত বিবরণ',
    'যেমন: বাইক ফুয়েল, অটো ভাড়া',
  ),
  ExpenseTypeInfo(
    'MISC',
    'অন্যান্য খরচ (Misc. Expenses)',
    'বিবরণ',
    'যেমন: চা-নাস্তা খরচ',
  ),
];

ExpenseTypeInfo expenseTypeInfo(String key) => expenseTypes.firstWhere(
  (t) => t.key == key,
  orElse: () => expenseTypes.last,
);

class Expense {
  const Expense({
    required this.id,
    required this.type,
    required this.description,
    required this.amount,
    required this.date,
    required this.year,
    required this.month,
    this.notes,
  });

  final String id;
  final String type;
  final String description;
  final double amount;
  final DateTime date;
  final int year;
  final int month;
  final String? notes;
}

class ExpenseInput {
  const ExpenseInput({
    required this.type,
    required this.description,
    required this.amount,
    required this.date,
    this.notes,
  });

  final String type;
  final String description;
  final double amount;
  final DateTime date;
  final String? notes;
}

// ─── Commissions ──────────────────────────────────────────────────────────────

class CommissionAgent {
  const CommissionAgent({
    required this.id,
    required this.name,
    required this.commissionPercent,
    required this.isActive,
    required this.createdAt,
    this.phone,
    this.notes,
  });

  final String id;
  final String name;
  final String? phone;
  final double commissionPercent;
  final bool isActive;
  final String? notes;
  final DateTime createdAt;
}

class CommissionSource {
  const CommissionSource(this.description, this.amount);
  final String description;
  final double amount;
}

class AgentCommissionEntry {
  const AgentCommissionEntry({
    required this.id,
    required this.agentId,
    required this.amount,
  });

  final String id;
  final String agentId;
  final double amount;
}

class CommissionRecord {
  const CommissionRecord({
    required this.id,
    required this.year,
    required this.month,
    required this.totalPool,
    required this.createdAt,
    required this.sources,
    required this.agentEntries,
    this.notes,
  });

  final String id;
  final int year;
  final int month;
  final double totalPool;
  final String? notes;
  final DateTime createdAt;
  final List<CommissionSource> sources;
  final List<AgentCommissionEntry> agentEntries;

  double get agentTotal => agentEntries.fold(0, (sum, e) => sum + e.amount);
}

/// The calculator's suggestion for an agent: (base / 49) × rate, rate
/// defaulting to 42 — identical to the web CalculatorTab.
double suggestedAgentCommission(double base, double percent) {
  final multiplier = percent == 0 ? 42 : percent;
  return double.parse(((base / 49) * multiplier).toStringAsFixed(2));
}

// ─── Partners, payouts & adjustments ──────────────────────────────────────────

class Partner {
  const Partner({
    required this.id,
    required this.name,
    required this.email,
    required this.sharePercent,
    required this.isActive,
    required this.createdAt,
    this.phone,
  });

  final String id;
  final String name;
  final String email;
  final String? phone;
  final double sharePercent;
  final bool isActive;
  final DateTime createdAt;
}

class Payout {
  const Payout({
    required this.id,
    required this.personId,
    required this.amount,
    required this.date,
    required this.method,
    required this.createdAt,
    this.referenceId,
    this.notes,
    this.isSettlement = false,
    this.settlementYear,
    this.settlementMonth,
  });

  final String id;
  final String personId;
  final double amount;
  final DateTime date;
  final String method;
  final String? referenceId;
  final String? notes;
  final bool isSettlement;
  final int? settlementYear;
  final int? settlementMonth;
  final DateTime createdAt;
}

class Adjustment {
  const Adjustment({
    required this.id,
    required this.personId,
    required this.type,
    required this.amount,
    required this.date,
    required this.reason,
    required this.createdAt,
    this.notes,
  });

  final String id;
  final String personId;
  final Direction type;
  final double amount;
  final DateTime date;
  final String reason;
  final String? notes;
  final DateTime createdAt;
}

class PaymentInput {
  const PaymentInput({
    required this.amount,
    required this.date,
    required this.method,
    this.referenceId,
    this.notes,
  });

  final double amount;
  final DateTime date;
  final String method;
  final String? referenceId;
  final String? notes;
}

class AdjustmentInput {
  const AdjustmentInput({
    required this.type,
    required this.amount,
    required this.date,
    required this.reason,
    this.notes,
  });

  final Direction type;
  final double amount;
  final DateTime date;
  final String reason;
  final String? notes;
}

/// Everything the balance screens and the overview are computed from.
class LedgerSnapshot {
  const LedgerSnapshot({
    required this.partners,
    required this.agents,
    required this.records,
    required this.expenses,
    required this.partnerPayouts,
    required this.partnerAdjustments,
    required this.agentPayouts,
    required this.agentAdjustments,
    required this.hotspotSales,
  });

  final List<Partner> partners;
  final List<CommissionAgent> agents;
  final List<CommissionRecord> records;
  final List<Expense> expenses;
  final List<Payout> partnerPayouts;
  final List<Adjustment> partnerAdjustments;
  final List<Payout> agentPayouts;
  final List<Adjustment> agentAdjustments;
  final List<HotspotSale> hotspotSales;
}
