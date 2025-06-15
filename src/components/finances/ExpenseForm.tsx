
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Sparkles } from 'lucide-react'; // Added Sparkles
import type { ExpenseItem } from '@/types/finance';
import { EXPENSE_CATEGORIES, FREQUENCY_OPTIONS } from '@/types/finance';
import { useEffect, useState, useCallback } from 'react'; // Added useEffect, useState, useCallback
import { suggestExpenseCategory } from '@/ai/flows/suggest-expense-category'; // Added AI flow import
import { useToast } from '@/hooks/use-toast'; // Added useToast

export const expenseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name is too long.'),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be a positive number.'),
  type: z.enum(['fixed', 'variable'], { required_error: 'Expense type is required.' }),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'Category is required.' }), // Ensure category uses the enum
  frequency: z.enum(['monthly', 'weekly', 'one-time', 'yearly'], { required_error: 'Frequency is required.' }),
  tags: z.string().optional(), // Tags input as a comma-separated string
});

interface ExpenseFormProps {
  onSubmit: (values: z.infer<typeof expenseSchema>) => void;
  defaultValues?: Partial<ExpenseItem>;
  isLoading?: boolean;
}

export function ExpenseForm({ onSubmit, defaultValues, isLoading }: ExpenseFormProps) {
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      amount: defaultValues?.amount?.toString() || '',
      type: defaultValues?.type || 'fixed',
      category: defaultValues?.category as typeof EXPENSE_CATEGORIES[number] || EXPENSE_CATEGORIES[0],
      frequency: defaultValues?.frequency || 'monthly',
      tags: defaultValues?.tags?.join(', ') || '',
    },
  });

  const { watch, setValue, trigger } = form;
  const expenseName = watch('name');
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const { toast } = useToast();

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          resolve(func(...args));
        }, delay);
      });
    };
  };

  // Debounced AI category suggestion
  const debouncedSuggestCategory = useCallback(
    debounce(async (name: string) => {
      if (name && name.trim().length >= 3) {
        setIsSuggestingCategory(true);
        setSuggestionError(null);
        try {
          const result = await suggestExpenseCategory({ expenseName: name });
          if (result.suggestedCategory) {
            setValue('category', result.suggestedCategory, { shouldValidate: true });
            toast({
              title: "AI Suggestion",
              description: `Category set to "${result.suggestedCategory}". ${result.reasoning || ''}`,
              duration: 3000,
            });
          } else if (result.reasoning) {
            setSuggestionError(result.reasoning);
             toast({
              title: "AI Suggestion Info",
              description: result.reasoning,
              variant: "default",
              duration: 4000,
            });
          }
        } catch (error) {
          console.error("Error suggesting category:", error);
          const msg = error instanceof Error ? error.message : "Could not get AI suggestion.";
          setSuggestionError(msg);
           toast({
              title: "AI Suggestion Error",
              description: msg,
              variant: "destructive",
            });
        } finally {
          setIsSuggestingCategory(false);
        }
      } else {
        setSuggestionError(null); // Clear error if name is too short
      }
    }, 1000), // 1 second debounce
    [setValue, toast] 
  );

  useEffect(() => {
    // Automatically suggest category when expenseName changes, unless it's an edit and name hasn't changed from default.
    // Or if the user has already manually selected a category for this instance of the form.
    if (expenseName && (!defaultValues?.id || expenseName !== defaultValues.name)) {
      // Check if category field is dirty, if so, user might have manually set it.
      // For simplicity, we'll always suggest if name changes significantly and it's not initial load of edit form.
      // A more complex logic could involve checking form.formState.dirtyFields.category
      debouncedSuggestCategory(expenseName);
    }
  }, [expenseName, debouncedSuggestCategory, defaultValues]);
  
  // Update defaultValues if they change (e.g., when editing a different item)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: defaultValues.name || '',
        amount: defaultValues.amount?.toString() || '',
        type: defaultValues.type || 'fixed',
        category: defaultValues.category as typeof EXPENSE_CATEGORIES[number] || EXPENSE_CATEGORIES[0],
        frequency: defaultValues.frequency || 'monthly',
        tags: defaultValues.tags?.join(', ') || '',
      });
    }
  }, [defaultValues, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Rent, Groceries, Movie Tickets" {...field} />
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
                <Input type="number" placeholder="e.g., 15000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Expense Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="fixed" />
                    </FormControl>
                    <FormLabel className="font-normal">Fixed</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="variable" />
                    </FormControl>
                    <FormLabel className="font-normal">Variable</FormLabel>
                  </FormItem>
                </RadioGroup>
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
              <FormLabel className="flex items-center">
                Category 
                {isSuggestingCategory && <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />}
                {!isSuggestingCategory && expenseName && expenseName.length >=3 && <Sparkles className="ml-2 h-4 w-4 text-primary/70" />}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suggestionError && <FormDescription className="text-destructive text-xs">{suggestionError}</FormDescription>}
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
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., work, personal, urgent" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated list of tags.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading || isSuggestingCategory} className="w-full">
          {(isLoading || isSuggestingCategory) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.id ? 'Save Changes' : 'Add Expense'}
        </Button>
      </form>
    </Form>
  );
}
