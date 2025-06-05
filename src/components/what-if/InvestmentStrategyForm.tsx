
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CardDescription } from '@/components/ui/card';

export const investmentStrategies = [
  { name: "Fixed Deposit", rate: 5.5, value: "fd_5.5" },
  { name: "Conservative Fund", rate: 7.0, value: "conservative_fund_7.0"},
  { name: "Balanced Fund", rate: 9.0, value: "balanced_fund_9.0"},
  { name: "SIP - Index Funds", rate: 10.0, value: "sip_index_10.0" },
  { name: "SIP - Mutual Funds (Moderate)", rate: 11.0, value: "sip_mf_moderate_11.0" },
  { name: "SIP - Mutual Funds (Aggressive)", rate: 12.5, value: "sip_mf_aggressive_12.5" },
  { name: "Direct Equity (High Risk)", rate: 15.0, value: "direct_equity_15.0" },
  { name: "Gold ETF", rate: 6.5, value: "gold_etf_6.5" },
] as const;

type InvestmentStrategyValue = typeof investmentStrategies[number]['value'];

export const investmentStrategySchema = z.object({
  monthlyInvestmentAmount: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ invalid_type_error: "Monthly investment must be a number." }).positive({ message: "Monthly investment amount must be positive." })
  ),
  currentInvestmentStrategyValue: z.custom<InvestmentStrategyValue>(
    (val) => investmentStrategies.some(s => s.value === val),
    { message: "Please select a valid current investment strategy." }
  ),
  newInvestmentStrategyValue: z.custom<InvestmentStrategyValue>(
    (val) => investmentStrategies.some(s => s.value === val),
    { message: "Please select a valid new investment strategy." }
  ),
  yearsToSimulate: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, { message: "Years to simulate must be at least 1." }).max(40, { message: "Years to simulate cannot exceed 40." })
  ),
});

export type InvestmentStrategyFormValues = z.infer<typeof investmentStrategySchema>;

interface InvestmentStrategyFormProps {
  onSubmit: (values: InvestmentStrategyFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<InvestmentStrategyFormValues>;
}

export function InvestmentStrategyForm({ onSubmit, isLoading, defaultValues }: InvestmentStrategyFormProps) {
  const form = useForm<InvestmentStrategyFormValues>({
    resolver: zodResolver(investmentStrategySchema),
    defaultValues: {
      monthlyInvestmentAmount: defaultValues?.monthlyInvestmentAmount ?? 10000,
      currentInvestmentStrategyValue: defaultValues?.currentInvestmentStrategyValue ?? "fd_5.5",
      newInvestmentStrategyValue: defaultValues?.newInvestmentStrategyValue ?? "sip_mf_aggressive_12.5",
      yearsToSimulate: defaultValues?.yearsToSimulate ?? 10,
    },
  });

  const selectedCurrentStrategyDetails = investmentStrategies.find(s => s.value === form.watch("currentInvestmentStrategyValue"));
  const selectedNewStrategyDetails = investmentStrategies.find(s => s.value === form.watch("newInvestmentStrategyValue"));


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CardDescription>Define current and new investment parameters for comparison.</CardDescription>
        
        <FormField
          control={form.control}
          name="monthlyInvestmentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Investment Amount (₹)</FormLabel>
              <FormControl>
                <Input 
                    type="number" 
                    placeholder="e.g., 10000" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <FormField
            control={form.control}
            name="currentInvestmentStrategyValue"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Current Investment Strategy</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select current strategy" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {investmentStrategies.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                        {`${strategy.name} (${strategy.rate}% p.a.)`}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                 {selectedCurrentStrategyDetails && <FormDescription className="mt-1 text-xs">Expected return: {selectedCurrentStrategyDetails.rate}% p.a.</FormDescription>}
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="newInvestmentStrategyValue"
            render={({ field }) => (
                <FormItem>
                <FormLabel>New Investment Strategy</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a new strategy" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {investmentStrategies.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                        {`${strategy.name} (${strategy.rate}% p.a.)`}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                 {selectedNewStrategyDetails && <FormDescription className="mt-1 text-xs">Expected return: {selectedNewStrategyDetails.rate}% p.a.</FormDescription>}
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="yearsToSimulate"
            render={({ field }) => (
                <FormItem className="md:col-span-2">
                <FormLabel>Years to Simulate</FormLabel>
                <FormControl>
                    <Input 
                        type="number" 
                        placeholder="e.g., 10" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                </FormControl>
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
