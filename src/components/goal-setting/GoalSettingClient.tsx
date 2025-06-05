
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { z } from 'zod';
import type { FinancialGoal, IncomeItem, ExpenseItem, InvestmentItem, LoanItem, GoalStatus } from '@/types/finance';
import { FinancialGoalSchema } from '@/types/finance';
import { getFinancialGoals, addFinancialGoal, updateFinancialGoal, deleteFinancialGoal } from '@/lib/goal-storage';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage'; 

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Loader2, Info, CheckCircle } from 'lucide-react'; 
import { GoalForm } from './GoalForm';
import { GoalCard } from './GoalCard';
import { GoalStrategySection } from './GoalStrategySection'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


export function GoalSettingClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [isMutating, setIsMutating] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  
  const [selectedGoalForStrategy, setSelectedGoalForStrategy] = useState<FinancialGoal | null>(null);
  const [showStrategySection, setShowStrategySection] = useState(false);
  
  // State for user's broader financial data (optional for some flows, essential for others)
  const [, setUserIncome] = useState<IncomeItem[]>([]);
  const [, setUserExpenses] = useState<ExpenseItem[]>([]);
  const [, setUserInvestments] = useState<InvestmentItem[]>([]);
  const [, setUserLoans] = useState<LoanItem[]>([]);
  const [isLoadingFinancialData, setIsLoadingFinancialData] = useState(false);


  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const fetchedGoals = await getFinancialGoals(user.uid);
      setGoals(fetchedGoals.sort((a,b) => new Date(a.targetDate || 0).getTime() - new Date(b.targetDate || 0).getTime() ));
    } catch (error) {
      console.error("Failed to fetch financial goals:", error);
      toast({ title: "Error", description: "Could not load your financial goals.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  const fetchUserFinancialData = useCallback(async () => {
    if (!user) return;
    setIsLoadingFinancialData(true);
    try {
      const [income, expenses, investments, loans] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);
      setUserIncome(income);
      setUserExpenses(expenses);
      setUserInvestments(investments);
      setUserLoans(loans);
    } catch (error) {
      console.error("Failed to fetch user financial data:", error);
      // Not toasting here as this is a background fetch for potential AI context
    } finally {
      setIsLoadingFinancialData(false);
    }
  }, [user]);


  useEffect(() => {
    fetchGoals();
    fetchUserFinancialData(); 
  }, [fetchGoals, fetchUserFinancialData]);
  

  const handleFormSubmit = async (values: z.infer<typeof FinancialGoalSchema>) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsMutating(true);
    const goalData = {
      ...values,
      goalType: values.goalType, 
      targetAmount: parseFloat(values.targetAmount),
      currentAmount: parseFloat(values.currentAmount),
      targetDate: values.targetDate ? values.targetDate.toISOString() : undefined,
    };

    try {
      if (editingGoal) {
        await updateFinancialGoal(user.uid, editingGoal.id, goalData);
        toast({ title: "Success", description: "Financial goal updated.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
      } else {
        await addFinancialGoal(user.uid, goalData as Omit<FinancialGoal, 'id'>); 
        toast({ title: "Success", description: "New financial goal added.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
      }
      setIsFormOpen(false);
      setEditingGoal(null);
      await fetchGoals(); 
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast({ title: "Error", description: "Could not save the financial goal.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    setIsMutating(true);
    try {
      await deleteFinancialGoal(user.uid, goalId);
      toast({ title: "Goal Deleted", description: "The financial goal has been removed." });
      await fetchGoals(); 
      if(selectedGoalForStrategy?.id === goalId){
        setSelectedGoalForStrategy(null);
        setShowStrategySection(false);
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
      toast({ title: "Error", description: "Could not delete the financial goal.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };
  
  const handleViewStrategies = (goal: FinancialGoal) => {
    setSelectedGoalForStrategy(goal);
    setShowStrategySection(true);
  };
  
  const openNewGoalForm = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (goalId: string, newStatus: GoalStatus) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const goalToUpdate = goals.find(g => g.id === goalId);
    if (!goalToUpdate) {
      toast({ title: "Error", description: "Goal not found.", variant: "destructive" });
      return;
    }

    setIsMutating(true);
    try {
      await updateFinancialGoal(user.uid, goalId, { status: newStatus });
      toast({ title: "Status Updated", description: `Goal "${goalToUpdate.name}" status changed to ${newStatus.replace(/-/g, ' ')}.`, icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
      await fetchGoals(); 
    } catch (error) {
      console.error("Failed to update goal status:", error);
      toast({ title: "Error", description: "Could not update goal status.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleLogContribution = async (goalId: string, amount: number) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    
    const goalToUpdate = goals.find(g => g.id === goalId);
    if (!goalToUpdate) {
      toast({ title: "Error", description: "Selected goal not found for contribution.", variant: "destructive" });
      return;
    }

    setIsMutating(true);
    const newCurrentAmount = goalToUpdate.currentAmount + amount;
    const updates: Partial<FinancialGoal> = { currentAmount: newCurrentAmount };

    if (newCurrentAmount >= goalToUpdate.targetAmount && goalToUpdate.status !== 'achieved') {
      updates.status = 'achieved';
    }

    try {
      await updateFinancialGoal(user.uid, goalId, updates);
      toast({ 
        title: "Contribution Logged!", 
        description: `₹${amount.toLocaleString()} added to "${goalToUpdate.name}". ${updates.status === 'achieved' ? 'Goal achieved!' : ''}`,
        icon: <CheckCircle className="h-5 w-5 text-green-500"/>
      });
      await fetchGoals(); 
    } catch (error) {
      console.error("Failed to log contribution:", error);
      toast({ title: "Error", description: "Could not log your contribution.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  if (isLoadingData || (isLoadingFinancialData && goals.length === 0)) { 
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold">Your Financial Goals</h2>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingGoal(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNewGoalForm} disabled={isMutating} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Financial Goal' : 'Add New Financial Goal'}</DialogTitle>
            </DialogHeader>
            <GoalForm onSubmit={handleFormSubmit} defaultValues={editingGoal || undefined} isLoading={isMutating} />
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 && !isLoadingData && (
        <div className="text-center py-10 bg-muted/30 rounded-lg mt-6">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You haven't set any financial goals yet.</p>
          <p className="text-sm text-muted-foreground">Click "Add New Goal" to get started!</p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal} 
              onViewStrategies={handleViewStrategies}
              onStatusChange={handleStatusChange}
              onLogContribution={handleLogContribution} // Pass the new handler
              isLoading={isMutating}
            />
          ))}
        </div>
      )}

      {showStrategySection && selectedGoalForStrategy && (
        <GoalStrategySection 
            goal={selectedGoalForStrategy} 
            onClose={() => {
                setSelectedGoalForStrategy(null);
                setShowStrategySection(false);
            }}
        />
      )}
    </div>
  );
}
