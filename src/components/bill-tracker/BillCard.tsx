
'use client';

import * as React from 'react';
import type { BillItem } from '@/types/finance';
import { BILL_STATUSES } from '@/types/finance';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, CalendarDays, CircleDollarSign, Repeat, AlertTriangle, CheckCircle, Clock, BellRing, Info, AlertOctagon, CalendarPlus } from 'lucide-react';
import { format, parseISO, addDays, isPast as dateIsPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface BillCardProps {
  bill: BillItem;
  onEdit: (bill: BillItem) => void;
  onDelete: (billId: string) => void;
  onStatusChange: (billId: string, newStatus: typeof BILL_STATUSES[number]) => Promise<void>;
  isLoading?: boolean;
  statusInfo: { text: string; color: string; icon: React.ElementType; textColorClass: string, borderColorClass: string };
}

export function BillCard({ bill, onEdit, onDelete, onStatusChange, isLoading, statusInfo }: BillCardProps) {
  const dueDate = parseISO(bill.dueDate);
  const StatusIcon = statusInfo.icon || Clock;

  const handleLocalStatusChange = async (newStatusValue: string) => {
    const newStatus = newStatusValue as typeof BILL_STATUSES[number];
    if (isLoading || newStatus === bill.status) return;
    await onStatusChange(bill.id, newStatus);
  };

  const calculateLateFeeInfo = () => {
    if (!bill.lateFeeType || bill.lateFeeValue === undefined || bill.status === 'paid' || bill.status === 'cancelled') {
      return null;
    }

    const gracePeriod = bill.lateFeeGracePeriodDays ?? 0;
    const lateFeeApplicableDate = addDays(dueDate, gracePeriod);
    const today = new Date();
    let estimatedFee: number | null = null;
    let message = '';
    let isFeeApplied = false;

    if (dateIsPast(lateFeeApplicableDate) && (bill.status === 'overdue' || bill.status === 'upcoming')) {
      isFeeApplied = true;
      if (bill.lateFeeType === 'fixed') {
        estimatedFee = bill.lateFeeValue;
      } else if (bill.lateFeeType === 'percentage') {
        estimatedFee = (bill.lateFeeValue / 100) * bill.amount;
      }
      message = `Est. Late Fee Applied: ₹${estimatedFee?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (bill.status === 'upcoming' || bill.status === 'overdue') {
      const daysUntilLateFee = differenceInDays(lateFeeApplicableDate, today);
      if (daysUntilLateFee >= 0 && daysUntilLateFee <= 7) { // Warn if late fee is within 7 days
         message = `Potential late fee if not paid by ${format(lateFeeApplicableDate, 'dd MMM')}.`;
      } else if (daysUntilLateFee < 0) { // Should be caught by isFeeApplied, but as a fallback
         message = `Late fee may be applicable.`;
      }
    }
    
    if (!message && estimatedFee === null && (bill.status === 'upcoming' || bill.status === 'overdue')) {
        // Generic message if specific conditions above aren't met but late fee settings exist
        message = `Late fee configured. Applies after grace period from due date.`;
    }


    return {
      message,
      estimatedFee,
      isFeeApplied,
      lateFeeApplicableDateFormatted: format(lateFeeApplicableDate, 'dd MMM, yyyy'),
    };
  };

  const lateFeeInfo = calculateLateFeeInfo();


  return (
    <Card className={cn(
        "shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col",
        statusInfo.borderColorClass,
        (bill.status === 'paid' || bill.status === 'cancelled') ? "opacity-80 dark:opacity-70" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{bill.name}</CardTitle>
          <Badge
            variant={bill.status === 'paid' || bill.status === 'cancelled' ? 'default' : statusInfo.text === 'Overdue' ? 'destructive' : 'secondary'}
            className={cn("capitalize whitespace-nowrap flex items-center gap-1.5", statusInfo.textColorClass, statusInfo.color)}
          >
             <StatusIcon className="h-4 w-4" />
             {statusInfo.text}
          </Badge>
        </div>
        <CardDescription className="text-xs">{bill.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="flex items-center">
          <CircleDollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="font-semibold text-lg">₹{bill.amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center">
          <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>Due: {format(dueDate, 'dd MMM, yyyy')}</span>
        </div>
        {bill.isRecurring && bill.recurrenceFrequency && (
            <div className="flex items-center text-xs text-muted-foreground">
                <Repeat className="h-3 w-3 mr-1.5" />
                <span>Recurs {bill.recurrenceFrequency}</span>
            </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
            {bill.reminderDaysBefore > 0 && bill.status !== 'paid' && bill.status !== 'cancelled' && (
                <div>
                    Reminder: {bill.reminderDaysBefore} day{bill.reminderDaysBefore > 1 ? 's' : ''} before
                </div>
            )}
        </div>

        {lateFeeInfo && lateFeeInfo.message && (
          <div className={cn(
            "flex items-start text-xs p-2 rounded-md border",
            lateFeeInfo.isFeeApplied ? "bg-red-50 dark:bg-red-900/30 border-red-500/50 text-red-700 dark:text-red-400" : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500/50 text-yellow-700 dark:text-yellow-500"
          )}>
            <AlertOctagon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{lateFeeInfo.message}</span>
          </div>
        )}

        {bill.notes && <p className="text-xs text-muted-foreground italic pt-1">Notes: {bill.notes}</p>}
        
        {bill.createdAt && (
          <div className="flex items-center text-xs text-muted-foreground pt-1">
            <CalendarPlus className="h-3 w-3 mr-1.5" />
            <span>Created: {format(parseISO(bill.createdAt), 'dd MMM, yyyy HH:mm')}</span>
          </div>
        )}
        {bill.paidDate && (
           <div className="flex items-center text-xs text-green-600 dark:text-green-500 pt-1">
             <CheckCircle className="h-3 w-3 mr-1.5" />
             <span>Paid: {format(parseISO(bill.paidDate), 'dd MMM, yyyy HH:mm')}</span>
           </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col sm:flex-row items-center gap-2">
        <div className="w-full sm:w-auto sm:flex-grow mb-2 sm:mb-0">
            <Select
                value={bill.status}
                onValueChange={handleLocalStatusChange}
                disabled={isLoading || bill.status === 'cancelled'}
            >
            <SelectTrigger className={cn("h-9 text-xs capitalize focus:ring-primary focus:border-primary", statusInfo.textColorClass)}>
                <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
                {BILL_STATUSES.filter(s => s !== 'overdue').map(s => ( // User cannot manually set to 'overdue'
                <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/-/g, ' ')}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
            <Button variant="outline" size="icon" onClick={() => onEdit(bill)} disabled={isLoading} aria-label={`Edit bill ${bill.name}`}>
                <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isLoading} aria-label={`Delete bill ${bill.name}`}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the bill
                        "{bill.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(bill.id)} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
