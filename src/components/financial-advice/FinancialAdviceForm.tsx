
'use client';

// This component is no longer used by the primary AI Financial Advisor page (src/app/financial-advice/page.tsx)
// as the input method has changed significantly.
// It's kept for now in case parts of its schema or logic are needed for other specific advice features.
// If confirmed unused, it can be deleted.

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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const financialAdviceSchema = z.object({
  financialSituation: z.string().min(50, {
    message: 'Financial situation must be at least 50 characters.',
  }).max(2000, { message: 'Financial situation must be at most 2000 characters.' }),
  financialGoals: z.string().min(20, {
    message: 'Financial goals must be at least 20 characters.',
  }).max(1000, { message: 'Financial goals must be at most 1000 characters.' }),
  riskTolerance: z.enum(['low', 'medium', 'high'], {
    required_error: "You need to select a risk tolerance level.",
  }),
});

interface FinancialAdviceFormProps {
  onSubmit: (values: z.infer<typeof financialAdviceSchema>) => Promise<void>;
  isLoading: boolean;
}

export function FinancialAdviceForm({ onSubmit, isLoading }: FinancialAdviceFormProps) {
  const form = useForm<z.infer<typeof financialAdviceSchema>>({
    resolver: zodResolver(financialAdviceSchema),
    defaultValues: {
      financialSituation: '',
      financialGoals: '',
      riskTolerance: undefined,
    },
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Tell Us About Yourself (Legacy Form)</CardTitle>
        <CardDescription>Provide details so we can generate personalized advice. Note: This form may no longer be in active use.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="financialSituation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Current Financial Situation</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your income, expenses, assets, debts, etc."
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The more detail you provide, the better the advice.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="financialGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Financial Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are you saving for? (e.g., retirement, house, travel)"
                      className="resize-y min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="riskTolerance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Tolerance</FormLabel>
                  <FormControl>
                     <div className="flex space-x-4">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={field.value === level ? 'default' : 'outline'}
                          onClick={() => field.onChange(level)}
                          className="capitalize flex-1"
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Generating Advice...' : 'Get AI Advice'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
