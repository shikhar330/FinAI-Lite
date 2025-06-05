
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

export const EXPENSE_CATEGORIES = ["Housing", "Transportation", "Food", "Utilities", "Healthcare", "Insurance", "Personal Care", "Entertainment", "Debt Payments", "Savings/Investments", "Other"];
export const INVESTMENT_TYPES = ["Stocks", "Bonds", "Mutual Funds", "ETFs", "Real Estate", "Cryptocurrency", "Retirement Account (401k, IRA)", "Other"];
export const LOAN_TYPES = ["Mortgage", "Student Loan", "Personal Loan", "Auto Loan", "Credit Card Debt", "Other"];
export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-Time' },
  { value: 'weekly', label: 'Weekly' },
];

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
  category: z.string(),
  type: z.enum(['fixed', 'variable']),
  frequency: z.enum(['monthly', 'weekly', 'one-time', 'yearly']),
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
