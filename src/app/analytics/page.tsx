
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import withAuth from '@/components/auth/withAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { BarChart3, CheckCircle, TrendingDown, TrendingUp, AlertCircle, PieChart, Info, Scale, Briefcase, Target } from 'lucide-react'; // Added Target
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import { generateFinancialAnalysis, type GenerateFinancialAnalysisInput, type GenerateFinancialAnalysisOutput } from '@/ai/flows/generate-financial-analysis';
import { FinancialGoalsSummary } from '@/components/dashboard/FinancialGoalsSummary'; // Added import
import { cn } from '@/lib/utils'; 

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const COLORS_DEFAULT = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const COLORS_EXPENSE_DIST = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];


interface AnalyticsMetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  className?: string;
}

function AnalyticsMetricCard({ title, value, icon: Icon, description, className }: AnalyticsMetricCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

interface FinancialHealthIndicatorCardProps {
  title: string;
  value: string;
  assessment: string;
  icon: React.ElementType;
  assessmentColor?: string;
}

function FinancialHealthIndicatorCard({ title, value, assessment, icon: Icon, assessmentColor = 'text-green-600 dark:text-green-500' }: FinancialHealthIndicatorCardProps) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="text-md font-medium text-muted-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className={cn("text-sm font-semibold", assessmentColor)}>{assessment}</p>
      </CardContent>
    </Card>
  );
}


interface ChartCardProps {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
  isLoading?: boolean;
  noDataMessage?: string;
}

