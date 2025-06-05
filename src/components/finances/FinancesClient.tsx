
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeSection } from "./IncomeSection";
import { ExpensesSection } from "./ExpensesSection";
import { InvestmentsSection } from "./InvestmentsSection";
import { LoansSection } from "./LoansSection";
import {
  getIncomeItems, addIncomeItem, updateIncomeItem, deleteIncomeItem,
  getExpenseItems, addExpenseItem, updateExpenseItem, deleteExpenseItem,
  getInvestmentItems, addInvestmentItem, updateInvestmentItem, deleteInvestmentItem,
  getLoanItems, addLoanItem, updateLoanItem, deleteLoanItem
} from '@/lib/finance-storage';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import type { z } from 'zod';
import type { incomeSchema } from './IncomeForm';
import type { expenseSchema } from './ExpenseForm';
import type { investmentSchema } from './InvestmentForm';
import type { loanSchema } from './LoanForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function FinancesClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);


  const fetchData = useCallback(async () => {
    if (!user) {
      console.error("[FinancesClient] fetchData called without a user. Skipping data fetch. If you see permission errors, ensure Firestore rules allow access for authenticated users and that you are logged in.");
      setIsLoading(false); // Ensure loading stops if no user
      return;
    }
    setIsLoading(true);
    try {
      console.log(`[FinancesClient] Fetching data for user: ${user.uid}`);
      const [income, expenses, investments, loans] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);
      setIncomeItems(income);
      setExpenseItems(expenses);
      setInvestmentItems(investments);
      setLoanItems(loans);
    } catch (error) {
      console.error("[FinancesClient] Failed to fetch financial data:", error);
      // Firebase permission errors are often caught here.
      if (error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
        toast({ title: 'Permissions Error', description: 'Could not load financial data due to Firestore permissions. Please check your Firestore security rules.', variant: 'destructive', duration: 10000 });
      } else {
        toast({ title: 'Error Fetching Data', description: 'Could not load your financial details. Please try again.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      // Clear data if user logs out
      setIncomeItems([]);
      setExpenseItems([]);
      setInvestmentItems([]);
      setLoanItems([]);
      setIsLoading(false); // Ensure loading state is managed if user is not present
    }
  }, [user, fetchData]);

  const handleMutation = async (action: Promise<any>, successMessage: string, itemName?: string) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to perform this action.', variant: 'destructive' });
      return;
    }
    setIsMutating(true);
    try {
      await action;
      toast({ title: 'Success!', description: itemName ? `${itemName} ${successMessage}` : successMessage });
      await fetchData(); // Re-fetch data to ensure UI consistency
    } catch (error) {
      console.error("[FinancesClient] Mutation failed:", error);
      if (error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
        toast({ title: 'Permissions Error', description: 'Could not complete the action due to Firestore permissions. Please check your Firestore security rules.', variant: 'destructive', duration: 10000 });
      } else {
        toast({ title: 'Operation Failed', description: 'Could not complete the action. Please try again.', variant: 'destructive' });
      }
    } finally {
      setIsMutating(false);
    }
  };

  // --- Income ---
  const handleAddIncome = async (values: z.infer<typeof incomeSchema>) => {
    if (!user) return;
    const newIncome: Omit<IncomeItem, 'id'> = { ...values, amount: parseFloat(values.amount) };
    await handleMutation(addIncomeItem(user.uid, newIncome), "has been added.", newIncome.name);
  };
  const handleUpdateIncome = async (id: string, values: z.infer<typeof incomeSchema>) => {
    if (!user) return;
    const updatedData = { ...values, amount: parseFloat(values.amount) };
    await handleMutation(updateIncomeItem(user.uid, id, updatedData), "has been updated.", updatedData.name);
  };
  const handleDeleteIncome = async (id: string) => {
    if (!user) return;
    const itemToDelete = incomeItems.find(item => item.id === id);
    await handleMutation(deleteIncomeItem(user.uid, id), "has been removed.", itemToDelete?.name);
  };

  // --- Expenses ---
  const handleAddExpense = async (values: z.infer<typeof expenseSchema>) => {
    if (!user) return;
    const newExpense: Omit<ExpenseItem, 'id'> = { ...values, amount: parseFloat(values.amount) };
    await handleMutation(addExpenseItem(user.uid, newExpense), "has been added.", newExpense.name);
  };
  const handleUpdateExpense = async (id: string, values: z.infer<typeof expenseSchema>) => {
    if (!user) return;
    const updatedData = { ...values, amount: parseFloat(values.amount) };
    await handleMutation(updateExpenseItem(user.uid, id, updatedData), "has been updated.", updatedData.name);
  };
  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    const itemToDelete = expenseItems.find(item => item.id === id);
    await handleMutation(deleteExpenseItem(user.uid, id), "has been removed.", itemToDelete?.name);
  };

  // --- Investments ---
  const handleAddInvestment = async (values: z.infer<typeof investmentSchema>) => {
    if (!user) return;
    const newInvestment: Omit<InvestmentItem, 'id'> = {
      ...values,
      currentValue: parseFloat(values.currentValue),
      initialInvestment: values.initialInvestment ? parseFloat(values.initialInvestment) : undefined,
      purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : undefined,
    };
    await handleMutation(addInvestmentItem(user.uid, newInvestment), "has been added.", newInvestment.name);
  };
  const handleUpdateInvestment = async (id: string, values: z.infer<typeof investmentSchema>) => {
    if (!user) return;
    const updatedData = {
      ...values,
      currentValue: parseFloat(values.currentValue),
      initialInvestment: values.initialInvestment ? parseFloat(values.initialInvestment) : undefined,
      purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : undefined,
    };
    await handleMutation(updateInvestmentItem(user.uid, id, updatedData), "has been updated.", updatedData.name);
  };
  const handleDeleteInvestment = async (id: string) => {
    if (!user) return;
    const itemToDelete = investmentItems.find(item => item.id === id);
    await handleMutation(deleteInvestmentItem(user.uid, id), "has been removed.", itemToDelete?.name);
  };

  // --- Loans ---
  const handleAddLoan = async (values: z.infer<typeof loanSchema>) => {
    if (!user) return;
    const newLoan: Omit<LoanItem, 'id'> = {
      ...values,
      outstandingBalance: parseFloat(values.outstandingBalance),
      monthlyPayment: parseFloat(values.monthlyPayment),
      interestRate: values.interestRate ? parseFloat(values.interestRate) : undefined,
      originalAmount: values.originalAmount ? parseFloat(values.originalAmount) : undefined,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
    };
    await handleMutation(addLoanItem(user.uid, newLoan), "has been added.", newLoan.name);
  };
  const handleUpdateLoan = async (id: string, values: z.infer<typeof loanSchema>) => {
    if (!user) return;
    const updatedData = {
      ...values,
      outstandingBalance: parseFloat(values.outstandingBalance),
      monthlyPayment: parseFloat(values.monthlyPayment),
      interestRate: values.interestRate ? parseFloat(values.interestRate) : undefined,
      originalAmount: values.originalAmount ? parseFloat(values.originalAmount) : undefined,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
    };
    await handleMutation(updateLoanItem(user.uid, id, updatedData), "has been updated.", updatedData.name);
  };
  const handleDeleteLoan = async (id: string) => {
    if (!user) return;
    const itemToDelete = loanItems.find(item => item.id === id);
    await handleMutation(deleteLoanItem(user.uid, id), "has been removed.", itemToDelete?.name);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="income" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
        <TabsTrigger value="income">Income</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
        <TabsTrigger value="investments">Investments</TabsTrigger>
        <TabsTrigger value="loans">Loans</TabsTrigger>
      </TabsList>
      <TabsContent value="income">
        <IncomeSection
          incomeItems={incomeItems}
          onAdd={handleAddIncome}
          onUpdate={handleUpdateIncome}
          onDelete={handleDeleteIncome}
          isLoading={isMutating}
        />
      </TabsContent>
      <TabsContent value="expenses">
        <ExpensesSection
          expenseItems={expenseItems}
          onAdd={handleAddExpense}
          onUpdate={handleUpdateExpense}
          onDelete={handleDeleteExpense}
          isLoading={isMutating}
        />
      </TabsContent>
      <TabsContent value="investments">
        <InvestmentsSection
          investmentItems={investmentItems}
          onAdd={handleAddInvestment}
          onUpdate={handleUpdateInvestment}
          onDelete={handleDeleteInvestment}
          isLoading={isMutating}
        />
      </TabsContent>
      <TabsContent value="loans">
        <LoansSection
          loanItems={loanItems}
          onAdd={handleAddLoan}
          onUpdate={handleUpdateLoan}
          onDelete={handleDeleteLoan}
          isLoading={isMutating}
        />
      </TabsContent>
    </Tabs>
  );
}
