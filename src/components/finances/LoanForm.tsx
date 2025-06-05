
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LoanItem } from '@/types/finance';
import { LOAN_TYPES } from '@/types/finance';

export const loanSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name is too long.'),
  type: z.string().min(1, 'Loan type is required.'),
  outstandingBalance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Balance must be a non-negative number.'),
  monthlyPayment: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Payment must be a non-negative number.'),
  interestRate: z.string().optional().refine(val => val === undefined || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), 'Rate must be between 0 and 100.'),
  originalAmount: z.string().optional().refine(val => val === undefined || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), 'Original amount must be a positive number.'),
  startDate: z.date().optional(),
});

interface LoanFormProps {
  onSubmit: (values: z.infer<typeof loanSchema>) => void;
  defaultValues?: Partial<LoanItem>;
  isLoading?: boolean;
}

export function LoanForm({ onSubmit, defaultValues, isLoading }: LoanFormProps) {
  const form = useForm<z.infer<typeof loanSchema>>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      type: defaultValues?.type || '',
      outstandingBalance: defaultValues?.outstandingBalance?.toString() || '',
      monthlyPayment: defaultValues?.monthlyPayment?.toString() || '',
      interestRate: defaultValues?.interestRate?.toString() || '',
      originalAmount: defaultValues?.originalAmount?.toString() || '',
      startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loan Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Mortgage, Car Loan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loan Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOAN_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outstandingBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outstanding Balance (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1500000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="monthlyPayment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Payment (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 80000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="interestRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest Rate (%) (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 8.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="originalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Original Loan Amount (₹) (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 2000000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Loan Start Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.id ? 'Save Changes' : 'Add Loan'}
        </Button>
      </form>
    </Form>
  );
}
