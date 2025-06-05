
'use server';
/**
 * @fileOverview A financial advice AI agent.
 *
 * - generateFinancialAdvice - A function that handles the financial advice generation process.
 * - GenerateFinancialAdviceInput - The input type for the generateFinancialAdvice function.
 * - GenerateFinancialAdviceOutput - The return type for the generateFinancialAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  IncomeItemSchema,
  ExpenseItemSchema,
  InvestmentItemSchema,
  LoanItemSchema,
} from '@/types/finance'; // Import shared schemas

const GenerateFinancialAdviceInputSchema = z.object({
  financialSituation: z
    .string()
    .optional()
    .describe('Overall summary of the user financial situation or a specific question, complementing the structured data below. If not provided, rely on structured data for general advice.'),
  financialGoals: z.string().optional().describe('The financial goals of the user. If not provided, suggest general goals based on the data.'),
  riskTolerance: z.string().optional().describe('The risk tolerance of the user (e.g., low, medium, high). If not provided, assume medium or provide advice for various tolerances.'),
  incomeSources: z.array(IncomeItemSchema).optional().describe("User's income sources."),
  expenses: z.array(ExpenseItemSchema).optional().describe("User's expenses."),
  investments: z.array(InvestmentItemSchema).optional().describe("User's investments."),
  loans: z.array(LoanItemSchema).optional().describe("User's loans."),
});
export type GenerateFinancialAdviceInput = z.infer<
  typeof GenerateFinancialAdviceInputSchema
>;

const GenerateFinancialAdviceOutputSchema = z.object({
  advice: z.string().describe('The personalized financial advice, formatted for readability (e.g., using markdown-like structure with headings and lists).'),
});
export type GenerateFinancialAdviceOutput = z.infer<
  typeof GenerateFinancialAdviceOutputSchema
>;

export async function generateFinancialAdvice(
  input: GenerateFinancialAdviceInput
): Promise<GenerateFinancialAdviceOutput> {
  return generateFinancialAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialAdvicePrompt',
  input: {schema: GenerateFinancialAdviceInputSchema},
  output: {schema: GenerateFinancialAdviceOutputSchema},
  prompt: `You are a financial advisor AI. Your goal is to provide personalized, actionable financial advice.
{{#if financialSituation}}
The user describes their situation or asks:
"{{{financialSituation}}}"
{{else}}
The user has not provided a specific situation, focus on a general analysis of their provided financial data.
{{/if}}

{{#if financialGoals}}
Their stated financial goals are:
"{{{financialGoals}}}"
{{else}}
The user has not provided specific goals. Infer potential goals or suggest common ones like debt reduction, savings for major purchases, retirement planning, or wealth growth based on their financial data.
{{/if}}

{{#if riskTolerance}}
Their risk tolerance is: {{{riskTolerance}}}.
{{else}}
The user has not specified their risk tolerance. Assume a 'medium' risk tolerance for any investment advice, or provide options suitable for different risk profiles if appropriate.
{{/if}}

Always use the following structured financial data, if available, to inform your advice. This data is paramount.
Income Sources:
{{#each incomeSources}}
- Name: {{name}}, Amount: $\{{amount}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific income sources provided by the user.
{{/each}}

Expenses:
{{#each expenses}}
- Name: {{name}}, Amount: $\{{amount}}, Type: {{type}}, Category: {{category}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific expenses provided by the user.
{{/each}}

Investments:
{{#each investments}}
- Name: {{name}}, Type: {{type}}, Current Value: $\{{currentValue}}{{#if initialInvestment}}, Initial: $\{{initialInvestment}}{{/if}}{{#if purchaseDate}}, Purchased: {{purchaseDate}}{{/if}}
{{else}}
No specific investments provided by the user.
{{/each}}

Loans:
{{#each loans}}
- Name: {{name}}, Type: {{type}}, Balance: $\{{outstandingBalance}}, Monthly Payment: $\{{monthlyPayment}}{{#if interestRate}}, Rate: {{interestRate}}%{{/if}}
{{else}}
No specific loans provided by the user.
{{/each}}

Based on all the above information (especially the structured data), provide comprehensive and actionable financial advice.
Structure your advice clearly, for example:
1. Financial Health Analysis: Briefly summarize their income, expenses, assets, and debts.
2. Actionable Recommendations for Improvement:
   2.1 Specific step 1 (e.g., Address Credit Card Debt) - explain why and how.
   2.2 Specific step 2 (e.g., Increase Savings & Investments) - explain why and how.
   2.3 ...
3. Potential Investment Opportunities: (If relevant and data supports it)
4. Suggestions for Expense Optimization: (If relevant and data supports it)

Ensure the advice is well-formatted, easy to read, and directly addresses the user's situation as understood from the inputs. Use headings and bullet points where appropriate.
If very little or no specific financial data is provided, give general financial planning advice and encourage the user to input more details for personalized recommendations.
Output the advice as a single string for the 'advice' field.
Advice:`,
});

const generateFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'generateFinancialAdviceFlow',
    inputSchema: GenerateFinancialAdviceInputSchema,
    outputSchema: GenerateFinancialAdviceOutputSchema,
  },
  async (input): Promise<GenerateFinancialAdviceOutput> => {
    const hasTextualInput = input.financialSituation || input.financialGoals;
    const hasStructuredData = input.incomeSources?.length || input.expenses?.length || input.investments?.length || input.loans?.length;

    if (!hasTextualInput && !hasStructuredData) {
      return {
        advice: "To provide you with personalized financial advice, please either describe your financial situation and goals, or add your financial details (income, expenses, investments, loans) in the 'Update Finances' section. For now, here's some general advice:\n\n1. **Create a Budget:** Track your income and expenses to understand your spending habits.\n2. **Build an Emergency Fund:** Aim to save 3-6 months' worth of living expenses.\n3. **Manage Debt:** Prioritize paying off high-interest debt.\n4. **Save and Invest Regularly:** Start early, even with small amounts, and be consistent.\n5. **Plan for Long-Term Goals:** Think about retirement and other major life events.\n\nUpdate your information for more tailored guidance!"
      };
    }

    try {
      const {output} = await prompt(input);
      if (!output) {
        console.error("[generateFinancialAdviceFlow] AI prompt did not return a valid output structure.");
        return { advice: "The AI model returned an unexpected response. Please try again." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateFinancialAdviceFlow] Error calling AI prompt:", e);
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        return {
          advice: "The AI service is temporarily overloaded or unavailable. Please try again in a few moments. (Error 503)"
        };
      }
      if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         return {
           advice: "The AI service could not be reached due to an API key issue. Please check the server configuration."
         };
      }
      return {
        advice: "An error occurred while generating your financial advice. If the problem persists, please contact support."
      };
    }
  }
);

