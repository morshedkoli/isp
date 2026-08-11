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

export const todayInputValue = () => new Date().toISOString().split('T')[0];

export const formatMoney = (amount: number) =>
    `BDT ${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export const formatMethod = (method: RecentPayout['method']) => {
    switch (method) {
        case 'BKASH': return 'bKash';
        case 'NAGAD': return 'Nagad';
        default: return method;
    }
};
