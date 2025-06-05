
'use server';
/**
 * @fileOverview An AI agent that analyzes a user's past financial decision.
 *
 * - generateBackwardAnalysis - A function that handles the backward analysis.
 * - GenerateBackwardAnalysisInput - The input type for the function.
 * - GenerateBackwardAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  IncomeItemSchema,
  ExpenseItemSchema,
  InvestmentItemSchema,
  LoanItemSchema,
} from '@/types/finance'; // Import shared schemas for context

const CurrentFinancialContextSchema = z.object({
  incomeSources: z.array(IncomeItemSchema).optional().describe("User's current income sources."),
  expenses: z.array(ExpenseItemSchema).optional().describe("User's current expenses."),
  investments: z.array(InvestmentItemSchema).optional().describe("User's current investments."),
  loans: z.array(LoanItemSchema).optional().describe("User's current loans."),
}).optional();

const GenerateBackwardAnalysisInputSchema = z.object({
  decisionType: z.string().describe("Type of the past financial decision (e.g., Investment, Major Purchase, Loan Taken, Savings Strategy Change, Large Expense, Other)."),
  description: z.string().describe("A brief description of the specific decision made."),
  amountInvolved: z.number().describe("The monetary amount involved in the decision."),
  decisionDate: z.string().describe("The date when the decision was made (YYYY-MM-DD format)."),
  actualOutcome: z.string().describe("What actually happened as a result of this decision."),
  currentFinancialContext: CurrentFinancialContextSchema.describe("User's current financial snapshot, if available, for context on present situation."),
});
export type GenerateBackwardAnalysisInput = z.infer<typeof GenerateBackwardAnalysisInputSchema>;

const GenerateBackwardAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis of the past decision, including potential alternatives, comparison with outcome, lessons learned, future recommendations, and connection to present if applicable. Formatted in Markdown.'),
});
export type GenerateBackwardAnalysisOutput = z.infer<typeof GenerateBackwardAnalysisOutputSchema>;

export async function generateBackwardAnalysis(
  input: GenerateBackwardAnalysisInput
): Promise<GenerateBackwardAnalysisOutput> {
  return generateBackwardAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBackwardAnalysisPrompt',
  input: {schema: GenerateBackwardAnalysisInputSchema},
  output: {schema: GenerateBackwardAnalysisOutputSchema},
  prompt: `You are FinSight, an AI financial analyst specializing in retrospectively analyzing past financial decisions to extract valuable lessons.
The user has provided details about a past financial decision:

Decision Details:
- Type of Decision: {{decisionType}}
- Description: {{{description}}}
- Amount Involved: $\{{amountInvolved}}
- Date of Decision: {{decisionDate}}
- Actual Outcome: {{{actualOutcome}}}

{{#if currentFinancialContext}}
Current Financial Context (for reference, decision was in the past):
Income Sources:
{{#each currentFinancialContext.incomeSources}} - Name: {{name}}, Amount: $\{{amount}}, Frequency: {{frequency}} {{else}} No current income data. {{/each}}
Expenses:
{{#each currentFinancialContext.expenses}} - Name: {{name}}, Amount: $\{{amount}}, Category: {{category}} {{else}} No current expense data. {{/each}}
Investments:
{{#each currentFinancialContext.investments}} - Name: {{name}}, Value: $\{{currentValue}} {{else}} No current investment data. {{/each}}
Loans:
{{#each currentFinancialContext.loans}} - Name: {{name}}, Balance: $\{{outstandingBalance}} {{else}} No current loan data. {{/each}}
{{/if}}

Based on the PAST DECISION provided (NOT the current context, which is only for overall understanding of user's current state unless explicitly asked to connect below), please provide a comprehensive analysis in Markdown format. Structure your response as follows:

### 1. Understanding the Decision
   - Briefly re-state the decision and its context (amount, date, type).
   - What were the likely goals or motivations behind this decision at that time?

### 2. Potential Alternative Scenarios
   - Considering the '{{decisionType}}' made on '{{decisionDate}}' for an amount of $\{{amountInvolved}}, what were some common alternative actions or choices the user might have considered at that time?
   - For example, if it was an investment, what other typical investment avenues might have been available? If it was a major purchase, what were other options (e.g., delaying, different model, renting)?

### 3. Outcome vs. Alternatives (Qualitative Comparison)
   - Briefly compare the '{{{actualOutcome}}}' with the potential outcomes of 1-2 key alternatives you identified.
   - Was the actual outcome better, worse, or comparable to what might have been expected from those alternatives? (Be general, no need for precise historical data unless commonly known for that asset class at that time).

### 4. Key Lessons Learned
   - Based on the decision and its outcome, what are 2-3 key financial lessons that can be drawn?
   - These could relate to risk assessment, research, timing, emotional decision-making, diversification, etc.

### 5. Recommendations for Future Decisions
   - What 2-3 actionable recommendations can you offer the user for similar future financial decisions?
   - Focus on process, consideration points, or strategies.

{{#if currentFinancialContext}}
### 6. Connecting to Your Present (If Applicable)
   - Considering the lessons from this past decision ({{decisionType}}), are there any specific ways these insights might apply to your current financial picture (e.g., related to your current income sources, expense habits, investment approaches, or debt management)? Briefly explain if so. This section is optional; only include it if clear connections can be made.
{{/if}}

Keep the tone constructive and educational. The goal is to help the user learn from their past to make better future decisions.
Analysis:
`,
});

const generateBackwardAnalysisFlow = ai.defineFlow(
  {
    name: 'generateBackwardAnalysisFlow',
    inputSchema: GenerateBackwardAnalysisInputSchema,
    outputSchema: GenerateBackwardAnalysisOutputSchema,
  },
  async (input: GenerateBackwardAnalysisInput): Promise<GenerateBackwardAnalysisOutput> => {
    if (!input.decisionType || !input.description || input.amountInvolved <=0 || !input.decisionDate || !input.actualOutcome) {
        return {
            analysis: "Insufficient information provided to analyze the past decision. Please ensure all fields (Decision Type, Description, Amount, Date, and Actual Outcome) are filled correctly."
        }
    }
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.error("[generateBackwardAnalysisFlow] AI prompt did not return a valid output structure.");
        return { analysis: "The AI model returned an unexpected response. Please try again." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateBackwardAnalysisFlow] Error calling AI prompt:", e);
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        return {
          analysis: "The AI service is temporarily overloaded or unavailable for backward analysis. Please try again in a few moments. (Error 503)"
        };
      }
      if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         return {
           analysis: "The AI service could not be reached for backward analysis due to an API key issue. Please check the server configuration."
         };
      }
      return {
        analysis: "An error occurred while generating your backward analysis. If the problem persists, please contact support."
      };
    }
  }
);

