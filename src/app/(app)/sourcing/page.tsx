
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SourcingItemsTable } from "@/components/sourcing/SourcingItemsTable";
import { KanbanBySourcingStatusView } from "@/components/sourcing/KanbanBySourcingStatusView";
import type { SourcedItemWish, SourcedItemStatus, Supplier } from "@/lib/types";
import { SOURCING_OPPORTUNITIES_KEY, RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants"; 
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
import { PlusCircle, Search, LayoutGrid, ListChecks } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import type { InventoryItem } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "table" | "kanban";

export default function SourcingPage() {
  const [opportunityItems, setOpportunityItems] = useState<SourcedItemWish[]>([]); 
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { toast } = useToast();
  const router = useRouter();

  const loadSourcingData = useCallback(() => {
    const storedOpportunities = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY); 
    if (storedOpportunities) {
      try {
        const parsedItems = JSON.parse(storedOpportunities);
        setOpportunityItems(Array.isArray(parsedItems) ? parsedItems.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()) : []);
      } catch (e) {
        console.error("Error parsing sourcing opportunities:", e);
        setOpportunityItems([]);
      }
    } else {
      localStorage.setItem(SOURCING_OPPORTUNITIES_KEY, JSON.stringify([])); 
      setOpportunityItems([]);
    }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        setAllSuppliers(JSON.parse(storedSuppliers));
      } catch (e) {
        console.error("Error parsing suppliers for sourcing page:", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
      }
    } else {
      localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
      setAllSuppliers(DEFAULT_SUPPLIERS);
    }
  }, []);

  useEffect(() => {
    loadSourcingData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SOURCING_OPPORTUNITIES_KEY || event.key === RESELLER_SUPPLIERS_KEY) { 
        loadSourcingData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSourcingData]);

  const persistOpportunityItems = useCallback((updatedItems: SourcedItemWish[]) => { 
    const sortedItems = updatedItems.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    localStorage.setItem(SOURCING_OPPORTUNITIES_KEY, JSON.stringify(sortedItems)); 
    window.dispatchEvent(new StorageEvent('storage', { key: SOURCING_OPPORTUNITIES_KEY, newValue: JSON.stringify(sortedItems), storageArea: localStorage })); 
    setOpportunityItems(sortedItems); // State update for immediate reflection
  }, []);

  const handleEdit = useCallback((itemId: string) => { 
    router.push(`/sourcing/add?editId=${itemId}`);
  }, [router]);

  const handleDelete = useCallback((itemId: string) => {
    setItemToDelete(itemId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (itemToDelete) {
      const itemDetails = opportunityItems.find(item => item.id === itemToDelete)?.itemName || 'Opportunity'; 
      const updatedItems = opportunityItems.filter((item) => item.id !== itemToDelete); 
      persistOpportunityItems(updatedItems); 
      toast({ title: "Opportunity Deleted", description: `Opportunity "${itemDetails}" has been removed.`, variant: "destructive" });
      setItemToDelete(null);
    }
  }, [itemToDelete, opportunityItems, persistOpportunityItems, toast]);

  const handleConvertToInventory = useCallback((sourcedItem: SourcedItemWish) => {
    if (sourcedItem.status !== 'Completed') {
      toast({ title: "Cannot Convert", description: "Opportunity must be 'Completed' to convert to inventory.", variant: "destructive" });
      return;
    }

    const newInventoryItem: Partial<InventoryItem> = {
      name: sourcedItem.itemName,
      quantity: 1, 
      price: sourcedItem.targetBuyPrice || 0,
      totalPurchaseCost: sourcedItem.targetBuyPrice || 0, 
      status: 'Pending',
      source: "Sourced Opportunities", 
      supplierId: sourcedItem.supplierId,
      additionalNotes: `Originally from Sourcing Opportunities. Notes: ${sourcedItem.notes || 'N/A'}. Potential Sources: ${sourcedItem.potentialSources || 'N/A'}`,
      dateAdded: new Date().toISOString(),
      purchaseDate: sourcedItem.targetDate || new Date().toISOString(),
    };
    
    const queryParams = new URLSearchParams({ initialData: JSON.stringify(newInventoryItem) }).toString();
    router.push(`/inventory/add?${queryParams}`);
    
    toast({ title: "Redirecting to Inventory", description: `Preparing to add "${sourcedItem.itemName}" to inventory.` });
  }, [router, toast]);

  const handleUpdateOpportunityStatus = useCallback((opportunityId: string, newStatus: SourcedItemStatus) => {
    setOpportunityItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.id === opportunityId ? { ...item, status: newStatus, dateUpdated: new Date().toISOString() } : item
      );
      persistOpportunityItems(updatedItems);
      return updatedItems;
    });
    const opportunityName = opportunityItems.find(item => item.id === opportunityId)?.itemName || "Opportunity";
    toast({ title: "Opportunity Status Updated", description: `"${opportunityName}" moved to ${newStatus}.` });
  }, [opportunityItems, persistOpportunityItems, toast]);


  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-var(--header-height,4rem)-2rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Search className="h-8 w-8" /> Sourcing Opportunities
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table"><ListChecks className="mr-2 h-4 w-4" />Table</TabsTrigger>
              <TabsTrigger value="kanban"><LayoutGrid className="mr-2 h-4 w-4" />Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => router.push('/sourcing/add')} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Opportunity
          </Button>
        </div>
      </div>
      
      <div className="flex-grow overflow-hidden">
        {viewMode === 'table' ? (
          <SourcingItemsTable
            items={opportunityItems} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            onConvertToInventory={handleConvertToInventory}
          />
        ) : (
          <KanbanBySourcingStatusView
            opportunities={opportunityItems}
            allSuppliers={allSuppliers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateOpportunityStatus}
            onConvertToInventory={handleConvertToInventory}
            className="h-full"
          />
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this sourcing opportunity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Opportunity
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
