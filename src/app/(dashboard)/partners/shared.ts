import { businessToday, toCalendarDate } from '@/lib/business-date';
import { formatTaka } from '@/lib/format';
import type {
  AdjustmentDirection,
  PartnerLedgerEntry,
  PartnerMonthlyEarningRow,
  PaymentMethodType,
} from '@/lib/partner-ledger';

export type {
  AdjustmentDirection,
  PartnerLedgerEntry,
  PartnerMonthlyEarningRow,
  PaymentMethodType,
};

export interface PartnerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sharePercent: number;
  isActive: boolean;
  createdAt: string;
  totalEarned: number;
  totalCreditAdjustments: number;
  totalDebitAdjustments: number;
  totalPaid: number;
  balance: number;
  thisMonthEarned: number;
  thisMonthPaid: number;
  calculatedMonthsCount: number;
  payoutsCount: number;
}

export interface Period {
  year: number;
  month: number;
}

export interface RecentPayout {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  method: PaymentMethodType;
  referenceId?: string | null;
  notes?: string | null;
  isSettlement?: boolean;
  settlementYear?: number | null;
  settlementMonth?: number | null;
}

export interface SettlementPartnerRow {
  partnerId: string;
  partnerName: string;
  sharePercent: number;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const PAYMENT_METHODS: PaymentMethodType[] = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

export const todayInputValue = () => businessToday();

export const dateToInputValue = (isoOrDate: string | Date) => toCalendarDate(isoOrDate);

export const formatMoney = (amount: number) => formatTaka(amount, { decimals: true });

export const formatMethod = (method: PaymentMethodType | string) => {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'BKASH':
      return 'bKash';
    case 'NAGAD':
      return 'Nagad';
    case 'BANK':
      return 'Bank';
    case 'OTHER':
      return 'Other';
    default:
      return method;
  }
};
