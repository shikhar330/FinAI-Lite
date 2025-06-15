
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-financial-advice.ts';
import '@/ai/flows/generate-financial-overview.ts';
import '@/ai/flows/generate-financial-analysis.ts'; 
import '@/ai/flows/generate-what-if-analysis.ts'; 
import '@/ai/flows/generate-spending-analysis.ts';
import '@/ai/flows/generate-backward-analysis.ts';
import '@/ai/flows/generate-goal-plan.ts';
import '@/ai/flows/suggest-expense-category.ts'; // Added import for new flow
// import '@/ai/flows/suggestFinancialGoals.ts'; // Removed as it's no longer used by GoalSettingClient
