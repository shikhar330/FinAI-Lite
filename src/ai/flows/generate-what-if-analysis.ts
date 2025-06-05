
'use server';
/**
 * @fileOverview AI agent for analyzing "What If" financial scenarios.
 *
 * - generateWhatIfAnalysis - A function that handles the scenario analysis generation.
 * - GenerateWhatIfAnalysisInput - The input type for the function.
 * - GenerateWhatIfAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CurrentFinancialsSchema = z.object({
  totalMonthlyIncome: z.number().describe("User's current total monthly income."),
  totalMonthlyExpenses: z.number().describe("User's current total monthly expenses (including loan payments)."),
  totalInvestmentsValue: z.number().describe("User's current total value of all investments."),
  totalDebt: z.number().describe("User's current total outstanding debt."),
});

// Extended schema for prompt input
const PromptCurrentFinancialsSchema = CurrentFinancialsSchema.extend({
    netMonthlySavings: z.number().describe("User's calculated net monthly savings (income - expenses)."),
});

const CareerChangeParamsSchema = z.object({
  currentMonthlySalary: z.number(),
  newMonthlySalary: z.number(),
  yearsToSimulate: z.number(),
  annualGrowthRate: z.number().describe("Annual percentage growth rate for salary."),
});

const InvestmentStrategyParamsSchema = z.object({
    monthlyInvestmentAmount: z.number().describe("Monthly amount being invested."), 
    currentInvestmentStrategyValue: z.string().describe("Identifier for the current strategy (e.g., fd_5.5)."),
    currentStrategyName: z.string().describe("Display name of the current strategy."),
    currentStrategyReturn: z.number().describe("Annual return rate percentage for current strategy, e.g., 5.5 for 5.5%"),
    newInvestmentStrategyValue: z.string().describe("Identifier for the new strategy (e.g., sip_mf_aggressive_12.5)."),
    newStrategyName: z.string().describe("Display name of the new strategy."),
    newStrategyReturn: z.number().describe("Annual return rate percentage for new strategy, e.g., 12 for 12%"),
    yearsToSimulate: z.number(),
});

const MajorPurchaseParamsSchema = z.object({
    purchaseType: z.string().describe("Type of major purchase (e.g., Property, Vehicle)."),
    totalCost: z.number().describe("Total cost of the purchase."),
    downPayment: z.number().describe("Down payment made for the purchase."),
    interestRate: z.number().describe("Annual loan interest rate (%)."),
    loanTenureYears: z.number().describe("Loan tenure in years."),
    monthlyRent: z.number().optional().describe("Monthly rent currently paid, if applicable (for Property purchase type)."),
    // impactOnMonthlySavings, assetAppreciationRate, yearsToSimulate are removed from here
});


export type YearByYearProjection = {year: number; fdValue: number; newStrategyValue: number};
const YearByYearProjectionSchema = z.object({
    year: z.number(),
    fdValue: z.string().describe("Projected value for Current Strategy at this year end, formatted as currency string."),
    newStrategyValue: z.string().describe("Projected value for the New Investment strategy at this year end, formatted as currency string."),
});


export type CareerSimulationProjections = {
    currentPathAnnualIncome: number[];
    newPathAnnualIncome: number[];
    currentPathCumulativeSavings: number[];
    newPathCumulativeSavings: number[];
};
const CareerSimulationProjectionsSchema = z.custom<CareerSimulationProjections>();


const PromptCareerSimulationProjectionsSchema = z.object({
    currentPathAnnualIncomeString: z.string().describe("Projected annual income for current path, comma-separated string."),
    newPathAnnualIncomeString: z.string().describe("Projected annual income for new scenario path, comma-separated string."),
    currentPathCumulativeSavingsString: z.string().describe("Projected cumulative savings for current path, comma-separated string."),
    newPathCumulativeSavingsString: z.string().describe("Projected cumulative savings for new scenario path, comma-separated string."),
    lastYearNewPathAnnualIncomeString: z.string().describe("Formatted string of the last year's annual income in the new path."),
});


export interface InvestmentStrategyProjections {
  fdFinalAmount: number; 
  newStrategyFinalAmount: number;
  totalInvestmentMade: number;
  yearByYearProjections: Array<{year: number; fdValue: number; newStrategyValue: number}>; 
}
const InvestmentStrategyProjectionsSchema = z.custom<InvestmentStrategyProjections>();


const PromptInvestmentStrategyProjectionsSchema = z.object({
    fdFinalAmount: z.string().describe("Final projected value for the Current Investment strategy, formatted as currency string."),
    newStrategyFinalAmount: z.string().describe("Final projected value for the New Investment strategy, formatted as currency string."),
    totalInvestmentMade: z.string().describe("Total amount invested over the simulation period, formatted as currency string."),
    yearByYearProjections: z.array(YearByYearProjectionSchema).describe("Year-by-year projection table data for Current and New Strategy."),
    differenceFinalAmount: z.string().describe("Difference between new and current strategy final amounts, formatted as currency string."),
});

const MajorPurchaseSimulationProjectionsSchema = z.object({
    finalNetWorthWithPurchase: z.string().describe("Projected net worth (formatted currency) at the end of simulation if purchase is made."),
    finalNetWorthWithoutPurchase: z.string().describe("Projected net worth (formatted currency) if purchase is NOT made and funds are invested instead."),
    monthlyEMI: z.number().describe("Calculated monthly EMI for the purchase loan."), 
    savingsImpact: z.number().describe("This field is deprecated. Stated reduction in monthly savings due to the purchase (EMI + other costs). AI should focus on EMI and rent if applicable."), 
});


const GenerateWhatIfAnalysisInputSchema = z.object({
  currentFinancials: CurrentFinancialsSchema,
  scenarioType: z.enum(["careerChange", "investmentStrategy", "majorPurchase"]),
  scenarioParameters: z.union([
      CareerChangeParamsSchema,
      InvestmentStrategyParamsSchema,
      MajorPurchaseParamsSchema,
    ]),
  simulationProjections: z.union([
    CareerSimulationProjectionsSchema,
    InvestmentStrategyProjectionsSchema, 
    MajorPurchaseSimulationProjectionsSchema, 
  ]).describe("Key numerical projections from the client-side simulation for the chosen scenario."),
});
export type GenerateWhatIfAnalysisInput = z.infer<typeof GenerateWhatIfAnalysisInputSchema>;


const PromptInputSchema = z.object({
    currentFinancials: PromptCurrentFinancialsSchema,
    scenarioType: z.enum(["careerChange", "investmentStrategy", "majorPurchase"]),
    scenarioParameters: z.union([
        CareerChangeParamsSchema,
        InvestmentStrategyParamsSchema,
        MajorPurchaseParamsSchema,
    ]),
    simulationProjections: z.union([
        PromptCareerSimulationProjectionsSchema,
        PromptInvestmentStrategyProjectionsSchema,
        MajorPurchaseSimulationProjectionsSchema, 
    ]),
    isCareerChangeScenario: z.boolean().optional(),
    isInvestmentStrategyScenario: z.boolean().optional(),
    isMajorPurchaseScenario: z.boolean().optional(),
});


const GenerateWhatIfAnalysisOutputSchema = z.object({
  analysis: z.string().describe('Comprehensive textual analysis of the "what-if" scenario, formatted in Markdown.'),
});
export type GenerateWhatIfAnalysisOutput = z.infer<typeof GenerateWhatIfAnalysisOutputSchema>;

const formatCurrencyHelper = (value: number | undefined, includeSymbol = false): string => {
    if (value === undefined || isNaN(value)) return "N/A";
    const style = includeSymbol ? 'currency' : 'decimal';
    const currency = includeSymbol ? 'INR' : undefined; 

    return value.toLocaleString('en-IN', {
        style: style,
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
};


export async function generateWhatIfAnalysis(
  input: GenerateWhatIfAnalysisInput
): Promise<GenerateWhatIfAnalysisOutput> {
  if (input.currentFinancials.totalMonthlyIncome === 0 && input.currentFinancials.totalMonthlyExpenses === 0 && input.scenarioType === "careerChange") {
    return {
      analysis: "Your current financial data (income, expenses) seems to be missing or zero. Please update your financial details in the 'Update Finances' section for a meaningful career change analysis."
    };
  }

  if (input.scenarioType === "investmentStrategy") {
    const params = input.scenarioParameters as z.infer<typeof InvestmentStrategyParamsSchema>;
    if (!params.monthlyInvestmentAmount || params.monthlyInvestmentAmount <= 0) {
      return { analysis: "Monthly investment for strategy comparison must be a positive amount." };
    }
  }
  if (input.scenarioType === "majorPurchase") {
    const params = input.scenarioParameters as z.infer<typeof MajorPurchaseParamsSchema>;
    if (!params.totalCost || params.totalCost <= 0) {
      return { analysis: "Total cost for the major purchase must be a positive amount." };
    }
    if (params.downPayment < 0) {
      return { analysis: "Down payment cannot be negative." };
    }
    if (params.monthlyRent && params.monthlyRent < 0) {
      return { analysis: "Monthly rent cannot be negative." };
    }
  }
  return generateWhatIfAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWhatIfAnalysisPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: GenerateWhatIfAnalysisOutputSchema},
  prompt: `You are FinSage, an expert financial advisor AI. Your task is to analyze a "what-if" scenario for the user and provide a comprehensive, insightful, and actionable report in Markdown format.

Current User Financial Snapshot:
- Total Monthly Income: ₹{{currentFinancials.totalMonthlyIncome}}
- Total Monthly Expenses: ₹{{currentFinancials.totalMonthlyExpenses}}
- Net Monthly Savings: ₹{{currentFinancials.netMonthlySavings}}
- Total Investments Value: ₹{{currentFinancials.totalInvestmentsValue}}
- Total Debt: ₹{{currentFinancials.totalDebt}}

Scenario Being Analyzed: {{#if isCareerChangeScenario}}Career Change{{/if}}{{#if isInvestmentStrategyScenario}}Investment Strategy{{/if}}{{#if isMajorPurchaseScenario}}Major Purchase ({{scenarioParameters.purchaseType}}){{/if}}

{{#if isCareerChangeScenario}}
Scenario Parameters (Career Change):
- Current Monthly Salary: ₹{{scenarioParameters.currentMonthlySalary}}
- New Proposed Monthly Salary: ₹{{scenarioParameters.newMonthlySalary}}
- Years to Simulate: {{scenarioParameters.yearsToSimulate}} years
- Assumed Annual Salary Growth Rate: {{scenarioParameters.annualGrowthRate}}%

Key Simulation Projections (over {{scenarioParameters.yearsToSimulate}} years):
- Projected annual income for the current path (Year 1 to {{scenarioParameters.yearsToSimulate}}): {{{simulationProjections.currentPathAnnualIncomeString}}}
- Projected annual income for the new scenario path (Year 1 to {{scenarioParameters.yearsToSimulate}}): {{{simulationProjections.newPathAnnualIncomeString}}}
- Projected cumulative savings for the current path (End of Year 1 to {{scenarioParameters.yearsToSimulate}}): {{{simulationProjections.currentPathCumulativeSavingsString}}}
- Projected cumulative savings for the new scenario path (End of Year 1 to {{scenarioParameters.yearsToSimulate}}): {{{simulationProjections.newPathCumulativeSavingsString}}}
{{/if}}

{{#if isInvestmentStrategyScenario}}
Scenario Parameters (Investment Strategy):
- Monthly Investment: ₹{{scenarioParameters.monthlyInvestmentAmount}}
- Current Strategy: {{scenarioParameters.currentStrategyName}} ({{scenarioParameters.currentStrategyReturn}}% p.a.)
- New Strategy: {{scenarioParameters.newStrategyName}} ({{scenarioParameters.newStrategyReturn}}% p.a.)
- Years to Simulate: {{scenarioParameters.yearsToSimulate}} years

Key Simulation Projections:
- Total Amount Invested: ₹{{simulationProjections.totalInvestmentMade}}
- {{scenarioParameters.currentStrategyName}} Final Amount: ₹{{simulationProjections.fdFinalAmount}}
- {{scenarioParameters.newStrategyName}} Final Amount: ₹{{simulationProjections.newStrategyFinalAmount}}
- Difference in Final Amount (New - Current): {{{simulationProjections.differenceFinalAmount}}}

Numerical Projections (Year-End Values):
| Year | {{scenarioParameters.currentStrategyName}} (₹) | {{scenarioParameters.newStrategyName}} (₹) |
|------|--------------------------|---------------------------|
{{#each simulationProjections.yearByYearProjections}}
| {{year}} | {{fdValue}}         | {{newStrategyValue}}          |
{{/each}}
{{/if}}

{{#if isMajorPurchaseScenario}}
Scenario Parameters (Major Purchase - {{scenarioParameters.purchaseType}}):
- Total Cost: ₹{{scenarioParameters.totalCost}}
- Down Payment: ₹{{scenarioParameters.downPayment}}
- Loan Interest Rate: {{scenarioParameters.interestRate}}% p.a.
- Loan Tenure: {{scenarioParameters.loanTenureYears}} years
{{#if scenarioParameters.monthlyRent}}
- Current Monthly Rent (if Property): ₹{{scenarioParameters.monthlyRent}} (This is what you'd save/reallocate if you buy)
{{/if}}
- Simulation Duration: {{scenarioParameters.loanTenureYears}} years (tied to loan tenure)

Key Simulation Projections (at end of {{scenarioParameters.loanTenureYears}} years):
- Projected Net Worth (With Purchase): {{simulationProjections.finalNetWorthWithPurchase}}
- Projected Net Worth (Without Purchase - Investing Instead): {{simulationProjections.finalNetWorthWithoutPurchase}}
- Calculated Monthly EMI (for reference): ₹{{simulationProjections.monthlyEMI}}
{{/if}}

---

Please provide your analysis structured as follows (use Markdown headings):

## AI Analysis of Your "{{#if isCareerChangeScenario}}Career Change{{/if}}{{#if isInvestmentStrategyScenario}}Investment Strategy{{/if}}{{#if isMajorPurchaseScenario}}Major Purchase ({{scenarioParameters.purchaseType}}){{/if}}" Scenario

### 1. Current Financial Situation Overview
Briefly summarize the user's current financial health based on the snapshot provided. Mention net savings, and any significant investment or debt positions.

### 2. Understanding the "{{#if isCareerChangeScenario}}Career Change{{/if}}{{#if isInvestmentStrategyScenario}}Investment Strategy{{/if}}{{#if isMajorPurchaseScenario}}Major Purchase ({{scenarioParameters.purchaseType}}){{/if}}" Simulation
Explain the core change being simulated.
{{#if isCareerChangeScenario}}
For the career change, highlight the difference in starting salary (from ₹{{scenarioParameters.currentMonthlySalary}} to ₹{{scenarioParameters.newMonthlySalary}} per month) and the implications of the {{scenarioParameters.annualGrowthRate}}% annual growth rate over {{scenarioParameters.yearsToSimulate}} years.
{{/if}}
{{#if isInvestmentStrategyScenario}}
For the investment strategy, explain the shift from "{{scenarioParameters.currentStrategyName}}" ({{scenarioParameters.currentStrategyReturn}}% p.a.) to "{{scenarioParameters.newStrategyName}}" ({{scenarioParameters.newStrategyReturn}}% p.a.) with a monthly investment of ₹{{scenarioParameters.monthlyInvestmentAmount}} for {{scenarioParameters.yearsToSimulate}} years. Note the difference in expected returns.
{{/if}}
{{#if isMajorPurchaseScenario}}
For the major purchase of a {{scenarioParameters.purchaseType}} (costing ₹{{scenarioParameters.totalCost}} with a ₹{{scenarioParameters.downPayment}} down payment), detail the loan terms (interest rate {{scenarioParameters.interestRate}}% for {{scenarioParameters.loanTenureYears}} years, resulting in an EMI of ₹{{simulationProjections.monthlyEMI}}).
{{#if scenarioParameters.monthlyRent}}
If it's a Property purchase, mention the current monthly rent of ₹{{scenarioParameters.monthlyRent}} that would be saved/reallocated.
{{/if}}
The simulation compares buying against continuing to invest current savings (plus rent, if applicable) over {{scenarioParameters.loanTenureYears}} years.
{{/if}}

### 3. Projected Financial Impact
Based on the simulation projections:
{{#if isCareerChangeScenario}}
- Discuss the trend of annual income for both paths, referencing the projected income strings ({{{simulationProjections.currentPathAnnualIncomeString}}} vs {{{simulationProjections.newPathAnnualIncomeString}}}). Highlight the difference in annual income by the end of year {{scenarioParameters.yearsToSimulate}}.
- Discuss the trend of cumulative savings for both paths, referencing the projected savings strings ({{{simulationProjections.currentPathCumulativeSavingsString}}} vs {{{simulationProjections.newPathCumulativeSavingsString}}}). Highlight the difference in total cumulative savings by the end of year {{scenarioParameters.yearsToSimulate}}.
- Based on these projections, analyze the impact on overall net worth accumulation (qualitatively, but informed by the savings data).
{{/if}}
{{#if isInvestmentStrategyScenario}}
- Discuss the final projected amounts for both strategies (₹{{simulationProjections.fdFinalAmount}} for {{scenarioParameters.currentStrategyName}} vs. ₹{{simulationProjections.newStrategyFinalAmount}} for {{scenarioParameters.newStrategyName}}).
- Highlight the total investment made (₹{{simulationProjections.totalInvestmentMade}}) versus the returns for each strategy.
- Discuss the impact on overall wealth accumulation due to the change in strategy and compounding, referencing the year-by-year table and the final difference of {{{simulationProjections.differenceFinalAmount}}}.
- Comment on how this scenario might affect their overall investment portfolio growth.
{{/if}}
{{#if isMajorPurchaseScenario}}
- Compare the projected final net worth: {{simulationProjections.finalNetWorthWithPurchase}} (with purchase) vs. {{simulationProjections.finalNetWorthWithoutPurchase}} (without purchase, continuing to invest/save rent). Discuss the magnitude and implications of this difference.
- Discuss the impact on monthly cash flow (due to EMI of ₹{{simulationProjections.monthlyEMI}}). If it's a Property purchase and monthly rent (₹{{scenarioParameters.monthlyRent}}) was specified, compare the EMI to the rent.
- Analyze how the debt from the purchase affects their financial leverage and risk profile.
- (Asset appreciation was removed from inputs, so focus on net worth comparison from buy vs. invest/save rent perspective).
{{/if}}

### 4. Pros and Cons of This Scenario
{{#if isCareerChangeScenario}}
**Pros of this Career Change:**
- Analyze the simulationProjections (annual income and cumulative savings strings) for both paths. Identify and list specific financial advantages. For example, quantify the potential increase in savings rate or wealth accumulation. Mention how the newMonthlySalary compared to currentMonthlySalary and the annualGrowthRate contribute to these pros, referencing the specific numbers from the scenarioParameters.
**Cons of this Career Change:**
- Beyond general career change risks (like job security, learning curve), consider any financial downsides or trade-offs indicated by the parameters or the difference in projections. For instance, if the initial years show slower savings growth due to other factors not modeled (like retraining costs, which you can mention as a general consideration), or if the new salary doesn't significantly outpace the old one when considering the annualGrowthRate over the full yearsToSimulate. Also consider potential non-financial aspects like stress or work-life balance, but try to relate them back to financial decision-making or long-term well-being.
{{/if}}
{{#if isInvestmentStrategyScenario}}
**Pros of shifting to {{scenarioParameters.newStrategyName}}:**
- Based on the projected final amount (₹{{simulationProjections.newStrategyFinalAmount}}) versus the current (₹{{simulationProjections.fdFinalAmount}}), highlight the higher potential returns leading to greater wealth creation over {{scenarioParameters.yearsToSimulate}} years.
- Emphasize the benefits of compounding, especially with a {{scenarioParameters.newStrategyReturn}}% p.a. return compared to {{scenarioParameters.currentStrategyReturn}}% p.a.
**Cons of shifting to {{scenarioParameters.newStrategyName}}:**
- Discuss potential increased market risk if {{scenarioParameters.newStrategyName}} is more volatile (e.g., equity-linked) than {{scenarioParameters.currentStrategyName}}. Refer to the strategy types.
- Mention liquidity considerations: funds in the new strategy might be less accessible than in the current one.
- Advise on potential tax implications on returns/gains from {{scenarioParameters.newStrategyName}} compared to {{scenarioParameters.currentStrategyName}}.
{{/if}}
{{#if isMajorPurchaseScenario}}
**Pros of making this {{scenarioParameters.purchaseType}} purchase:**
- Asset ownership (e.g., home equity for Property).
- Lifestyle benefits or utility derived from the {{scenarioParameters.purchaseType}}.
- Potential for building equity over the long term (especially for Property).
- If Property, potential for rent savings if EMI is comparable to or less than current rent (₹{{scenarioParameters.monthlyRent}}).
**Cons of making this {{scenarioParameters.purchaseType}} purchase:**
- Increased debt burden (EMI of ₹{{simulationProjections.monthlyEMI}} for {{scenarioParameters.loanTenureYears}} years).
- Reduced cash flow flexibility due to fixed EMI payments.
- Opportunity cost of the ₹{{scenarioParameters.downPayment}} down payment (could have been invested).
- Liquidity reduction and potential ongoing costs (maintenance, insurance, property taxes - not explicitly modeled but worth mentioning).
- For Property, if EMI is significantly higher than current rent (₹{{scenarioParameters.monthlyRent}}), it strains monthly finances.
{{/if}}

### 5. Alternative Approaches & Considerations
{{#if isCareerChangeScenario}}
- Suggest alternatives based on the parameters. E.g., "If the new salary {{scenarioParameters.newMonthlySalary}} is only marginally higher than {{scenarioParameters.currentMonthlySalary}}, could negotiating for a higher {{scenarioParameters.annualGrowthRate}} in the current role be an option?" or "Consider upskilling to aim for a higher starting salary in the new field."
- Mention non-financial factors like job satisfaction, work-life balance, learning opportunities.
{{/if}}
{{#if isInvestmentStrategyScenario}}
- Suggest other strategies not chosen, or a mix. "Could a portion remain in {{scenarioParameters.currentStrategyName}} while another portion moves to {{scenarioParameters.newStrategyName}}?"
- Discuss reviewing strategy periodically.
{{/if}}
{{#if isMajorPurchaseScenario}}
- Suggest delaying the purchase, saving a larger down payment to reduce EMI.
- Consider a less expensive {{scenarioParameters.purchaseType}} alternative.
- {{#if scenarioParameters.monthlyRent}}For Property, evaluate if renting and investing the difference (between rent and potential EMI/ownership costs) might lead to better net worth based on the simulation.{{/if}}
- Mention the importance of an emergency fund before taking on new debt.
{{/if}}

### 6. Critical Advice from FinSage
{{#if isCareerChangeScenario}}
- Provide actionable advice based on the simulation. For instance, if the new salary path shows significantly higher income, advise on managing that increase (e.g., "With a projected annual income of {{{simulationProjections.lastYearNewPathAnnualIncomeString}}} in year {{scenarioParameters.yearsToSimulate}}, consider allocating X% of the increase towards...").
- If the risk is high, advise on building a buffer.
{{/if}}
{{#if isInvestmentStrategyScenario}}
- Emphasize understanding the risk profile of {{scenarioParameters.newStrategyName}}.
- Suggest diversification if the new strategy is concentrated.
- "Ensure this strategy aligns with your overall financial goals and time horizon."
{{/if}}
{{#if isMajorPurchaseScenario}}
- Stress the importance of affordability based on current income (₹{{currentFinancials.totalMonthlyIncome}}) vs. new EMI.
- {{#if scenarioParameters.monthlyRent}}For Property, explicitly compare the EMI (₹{{simulationProjections.monthlyEMI}}) with the stated monthly rent (₹{{scenarioParameters.monthlyRent}}) and discuss if buying makes financial sense from a cash flow perspective.{{/if}}
- Advise on having adequate insurance for the new asset.
- "Re-evaluate your budget thoroughly to accommodate the new financial commitments. Ensure you have a sufficient emergency fund after the down payment."
{{/if}}

Output the analysis as a single string for the 'analysis' field in Markdown.
`,
});

const generateWhatIfAnalysisFlow = ai.defineFlow(
  {
    name: 'generateWhatIfAnalysisFlow',
    inputSchema: GenerateWhatIfAnalysisInputSchema,
    outputSchema: GenerateWhatIfAnalysisOutputSchema,
  },
  async (input: GenerateWhatIfAnalysisInput): Promise<GenerateWhatIfAnalysisOutput> => {
    const netMonthlySavings = input.currentFinancials.totalMonthlyIncome - input.currentFinancials.totalMonthlyExpenses;

    let processedSimulationProjections: any = input.simulationProjections;

    if (input.scenarioType === "investmentStrategy") {
        const clientProjections = input.simulationProjections as InvestmentStrategyProjections;
        const numFdFinal = clientProjections.fdFinalAmount;
        const numNewStrategyFinal = clientProjections.newStrategyFinalAmount;

        let differenceString = "N/A";
        if (typeof numFdFinal === 'number' && typeof numNewStrategyFinal === 'number' && !isNaN(numFdFinal) && !isNaN(numNewStrategyFinal)) {
            differenceString = formatCurrencyHelper(numNewStrategyFinal - numFdFinal, true);
        }

        processedSimulationProjections = {
            fdFinalAmount: formatCurrencyHelper(clientProjections.fdFinalAmount, true),
            newStrategyFinalAmount: formatCurrencyHelper(clientProjections.newStrategyFinalAmount, true),
            totalInvestmentMade: formatCurrencyHelper(clientProjections.totalInvestmentMade, true),
            yearByYearProjections: clientProjections.yearByYearProjections.map(p => ({
                year: p.year,
                fdValue: formatCurrencyHelper(p.fdValue, false),
                newStrategyValue: formatCurrencyHelper(p.newStrategyValue, false)
            })),
            differenceFinalAmount: differenceString,
        } as z.infer<typeof PromptInvestmentStrategyProjectionsSchema>;

    } else if (input.scenarioType === "careerChange") {
      const clientProjections = input.simulationProjections as CareerSimulationProjections;
      const formatArray = (arr?: number[]) => (arr || []).map(v => `₹${formatCurrencyHelper(v)}`).join(', ');
      
      const lastNewIncome = clientProjections.newPathAnnualIncome && clientProjections.newPathAnnualIncome.length > 0
        ? `₹${formatCurrencyHelper(clientProjections.newPathAnnualIncome[clientProjections.newPathAnnualIncome.length - 1])}`
        : "N/A";

      processedSimulationProjections = {
        currentPathAnnualIncomeString: formatArray(clientProjections.currentPathAnnualIncome),
        newPathAnnualIncomeString: formatArray(clientProjections.newPathAnnualIncome),
        currentPathCumulativeSavingsString: formatArray(clientProjections.currentPathCumulativeSavings),
        newPathCumulativeSavingsString: formatArray(clientProjections.newPathCumulativeSavings),
        lastYearNewPathAnnualIncomeString: lastNewIncome,
      } as z.infer<typeof PromptCareerSimulationProjectionsSchema>;
    } else if (input.scenarioType === "majorPurchase") {
        const clientProjections = input.simulationProjections as z.infer<typeof MajorPurchaseSimulationProjectionsSchema>;
         processedSimulationProjections = { 
            ...clientProjections,
        };
    }


    const promptData: z.infer<typeof PromptInputSchema> = {
      currentFinancials: {
        ...input.currentFinancials,
        netMonthlySavings: netMonthlySavings,
      },
      scenarioType: input.scenarioType,
      scenarioParameters: input.scenarioParameters,
      simulationProjections: processedSimulationProjections,
      isCareerChangeScenario: input.scenarioType === "careerChange",
      isInvestmentStrategyScenario: input.scenarioType === "investmentStrategy",
      isMajorPurchaseScenario: input.scenarioType === "majorPurchase",
    };

    try {
      const {output} = await prompt(promptData);
      if (!output) {
        console.error("[generateWhatIfAnalysisFlow] AI prompt did not return a valid output structure.");
        return { analysis: "The AI model returned an unexpected response. Please try again." };
      }
      return output;
    } catch (e: any) {
      console.error("[generateWhatIfAnalysisFlow] Error calling AI prompt:", e);
      if (e.message && (e.message.includes("503") || e.message.toLowerCase().includes("overloaded") || e.message.toLowerCase().includes("service unavailable"))) {
        return {
          analysis: "The AI service is temporarily overloaded or unavailable for What-If analysis. Please try again in a few moments. (Error 503)"
        };
      }
      if (e.message && e.message.toLowerCase().includes("api key not valid")) {
         return {
           analysis: "The AI service could not be reached for What-If analysis due to an API key issue. Please check the server configuration."
         };
      }
      return {
        analysis: "An error occurred while generating your What-If scenario analysis. If the problem persists, please contact support."
      };
    }
  }
);

