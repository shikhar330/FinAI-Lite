
'use client';

import * as React from 'react';
import type { FinancialGoal } from '@/types/finance';
import { GOAL_STATUSES } from '@/types/finance';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Eye, Target, CalendarDays, CircleDollarSign, TrendingUp, CheckCircle, AlertTriangle, PauseCircle, PlayCircle, Flame, Leaf, XCircle, Save } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInCalendarMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface GoalCardProps {
  goal: FinancialGoal;
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  onViewStrategies: (goal: FinancialGoal) => void;
  onStatusChange: (goalId: string, newStatus: typeof GOAL_STATUSES[number]) => void;
  onLogContribution: (goalId: string, amount: number) => Promise<void>;
  isLoading?: boolean;
}


export function GoalCard({ goal, onEdit, onDelete, onViewStrategies, onStatusChange, onLogContribution, isLoading }: GoalCardProps) {
  const [contributionAmount, setContributionAmount] = React.useState<string>('');
  const { toast } = useToast();
  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;

  const getPriorityInfo = () => {
    switch (goal.priority) {
      case 'high': return { icon: <Flame className="h-4 w-4 text-red-500" />, text: 'High', className: 'border-red-500/50 text-red-700 dark:text-red-400' };
      case 'medium': return { icon: <Target className="h-4 w-4 text-yellow-600" />, text: 'Medium', className: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-500' };
      case 'low': return { icon: <Leaf className="h-4 w-4 text-green-500" />, text: 'Low', className: 'border-green-500/50 text-green-700 dark:text-green-500' };
      default: return { icon: <Target className="h-4 w-4" />, text: goal.priority, className: '' };
    }
  };
  
  const getStatusInfo = () => {
    switch (goal.status) {
      case 'achieved': return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Achieved', textColor: 'text-green-600 dark:text-green-500', progressColor: 'bg-green-500' };
      case 'on-track': return { icon: <TrendingUp className="h-4 w-4 text-green-500" />, text: 'On Track', textColor: 'text-green-600 dark:text-green-500', progressColor: 'bg-green-500' };
      case 'at-risk': return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, text: 'Needs Attention', textColor: 'text-yellow-600 dark:text-yellow-500', progressColor: 'bg-yellow-500' };
      case 'off-track': return { icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Off Track', textColor: 'text-red-600 dark:text-red-500', progressColor: 'bg-red-500' };
      case 'on-hold': return { icon: <PauseCircle className="h-4 w-4 text-gray-500" />, text: 'On Hold', textColor: 'text-gray-500 dark:text-gray-400', progressColor: 'bg-gray-400' };
      case 'not-started': return { icon: <PlayCircle className="h-4 w-4 text-gray-500" />, text: 'Not Started', textColor: 'text-gray-500 dark:text-gray-400', progressColor: 'bg-gray-400'};
      default: return { icon: <Target className="h-4 w-4"/>, text: goal.status, textColor: 'text-foreground', progressColor: 'bg-primary'};
    }
  };

  const priorityInfo = getPriorityInfo();
  const statusInfo = getStatusInfo();

  let timeRemaining = '';
  if (goal.targetDate && goal.status !== 'achieved') {
    const target = parseISO(goal.targetDate);
    const now = new Date();
    const diffDays = differenceInDays(target, now);
    if (diffDays < 0) {
      timeRemaining = 'Overdue';
    } else if (diffDays < 30) {
      timeRemaining = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
    } else {
      const diffMonths = differenceInCalendarMonths(target, now);
      if (diffMonths < 12) {
        timeRemaining = `${diffMonths} month${diffMonths === 1 ? '' : 's'} left`;
      } else {
        const diffYears = Math.floor(diffMonths / 12);
        const remainingMonths = diffMonths % 12;
        timeRemaining = `${diffYears} year${diffYears === 1 ? '' : 's'}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}` : ''} left`;
      }
    }
  }

  const handleLocalStatusChange = (newStatus: string) => {
    if (isLoading) return;
    onStatusChange(goal.id, newStatus as typeof GOAL_STATUSES[number]);
  };

  const handleLogContributionOnCard = async () => {
    if (isLoading || goal.status === 'achieved') return;
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive number for your contribution.",
        variant: "destructive",
      });
      return;
    }
    await onLogContribution(goal.id, amount);
    setContributionAmount(''); // Clear input after logging
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl">{goal.name}</CardTitle>
          <Badge variant="outline" className={cn("capitalize flex items-center gap-1 text-xs py-1 px-2", priorityInfo.className)}>
            {priorityInfo.icon}
            {priorityInfo.text}
          </Badge>
        </div>
         <Badge variant="secondary" className="text-xs w-fit">{goal.goalType}</Badge>
        {goal.description && <CardDescription className="text-xs pt-2">{goal.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} aria-label={`${goal.name} progress ${Math.round(progress)}%`} className="h-3" indicatorClassName={statusInfo.progressColor} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-semibold">₹{goal.currentAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="font-semibold">₹{goal.targetAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        {goal.targetDate && (
          <div className="text-sm flex items-center">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
                <p className="text-xs text-muted-foreground">Target Date: {format(parseISO(goal.targetDate), 'dd MMM, yyyy')}</p>
                {timeRemaining && <p className={cn("font-semibold text-xs", timeRemaining === 'Overdue' ? 'text-red-500' : '')}>{timeRemaining}</p>}
            </div>
          </div>
        )}
         <div className="text-sm flex items-start"> 
            {React.cloneElement(statusInfo.icon, { className: cn(statusInfo.icon.props.className, "mr-2 mt-0.5 flex-shrink-0")})}
            <div className="flex-grow">
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <Select
                  value={goal.status}
                  onValueChange={handleLocalStatusChange}
                  disabled={isLoading}
                >
                  <SelectTrigger 
                    className={cn(
                        "h-8 text-xs p-1.5 w-full capitalize focus:ring-primary focus:border-primary", 
                        statusInfo.textColor,
                        statusInfo.textColor === "text-green-600 dark:text-green-500" ? "border-green-500/50 hover:border-green-500" :
                        statusInfo.textColor === "text-yellow-600 dark:text-yellow-500" ? "border-yellow-500/50 hover:border-yellow-500" :
                        statusInfo.textColor === "text-red-600 dark:text-red-500" ? "border-red-500/50 hover:border-red-500" :
                        "border-border"
                    )}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">
                        {s.replace(/-/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col gap-3">
        {goal.status !== 'achieved' && (
            <div className="w-full flex items-center gap-2">
            <Input
                type="number"
                placeholder="Log amount (₹)"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="h-9 text-sm flex-grow"
                disabled={isLoading || goal.status === 'achieved'}
                aria-label={`Contribution amount for ${goal.name}`}
            />
            <Button
                variant="outline"
                size="sm"
                onClick={handleLogContributionOnCard}
                disabled={isLoading || goal.status === 'achieved' || !contributionAmount || parseFloat(contributionAmount) <= 0}
                className="h-9"
            >
                <Save className="mr-1.5 h-4 w-4" /> Log
            </Button>
            </div>
        )}
        <div className="w-full flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => onViewStrategies(goal)} disabled={isLoading || goal.status === 'achieved'}>
            <Eye className="mr-1.5 h-4 w-4" /> Strategies
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)} disabled={isLoading} aria-label={`Edit goal ${goal.name}`}>
            <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)} disabled={isLoading} aria-label={`Delete goal ${goal.name}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
