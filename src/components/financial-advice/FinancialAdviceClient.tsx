
'use client';

import { useState, useEffect, useCallback }
from 'react';
import { generateFinancialAdvice, type GenerateFinancialAdviceInput, type GenerateFinancialAdviceOutput } from '@/ai/flows/generate-financial-advice';
import { generateSpendingAnalysis, type GenerateSpendingAnalysisInput, type GenerateSpendingAnalysisOutput } from '@/ai/flows/generate-spending-analysis';
// Removed: import { generateBackwardAnalysis, type GenerateBackwardAnalysisInput, type GenerateBackwardAnalysisOutput } from '@/ai/flows/generate-backward-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb, Info, BarChartHorizontal } from 'lucide-react'; // Removed History, CheckCircle, CalendarIcon
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Removed: import { Input } from '@/components/ui/input'; 
// Removed: import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; 
// Removed: import { Calendar } from '@/components/ui/calendar'; 
// Removed: import { format } from 'date-fns'; 
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import { cn } from '@/lib/utils';


const timePeriodOptions = [
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "year_to_date", label: "Year to Date" },
  { value: "last_year", label: "Last Year" },
];

// Removed: pastDecisionTypeOptions

export function FinancialAdviceClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [questionText, setQuestionText] = useState('');
  const [questionAdvice, setQuestionAdvice] = useState<GenerateFinancialAdviceOutput | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [personalAdvice, setPersonalAdvice] = useState<GenerateFinancialAdviceOutput | null>(null);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [fetchedIncome, setFetchedIncome] = useState<IncomeItem[]>([]);
  const [fetchedExpenses, setFetchedExpenses] = useState<ExpenseItem[]>([]);
  const [fetchedInvestments, setFetchedInvestments] = useState<InvestmentItem[]>([]);
  const [fetchedLoans, setFetchedLoans] = useState<LoanItem[]>([]);

  // State for Spending Analysis Tab
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>(timePeriodOptions[0].value);
  const [spendingAnalysisResult, setSpendingAnalysisResult] = useState<GenerateSpendingAnalysisOutput | null>(null);
  const [isLoadingSpendingAnalysis, setIsLoadingSpendingAnalysis] = useState(false);
  const [spendingAnalysisError, setSpendingAnalysisError] = useState<string | null>(null);

  // Removed State for Backward Analysis Tab
  // const [pastDecisionType, setPastDecisionType] = useState<string>('');
  // const [pastDecisionDescription, setPastDecisionDescription] = useState('');
  // const [pastDecisionAmount, setPastDecisionAmount] = useState('');
  // const [pastDecisionDate, setPastDecisionDate] = useState<Date | undefined>();
  // const [pastDecisionOutcome, setPastDecisionOutcome] = useState('');
  // const [backwardAnalysisResult, setBackwardAnalysisResult] = useState<GenerateBackwardAnalysisOutput | null>(null);
  // const [isLoadingBackwardAnalysis, setIsLoadingBackwardAnalysis] = useState(false);
  // const [backwardAnalysisError, setBackwardAnalysisError] = useState<string | null>(null);


  const fetchFinancialData = useCallback(async () => {
    if (!user) {
      setIsFetchingData(false);
      return;
    }
    setIsFetchingData(true);
    try {
      const [income, expenses, investments, loans] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);
      setFetchedIncome(income);
      setFetchedExpenses(expenses);
      setFetchedInvestments(investments);
      setFetchedLoans(loans);
    } catch (e) {
      console.error("Failed to fetch financial data for AI advice:", e);
      toast({
        title: "Error Fetching Financial Data",
        description: "Could not load your financial details. AI advice may be less personalized.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, fetchFinancialData]);

  const handleGetAnswer = async () => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to ask a question.", variant: "destructive" });
      return;
    }
    if (!questionText.trim()) {
      toast({ title: "Empty Question", description: "Please type your financial question.", variant: "default" });
      return;
    }

    setIsLoadingQuestion(true);
    setQuestionError(null);
    setQuestionAdvice(null);

    const inputForAI: GenerateFinancialAdviceInput = {
      financialSituation: questionText,
      financialGoals: "Address the specific question asked above.", 
      riskTolerance: "medium", 
      incomeSources: fetchedIncome.length > 0 ? fetchedIncome : undefined,
      expenses: fetchedExpenses.length > 0 ? fetchedExpenses : undefined,
      investments: fetchedInvestments.length > 0 ? fetchedInvestments : undefined,
      loans: fetchedLoans.length > 0 ? fetchedLoans : undefined,
    };

    try {
      const result = await generateFinancialAdvice(inputForAI);
      setQuestionAdvice(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setQuestionError(errorMsg);
      toast({ title: "Error Getting Answer", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const fetchPersonalAdvice = useCallback(async () => {
    if (!user) {
      setPersonalAdvice({advice: "Please log in to receive personalized financial advice."});
      return;
    }
    if (isFetchingData) { 
        return;
    }

    setIsLoadingPersonal(true);
    setPersonalError(null);
    
    const inputForAI: GenerateFinancialAdviceInput = {
      financialSituation: "Provide a comprehensive financial health analysis and actionable advice based on my current financial data.",
      financialGoals: "My general goals are financial improvement, wealth growth, and effective risk management based on the provided data.",
      riskTolerance: "medium", 
      incomeSources: fetchedIncome.length > 0 ? fetchedIncome : undefined,
      expenses: fetchedExpenses.length > 0 ? fetchedExpenses : undefined,
      investments: fetchedInvestments.length > 0 ? fetchedInvestments : undefined,
      loans: fetchedLoans.length > 0 ? fetchedLoans : undefined,
    };

    try {
      const result = await generateFinancialAdvice(inputForAI);
      setPersonalAdvice(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setPersonalError(errorMsg);
      toast({ title: "Error Generating Personal Advice", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingPersonal(false);
    }
  }, [user, toast, fetchedIncome, fetchedExpenses, fetchedInvestments, fetchedLoans, isFetchingData]);

  useEffect(() => {
    if (user && !isFetchingData) { 
      fetchPersonalAdvice();
    }
  }, [user, fetchPersonalAdvice, isFetchingData]);

  const handleAnalyzeSpending = async () => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to analyze spending.", variant: "destructive" });
      return;
    }
    if (isFetchingData) {
      toast({ title: "Still Loading", description: "Financial data is still loading. Please wait.", variant: "default" });
      return;
    }
    if (fetchedExpenses.length === 0) {
        setSpendingAnalysisResult({ analysis: "No expense data found. Please add your expenses in the 'Update Finances' section to get a spending analysis." });
        return;
    }

    setIsLoadingSpendingAnalysis(true);
    setSpendingAnalysisError(null);
    setSpendingAnalysisResult(null);

    const inputForAI: GenerateSpendingAnalysisInput = {
      expenseItems: fetchedExpenses,
      incomeItems: fetchedIncome.length > 0 ? fetchedIncome : undefined,
      timePeriod: selectedTimePeriod,
    };

    try {
      const result = await generateSpendingAnalysis(inputForAI);
      setSpendingAnalysisResult(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setSpendingAnalysisError(errorMsg);
      toast({ title: "Error Analyzing Spending", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingSpendingAnalysis(false);
    }
  };

  // Removed: handleAnalyzePastDecision function

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ask a Financial Question</CardTitle>
          <CardDescription>Get personalized answers to your specific financial questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ask me anything about your finances, investments, or financial planning..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="resize-y"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleGetAnswer} disabled={isLoadingQuestion} className="w-full sm:w-auto">
            {isLoadingQuestion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Answer
          </Button>
        </CardFooter>
      </Card>

      {isLoadingQuestion && (
        <div className="flex items-center justify-center min-h-[150px]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      {questionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Getting Answer</AlertTitle>
          <AlertDescription>{questionError}</AlertDescription>
        </Alert>
      )}
      {questionAdvice && (
        <Card className="shadow-md">
          <CardHeader><CardTitle className="text-lg">AI's Response</CardTitle></CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">{questionAdvice.advice}</div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal-advice" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="personal-advice">Personal Advice</TabsTrigger>
          <TabsTrigger value="spending-analysis">Spending Analysis</TabsTrigger>
          {/* Removed: <TabsTrigger value="backward-analysis">Backward Analysis</TabsTrigger> */}
          <TabsTrigger value="what-if" disabled>What-If Scenarios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal-advice">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center"><Lightbulb className="h-6 w-6 mr-2 text-primary"/>Personal Financial Advice</CardTitle>
              <CardDescription>Get tailored advice based on your current financial situation.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPersonal || isFetchingData ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">{isFetchingData ? 'Loading financial data...' : 'Generating advice...'}</p>
                </div>
              ) : personalError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Generating Advice</AlertTitle>
                  <AlertDescription>{personalError}</AlertDescription>
                </Alert>
              ) : personalAdvice?.advice ? (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                  {personalAdvice.advice}
                </div>
              ) : (
                 <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2"/>
                    <p>No personal advice to display. This could be due to missing financial data or an issue generating the advice.</p>
                    <p>Try adding your financial details or refreshing.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button asChild variant="outline">
                <Link href="/finances">Update Financial Info</Link>
              </Button>
              <Button onClick={fetchPersonalAdvice} disabled={isLoadingPersonal || isFetchingData}>
                {(isLoadingPersonal || isFetchingData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh Advice
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="spending-analysis">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center"><BarChartHorizontal className="h-6 w-6 mr-2 text-primary"/>Spending Behavior Analysis</CardTitle>
              <CardDescription>Analyze your spending patterns and discover savings opportunities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="timePeriod" className="block text-sm font-medium text-foreground mb-1">Time Period</label>
                <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                  <SelectTrigger id="timePeriod" className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    {timePeriodOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoadingSpendingAnalysis ? (
                  <div className="flex items-center justify-center min-h-[150px]">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Analyzing your spending...</p>
                  </div>
              ) : spendingAnalysisError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Analyzing Spending</AlertTitle>
                  <AlertDescription>{spendingAnalysisError}</AlertDescription>
                </Alert>
              ) : spendingAnalysisResult?.analysis ? (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm p-4 border rounded-md bg-muted/30">
                  {spendingAnalysisResult.analysis}
                </div>
              ) : (
                 <Alert variant="default" className="bg-accent/30 border-accent/50">
                    <Info className="h-4 w-4 text-accent-foreground" />
                    <AlertTitle>No Analysis Yet</AlertTitle>
                    <AlertDescription>
                      {fetchedExpenses.length === 0 && !isFetchingData
                        ? "No expense data found. Please add your expenses in 'Update Finances' then click 'Analyze Spending'."
                        : "Select a time period and click 'Analyze Spending' to see your behavior analysis."}
                    </AlertDescription>
                  </Alert>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={handleAnalyzeSpending} disabled={isLoadingSpendingAnalysis || isFetchingData} className="w-full sm:w-auto">
                {(isLoadingSpendingAnalysis || isFetchingData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Spending
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Removed: Backward Analysis Tab Content */}

         <TabsContent value="what-if">
            <Card className="mt-4"><CardHeader><CardTitle>What-If Scenarios (Coming Soon)</CardTitle></CardHeader><CardContent><p>This feature is under development.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
