"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InvoicesTable } from "@/components/expenses/InvoicesTable";
import { InvoiceForm } from "@/components/expenses/InvoiceForm";
import type { Invoice, InventoryItem } from "@/lib/types";
import { RESELLER_INVOICES_KEY, RESELLER_INVENTORY_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, Edit } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription as UiSheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from 'date-fns';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(() => {
    const storedInvoices = localStorage.getItem(RESELLER_INVOICES_KEY);
    if (storedInvoices) {
      try {
        const parsedInvoices = JSON.parse(storedInvoices);
        setInvoices(Array.isArray(parsedInvoices) ? parsedInvoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []);
      } catch (e) {
        console.error("Error parsing invoices from localStorage:", e);
        setInvoices([]);
      }
    } else {
      localStorage.setItem(RESELLER_INVOICES_KEY, JSON.stringify([]));
      setInvoices([]);
    }
    
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) {
      try {
        setInventoryItems(JSON.parse(storedInventory));
      } catch (e) {
        setInventoryItems([]);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_INVOICES_KEY || event.key === RESELLER_INVENTORY_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  const persistInvoices = useCallback((updatedInvoices: Invoice[]): boolean => {
    try {
      const sortedInvoices = updatedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(RESELLER_INVOICES_KEY, JSON.stringify(sortedInvoices));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVOICES_KEY, newValue: JSON.stringify(sortedInvoices), storageArea: localStorage }));
      setInvoices(sortedInvoices);
      return true;
    } catch (e: any) {
      toast({
        title: "Error Saving Invoices",
        description: `An unexpected error occurred: ${e.message}`,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);
  
  const handleAddInvoice = useCallback((invoiceData: Invoice) => {
    if (persistInvoices([...invoices, invoiceData])) {
      toast({ title: "Invoice Added", description: `Invoice from ${format(parseISO(invoiceData.date), "PPP")} has been saved.` });
      setIsAddSheetOpen(false);
    }
  }, [invoices, persistInvoices, toast]);

  const handleUpdateInvoice = useCallback((updatedInvoiceData: Invoice) => {
    const newInvoices = invoices.map(inv => inv.id === updatedInvoiceData.id ? updatedInvoiceData : inv);
    if (persistInvoices(newInvoices)) {
      toast({ title: "Invoice Updated", description: `Invoice from ${format(parseISO(updatedInvoiceData.date), "PPP")} has been updated.` });
      setIsEditSheetOpen(false);
      setEditingInvoice(undefined);
    }
  }, [invoices, persistInvoices, toast]);

  const handleEdit = useCallback((invoiceId: string) => {
    const invoiceToEdit = invoices.find(inv => inv.id === invoiceId);
    if (invoiceToEdit) {
      setEditingInvoice(invoiceToEdit);
      setIsEditSheetOpen(true);
    }
  }, [invoices]);

  const handleDelete = useCallback((invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (invoiceToDelete) {
      const invoiceDetails = invoices.find(inv => inv.id === invoiceToDelete);
      const updatedInvoices = invoices.filter((inv) => inv.id !== invoiceToDelete);
      if (persistInvoices(updatedInvoices)) {
        toast({ title: "Invoice Deleted", description: `Invoice from ${invoiceDetails ? format(parseISO(invoiceDetails.date), "PPP") : ''} has been removed.`, variant: "destructive" });
        setInvoiceToDelete(null);
      }
    }
  }, [invoiceToDelete, invoices, persistInvoices, toast]);

  return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <FileText className="h-8 w-8" /> Invoices
          </h1>
          <Button onClick={() => setIsAddSheetOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Invoice
          </Button>
        </div>
        
        <InvoicesTable invoices={invoices} onEdit={handleEdit} onDelete={handleDelete} />

        <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
          <SheetContent className="w-full sm:max-w-3xl p-0">
            <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
              <SheetTitle>Add New Invoice</SheetTitle>
              <UiSheetDescription>Enter invoice details. You can link line items to inventory.</UiSheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
              <div className="p-6">
                <InvoiceForm onSubmit={handleAddInvoice} onCancel={() => setIsAddSheetOpen(false)} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Sheet open={isEditSheetOpen} onOpenChange={(isOpen) => { setIsEditSheetOpen(isOpen); if (!isOpen) setEditingInvoice(undefined); }}>
          <SheetContent className="w-full sm:max-w-3xl p-0">
            <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
              <SheetTitle>Edit Invoice</SheetTitle>
              <UiSheetDescription>Update details for this invoice.</UiSheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
              <div className="p-6">
                <InvoiceForm onSubmit={handleUpdateInvoice} initialData={editingInvoice} onCancel={() => {setIsEditSheetOpen(false); setEditingInvoice(undefined);}} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        
        <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the invoice record.
                It will not affect any linked inventory items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
