
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { IncomeItem } from '@/types/finance';
import { FREQUENCY_OPTIONS } from '@/types/finance';

export const incomeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name is too long.'),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Amount must be a non-negative number.'),
  frequency: z.enum(['monthly', 'yearly', 'one-time'], { required_error: 'Frequency is required.' }),
});

const incomeFrequencyOptions = FREQUENCY_OPTIONS.filter(opt => ['monthly', 'yearly', 'one-time'].includes(opt.value));


interface IncomeFormProps {
  onSubmit: (values: z.infer<typeof incomeSchema>) => void;
  defaultValues?: Partial<IncomeItem>;
  isLoading?: boolean;
}

export function IncomeForm({ onSubmit, defaultValues, isLoading }: IncomeFormProps) {
  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      amount: defaultValues?.amount?.toString() || '',
      frequency: defaultValues?.frequency || 'monthly',
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
              <FormLabel>Income Source Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary, Freelance Project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 50000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {incomeFrequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.id ? 'Save Changes' : 'Add Income Source'}
        </Button>
      </form>
    </Form>
  );
}
