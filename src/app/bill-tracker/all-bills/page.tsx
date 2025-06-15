
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { z } from 'zod';
import type { BillItem } from '@/types/finance';
import { BillFormSchema, BILL_STATUSES } from '@/types/finance';
import { getBillItems, addBillItem as addBillItemStorage, updateBillItem, deleteBillItem } from '@/lib/bill-storage'; // Aliased addBillItem
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Loader2, Info, CheckCircle, ArrowLeft, ListFilter, X } from 'lucide-react';
import { BillForm } from '@/components/bill-tracker/BillForm';
import { BillCard } from '@/components/bill-tracker/BillCard';
import { getBillStatusInfo } from '@/components/bill-tracker/BillTrackerClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from '@/components/shared/PageHeader';
import withAuth from '@/components/auth/withAuth';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BILL_CATEGORIES, BILL_RECURRENCE_FREQUENCIES } from '@/types/finance';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { addMonths, parseISO, format } from 'date-fns'; // Added imports for auto-creation

const ALL_CATEGORIES_SENTINEL = "__ALL_CATEGORIES__";
const ALL_STATUSES_SENTINEL = "__ALL_STATUSES__";
const ALL_RECURRENCE_SENTINEL = "__ALL_RECURRENCE__";

function AllBillsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillItem | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRecurrence, setFilterRecurrence] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);


  const fetchBills = useCallback(async () => {
    if (!user) {
      setBills([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      let fetchedBills = await getBillItems(user.uid);
      fetchedBills = fetchedBills.map(bill => {
        // Auto-update status to 'overdue' if past due and still 'upcoming'
        if (bill.status === 'upcoming' && new Date(bill.dueDate) < new Date() && bill.dueDate.split('T')[0] !== new Date().toISOString().split('T')[0]) {
          return { ...bill, status: 'overdue' as typeof BILL_STATUSES[number] };
        }
        return bill;
      });
      setBills(fetchedBills);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      toast({ title: "Error", description: "Could not load your bills.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const autoCreateNextMonthlyBill = async (originalBill: BillItem) => {
    if (!user) return;
    if (originalBill.isRecurring && originalBill.recurrenceFrequency === 'monthly') {
      try {
        const nextDueDate = addMonths(parseISO(originalBill.dueDate), 1);
        const newBillInstance: Omit<BillItem, 'id' | 'userId'> = {
          name: originalBill.name,
          amount: originalBill.amount,
          category: originalBill.category,
          dueDate: nextDueDate.toISOString(),
          isRecurring: true,
          recurrenceFrequency: 'monthly',
          reminderDaysBefore: originalBill.reminderDaysBefore,
          status: 'upcoming',
          notes: originalBill.notes,
          paidDate: null,
        };
        await addBillItemStorage(user.uid, newBillInstance);
        toast({
          title: "Next Bill Scheduled",
          description: `Next instance of "${originalBill.name}" for ${format(nextDueDate, 'MMM yyyy')} has been created.`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      } catch (error) {
        console.error("Failed to auto-create next bill instance:", error);
        toast({
          title: "Auto-Creation Failed",
          description: `Could not automatically create the next instance for "${originalBill.name}".`,
          variant: "destructive",
        });
      }
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof BillFormSchema>) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsMutating(true);

    const billDataBase = {
      name: values.name,
      amount: parseFloat(values.amount),
      category: values.category,
      dueDate: values.dueDate.toISOString(),
      isRecurring: values.isRecurring,
      recurrenceFrequency: values.isRecurring ? values.recurrenceFrequency : undefined,
      reminderDaysBefore: parseInt(values.reminderDaysBefore),
      status: values.status,
      notes: values.notes,
    };

    try {
      if (editingBill) {
        const updates: Partial<Omit<BillItem, 'id'|'userId'>> = { ...billDataBase };
        if (values.status === 'paid' && !editingBill.paidDate) {
            updates.paidDate = new Date().toISOString();
        } else if (values.status !== 'paid') {
            updates.paidDate = null;
        } else if (editingBill.paidDate && values.status === 'paid') {
            updates.paidDate = editingBill.paidDate;
        }
        await updateBillItem(user.uid, editingBill.id, updates);
        toast({ title: "Success", description: "Bill updated.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
        if (updates.status === 'paid') {
            const updatedBillForAutoCreate = { ...editingBill, ...updates, dueDate: editingBill.dueDate };
            await autoCreateNextMonthlyBill(updatedBillForAutoCreate as BillItem);
        }
      } else {
        const newBillData = { ...billDataBase, paidDate: values.status === 'paid' ? new Date().toISOString() : null };
        const newBill = await addBillItemStorage(user.uid, newBillData as Omit<BillItem, 'id' | 'userId'>);
        toast({ title: "Success", description: "New bill added.", icon: <CheckCircle className="h-5 w-5 text-green-500"/> });
        if (newBill.status === 'paid') {
            await autoCreateNextMonthlyBill(newBill);
        }
      }
      setIsFormOpen(false);
      setEditingBill(null);
      await fetchBills();
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast({ title: "Error", description: "Could not save the bill.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditBill = (bill: BillItem) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!user) return;
    setIsMutating(true);
    try {
      await deleteBillItem(user.uid, billId);
      toast({ title: "Bill Deleted", description: "The bill has been removed." });
      await fetchBills();
    } catch (error) {
      console.error("Failed to delete bill:", error);
      toast({ title: "Error", description: "Could not delete the bill.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const openNewBillForm = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (billId: string, newStatus: typeof BILL_STATUSES[number]) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const billToUpdate = bills.find(b => b.id === billId);
    if (!billToUpdate) {
      toast({ title: "Error", description: "Bill not found.", variant: "destructive" });
      return;
    }

    setIsMutating(true);
    const updates: Partial<Omit<BillItem, 'id'|'userId'>> = { status: newStatus };
    if (newStatus === 'paid' && !billToUpdate.paidDate) {
      updates.paidDate = new Date().toISOString();
    } else if (newStatus !== 'paid') {
      updates.paidDate = null;
    }

    try {
      await updateBillItem(user.uid, billId, updates);
      toast({ title: "Status Updated", description: `Bill "${billToUpdate.name}" status changed to ${newStatus}.`, icon: <CheckCircle className="h-5 w-5 text-green-500"/> });

      if (newStatus === 'paid') {
        const billJustPaid = { ...billToUpdate, status: 'paid', paidDate: updates.paidDate || new Date().toISOString() };
        await autoCreateNextMonthlyBill(billJustPaid);
      }
      await fetchBills();
    } catch (error) {
      console.error("Failed to update bill status:", error);
      toast({ title: "Error", description: "Could not update bill status.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleLogContribution = async (billId: string, amount: number) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const billToUpdate = bills.find(b => b.id === billId);
    if (!billToUpdate) {
      toast({ title: "Error", description: "Selected bill not found for contribution.", variant: "destructive" });
      return;
    }
    setIsMutating(true);
    const updates: Partial<Omit<BillItem, 'id'|'userId'>> = {
        status: 'paid',
        paidDate: new Date().toISOString(),
    };
    try {
      await updateBillItem(user.uid, billId, updates);
      toast({
        title: "Payment Logged!",
        description: `Bill "${billToUpdate.name}" marked as paid.`,
        icon: <CheckCircle className="h-5 w-5 text-green-500"/>
      });
      const billJustPaid = { ...billToUpdate, status: 'paid', paidDate: updates.paidDate || new Date().toISOString() };
      await autoCreateNextMonthlyBill(billJustPaid);
      await fetchBills();
    } catch (error) {
      console.error("Failed to log payment:", error);
      toast({ title: "Error", description: "Could not log payment.", variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const searchTermMatch = bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (bill.notes && bill.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const categoryMatch = filterCategory ? bill.category === filterCategory : true;
      const statusMatch = filterStatus ? bill.status === filterStatus : true;
      const recurrenceMatch = filterRecurrence ?
        (filterRecurrence === 'recurring' && bill.isRecurring) || (filterRecurrence === 'one-time' && !bill.isRecurring)
        : true;
      return searchTermMatch && categoryMatch && statusMatch && recurrenceMatch;
    });
  }, [bills, searchTerm, filterCategory, filterStatus, filterRecurrence]);


  const upcomingBills = useMemo(() => filteredBills.filter(b => b.status === 'upcoming' || b.status === 'overdue').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()), [filteredBills]);
  const paidBills = useMemo(() => filteredBills.filter(b => b.status === 'paid' || b.status === 'cancelled').sort((a,b) => {
    const dateA = a.paidDate || a.dueDate;
    const dateB = b.paidDate || b.dueDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  }), [filteredBills]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterRecurrence('');
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
         <PageHeader title="All Bills List" description="View, manage, and filter all your bills." />
         <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/bill-tracker"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Calendar</Link>
            </Button>
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingBill(null); }}>
            <DialogTrigger asChild>
                <Button onClick={openNewBillForm} disabled={isMutating} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Bill
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                <DialogTitle>{editingBill ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
                <DialogDescription>
                    {editingBill ? 'Update the details of your bill.' : 'Enter the details for your new bill.'}
                </DialogDescription>
                </DialogHeader>
                <BillForm
                    onSubmit={handleFormSubmit}
                    defaultValues={editingBill || undefined}
                    isLoading={isMutating}
                    onClose={() => setIsFormOpen(false)}
                />
            </DialogContent>
            </Dialog>
         </div>
      </div>

        <div className="p-4 border rounded-lg bg-card shadow space-y-4">
            <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold">Filters</h3>
                 <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} size="sm">
                    {showFilters ? <X className="mr-2 h-4 w-4" /> : <ListFilter className="mr-2 h-4 w-4" />}
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                 </Button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <Input
                        placeholder="Search by name or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="text-sm"
                    />
                    <Select
                      value={filterCategory === '' ? ALL_CATEGORIES_SENTINEL : filterCategory}
                      onValueChange={(valueFromSelect) => {
                        if (valueFromSelect === ALL_CATEGORIES_SENTINEL) {
                          setFilterCategory('');
                        } else {
                          setFilterCategory(valueFromSelect);
                        }
                      }}
                    >
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Filter by Category" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_CATEGORIES_SENTINEL}>All Categories</SelectItem>
                            {BILL_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                      value={filterStatus === '' ? ALL_STATUSES_SENTINEL : filterStatus}
                      onValueChange={(valueFromSelect) => {
                        if (valueFromSelect === ALL_STATUSES_SENTINEL) {
                          setFilterStatus('');
                        } else {
                          setFilterStatus(valueFromSelect);
                        }
                      }}
                    >
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_STATUSES_SENTINEL}>All Statuses</SelectItem>
                            {BILL_STATUSES.map(stat => <SelectItem key={stat} value={stat} className="capitalize">{stat.replace('-', ' ')}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                      value={filterRecurrence === '' ? ALL_RECURRENCE_SENTINEL : filterRecurrence}
                      onValueChange={(valueFromSelect) => {
                        if (valueFromSelect === ALL_RECURRENCE_SENTINEL) {
                          setFilterRecurrence('');
                        } else {
                          setFilterRecurrence(valueFromSelect);
                        }
                      }}
                    >
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Filter by Recurrence" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_RECURRENCE_SENTINEL}>All Types</SelectItem>
                            <SelectItem value="recurring">Recurring</SelectItem>
                            <SelectItem value="one-time">One-Time</SelectItem>
                        </SelectContent>
                    </Select>
                     <Button onClick={clearFilters} variant="outline" size="sm" className="col-span-full md:col-span-1 justify-self-end">Clear Filters</Button>
                </div>
            )}
        </div>


      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming & Overdue ({upcomingBills.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid & Cancelled ({paidBills.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcomingBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {upcomingBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEditBill}
                  onDelete={handleDeleteBill}
                  onStatusChange={handleStatusChange}
                  onLogContribution={handleLogContribution}
                  isLoading={isMutating}
                  statusInfo={getBillStatusInfo(bill)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">No upcoming or overdue bills match your filters.</div>
          )}
        </TabsContent>
        <TabsContent value="paid">
          {paidBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {paidBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEditBill}
                  onDelete={handleDeleteBill}
                  onStatusChange={handleStatusChange}
                  onLogContribution={handleLogContribution}
                  isLoading={isMutating}
                  statusInfo={getBillStatusInfo(bill)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">No paid or cancelled bills match your filters.</div>
          )}
        </TabsContent>
      </Tabs>

      {(bills.length === 0 && !isLoadingData) && (
         <div className="text-center py-10 bg-muted/30 rounded-lg">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bills found.</p>
              <p className="text-sm text-muted-foreground">Add a new bill to start tracking!</p>
            </div>
      )}
    </div>
  );
}

export default withAuth(AllBillsPage);

    