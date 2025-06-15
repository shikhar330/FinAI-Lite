
'use client';

import React from 'react';
import type { BillItem } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, CalendarDays, CircleDollarSign, ListChecks, PieChart as PieChartIcon, AlertTriangle, CheckCircle, Clock, FileText, Download, ArrowLeft } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval, getMonth, getYear, addDays, isPast } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { getBillStatusInfo } from './BillTrackerClient';
import Link from 'next/link';


interface MonthlyBillReportProps {
  bills: BillItem[];
  reportDate: Date; // Represents the month for the report (e.g., first day of that month)
  // onClose prop removed as it's a page now
}

interface CategoryMetric {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

const REPORT_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
];


const calculateLateFeeForBill = (bill: BillItem): number => {
    if (!bill.lateFeeType || bill.lateFeeValue === undefined || bill.lateFeeValue === null || bill.status === 'cancelled') {
        return 0;
    }

    const dueDate = parseISO(bill.dueDate);
    const gracePeriodDays = bill.lateFeeGracePeriodDays ?? 0;
    const lateFeeApplicableDate = addDays(dueDate, gracePeriodDays);
    const today = new Date();

    let feeShouldBeApplied = false;
    if (bill.status === 'paid' && bill.paidDate) {
        if (parseISO(bill.paidDate) > lateFeeApplicableDate) {
            feeShouldBeApplied = true;
        }
    } else if (bill.status === 'overdue') {
        if (today > lateFeeApplicableDate) { 
             feeShouldBeApplied = true;
        }
    } else if (bill.status === 'upcoming' && isPast(lateFeeApplicableDate) && today > lateFeeApplicableDate) {
        feeShouldBeApplied = true;
    }


    if (feeShouldBeApplied) {
        if (bill.lateFeeType === 'fixed') {
            return bill.lateFeeValue;
        } else if (bill.lateFeeType === 'percentage') {
            return (bill.lateFeeValue / 100) * bill.amount;
        }
    }
    return 0;
};


