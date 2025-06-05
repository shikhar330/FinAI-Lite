
'use client';
import { useState } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { IncomeItem } from '@/types/finance';
import { IncomeForm, incomeSchema } from './IncomeForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';

interface IncomeSectionProps {
  incomeItems: IncomeItem[];
  onAdd: (values: z.infer<typeof incomeSchema>) => Promise<void>;
  onUpdate: (id: string, values: z.infer<typeof incomeSchema>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function IncomeSection({ incomeItems, onAdd, onUpdate, onDelete, isLoading }: IncomeSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);

  const handleFormSubmit = async (values: z.infer<typeof incomeSchema>) => {
    if (editingItem) {
      await onUpdate(editingItem.id, values);
    } else {
      await onAdd(values);
    }
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: IncomeItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };
  
  const openFormForNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Income Sources</CardTitle>
            <CardDescription>Manage your various sources of income.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if(!isOpen) setEditingItem(null);}}>
            <DialogTrigger asChild>
              <Button onClick={openFormForNew} disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Income Source' : 'Add New Income Source'}</DialogTitle>
              </DialogHeader>
              <IncomeForm onSubmit={handleFormSubmit} defaultValues={editingItem || undefined} isLoading={isLoading} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {incomeItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No income sources added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{item.frequency}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isLoading}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the income source "{item.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
