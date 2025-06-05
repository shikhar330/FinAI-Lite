
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Landmark, Percent, Banknote, Scale, AlertTriangle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FinancialHealthScore } from './FinancialHealthScore'; // Import the component

interface FinancialSummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  subDescription?: string;
  valueColor?: string;
}

function FinancialSummaryCard({ title, value, icon: Icon, description, subDescription, valueColor }: FinancialSummaryCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", valueColor)}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {subDescription && <p className="text-xs text-muted-foreground mt-0.5">{subDescription}</p>}
      </CardContent>
    </Card>
  );
}

export function FinancialSummarySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [incomeItems, setIncomeItems] = useState<Awaited<ReturnType<typeof getIncomeItems>>>([]);
  const [expenseItems, setExpenseItems] = useState<Awaited<ReturnType<typeof getExpenseItems>>>([]);
  const [investmentItems, setInvestmentItems] = useState<Awaited<ReturnType<typeof getInvestmentItems>>>([]);
  const [loanItems, setLoanItems] = useState<Awaited<ReturnType<typeof getLoanItems>>>([]);
  
  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
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
      console.error("Failed to fetch financial data for summary:", error);
      toast({ title: "Error Loading Summary Data", description: "Could not load key financial metrics.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const financialData = useMemo(() => {
    const effectiveMonthlyIncome = 
      incomeItems.filter(item => item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0) +
      (incomeItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12) +
      (incomeItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Spread one-time over a year

    const effectiveMonthlyExpenses = 
      expenseItems.filter(item => item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0) +
      (expenseItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12) +
      (expenseItems.filter(item => item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33) +
      (expenseItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);


    const monthlySavings = effectiveMonthlyIncome - effectiveMonthlyExpenses;
    
    const monthlyLoanPayments = loanItems.reduce((sum, item) => sum + item.monthlyPayment, 0);
    const debtToIncomeRatio = effectiveMonthlyIncome > 0 ? (monthlyLoanPayments / effectiveMonthlyIncome) * 100 : 0;
    
    // Use initialInvestment for Net Worth calculation
    const sumOfInitialInvestments = investmentItems.reduce((sum, item) => sum + (item.initialInvestment || 0), 0);
    const totalLoanBalance = loanItems.reduce((sum, item) => sum + item.outstandingBalance, 0);
    const netWorth = sumOfInitialInvestments - totalLoanBalance;

    return {
      monthlySavings,
      debtToIncomeRatio,
      netWorth,
      totalMonthlyIncome: effectiveMonthlyIncome,
    };
  }, [incomeItems, expenseItems, investmentItems, loanItems]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  
  const getDtiAssessment = (ratio: number) => {
    if (ratio === 0) return { text: "No Debt", color: "text-green-600 dark:text-green-500" };
    if (ratio <= 20) return { text: "Excellent (Recommended: below 36%)", color: "text-green-600 dark:text-green-500" };
    if (ratio <= 36) return { text: "Good (Recommended: below 36%)", color: "text-yellow-600 dark:text-yellow-500" };
    if (ratio <= 43) return { text: "Fair (Recommended: below 36%)", color: "text-orange-500" };
    return { text: "High (Recommended: below 36%)", color: "text-red-600 dark:text-red-500" };
  };


  if (isLoading) {
    return (
      <section aria-labelledby="financial-summary-title">
        <h2 id="financial-summary-title" className="text-xl font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Render FinancialHealthScore skeleton if it's part of this section while loading */}
          <Card className="shadow-md h-[150px]"><CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-2"></div><Loader2 className={`h-5 w-5 text-muted animate-spin`} /></CardHeader><CardContent><div className="h-8 bg-muted rounded w-1/2 mb-2 animate-pulse"></div><div className="h-3 bg-muted rounded w-full animate-pulse"></div></CardContent></Card>
          {Array(3).fill(0).map((_, index) => ( // 3 other cards
             <Card key={index} className="shadow-md h-[150px]">
               <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-2"></div>
                  <Loader2 className={`h-5 w-5 text-muted animate-spin`} />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-full animate-pulse"></div>
                </CardContent>
             </Card>
          ))}
        </div>
      </section>
    );
  }
  
  const hasAnyData = incomeItems.length > 0 || expenseItems.length > 0 || investmentItems.length > 0 || loanItems.length > 0;

  if (!hasAnyData) {
     return (
       <section aria-labelledby="financial-summary-title">
        <h2 id="financial-summary-title" className="text-xl font-semibold mb-4">Financial Summary</h2>
         <div className="p-6 bg-muted/50 rounded-lg text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No financial data available to display summary. Please add your details in "Update Finances".</p>
         </div>
      </section>
     )
  }


  return (
    <section aria-labelledby="financial-summary-title">
      <h2 id="financial-summary-title" className="text-xl font-semibold mb-4">Financial Summary</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialHealthScore /> 
        <FinancialSummaryCard 
          title="Monthly Savings" 
          value={formatCurrency(financialData.monthlySavings)} 
          icon={Banknote} 
          description="Your monthly cash surplus after expenses" 
          valueColor={financialData.monthlySavings >=0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}
        />
        <FinancialSummaryCard 
          title="Debt-to-Income Ratio" 
          value={`${financialData.debtToIncomeRatio.toFixed(2)}%`} 
          icon={Scale} 
          description={getDtiAssessment(financialData.debtToIncomeRatio).text}
          valueColor={getDtiAssessment(financialData.debtToIncomeRatio).color}
        />
        <FinancialSummaryCard 
          title="Net Worth" 
          value={formatCurrency(financialData.netWorth)} 
          icon={Landmark} 
          description="Initial investments minus total liabilities"
          valueColor={financialData.netWorth >=0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}
        />
        <FinancialSummaryCard 
          title="Total Monthly Income" 
          value={formatCurrency(financialData.totalMonthlyIncome)} 
          icon={TrendingUp}
          description="Combined income from all sources"
        />
      </div>
    </section>
  );
}
