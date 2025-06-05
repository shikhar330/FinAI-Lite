
'use server';
/**
 * @fileOverview An AI agent that suggests financial goals and related advice, personalized if financial data is provided.
 *
 * - suggestFinancialGoals - A function that returns a list of goal suggestions with advice.
 * - SuggestFinancialGoalsInput - The input type for the function, optionally including financial data.
 * - SuggestFinancialGoalsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  IncomeItemSchema,
  ExpenseItemSchema,
  InvestmentItemSchema,
  LoanItemSchema,
} from '@/types/finance'; // Import shared schemas

const SuggestFinancialGoalsInputSchema = z.object({
  incomeSources: z.array(IncomeItemSchema).optional().describe("User's income sources."),
  expenses: z.array(ExpenseItemSchema).optional().describe("User's expenses."),
  investments: z.array(InvestmentItemSchema).optional().describe("User's investments."),
  loans: z.array(LoanItemSchema).optional().describe("User's loans."),
}).optional();

export type SuggestFinancialGoalsInput = z.infer<typeof SuggestFinancialGoalsInputSchema>;

const SuggestedGoalWithAdviceSchema = z.object({
  goalIdea: z.string().describe("A specific financial goal idea, e.g., 'Build an Emergency Fund of at least 3 months' expenses' or 'Aggressively pay down high-interest credit card debt'."),
  relatedAdvice: z.string().describe("Actionable advice related to this goal idea or general financial health. This could include tips on saving, initial investment thoughts, debt management, or expense reduction relevant to the suggestion. Format as a short paragraph or a few bullet points if appropriate (using Markdown for bullets like '- Point 1\\n- Point 2').")
});

const SuggestFinancialGoalsOutputSchema = z.object({
  recommendations: z.array(SuggestedGoalWithAdviceSchema).describe('A list of 2-3 financial goal ideas, each with related actionable advice.'),
});
export type SuggestFinancialGoalsOutput = z.infer<typeof SuggestFinancialGoalsOutputSchema>;

export async function suggestFinancialGoals(
  input?: SuggestFinancialGoalsInput
): Promise<SuggestFinancialGoalsOutput> {
  return suggestFinancialGoalsFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'suggestFinancialGoalsPrompt',
  input: { schema: SuggestFinancialGoalsInputSchema },
  output: { schema: SuggestFinancialGoalsOutputSchema },
  prompt: `You are a helpful and insightful financial assistant. Your task is to provide 2-3 personalized financial goal IDEAS and related ACTIONABLE ADVICE based on the user's provided financial data. If limited or no data is provided, offer general good-practice financial goals and advice.

User's Financial Data (if available):
Income Sources:
{{#each incomeSources}}
- Name: {{name}}, Amount: ₹{{amount}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific income sources provided.
{{/each}}

Expenses:
{{#each expenses}}
- Name: {{name}}, Amount: ₹{{amount}}, Type: {{type}}, Category: {{category}}{{#if frequency}}, Frequency: {{frequency}}{{/if}}
{{else}}
No specific expenses provided.
{{/each}}

Investments:
{{#each investments}}
- Name: {{name}}, Type: {{type}}, Current Value: ₹{{currentValue}}
{{else}}
No specific investments provided.
{{/each}}

Loans:
{{#each loans}}
- Name: {{name}}, Type: {{type}}, Balance: ₹{{outstandingBalance}}, Monthly Payment: ₹{{monthlyPayment}}{{#if interestRate}}, Rate: {{interestRate}}%{{/if}}
{{else}}
No specific loans provided.
{{/each}}

Based on this data (or lack thereof), provide 2-3 distinct 'recommendations'. Each recommendation MUST include:
1.  \`goalIdea\`: A concise, actionable financial goal idea. Examples: "Build an emergency fund covering 3-6 months of essential living expenses (approx. ₹X, if calculable from expenses).", "Strategize to pay down high-interest debt, starting with '{{loanName}}'.", "Increase monthly savings towards long-term investments.", "Begin retirement planning by exploring investment options like mutual funds or ETFs."
2.  \`relatedAdvice\`: Specific, actionable advice directly related to achieving that \`goalIdea\` or improving the financial aspect it addresses. This advice should incorporate suggestions on:
    *   **Savings strategies**: How to approach saving for this or related goals (e.g., "Automate monthly transfers of ₹Y to a dedicated high-yield savings account.").
    *   **Investment principles (if relevant to the goal idea)**: General guidance on where or how one might invest (e.g., "For long-term goals like retirement, consider a diversified portfolio with exposure to equities. For shorter-term goals, safer options like FDs or liquid funds might be more appropriate.").
    *   **Debt management (if relevant)**: How to tackle existing debt (e.g., "Consider the debt avalanche or snowball method. Explore balance transfer options for high-interest credit cards.").
    *   **Expense reduction (if relevant)**: Tips on cutting down expenses to free up funds for the goal (e.g., "Review your discretionary spending in categories like 'Entertainment' and 'Dining Out' to find potential savings of ₹Z per month.").

If the user's data is very sparse, provide generic recommendations like:
- goalIdea: "Establish a solid financial foundation."
  relatedAdvice: "- Track your expenses for a month to understand your spending habits.\\n- Aim to build an emergency fund covering 3-6 months of essential living expenses.\\n- Consider setting up small, regular contributions to a diversified investment for long-term growth."
- goalIdea: "Plan for major long-term goals."
  relatedAdvice: "- Start thinking about your retirement; even small, consistent investments compound over time.\\n- Identify other large future expenses (e.g., education, property) and begin saving early.\\n- Review your investment risk tolerance periodically."

Return the output in the specified JSON format for the 'recommendations' array. Each piece of 'relatedAdvice' should be a concise paragraph or a few Markdown bullet points.
`,
});

const suggestFinancialGoalsFlow = ai.defineFlow(
  {
    name: 'suggestFinancialGoalsFlow',
    inputSchema: SuggestFinancialGoalsInputSchema,
    outputSchema: SuggestFinancialGoalsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.recommendations || output.recommendations.length === 0) {
        // Fallback in case AI fails to provide suggestions
        return {
            recommendations: [
                {
                    goalIdea: "General Financial Health Check",
                    relatedAdvice: "- Review your monthly budget to identify savings opportunities.\n- Consider building an emergency fund covering 3-6 months of expenses.\n- Explore options for managing and reducing any high-interest debt."
                }
            ]
        };
    }
    return output;
  }
);

