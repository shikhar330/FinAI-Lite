
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react'; 
import { CardDescription } from '@/components/ui/card';

export const careerChangeSchema = z.object({
  currentMonthlySalary: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Current salary must be a number."}).positive({ message: "Current monthly salary must be positive." })
  ),
  newMonthlySalary: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "New salary must be a number."}).positive({ message: "New monthly salary must be positive." })
  ),
  yearsToSimulate: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, { message: "Years to simulate must be at least 1." }).max(30, { message: "Years to simulate cannot exceed 30."})
  ),
  annualGrowthRate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({invalid_type_error: "Growth rate must be a number."}).min(0, { message: "Annual growth rate cannot be negative." }).max(20, {message: "Annual growth rate seems too high (max 20%)."})
  ),
});

export type CareerChangeFormValues = z.infer<typeof careerChangeSchema>;

interface CareerChangeFormProps {
  onSubmit: (values: CareerChangeFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<CareerChangeFormValues>;
}

export function CareerChangeForm({ onSubmit, isLoading, defaultValues: propsDefaultValues }: CareerChangeFormProps) {
  const form = useForm<CareerChangeFormValues>({
    resolver: zodResolver(careerChangeSchema),
    defaultValues: {
      currentMonthlySalary: propsDefaultValues?.currentMonthlySalary ?? 0,
      newMonthlySalary: propsDefaultValues?.newMonthlySalary ?? '', // Initialize with '' instead of undefined
      yearsToSimulate: propsDefaultValues?.yearsToSimulate ?? 5,
      annualGrowthRate: propsDefaultValues?.annualGrowthRate ?? 3,
    },
  });
  
  // Update current salary if defaultValues changes (e.g. after fetching current financials)
  useEffect(() => {
    if (propsDefaultValues?.currentMonthlySalary !== undefined && 
        propsDefaultValues.currentMonthlySalary !== form.getValues("currentMonthlySalary")) {
      form.setValue("currentMonthlySalary", propsDefaultValues.currentMonthlySalary);
    }
    // Note: To make the form fully reactive to all propsDefaultValues changes,
    // you might consider form.reset(newDefaultValues) when propsDefaultValues itself changes.
    // For now, this effect only handles currentMonthlySalary as per the original logic.
  }, [propsDefaultValues, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CardDescription>Enter parameters for the career change scenario.</CardDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentMonthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Monthly Salary (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 50000" {...field} 
                   value={field.value ?? 0} // Ensure value is not undefined
                   onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newMonthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Monthly Salary (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 80000" {...field}
                   value={field.value ?? ''} // Ensure value is not undefined
                   onChange={e => field.onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="yearsToSimulate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years to Simulate</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 5" {...field} 
                  value={field.value ?? 0} // Ensure value is not undefined
                  onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="annualGrowthRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Growth Rate (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 3" {...field}
                  value={field.value ?? 0} // Ensure value is not undefined
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormDescription>Expected annual increase in salary.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Run Simulation
        </Button>
      </form>
    </Form>
  );
}