function ChartCard({ title, data, colors = COLORS_DEFAULT, isLoading, noDataMessage = "No data available for this chart." }: ChartCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <p className="text-muted-foreground">{noDataMessage}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)'}} 
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
            />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  const [financialAnalysis, setFinancialAnalysis] = useState<GenerateFinancialAnalysisOutput | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
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
      console.error("Failed to fetch financial data:", error);
      toast({ title: 'Error Fetching Data', description: 'Could not load financial details for analytics.', variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculations = useMemo(() => {
    const monthlyIncome = incomeItems
      .filter(item => item.frequency === 'monthly')
      .reduce((sum, item) => sum + item.amount, 0)
      + (incomeItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12);

    const monthlyFixedExpenses = expenseItems
      .filter(item => item.type === 'fixed' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.type === 'fixed' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33);
      
    const monthlyVariableExpenses = expenseItems
      .filter(item => item.type === 'variable' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.type === 'variable' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33);
    
    const monthlyLoanPayments = loanItems.reduce((sum, item) => sum + item.monthlyPayment, 0);
    const totalMonthlyExpenses = monthlyFixedExpenses + monthlyVariableExpenses + monthlyLoanPayments;
    const monthlySavings = monthlyIncome - totalMonthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyLoanPayments / monthlyIncome) * 100 : 0;
    
    const monthlyInvestments = expenseItems
      .filter(item => item.category === 'Savings/Investments' && item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33)
      + (expenseItems.filter(item => item.category === 'Savings/Investments' && item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12); // Added one-time

    const investmentRate = monthlyIncome > 0 ? (monthlyInvestments / monthlyIncome) * 100 : 0;
    
    return {
      monthlyIncome,
      totalMonthlyExpenses,
      monthlySavings,
      savingsRate,
      debtToIncomeRatio,
      investmentRate,
      monthlyFixedExpenses,
      monthlyVariableExpenses,
      monthlyLoanPayments,
      monthlyInvestments,
    };
  }, [incomeItems, expenseItems, loanItems]);

  const getSavingsRateAssessment = (rate: number) => {
    if (rate >= 20) return { text: "Excellent", color: "text-green-600 dark:text-green-500" };
    if (rate >= 10) return { text: "Good", color: "text-yellow-600 dark:text-yellow-500" };
    return { text: "Needs Improvement", color: "text-red-600 dark:text-red-500" };
  };

  const getDtiAssessment = (ratio: number) => {
    if (ratio === 0) return { text: "No Debt", color: "text-green-600 dark:text-green-500" };
    if (ratio <= 20) return { text: "Excellent", color: "text-green-600 dark:text-green-500" };
    if (ratio <= 36) return { text: "Good", color: "text-yellow-600 dark:text-yellow-500" };
    if (ratio <= 43) return { text: "Fair", color: "text-orange-500" };
    return { text: "High", color: "text-red-600 dark:text-red-500" };
  };
  
  const getInvestmentRateAssessment = (rate: number) => {
    if (rate >= 15) return { text: "Excellent", color: "text-green-600 dark:text-green-500" };
    if (rate >= 10) return { text: "Good", color: "text-yellow-600 dark:text-yellow-500" };
    if (rate > 0) return { text: "Fair", color: "text-orange-500" };
    return { text: "Low/None", color: "text-red-600 dark:text-red-500" };
  };

  const incomeSourcesChartData = useMemo(() => {
    return incomeItems.map(item => ({ name: item.name, value: item.amount }));
  }, [incomeItems]);
  
  const expenseDistributionChartData = useMemo(() => [
    { name: 'Fixed Expenses', value: calculations.monthlyFixedExpenses },
    { name: 'Variable Expenses', value: calculations.monthlyVariableExpenses },
    { name: 'Loan Payments', value: calculations.monthlyLoanPayments },
  ].filter(item => item.value > 0), [calculations]);

  const expenseCategoriesChartData = useMemo(() => {
    const categories: { [key: string]: number } = {};
    expenseItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + item.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenseItems]);

  const investmentAllocationChartData = useMemo(() => {
    const allocation: { [key: string]: number } = {};
    investmentItems.forEach(item => {
      allocation[item.type] = (allocation[item.type] || 0) + item.currentValue;
    });
    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
  }, [investmentItems]);
  
  const fetchFinancialAnalysis = useCallback(async () => {
    if (!user || isLoadingData || (!incomeItems.length && !expenseItems.length && !investmentItems.length && !loanItems.length)) {
      setFinancialAnalysis(null); // Don't run if no data
      return;
    }
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const input: GenerateFinancialAnalysisInput = {
        incomeSources: incomeItems,
        expenses: expenseItems,
        investments: investmentItems,
        loans: loanItems,
        calculatedMetrics: { // Pass pre-calculated metrics
          monthlyIncome: calculations.monthlyIncome,
          totalMonthlyExpenses: calculations.totalMonthlyExpenses,
          monthlySavings: calculations.monthlySavings,
          savingsRate: calculations.savingsRate,
          debtToIncomeRatio: calculations.debtToIncomeRatio,
          investmentRate: calculations.investmentRate,
        }
      };
      const result = await generateFinancialAnalysis(input);
      setFinancialAnalysis(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "An unknown error occurred generating analysis.";
      setAnalysisError(msg);
      toast({ title: 'AI Analysis Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [user, incomeItems, expenseItems, investmentItems, loanItems, calculations, toast, isLoadingData]);

  useEffect(() => {
    if (!isLoadingData) { // Only fetch analysis after initial data load
      fetchFinancialAnalysis();
    }
  }, [fetchFinancialAnalysis, isLoadingData]);


  const hasAnyData = incomeItems.length > 0 || expenseItems.length > 0 || investmentItems.length > 0 || loanItems.length > 0;

  if (isLoadingData && !user) { // Still checking if user exists before rendering anything
     return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (isLoadingData && user) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Analytics"
        description="Analyze your financial profile and find ways to improve."
        icon={BarChart3}
      />

      {!hasAnyData && !isLoadingData ? (
        <Card className="shadow-lg text-center py-12">
          <CardHeader>
            <Info className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>No Financial Data Found</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6">
              Please add your income, expenses, investments, or loans in the 'Finances' section to view your analytics.
            </CardDescription>
            <Button asChild>
              <Link href="/finances">Go to Finances</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Metrics */}
          <section>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsMetricCard title="Monthly Income" value={`₹${calculations.monthlyIncome.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={TrendingUp} />
              <AnalyticsMetricCard title="Monthly Expenses" value={`₹${calculations.totalMonthlyExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={TrendingDown} />
              <AnalyticsMetricCard title="Monthly Savings" value={`₹${calculations.monthlySavings.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={CheckCircle} />
              <AnalyticsMetricCard title="Savings Rate" value={`${calculations.savingsRate.toFixed(1)}%`} icon={PieChart} />
            </div>
          </section>

          {/* Financial Health Indicators */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Financial Health Indicators</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FinancialHealthIndicatorCard title="Savings Rate" value={`${calculations.savingsRate.toFixed(1)}%`} assessment={getSavingsRateAssessment(calculations.savingsRate).text} icon={PieChart} assessmentColor={getSavingsRateAssessment(calculations.savingsRate).color} />
              <FinancialHealthIndicatorCard title="Debt-to-Income Ratio" value={`${calculations.debtToIncomeRatio.toFixed(1)}%`} assessment={getDtiAssessment(calculations.debtToIncomeRatio).text} icon={Scale} assessmentColor={getDtiAssessment(calculations.debtToIncomeRatio).color} />
              <FinancialHealthIndicatorCard title="Investment Rate" value={`${calculations.investmentRate.toFixed(1)}%`} assessment={getInvestmentRateAssessment(calculations.investmentRate).text} icon={Briefcase} assessmentColor={getInvestmentRateAssessment(calculations.investmentRate).color} />
            </div>
          </section>

          {/* Financial Goals Summary */}
          <section>
             <FinancialGoalsSummary />
          </section>

          {/* Charts Section */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Income Sources" data={incomeSourcesChartData} isLoading={isLoadingData} noDataMessage="No income data yet." />
            <ChartCard title="Expense Distribution" data={expenseDistributionChartData} colors={COLORS_EXPENSE_DIST} isLoading={isLoadingData} noDataMessage="No expense or loan data yet." />
            <ChartCard title="Expense Categories" data={expenseCategoriesChartData} isLoading={isLoadingData} noDataMessage="No expense data yet." />
            <ChartCard title="Investment Allocation" data={investmentAllocationChartData} isLoading={isLoadingData} noDataMessage="No investment data yet."/>
          </section>

          {/* Financial Details Table */}
          <section>
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">Financial Details</CardTitle><CardDescription>Summary of your financial information.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Monthly Income</TableCell><TableCell className="text-right">₹{calculations.monthlyIncome.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Fixed Expenses</TableCell><TableCell className="text-right">₹{calculations.monthlyFixedExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Variable Expenses</TableCell><TableCell className="text-right">₹{calculations.monthlyVariableExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Loan Payments</TableCell><TableCell className="text-right">₹{calculations.monthlyLoanPayments.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Monthly Investments/Savings</TableCell><TableCell className="text-right">₹{calculations.monthlyInvestments.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Net Monthly Savings</TableCell><TableCell className="text-right">₹{calculations.monthlySavings.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Savings Rate</TableCell><TableCell className="text-right">{calculations.savingsRate.toFixed(1)}%</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Last Updated</TableCell><TableCell className="text-right">{new Date().toLocaleDateString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* AI Financial Analysis */}
          <section>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Financial Analysis</CardTitle>
                <CardDescription>Personalized insights about your financial profile from our AI.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalysis ? (
                  <div className="flex items-center justify-center min-h-[150px]">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : analysisError ? (
                  <p className="text-destructive">Error generating analysis: {analysisError}</p>
                ) : financialAnalysis?.analysis ? (
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                    {financialAnalysis.analysis}
                  </div>
                ) : (
                  <p className="text-muted-foreground">AI analysis will appear here once your data is processed.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

export default withAuth(AnalyticsPage);
