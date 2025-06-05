
'use server';
/**
 * @fileOverview An AI agent that generates a detailed plan to achieve a specific financial goal.
 *
 * - generateGoalPlan - A function that handles the goal planning process.
 * - GenerateGoalPlanInput - The input type for the generateGoalPlan function.
 * - GenerateGoalPlanOutput - The return type for the generateGoalPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { FinancialGoal } from '@/types/finance';
import { GOAL_TYPES, GOAL_PRIORITIES } from '@/types/finance';

// Using FinancialGoal fields directly for input, Zod will infer from usage.
const GenerateGoalPlanInputSchema = z.object({
  goalName: z.string().describe('The name of the financial goal.'),
  goalType: z.enum(GOAL_TYPES).describe('The type of financial goal (e.g., Retirement, House).'),
  targetAmount: z.number().describe('The target monetary amount for the goal.'),
  currentAmount: z.number().describe('The current amount saved towards the goal.'),
  targetDate: z.string().optional().describe('The target date to achieve the goal (ISO date string).'),
  priority: z.enum(GOAL_PRIORITIES).describe('The priority of the goal (low, medium, high).'),
  // Future: Consider adding user's current income, expenses, total debt, risk tolerance if available for even more tailored advice.
});
export type GenerateGoalPlanInput = z.infer<typeof GenerateGoalPlanInputSchema>;

const GenerateGoalPlanOutputSchema = z.object({
  plan: z.string().describe('A comprehensive textual plan in Markdown format outlining suggested steps, savings strategies, investment approaches, and considerations for debt/expense management to achieve the goal.'),
});
export type GenerateGoalPlanOutput = z.infer<typeof GenerateGoalPlanOutputSchema>;

export async function generateGoalPlan(
  input: GenerateGoalPlanInput
): Promise<GenerateGoalPlanOutput> {
  return generateGoalPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGoalPlanPrompt',
  input: { schema: GenerateGoalPlanInputSchema },
  output: { schema: GenerateGoalPlanOutputSchema },
  prompt: `You are FinSage, a sophisticated AI financial planning assistant. The user wants a detailed and actionable strategy for their financial goal:

Goal Details:
- Name: {{{goalName}}}
- Type: {{goalType}}
- Target Amount: ₹{{targetAmount}}
- Current Amount: ₹{{currentAmount}}
{{#if targetDate}}- Target Date: {{targetDate}}{{/if}}
- Priority: {{priority}}

Based on this specific goal, provide a comprehensive, actionable, and encouraging plan in Markdown format to help them achieve "{{goalName}}".
Structure your plan with the following sections:

### 1. Goal Overview & Encouragement
   - Briefly re-state the goal and offer some motivational words.
   - Calculate the remaining amount needed: ₹{{targetAmount}} - ₹{{currentAmount}} = ₹(Target - Current).

### 2. Savings Strategy for "{{goalName}}"
   - **Contribution Guidance**: Based on the remaining amount and time horizon (if available), provide general advice on the importance of consistent contributions. If a target date is available, qualitatively suggest if contributions need to be aggressive or moderate. (Exact monthly calculation is not required yet without full financial context).
   - **Automating Savings**: Suggest automating transfers to a dedicated account for this goal.

### 3. Investment Approach for "{{goalName}}"
   - **Dedicated Investment Vehicle**: Strongly recommend setting up a dedicated investment plan for this goal, such as a Systematic Investment Plan (SIP) in mutual funds, or a specific portfolio.
   - **Portfolio Customization (Risk & Timeline)**:
      *   If a target date is available:
          *   For **Short-Term Goals** (e.g., less than 3 years, if applicable): Advise a more conservative approach (e.g., debt funds, fixed deposits, liquid funds) to protect capital.
          *   For **Medium-Term Goals** (e.g., 3-7 years, if applicable): Suggest a balanced portfolio (mix of equity and debt).
          *   For **Long-Term Goals** (e.g., more than 7-10 years, like 'Retirement' or 'Child's Education' if applicable): Suggest a potentially more equity-heavy or growth-oriented approach, emphasizing alignment with their overall risk comfort.
      *   If no target date, provide general advice on matching investment strategy to the goal's typical timeline (e.g., 'Retirement' is long-term, 'Vacation' might be short to medium).
   - **Diversification**: Briefly mention the importance of diversification within the chosen investment strategy.

### 4. Managing Finances to Support "{{goalName}}"
   - **Expense Review**: Suggest reviewing current expenses to identify areas where funds could be redirected towards this goal. Mention common discretionary categories like entertainment or dining out as examples.
   - **Debt Management**: Advise that managing existing high-interest debt can free up more cash flow for savings and investments towards this goal. (General advice, not specific to user's debt as it's not provided in input).

### 5. Plan Monitoring & Adjustment
   - **Regular Review**: Recommend reviewing progress towards this goal periodically (e.g., quarterly or annually).
   - **Flexibility**: Briefly mention that financial plans may need adjustments over time due to changing personal circumstances or market conditions, and they should be prepared to adapt.

Keep the tone positive, practical, and empowering.
Plan:
`,
});

const generateGoalPlanFlow = ai.defineFlow(
  {
    name: 'generateGoalPlanFlow',
    inputSchema: GenerateGoalPlanInputSchema,
    outputSchema: GenerateGoalPlanOutputSchema,
  },
  async (input: GenerateGoalPlanInput): Promise<GenerateGoalPlanOutput> => {
    if (input.targetAmount <= 0) {
      return { plan: "### Goal Plan Error\nThe target amount for your goal must be positive. Please update your goal." };
    }
    if (input.currentAmount < 0) {
      return { plan: "### Goal Plan Error\nThe current amount saved cannot be negative. Please update your goal." };
    }
     if (input.currentAmount >= input.targetAmount) {
      return { plan: `### Congratulations!\nIt looks like you've already achieved your goal of "{{goalName}}" as your current amount of ₹${input.currentAmount} meets or exceeds the target of ₹${input.targetAmount}.\n\nConsider setting a new goal or enjoying your achievement!` };
    }

    try {
      const { output } = await prompt(input);
      if (!output) {
          console.error("[generateGoalPlanFlow] AI prompt did not return an output.");
          return { plan: "### System Error\nI'm having a little trouble generating a plan right now. Please try again in a moment." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateGoalPlanFlow] Error calling AI prompt:", e);
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        return {
          plan: "### AI Service Unavailable\nThe AI service is temporarily overloaded. Please try again in a few moments to generate your goal plan. (Error 503)"
        };
      }
      if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         return {
           plan: "### Configuration Error\nThe AI service could not be reached due to an API key issue. Please check the server configuration."
         };
      }
      return {
        plan: "### Error Generating Plan\nAn unexpected error occurred while generating the plan for your goal. Please try again later."
      };
    }
  }
);
