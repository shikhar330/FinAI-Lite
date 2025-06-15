
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { BillItem } from '@/types/finance';
import { getBillItems } from '@/lib/bill-storage';
import { MonthlyBillReport } from '@/components/bill-tracker/MonthlyBillReport';
import { PageHeader } from '@/components/shared/PageHeader';
import { Loader2, FileText } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subMonths, addMonths, startOfMonth, format, getYear, getMonth, setYear, setMonth } from 'date-fns';

const currentSystemYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentSystemYear - 5 + i); // Current year +/- 5 years

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i, // 0 for January, 11 for December
  label: format(new Date(0, i), 'MMMM'),
}));

function MonthlyReportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize reportDate to the start of the previous month
  const initialReportDate = startOfMonth(subMonths(new Date(), 1));
  const [reportDate, setReportDate] = useState<Date>(initialReportDate);
  const [selectedYear, setSelectedYear] = useState<number>(getYear(initialReportDate));
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(initialReportDate));


  const fetchBillData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedBills = await getBillItems(user.uid);
      setBills(fetchedBills);
    } catch (error) {
      console.error("Failed to fetch bills for report:", error);
      toast({ title: "Error", description: "Could not load bill data for the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBillData();
  }, [fetchBillData]);

  useEffect(() => {
    // Update reportDate whenever selectedYear or selectedMonth changes
    const newReportDate = startOfMonth(new Date(selectedYear, selectedMonth, 1));
    setReportDate(newReportDate);
  }, [selectedYear, selectedMonth]);


  const handlePreviousMonth = () => {
    const newDate = subMonths(reportDate, 1);
    setSelectedYear(getYear(newDate));
    setSelectedMonth(getMonth(newDate));
  };

  const handleNextMonth = () => {
    const newDate = addMonths(reportDate, 1);
    // Prevent going to future months beyond current system month for reports
    if (newDate > startOfMonth(new Date())) {
        toast({ title: "Future Report", description: "Cannot generate reports for future months yet.", variant: "default"});
        return;
    }
    setSelectedYear(getYear(newDate));
    setSelectedMonth(getMonth(newDate));
  };
  
  const handleSetCurrentMonthAsLastMonth = () => {
    const lastMonth = startOfMonth(subMonths(new Date(),1));
    setSelectedYear(getYear(lastMonth));
    setSelectedMonth(getMonth(lastMonth));
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Monthly Bill Report: ${format(reportDate, 'MMMM yyyy')}`}
        description="Detailed summary of your bill activity for the selected month."
        icon={FileText}
      />
      
      <div className="flex flex-col sm:flex-row gap-4 items-center p-4 border rounded-lg bg-card shadow-sm print-hidden">
        <div className="flex gap-2 items-center">
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => setSelectedMonth(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto">
            <Button onClick={handlePreviousMonth} variant="outline" size="sm" className="flex-1 sm:flex-none">Previous Month</Button>
            <Button onClick={handleNextMonth} variant="outline" size="sm" className="flex-1 sm:flex-none">Next Month</Button>
        </div>
         <Button onClick={handleSetCurrentMonthAsLastMonth} variant="outline" size="sm" className="w-full sm:w-auto">View Last Month</Button>
      </div>

      <MonthlyBillReport bills={bills} reportDate={reportDate} />
    </div>
  );
}

export default withAuth(MonthlyReportPage);
