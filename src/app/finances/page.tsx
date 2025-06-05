
'use client';

import { FinancesClient } from '@/components/finances/FinancesClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { Landmark } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';

function FinancesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage Your Finances"
        description="Keep track of your income, expenses, investments, and loans."
        icon={Landmark}
      />
      <FinancesClient />
    </div>
  );
}

export default withAuth(FinancesPage);
