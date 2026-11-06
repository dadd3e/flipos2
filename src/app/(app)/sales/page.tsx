
"use client";

import { useState, useEffect } from 'react';
import { SalesForm } from "@/components/sales/SalesForm";
import type { Sale, InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const RESELLER_SALES_KEY = 'resellerSales';
const RESELLER_INVENTORY_KEY = 'resellerInventory';

export default function SalesPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) {
      try {
        const parsedInventory = JSON.parse(storedInventory);
        if (Array.isArray(parsedInventory)) {
          setInventoryItems(parsedInventory);
        } else {
          setInventoryItems([]);
        }
      } catch (e) {
        console.error("Error parsing inventory for sales page:", e);
        setInventoryItems([]);
      }
    } else {
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify([]));
      setInventoryItems([]);
    }

    if (!localStorage.getItem(RESELLER_SALES_KEY)) {
      localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify([]));
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_INVENTORY_KEY) {
        const updatedStoredInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
        if (updatedStoredInventory) {
          try {
            const parsedInventory = JSON.parse(updatedStoredInventory);
            if (Array.isArray(parsedInventory)) {
              setInventoryItems(parsedInventory);
            } else {
              setInventoryItems([]);
            }
          } catch (e) {
            console.error("Error parsing updated inventory:", e);
            setInventoryItems([]);
          }
        } else {
          setInventoryItems([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogSale = (sale: Sale) => {
    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    const currentSales: Sale[] = storedSales ? JSON.parse(storedSales) : [];
    const newSalesRecord = [sale, ...currentSales];
    
    const updatedInventoryItems = inventoryItems.map(item => {
      if (item.id === sale.itemId) {
        const newQuantity = item.quantity - sale.quantitySold;
        return { 
          ...item, 
          quantity: newQuantity,
          status: newQuantity <= 0 ? 'Sold' : item.status,
        };
      }
      return item;
    });

    try {
      localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(newSalesRecord));
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventoryItems));
      
      setInventoryItems(updatedInventoryItems);

      window.dispatchEvent(new StorageEvent('storage', {
        key: RESELLER_SALES_KEY,
        newValue: JSON.stringify(newSalesRecord),
        storageArea: localStorage,
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: RESELLER_INVENTORY_KEY,
        newValue: JSON.stringify(updatedInventoryItems),
        storageArea: localStorage,
      }));

      toast({ title: "Sale Logged", description: `Sale of ${sale.itemName} has been recorded.` });
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not log sale. Browser local storage is full. Please export and clear some data.",
          variant: "destructive",
          duration: 10000,
        });
        // Optionally, revert inventoryItems state if you want to be strictly transactional,
        // but for now, the local state update will proceed, and user is notified.
      } else {
        toast({
          title: "Error Logging Sale",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
    }
  };
  
  const activeInventoryItems = inventoryItems.filter(item => item.status === 'Active' && item.quantity > 0);

  return (
    <div className="space-y-8">
      <SalesForm inventoryItems={activeInventoryItems} onSubmit={handleLogSale} />
    </div>
  );
}
