
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Brain, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import { generateFinancialAnalysis, type GenerateFinancialAnalysisInput, type GenerateFinancialAnalysisOutput } from '@/ai/flows/generate-financial-analysis';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';

// Helper function to compute metrics
const computeFinancialMetrics = (
  incomeItems: IncomeItem[],
  expenseItems: ExpenseItem[],
  loanItems: LoanItem[]
) => {
  const monthlyIncome = incomeItems
    .filter(item => item.frequency === 'monthly')
    .reduce((sum, item) => sum + item.amount, 0)
    + (incomeItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
    + (incomeItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Spread one-time over a year

  const monthlyFixedExpenses = expenseItems
    .filter(item => item.type === 'fixed' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
    + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
    + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
    + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Spread one-time

  const monthlyVariableExpenses = expenseItems
    .filter(item => item.type === 'variable' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
    + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
    + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
    + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Spread one-time

  const monthlyLoanPayments = loanItems.reduce((sum, item) => sum + item.monthlyPayment, 0);
  const totalMonthlyExpenses = monthlyFixedExpenses + monthlyVariableExpenses + monthlyLoanPayments;
  const monthlySavings = monthlyIncome - totalMonthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyLoanPayments / monthlyIncome) * 100 : 0;

  const monthlyInvestments = expenseItems
    .filter(item => item.category === 'Savings/Investments' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
    + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
    + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
    + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Spread one-time

  const investmentRate = monthlyIncome > 0 ? (monthlyInvestments / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome: isNaN(monthlyIncome) ? 0 : monthlyIncome,
    totalMonthlyExpenses: isNaN(totalMonthlyExpenses) ? 0 : totalMonthlyExpenses,
    monthlySavings: isNaN(monthlySavings) ? 0 : monthlySavings,
    savingsRate: isNaN(savingsRate) ? 0 : savingsRate,
    debtToIncomeRatio: isNaN(debtToIncomeRatio) ? 0 : debtToIncomeRatio,
    investmentRate: isNaN(investmentRate) ? 0 : investmentRate,
  };
};


export function AiFinancialAdvisorDisplay() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [analysisResult, setAnalysisResult] = useState<GenerateFinancialAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States to hold fetched data, mainly for other potential uses or debugging
  const [, setIncomeItems] = useState<IncomeItem[]>([]);
  const [, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [, setLoanItems] = useState<LoanItem[]>([]);
  const [, setHasFetchedData] = useState(false);


  const fetchAndGenerateAnalysis = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setAnalysisResult(null);
      setError("Please log in to view AI financial analysis.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch data first
      const [fetchedIncomeData, fetchedExpenseData, fetchedInvestmentData, fetchedLoanData] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);
      // Update state if needed for other parts of app, but use fresh data for AI
      setIncomeItems(fetchedIncomeData);
      setExpenseItems(fetchedExpenseData);
      setInvestmentItems(fetchedInvestmentData);
      setLoanItems(fetchedLoanData);
      setHasFetchedData(true);

      // Compute metrics from the freshly fetched data
      const currentMetrics = computeFinancialMetrics(fetchedIncomeData, fetchedExpenseData, fetchedLoanData);

      const aiInput: GenerateFinancialAnalysisInput = {
        incomeSources: fetchedIncomeData,
        expenses: fetchedExpenseData,
        investments: fetchedInvestmentData,
        loans: fetchedLoanData,
        calculatedMetrics: {
          monthlyIncome: currentMetrics.monthlyIncome,
          totalMonthlyExpenses: currentMetrics.totalMonthlyExpenses,
          monthlySavings: currentMetrics.monthlySavings,
          savingsRate: currentMetrics.savingsRate,
          debtToIncomeRatio: currentMetrics.debtToIncomeRatio,
          investmentRate: currentMetrics.investmentRate,
        }
      };
      
      const hasAnyRawData = fetchedIncomeData.length > 0 || fetchedExpenseData.length > 0 || fetchedInvestmentData.length > 0 || fetchedLoanData.length > 0;
      // Check against the condition in the flow: input.calculatedMetrics.monthlyIncome > 0 or any raw data
      const canRunAnalysis = hasAnyRawData || currentMetrics.monthlyIncome > 0;

      if (!canRunAnalysis) {
         setAnalysisResult({ analysis: "Please add your financial information in 'Update Finances' to receive an AI analysis." });
         setIsLoading(false);
         return;
      }

      const result = await generateFinancialAnalysis(aiInput);
      setAnalysisResult(result);

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred while generating the analysis.';
      setError(errorMsg);
      toast({
        title: "Error Generating Analysis",
        description: "Could not generate your financial analysis.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]); 

  useEffect(() => {
    fetchAndGenerateAnalysis();
  }, [fetchAndGenerateAnalysis]);


  if (isLoading && !analysisResult) { 
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Brain className="h-6 w-6 mr-2 text-primary" /> AI Financial Advisor</CardTitle>
          <CardDescription>Our AI is analyzing your financial situation...</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error && !isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Brain className="h-6 w-6 mr-2 text-primary" /> AI Financial Advisor</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysisResult || !analysisResult.analysis) {
     return (
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="flex items-center"><Brain className="h-6 w-6 mr-2 text-primary" /> AI Financial Advisor</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
                <Info className="h-10 w-10 mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">AI financial analysis will appear here once your data is processed. Make sure to add your financial details.</p>
            </CardContent>
        </Card>
     )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            <Brain className="h-7 w-7 mr-3 text-primary" /> AI Financial Advisor
        </CardTitle>
        <CardDescription>Personalized insights and recommendations based on your financial data.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground mb-4 text-center">Updating analysis... <Loader2 className="inline h-4 w-4 animate-spin" /></div>}
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
          {analysisResult.analysis}
        </div>
      </CardContent>
    </Card>
  );
}

