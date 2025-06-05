
'use client';

import { GoalSettingClient } from '@/components/goal-setting/GoalSettingClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { Target } from 'lucide-react'; // Using Target icon
import withAuth from '@/components/auth/withAuth';

function GoalSettingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Goals"
        description="Set, track, and manage your financial objectives."
        icon={Target}
      />
      <GoalSettingClient />
    </div>
  );
}

export default withAuth(GoalSettingPage);
