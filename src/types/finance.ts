
import { z } from 'zod';

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'one-time';
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'fixed' | 'variable';
  frequency: 'monthly' | 'weekly' | 'one-time' | 'yearly';
  tags?: string[];
}

export interface InvestmentItem {
  id: string;
  name: string;
  type: string; // e.g., Stocks, Bonds, Real Estate, Crypto
  currentValue: number;
  initialInvestment?: number;
  purchaseDate?: string; // ISO date string
}

export interface LoanItem {
  id: string;
  name: string;
  type: string; // e.g., Mortgage, Student Loan, Personal Loan, Auto Loan
  outstandingBalance: number;
  interestRate?: number;
  monthlyPayment: number;
  originalAmount?: number;
  startDate?: string; // ISO date string
}

export const GOAL_TYPES = ['Retirement', 'House', 'Education', 'Vacation', 'Emergency Fund', 'Debt Repayment', 'Major Purchase', 'Other'] as const;
export const GOAL_PRIORITIES = ['low', 'medium', 'high'] as const;
export const GOAL_STATUSES = ['on-track', 'at-risk', 'achieved', 'on-hold', 'not-started', 'off-track'] as const;

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  goalType: typeof GOAL_TYPES[number];
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // ISO date string
  priority: typeof GOAL_PRIORITIES[number];
  status: typeof GOAL_STATUSES[number];
}

export const EXPENSE_CATEGORIES = ["Housing", "Transportation", "Food", "Utilities", "Healthcare", "Insurance", "Personal Care", "Entertainment", "Debt Payments", "Savings/Investments", "Education", "Gifts/Donations", "Travel", "Shopping", "Groceries", "Other"] as const;
export const INVESTMENT_TYPES = ["Stocks", "Bonds", "Mutual Funds", "ETFs", "Real Estate", "Cryptocurrency", "Retirement Account (401k, IRA)", "Other"] as const;
export const LOAN_TYPES = ["Mortgage", "Student Loan", "Personal Loan", "Auto Loan", "Credit Card Debt", "Other"] as const;
export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;


// --- Bill Reminders Related Types ---
export const BILL_CATEGORIES = ["Utilities", "Credit Card", "Loan Payment", "Subscription", "Rent/Mortgage", "Insurance", "Taxes", "Medical", "Education", "Groceries", "Internet", "Phone", "Other"] as const;
export const BILL_RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
export const BILL_STATUSES = ['upcoming', 'paid', 'overdue', 'cancelled'] as const;
export const BILL_REMINDER_OPTIONS = [0, 1, 2, 3, 5, 7, 14, 30] as const; // Days before (0 for on due date)
export const LATE_FEE_TYPES = ['fixed', 'percentage'] as const;

export interface BillItem {
  id: string;
  name: string;
  amount: number;
  category: typeof BILL_CATEGORIES[number];
  dueDate: string; // ISO date string of the next due date
  isRecurring: boolean;
  recurrenceFrequency?: typeof BILL_RECURRENCE_FREQUENCIES[number];
  reminderDaysBefore: number;
  status: typeof BILL_STATUSES[number];
  notes?: string;
  paidDate?: string | null; // ISO date string, set when status becomes 'paid', or null
  userId?: string; // To associate with a user
  lateFeeType?: typeof LATE_FEE_TYPES[number];
  lateFeeValue?: number; // Fixed amount or percentage rate (e.g., 2 for 2%)
  lateFeeGracePeriodDays?: number; // Default 0 if not set
  createdAt?: string; // ISO date string, when the bill was created
}

// Zod schema for BillItem Firestore data structure (used internally, not directly for forms)
export const BillItemFirestoreSchema = z.object({
  name: z.string(),
  amount: z.number(),
  category: z.enum(BILL_CATEGORIES),
  dueDate: z.string(), // Should be ISO string
  isRecurring: z.boolean(),
  recurrenceFrequency: z.enum(BILL_RECURRENCE_FREQUENCIES).optional(),
  reminderDaysBefore: z.number(),
  status: z.enum(BILL_STATUSES),
  notes: z.string().optional(),
  paidDate: z.string().nullable().optional(), // Should be ISO string or null
  userId: z.string(),
  lateFeeType: z.enum(LATE_FEE_TYPES).optional(),
  lateFeeValue: z.number().optional(),
  lateFeeGracePeriodDays: z.number().optional(),
  createdAt: z.string().optional(), // ISO string
});


