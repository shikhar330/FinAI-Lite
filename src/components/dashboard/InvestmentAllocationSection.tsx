
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useCallback } from 'react';
import { getInvestmentItems } from '@/lib/finance-storage';
import type { InvestmentItem } from '@/types/finance';
import { Activity, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
];

interface ChartDataPoint {
  name: string;
  value: number;
}

export function InvestmentAllocationSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvestmentData = useCallback(async () => {
    if (!user) {
        setChartData([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const investmentItems = await getInvestmentItems(user.uid);
        if (investmentItems.length > 0) {
            const allocation: { [key: string]: number } = {};
            investmentItems.forEach(item => {
                allocation[item.type] = (allocation[item.type] || 0) + item.currentValue;
            });
            
            const formattedData = Object.entries(allocation).map(([name, value]) => ({ name, value }));
            setChartData(formattedData);
        } else {
            setChartData([]);
        }
    } catch (error) {
        console.error("Error fetching investment data for chart:", error);
        toast({ title: "Chart Error", description: "Could not load investment data for the chart.", variant: "destructive" });
        setChartData([]);
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInvestmentData();
  }, [fetchInvestmentData]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Investment Allocation</CardTitle>
          <CardDescription>Distribution of your investment portfolio.</CardDescription>
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
          <CardTitle>Investment Allocation</CardTitle>
          <CardDescription>Distribution of your investment portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">
                {user ? "Add investment data in 'Finances' to see this chart." : "Please log in to view this chart."}
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Investment Allocation</CardTitle>
        <CardDescription>Distribution of your investment portfolio.</CardDescription>
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
                outerRadius={100}
                innerRadius={60} 
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent, value }) => `${name} ${(percent * 100).toFixed(0)}% (₹${value.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})})`}
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
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={(value: number, name: string, props) => [`₹${value.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
