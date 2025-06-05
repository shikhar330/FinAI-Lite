
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function FinancialHealthScore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  
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
      console.error("Failed to fetch financial data for health score:", error);
      toast({ title: "Error Loading Score Data", description: "Could not load data for financial health score.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { score, assessment, assessmentColor } = useMemo(() => {
    if (isLoading || !user) return { score: 0, assessment: "Calculating...", assessmentColor: "text-muted-foreground" };
    
    const monthlyIncome = 
      incomeItems.filter(item => item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0) +
      (incomeItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12) +
      (incomeItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);

    const monthlyFixedExpenses = expenseItems
      .filter(item => item.type === 'fixed' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
      + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);

    const monthlyVariableExpenses = expenseItems
      .filter(item => item.type === 'variable' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
      + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);
    
    const monthlyLoanPayments = loanItems.reduce((sum, item) => sum + item.monthlyPayment, 0);
    const totalMonthlyExpenses = monthlyFixedExpenses + monthlyVariableExpenses + monthlyLoanPayments;
    const monthlySavings = monthlyIncome - totalMonthlyExpenses;
    
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyLoanPayments / monthlyIncome) * 100 : 0;
    
    const monthlyInvestmentsFromExpenses = expenseItems
      .filter(item => item.category === 'Savings/Investments' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);

    const investmentRate = monthlyIncome > 0 ? (monthlyInvestmentsFromExpenses / monthlyIncome) * 100 : 0;

    const sumOfInitialInvestments = investmentItems.reduce((sum, item) => sum + (item.initialInvestment || 0), 0);
    const totalLoanBalance = loanItems.reduce((sum, item) => sum + item.outstandingBalance, 0);
    const netWorth = sumOfInitialInvestments - totalLoanBalance;

    let calculatedScore = 0;

    // Savings Rate (30 points)
    if (savingsRate >= 20) calculatedScore += 30;
    else if (savingsRate >= 10) calculatedScore += 20;
    else if (savingsRate >= 0) calculatedScore += 10;

    // Debt-to-Income Ratio (30 points) - Lower is better
    if (debtToIncomeRatio === 0 && monthlyLoanPayments === 0) calculatedScore += 30;
    else if (debtToIncomeRatio <= 15) calculatedScore += 30;
    else if (debtToIncomeRatio <= 28) calculatedScore += 20;
    else if (debtToIncomeRatio <= 36) calculatedScore += 10;

    // Investment Rate (20 points)
    if (investmentRate >= 15) calculatedScore += 20;
    else if (investmentRate >= 10) calculatedScore += 15;
    else if (investmentRate >= 5) calculatedScore += 10;

    // Net Worth (20 points)
    if (netWorth > 0) calculatedScore += 20;
    else if (netWorth === 0 && sumOfInitialInvestments === 0 && totalLoanBalance === 0) calculatedScore += 5; 

    calculatedScore = Math.max(0, Math.min(100, Math.round(calculatedScore)));
    
    let currentAssessment = "Needs Improvement";
    let color = "text-red-500 dark:text-red-400";

    if (calculatedScore >= 80) {
      currentAssessment = "Excellent";
      color = "text-green-500 dark:text-green-400";
    } else if (calculatedScore >= 60) {
      currentAssessment = "Good";
      color = "text-yellow-500 dark:text-yellow-400";
    } else if (calculatedScore >= 40) {
      currentAssessment = "Fair";
      color = "text-orange-500 dark:text-orange-400";
    }
    
    if (monthlyIncome === 0 && totalMonthlyExpenses === 0 && sumOfInitialInvestments === 0 && totalLoanBalance === 0) {
      return { score: 0, assessment: "Add financial data", assessmentColor: "text-muted-foreground" };
    }

    return { score: calculatedScore, assessment: currentAssessment, assessmentColor: color };
  }, [incomeItems, expenseItems, investmentItems, loanItems, isLoading, user]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center text-xs"><ShieldCheck className="mr-1.5 h-4 w-4 text-primary" />Health Score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[50px] p-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground mt-1 text-xs">Calculating...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!user) {
      return (
        <Card className="shadow-sm">
            <CardHeader className="p-3">
                 <CardTitle className="flex items-center text-xs"><ShieldCheck className="mr-1.5 h-4 w-4 text-primary" />Health Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[50px] p-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground mb-1"/>
                <p className="text-muted-foreground text-xs text-center">Log in to view score.</p>
            </CardContent>
        </Card>
      );
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-3 pb-1"> 
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-sm font-medium"><ShieldCheck className="mr-1.5 h-4 w-4 text-primary"/>Health Score</CardTitle>
            <Badge 
                variant={
                    score >= 80 ? "default" : 
                    score >= 60 ? "secondary" :
                    score >= 40 ? "outline" : 
                    "destructive" 
                } 
                className={cn(
                    "text-xs px-1 py-0", 
                    score >= 80 ? "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    score >= 60 ? "bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    score >= 40 ? "bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
            >
                {assessment}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-2 px-3">
        <div 
          className={cn(
            "text-3xl font-bold tracking-tight", 
            assessmentColor
          )}
        >
          {score}
          <span className="text-base text-muted-foreground">/100</span>
        </div>
      </CardContent>
    </Card>
  );
}

