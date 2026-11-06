
"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SourcingItemForm } from "@/components/sourcing/SourcingItemForm";
import type { SourcedItemWish } from "@/lib/types";
import { SOURCING_OPPORTUNITIES_KEY } from "@/lib/constants"; 
import { useToast } from "@/hooks/use-toast";

function AddSourcingItemContent() {
  const [opportunityItems, setOpportunityItems] = useState<SourcedItemWish[]>([]); 
  const [editingItem, setEditingItem] = useState<SourcedItemWish | undefined>(undefined);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const editIdFromUrl = useMemo(() => {
    return searchParams?.get('editId')?.trim() || null;
  }, [searchParams]);

  // isLoadingEditItem is true if we have an editId and haven't finished attempting to load it.
  const [isLoadingEditItem, setIsLoadingEditItem] = useState<boolean>(!!editIdFromUrl);

  // Effect to load the main list of opportunity items from localStorage
  useEffect(() => {
    const currentEditIdForInitCheck = searchParams?.get('editId')?.trim() || null;

    const storedOpportunities = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY); 
    if (storedOpportunities) {
      try {
        const parsedItems = JSON.parse(storedOpportunities);
        setOpportunityItems(Array.isArray(parsedItems) ? parsedItems : []);
      } catch (e) {
        console.error("Error parsing sourcing opportunities for add/edit page:", e);
        setOpportunityItems([]);
      }
    } else {
      // IMPORTANT: Only initialize localStorage with an empty array if we are NOT trying to edit.
      // If an editId is present, we assume the item *should* exist, and the other effect will handle "not found".
      if (!currentEditIdForInitCheck) {
        try {
          localStorage.setItem(SOURCING_OPPORTUNITIES_KEY, JSON.stringify([])); 
        } catch (e: any) { /* Handle potential error during initial setItem */ }
      }
      setOpportunityItems([]); // Still set local state to empty if nothing was loaded
    }

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === SOURCING_OPPORTUNITIES_KEY) { 
            const newStoredOpportunities = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY); 
            if (newStoredOpportunities) {
                try {
                    setOpportunityItems(JSON.parse(newStoredOpportunities));
                } catch (e) {
                    console.error("Error parsing updated sourcing opportunities:", e);
                    setOpportunityItems([]);
                }
            } else {
                setOpportunityItems([]);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [searchParams]); // Depend on searchParams to re-check if we should initialize localStorage

  // Effect to handle setting the editingItem based on editIdFromUrl
  useEffect(() => {
    if (editIdFromUrl) {
      setIsLoadingEditItem(true); // Set loading true when we start processing an editId
      
      let itemToEdit: SourcedItemWish | undefined = undefined;
      try {
        const storedOpportunitiesRaw = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY);
        if (storedOpportunitiesRaw) {
          const parsedLocalStorageOpportunities: SourcedItemWish[] = JSON.parse(storedOpportunitiesRaw);
          if (Array.isArray(parsedLocalStorageOpportunities)) {
            itemToEdit = parsedLocalStorageOpportunities.find(item => item.id === editIdFromUrl);
          }
        }
      } catch (e) {
        console.error("[EditMode Sourcing] Error parsing localStorage for edit item:", e);
      }

      if (itemToEdit) {
        setEditingItem(itemToEdit);
      } else {
        // Item not found after attempting.
        setEditingItem(undefined); // Ensure editingItem is cleared before redirecting
        // Use a microtask to defer navigation and toast to avoid React update-during-render warnings.
        Promise.resolve().then(() => {
            toast({ title: "Not Found", description: `Opportunity item with ID "${editIdFromUrl}" not found. Opening a new item form.`, variant: "destructive" });
            router.replace('/sourcing/add');
        });
      }
      setIsLoadingEditItem(false); // Done processing this editId
    } else {
      // No editIdFromUrl, so we are in "add new" mode or have been redirected.
      setEditingItem(undefined);
      setIsLoadingEditItem(false); 
    }
  }, [editIdFromUrl, router, toast]); 

  const persistOpportunityItems = (updatedItems: SourcedItemWish[]): boolean => { 
    const sortedItems = updatedItems.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    try {
      localStorage.setItem(SOURCING_OPPORTUNITIES_KEY, JSON.stringify(sortedItems)); 
      window.dispatchEvent(new StorageEvent('storage', { key: SOURCING_OPPORTUNITIES_KEY, newValue: JSON.stringify(sortedItems), storageArea: localStorage })); 
      setOpportunityItems(sortedItems);
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not save sourcing opportunity. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Opportunity",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleAddItem = (item: SourcedItemWish) => {
    const newItemWithId = { ...item, id: crypto.randomUUID(), dateAdded: new Date().toISOString(), dateUpdated: new Date().toISOString() };
    const newItems = [...opportunityItems, newItemWithId]; 
    if (persistOpportunityItems(newItems)) { 
      toast({ title: "Opportunity Item Added", description: `"${item.itemName}" added to your sourcing opportunities.` });
      router.push('/sourcing');
    }
  };

  const handleUpdateItem = (updatedItem: SourcedItemWish) => {
    const newItems = opportunityItems.map((item) => (item.id === updatedItem.id ? {...updatedItem, dateUpdated: new Date().toISOString()} : item)); 
    if (persistOpportunityItems(newItems)) { 
      setEditingItem(undefined); // Clear editing state
      toast({ title: "Opportunity Item Updated", description: `"${updatedItem.itemName}" has been updated.` });
      router.push('/sourcing');
    }
  };
  
  const handleSubmitForm = (data: SourcedItemWish) => {
    if (editingItem && editingItem.id === data.id) { 
      handleUpdateItem(data); 
    } else if (!editingItem) { 
      handleAddItem(data); 
    }
  };
  
  if (isLoadingEditItem && editIdFromUrl) {
    return <div className="text-center py-10">Loading item for editing...</div>;
  }

  return (
    <div className="space-y-8">
      <SourcingItemForm 
        onSubmit={handleSubmitForm} 
        initialData={editingItem} 
        key={editingItem?.id || 'new-sourcing-item-form'} 
      />
    </div>
  );
}

export default function AddSourcingItemPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <AddSourcingItemContent />
    </Suspense>
  )
}
    