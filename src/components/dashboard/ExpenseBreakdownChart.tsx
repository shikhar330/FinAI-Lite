
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getExpenseItems } from '@/lib/finance-storage';
import type { ExpenseItem } from '@/types/finance';
import { Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['hsl(var(--chart-3))', 'hsl(var(--chart-4))']; // Pinkish, Orangeish from image

export function ExpenseBreakdownChart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);

  const fetchExpenseData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await getExpenseItems(user.uid);
      setExpenseItems(items);
    } catch (error) {
      console.error("Error fetching expense data for breakdown chart:", error);
      toast({ title: "Chart Error", description: "Could not load expense data for the chart.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  const chartData = useMemo(() => {
    if (expenseItems.length === 0) return [];

    let totalMonthlyFixedExpenses = 0;
    let totalMonthlyVariableExpenses = 0;

    expenseItems.forEach(item => {
      let monthlyAmount = item.amount;
      if (item.frequency === 'yearly') {
        monthlyAmount = item.amount / 12;
      } else if (item.frequency === 'weekly') {
        monthlyAmount = item.amount * 4.33;
      } else if (item.frequency === 'one-time') {
        // Assuming one-time expenses are spread over a year for this chart's purpose
        monthlyAmount = item.amount / 12;
      }

      if (item.type === 'fixed') {
        totalMonthlyFixedExpenses += monthlyAmount;
      } else if (item.type === 'variable') {
        totalMonthlyVariableExpenses += monthlyAmount;
      }
    });
    
    const data = [];
    if (totalMonthlyFixedExpenses > 0) data.push({ name: 'Fixed Expenses', value: totalMonthlyFixedExpenses });
    if (totalMonthlyVariableExpenses > 0) data.push({ name: 'Variable Expenses', value: totalMonthlyVariableExpenses });
    
    return data;
  }, [expenseItems]);


  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Fixed vs. Variable (monthly equivalent).</CardDescription>
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
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Fixed vs. Variable (monthly equivalent).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full flex flex-col items-center justify-center text-center">
          <Info className="h-10 w-10 text-muted-foreground mb-3"/>
          <p className="text-muted-foreground">
            {user ? "Add expense data in 'Update Finances' to see this chart." : "Please log in to view this chart."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>Fixed vs. Variable (monthly equivalent).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => [`₹${value.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

