
'use server';
/**
 * @fileOverview An AI agent that suggests an expense category.
 *
 * - suggestExpenseCategory - A function that suggests a category for an expense name.
 * - SuggestExpenseCategoryInput - The input type for the function.
 * - SuggestExpenseCategoryOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { EXPENSE_CATEGORIES } from '@/types/finance';

const SuggestExpenseCategoryInputSchema = z.object({
  expenseName: z.string().describe('The name or description of the expense item.'),
});
export type SuggestExpenseCategoryInput = z.infer<typeof SuggestExpenseCategoryInputSchema>;

const SuggestExpenseCategoryOutputSchema = z.object({
  suggestedCategory: z.enum(EXPENSE_CATEGORIES).optional().describe('The suggested expense category. If no suitable category is found, this may be undefined.'),
  reasoning: z.string().optional().describe('A brief explanation for the suggestion, or why no suggestion could be made.'),
});
export type SuggestExpenseCategoryOutput = z.infer<typeof SuggestExpenseCategoryOutputSchema>;

export async function suggestExpenseCategory(
  input: SuggestExpenseCategoryInput
): Promise<SuggestExpenseCategoryOutput> {
  // Basic validation or pre-processing
  if (!input.expenseName || input.expenseName.trim().length < 3) {
    return { reasoning: "Expense name is too short to suggest a category." };
  }
  return suggestExpenseCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: { schema: SuggestExpenseCategoryInputSchema },
  output: { schema: SuggestExpenseCategoryOutputSchema },
  prompt: `You are an expert financial assistant. Your task is to suggest an appropriate expense category for a given expense name.
The available categories are: ${EXPENSE_CATEGORIES.join(', ')}.

Expense Name: "{{{expenseName}}}"

Based on the expense name, please select the most fitting category from the list above.
If the expense name is ambiguous or doesn't clearly fit into any category, you can choose not to suggest a category and provide a reasoning.
If you suggest a category, also provide a very brief reasoning.

Output format should be JSON satisfying the output schema.
Example valid outputs:
{ "suggestedCategory": "Food", "reasoning": "Relates to groceries or dining." }
{ "reasoning": "The expense name 'Miscellaneous items' is too generic to categorize." }
`,
});

const suggestExpenseCategoryFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoryFlow',
    inputSchema: SuggestExpenseCategoryInputSchema,
    outputSchema: SuggestExpenseCategoryOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        console.error("[suggestExpenseCategoryFlow] AI prompt did not return an output.");
        return { reasoning: "AI model did not return a response for category suggestion." };
      }
      // Ensure the suggestedCategory is valid, otherwise clear it
      if (output.suggestedCategory && !EXPENSE_CATEGORIES.includes(output.suggestedCategory)) {
        console.warn(`[suggestExpenseCategoryFlow] AI suggested an invalid category: ${output.suggestedCategory}. Clearing suggestion.`);
        return { reasoning: output.reasoning || "AI suggested an invalid category." };
      }
      return output;
    } catch (e: any) {
      console.error("[suggestExpenseCategoryFlow] Error calling AI prompt:", e);
      let errorMessage = "An error occurred while suggesting the category.";
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        errorMessage = "The AI service is temporarily overloaded. Please try again in a few moments. (Error 503)";
      } else if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         errorMessage = "The AI service could not be reached due to an API key issue. Please check the server configuration.";
      }
      return { reasoning: errorMessage };
    }
  }
);