// Zod Schema for Bill Form validation
export const BillFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100, 'Name is too long.'),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be a positive number.'),
  category: z.enum(BILL_CATEGORIES, { required_error: "Bill category is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(BILL_RECURRENCE_FREQUENCIES).optional(),
  reminderDaysBefore: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, 'Reminder days must be a non-negative number.').default("3"),
  status: z.enum(BILL_STATUSES).default('upcoming'),
  notes: z.string().max(500, "Notes are too long.").optional(),
  lateFeeType: z.enum(LATE_FEE_TYPES).optional(),
  lateFeeValue: z.string().optional().refine(val => val === undefined || val.trim() === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: 'Late fee value must be a non-negative number.'}),
  lateFeeGracePeriodDays: z.string().optional().refine(val => val === undefined || val.trim() === '' || (!isNaN(parseInt(val)) && parseInt(val) >= 0), { message: 'Grace period must be a non-negative integer.'}),
}).refine(data => {
    if (data.isRecurring && !data.recurrenceFrequency) {
        return false; // recurrenceFrequency is required if isRecurring is true
    }
    return true;
}, {
    message: "Recurrence frequency is required for recurring bills.",
    path: ["recurrenceFrequency"],
}).refine(data => {
    // If lateFeeType is set, lateFeeValue must also be set and valid
    if (data.lateFeeType && (data.lateFeeValue === undefined || data.lateFeeValue.trim() === '' || isNaN(parseFloat(data.lateFeeValue)))) {
        return false;
    }
    return true;
}, {
    message: "Late fee value is required if late fee type is selected.",
    path: ["lateFeeValue"],
}).refine(data => {
    // If lateFeeType is 'percentage', lateFeeValue should be <= 100
    if (data.lateFeeType === 'percentage' && data.lateFeeValue && parseFloat(data.lateFeeValue) > 100) {
        return false;
    }
    return true;
}, {
    message: "Percentage late fee cannot exceed 100%.",
    path: ["lateFeeValue"],
});


// Zod Schemas for AI Flows
export const IncomeItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  frequency: z.enum(['monthly', 'yearly', 'one-time']),
});

export const ExpenseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  category: z.string(), // Will be one of EXPENSE_CATEGORIES
  type: z.enum(['fixed', 'variable']),
  frequency: z.enum(['monthly', 'weekly', 'one-time', 'yearly']),
  tags: z.array(z.string()).optional(),
});

export const InvestmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  currentValue: z.number(),
  initialInvestment: z.number().nullable().optional(),
  purchaseDate: z.string().nullable().optional(), // ISO date string
});

export const LoanItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  outstandingBalance: z.number(),
  interestRate: z.number().nullable().optional(),
  monthlyPayment: z.number(),
  originalAmount: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(), // ISO date string
});

// Zod Schema for FinancialGoal form validation
export const FinancialGoalSchema = z.object({
  name: z.string().min(3, 'Goal name must be at least 3 characters.').max(100, 'Goal name is too long.'),
  description: z.string().max(500, 'Description is too long.').optional(),
  goalType: z.enum(GOAL_TYPES, { required_error: "Goal type is required."}),
  targetAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Target amount must be a positive number.'),
  currentAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Current amount must be a non-negative number.'),
  targetDate: z.date().optional(),
  priority: z.enum(GOAL_PRIORITIES, { required_error: "Priority is required." }),
  status: z.enum(GOAL_STATUSES, { required_error: "Status is required." }),
}).refine(data => parseFloat(data.currentAmount) <= parseFloat(data.targetAmount), {
  message: "Current amount cannot exceed target amount.",
  path: ["currentAmount"],
});
