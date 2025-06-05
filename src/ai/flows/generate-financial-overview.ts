
'use server';
/**
 * @fileOverview An AI agent that generates a financial overview based on user data.
 *
 * - generateFinancialOverview - A function that handles the financial overview generation.
 * - GenerateFinancialOverviewInput - The input type for the generateFinancialOverview function.
 * - GenerateFinancialOverviewOutput - The return type for the generateFinancialOverview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  IncomeItemSchema,
  ExpenseItemSchema,
  InvestmentItemSchema,
  LoanItemSchema,
} from '@/types/finance'; // Import shared schemas

const GenerateFinancialOverviewInputSchema = z.object({
  incomeSources: z.array(IncomeItemSchema).optional().describe("User's income sources."),
  expenses: z.array(ExpenseItemSchema).optional().describe("User's expenses."),
  investments: z.array(InvestmentItemSchema).optional().describe("User's investments."),
  loans: z.array(LoanItemSchema).optional().describe("User's loans."),
});
export type GenerateFinancialOverviewInput = z.infer<typeof GenerateFinancialOverviewInputSchema>;

const GenerateFinancialOverviewOutputSchema = z.object({
  overallCondition: z.string().describe("A brief summary of the user's financial health (e.g., 'Stable with growth potential', 'Requires immediate attention to debt'). Max 2 sentences."),
  keyInsights: z.array(z.string()).describe("List of 2-4 most important observations about the financial situation. Each insight should be concise."),
  actionableSuggestions: z.array(z.string()).describe("List of 2-4 concrete, actionable suggestions for improvement or optimization. Each suggestion should be clear and practical."),
  potentialRisks: z.array(z.string()).optional().describe("List of 1-3 potential financial risks identified, if any."),
  positiveAspects: z.array(z.string()).optional().describe("List of 1-3 positive aspects of the current financial situation, if any."),
});
export type GenerateFinancialOverviewOutput = z.infer<typeof GenerateFinancialOverviewOutputSchema>;

export async function generateFinancialOverview(
  input: GenerateFinancialOverviewInput
): Promise<GenerateFinancialOverviewOutput> {
  return generateFinancialOverviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialOverviewPrompt',
  input: {schema: GenerateFinancialOverviewInputSchema},
  output: {schema: GenerateFinancialOverviewOutputSchema},
  prompt: `You are an expert financial analyst AI. Your task is to provide a concise and insightful overview of the user's financial health based on the structured data provided.
Focus on analyzing the relationships between income, expenses, assets (investments), and liabilities (loans). Do not give generic advice. Be specific to the data.

Financial Data:
Income Sources:
{{#each incomeSources}}
- Name: {{name}}, Amount: $\{{amount}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No income sources provided.
{{/each}}

Expenses:
{{#each expenses}}
- Name: {{name}}, Amount: $\{{amount}}, Type: {{type}}, Category: {{category}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific expenses provided.
{{/each}}

Investments:
{{#each investments}}
- Name: {{name}}, Type: {{type}}, Current Value: $\{{currentValue}}{{#if initialInvestment}}, Initial: $\{{initialInvestment}}{{/if}}{{#if purchaseDate}}, Purchased: {{purchaseDate}}{{/if}}
{{else}}
No specific investments provided.
{{/each}}

Loans:
{{#each loans}}
- Name: {{name}}, Type: {{type}}, Balance: $\{{outstandingBalance}}, Monthly Payment: $\{{monthlyPayment}}{{#if interestRate}}, Rate: {{interestRate}}%{{/if}}
{{else}}
No specific loans provided.
{{/each}}

Based ONLY on the data above, provide the following:
1.  overallCondition: A brief summary of the financial health (max 2 sentences).
2.  keyInsights: 2-4 bullet points of the most critical observations (e.g., "High debt-to-income ratio", "Strong savings rate", "Lack of investment diversification").
3.  actionableSuggestions: 2-4 specific, actionable steps the user can take (e.g., "Consider consolidating high-interest credit card debt", "Explore increasing contributions to retirement accounts by X%", "Build an emergency fund covering 3-6 months of expenses").
4.  potentialRisks: (Optional, provide if significant) 1-3 potential financial risks identified.
5.  positiveAspects: (Optional, provide if significant) 1-3 positive aspects of the current financial situation.

Ensure each point is distinct and directly derived from the provided financial data. Avoid vague statements.
If no financial data at all is provided, for 'overallCondition' state that no data is available and for other fields return empty arrays or omit them if optional.
Output in the specified JSON format.
`,
});

const generateFinancialOverviewFlow = ai.defineFlow(
  {
    name: 'generateFinancialOverviewFlow',
    inputSchema: GenerateFinancialOverviewInputSchema,
    outputSchema: GenerateFinancialOverviewOutputSchema,
  },
  async input => {
    // Check if any financial data is actually present
    const hasData = input.incomeSources?.length || input.expenses?.length || input.investments?.length || input.loans?.length;

    if (!hasData) {
        return {
            overallCondition: "No financial data provided. Please add your income, expenses, investments, or loans in the 'Finances' section to get an overview.",
            keyInsights: [],
            actionableSuggestions: [],
            potentialRisks: [],
            positiveAspects: [],
        };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
