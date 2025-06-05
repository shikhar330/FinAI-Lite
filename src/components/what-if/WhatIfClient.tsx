
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getIncomeItems, getExpenseItems, getInvestmentItems, getLoanItems } from '@/lib/finance-storage';
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import { generateWhatIfAnalysis, type GenerateWhatIfAnalysisInput, type GenerateWhatIfAnalysisOutput, type InvestmentStrategyProjections, type YearByYearProjection, type CareerSimulationProjections } from '@/ai/flows/generate-what-if-analysis';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, LineChart as LineChartIcon, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar, Cell } from 'recharts';
import { CareerChangeForm, type CareerChangeFormValues } from './CareerChangeForm';
import { InvestmentStrategyForm, type InvestmentStrategyFormValues, investmentStrategies } from './InvestmentStrategyForm';
import { MajorPurchaseForm, type MajorPurchaseFormValues } from './MajorPurchaseForm';
import Link from 'next/link';

type ScenarioType = "careerChange" | "investmentStrategy" | "majorPurchase";

interface SimulationDataPoint {
  year: number;
  currentPathValue: number; 
  newPathValue: number;    
  name?: string;
  assetValue?: number; 
  loanBalance?: number; 
  investmentsWithPurchase?: number; 
}

interface CareerSimulationResults {
  type: "career";
  incomeComparisonData: SimulationDataPoint[];
  savingsComparisonData: SimulationDataPoint[];
}

interface InvestmentSimulationResults {
  type: "investment";
  investmentGrowthData: SimulationDataPoint[];
}

interface MajorPurchaseSimulationResults {
  type: "majorPurchase";
  comparisonData: SimulationDataPoint[];
}

type SimulationParams = CareerChangeFormValues | InvestmentStrategyFormValues | MajorPurchaseFormValues | null;
type SimulationResults = CareerSimulationResults | InvestmentSimulationResults | MajorPurchaseSimulationResults | null;

interface CareerDifferenceMetrics {
  type: "career";
  incomeDifference: number; 
  savingsDifference: number; 
  newMonthlyIncome: number; 
  yearsSimulated: number;
}

interface InvestmentDifferenceMetrics {
  type: "investment";
  currentStrategyFinalAmount: number;
  newStrategyFinalAmount: number;
  finalAmountDifference: number;
  totalInvestmentMade: number;
  currentStrategyName: string;
  currentStrategyReturnRate: number;
  newStrategyName: string;
  newStrategyReturnRate: number;
  yearsSimulated: number;
}

interface MajorPurchaseDifferenceMetrics {
    type: "majorPurchase";
    monthlyEMI: number;
    netWorthWithPurchaseFinal: number;
    netWorthWithoutPurchaseFinal: number;
    netWorthDifference: number; 
    yearsSimulated: number; // Loan tenure will be used
    monthlyRentIfApplicable?: number;
    finalAssetValue?: number;
    finalLoanBalance?: number;
}

type DifferenceMetrics = CareerDifferenceMetrics | InvestmentDifferenceMetrics | MajorPurchaseDifferenceMetrics | null;

interface CurrentFinancialsSummary {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netMonthlySavings: number;
  totalInitialInvestmentsValue: number; // Changed from totalInvestmentsValue
  totalDebt: number;
  netWorth: number;
  averageInvestmentReturnRate?: number;
}

const formatCurrency = (value: number | undefined, includeSymbol = false) => {
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

const calculateFVAnnuity = (monthlyInvestment: number, annualRate: number, years: number): number => {
    const monthlyRate = annualRate / 100 / 12;
    const numberOfMonths = years * 12;
    if (monthlyRate === 0) {
        return monthlyInvestment * numberOfMonths;
    }
    return monthlyInvestment * (Math.pow(1 + monthlyRate, numberOfMonths) - 1) / monthlyRate;
};

const calculateEMI = (principal: number, annualRate: number, tenureYears: number): number => {
    if (principal <=0 || tenureYears <=0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    const numberOfMonths = tenureYears * 12;
    if (monthlyRate === 0) return principal / numberOfMonths;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths)) / (Math.pow(1 + monthlyRate, numberOfMonths) - 1);
};

