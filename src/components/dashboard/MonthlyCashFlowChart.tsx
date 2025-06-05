
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, XAxis, YAxis, Bar, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'; // Added Cell
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncomeItems, getExpenseItems } from '@/lib/finance-storage';
import { Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function MonthlyCashFlowChart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const [incomeItems, setIncomeItems] = useState<Awaited<ReturnType<typeof getIncomeItems>>>([]);
  const [expenseItems, setExpenseItems] = useState<Awaited<ReturnType<typeof getExpenseItems>>>([]);

  const fetchDataForChart = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [income, expenses] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid)
      ]);
      setIncomeItems(income);
      setExpenseItems(expenses);
    } catch (error) {
      console.error("Error fetching income/expense data for cash flow chart:", error);
      toast({ title: "Chart Error", description: "Could not load data for the Monthly Cash Flow chart.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDataForChart();
  }, [fetchDataForChart]);
  
  const chartData = useMemo(() => {
    const effectiveMonthlyIncome = 
      incomeItems.filter(item => item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0) +
      (incomeItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12) +
      (incomeItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);

    const effectiveMonthlyExpenses = 
      expenseItems.filter(item => item.frequency === 'monthly').reduce((sum, item) => sum + item.amount, 0) +
      (expenseItems.filter(item => item.frequency === 'yearly').reduce((sum, item) => sum + item.amount, 0) / 12) +
      (expenseItems.filter(item => item.frequency === 'weekly').reduce((sum, item) => sum + item.amount, 0) * 4.33) +
      (expenseItems.filter(item => item.frequency === 'one-time').reduce((sum, item) => sum + item.amount, 0) / 12);
    
    const monthlySavings = effectiveMonthlyIncome - effectiveMonthlyExpenses;

    if (effectiveMonthlyIncome > 0 || effectiveMonthlyExpenses > 0 || monthlySavings !== 0) {
      return [
        { name: 'Income', value: Math.max(0, effectiveMonthlyIncome) }, // Ensure non-negative for chart
        { name: 'Expenses', value: Math.max(0, effectiveMonthlyExpenses) },
        { name: 'Savings', value: monthlySavings }, // Savings can be negative
      ];
    }
    return [];
  }, [incomeItems, expenseItems]);


  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>Income, Expenses, and Savings.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (!user || chartData.length === 0) {
     return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>Income, Expenses, and Savings.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full flex flex-col items-center justify-center text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-3"/>
            <p className="text-muted-foreground">
                {user ? "Add income and expense data in 'Update Finances' to see this chart." : "Please log in to view this chart."}
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Monthly Cash Flow</CardTitle>
        <CardDescription>Estimated current monthly Income, Expenses, and Savings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  let color = 'hsl(var(--muted))';
                  if (entry.name === 'Income') color = 'hsl(var(--chart-1))'; // Blueish
                  else if (entry.name === 'Expenses') color = 'hsl(var(--chart-3))'; // Pinkish/Reddish
                  else if (entry.name === 'Savings') color = entry.value >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'; // Tealish/Greenish for positive, Red for negative
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Remove the old IncomeExpenseChartSection.tsx as it's replaced by MonthlyCashFlowChart.tsx
// This would typically be a delete operation if the system supported it.
// For now, just ensure it's not used and MonthlyCashFlowChart is used instead in app/page.tsx.
