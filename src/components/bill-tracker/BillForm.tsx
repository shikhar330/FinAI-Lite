
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, DollarSign, Percent, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BillItem } from '@/types/finance';
import { BillFormSchema, BILL_CATEGORIES, BILL_RECURRENCE_FREQUENCIES, BILL_REMINDER_OPTIONS, BILL_STATUSES, LATE_FEE_TYPES } from '@/types/finance';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface BillFormProps {
  onSubmit: (values: z.infer<typeof BillFormSchema>) => Promise<void>;
  defaultValues?: Partial<BillItem>;
  isLoading?: boolean;
  onClose?: () => void;
}

export function BillForm({ onSubmit, defaultValues, isLoading, onClose }: BillFormProps) {
  const form = useForm<z.infer<typeof BillFormSchema>>({
    resolver: zodResolver(BillFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      amount: defaultValues?.amount?.toString() || '',
      category: defaultValues?.category || BILL_CATEGORIES[0],
      dueDate: defaultValues?.dueDate ? new Date(defaultValues.dueDate) : new Date(),
      isRecurring: defaultValues?.isRecurring || false,
      recurrenceFrequency: defaultValues?.recurrenceFrequency,
      reminderDaysBefore: defaultValues?.reminderDaysBefore?.toString() || '3',
      status: defaultValues?.status || 'upcoming',
      notes: defaultValues?.notes || '',
      lateFeeType: defaultValues?.lateFeeType,
      lateFeeValue: defaultValues?.lateFeeValue?.toString() || '',
      lateFeeGracePeriodDays: defaultValues?.lateFeeGracePeriodDays?.toString() || '0',
    },
  });

  const isRecurring = form.watch('isRecurring');
  const lateFeeTypeSelected = form.watch('lateFeeType');

  const handleFormSubmit = async (values: z.infer<typeof BillFormSchema>) => {
    await onSubmit(values);
    // No automatic reset here, parent component (Dialog) will close or parent will decide to reset.
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Electricity Bill, Netflix Subscription" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 1200" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {BILL_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
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
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Is this a recurring bill?
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {isRecurring && (
          <FormField
            control={form.control}
            name="recurrenceFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurrence Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BILL_RECURRENCE_FREQUENCIES.map(freq => (
                      <SelectItem key={freq} value={freq} className="capitalize">{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
            control={form.control}
            name="reminderDaysBefore"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Remind Me (Days Before Due)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select reminder period" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {BILL_REMINDER_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt.toString()}>
                        {opt === 0 ? "On Due Date" : `${opt} day${opt > 1 ? 's' : ''} before`}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {BILL_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="late-fee-settings">
            <AccordionTrigger className="text-sm font-medium">Late Fee Settings (Optional)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-3">
              <FormField
                control={form.control}
                name="lateFeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select late fee type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage of Bill</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {lateFeeTypeSelected && (
                <FormField
                  control={form.control}
                  name="lateFeeValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {lateFeeTypeSelected === 'fixed' ? 'Late Fee Amount (₹)' : 'Late Fee Rate (%)'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder={lateFeeTypeSelected === 'fixed' ? "e.g., 100" : "e.g., 2.5"} {...field} className="pl-7"/>
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {lateFeeTypeSelected === 'fixed' ? <DollarSign className="h-4 w-4"/> : <Percent className="h-4 w-4"/>}
                            </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="lateFeeGracePeriodDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grace Period (Days after due date)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 3" {...field} />
                    </FormControl>
                    <FormDescription>Number of days after the due date before a late fee applies. Default is 0.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Confirmation number, account details" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
            {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>}
            <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? 'Save Changes' : 'Add Bill'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
