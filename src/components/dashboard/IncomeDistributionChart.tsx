
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncomeItems } from '@/lib/finance-storage';
import type { IncomeItem } from '@/types/finance';
import { Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function IncomeDistributionChart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);

  const fetchIncomeData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await getIncomeItems(user.uid);
      setIncomeItems(items);
    } catch (error) {
      console.error("Error fetching income data for distribution chart:", error);
      toast({ title: "Chart Error", description: "Could not load income data for the chart.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData]);

  const chartData = useMemo(() => {
    if (incomeItems.length === 0) return [];
    // Aggregate income by source name, converting yearly/one-time to monthly equivalent for comparison
    const monthlyEquivalentIncome: { [key: string]: number } = {};
    incomeItems.forEach(item => {
        let monthlyAmount = item.amount;
        if (item.frequency === 'yearly') {
            monthlyAmount = item.amount / 12;
        } else if (item.frequency === 'one-time') {
            // Assuming one-time income is spread over a year for this chart's purpose
            // This might need adjustment based on how it should be visualized
            monthlyAmount = item.amount / 12; 
        }
        monthlyEquivalentIncome[item.name] = (monthlyEquivalentIncome[item.name] || 0) + monthlyAmount;
    });
    return Object.entries(monthlyEquivalentIncome)
                 .map(([name, value]) => ({ name, value: Math.max(0,value) })) // Ensure non-negative
                 .filter(d => d.value > 0); // Filter out zero/negative values for pie chart
  }, [incomeItems]);


  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Income Distribution</CardTitle>
          <CardDescription>Breakdown of your income sources (monthly equivalent).</CardDescription>
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
          <CardTitle>Income Distribution</CardTitle>
          <CardDescription>Breakdown of your income sources (monthly equivalent).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full flex flex-col items-center justify-center text-center">
          <Info className="h-10 w-10 text-muted-foreground mb-3"/>
          <p className="text-muted-foreground">
            {user ? "Add income data in 'Update Finances' to see this chart." : "Please log in to view this chart."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Income Distribution</CardTitle>
        <CardDescription>Breakdown of your income sources (monthly equivalent).</CardDescription>
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
