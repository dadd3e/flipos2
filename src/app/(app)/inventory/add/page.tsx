
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { InventoryForm } from "@/components/inventory/InventoryForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { RESELLER_INVENTORY_KEY } from '@/lib/constants';

// Approx. 7MB string length for a ~5MB binary image (Base64 is ~33% larger)
const MAX_IMAGE_DATA_URI_LENGTH = 7 * 1000 * 1000; 

function AddInventoryItemContent() {
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [isLoadingEditItem, setIsLoadingEditItem] = useState<boolean>(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Effect to handle setting the editingItem based on URL search parameter (editId)
  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const rawEditId = searchParams.get('editId');
    const editId = rawEditId ? rawEditId.trim() : null;

    if (editId) {
      setIsLoadingEditItem(true);
      let itemToEdit: InventoryItem | undefined = undefined;
      try {
        const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
        if (storedInventoryRaw) {
          const parsedLocalStorageInventory: InventoryItem[] = JSON.parse(storedInventoryRaw);
          if (Array.isArray(parsedLocalStorageInventory)) {
            itemToEdit = parsedLocalStorageInventory.find(item => item.id === editId);
          } else {
            console.error("[EditMode] Inventory in localStorage is not an array. Data:", parsedLocalStorageInventory);
            localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify([]));
          }
        }
      } catch (e) {
        console.error("[EditMode] Error parsing localStorage for edit item:", e);
        toast({ title: "Error", description: "Could not load item for editing due to a data parsing error. Check console.", variant: "destructive" });
      }

      if (itemToEdit) {
        setEditingItem(itemToEdit);
      } else {
        console.warn(`[EditMode] Inventory item with ID "${editId}" not found. Opening a new item form.`);
        toast({ title: "Not Found", description: `Inventory item with ID "${editId}" not found. Opening a new item form.`, variant: "destructive" });
        router.replace('/inventory/add');
        setEditingItem(undefined);
      }
      setIsLoadingEditItem(false);
    } else {
      setEditingItem(undefined);
      setIsLoadingEditItem(false);
    }
  }, [searchParams, router, toast]);


  const handleAddItem = (item: InventoryItem, shouldNavigate: boolean = true) => {
    const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
    let currentInventory: InventoryItem[] = [];
    if (storedInventoryRaw) {
        try {
            const parsed = JSON.parse(storedInventoryRaw);
            if (Array.isArray(parsed)) {
              currentInventory = parsed;
            } else {
              console.error("Inventory in localStorage is not an array when adding item. Data:", parsed);
            }
        } catch (e) {
          console.error("Failed to parse inventory before adding new item:", e);
        }
    }

    const itemToSave = { ...item };
    let imageOmitted = false;

    if (itemToSave.itemImageUrl && itemToSave.itemImageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
      console.warn(`Image for item "${itemToSave.name}" is too large (${itemToSave.itemImageUrl.length} chars) and will be omitted from localStorage.`);
      itemToSave.itemImageUrl = undefined;
      imageOmitted = true;
    }
    
    const newInventory = [...currentInventory, itemToSave];
    try {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(newInventory));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(newInventory), storageArea: localStorage }));
      toast({ 
        title: "Item Added", 
        description: imageOmitted 
          ? `${item.name} added to inventory (image too large, not saved).`
          : `${item.name} has been added to your inventory.`
      });
      if (shouldNavigate) {
        router.push('/inventory');
      }
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not add item. Browser local storage is full. Please export and clear some data (e.g., from Settings > Data Management).",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Item",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
    let currentInventory: InventoryItem[] = [];
     if (storedInventoryRaw) {
        try {
            const parsed = JSON.parse(storedInventoryRaw);
            if (Array.isArray(parsed)) {
              currentInventory = parsed;
            } else {
              console.error("Inventory in localStorage is not an array when updating item. Data:", parsed);
            }
        } catch (e) {
          console.error("Failed to parse inventory before updating item:", e);
        }
    }

    const itemToSave = { ...updatedItem };
    let imageOmitted = false;

    if (itemToSave.itemImageUrl && itemToSave.itemImageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
      console.warn(`Image for item "${itemToSave.name}" is too large (${itemToSave.itemImageUrl.length} chars) and will be omitted from localStorage update.`);
      itemToSave.itemImageUrl = undefined; // Or keep existing if already undefined
      imageOmitted = true;
    }

    const newInventory = currentInventory.map((item) => (item.id === itemToSave.id ? itemToSave : item));
    try {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(newInventory));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(newInventory), storageArea: localStorage }));
      setEditingItem(undefined);
      toast({ 
        title: "Item Updated", 
        description: imageOmitted
          ? `${updatedItem.name} has been updated (image too large, not saved).`
          : `${updatedItem.name} has been updated.` 
      });
      router.push('/inventory');
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not update item. Browser local storage is full. Please export and clear some data (e.g., from Settings > Data Management).",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Item",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (data: InventoryItem, submitAction: 'saveAndClose' | 'saveAndAddNew') => {
    if (editingItem && editingItem.id === data.id) {
      handleUpdateItem(data);
    } else {
      const newItem = { ...data, id: crypto.randomUUID(), dateAdded: new Date().toISOString() };
      handleAddItem(newItem, submitAction === 'saveAndClose');
    }
  };

  if (isLoadingEditItem && searchParams && searchParams.get('editId')) {
    return <div className="text-center py-10">Loading item for editing...</div>;
  }

  return (
    <div className="space-y-8">
      <InventoryForm
        onSubmit={handleSubmit}
        initialData={editingItem}
        key={editingItem?.id || 'new-item-form'}
      />
    </div>
  );
}

export default function AddInventoryItemPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <AddInventoryItemContent />
    </Suspense>
  )
}
