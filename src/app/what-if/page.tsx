
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { HelpCircle } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';
import { WhatIfClient } from '@/components/what-if/WhatIfClient';

function WhatIfPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="“What If” Scenarios"
        description="Simulate different financial decisions and see how they affect your future."
        icon={HelpCircle}
      />
      <WhatIfClient />
    </div>
  );
}

export default withAuth(WhatIfPage);
