
'use client';

// Renamed from StrategyDisplay.tsx

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, AlertTriangle, XSquare } from 'lucide-react';
import { generateGoalPlan, type GenerateGoalPlanInput, type GenerateGoalPlanOutput } from '@/ai/flows/generate-goal-plan';
import type { FinancialGoal } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

interface GoalStrategySectionProps {
  goal: FinancialGoal;
  onClose: () => void;
}

export function GoalStrategySection({ goal, onClose }: GoalStrategySectionProps) {
  const [strategy, setStrategy] = useState<GenerateGoalPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStrategy = useCallback(async () => {
    if (!goal) return;
    setIsLoading(true);
    setError(null);
    setStrategy(null);

    try {
      const input: GenerateGoalPlanInput = {
        goalName: goal.name,
        goalType: goal.goalType,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        priority: goal.priority,
      };
      const result = await generateGoalPlan(input);
      setStrategy(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMsg);
      toast({ title: "Error Generating Strategy", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [goal, toast]);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  return (
    <Card className="mt-6 shadow-xl border-primary/50">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle className="flex items-center text-xl">
            <Lightbulb className="h-6 w-6 mr-2 text-primary" />
            AI-Powered Strategy for "{goal.name}"
            </CardTitle>
            <CardDescription>
            Personalized suggestions to help you reach your goal of ₹{goal.targetAmount.toLocaleString('en-IN')}.
            </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XSquare className="h-5 w-5" />
            <span className="sr-only">Close Strategy</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center min-h-[100px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Generating AI strategy...</p>
          </div>
        )}
        {error && (
          <div className="text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2"/> 
            <p>Error: {error}</p>
          </div>
        )}
        {strategy && !isLoading && (
          <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap p-4 bg-muted/30 rounded-md">
            <h4 className="font-semibold mb-2">AI Recommendation:</h4>
            {strategy.plan}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={fetchStrategy} disabled={isLoading} variant="outline">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regenerate Strategy
        </Button>
      </CardFooter>
    </Card>
  );
}
