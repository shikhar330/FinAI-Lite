
'use client';

// This file is no longer used directly by the main dashboard (src/app/page.tsx)
// as it has been replaced by FinancialSummarySection.tsx.
// It's kept here for reference or if parts of its logic are needed elsewhere,
// but it can be considered for deletion if truly unused.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Briefcase, ShieldCheck, Landmark, HandCoins, CreditCard, Activity, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Metric {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
}

function KeyMetricCard({ metric }: { metric: Metric }) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
        <metric.icon className={`h-5 w-5 ${metric.iconColor || 'text-primary'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        {metric.description && (
           <p className="text-xs text-muted-foreground">{metric.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function KeyMetricsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const calculateMetrics = useCallback(async () => {
    if (!user) {
      setMetrics([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [incomeItems, expenseItems, investmentItems, loanItems] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);

      const totalMonthlyIncome = incomeItems
        .filter(item => item.frequency === 'monthly')
        .reduce((sum, item) => sum + item.amount, 0);
      const totalYearlyIncome = incomeItems
        .filter(item => item.frequency === 'yearly')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const effectiveMonthlyIncome = totalMonthlyIncome + (totalYearlyIncome / 12);

      const totalMonthlyExpenses = expenseItems
        .filter(item => item.frequency === 'monthly')
        .reduce((sum, item) => sum + item.amount, 0);
      const totalWeeklyExpenses = expenseItems
          .filter(item => item.frequency === 'weekly')
          .reduce((sum,item) => sum + item.amount * 4.33, 0); 
      const totalYearlyExpenses = expenseItems
          .filter(item => item.frequency === 'yearly')
          .reduce((sum,item) => sum + item.amount / 12, 0);
          
      const effectiveMonthlyExpenses = totalMonthlyExpenses + totalWeeklyExpenses + totalYearlyExpenses;

      const totalInvestmentValue = investmentItems.reduce((sum, item) => sum + item.currentValue, 0);
      const totalLoanBalance = loanItems.reduce((sum, item) => sum + item.outstandingBalance, 0);
      
      const netWorth = totalInvestmentValue - totalLoanBalance;

      const savingsRate = effectiveMonthlyIncome > 0 
        ? ((effectiveMonthlyIncome - effectiveMonthlyExpenses) / effectiveMonthlyIncome) * 100 
        : 0;

      const loadedMetrics: Metric[] = [
        { title: 'Net Worth (Est.)', value: `$${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Landmark, iconColor: 'text-green-500', description: 'Investments - Loans' },
        { title: 'Monthly Income', value: `$${effectiveMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, iconColor: 'text-blue-500', description: 'Avg. across all sources' },
        { title: 'Monthly Expenses', value: `$${effectiveMonthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingDown, iconColor: 'text-red-500', description: 'Avg. across all types' },
        { title: 'Investment Value', value: `$${totalInvestmentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Briefcase, iconColor: 'text-purple-500' },
        { title: 'Total Debt', value: `$${totalLoanBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CreditCard, iconColor: 'text-orange-500' },
        { title: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, icon: ShieldCheck, iconColor: 'text-yellow-500', description: 'Based on monthly figures' },
      ];
      setMetrics(loadedMetrics);
    } catch (error) {
      console.error("Failed to calculate metrics:", error);
      toast({ title: "Error Loading Metrics", description: "Could not load key financial metrics.", variant: "destructive"});
      setMetrics([]); // Clear metrics on error
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]); 

  if (isLoading) {
    return (
      <section aria-labelledby="key-metrics-title">
        <h2 id="key-metrics-title" className="sr-only">Key Financial Metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array(6).fill(0).map((_, index) => (
             <Card key={index} className="shadow-md">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                  <Activity className={`h-5 w-5 text-muted`} />
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
  
  if (!user || (metrics.length === 0 && !isLoading)) {
    return (
       <section aria-labelledby="key-metrics-title">
        <h2 id="key-metrics-title" className="sr-only">Key Financial Metrics</h2>
        <p className="text-center text-muted-foreground py-4">
          {user ? "Add data in the 'Finances' section to see your key metrics." : "Please log in to view key metrics."}
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="key-metrics-title">
      <h2 id="key-metrics-title" className="sr-only">Key Financial Metrics</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <KeyMetricCard key={metric.title} metric={metric} />
        ))}
      </div>
    </section>
  );
}
