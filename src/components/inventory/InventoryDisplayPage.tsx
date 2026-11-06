
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryTable, type InventoryTableColumnKey, type ColumnDefinition } from "@/components/inventory/InventoryTable";
import type { InventoryItem, ItemStatus, Supplier, SoldViaPlatformValue } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Search, ListFilter, XCircle, ViewIcon, PlusCircle, Edit3, Store } from "lucide-react";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { EtsySyncDialog } from "@/components/etsy/EtsySyncDialog";
import { 
    RESELLER_INVENTORY_KEY, 
    RESELLER_CATEGORIES_KEY, 
    DEFAULT_CATEGORIES, 
    ITEM_SOURCES, 
    RESELLER_SUPPLIERS_KEY, 
    DEFAULT_SUPPLIERS,
    SOLD_VIA_PLATFORMS,
    RESELLER_SALES_KEY
} from '@/lib/constants';
import { reconcileInventoryAndSales, syncCOGSFromInventoryToSales } from '@/lib/inventorySalesSync';

interface InventoryDisplayPageProps {
  statusFilter: ItemStatus;
  pageTitle: string;
  emptyStateMessage: string;
}

const ALL_TABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'image', label: 'Image', defaultVisible: true, isToggleable: true },
  { id: 'nameOnInvoice', label: 'Name on Invoice', defaultVisible: false, isToggleable: true },
  { id: 'category', label: 'Category', defaultVisible: true, isToggleable: true },
  { id: 'purchaseDate', label: 'Purchase Date', defaultVisible: false, isToggleable: true },
  { id: 'status', label: 'Status', defaultVisible: true, isToggleable: true },
  { id: 'source', label: 'Source/Supplier', defaultVisible: true, isToggleable: true },
  { id: 'listedOn', label: 'Listed On', defaultVisible: false, isToggleable: true },
  { id: 'boxNumber', label: 'Box #', defaultVisible: true, isToggleable: true },
  { id: 'quantity', label: 'Qty', defaultVisible: true, isToggleable: true },
  { id: 'unitPrice', label: 'Unit Price', defaultVisible: false, isToggleable: true },
  { id: 'totalCost', label: 'Total Cost', defaultVisible: true, isToggleable: true },
  { id: 'notes', label: 'Notes', defaultVisible: false, isToggleable: true },
  { id: 'dateAdded', label: 'Date Added', defaultVisible: false, isToggleable: true },
];


