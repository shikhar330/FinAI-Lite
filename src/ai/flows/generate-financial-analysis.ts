
'use server';
/**
 * @fileOverview An AI agent that generates a detailed financial analysis based on user data and calculated metrics.
 *
 * - generateFinancialAnalysis - A function that handles the financial analysis generation.
 * - GenerateFinancialAnalysisInput - The input type for the generateFinancialAnalysis function.
 * - GenerateFinancialAnalysisOutput - The return type for the generateFinancialAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  IncomeItemSchema as OriginalIncomeItemSchema,
  ExpenseItemSchema as OriginalExpenseItemSchema,
  InvestmentItemSchema as OriginalInvestmentItemSchema,
  LoanItemSchema as OriginalLoanItemSchema,
} from '@/types/finance';

// Original Schemas for the exported function's interface
const CalculatedMetricsSchema = z.object({
  monthlyIncome: z.number(),
  totalMonthlyExpenses: z.number(),
  monthlySavings: z.number(),
  savingsRate: z.number().describe("Percentage, e.g., 20.5 for 20.5%"),
  debtToIncomeRatio: z.number().describe("Percentage, e.g., 18.8 for 18.8%"),
  investmentRate: z.number().describe("Percentage, e.g., 12.5 for 12.5%"),
});

const GenerateFinancialAnalysisInputSchema = z.object({
  incomeSources: z.array(OriginalIncomeItemSchema).optional().describe("User's income sources."),
  expenses: z.array(OriginalExpenseItemSchema).optional().describe("User's expenses."),
  investments: z.array(OriginalInvestmentItemSchema).optional().describe("User's investments."),
  loans: z.array(OriginalLoanItemSchema).optional().describe("User's loans."),
  calculatedMetrics: CalculatedMetricsSchema.describe("Pre-calculated key financial metrics."),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

const GenerateFinancialAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A comprehensive textual financial analysis including insights, observations on savings, debt, investments, and actionable recommendations.'),
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;


// Schemas for the Prompt's Input (with formatted strings)
const PromptCalculatedMetricsSchema = z.object({
  monthlyIncome: z.string(),
  totalMonthlyExpenses: z.string(),
  monthlySavings: z.string(),
  savingsRate: z.string(),
  debtToIncomeRatio: z.string(),
  investmentRate: z.string(),
});

const PromptIncomeItemSchema = OriginalIncomeItemSchema.extend({
    amount: z.string(),
});
const PromptExpenseItemSchema = OriginalExpenseItemSchema.extend({
    amount: z.string(),
});
const PromptInvestmentItemSchema = OriginalInvestmentItemSchema.extend({
    currentValue: z.string(),
    initialInvestment: z.string().nullable().optional(),
});
const PromptLoanItemSchema = OriginalLoanItemSchema.extend({
    outstandingBalance: z.string(),
    monthlyPayment: z.string(),
    interestRate: z.string().nullable().optional(),
    originalAmount: z.string().nullable().optional(),
});

const PromptInputForGenkitSchema = z.object({
  incomeSources: z.array(PromptIncomeItemSchema).optional(),
  expenses: z.array(PromptExpenseItemSchema).optional(),
  investments: z.array(PromptInvestmentItemSchema).optional(),
  loans: z.array(PromptLoanItemSchema).optional(),
  calculatedMetrics: PromptCalculatedMetricsSchema,
});


export async function generateFinancialAnalysis(
  input: GenerateFinancialAnalysisInput
): Promise<GenerateFinancialAnalysisOutput> {
  return generateFinancialAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialAnalysisPrompt',
  input: {schema: PromptInputForGenkitSchema}, // Use the schema with formatted strings
  output: {schema: GenerateFinancialAnalysisOutputSchema},
  prompt: `You are an expert financial analyst AI. Your task is to provide a personalized and detailed financial analysis based on the user's reported finances and key calculated metrics.
The analysis should be insightful, easy to understand, and provide actionable recommendations. All monetary values should be discussed in Indian Rupees (₹).

Use the following structured data and pre-calculated metrics:

Calculated Metrics:
- Monthly Income: ₹{{calculatedMetrics.monthlyIncome}}
- Total Monthly Expenses: ₹{{calculatedMetrics.totalMonthlyExpenses}}
- Monthly Savings: ₹{{calculatedMetrics.monthlySavings}}
- Savings Rate: {{calculatedMetrics.savingsRate}}%
- Debt-to-Income Ratio: {{calculatedMetrics.debtToIncomeRatio}}%
- Investment Rate (from savings/investments expense category): {{calculatedMetrics.investmentRate}}%

Detailed Financial Data:
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

Investments (Current Snapshot):
{{#each investments}}
- Name: {{name}}, Type: {{type}}, Current Value: ₹{{currentValue}}{{#if initialInvestment}}, Initial: ₹{{initialInvestment}}{{/if}}
{{else}}
No specific investments provided.
{{/each}}

Loans:
{{#each loans}}
- Name: {{name}}, Type: {{type}}, Balance: ₹{{outstandingBalance}}, Monthly Payment: ₹{{monthlyPayment}}{{#if interestRate}}, Rate: {{interestRate}}%{{/if}}
{{else}}
No specific loans provided.
{{/each}}

Based on ALL the information above, provide a comprehensive financial analysis. Structure your response with the following sections in mind, but present it as a cohesive, flowing text:

1.  **Overall Financial Picture:** Briefly summarize their income vs. expenses. For example, "Based on your reported finances, you have a monthly income of ₹X and expenses of ₹Y."
2.  **Savings Analysis:** Comment on their monthly savings amount and savings rate. Is it healthy? What does it indicate?
3.  **Investment Analysis:** Comment on their investment rate (if monthly contributions are identifiable via "Savings/Investments" expense category) or total investment value. Are they investing? Is it aligned with typical recommendations for their income/savings?
4.  **Debt Analysis:** Analyze their debt-to-income ratio. Is it within healthy limits? Comment on their loan payments.
5.  **Spending Habits:** Identify their largest expense categories or any notable spending patterns.
6.  **Recommendations:** Provide 2-3 concrete, actionable recommendations. These could be about increasing savings, optimizing investments, managing debt, or adjusting spending.

Keep the tone supportive and constructive. The goal is to empower the user to improve their financial well-being.
Output the analysis as a single string for the 'analysis' field.
`,
});

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input: GenerateFinancialAnalysisInput): Promise<GenerateFinancialAnalysisOutput> => {
    const hasMeaningfulData =
      input.incomeSources?.length ||
      input.expenses?.length ||
      input.investments?.length ||
      input.loans?.length ||
      input.calculatedMetrics.monthlyIncome > 0;

    if (!hasMeaningfulData) {
      return {
        analysis: "There isn't enough financial data to provide a detailed analysis. Please add more information about your income, expenses, investments, or loans in the 'Finances' section."
      };
    }

    // Transform data for the prompt
    const transformedInput: z.infer<typeof PromptInputForGenkitSchema> = {
      calculatedMetrics: {
        monthlyIncome: input.calculatedMetrics.monthlyIncome.toFixed(2),
        totalMonthlyExpenses: input.calculatedMetrics.totalMonthlyExpenses.toFixed(2),
        monthlySavings: input.calculatedMetrics.monthlySavings.toFixed(2),
        savingsRate: input.calculatedMetrics.savingsRate.toFixed(1),
        debtToIncomeRatio: input.calculatedMetrics.debtToIncomeRatio.toFixed(1),
        investmentRate: input.calculatedMetrics.investmentRate.toFixed(1),
      },
      incomeSources: input.incomeSources?.map(item => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      expenses: input.expenses?.map(item => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      investments: input.investments?.map(item => ({
        ...item,
        currentValue: item.currentValue.toFixed(2),
        initialInvestment: item.initialInvestment != null ? item.initialInvestment.toFixed(2) : null,
        purchaseDate: item.purchaseDate || null, 
      })),
      loans: input.loans?.map(item => ({
        ...item,
        outstandingBalance: item.outstandingBalance.toFixed(2),
        monthlyPayment: item.monthlyPayment.toFixed(2),
        interestRate: item.interestRate != null ? item.interestRate.toFixed(1) : null, 
        originalAmount: item.originalAmount != null ? item.originalAmount.toFixed(2) : null,
        startDate: item.startDate || null, 
      })),
    };

    try {
      const {output} = await prompt(transformedInput);
      if (!output) {
        console.error("[generateFinancialAnalysisFlow] AI prompt did not return a valid output structure.");
        return { analysis: "The AI model returned an unexpected response. Please try again." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateFinancialAnalysisFlow] Error calling AI prompt:", e);
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
        analysis: "An error occurred while generating your financial analysis. If the problem persists, please contact support."
      };
    }
  }
);