const CHART_COLORS = {
  currentPath: 'hsl(var(--chart-2))', 
  newPath: 'hsl(var(--chart-1))',     
  asset: 'hsl(var(--chart-4))',       
  loan: 'hsl(var(--chart-5))',        
  investments: 'hsl(var(--primary))', 
};


export function WhatIfClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeScenario, setActiveScenario] = useState<ScenarioType>("careerChange");
  
  const [currentFinancials, setCurrentFinancials] = useState<CurrentFinancialsSummary | null>(null);
  const [isFetchingCurrentData, setIsFetchingCurrentData] = useState(true);

  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResults>(null);
  const [differenceMetrics, setDifferenceMetrics] = useState<DifferenceMetrics>(null);
  const [aiAnalysis, setAiAnalysis] = useState<GenerateWhatIfAnalysisOutput | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentFinancials = useCallback(async () => {
    if (!user) {
      setIsFetchingCurrentData(false);
      return;
    }
    setIsFetchingCurrentData(true);
    try {
      const [incomeItems, expenseItems, investmentItems, loanItems] = await Promise.all([
        getIncomeItems(user.uid),
        getExpenseItems(user.uid),
        getInvestmentItems(user.uid),
        getLoanItems(user.uid),
      ]);

      const monthlyIncome = incomeItems.filter(i => i.frequency === 'monthly').reduce((sum, i) => sum + i.amount, 0) + 
                            (incomeItems.filter(i => i.frequency === 'yearly').reduce((sum, i) => sum + i.amount, 0) / 12) +
                            (incomeItems.filter(i => i.frequency === 'one-time').reduce((sum, i) => sum + i.amount, 0) / 12);
      
      const monthlyBaseExpenses = expenseItems.filter(e => e.frequency === 'monthly').reduce((sum, e) => sum + e.amount, 0) +
                              (expenseItems.filter(e => e.frequency === 'yearly').reduce((sum, e) => sum + e.amount, 0) / 12) +
                              (expenseItems.filter(e => e.frequency === 'weekly').reduce((sum, e) => sum + e.amount, 0) * 4.33) +
                              (expenseItems.filter(e => e.frequency === 'one-time').reduce((sum, e) => sum + e.amount, 0) / 12);

      const monthlyLoanPaymentsTotal = loanItems.reduce((sum, l) => sum + l.monthlyPayment, 0);
      const totalMonthlyExpensesCalculated = monthlyBaseExpenses + monthlyLoanPaymentsTotal;
      
      const totalInitialInvestments = investmentItems.reduce((sum, inv) => sum + (inv.initialInvestment || 0), 0);
      const totalDebtAmount = loanItems.reduce((sum, l) => sum + l.outstandingBalance, 0);
      
      const netMonthlySavingsCalculated = monthlyIncome - totalMonthlyExpensesCalculated;
      const netWorthCalculated = totalInitialInvestments - totalDebtAmount;


      setCurrentFinancials({
        totalMonthlyIncome: isNaN(monthlyIncome) ? 0 : monthlyIncome,
        totalMonthlyExpenses: isNaN(totalMonthlyExpensesCalculated) ? 0 : totalMonthlyExpensesCalculated,
        netMonthlySavings: isNaN(netMonthlySavingsCalculated) ? 0 : netMonthlySavingsCalculated,
        totalInitialInvestmentsValue: isNaN(totalInitialInvestments) ? 0 : totalInitialInvestments,
        totalDebt: isNaN(totalDebtAmount) ? 0 : totalDebtAmount,
        netWorth: isNaN(netWorthCalculated) ? 0 : netWorthCalculated,
        averageInvestmentReturnRate: 7, 
      });

    } catch (e) {
      console.error("Error fetching current financials for What-If:", e);
      toast({ title: "Error", description: "Could not load your current financial summary.", variant: "destructive" });
      setCurrentFinancials(null);
    } finally {
      setIsFetchingCurrentData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchCurrentFinancials();
  }, [fetchCurrentFinancials]);

  const runCareerChangeSimulation = (params: CareerChangeFormValues, baseFinancials: CurrentFinancialsSummary) => {
    setIsSimulating(true);
    setError(null);
    setAiAnalysis(null); 
    setSimulationParams(params);

    const { currentMonthlySalary, newMonthlySalary, yearsToSimulate, annualGrowthRate } = params;
    const growthMultiplier = 1 + (annualGrowthRate / 100);
    const baseMonthlyExpenses = baseFinancials.totalMonthlyExpenses > 0 ? baseFinancials.totalMonthlyExpenses : (currentMonthlySalary * 0.6);

    const incomeData: SimulationDataPoint[] = [];
    const savingsData: SimulationDataPoint[] = [];

    let tempCurrentAnnualIncome = currentMonthlySalary * 12;
    let tempNewAnnualIncome = newMonthlySalary * 12;
    let tempCurrentCumulativeSavings = 0;
    let tempNewCumulativeSavings = 0;
    
    const currentPathAnnualIncomeArr: number[] = [];
    const newPathAnnualIncomeArr: number[] = [];
    const currentPathCumulativeSavingsArr: number[] = [];
    const newPathCumulativeSavingsArr: number[] = [];


    for (let year = 1; year <= yearsToSimulate; year++) {
      if (year > 1) { 
        tempCurrentAnnualIncome *= growthMultiplier;
        tempNewAnnualIncome *= growthMultiplier;
      }
      
      currentPathAnnualIncomeArr.push(tempCurrentAnnualIncome);
      newPathAnnualIncomeArr.push(tempNewAnnualIncome);

      const currentAnnualExpenses = baseMonthlyExpenses * 12; 
      
      tempCurrentCumulativeSavings += (tempCurrentAnnualIncome - currentAnnualExpenses);
      tempNewCumulativeSavings += (tempNewAnnualIncome - currentAnnualExpenses);
      
      currentPathCumulativeSavingsArr.push(tempCurrentCumulativeSavings);
      newPathCumulativeSavingsArr.push(tempNewCumulativeSavings);

      incomeData.push({ year, currentPathValue: tempCurrentAnnualIncome, newPathValue: tempNewAnnualIncome });
      savingsData.push({ year, currentPathValue: tempCurrentCumulativeSavings, newPathValue: tempNewCumulativeSavings });
    }
    
    setSimulationResults({
      type: "career",
      incomeComparisonData: incomeData,
      savingsComparisonData: savingsData,
    });
    
    setDifferenceMetrics({
      type: "career",
      incomeDifference: tempNewAnnualIncome - tempCurrentAnnualIncome,
      savingsDifference: tempNewCumulativeSavings - tempCurrentCumulativeSavings,
      newMonthlyIncome: newMonthlySalary,
      yearsSimulated: yearsToSimulate,
    });
    
    const aiSimulationProjections: CareerSimulationProjections = {
      currentPathAnnualIncome: currentPathAnnualIncomeArr,
      newPathAnnualIncome: newPathAnnualIncomeArr,
      currentPathCumulativeSavings: currentPathCumulativeSavingsArr,
      newPathCumulativeSavings: newPathCumulativeSavingsArr,
    };

    triggerAiAnalysis(params, aiSimulationProjections);
    setIsSimulating(false);
  };

  const runInvestmentStrategySimulation = (params: InvestmentStrategyFormValues, baseFinancials: CurrentFinancialsSummary) => {
    setIsSimulating(true);
    setError(null);
    setAiAnalysis(null);
    setSimulationParams(params);

    const { monthlyInvestmentAmount, currentInvestmentStrategyValue, newInvestmentStrategyValue, yearsToSimulate } = params;

    const currentStrategy = investmentStrategies.find(s => s.value === currentInvestmentStrategyValue);
    const newStrategy = investmentStrategies.find(s => s.value === newInvestmentStrategyValue);

    if (!currentStrategy || !newStrategy) {
      setError("Invalid strategy selection.");
      setIsSimulating(false);
      return;
    }
    
    const chartData: SimulationDataPoint[] = [];
    const yearByYearForAI: YearByYearProjection[] = [];

    let currentStrategyValue = 0;
    let newStrategyValue = 0;

    for (let year = 1; year <= yearsToSimulate; year++) {
      currentStrategyValue = calculateFVAnnuity(monthlyInvestmentAmount, currentStrategy.rate, year);
      newStrategyValue = calculateFVAnnuity(monthlyInvestmentAmount, newStrategy.rate, year);
      chartData.push({ year, currentPathValue: currentStrategyValue, newPathValue: newStrategyValue });
      yearByYearForAI.push({ year, fdValue: currentStrategyValue, newStrategyValue: newStrategyValue});
    }
    
    const totalInvestmentMade = monthlyInvestmentAmount * 12 * yearsToSimulate;

    setSimulationResults({ type: "investment", investmentGrowthData: chartData });
    setDifferenceMetrics({
        type: "investment",
        currentStrategyFinalAmount: currentStrategyValue,
        newStrategyFinalAmount: newStrategyValue,
        finalAmountDifference: newStrategyValue - currentStrategyValue,
        totalInvestmentMade: totalInvestmentMade,
        currentStrategyName: currentStrategy.name,
        currentStrategyReturnRate: currentStrategy.rate,
        newStrategyName: newStrategy.name,
        newStrategyReturnRate: newStrategy.rate,
        yearsSimulated: yearsToSimulate
    });
    
    const aiSimulationProjections: InvestmentStrategyProjections = {
      fdFinalAmount: currentStrategyValue,
      newStrategyFinalAmount: newStrategyValue,
      totalInvestmentMade,
      yearByYearProjections: yearByYearForAI
    };
    triggerAiAnalysis(params, aiSimulationProjections);
    setIsSimulating(false);
  };

 const runMajorPurchaseSimulation = (params: MajorPurchaseFormValues, baseFinancials: CurrentFinancialsSummary) => {
    setIsSimulating(true);
    setError(null);
    setAiAnalysis(null);
    setSimulationParams(params);

    const { purchaseType, totalCost, downPayment, interestRate, loanTenureYears, monthlyRent } = params;
    const loanAmount = Math.max(0, totalCost - downPayment);
    const monthlyEMI = calculateEMI(loanAmount, interestRate, loanTenureYears);
    const assumedInvestmentRate = baseFinancials.averageInvestmentReturnRate || 7; // Default to 7% if not available
    const yearsToSimulate = loanTenureYears; // Simulation duration is loan tenure

    const comparisonData: SimulationDataPoint[] = [];

    let currentNetWorthWithoutPurchase = baseFinancials.netWorth;
    let currentNetWorthWithPurchase = (baseFinancials.totalInitialInvestmentsValue - downPayment) + totalCost - loanAmount; // Initial Net worth if purchase is made
    
    comparisonData.push({
      year: 0,
      currentPathValue: currentNetWorthWithoutPurchase, 
      newPathValue: currentNetWorthWithPurchase,       
      assetValue: totalCost, // Initial asset value
      loanBalance: loanAmount,
      investmentsWithPurchase: baseFinancials.totalInitialInvestmentsValue - downPayment
    });
    
    let tempAssetValue = totalCost;
    let tempLoanBalance = loanAmount;
    let investmentsCorpusWithPurchase = Math.max(0, baseFinancials.totalInitialInvestmentsValue - downPayment);
    let investmentsCorpusWithoutPurchase = baseFinancials.totalInitialInvestmentsValue;
    
    // If not buying, the downpayment amount is available for investment
    if (downPayment > 0) {
        investmentsCorpusWithoutPurchase += downPayment; 
    }


    for (let year = 1; year <= yearsToSimulate; year++) {
      // Scenario: Without Purchase (Investing instead)
      let annualSavingsWithoutPurchase = baseFinancials.netMonthlySavings * 12;
      if (purchaseType === "Property" && monthlyRent > 0) {
        // If not buying property, the rent money is also available for saving/investing
        annualSavingsWithoutPurchase += monthlyRent * 12;
      }
      investmentsCorpusWithoutPurchase = (investmentsCorpusWithoutPurchase + annualSavingsWithoutPurchase) * (1 + assumedInvestmentRate / 100);
      currentNetWorthWithoutPurchase = investmentsCorpusWithoutPurchase - baseFinancials.totalDebt; // Assuming other debts remain constant

      // Scenario: With Purchase
      tempAssetValue = tempAssetValue * (1 + 0 / 100); // Simplified: Assuming 0% asset appreciation for now based on removed form field. Can be enhanced.
      
      let principalPaidThisYear = 0;
      if (tempLoanBalance > 0) {
        const annualEMIPayments = monthlyEMI * 12;
        const interestForYear = tempLoanBalance * (interestRate / 100);
        principalPaidThisYear = Math.min(tempLoanBalance, annualEMIPayments - interestForYear);
        tempLoanBalance = Math.max(0, tempLoanBalance - principalPaidThisYear);
      }
      
      // Savings after EMI. If EMI is higher than original savings + rent (if applicable for property), this could be negative.
      // This is a simplified assumption; detailed cash flow changes are complex.
      const annualSavingsWithPurchase = baseFinancials.netMonthlySavings * 12; // No explicit impact on savings from form
      investmentsCorpusWithPurchase = (investmentsCorpusWithPurchase + annualSavingsWithPurchase) * (1 + assumedInvestmentRate / 100);
      currentNetWorthWithPurchase = investmentsCorpusWithPurchase + tempAssetValue - tempLoanBalance;
      
      comparisonData.push({
        year,
        currentPathValue: currentNetWorthWithoutPurchase,
        newPathValue: currentNetWorthWithPurchase,
        assetValue: tempAssetValue,
        loanBalance: tempLoanBalance,
        investmentsWithPurchase: investmentsCorpusWithPurchase
      });
    }

    setSimulationResults({
      type: "majorPurchase",
      comparisonData,
    });

    setDifferenceMetrics({
      type: "majorPurchase",
      monthlyEMI,
      netWorthWithPurchaseFinal: currentNetWorthWithPurchase,
      netWorthWithoutPurchaseFinal: currentNetWorthWithoutPurchase,
      netWorthDifference: currentNetWorthWithPurchase - currentNetWorthWithoutPurchase,
      yearsSimulated: yearsToSimulate,
      monthlyRentIfApplicable: purchaseType === "Property" ? monthlyRent : undefined,
      finalAssetValue: tempAssetValue,
      finalLoanBalance: tempLoanBalance
    });

     const aiSimulationProjections = {
        finalNetWorthWithPurchase: formatCurrency(currentNetWorthWithPurchase, true),
        finalNetWorthWithoutPurchase: formatCurrency(currentNetWorthWithoutPurchase, true),
        monthlyEMI, 
        savingsImpact: 0, // This field was removed, so passing 0. AI prompt will need adjustment.
    };

    triggerAiAnalysis(params, aiSimulationProjections);
    setIsSimulating(false);
  };


  const handleFormSubmit = (values: any) => {
    if (!currentFinancials) {
      toast({ title: "Error", description: "Current financial data not loaded. Cannot run simulation.", variant: "destructive" });
      return;
    }
    if (activeScenario === "careerChange") {
      runCareerChangeSimulation(values as CareerChangeFormValues, currentFinancials);
    } else if (activeScenario === "investmentStrategy") {
      runInvestmentStrategySimulation(values as InvestmentStrategyFormValues, currentFinancials);
    } else if (activeScenario === "majorPurchase") {
      runMajorPurchaseSimulation(values as MajorPurchaseFormValues, currentFinancials);
    }
  };

  const triggerAiAnalysis = async (params: SimulationParams, projections: any) => {
    if (!currentFinancials || !params) {
      setError("Missing data for AI analysis.");
      return;
    }
    setIsLoadingAi(true);
    setAiAnalysis(null);
    
    const aiInput: GenerateWhatIfAnalysisInput = {
      currentFinancials: {
        totalMonthlyIncome: currentFinancials.totalMonthlyIncome,
        totalMonthlyExpenses: currentFinancials.totalMonthlyExpenses,
        totalInvestmentsValue: currentFinancials.totalInitialInvestmentsValue, // Use initial investments for AI too
        totalDebt: currentFinancials.totalDebt,
      },
      scenarioType: activeScenario,
      scenarioParameters: params as any, 
      simulationProjections: projections,
    };

    try {
      const result = await generateWhatIfAnalysis(aiInput);
      setAiAnalysis(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "An unknown error occurred generating AI analysis.";
      setError(errorMsg);
      toast({ title: "AI Analysis Failed", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingAi(false);
    }
  };
  
  const onTabChange = (value: string) => {
    setActiveScenario(value as ScenarioType);
    setSimulationResults(null);
    setDifferenceMetrics(null);
    setAiAnalysis(null);
    setError(null);
    setSimulationParams(null);
  };

  const renderMetricCards = () => {
    if (!differenceMetrics) return null;

    if (differenceMetrics.type === "career") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">New Monthly Income</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.newMonthlyIncome, true)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Final Annual Income Diff.</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.incomeDifference, true)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Final Cumulative Savings Diff.</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.savingsDifference, true)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Years Simulated</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{differenceMetrics.yearsSimulated}</p></CardContent></Card>
        </div>
      );
    }
    if (differenceMetrics.type === "investment") {
       return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{differenceMetrics.currentStrategyName} Final Amount ({differenceMetrics.currentStrategyReturnRate}%)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.currentStrategyFinalAmount, true)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{differenceMetrics.newStrategyName} Final Amount ({differenceMetrics.newStrategyReturnRate}%)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.newStrategyFinalAmount, true)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Difference (New - Current)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.finalAmountDifference, true)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Investment Made</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.totalInvestmentMade, true)}</p></CardContent>
          </Card>
        </div>
      );
    }
    if (differenceMetrics.type === "majorPurchase") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Monthly EMI</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(differenceMetrics.monthlyEMI, true)}</p></CardContent>
          </Card>
          {differenceMetrics.monthlyRentIfApplicable !== undefined && differenceMetrics.monthlyRentIfApplicable > 0 && (
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent (Avoided)</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(differenceMetrics.monthlyRentIfApplicable, true)}</p>
                    <CardDescription className="text-xs">Rent you save by buying property.</CardDescription>
                </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Net Worth Difference</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(differenceMetrics.netWorthDifference, true)}</p>
                <CardDescription className="text-xs">(With Purchase vs. Without) at end of {differenceMetrics.yearsSimulated} years</CardDescription>
            </CardContent>
          </Card>
        </div>
      );
    }
    return null;
  };
  
  const renderCharts = () => {
    if (!simulationResults) return null;

    if (simulationResults.type === "career" && simulationResults.incomeComparisonData.length > 0) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Annual Income Comparison</CardTitle></CardHeader>
            <CardContent className="h-[300px] w-full">
              <ResponsiveContainer>
                <LineChart data={simulationResults.incomeComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, false)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value, true), null]} />
                  <Legend />
                  <Line type="monotone" dataKey="currentPathValue" name="Current Path Income" stroke={CHART_COLORS.currentPath} />
                  <Line type="monotone" dataKey="newPathValue" name="New Path Income" stroke={CHART_COLORS.newPath} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle>Cumulative Savings Comparison</CardTitle></CardHeader>
            <CardContent className="h-[300px] w-full">
              <ResponsiveContainer>
                <LineChart data={simulationResults.savingsComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, false)} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value, true), null]} />
                  <Legend />
                  <Line type="monotone" dataKey="currentPathValue" name="Current Path Savings" stroke={CHART_COLORS.currentPath} />
                  <Line type="monotone" dataKey="newPathValue" name="New Path Savings" stroke={CHART_COLORS.newPath} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (simulationResults.type === "investment" && simulationResults.investmentGrowthData.length > 0) {
      const currentStrategyName = (differenceMetrics as InvestmentDifferenceMetrics)?.currentStrategyName || "Current Strategy";
      const newStrategyName = (differenceMetrics as InvestmentDifferenceMetrics)?.newStrategyName || "New Strategy";
      return (
        <Card className="shadow-md mb-6">
          <CardHeader><CardTitle>Investment Growth Comparison</CardTitle>
            <CardDescription>Projected growth of {formatCurrency((simulationParams as InvestmentStrategyFormValues)?.monthlyInvestmentAmount, true)} invested monthly.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ResponsiveContainer>
              <LineChart data={simulationResults.investmentGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottomRight', offset: -5 }} />
                <YAxis tickFormatter={(value) => formatCurrency(value, false)} />
                <Tooltip formatter={(value: number) => [formatCurrency(value, true), null]} />
                <Legend />
                <Line type="monotone" dataKey="currentPathValue" name={currentStrategyName} stroke={CHART_COLORS.currentPath} />
                <Line type="monotone" dataKey="newPathValue" name={newStrategyName} stroke={CHART_COLORS.newPath} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }
    if (simulationResults.type === "majorPurchase" && simulationResults.comparisonData.length > 0) {
      return (
        <Card className="shadow-md mb-6">
          <CardHeader><CardTitle>Net Worth Projection: Buying vs. Investing</CardTitle></CardHeader>
          <CardContent className="h-[350px] w-full">
            <ResponsiveContainer>
              <LineChart data={simulationResults.comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottomRight', offset: -5 }}/>
                <YAxis tickFormatter={(value) => formatCurrency(value, false)} />
                <Tooltip formatter={(value: number, name) => [formatCurrency(value, true), name === "currentPathValue" ? "Net Worth (Investing Instead)" : "Net Worth (With Purchase)"]} />
                <Legend 
                  formatter={(value, entry) => {
                    if (value === "currentPathValue") return "Net Worth (Investing Instead)";
                    if (value === "newPathValue") return "Net Worth (With Purchase)";
                    if (value === "assetValue") return "Asset Value (With Purchase)";
                    if (value === "loanBalance") return "Loan Balance (With Purchase)";
                    return value;
                  }}
                />
                <Line type="monotone" dataKey="currentPathValue" name="Net Worth (Investing Instead)" stroke={CHART_COLORS.currentPath} />
                <Line type="monotone" dataKey="newPathValue" name="Net Worth (With Purchase)" stroke={CHART_COLORS.newPath} />
                 {simulationResults.comparisonData[0].assetValue !== undefined && 
                    <Line type="monotone" dataKey="assetValue" name="Asset Value (With Purchase)" stroke={CHART_COLORS.asset} strokeDasharray="5 5" /> }
                 {simulationResults.comparisonData[0].loanBalance !== undefined &&
                    <Line type="monotone" dataKey="loanBalance" name="Loan Balance (With Purchase)" stroke={CHART_COLORS.loan} strokeDasharray="5 5" /> }
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (isFetchingCurrentData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!currentFinancials && !isFetchingCurrentData) {
    return (
        <Card className="shadow-lg text-center py-12">
          <CardHeader>
            <Info className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Financial Data Required</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6">
              Please add your financial details (income, expenses, investments, loans) in the 'Finances' section before using the "What If" scenario tool. This information is needed to provide accurate simulations.
            </CardDescription>
            <Button asChild>
              <Link href="/finances">Go to Finances</Link>
            </Button>
          </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Financial Snapshot</CardTitle>
          <CardDescription>Based on data from your 'Finances' section. Used as a baseline for simulations.</CardDescription>
        </CardHeader>
        <CardContent>
            {currentFinancials ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 text-sm">
                    <div><span className="font-medium">Monthly Income:</span> {formatCurrency(currentFinancials.totalMonthlyIncome, true)}</div>
                    <div><span className="font-medium">Monthly Expenses:</span> {formatCurrency(currentFinancials.totalMonthlyExpenses, true)}</div>
                    <div><span className="font-medium">Net Monthly Savings:</span> {formatCurrency(currentFinancials.netMonthlySavings, true)}</div>
                    <div><span className="font-medium">Total Initial Investments:</span> {formatCurrency(currentFinancials.totalInitialInvestmentsValue, true)}</div>
                    <div><span className="font-medium">Total Debt:</span> {formatCurrency(currentFinancials.totalDebt, true)}</div>
                    <div><span className="font-medium">Est. Net Worth:</span> {formatCurrency(currentFinancials.netWorth, true)}</div>
                </div>
            ) : (
                <p className="text-muted-foreground">Loading current financial data...</p>
            )}
        </CardContent>
         <CardFooter>
            <Button variant="outline" size="sm" onClick={fetchCurrentFinancials} disabled={isFetchingCurrentData}>
                {isFetchingCurrentData && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Refresh Snapshot
            </Button>
        </CardFooter>
      </Card>

      <Tabs value={activeScenario} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="careerChange">Career Change</TabsTrigger>
          <TabsTrigger value="investmentStrategy">Investment Strategy</TabsTrigger>
          <TabsTrigger value="majorPurchase">Major Purchase</TabsTrigger>
        </TabsList>
        <TabsContent value="careerChange">
          <Card><CardHeader><CardTitle>Career Change Simulation</CardTitle></CardHeader>
            <CardContent><CareerChangeForm onSubmit={handleFormSubmit} isLoading={isSimulating} defaultValues={{ currentMonthlySalary: currentFinancials?.totalMonthlyIncome || 0 }} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="investmentStrategy">
          <Card><CardHeader><CardTitle>Investment Strategy Comparison</CardTitle></CardHeader>
            <CardContent><InvestmentStrategyForm onSubmit={handleFormSubmit} isLoading={isSimulating} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="majorPurchase">
          <Card><CardHeader><CardTitle>Major Purchase Impact Analysis</CardTitle></CardHeader>
            <CardContent><MajorPurchaseForm onSubmit={handleFormSubmit} isLoading={isSimulating} defaultValues={{}} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isSimulating && (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Running simulation...</p>
        </div>
      )}
      
      {!isSimulating && simulationResults && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center"><LineChartIcon className="h-6 w-6 mr-2 text-primary"/>Simulation Results</CardTitle>
             {simulationParams && <CardDescription>
                Scenario: {activeScenario === 'careerChange' ? `Career Change (Simulated over ${(simulationParams as CareerChangeFormValues).yearsToSimulate} years)` 
                          : activeScenario === 'investmentStrategy' ? `Investment Strategy (Comparing over ${(simulationParams as InvestmentStrategyFormValues).yearsToSimulate} years)`
                          : `Major Purchase (${(simulationParams as MajorPurchaseFormValues).purchaseType} over ${(simulationParams as MajorPurchaseFormValues).loanTenureYears} years)`}
            </CardDescription>}
          </CardHeader>
          <CardContent>
            {renderMetricCards()}
            {renderCharts()}
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {simulationResults && !aiAnalysis && !isLoadingAi && !error && (
         <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>AI Analysis Pending</AlertTitle>
            <AlertDescription>The AI analysis for this simulation will appear below once generated. If it doesn't appear, there might have been an issue.</AlertDescription>
        </Alert>
      )}

      {isLoadingAi && (
        <div className="flex items-center justify-center min-h-[150px]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Generating AI analysis...</p>
        </div>
      )}

      {aiAnalysis && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">AI Financial Advisor's Analysis</CardTitle>
            <CardDescription>Insights on your "{activeScenario === "careerChange" ? "Career Change" : activeScenario === "investmentStrategy" ? "Investment Strategy" : `Major Purchase (${(simulationParams as MajorPurchaseFormValues)?.purchaseType})`}" scenario.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: aiAnalysis.analysis.replace(/\n/g, '<br />') }}>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
