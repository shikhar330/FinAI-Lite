
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFinancialGoals } from '@/lib/goal-storage';
import type { FinancialGoal } from '@/types/finance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Target, CheckCircle, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GoalSummaryMetrics {
  totalActiveGoals: number;
  totalTargetAmountActive: number;
  totalCurrentAmountActive: number;
  overallProgressPercentage: number;
  goalsOnTrack: number;
  goalsNeedsAttention: number;
  goalsAchieved: number;
  goalsNotStartedOrOnHold: number;
}

export function FinancialGoalsSummary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoalsData = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedGoals = await getFinancialGoals(user.uid);
      setGoals(fetchedGoals);
    } catch (error) {
      console.error("Failed to fetch financial goals for summary:", error);
      toast({ title: "Error", description: "Could not load financial goals for summary.", variant: "destructive" });
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchGoalsData();
  }, [fetchGoalsData]);

  const summaryMetrics: GoalSummaryMetrics | null = useMemo(() => {
    if (goals.length === 0) return null;

    const activeGoals = goals.filter(g => g.status !== 'achieved');
    const totalActiveGoals = activeGoals.length;
    const totalTargetAmountActive = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmountActive = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgressPercentage = totalTargetAmountActive > 0 ? (totalCurrentAmountActive / totalTargetAmountActive) * 100 : 0;

    const goalsOnTrack = goals.filter(g => g.status === 'on-track').length;
    const goalsNeedsAttention = goals.filter(g => g.status === 'at-risk' || g.status === 'off-track').length;
    const goalsAchieved = goals.filter(g => g.status === 'achieved').length;
    const goalsNotStartedOrOnHold = goals.filter(g => g.status === 'not-started' || g.status === 'on-hold').length;

    return {
      totalActiveGoals,
      totalTargetAmountActive,
      totalCurrentAmountActive,
      overallProgressPercentage: Math.min(100, Math.max(0, overallProgressPercentage)), // Cap at 0-100
      goalsOnTrack,
      goalsNeedsAttention,
      goalsAchieved,
      goalsNotStartedOrOnHold,
    };
  }, [goals]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary" /> Financial Goals Overview</CardTitle>
          <CardDescription>Loading your goals summary...</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!summaryMetrics || goals.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary" /> Financial Goals Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No financial goals set yet.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/goal-setting">Set Your First Goal</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="flex items-center text-xl">
                <Target className="mr-2 h-6 w-6 text-primary" />
                Financial Goals Overview
                </CardTitle>
                <CardDescription>
                A quick look at your progress towards your financial objectives.
                </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2 sm:mt-0 w-full sm:w-auto">
                <Link href="/goal-setting">Manage Goals</Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Overall Progress (Active Goals)</span>
            <span className={cn(
                "font-semibold",
                summaryMetrics.overallProgressPercentage >= 80 ? "text-green-600 dark:text-green-500" :
                summaryMetrics.overallProgressPercentage >= 50 ? "text-yellow-600 dark:text-yellow-500" :
                summaryMetrics.overallProgressPercentage > 0 ? "text-orange-500" : "text-red-600 dark:text-red-500"
            )}>
                {summaryMetrics.overallProgressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={summaryMetrics.overallProgressPercentage} 
            aria-label="Overall financial goals progress" 
            className="h-3" 
            indicatorClassName={cn(
                summaryMetrics.overallProgressPercentage >= 80 ? "bg-green-500" :
                summaryMetrics.overallProgressPercentage >= 50 ? "bg-yellow-500" :
                summaryMetrics.overallProgressPercentage > 0 ? "bg-orange-500" : "bg-red-500"
            )}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            ₹{summaryMetrics.totalCurrentAmountActive.toLocaleString('en-IN')} / ₹{summaryMetrics.totalTargetAmountActive.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Active Goals</p>
            <p className="text-lg font-bold">{summaryMetrics.totalActiveGoals}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground flex items-center"><TrendingUp className="h-3 w-3 mr-1 text-green-500"/>On Track</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-500">{summaryMetrics.goalsOnTrack}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground flex items-center"><AlertTriangle className="h-3 w-3 mr-1 text-orange-500"/>Needs Attention</p>
            <p className="text-lg font-bold text-orange-500">{summaryMetrics.goalsNeedsAttention}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground flex items-center"><CheckCircle className="h-3 w-3 mr-1 text-blue-500"/>Achieved</p>
            <p className="text-lg font-bold text-blue-500">{summaryMetrics.goalsAchieved}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
