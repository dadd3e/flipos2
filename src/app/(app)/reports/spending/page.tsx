
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // Import next/dynamic
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateMonthlySpending, SPENDING_CATEGORIES_CONFIG } from '@/lib/reportingUtils';
import type { MonthlySpending, InventoryItem, Sale, SpendingCategory, GeneralExpense } from '@/lib/types';
import { SpendingCardView } from '@/components/reports/spending/SpendingCardView';
// import { SpendingChartView } from '@/components/reports/spending/SpendingChartView'; // Comment out direct import
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, LayoutGrid, BarChartHorizontalBig, Loader2 as PageLoaderIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RESELLER_SALES_KEY, RESELLER_INVENTORY_KEY, RESELLER_GENERAL_EXPENSES_KEY } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils'; // Added import for cn

// Dynamically import SpendingChartView with ssr: false
const SpendingChartView = dynamic(() => import('@/components/reports/spending/SpendingChartView').then(mod => mod.SpendingChartView), { 
  ssr: false, 
  loading: () => <Card className="h-[400px] flex items-center justify-center"><PageLoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" /></Card>
});

const NUMBER_OF_MONTHS_TO_DISPLAY = 6;

export default function SpendingReportPage() {
  const [spendingData, setSpendingData] = useState<MonthlySpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'chart'>('card');
  const { toast } = useToast();

  const initialCategoryFilters = SPENDING_CATEGORIES_CONFIG.reduce((acc, category) => {
    acc[category.id] = true;
    return acc;
  }, {} as Record<SpendingCategory, boolean>);
  const [categoryFilters, setCategoryFilters] = useState<Record<SpendingCategory, boolean>>(initialCategoryFilters);

  const loadData = (isManualRefresh: boolean = false) => {
    setIsLoading(true);
    let inventory: InventoryItem[] = [];
    let sales: Sale[] = [];
    let generalExpenses: GeneralExpense[] = [];
    try {
      const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
      if(storedSales) {
        const parsedSales = JSON.parse(storedSales);
        if(Array.isArray(parsedSales)) sales = parsedSales;
      }
      
      const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
      if(storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        if(Array.isArray(parsedInventory)) inventory = parsedInventory;
      }

      const storedGeneralExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
      if(storedGeneralExpenses) {
        const parsedGeneral = JSON.parse(storedGeneralExpenses);
        if(Array.isArray(parsedGeneral)) generalExpenses = parsedGeneral;
      }
      
      const calculatedData = calculateMonthlySpending(inventory, sales, generalExpenses, NUMBER_OF_MONTHS_TO_DISPLAY);
      setSpendingData(calculatedData);
      
      if (isManualRefresh && (inventory.length > 0 || sales.length > 0 || generalExpenses.length > 0)) {
        toast({ title: "Spending Report Updated", description: "Data has been recalculated." });
      }
    } catch (error) {
      console.error("Error loading spending data:", error);
      toast({ title: "Error Loading Data", description: "Could not calculate spending data.", variant: "destructive" });
      setSpendingData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false); // Initial load, not manual
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SALES_KEY || event.key === RESELLER_INVENTORY_KEY || event.key === RESELLER_GENERAL_EXPENSES_KEY) {
        loadData(false); // Update on storage change, not manual
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryFilterChange = (categoryId: SpendingCategory, checked: boolean) => {
    setCategoryFilters(prev => ({ ...prev, [categoryId]: checked }));
  };

  const filteredSpendingDataForChart = spendingData.map(month => ({
    ...month,
    cogs: categoryFilters.cogs ? month.cogs : 0,
    inboundShipping: categoryFilters.inboundShipping ? month.inboundShipping : 0,
    outboundShipping: categoryFilters.outboundShipping ? month.outboundShipping : 0,
    fees: categoryFilters.fees ? month.fees : 0,
    general: categoryFilters.general ? month.general : 0,
    // Recalculate total for chart based on active filters if necessary, or chart can sum visible parts
  })).filter(month => month.total > 0 || Object.values(categoryFilters).some(val => val)); // Keep month if it has any data or any filter is on

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">Spending Report</h1>
        <div className="flex gap-2 items-center">
          <Button onClick={() => loadData(true)} disabled={isLoading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as 'card' | 'chart')}>
            <TabsList>
              <TabsTrigger value="card"><LayoutGrid className="mr-2 h-4 w-4" />Card View</TabsTrigger>
              <TabsTrigger value="chart"><BarChartHorizontalBig className="mr-2 h-4 w-4" />Chart View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
         <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : spendingData.length === 0 ? (
         <Card>
          <CardHeader>
            <CardTitle>No Spending Data</CardTitle>
            <CardDescription>There is no spending data available for the selected period. Ensure inventory purchases, sales with costs/fees, and general expenses are logged.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {viewMode === 'chart' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Chart Category Filters</CardTitle>
                <CardDescription>Select categories to display in the stacked bar chart.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {SPENDING_CATEGORIES_CONFIG.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${category.id}`}
                      checked={categoryFilters[category.id]}
                      onCheckedChange={(checked) => handleCategoryFilterChange(category.id, !!checked)}
                      style={{ backgroundColor: categoryFilters[category.id] ? `var(--color-${category.id})` : undefined, borderColor: `var(--color-${category.id})`}}
                      className={cn(categoryFilters[category.id] && "border-transparent")}
                    />
                    <Label htmlFor={`filter-${category.id}`} className="text-sm font-medium">
                      {category.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {viewMode === 'card' ? (
            <SpendingCardView data={spendingData} />
          ) : (
            <SpendingChartView data={filteredSpendingDataForChart.slice().reverse()} /> // Reverse for chart to show oldest month first
          )}
        </>
      )}
    </div>
  );
}


    
