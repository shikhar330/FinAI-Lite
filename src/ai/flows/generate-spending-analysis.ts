
'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns and suggests savings.
 *
 * - generateSpendingAnalysis - A function that handles the spending analysis generation.
 * - GenerateSpendingAnalysisInput - The input type for the generateSpendingAnalysis function.
 * - GenerateSpendingAnalysisOutput - The return type for the generateSpendingAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  IncomeItemSchema,
  ExpenseItemSchema,
} from '@/types/finance';

const GenerateSpendingAnalysisInputSchema = z.object({
  expenseItems: z.array(ExpenseItemSchema).describe("User's expense items. These represent typical recurring or one-time expenses, not a raw transaction log."),
  incomeItems: z.array(IncomeItemSchema).optional().describe("User's income sources for context."),
  timePeriod: z.string().describe("The time period the user is interested in analyzing (e.g., 'last_month', 'last_3_months'). Use this to frame your analysis, assuming the provided expense data is representative for this period."),
});
export type GenerateSpendingAnalysisInput = z.infer<typeof GenerateSpendingAnalysisInputSchema>;

const GenerateSpendingAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A detailed spending analysis, including patterns, key categories, and actionable savings suggestions, formatted for readability (e.g., markdown).'),
});
export type GenerateSpendingAnalysisOutput = z.infer<typeof GenerateSpendingAnalysisOutputSchema>;

export async function generateSpendingAnalysis(
  input: GenerateSpendingAnalysisInput
): Promise<GenerateSpendingAnalysisOutput> {
  return generateSpendingAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSpendingAnalysisPrompt',
  input: {schema: GenerateSpendingAnalysisInputSchema},
  output: {schema: GenerateSpendingAnalysisOutputSchema},
  prompt: `You are a financial analyst AI. Your task is to analyze the user's spending patterns based on their provided expense items and suggest potential savings opportunities.
The user's expense items represent their typical/defined expenses (fixed, variable, with frequencies like monthly, weekly, yearly, one-time) rather than a raw log of past transactions.
The user is interested in an analysis for the time period: '{{timePeriod}}'. Frame your analysis assuming the provided expense data is representative of this period.

User's Financial Data:
Income Sources (for context):
{{#each incomeItems}}
- Name: {{name}}, Amount: $\{{amount}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific income sources provided by the user.
{{/each}}

Expense Items:
{{#each expenseItems}}
- Name: {{name}}, Amount: $\{{amount}}, Type: {{type}}, Category: {{category}}, Frequency: {{frequency}}
{{else}}
No expense items provided.
{{/each}}

Based on the expense data and the specified '{{timePeriod}}':
1.  **Identify Key Spending Categories**: What are the largest expense categories?
2.  **Analyze Spending Habits**: Provide insights into their spending habits based on fixed vs. variable expenses and categories. (e.g., "A significant portion of your expenses for the '{{timePeriod}}' appears to be on [Category], which is a [fixed/variable] expense.")
3.  **Suggest Savings Opportunities**: Offer 2-4 specific, actionable recommendations for reducing expenses or optimizing spending. Be practical.
4.  **Spending vs. Income (if income provided)**: Briefly comment on how their spending relates to their income, if available.
5.  **Summary for '{{timePeriod}}'**: Conclude with a brief summary of their spending behavior for the requested period.

Keep the tone constructive and helpful. Format your analysis clearly using markdown (headings, bullet points).
If no expense items are provided (though the flow logic should prevent this prompt from running in that case), state that an analysis cannot be performed without expense data.
Output the analysis as a single string for the 'analysis' field.
Analysis:
`,
});

const generateSpendingAnalysisFlow = ai.defineFlow(
  {
    name: 'generateSpendingAnalysisFlow',
    inputSchema: GenerateSpendingAnalysisInputSchema,
    outputSchema: GenerateSpendingAnalysisOutputSchema,
  },
  async (input: GenerateSpendingAnalysisInput): Promise<GenerateSpendingAnalysisOutput> => {
    if (!input.expenseItems || input.expenseItems.length === 0) {
      return {
        analysis: "No expense data was provided. To perform a spending analysis, please add your expense items in the 'Finances' section of the application. Assuming the expenses you add are representative, I can then analyze them for the selected time period."
      };
    }

    try {
      const {output} = await prompt(input);
      if (!output) {
        console.error("[generateSpendingAnalysisFlow] AI prompt did not return a valid output structure.");
        return { analysis: "The AI model returned an unexpected response. Please try again." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateSpendingAnalysisFlow] Error calling AI prompt:", e);
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        return {
          analysis: "The AI service is temporarily overloaded or unavailable. Please try again in a few moments. (Error 503)"
        };
      }
      if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         return {
           analysis: "The AI service could not be reached due to an API key issue. Please check the server configuration."
         };
      }
      return {
        analysis: "An error occurred while generating your spending analysis. If the problem persists, please contact support."
      };
    }
  }
);

