import { z } from 'zod';
import { UserRole, PaymentMethod, RechargeStatus, LedgerType, CustomerStatus } from '@prisma/client';

// Customer schemas
export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  address: z.string().optional(),
  area: z.string().optional(),
  zone: z.string().optional(),
  nid: z.string().optional(),
  connectionId: z.string().optional(),
  onuMac: z.string().optional(),
  pppoeUsername: z.string().optional(),
  planId: z.string().optional().transform(v => v === '' ? undefined : v),
  assignedAgentId: z.string().optional().transform(v => v === '' ? undefined : v),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.ACTIVE),
});

export const customerUpdateSchema = customerSchema.partial();

// Recharge schemas
export const rechargeSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  date: z.date().or(z.string().transform((str) => new Date(str))),
  method: z.nativeEnum(PaymentMethod),
  referenceId: z.string().optional(),
  status: z.nativeEnum(RechargeStatus).default(RechargeStatus.CONFIRMED),
  notes: z.string().optional(),
});

// Payment schemas
export const paymentSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive('Amount must be positive'),
  date: z.date().or(z.string().transform((str) => new Date(str))),
  method: z.nativeEnum(PaymentMethod),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

// Ledger entry schemas
export const ledgerEntrySchema = z.object({
  type: z.nativeEnum(LedgerType),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.date().or(z.string().transform((str) => new Date(str))),
  method: z.nativeEnum(PaymentMethod).optional(),
  vendor: z.string().optional(),
  source: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

// Plan schemas
export const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  speedLabel: z.string().min(1, 'Speed label is required'),
  monthlyPrice: z.number().positive('Price must be positive'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Partner schemas
export const partnerSchema = z.object({
  userId: z.string(),
  sharePercent: z.number().min(0).max(100, 'Share percentage must be between 0 and 100'),
  isActive: z.boolean().default(true),
});

// User schemas
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = userSchema.partial().omit({ password: true });

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Report filter schemas
export const monthlyReportSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const dateRangeSchema = z.object({
  startDate: z.date().or(z.string().transform((str) => new Date(str))),
  endDate: z.date().or(z.string().transform((str) => new Date(str))),
});

// Settings schema
export const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

// Type exports
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type RechargeInput = z.infer<typeof rechargeSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type PartnerInput = z.infer<typeof partnerSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type SettingInput = z.infer<typeof settingSchema>;