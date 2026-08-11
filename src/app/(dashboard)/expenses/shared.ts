export type ExpenseType = 'SALARY' | 'FIBER_CABLE' | 'RENT' | 'UTILITIES' | 'EQUIPMENT' | 'CONVEYANCE' | 'MISC';

export interface Expense {
  id: string;
  type: ExpenseType;
  description: string;
  amount: number;
  date: string | Date;
  notes?: string | null;
}

/** Per-type presentation config, so salary and misc read consistently everywhere. */
export const EXPENSE_CONFIG = {
  SALARY: {
    title: 'বেতন (Salaries)',
    totalLabel: 'মোট বেতন',
    nameLabel: 'কর্মচারীর নাম',
    formTitle: 'বেতন যোগ করুন',
    formHint: 'এই মেয়াদের জন্য কর্মচারীর বেতন',
    namePlaceholder: 'যেমন: রহিম, করিম',
    emptyText: 'এখনও কোনো বেতন যোগ করা হয়নি',
    accent: 'partner',
  },
  FIBER_CABLE: {
    title: 'ফাইবার ক্যাবল (Fiber Cable)',
    totalLabel: 'মোট ফাইবার ক্যাবল',
    nameLabel: 'ক্যাবল খরচ বিবরণ',
    formTitle: 'ফাইবার ক্যাবল খরচ যোগ করুন',
    formHint: 'ফাইবার ক্যাবল ক্রয় বা রক্ষণাবেক্ষণ খরচ',
    namePlaceholder: 'যেমন: মেইন লাইন ক্যাবল, অনু প্যাচ ক্যাবল',
    emptyText: 'এখনও কোনো ফাইবার ক্যাবল খরচ যোগ করা হয়নি',
    accent: 'hotspot',
  },
  RENT: {
    title: 'স্থান ও অফিস ভাড়া (Office Rent)',
    totalLabel: 'মোট অফিস ভাড়া',
    nameLabel: 'ভাড়ার বিবরণ',
    formTitle: 'স্থান/অফিস ভাড়া যোগ করুন',
    formHint: 'অফিস বা পপ রুম স্পেস ভাড়া খরচ',
    namePlaceholder: 'যেমন: মেইন অফিস ভাড়া, পপ স্থান ভাড়া',
    emptyText: 'এখনও কোনো অফিস ভাড়া যোগ করা হয়নি',
    accent: 'profit',
  },
  UTILITIES: {
    title: 'বিদ্যুৎ ও বিল (Utilities)',
    totalLabel: 'মোট বিদ্যুৎ ও বিল',
    nameLabel: 'বিল বিবরণ',
    formTitle: 'বিদ্যুৎ ও ইউটিলিটি বিল যোগ করুন',
    formHint: 'বিদ্যুৎ বিল, ইন্টারনেট ও সার্ভিস ইউটিলিটি খরচ',
    namePlaceholder: 'যেমন: ফেব্রুয়ারি বিদ্যুৎ বিল, জেনারেটর তেল',
    emptyText: 'এখনও কোনো বিদ্যুৎ ও বিল যোগ করা হয়নি',
    accent: 'loss',
  },
  EQUIPMENT: {
    title: 'ডিভাইস ও যন্ত্রপাতি (Equipment)',
    totalLabel: 'মোট ডিভাইস খরচ',
    nameLabel: 'যন্ত্রপাতির বিবরণ',
    formTitle: 'ডিভাইস/যন্ত্রপাতি খরচ যোগ করুন',
    formHint: 'রাউটার, ওএলটি, সুইচ ও অন্যান্য হার্ডওয়্যার ক্রয় খরচ',
    namePlaceholder: 'যেমন: Mikrotik Router, OLT, Switch',
    emptyText: 'এখনও কোনো ডিভাইস/যন্ত্রপাতি খরচ যোগ করা হয়নি',
    accent: 'commission',
  },
  CONVEYANCE: {
    title: 'যাতায়াত (Conveyance)',
    totalLabel: 'মোট যাতায়াত খরচ',
    nameLabel: 'যাতায়াত বিবরণ',
    formTitle: 'যাতায়াত খরচ যোগ করুন',
    formHint: 'পরিবহন, গাড়ী ও যাতায়াত ভাড়া খরচ',
    namePlaceholder: 'যেমন: বাইক ফুয়েল, অটো ভাড়া, রিকশা ভাড়া',
    emptyText: 'এখনও কোনো যাতায়াত খরচ যোগ করা হয়নি',
    accent: 'partner',
  },
  MISC: {
    title: 'অন্যান্য খরচ (Misc. Expenses)',
    totalLabel: 'মোট অন্যান্য খরচ',
    nameLabel: 'বিবরণ',
    formTitle: 'অন্যান্য খরচ যোগ করুন',
    formHint: 'অন্যান্য ব্যবসায়িক খরচ',
    namePlaceholder: 'যেমন: নাস্তা খরচ, চা-নাস্তা খরচ',
    emptyText: 'এখনও কোনো অন্যান্য খরচ যোগ করা হয়নি',
    accent: 'agent',
  },
} as const;
