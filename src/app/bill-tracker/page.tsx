
'use client';

import { BillTrackerClient } from '@/components/bill-tracker/BillTrackerClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { CalendarClock } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';

function BillTrackerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Bill Tracker & Reminders"
        description="Stay on top of your upcoming bills, payments, and due dates."
        icon={CalendarClock}
      />
      <BillTrackerClient />
    </div>
  );
}

export default withAuth(BillTrackerPage);
