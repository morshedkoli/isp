import { businessToday } from '@/lib/business-date';
import { formatTaka } from '@/lib/format';

export interface Partner {
    id: string;
    sharePercent: number;
    isActive: boolean;
    createdAt: Date;
    user: {
        name: string;
        email: string;
        phone?: string | null;
    };
}

export interface Period {
    year: number;
    month: number;
}

export interface RecentPayout {
    id: string;
    partnerName: string;
    amount: number;
    date: string;
    method: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
    referenceId?: string | null;
    notes?: string | null;
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

export const PAYMENT_METHODS: Array<RecentPayout['method']> = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

/**
 * Today in the business timezone. `toISOString()` returned the UTC day, which
 * is the previous date between midnight and 06:00 in Dhaka.
 */
export const todayInputValue = () => businessToday();

/**
 * @deprecated Import `formatTaka` from `@/lib/format` instead. Kept as a
 * delegating alias — this rendered "BDT 1,234" while the rest of the app
 * rendered "৳1,234", so partner settlement screens looked like another product.
 */
export const formatMoney = (amount: number) => formatTaka(amount, { decimals: true });

export const formatMethod = (method: RecentPayout['method']) => {
    switch (method) {
        case 'BKASH': return 'bKash';
        case 'NAGAD': return 'Nagad';
        default: return method;
    }
};
