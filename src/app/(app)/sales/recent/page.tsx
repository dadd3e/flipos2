
"use client";

import { useState, useEffect } from 'react';
import type { Sale, InventoryItem, SoldViaPlatformValue } from "@/lib/types";
import { SalesTable } from "@/components/sales/SalesTable";
import { SalesSummaryDisplay, calculateSalesSummary } from "@/components/sales/SalesSummaryDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SOLD_VIA_PLATFORMS } from "@/lib/constants";
import { subDays, isAfter, parseISO } from 'date-fns';
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
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { EtsySyncDialog } from "@/components/etsy/EtsySyncDialog";

const RESELLER_SALES_KEY = 'resellerSales';
const RESELLER_INVENTORY_KEY = 'resellerInventory';

export default function RecentSalesPage() {
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEtsySyncOpen, setIsEtsySyncOpen] = useState(false);
  const { toast } = useToast();

  const loadSalesData = () => {
    setIsLoading(true);
    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    if (storedSales) {
      const allSales: Sale[] = JSON.parse(storedSales);
      const filteredSales = allSales.filter(sale => isAfter(parseISO(sale.saleDate), thirtyDaysAgo));
      setRecentSales(filteredSales);
    } else {
      localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify([]));
      setRecentSales([]);
    }

    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) {
      setInventoryItems(JSON.parse(storedInventory));
    } else {
       localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify([]));
      setInventoryItems([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSalesData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SALES_KEY || event.key === RESELLER_INVENTORY_KEY) {
        loadSalesData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleDeleteSale = (saleId: string) => {
    setSaleToDelete(saleId);
  };

  const confirmDeleteSale = () => {
    if(saleToDelete) {
      const saleEntry = recentSales.find(s => s.id === saleToDelete) || 
                      (JSON.parse(localStorage.getItem(RESELLER_SALES_KEY) || '[]') as Sale[]).find(s => s.id === saleToDelete);

      if (saleEntry) {
        // Restore inventory
        const updatedInventory = inventoryItems.map(item => {
          if (item.id === saleEntry.itemId) {
            const newQuantity = item.quantity + saleEntry.quantitySold;
            return { 
              ...item, 
              quantity: newQuantity,
              status: (item.status === 'Sold' && newQuantity > 0) ? 'Active' : item.status, 
            };
          }
          return item;
        });
        localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventory));
        setInventoryItems(updatedInventory);

        // Remove sale from all sales in localStorage
        const allSalesStored = localStorage.getItem(RESELLER_SALES_KEY);
        const allSalesData: Sale[] = allSalesStored ? JSON.parse(allSalesStored) : [];
        const updatedAllSales = allSalesData.filter((s) => s.id !== saleToDelete);
        localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updatedAllSales));
        
        // Re-filter recent sales
        const thirtyDaysAgo = subDays(new Date(), 30);
        setRecentSales(updatedAllSales.filter(sale => isAfter(parseISO(sale.saleDate), thirtyDaysAgo)));
        
        // Dispatch storage events
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SALES_KEY, newValue: JSON.stringify(updatedAllSales), storageArea: localStorage }));
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(updatedInventory), storageArea: localStorage }));

        toast({ title: "Sale Deleted", description: `Sale of ${saleEntry.itemName} has been removed. Inventory updated.`, variant: 'destructive' });
      }
      setSaleToDelete(null);
    }
  };

  if (isLoading) {
    return <p className="text-center py-10">Loading recent sales data...</p>;
  }

  const salesByPlatform = SOLD_VIA_PLATFORMS.map(platform => {
    const platformSales = recentSales.filter(sale => sale.soldVia === platform.value);
    return {
      platform,
      sales: platformSales,
      summary: calculateSalesSummary(platformSales),
    };
  }).filter(p => p.sales.length > 0);

  const handleUpdateShippingCost = (saleId: string, shippingCost: number) => {
    const allStored = localStorage.getItem(RESELLER_SALES_KEY);
    const allSalesData: Sale[] = allStored ? JSON.parse(allStored) : [];
    const updatedAllSales = allSalesData.map(sale => {
      if (sale.id === saleId) {
        const cogs = (sale.totalPurchaseCostOfItemSold || 0) * (sale.quantitySold || 1);
        const profit = sale.grossSaleAmount - (sale.totalPlatformFeesAndDiscounts || 0) - shippingCost - cogs;
        return {
          ...sale,
          actualShippingCostBySeller: shippingCost,
          profit: parseFloat(profit.toFixed(2)),
          needsShippingCostEntry: false,
        };
      }
      return sale;
    });

    localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updatedAllSales));
    const thirtyDaysAgo = subDays(new Date(), 30);
    setRecentSales(updatedAllSales.filter(sale => isAfter(parseISO(sale.saleDate), thirtyDaysAgo)));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SALES_KEY, newValue: JSON.stringify(updatedAllSales), storageArea: localStorage }));
    toast({ title: "Shipping Cost Updated", description: "Outbound shipping cost saved and profit recalculated." });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">Recent Sales Report (Last 30 Days)</h1>
        <Button onClick={() => setIsEtsySyncOpen(true)} variant="outline" className="flex items-center gap-2">
          <Store className="h-4 w-4 text-orange-600" /> Sync with Etsy
        </Button>
      </div>
      
      <SalesSummaryDisplay sales={recentSales} title="Overall Recent Sales Summary" description="Summary of sales recorded in the last 30 days."/>

      <Tabs defaultValue="all_items_recent" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="all_items_recent">All Items List (Recent)</TabsTrigger>
          <TabsTrigger value="by_platform_recent">By Platform (Recent)</TabsTrigger>
        </TabsList>
        <TabsContent value="all_items_recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales Transactions</CardTitle>
              <CardDescription>Detailed list of sales from the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesTable sales={recentSales} onDelete={handleDeleteSale} onUpdateShippingCost={handleUpdateShippingCost} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by_platform_recent" className="space-y-6">
          {salesByPlatform.length > 0 ? salesByPlatform.map(({ platform, sales: platformSales, summary }) => (
            <Card key={platform.value}>
              <CardHeader>
                <CardTitle className="font-headline">{platform.label} Sales (Recent)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SalesSummaryDisplay sales={platformSales} title={`${platform.label} Summary (Recent)`} description={`Performance for sales via ${platform.label} in the last 30 days.`}/>
                <SalesTable sales={platformSales} onDelete={handleDeleteSale} onUpdateShippingCost={handleUpdateShippingCost} />
              </CardContent>
            </Card>
          )) : (
             <p className="text-muted-foreground text-center py-8">No sales data found for any specific platform in the last 30 days.</p>
          )}
        </TabsContent>
      </Tabs>

       <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this sale record.
              The quantity sold will be added back to the inventory item, and its status may be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EtsySyncDialog
        isOpen={isEtsySyncOpen}
        onOpenChange={setIsEtsySyncOpen}
        defaultTab="sales"
        onSyncComplete={loadSalesData}
      />
    </div>
  );
}