export default function InventoryDisplayPage({ statusFilter, pageTitle, emptyStateMessage }: InventoryDisplayPageProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<Record<string, boolean>>({});
  const [activeSourceFilters, setActiveSourceFilters] = useState<Record<string, boolean>>({});
  const [activeSupplierFilters, setActiveSupplierFilters] = useState<Record<string, boolean>>({});
  const [boxNumberFilter, setBoxNumberFilter] = useState("");
  const [activeListedOnFilters, setActiveListedOnFilters] = useState<Record<string, boolean>>({});

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  const [visibleColumns, setVisibleColumns] = useState<Record<InventoryTableColumnKey, boolean>>(
    ALL_TABLE_COLUMNS.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {} as Record<InventoryTableColumnKey, boolean>)
  );
  
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);
  const [isEditItemSheetOpen, setIsEditItemSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [isEtsySyncOpen, setIsEtsySyncOpen] = useState(false);

  const handleColumnVisibilityChange = useCallback((columnId: InventoryTableColumnKey, isVisible: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: isVisible }));
  }, []);

  const loadData = useCallback(() => {
    // Reconcile primary photos and COGS between sales and inventory
    reconcileInventoryAndSales();

    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) {
      try { 
        const parsedInventory = JSON.parse(storedInventory);
        if (Array.isArray(parsedInventory)) {
          setInventory(parsedInventory.filter(item => item && typeof item === 'object' && item.id && item.name)); 
        } else {
          setInventory([]);
        }
      } 
      catch (e) { console.error(`Error parsing inventory for ${pageTitle}:`, e); setInventory([]); }
    } else {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify([]));
      setInventory([]);
    }

    const storedCategories = localStorage.getItem(RESELLER_CATEGORIES_KEY);
    if (storedCategories) {
      try { 
        const parsed = JSON.parse(storedCategories);
        if (Array.isArray(parsed)) setCategories(parsed.sort());
      } catch (e) { console.error("Error parsing categories for filter", e); setCategories(DEFAULT_CATEGORIES); }
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers);
        if (Array.isArray(parsed)) setSuppliers(parsed);
      } catch(e) { console.error("Error parsing suppliers for filter", e); setSuppliers(DEFAULT_SUPPLIERS); }
    } else {
      setSuppliers(DEFAULT_SUPPLIERS);
    }
  }, [pageTitle]);

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_INVENTORY_KEY) loadData();
      if (event.key === RESELLER_CATEGORIES_KEY) loadData(); 
      if (event.key === RESELLER_SUPPLIERS_KEY) loadData(); 
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]); 

  const handleOpenEditSheet = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setIsEditItemSheetOpen(true);
  }, []);

  const handleDelete = useCallback((itemId: string) => {
    setItemToDelete(itemId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (itemToDelete) {
      const itemName = inventory.find(item => item.id === itemToDelete)?.name || 'Item';
      const updatedInventory = inventory.filter((item) => item.id !== itemToDelete);
      setInventory(updatedInventory);
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventory)); 
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(updatedInventory), storageArea: localStorage }));
      toast({ title: "Item Deleted", description: `${itemName} has been removed from your inventory.`, variant: 'destructive' });
      setItemToDelete(null);
      setSelectedItemIds(prev => prev.filter(id => id !== itemToDelete)); 
    }
  }, [itemToDelete, inventory, toast]);
  
  const toggleFilter = useCallback((filterStateSetter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, key: string, checked: boolean) => {
    filterStateSetter(prev => ({ ...prev, [key]: checked }));
  }, []);
  
  const clearAllFilters = useCallback(() => {
    setActiveCategoryFilters({});
    setActiveSourceFilters({});
    setActiveSupplierFilters({});
    setBoxNumberFilter("");
    setActiveListedOnFilters({});
    toast({ title: "Filters Cleared", description: "All inventory filters have been reset." });
  }, [toast]);
  
  const isAnyFilterActive = useMemo(() => {
    return Object.values(activeCategoryFilters).some(v => v) ||
           Object.values(activeSourceFilters).some(v => v) ||
           Object.values(activeSupplierFilters).some(v => v) ||
           boxNumberFilter !== "" ||
           Object.values(activeListedOnFilters).some(v => v);
  }, [activeCategoryFilters, activeSourceFilters, activeSupplierFilters, boxNumberFilter, activeListedOnFilters]);


  const filteredItems = useMemo(() => {
    const lowerSearchTerm = globalSearchTerm.toLowerCase();
    const lowerBoxNumberFilter = boxNumberFilter.toLowerCase();

    const selectedCategories = Object.entries(activeCategoryFilters).filter(([, checked]) => checked).map(([key]) => key);
    const selectedSources = Object.entries(activeSourceFilters).filter(([, checked]) => checked).map(([key]) => key);
    const selectedSuppliers = Object.entries(activeSupplierFilters).filter(([, checked]) => checked).map(([key]) => key);
    const selectedListedOn = Object.entries(activeListedOnFilters).filter(([, checked]) => checked).map(([key]) => key as SoldViaPlatformValue);

    return inventory.filter(item => {
      if (!item || typeof item !== 'object' || !item.id || !item.name) { 
        console.warn("Filtered out invalid item:", item);
        return false;
      }
      if (item.status !== statusFilter) return false;
      if (lowerSearchTerm) {
        const searchMatch =
          (item.name && item.name.toLowerCase().includes(lowerSearchTerm)) ||
          (item.nameOnInvoice && item.nameOnInvoice.toLowerCase().includes(lowerSearchTerm)) ||
          (item.category && item.category.toLowerCase().includes(lowerSearchTerm)) ||
          (item.source && item.source.toLowerCase().includes(lowerSearchTerm)) ||
          (item.storeName && item.storeName.toLowerCase().includes(lowerSearchTerm)) ||
          (item.boxNumber && item.boxNumber.toLowerCase().includes(lowerSearchTerm)) ||
          (item.additionalNotes && item.additionalNotes.toLowerCase().includes(lowerSearchTerm)) ||
          (item.id && item.id.toLowerCase().includes(lowerSearchTerm));
        if (!searchMatch) return false;
      }
      if (selectedCategories.length > 0 && (!item.category || !selectedCategories.includes(item.category))) return false;
      if (selectedSources.length > 0 && (!item.source || !selectedSources.includes(item.source))) return false;
      if (selectedSuppliers.length > 0 && (!item.supplierId || !selectedSuppliers.includes(item.supplierId))) return false;
      if (lowerBoxNumberFilter && (!item.boxNumber || !item.boxNumber.toLowerCase().includes(lowerBoxNumberFilter))) return false;
      if (selectedListedOn.length > 0) {
        if (!item.listedOn || item.listedOn.length === 0) return false;
        const listedOnMatch = selectedListedOn.some(platform => item.listedOn!.includes(platform));
        if (!listedOnMatch) return false;
      }
      return true;
    });
  }, [inventory, statusFilter, globalSearchTerm, activeCategoryFilters, activeSourceFilters, activeSupplierFilters, boxNumberFilter, activeListedOnFilters]);

  const handleSelectionChange = useCallback((itemId: string, isSelected: boolean) => {
    setSelectedItemIds(prevSelectedIds =>
      isSelected
        ? [...prevSelectedIds, itemId]
        : prevSelectedIds.filter(id => id !== itemId)
    );
  }, []);

  const handleSelectAllChange = useCallback((isSelected: boolean) => {
    if (isSelected) {
      setSelectedItemIds(filteredItems.map(item => item.id));
    } else {
      setSelectedItemIds([]);
    }
  }, [filteredItems]);
  
  const isAllFilteredItemsSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every(item => selectedItemIds.includes(item.id));
  }, [filteredItems, selectedItemIds]);

  const handleAddItemFromSheet = useCallback((itemData: InventoryItem, submitAction: 'saveAndClose' | 'saveAndAddNew') => {
    const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
    let currentInventory: InventoryItem[] = [];
    if (storedInventoryRaw) {
        try {
            const parsed = JSON.parse(storedInventoryRaw);
            if (Array.isArray(parsed)) {
              currentInventory = parsed;
            }
        } catch (e) { console.error("Error parsing inventory", e); }
    }

    const MAX_IMAGE_DATA_URI_LENGTH = 7 * 1000 * 1000;
    let imageOmitted = false;
    const itemToSave = { ...itemData }; 
    if (itemToSave.itemImageUrl && itemToSave.itemImageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
      itemToSave.itemImageUrl = undefined;
      imageOmitted = true;
    }

    const newItemWithId = {
      ...itemToSave,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString()
    };

    const newInventory = [newItemWithId, ...currentInventory];
    try {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(newInventory));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(newInventory), storageArea: localStorage }));
      toast({
        title: "Item Added",
        description: imageOmitted
          ? `${newItemWithId.name} added (image too large, not saved).`
          : `${newItemWithId.name} added to inventory.`
      });
      loadData(); 
      if (submitAction === 'saveAndClose') {
        setIsAddItemSheetOpen(false);
      }
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not add item. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({ title: "Error", description: "Could not save item.", variant: "destructive" });
      }
    }
  }, [toast, loadData]);

  const handleUpdateItemFromSheet = useCallback((updatedItemData: InventoryItem, submitAction: 'saveAndClose' | 'saveAndAddNew') => {
    const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
    let currentInventory: InventoryItem[] = [];
     if (storedInventoryRaw) {
        try {
            const parsed = JSON.parse(storedInventoryRaw);
            if (Array.isArray(parsed)) currentInventory = parsed;
        } catch (e) { console.error("Failed to parse inventory before updating item:", e); }
    }

    const MAX_IMAGE_DATA_URI_LENGTH = 7 * 1000 * 1000;
    let imageOmitted = false;
    const itemToSave = { ...updatedItemData };

    if (itemToSave.itemImageUrl && itemToSave.itemImageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
      itemToSave.itemImageUrl = editingItem?.itemImageUrl || undefined;
      imageOmitted = true;
    }

    const newInventory = currentInventory.map((item) => (item.id === itemToSave.id ? itemToSave : item));
    try {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(newInventory));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(newInventory), storageArea: localStorage }));
      
      // Propagate updated price (COGS) to any associated sales in All Sales view
      syncCOGSFromInventoryToSales(itemToSave);

      toast({ 
        title: "Item Updated", 
        description: imageOmitted
          ? `${itemToSave.name} updated (new image too large, not saved).`
          : `${itemToSave.name} has been updated and linked sales refreshed.` 
      });
      loadData();
      setIsEditItemSheetOpen(false);
      setEditingItem(undefined);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not update item. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({ title: "Error Saving Item", description: `An unexpected error occurred: ${e.message}`, variant: "destructive"});
      }
    }
  }, [toast, loadData, editingItem]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">{pageTitle}</h1>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search this view..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <ListFilter className="h-4 w-4" />
                <span className="sr-only">Filters</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filter Inventory</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-150px)] pr-3">
                <div className="py-4 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Category</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {categories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox id={`cat-${category}`} checked={!!activeCategoryFilters[category]} onCheckedChange={checked => toggleFilter(setActiveCategoryFilters, category, !!checked)} />
                          <Label htmlFor={`cat-${category}`} className="text-sm font-normal">{category}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Source</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {ITEM_SOURCES.map(source => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox id={`src-${source}`} checked={!!activeSourceFilters[source]} onCheckedChange={checked => toggleFilter(setActiveSourceFilters, source, !!checked)} />
                          <Label htmlFor={`src-${source}`} className="text-sm font-normal">{source}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Supplier</h4>
                     <div className="space-y-1 max-h-40 overflow-y-auto">
                      {suppliers.length === 0 && <p className="text-xs text-muted-foreground">No suppliers defined.</p>}
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="flex items-center space-x-2">
                          <Checkbox id={`sup-${supplier.id}`} checked={!!activeSupplierFilters[supplier.id]} onCheckedChange={checked => toggleFilter(setActiveSupplierFilters, supplier.id, !!checked)} />
                          <Label htmlFor={`sup-${supplier.id}`} className="text-sm font-normal">{supplier.name} <span className="text-xs text-muted-foreground">({supplier.type})</span></Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Box Number</h4>
                    <Input placeholder="Enter box number..." value={boxNumberFilter} onChange={e => setBoxNumberFilter(e.target.value)} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Listed On</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {SOLD_VIA_PLATFORMS.filter(p => p.value !== 'Cash Sale' && p.value !== 'Other').map(platform => (
                        <div key={platform.value} className="flex items-center space-x-2">
                          <Checkbox id={`listed-${platform.value}`} checked={!!activeListedOnFilters[platform.value]} onCheckedChange={checked => toggleFilter(setActiveListedOnFilters, platform.value, !!checked)} />
                          <Label htmlFor={`listed-${platform.value}`} className="text-sm font-normal">{platform.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="pt-4 border-t">
                <SheetClose asChild>
                  <Button type="button" variant="outline" onClick={clearAllFilters} disabled={!isAnyFilterActive}>
                     <XCircle className="mr-2 h-4 w-4" /> Clear All Filters
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button type="button">Done</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <ViewIcon className="h-4 w-4" />
                <span className="sr-only">Toggle Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle Table Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_TABLE_COLUMNS.filter(col => col.isToggleable).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns[column.id]}
                  onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, !!checked)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setIsEtsySyncOpen(true)}
            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          >
            <Store className="mr-2 h-4 w-4 text-orange-600" /> Etsy Sync
          </Button>
          <Sheet open={isAddItemSheetOpen} onOpenChange={setIsAddItemSheetOpen}>
            <SheetTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl p-0">
              <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
                <SheetTitle>Add New Inventory Item</SheetTitle>
                <SheetDescription>Fill in the details for your new item.</SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh_-_5.5rem)]"> 
                <div className="p-6">
                  <InventoryForm onSubmit={handleAddItemFromSheet} />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <InventoryTable 
        items={filteredItems} 
        onEdit={handleOpenEditSheet} 
        onDelete={handleDelete}
        selectedIds={selectedItemIds}
        onSelectionChange={handleSelectionChange}
        onSelectAllChange={handleSelectAllChange}
        isAllSelected={isAllFilteredItemsSelected}
        visibleColumns={visibleColumns}
      />
      
      {filteredItems.length === 0 && globalSearchTerm && (
        <p className="text-center text-muted-foreground">No items match your search term "{globalSearchTerm}" for {statusFilter.toLowerCase()} inventory. Try adjusting your search or filters.</p>
      )}
      {filteredItems.length === 0 && isAnyFilterActive && !globalSearchTerm && (
        <p className="text-center text-muted-foreground">No {statusFilter.toLowerCase()} items match your current filter combination. Try adjusting your filters.</p>
      )}
      {filteredItems.length === 0 && !globalSearchTerm && !isAnyFilterActive && (
        <p className="text-center text-muted-foreground">{emptyStateMessage}</p>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
              from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isEditItemSheetOpen} onOpenChange={(isOpen) => { setIsEditItemSheetOpen(isOpen); if (!isOpen) setEditingItem(undefined); }}>
        <SheetContent className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5" />Edit Inventory Item</SheetTitle>
            <SheetDescription>Update the details for "{editingItem?.name || 'this item'}".</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
            <div className="p-6">
              {editingItem && (
                <InventoryForm
                  onSubmit={handleUpdateItemFromSheet}
                  initialData={editingItem}
                  key={editingItem.id}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <EtsySyncDialog
        isOpen={isEtsySyncOpen}
        onOpenChange={setIsEtsySyncOpen}
        defaultTab="inventory"
        onSyncComplete={loadData}
      />
    </div>
  );
}