export function MonthlyBillReport({ bills, reportDate }: MonthlyBillReportProps) {
  const reportMonthStart = startOfMonth(reportDate);
  const reportMonthEnd = endOfMonth(reportDate);
  const nextMonthStart = startOfMonth(addMonths(reportDate, 1));

  const billsDueInReportMonth = bills.filter(bill =>
    isWithinInterval(parseISO(bill.dueDate), { start: reportMonthStart, end: reportMonthEnd })
  ).sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  const totalBillsGenerated = billsDueInReportMonth.length;
  const totalAmountDue = billsDueInReportMonth.reduce((sum, bill) => sum + bill.amount, 0);

  const paidBillsFromDueInMonth = billsDueInReportMonth.filter(bill => bill.status === 'paid');
  const totalPaidAmountFromDueInMonth = paidBillsFromDueInMonth.reduce((sum, bill) => sum + bill.amount, 0);
  
  const outstandingAmount = totalAmountDue - totalPaidAmountFromDueInMonth;

  const lateFeesIncurred = billsDueInReportMonth.reduce((sum, bill) => sum + calculateLateFeeForBill(bill), 0);

  const billsPaidOnTime = paidBillsFromDueInMonth.filter(bill => {
    const dueDate = parseISO(bill.dueDate);
    const gracePeriodDays = bill.lateFeeGracePeriodDays ?? 0;
    const paymentDeadline = addDays(dueDate, gracePeriodDays);
    return bill.paidDate && parseISO(bill.paidDate) <= paymentDeadline;
  }).length;

  const billsPaidLate = paidBillsFromDueInMonth.length - billsPaidOnTime;
  
  const billsStillUnpaid = billsDueInReportMonth.filter(bill => bill.status === 'upcoming' || bill.status === 'overdue').length;


  const categoryMetrics: CategoryMetric[] = billsDueInReportMonth.reduce((acc, bill) => {
    const existingCategory = acc.find(item => item.category === bill.category);
    if (existingCategory) {
      existingCategory.totalAmount += bill.amount;
      existingCategory.count += 1;
    } else {
      acc.push({ category: bill.category, totalAmount: bill.amount, count: 1, percentage: 0 });
    }
    return acc;
  }, [] as Omit<CategoryMetric, 'percentage'>[]).map(cat => ({
      ...cat,
      percentage: totalAmountDue > 0 ? (cat.totalAmount / totalAmountDue) * 100 : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);


  const upcomingBillsNextMonth = bills.filter(bill => {
    const dueDate = parseISO(bill.dueDate);
    return (bill.status === 'upcoming' || bill.status === 'overdue') &&
           getMonth(dueDate) === getMonth(nextMonthStart) &&
           getYear(dueDate) === getYear(nextMonthStart);
  }).sort((a,b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      "Bill Name", "Category", "Due Date", "Amount (INR)", "Status", "Paid Date", 
      "Is Recurring", "Recurrence Frequency", "Notes", "Est. Late Fee (INR)"
    ];
    
    const csvRows = [headers.join(",")];

    billsDueInReportMonth.forEach(bill => {
      const row = [
        `"${bill.name.replace(/"/g, '""')}"`,
        bill.category,
        format(parseISO(bill.dueDate), "yyyy-MM-dd"),
        bill.amount,
        bill.status,
        bill.paidDate ? format(parseISO(bill.paidDate), "yyyy-MM-dd HH:mm") : "N/A",
        bill.isRecurring ? "Yes" : "No",
        bill.isRecurring && bill.recurrenceFrequency ? bill.recurrenceFrequency : "N/A",
        `"${(bill.notes || '').replace(/"/g, '""')}"`,
        calculateLateFeeForBill(bill).toFixed(2)
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Monthly_Bill_Report_${format(reportDate, "MMM_yyyy")}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const MetricCard = ({ title, value, icon: IconComp, description, valueClass }: { title: string; value: string | number; icon: React.ElementType; description?: string, valueClass?: string }) => (
    <Card className="shadow-sm print:shadow-none print:border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground print:text-xs">{title}</CardTitle>
        <IconComp className="h-4 w-4 text-muted-foreground print:h-3 print:w-3" />
      </CardHeader>
      <CardContent className="print:pb-2 print:pt-0">
        <div className={cn("text-xl sm:text-2xl font-bold print:text-base", valueClass)}>{typeof value === 'number' && title !== 'Total Bills Due' && title !== 'Bills Paid On Time' && title !== 'Bills Paid Late' && title !== 'Bills Still Unpaid' ? `₹${value.toLocaleString('en-IN')}` : value}</div>
        {description && <p className="text-xs text-muted-foreground print:text-xxs">{description}</p>}
      </CardContent>
    </Card>
  );


  return (
    <div className="print-visible-content space-y-6 p-1 md:p-4 print:p-2">
      <Card className="shadow-none border-0 md:border md:shadow-sm print:shadow-none print:border-0">
        <CardHeader className="print:pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start print:items-center">
            {/* Title and Description are now part of the PageHeader on the new page */}
            <div></div> {/* Placeholder for alignment if needed, or remove if header is fully on page */}
            <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 print-hidden">
                <Button variant="outline" asChild size="sm">
                    <Link href="/bill-tracker"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Bill Tracker</Link>
                </Button>
                <Button onClick={handlePrint} size="sm">
                    <Printer className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={handleExportCSV} size="sm">
                    <Download className="mr-2 h-4 w-4" /> Download CSV
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 print:pt-2">
          {/* Section 1: Summary Overview */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center print:text-base">
              <ListChecks className="mr-2 h-5 w-5 text-primary" />
              Overview for Bills Due in {format(reportDate, 'MMMM yyyy')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard title="Total Bills Due" value={totalBillsGenerated} icon={ListChecks} description="Bills scheduled this month" />
              <MetricCard title="Total Amount Due" value={totalAmountDue} icon={CircleDollarSign} />
              <MetricCard title="Total Paid (of due)" value={totalPaidAmountFromDueInMonth} icon={CheckCircle} valueClass="text-green-600 dark:text-green-500" />
              <MetricCard title="Outstanding Amount" value={outstandingAmount} icon={AlertTriangle} valueClass={outstandingAmount > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"}/>
              <MetricCard title="Late Fees Incurred (Est.)" value={lateFeesIncurred} icon={AlertTriangle} valueClass={lateFeesIncurred > 0 ? "text-red-600 dark:text-red-500" : ""} />
              <MetricCard title="Bills Paid On Time" value={billsPaidOnTime} icon={CheckCircle} description={`${totalBillsGenerated > 0 ? ((billsPaidOnTime / totalBillsGenerated) * 100).toFixed(0) : 0}% of due`} />
              <MetricCard title="Bills Paid Late" value={billsPaidLate} icon={Clock} valueClass={billsPaidLate > 0 ? "text-orange-500" : ""} />
              <MetricCard title="Bills Still Unpaid" value={billsStillUnpaid} icon={AlertTriangle} valueClass={billsStillUnpaid > 0 ? "text-red-600 dark:text-red-500" : ""} />
            </div>
          </section>

          {/* Section 2: Categorized Breakdown */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center print:text-base">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              Categorized Breakdown (Bills Due in {format(reportDate, 'MMMM yyyy')})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {categoryMetrics.length > 0 ? (
                <>
                  <div className="max-h-[300px] overflow-auto print:max-h-none print:overflow-visible">
                    <Table>
                      <TableHeader className="print:text-xs">
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center"># Bills</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="print:text-xs">
                        {categoryMetrics.map(cat => (
                          <TableRow key={cat.category}>
                            <TableCell className="font-medium py-1.5 print:py-1">{cat.category}</TableCell>
                            <TableCell className="text-center py-1.5 print:py-1">{cat.count}</TableCell>
                            <TableCell className="text-right py-1.5 print:py-1">₹{cat.totalAmount.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-right py-1.5 print:py-1">{cat.percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="h-[250px] w-full print:h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryMetrics}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={window.innerWidth < 768 || document.body.classList.contains('print-mode') ? 60 : 80}
                          fill="#8884d8"
                          dataKey="totalAmount"
                          nameKey="category"
                          label={({ name, percentage }) => `${name} (${(percentage || 0).toFixed(0)}%)`}
                        >
                          {categoryMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')} (${categoryMetrics.find(c=>c.category===name)?.percentage.toFixed(1)}%)`, name]}/>
                        <Legend wrapperStyle={{fontSize: '10px', paddingTop: '5px'}} layout="horizontal" align="center" verticalAlign="bottom" iconSize={8}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground print:text-sm col-span-full text-center py-4">No bills due in {format(reportDate, 'MMMM yyyy')} to categorize.</p>
              )}
            </div>
          </section>

          {/* Section 3: Detailed Bill List for Report Month */}
          <section>
             <h3 className="text-lg font-semibold mb-3 flex items-center print:text-base">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Detailed Bill List for {format(reportDate, 'MMMM yyyy')}
             </h3>
            {billsDueInReportMonth.length > 0 ? (
              <div className="max-h-[400px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="print:text-xs">
                    <TableRow>
                      <TableHead>Bill Name</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Est. Late Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="print:text-xs">
                    {billsDueInReportMonth.map(bill => {
                        const statusInfo = getBillStatusInfo(bill);
                        const lateFee = calculateLateFeeForBill(bill);
                        return (
                            <TableRow key={bill.id}>
                                <TableCell className="font-medium py-1.5 print:py-1">{bill.name}</TableCell>
                                <TableCell className="py-1.5 print:py-1">{format(parseISO(bill.dueDate), 'dd MMM, yy')}</TableCell>
                                <TableCell className="py-1.5 print:py-1">₹{bill.amount.toLocaleString('en-IN')}</TableCell>
                                <TableCell className="py-1.5 print:py-1">
                                    <Badge variant={statusInfo.isOverdue ? 'destructive' : (bill.status === 'paid' ? 'default' : 'outline')}
                                           className={cn("capitalize text-xs", statusInfo.textColorClass, statusInfo.color, bill.status === 'paid' && 'bg-green-500 hover:bg-green-600')}>
                                        {statusInfo.text}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 print:py-1">{bill.paidDate ? format(parseISO(bill.paidDate), 'dd MMM, yy HH:mm') : 'N/A'}</TableCell>
                                <TableCell className="py-1.5 print:py-1">{bill.category}</TableCell>
                                <TableCell className="text-right py-1.5 print:py-1">{lateFee > 0 ? `₹${lateFee.toLocaleString('en-IN')}` : '-'}</TableCell>
                            </TableRow>
                        );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground print:text-sm">No bills were due in {format(reportDate, 'MMMM yyyy')}.</p>
            )}
          </section>

          {/* Section 4: Upcoming Bills for Next Month */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center print:text-base">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" />
              Forecast: Upcoming Bills for {format(nextMonthStart, 'MMMM yyyy')}
            </h3>
            {upcomingBillsNextMonth.length > 0 ? (
              <div className="max-h-[250px] overflow-auto print:max-h-none print:overflow-visible">
                <Table>
                  <TableHeader className="print:text-xs">
                    <TableRow>
                      <TableHead>Bill Name</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="print:text-xs">
                    {upcomingBillsNextMonth.map(bill => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium py-1.5 print:py-1">{bill.name}</TableCell>
                        <TableCell className="py-1.5 print:py-1">{format(parseISO(bill.dueDate), 'dd MMM')}</TableCell>
                        <TableCell className="text-right py-1.5 print:py-1">₹{bill.amount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground print:text-sm">No bills currently scheduled for {format(nextMonthStart, 'MMMM yyyy')}.</p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to add print-mode class to body for chart resizing logic
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    document.body.classList.add('print-mode');
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-mode');
  });
}
