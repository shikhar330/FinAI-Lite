
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FinancialSummarySection } from '@/components/dashboard/FinancialSummarySection';
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection';
import { MonthlyCashFlowChart } from '@/components/dashboard/MonthlyCashFlowChart';
import { IncomeDistributionChart } from '@/components/dashboard/IncomeDistributionChart';
import { ExpenseBreakdownChart } from '@/components/dashboard/ExpenseBreakdownChart';
import { InvestmentAllocationSection } from '@/components/dashboard/InvestmentAllocationSection';
import { AiFinancialAdvisorDisplay } from '@/components/dashboard/AiFinancialAdvisorDisplay';
import { FinancialGoalsSummary } from '@/components/dashboard/FinancialGoalsSummary';
// Removed import for FinancialHealthScore as it's now part of FinancialSummarySection
import { ArrowRight } from 'lucide-react';

function DashboardPage() {
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Set date only on client to avoid hydration mismatch
    setLastUpdated(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Financial Dashboard" 
          description={lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading...'}
        />
        <Button asChild className="w-full sm:w-auto">
          <Link href="/finances">
            Update Financial Info
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      
      {/* FinancialHealthScore is now rendered within FinancialSummarySection */}
      <FinancialSummarySection />
      <QuickActionsSection />
      <FinancialGoalsSummary /> 

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        <MonthlyCashFlowChart />
        <IncomeDistributionChart />
        <ExpenseBreakdownChart />
        <InvestmentAllocationSection />
      </div>

      <AiFinancialAdvisorDisplay />
    </div>
  );
}

export default withAuth(DashboardPage);
