
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { z } from 'zod';
import type { BillItem } from '@/types/finance';
import { BillFormSchema, BILL_STATUSES, BILL_CATEGORIES } from '@/types/finance';
import { getBillItems, updateBillItem, deleteBillItem, addBillItem as addBillItemStorage } from '@/lib/bill-storage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Loader2, Info, CheckCircle, CalendarClock, AlertTriangle, BellRing, PieChart as PieChartIcon, DollarSign, TrendingUp, ListChecks, ChevronLeft, ChevronRight, RotateCcw, TrendingDown, CalendarSearch, Lightbulb, FileText } from 'lucide-react';
import { BillForm } from './BillForm';
import { BillCard } from './BillCard';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle as UICardTitle, CardDescription as UICardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isPast, isToday, differenceInDays, startOfDay, endOfDay, addMonths, subMonths, isWithinInterval, getDate, getDay, getMonth, setDate, startOfMonth, endOfMonth, addDays, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const INSIGHT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
];

interface RecurringSuggestion {
  name: string;
  dayOfMonth: number;
  averageAmount: number;
  count: number;
  category?: typeof BILL_CATEGORIES[number];
}


export function getBillStatusInfo(bill: BillItem): { text: string; color: string; icon: React.ElementType; textColorClass: string; borderColorClass: string, isOverdue: boolean } {
  const dueDate = parseISO(bill.dueDate);
  const now = new Date();
  const isBillOverdueStatus = isPast(dueDate) && bill.status !== 'paid' && bill.status !== 'cancelled' && !isToday(dueDate);

  if (bill.status === 'paid') return { text: 'Paid', color: 'bg-green-500 hover:bg-green-600', icon: CheckCircle, textColorClass: 'text-green-600 dark:text-green-500', borderColorClass: 'border-green-500/50 dark:border-green-400/40', isOverdue: false };
  if (bill.status === 'cancelled') return { text: 'Cancelled', color: 'bg-gray-400 hover:bg-gray-500', icon: Info, textColorClass: 'text-gray-500 dark:text-gray-400', borderColorClass: 'border-gray-500/50 dark:border-gray-400/40', isOverdue: false };
  if (isBillOverdueStatus || bill.status === 'overdue') return { text: 'Overdue', color: 'bg-red-500 hover:bg-red-600', icon: AlertTriangle, textColorClass: 'text-red-600 dark:text-red-500', borderColorClass: 'border-red-500/50 dark:border-red-400/40', isOverdue: true };

  const daysUntil = differenceInDays(dueDate, startOfDay(now));
  const reminderDays = (bill.reminderDaysBefore !== undefined && bill.reminderDaysBefore >= 0) ? bill.reminderDaysBefore : 0;

  if (daysUntil <= reminderDays && daysUntil >= 0) {
    return { text: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`, color: 'bg-yellow-500 hover:bg-yellow-600', icon: BellRing, textColorClass: 'text-yellow-600 dark:text-yellow-500', borderColorClass: 'border-yellow-500/50 dark:border-yellow-400/40', isOverdue: false };
  }
  return { text: 'Upcoming', color: 'bg-blue-500 hover:bg-blue-600', icon: CalendarClock, textColorClass: 'text-blue-600 dark:text-blue-500', borderColorClass: 'border-blue-500/50 dark:border-blue-400/40', isOverdue: false };
}


export function BillTrackerClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDisplayedMonth, setCurrentDisplayedMonth] = useState<Date>(new Date());
  const [recurringSuggestions, setRecurringSuggestions] = useState<RecurringSuggestion[]>([]);

  const [currentMonthKey, setCurrentMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
        const now = new Date();
        const newMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        setCurrentMonthKey(prevKey => {
            if (newMonthKey !== prevKey) {
                return newMonthKey;
            }
            return prevKey;
        });
    }, 60 * 1000 * 60); // Check every hour

    return () => clearInterval(intervalId);
  }, []);


  const fetchBills = useCallback(async () => {
    if (!user) {
      setBills([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      let fetchedBills = await getBillItems(user.uid);
      fetchedBills = fetchedBills.map(bill => {
        if (bill.status === 'upcoming' && isPast(parseISO(bill.dueDate)) && !isToday(parseISO(bill.dueDate))) {
          return { ...bill, status: 'overdue' as typeof BILL_STATUSES[number] };
        }
        return bill;
      });
      setBills(fetchedBills.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      toast({ title: "Error", description: "Could not load your bills.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    if (!user || bills.length === 0) {
      setRecurringSuggestions([]);
      return;
    }

    const paidBills = bills.filter(b => b.status === 'paid' && b.paidDate);
    if (paidBills.length < 2) {
      setRecurringSuggestions([]);
      return;
    }

    const potentialRecurring: Record<string, { dates: Date[], amounts: number[], originalBills: BillItem[] }> = {};

    paidBills.forEach(bill => {
      const normalizedName = bill.name.toLowerCase().trim();
      if (!potentialRecurring[normalizedName]) {
        potentialRecurring[normalizedName] = { dates: [], amounts: [], originalBills: [] };
      }
      potentialRecurring[normalizedName].dates.push(parseISO(bill.paidDate!));
      potentialRecurring[normalizedName].amounts.push(bill.amount);
      potentialRecurring[normalizedName].originalBills.push(bill);
    });

    const suggestions: RecurringSuggestion[] = [];

    for (const name in potentialRecurring) {
      const data = potentialRecurring[name];
      if (data.dates.length >= 2) {
        const existingRecurring = bills.find(b => 
          b.name.toLowerCase().trim() === name && 
          b.isRecurring && 
          (b.status === 'upcoming' || b.status === 'overdue')
        );
        if (existingRecurring) continue;

        const paymentDays = data.dates.map(d => getDate(d));
        const mostCommonDay = paymentDays.sort((a,b) =>
              paymentDays.filter(v => v===a).length
            - paymentDays.filter(v => v===b).length
        ).pop();

        if (mostCommonDay) {
          const countOnDay = paymentDays.filter(d => d === mostCommonDay).length;
          if (countOnDay >= 2 && countOnDay / data.dates.length >= 0.5) { 
            const relevantAmounts = data.amounts.filter((_, index) => paymentDays[index] === mostCommonDay);
            const averageAmount = relevantAmounts.reduce((sum, acc) => sum + acc, 0) / relevantAmounts.length;
            
            const categoryCounts: Record<string, number> = {};
            data.originalBills.filter((_,index) => paymentDays[index] === mostCommonDay).forEach(b => {
              categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
            });
            const sortedCategories = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]);
            const commonCategory = sortedCategories.length > 0 ? sortedCategories[0][0] as typeof BILL_CATEGORIES[number] : undefined;

            if (!suggestions.some(s => s.dayOfMonth === mostCommonDay && Math.abs(s.averageAmount - averageAmount) < averageAmount * 0.1 && s.name.toLowerCase().includes(name.split(' ')[0].toLowerCase()))) {
               suggestions.push({
                  name: data.originalBills[0].name, 
                  dayOfMonth: mostCommonDay,
                  averageAmount: parseFloat(averageAmount.toFixed(2)),
                  count: countOnDay,
                  category: commonCategory
               });
            }
          }
        }
      }
    }
    setRecurringSuggestions(suggestions.slice(0, 3));
  }, [bills, user]);


  const autoCreateNextMonthlyBill = async (originalBill: BillItem) => {
    if (!user) return;
    if (originalBill.isRecurring && originalBill.recurrenceFrequency === 'monthly') {
      try {
        const nextDueDate = addMonths(parseISO(originalBill.dueDate), 1);
        const newBillInstance: Omit<BillItem, 'id' | 'userId'> = {
          name: originalBill.name,
          amount: originalBill.amount,
          category: originalBill.category,
          dueDate: nextDueDate.toISOString(),
          isRecurring: true,
          recurrenceFrequency: 'monthly',
          reminderDaysBefore: originalBill.reminderDaysBefore,
          status: 'upcoming',
          notes: originalBill.notes,
          paidDate: null, 
        };
        
        await addBillItemStorage(user.uid, newBillInstance);
        toast({
          title: "Next Bill Scheduled",
          description: `Next instance of "${originalBill.name}" for ${format(nextDueDate, 'MMM yyyy')} has been created.`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      } catch (error) {
        console.error("Failed to auto-create next bill instance:", error);
        toast({
          title: "Auto-Creation Failed",
          description: `Could not automatically create the next instance for "${originalBill.name}".`,
          variant: "destructive",
        });
      }
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof BillFormSchema>) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsMutating(true);

    const billDataBase = {
      name: values.name,
      amount: parseFloat(values.amount),
      category: values.category,
      dueDate: values.dueDate.toISOString(),
      isRecurring: values.isRecurring,
      recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
      reminderDaysBefore: parseInt(values.reminderDaysBefore),
      status: values.status,
      notes: values.notes,
      lateFeeType: values.lateFeeType,
      lateFeeValue: values.lateFeeValue ? parseFloat(values.lateFeeValue) : undefined,
      lateFeeGracePeriodDays: values.lateFeeGracePeriodDays ? parseInt(values.lateFeeGracePeriodDays) : undefined,
    };

    try {
      if (editingBill && editingBill.id) { 
        const updates: Partial<Omit<BillItem, 'id'|'userId'>> = { ...billDataBase };
        if (values.status === 'paid' && !editingBill.paidDate) {
            updates.paidDate = new Date().toISOString();
        } else if (values.status !== 'paid') { 
            updates.paidDate = null;
        } else if (editingBill.paidDate && values.status === 'paid') { 
            updates.paidDate = editingBill.paidDate;
        }
        await updateBillItem(user.uid, editingBill.id, updates);
        toast({ title: "Success", description: "Bill updated.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
        if (updates.status === 'paid') {
            const updatedBillForAutoCreate = { ...editingBill, ...updates, dueDate: editingBill.dueDate }; 
            await autoCreateNextMonthlyBill(updatedBillForAutoCreate as BillItem);
        }
      } else { 
        const newBillData = { ...billDataBase, paidDate: values.status === 'paid' ? new Date().toISOString() : null };
        const newBill = await addBillItemStorage(user.uid, newBillData as Omit<BillItem, 'id' | 'userId'>);
        toast({ title: "Success", description: "New bill added.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
        if (newBill.status === 'paid') {
            await autoCreateNextMonthlyBill(newBill);
        }
      }
      setIsFormOpen(false);
      setEditingBill(null);
      await fetchBills();
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast({ title: "Error", description: "Could not save the bill.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditBill = (bill: BillItem) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!user) return;
    setIsMutating(true);
    try {
      await deleteBillItem(user.uid, billId);
      toast({ title: "Bill Deleted", description: "The bill has been removed." });
      await fetchBills();
    } catch (error) {
      console.error("Failed to delete bill:", error);
      toast({ title: "Error", description: "Could not delete the bill.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const openNewBillForm = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };
  
  const handleSetupRecurringFromSuggestion = (suggestion: RecurringSuggestion) => {
    const today = new Date();
    let suggestedDueDate = setDate(today, suggestion.dayOfMonth);
    if (isPast(suggestedDueDate) && !isToday(suggestedDueDate)) { 
      suggestedDueDate = addMonths(suggestedDueDate, 1);
    } else if (isToday(suggestedDueDate) && today.getHours() >=12 ) { 
       suggestedDueDate = addMonths(suggestedDueDate, 1);
    }

    setEditingBill({ 
      id: '', 
      name: suggestion.name,
      amount: suggestion.averageAmount,
      category: suggestion.category || BILL_CATEGORIES[0],
      dueDate: suggestedDueDate.toISOString(), 
      isRecurring: true,
      recurrenceFrequency: 'monthly',
      reminderDaysBefore: 3, 
      status: 'upcoming',
      notes: `Automatically suggested setup based on ${suggestion.count} past payments.`,
      paidDate: null,
      lateFeeType: undefined,
      lateFeeValue: undefined,
      lateFeeGracePeriodDays: 0,
    } as any); 
    setIsFormOpen(true);
  };


  const handleStatusChange = async (billId: string, newStatus: typeof BILL_STATUSES[number]) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const billToUpdate = bills.find(b => b.id === billId);
    if (!billToUpdate) {
      toast({ title: "Error", description: "Bill not found.", variant: "destructive" });
      return;
    }

    setIsMutating(true);
    const updates: Partial<Omit<BillItem, 'id'|'userId'>> = { status: newStatus };
    if (newStatus === 'paid' && !billToUpdate.paidDate) {
      updates.paidDate = new Date().toISOString();
    } else if (newStatus !== 'paid') {
      updates.paidDate = null;
    }

    try {
      await updateBillItem(user.uid, billId, updates);
      toast({ title: "Status Updated", description: `Bill "${billToUpdate.name}" status changed to ${newStatus}.`, icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
      
      if (newStatus === 'paid') {
        const billJustPaid = { ...billToUpdate, status: 'paid', paidDate: updates.paidDate || new Date().toISOString() };
        await autoCreateNextMonthlyBill(billJustPaid);
      }
      await fetchBills(); 
    } catch (error) {
      console.error("Failed to update bill status:", error);
      toast({ title: "Error", description: "Could not update bill status.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const billsByDate = useMemo(() => {
    const map = new Map<string, BillItem[]>();
    bills.forEach(bill => {
      const dateKey = startOfDay(parseISO(bill.dueDate)).toISOString();
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, bill]);
    });
    return map;
  }, [bills]);

  const billsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return billsByDate.get(startOfDay(selectedDate).toISOString()) || [];
  }, [billsByDate, selectedDate]);


  const calendarDayModifiers = useMemo(() => {
    const modifiers: { [key: string]: Date[] | ((date: Date) => boolean) } = {
        paid: [], overdue: [], upcoming: [], reminder: [], hasBills: []
    };
    const processedDatesForHasBills = new Set<string>();

    bills.forEach(bill => {
        const dueDate = startOfDay(parseISO(bill.dueDate));
        const dateString = dueDate.toISOString().split('T')[0];
        if (!processedDatesForHasBills.has(dateString)) {
            (modifiers.hasBills as Date[]).push(dueDate);
            processedDatesForHasBills.add(dateString);
        }

        const statusInfo = getBillStatusInfo(bill);
        if (statusInfo.text === 'Paid') (modifiers.paid as Date[]).push(dueDate);
        else if (statusInfo.isOverdue) (modifiers.overdue as Date[]).push(dueDate); 
        else if (statusInfo.text.startsWith('Due in')) (modifiers.reminder as Date[]).push(dueDate);
        else (modifiers.upcoming as Date[]).push(dueDate);
    });
    return modifiers;
  }, [bills]);

  const calendarModifierStyles = {
    paid: { backgroundColor: 'hsl(var(--chart-2))', color: 'white', borderRadius: '50%' },
    overdue: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', borderRadius: '50%' },
    upcoming: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '50%' },
    reminder: { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))', borderRadius: '50%' },
  };

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return bills.filter(bill => {
      const dueDate = parseISO(bill.dueDate);
      const daysUntil = differenceInDays(dueDate, startOfDay(now));
      const isBillOverdue = isPast(dueDate) && bill.status !== 'paid' && bill.status !== 'cancelled' && !isToday(dueDate);
      const reminderDays = (bill.reminderDaysBefore !== undefined && bill.reminderDaysBefore >= 0) ? bill.reminderDaysBefore : 0;
      return (bill.status !== 'paid' && bill.status !== 'cancelled') &&
             (isBillOverdue || (daysUntil >= 0 && daysUntil <= reminderDays));
    }).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [bills]);

 const billInsights = useMemo(() => {
    const now = new Date(); // Will use the current date based on currentMonthKey re-evaluation
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const upcomingIn30Days = bills.filter(b => {
      const dueDate = parseISO(b.dueDate);
      return (b.status === 'upcoming' || b.status === 'overdue') && 
             dueDate >= now && dueDate <= addDays(now, 30);
    });
    const totalUpcomingIn30Days = upcomingIn30Days.reduce((sum, b) => sum + b.amount, 0);
    
    const upcomingBillsForChart = bills.filter(b => b.status === 'upcoming' || b.status === 'overdue');
    const categoryBreakdown: { name: string; value: number }[] = [];
    if (upcomingBillsForChart.length > 0) {
        const sums: { [key: string]: number } = {};
        upcomingBillsForChart.forEach(bill => {
            sums[bill.category] = (sums[bill.category] || 0) + bill.amount;
        });
        for (const category in sums) {
            categoryBreakdown.push({ name: category, value: sums[category] });
        }
    }
    
    const paidThisMonthTotal = bills
      .filter(b => b.status === 'paid' && b.paidDate && isWithinInterval(parseISO(b.paidDate), { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, b) => sum + b.amount, 0);

    const paidLastMonthTotal = bills
      .filter(b => b.status === 'paid' && b.paidDate && isWithinInterval(parseISO(b.paidDate), { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((sum, b) => sum + b.amount, 0);

    let percentageChangePaid = 0;
    if (paidLastMonthTotal > 0) {
      percentageChangePaid = ((paidThisMonthTotal - paidLastMonthTotal) / paidLastMonthTotal) * 100;
    } else if (paidThisMonthTotal > 0) {
      percentageChangePaid = 100; 
    }

    let nextMonthTotalEstimatedBills = 0;
    const nextCalMonthStart = startOfMonth(addMonths(now, 1));
    const nextCalMonthEnd = endOfMonth(addMonths(now, 1));

    bills.filter(b => b.isRecurring && (b.status === 'upcoming' || b.status === 'overdue')).forEach(bill => {
        const originalDueDate = parseISO(bill.dueDate);
        switch (bill.recurrenceFrequency) {
            case 'monthly':
                const nextMonthDueDate = setDate(nextCalMonthStart, getDate(originalDueDate));
                if (isWithinInterval(nextMonthDueDate, {start: nextCalMonthStart, end: nextCalMonthEnd}) && nextMonthDueDate >= nextCalMonthStart) { 
                     nextMonthTotalEstimatedBills += bill.amount;
                } else if (getDate(originalDueDate) > getDate(nextCalMonthEnd)) { 
                    const lastDayOfNextMonth = setDate(nextCalMonthStart, getDate(nextCalMonthEnd));
                     if (isWithinInterval(lastDayOfNextMonth, {start: nextCalMonthStart, end: nextCalMonthEnd}) && lastDayOfNextMonth >= nextCalMonthStart) {
                        nextMonthTotalEstimatedBills += bill.amount;
                     }
                }
                break;
            case 'weekly':
                let currentDate = startOfDay(nextCalMonthStart);
                while (currentDate <= nextCalMonthEnd) {
                    if (getDay(currentDate) === getDay(originalDueDate)) {
                        nextMonthTotalEstimatedBills += bill.amount;
                    }
                    currentDate = addDays(currentDate, 1);
                }
                break;
            case 'yearly':
                if (getMonth(originalDueDate) === getMonth(nextCalMonthStart) && getDate(originalDueDate) >=1 && getYear(originalDueDate) <= getYear(nextCalMonthStart) ) { 
                     nextMonthTotalEstimatedBills += bill.amount;
                }
                break;
            case 'quarterly':
                 for (let i = 0; i < 4; i++) { 
                    const potentialDate = addMonths(originalDueDate, i * 3);
                    if (getMonth(potentialDate) === getMonth(nextCalMonthStart) && getYear(potentialDate) === getYear(nextCalMonthStart)) {
                        nextMonthTotalEstimatedBills += bill.amount;
                        break; 
                    }
                     if (potentialDate > nextCalMonthEnd) break;
                 }
                break;
            case 'daily':
                nextMonthTotalEstimatedBills += bill.amount * differenceInDays(nextCalMonthEnd, nextCalMonthStart);
                break;
        }
    });


    return {
      totalUpcomingIn30Days,
      categoryBreakdown,
      paidThisMonthTotal,
      paidLastMonthTotal,
      percentageChangePaid,
      nextMonthTotalEstimatedBills,
    };
  }, [bills, currentMonthKey]);


  const handleLogContribution = async (billId: string, amount: number) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const billToUpdate = bills.find(b => b.id === billId);
    if (!billToUpdate) {
      toast({ title: "Error", description: "Selected bill not found.", variant: "destructive" });
      return;
    }
    setIsMutating(true);
    const updates: Partial<Omit<BillItem, 'id'|'userId'>> = { 
        status: 'paid', 
        paidDate: new Date().toISOString(),
    };
    try {
      await updateBillItem(user.uid, billId, updates);
      toast({ 
        title: "Payment Logged!", 
        description: `Bill "${billToUpdate.name}" marked as paid.`,
        icon: <CheckCircle className="h-5 w-5 text-green-500"/>
      });
      const billJustPaid = { ...billToUpdate, status: 'paid', paidDate: updates.paidDate || new Date().toISOString() };
      await autoCreateNextMonthlyBill(billJustPaid);
      await fetchBills(); 
    } catch (error) {
      console.error("Failed to log payment:", error);
      toast({ title: "Error", description: "Could not log payment.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const memoizedDayContent = useCallback((dayProps: { date: Date; displayMonth: Date }) => {
    const { date } = dayProps;
    const dateKey = startOfDay(date).toISOString();
    const billsOnDate = billsByDate.get(dateKey) || [];
    
    const statusSummary: Record<string, { count: number; colorClass: string; icon: React.ElementType; isOverdue: boolean }> = {};
    let dayIsOverdue = false;
    let hasAnyBills = billsOnDate.length > 0;

    billsOnDate.forEach(bill => {
      const statusInfo = getBillStatusInfo(bill);
      const key = statusInfo.text; 
      if (!statusSummary[key]) {
        statusSummary[key] = { count: 0, colorClass: statusInfo.colorClass, icon: statusInfo.icon, isOverdue: statusInfo.isOverdue };
      }
      statusSummary[key].count++;
      if (statusInfo.isOverdue) {
        dayIsOverdue = true;
      }
    });
  
    const statusPriority: string[] = ['Overdue', 'Due in 0 days', 'Due in 1 day', 'Due in 2 days', 'Due in 3 days', 'Upcoming', 'Paid'];
  
    const dayDots = statusPriority
      .filter(statusKey => statusSummary[statusKey])
      .map(statusKey => ({ 
        colorClass: statusSummary[statusKey].colorClass, 
        key: statusKey, 
        isOverdue: statusSummary[statusKey].isOverdue 
      }))
      .slice(0, 3); 
  
    let dayNumberClass = "";
    if (hasAnyBills) {
        dayNumberClass = "font-bold";
    }
    if (dayIsOverdue) {
      dayNumberClass = cn(dayNumberClass, "text-red-600 dark:text-red-500");
    }
  
    const tooltipContent = hasAnyBills ? (
      <div>
        <p className="font-semibold text-sm mb-1">{billsOnDate.length} Bill{billsOnDate.length > 1 ? 's' : ''} Due</p>
        <ul className="list-disc list-inside text-xs">
          {billsOnDate.slice(0,1).map(b => <li key={b.id}>{b.name} - ₹{b.amount.toLocaleString('en-IN')}</li>)}
          {billsOnDate.length > 1 && <li>...and {billsOnDate.length - 1} more</li>}
        </ul>
      </div>
    ) : "No bills due";
  
    return (
      <TooltipProvider delayDuration={100}>
        <ShadTooltip>
          <TooltipTrigger asChild>
            <div className="relative w-full h-full flex items-center justify-center">
              <span className={cn("day-number", dayNumberClass)}>{format(date, "d")}</span>
              {hasAnyBills && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                  {dayDots.map((dot, index) => (
                     <span key={index} className={cn("h-2 w-2 rounded-full", dot.colorClass)} />
                  ))}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg border text-xs">
            {tooltipContent}
          </TooltipContent>
        </ShadTooltip>
      </TooltipProvider>
    );
  }, [billsByDate]);


  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const calendarLegendItems = [
    { label: 'Overdue', colorClass: 'bg-red-500' },
    { label: 'Reminder', colorClass: 'bg-yellow-500' },
    { label: 'Upcoming', colorClass: 'bg-blue-500' },
    { label: 'Paid', colorClass: 'bg-green-500' },
  ];
  
  const formatCurrencyDisplay = (value: number) => `₹${value.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Manage Your Bills</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingBill(null); }}>
            <DialogTrigger asChild>
                <Button onClick={openNewBillForm} disabled={isMutating} className="flex-grow sm:flex-grow-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Bill
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                <DialogTitle>{editingBill && editingBill.id ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
                 <DialogDescription>
                    {editingBill && editingBill.id ? 'Update the details of your bill.' : (editingBill ? 'Finalize details for the suggested recurring bill.' : 'Enter the details for your new bill.')}
                </DialogDescription>
                </DialogHeader>
                <BillForm
                    onSubmit={handleFormSubmit}
                    defaultValues={editingBill || undefined}
                    isLoading={isMutating}
                    onClose={() => setIsFormOpen(false)}
                />
            </DialogContent>
            </Dialog>
            <Button asChild variant="outline" className="flex-grow sm:flex-grow-0">
                <Link href="/bill-tracker/all-bills">
                    <ListChecks className="mr-2 h-4 w-4" /> View All Bills
                </Link>
            </Button>
             <Button asChild variant="outline" className="flex-grow sm:flex-grow-0">
                 <Link href="/bill-tracker/monthly-report">
                    <FileText className="mr-2 h-4 w-4" /> Monthly Report
                </Link>
            </Button>
        </div>
      </div>


      {upcomingReminders.length > 0 && (
        <Card className="shadow-md border-yellow-500/70 dark:border-yellow-400/60">
          <CardHeader>
            <UICardTitle className="flex items-center text-lg text-yellow-700 dark:text-yellow-500">
              <BellRing className="mr-2 h-5 w-5"/> Upcoming Reminders & Overdue
            </UICardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingReminders.slice(0, 3).map(bill => {
              const statusInfo = getBillStatusInfo(bill);
              return (
                <div key={bill.id} className={cn("p-3 rounded-md flex justify-between items-center text-sm", statusInfo.borderColorClass, "bg-background border")}>
                  <div>
                    <p className="font-medium">{bill.name} - ₹{bill.amount.toLocaleString('en-IN')}</p>
                    <p className={cn("text-xs", statusInfo.textColorClass)}>
                      {statusInfo.text} on {format(parseISO(bill.dueDate), 'dd MMM')}
                    </p>
                  </div>
                  <Badge variant={statusInfo.isOverdue ? 'destructive' : 'outline'} className={cn("capitalize", statusInfo.textColorClass)}>{statusInfo.text}</Badge>
                </div>
              );
            })}
            {upcomingReminders.length > 3 && <p className="text-xs text-muted-foreground text-center">...and {upcomingReminders.length - 3} more. <Link href="/bill-tracker/all-bills" className="underline">View all.</Link></p>}
          </CardContent>
        </Card>
      )}

      {recurringSuggestions.length > 0 && (
        <Card className="shadow-md border-blue-500/70 dark:border-blue-400/60">
          <CardHeader>
            <UICardTitle className="flex items-center text-lg text-blue-700 dark:text-blue-500">
              <Lightbulb className="mr-2 h-5 w-5" /> Smart Suggestions
            </UICardTitle>
            <UICardDescription>We've noticed some patterns in your bill payments.</UICardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recurringSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 rounded-md border bg-blue-50 dark:bg-blue-900/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-sm font-medium">
                    Looks like you often pay <span className="font-semibold text-primary">{suggestion.name}</span> around the <span className="font-semibold">{suggestion.dayOfMonth}{suggestion.dayOfMonth === 1 ? 'st' : suggestion.dayOfMonth === 2 ? 'nd' : suggestion.dayOfMonth === 3 ? 'rd' : 'th'}</span> of the month.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Average amount: ₹{suggestion.averageAmount.toLocaleString('en-IN')}. Detected from {suggestion.count} payments.
                    {suggestion.category && ` Commonly categorized as "${suggestion.category}".`}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleSetupRecurringFromSuggestion(suggestion)}
                  className="mt-2 sm:mt-0 sm:ml-auto whitespace-nowrap"
                  disabled={isMutating}
                >
                  Set up Recurring
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
          <h3 className="text-xl font-semibold">Bill Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <UICardTitle className="text-sm font-medium text-muted-foreground">Upcoming Bills (Next 30 Days)</UICardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{billInsights.totalUpcomingIn30Days.toLocaleString('en-IN')}</div>
                    <p className="text-xs text-muted-foreground">Total amount due soon.</p>
                </CardContent>
            </Card>
            
            <Card className="shadow-sm md:col-span-1 lg:col-span-1">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <UICardTitle className="text-sm font-medium text-muted-foreground">Paid: This vs Last Month</UICardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 mb-2">
                        <p className="text-lg font-bold">
                            {formatCurrencyDisplay(billInsights.paidThisMonthTotal)}
                            <span className="text-xs text-muted-foreground"> (This Month)</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            vs {formatCurrencyDisplay(billInsights.paidLastMonthTotal)} (Last Month)
                        </p>
                        <p className={cn("text-xs font-semibold", billInsights.percentageChangePaid >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
                            {billInsights.percentageChangePaid >= 0 ? '▲' : '▼'} {formatPercentage(Math.abs(billInsights.percentageChangePaid))}
                        </p>
                    </div>
                    <div className="h-[100px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={[
                                    { name: 'Last Month', value: billInsights.paidLastMonthTotal },
                                    { name: 'This Month', value: billInsights.paidThisMonthTotal }
                                ]}
                                margin={{ top: 5, right: 0, left: -30, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                                <Tooltip 
                                    formatter={(value: number) => [formatCurrencyDisplay(value), undefined]} 
                                    labelStyle={{fontSize: '12px'}} 
                                    itemStyle={{fontSize: '12px'}}
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)'}} 
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    <Cell fill="hsl(var(--chart-2))" /> 
                                    <Cell fill="hsl(var(--chart-1))" /> 
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

             <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <UICardTitle className="text-sm font-medium text-muted-foreground">Next Month's Est. Bills</UICardTitle>
                    <CalendarSearch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{billInsights.nextMonthTotalEstimatedBills.toLocaleString('en-IN')}</div>
                    <p className="text-xs text-muted-foreground">Forecast for recurring bills.</p>
                </CardContent>
            </Card>
            {billInsights.categoryBreakdown.length > 0 ? (
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <UICardTitle className="text-sm font-medium text-muted-foreground">Upcoming Bills by Category</UICardTitle>
                    </CardHeader>
                    <CardContent className="h-[150px] w-full p-0 pt-2"> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={billInsights.categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={50} 
                                    innerRadius={25} 
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {billInsights.categoryBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={INSIGHT_COLORS[index % INSIGHT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string) => [`${name}: ₹${value.toLocaleString('en-IN')}`, undefined]} />
                                <Legend wrapperStyle={{fontSize: '10px', paddingTop: '5px'}} layout="horizontal" align="center" verticalAlign="bottom" iconSize={8}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-sm flex items-center justify-center">
                     <CardContent className="text-center text-muted-foreground p-4">
                        <PieChartIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        No upcoming bills for category breakdown.
                    </CardContent>
                </Card>
            )}
          </div>
      </section>

      <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="pb-3"> 
            <UICardTitle>Bill Calendar</UICardTitle>
            <div className="flex justify-between items-center mt-2 text-sm">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDisplayedMonth(subMonths(currentDisplayedMonth, 1))} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDisplayedMonth(addMonths(currentDisplayedMonth, 1))} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setCurrentDisplayedMonth(new Date()); setSelectedDate(new Date()); }} className="h-8 px-2">
                        <RotateCcw className="mr-1.5 h-3 w-3"/> Today
                    </Button>
                </div>
                <span className="font-semibold">{format(currentDisplayedMonth, 'MMMM yyyy')}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col w-full p-3"> 
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={newDate => {
                if (newDate) {
                  setSelectedDate(newDate);
                  setCurrentDisplayedMonth(newDate); 
                }
              }}
              month={currentDisplayedMonth}
              onMonthChange={setCurrentDisplayedMonth}
              className="rounded-md border p-3 w-full shadow-sm" 
              modifiers={calendarDayModifiers}
              modifiersStyles={calendarModifierStyles} 
              components={{ DayContent: memoizedDayContent }}
            />
            <div className="mt-3 w-full text-xs space-y-1 border-t pt-2">
              <h4 className="font-medium mb-1 text-muted-foreground">Legend:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-0.5">
                {calendarLegendItems.map(item => (
                  <div key={item.label} className="flex items-center">
                    <span className={cn("h-2.5 w-2.5 rounded-full mr-1.5", item.colorClass)} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedDate && (
              <div className="mt-4 w-full border-t pt-3">
                <h3 className="text-md font-semibold mb-2">
                  Bills for {format(selectedDate, 'dd MMM, yyyy')}
                </h3>
                {billsForSelectedDate.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2"> 
                    {billsForSelectedDate.map(bill => (
                      <BillCard
                        key={bill.id}
                        bill={bill}
                        onEdit={handleEditBill}
                        onDelete={handleDeleteBill}
                        onStatusChange={handleStatusChange}
                        isLoading={isMutating}
                        statusInfo={getBillStatusInfo(bill)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No bills due on this date.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {(bills.length === 0 && !isLoadingData) && (
         <div className="text-center py-10 bg-muted/30 rounded-lg">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bills found.</p>
              <p className="text-sm text-muted-foreground">Add a new bill to start tracking!</p>
            </div>
      )}
    </div>
  );
}


    

