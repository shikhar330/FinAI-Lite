
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
import type { InvestmentItem } from '@/types/finance';
import { INVESTMENT_TYPES } from '@/types/finance';

export const investmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name is too long.'),
  type: z.string().min(1, 'Investment type is required.'),
  currentValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Current value must be a non-negative number.'),
  initialInvestment: z.string().optional().refine(val => val === undefined || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), 'Initial investment must be a non-negative number.'),
  purchaseDate: z.date().optional(),
});

interface InvestmentFormProps {
  onSubmit: (values: z.infer<typeof investmentSchema>) => void;
  defaultValues?: Partial<InvestmentItem>;
  isLoading?: boolean;
}

export function InvestmentForm({ onSubmit, defaultValues, isLoading }: InvestmentFormProps) {
  const form = useForm<z.infer<typeof investmentSchema>>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      type: defaultValues?.type || '',
      currentValue: defaultValues?.currentValue?.toString() || '',
      initialInvestment: defaultValues?.initialInvestment?.toString() || '',
      purchaseDate: defaultValues?.purchaseDate ? new Date(defaultValues.purchaseDate) : undefined,
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
              <FormLabel>Investment Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Apple Stock, Vanguard S&P 500 ETF" {...field} />
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
              <FormLabel>Investment Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select investment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INVESTMENT_TYPES.map(type => (
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
          name="currentValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Value (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1000000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialInvestment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Investment (₹) (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 500000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Purchase Date (Optional)</FormLabel>
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
          {defaultValues?.id ? 'Save Changes' : 'Add Investment'}
        </Button>
      </form>
    </Form>
  );
}
