
'use client';

import { FinancialAdviceClient } from '@/components/financial-advice/FinancialAdviceClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { Brain } from 'lucide-react'; // Changed icon to Brain
import withAuth from '@/components/auth/withAuth';

function FinancialAdvicePage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="AI Financial Advisor"
        description="Get personalized financial guidance powered by AI."
        icon={Brain} // Changed icon
      />
      <FinancialAdviceClient />
    </div>
  );
}

export default withAuth(FinancialAdvicePage);
