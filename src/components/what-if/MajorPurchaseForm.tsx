
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
import { useEffect, useMemo } from 'react';

const PURCHASE_TYPES = ["Property", "Vehicle", "Other"] as const;

export const majorPurchaseSchema = z.object({
  purchaseType: z.enum(PURCHASE_TYPES, { required_error: "Please select a purchase type."}),
  totalCost: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ invalid_type_error: "Total cost must be a number." }).positive({ message: "Total cost must be positive." })
  ),
  downPayment: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ invalid_type_error: "Down payment must be a number." }).nonnegative({ message: "Down payment cannot be negative." })
  ),
  interestRate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ invalid_type_error: "Interest rate must be a number." }).min(0, { message: "Interest rate cannot be negative." }).max(30, { message: "Interest rate seems too high (max 30%)." })
  ),
  loanTenureYears: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, { message: "Loan tenure must be at least 1 year." }).max(40, { message: "Loan tenure cannot exceed 40 years." })
  ),
  monthlyRent: z.preprocess( // New field
    (val) => val === '' ? 0 : parseFloat(String(val)), // Treat empty string as 0, making it effectively optional for non-property
    z.number({ invalid_type_error: "Monthly rent must be a number." }).nonnegative({ message: "Monthly rent cannot be negative." })
  ),
}).refine(data => data.downPayment <= data.totalCost, {
  message: "Down payment cannot exceed total cost.",
  path: ["downPayment"],
});

export type MajorPurchaseFormValues = z.infer<typeof majorPurchaseSchema>;

interface MajorPurchaseFormProps {
  onSubmit: (values: MajorPurchaseFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<MajorPurchaseFormValues>;
}

const formatCurrencyInput = (value: number | string | undefined): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  return String(value);
};


export function MajorPurchaseForm({ onSubmit, isLoading, defaultValues }: MajorPurchaseFormProps) {
  const form = useForm<MajorPurchaseFormValues>({
    resolver: zodResolver(majorPurchaseSchema),
    defaultValues: {
      purchaseType: defaultValues?.purchaseType ?? PURCHASE_TYPES[0],
      totalCost: defaultValues?.totalCost ?? undefined,
      downPayment: defaultValues?.downPayment ?? undefined,
      interestRate: defaultValues?.interestRate ?? 7.5,
      loanTenureYears: defaultValues?.loanTenureYears ?? 20,
      monthlyRent: defaultValues?.monthlyRent ?? undefined,
    },
  });

  const { watch, setValue } = form;
  const totalCost = watch("totalCost");
  const downPayment = watch("downPayment");
  const interestRateWatch = watch("interestRate");
  const loanTenureYearsWatch = watch("loanTenureYears");
  const purchaseTypeWatch = watch("purchaseType");

  const loanAmount = useMemo(() => {
    const tc = parseFloat(String(totalCost));
    const dp = parseFloat(String(downPayment));
    if (!isNaN(tc) && !isNaN(dp) && tc >= dp) {
      return tc - dp;
    }
    return 0;
  }, [totalCost, downPayment]);

  const monthlyEMI = useMemo(() => {
    if (loanAmount > 0 && interestRateWatch >= 0 && loanTenureYearsWatch > 0) {
      const P = loanAmount;
      const r = interestRateWatch / 100 / 12; 
      const n = loanTenureYearsWatch * 12; 

      if (r === 0) return P / n; 

      const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return isNaN(emi) ? 0 : emi;
    }
    return 0;
  }, [loanAmount, interestRateWatch, loanTenureYearsWatch]);

  useEffect(() => {
    if (defaultValues) {
        const transformedDefaults = {
            ...defaultValues,
            purchaseType: defaultValues.purchaseType ?? PURCHASE_TYPES[0],
            totalCost: defaultValues.totalCost !== undefined ? parseFloat(String(defaultValues.totalCost)) : undefined,
            downPayment: defaultValues.downPayment !== undefined ? parseFloat(String(defaultValues.downPayment)) : undefined,
            interestRate: defaultValues.interestRate !== undefined ? parseFloat(String(defaultValues.interestRate)) : 7.5,
            loanTenureYears: defaultValues.loanTenureYears !== undefined ? parseInt(String(defaultValues.loanTenureYears),10) : 20,
            monthlyRent: defaultValues.monthlyRent !== undefined ? parseFloat(String(defaultValues.monthlyRent)) : undefined,
        };
        form.reset(transformedDefaults);
    }
  }, [defaultValues, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardDescription>Major Purchase Parameters</CardDescription>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField
            control={form.control}
            name="purchaseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchase type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PURCHASE_TYPES.map(type => (
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
            name="totalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Cost (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 5000000" {...field} 
                  value={formatCurrencyInput(field.value)}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="downPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Down Payment (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 1000000" {...field} 
                  value={formatCurrencyInput(field.value)}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="loanTenureYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Tenure (Years)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 20" {...field} 
                  value={formatCurrencyInput(field.value)}
                  onChange={e => field.onChange(parseInt(e.target.value,10))}
                  />
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
                <FormLabel>Annual Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 8.5" {...field} 
                  value={formatCurrencyInput(field.value)}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="monthlyRent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Rent (for Buy vs Rent) (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 25000" {...field}
                  value={formatCurrencyInput(field.value)}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  disabled={purchaseTypeWatch !== "Property"}
                  />
                </FormControl>
                <FormDescription>
                  {purchaseTypeWatch === "Property" ? "Current/Comparable monthly rent if not buying." : "Only applicable for Property type."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-4 border rounded-md bg-muted/50 space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Loan Details (Auto-Calculated)</h4>
            <p className="text-sm">Loan Amount: <span className="font-semibold text-primary">₹{loanAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></p>
            <p className="text-sm">Estimated Monthly EMI: <span className="font-semibold text-primary">₹{monthlyEMI.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></p>
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Run Simulation
        </Button>
      </form>
    </Form>
  );
}
