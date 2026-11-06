
"use client";

import { useState, useEffect, useMemo } from 'react';
import { PerformanceBreakdownTable } from "@/components/reports/PerformanceBreakdownTable";
import type { Sale, InventoryItem, Supplier, PerformanceBreakdownData, SoldViaPlatformValue } from "@/lib/types";
import { RESELLER_SALES_KEY, RESELLER_INVENTORY_KEY, RESELLER_SUPPLIERS_KEY, SOLD_VIA_PLATFORMS, DEFAULT_SUPPLIERS, RESELLER_CATEGORIES_KEY, DEFAULT_CATEGORIES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, RefreshCw, Filter as FilterIcon, CalendarDays, XCircle, Users, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActiveTab = "byChannel" | "bySupplier" | "byCategory";

export default function SalesPerformancePage() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [allCategories, setAllCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("byChannel");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const initialPlatformFilters = SOLD_VIA_PLATFORMS.reduce((acc, platform) => {
    acc[platform.value] = true; return acc;
  }, {} as Record<SoldViaPlatformValue, boolean>);
  const [platformFilters, setPlatformFilters] = useState<Record<SoldViaPlatformValue, boolean>>(initialPlatformFilters);
  
  const [supplierFilters, setSupplierFilters] = useState<Record<string, boolean>>({}); // Keyed by supplier ID
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({}); // Keyed by category name

  const loadData = () => {
    setIsLoading(true);
    try {
      const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
      setAllSales(storedSales ? JSON.parse(storedSales) : []);

      const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
      setAllInventory(storedInventory ? JSON.parse(storedInventory) : []);

      const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      const parsedSuppliers = storedSuppliers ? JSON.parse(storedSuppliers) : DEFAULT_SUPPLIERS;
      setAllSuppliers(parsedSuppliers);
      setSupplierFilters(parsedSuppliers.reduce((acc: Record<string, boolean>, sup: Supplier) => { acc[sup.id] = true; return acc; }, {}));


      const storedCategories = localStorage.getItem(RESELLER_CATEGORIES_KEY);
      const parsedCategories = storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES;
      setAllCategories(parsedCategories.sort());
      setCategoryFilters(parsedCategories.reduce((acc: Record<string, boolean>, cat: string) => { acc[cat] = true; return acc; }, {}));

    } catch (e) {
      console.error("Error loading data for sales performance report:", e);
      toast({ title: "Error Loading Data", description: "Could not load all necessary data.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
      if ([RESELLER_SALES_KEY, RESELLER_INVENTORY_KEY, RESELLER_SUPPLIERS_KEY, RESELLER_CATEGORIES_KEY].includes(event.key || "")) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const salesFilteredByDate = useMemo(() => {
    return dateRange?.from && dateRange?.to
      ? allSales.filter(sale => {
          try {
            const saleDate = parseISO(sale.saleDate);
            return isWithinInterval(saleDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
          } catch (e) { return false; }
        })
      : allSales;
  }, [allSales, dateRange]);

  const calculatePerformance = (
    items: { id: string; label: string }[], // e.g., platforms, suppliers, categories
    getGroupId: (sale: Sale, inventory: InventoryItem[]) => string | null, // Function to get ID for grouping (platform, supplierId, categoryName)
    itemFilters: Record<string, boolean>
  ): PerformanceBreakdownData[] => {
    const dataById: Record<string, Omit<PerformanceBreakdownData, 'id' | 'label'>> = {};

    items.forEach(item => {
      if (itemFilters[item.id]) { // Only initialize if item is selected in filter
        dataById[item.id] = {
          totalSalesRevenue: 0, totalCOGS: 0, totalProfit: 0,
          numberOfSales: 0, totalQuantitySold: 0, profitMargin: 0,
          averageSalePrice: 0, averageProfitPerItem: 0,
        };
      }
    });
    
    salesFilteredByDate.forEach(sale => {
      const groupId = getGroupId(sale, allInventory);
      if (groupId && dataById[groupId]) { // Process only if group is valid and selected in filter
        const groupData = dataById[groupId];
        groupData.totalSalesRevenue += sale.grossSaleAmount;
        groupData.totalCOGS += sale.totalPurchaseCostOfItemSold * sale.quantitySold;
        groupData.totalProfit += sale.profit;
        groupData.numberOfSales += 1;
        groupData.totalQuantitySold += sale.quantitySold;
      }
    });

    return items
      .filter(item => itemFilters[item.id] && dataById[item.id]?.numberOfSales > 0) // Filter by selected and ensure sales exist
      .map(item => {
        const data = dataById[item.id];
        const profitMargin = data.totalSalesRevenue > 0 ? (data.totalProfit / data.totalSalesRevenue) * 100 : 0;
        const averageSalePrice = data.totalQuantitySold > 0 ? data.totalSalesRevenue / data.totalQuantitySold : 0;
        const averageProfitPerItem = data.totalQuantitySold > 0 ? data.totalProfit / data.totalQuantitySold : 0;
        return {
          id: item.id,
          label: item.label,
          totalSalesRevenue: parseFloat(data.totalSalesRevenue.toFixed(2)),
          totalCOGS: parseFloat(data.totalCOGS.toFixed(2)),
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          numberOfSales: data.numberOfSales,
          totalQuantitySold: data.totalQuantitySold,
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          averageSalePrice: parseFloat(averageSalePrice.toFixed(2)),
          averageProfitPerItem: parseFloat(averageProfitPerItem.toFixed(2)),
        };
      });
  };
  
  const channelPerformanceData = useMemo(() => calculatePerformance(
    SOLD_VIA_PLATFORMS.map(p => ({ id: p.value, label: p.label })),
    (sale) => sale.soldVia,
    platformFilters
  ), [salesFilteredByDate, platformFilters]);

  const supplierPerformanceData = useMemo(() => calculatePerformance(
      allSuppliers.map(s => ({ id: s.id, label: s.name })),
      (sale, inventory) => inventory.find(i => i.id === sale.itemId)?.supplierId || 'unknown_supplier',
      { ...supplierFilters, 'unknown_supplier': supplierFilters['unknown_supplier'] ?? true } // Ensure unknown supplier is also filterable
    ).map(data => data.id === 'unknown_supplier' ? {...data, label: 'Unknown/No Supplier'} : data),
    [salesFilteredByDate, allInventory, allSuppliers, supplierFilters]
  );
  
  const categoryPerformanceData = useMemo(() => calculatePerformance(
      allCategories.map(c => ({ id: c, label: c })),
      (sale, inventory) => inventory.find(i => i.id === sale.itemId)?.category || 'uncategorized',
      { ...categoryFilters, 'uncategorized': categoryFilters['uncategorized'] ?? true } // Ensure uncategorized is filterable
    ).map(data => data.id === 'uncategorized' ? {...data, label: 'Uncategorized'} : data),
    [salesFilteredByDate, allInventory, allCategories, categoryFilters]
  );


  const handleRefreshData = () => {
    loadData();
    toast({ title: "Report Updated", description: "Sales performance data has been refreshed." });
  };

  const handleFilterChange = (filterType: 'platform' | 'supplier' | 'category', key: string, checked: boolean) => {
    if (filterType === 'platform') setPlatformFilters(prev => ({ ...prev, [key]: checked }));
    else if (filterType === 'supplier') setSupplierFilters(prev => ({ ...prev, [key]: checked }));
    else if (filterType === 'category') setCategoryFilters(prev => ({ ...prev, [key]: checked }));
  };
  
  const clearAllFilters = () => {
    setDateRange(undefined);
    setPlatformFilters(initialPlatformFilters);
    setSupplierFilters(allSuppliers.reduce((acc: Record<string, boolean>, sup: Supplier) => { acc[sup.id] = true; return acc; }, {}));
    setCategoryFilters(allCategories.reduce((acc: Record<string, boolean>, cat: string) => { acc[cat] = true; return acc; }, {}));
    toast({ title: "Filters Cleared", description: "All report filters have been reset." });
  };

  const isAnyFilterActive = useMemo(() => {
    return dateRange !== undefined || 
           Object.values(platformFilters).some(v => !v) ||
           Object.values(supplierFilters).some(v => !v) ||
           Object.values(categoryFilters).some(v => !v);
  }, [dateRange, platformFilters, supplierFilters, categoryFilters]);

  const renderFilterOptions = () => {
    switch (activeTab) {
      case 'byChannel':
        return SOLD_VIA_PLATFORMS.map(platform => (
          <div key={platform.value} className="flex items-center space-x-2">
            <Checkbox id={`filter-${platform.value}`} checked={platformFilters[platform.value]} onCheckedChange={(checked) => handleFilterChange('platform', platform.value, !!checked)} />
            <Label htmlFor={`filter-${platform.value}`} className="font-normal text-sm">{platform.label}</Label>
          </div>
        ));
      case 'bySupplier':
        return allSuppliers.map(supplier => (
          <div key={supplier.id} className="flex items-center space-x-2">
            <Checkbox id={`filter-${supplier.id}`} checked={supplierFilters[supplier.id] ?? true} onCheckedChange={(checked) => handleFilterChange('supplier', supplier.id, !!checked)} />
            <Label htmlFor={`filter-${supplier.id}`} className="font-normal text-sm">{supplier.name}</Label>
          </div>
        ));
      case 'byCategory':
        return allCategories.map(category => (
          <div key={category} className="flex items-center space-x-2">
            <Checkbox id={`filter-${category}`} checked={categoryFilters[category] ?? true} onCheckedChange={(checked) => handleFilterChange('category', category, !!checked)} />
            <Label htmlFor={`filter-${category}`} className="font-normal text-sm">{category}</Label>
          </div>
        ));
      default:
        return null;
    }
  };
  
  const getFilterTitle = () => {
    switch (activeTab) {
      case 'byChannel': return "Sales Channels";
      case 'bySupplier': return "Suppliers";
      case 'byCategory': return "Item Categories";
      default: return "Filters";
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Store className="h-7 w-7" /> Sales Performance
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefreshData} disabled={isLoading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <FilterIcon className="mr-2 h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader><SheetTitle>Filter Report</SheetTitle></SheetHeader>
              <ScrollArea className="h-[calc(100vh-200px)]"> {/* Adjusted height for scroll area */}
                <div className="py-4 space-y-6 pr-3">
                  <div>
                    <Label className="text-base font-medium">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal mt-1", !dateRange && "text-muted-foreground")}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : format(dateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                      </PopoverContent>
                    </Popover>
                    {dateRange && (<Button variant="link" size="sm" className="px-0 mt-1" onClick={() => setDateRange(undefined)}>Clear Dates</Button>)}
                  </div>
                  <div>
                    <Label className="text-base font-medium">{getFilterTitle()}</Label>
                    <div className="space-y-2 mt-1 max-h-60 overflow-y-auto"> {/* Max height for filter options list */}
                      {renderFilterOptions()}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="pt-4 border-t absolute bottom-0 left-0 right-0 bg-background p-6">
                 <Button type="button" variant="ghost" onClick={clearAllFilters} disabled={!isAnyFilterActive} className="mr-auto">
                    <XCircle className="mr-2 h-4 w-4" /> Clear All Filters
                  </Button>
                <SheetClose asChild><Button type="button">Apply</Button></SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="byChannel"><Store className="mr-2 h-4 w-4" />By Channel</TabsTrigger>
          <TabsTrigger value="bySupplier"><Users className="mr-2 h-4 w-4" />By Supplier</TabsTrigger>
          <TabsTrigger value="byCategory"><PackageSearch className="mr-2 h-4 w-4" />By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="byChannel">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Sales Channel</CardTitle>
              <CardDescription>Breakdown of sales metrics for each selected channel and date range.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (<p className="text-center py-10 text-muted-foreground">Loading sales data...</p>) : 
               channelPerformanceData.length === 0 ? (<p className="text-center py-10 text-muted-foreground">No sales data available for the selected filters.</p>) : 
               (<PerformanceBreakdownTable data={channelPerformanceData} breakdownTitle="Channel"/>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bySupplier">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Supplier</CardTitle>
              <CardDescription>Breakdown of sales metrics for items sourced from each selected supplier and date range.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (<p className="text-center py-10 text-muted-foreground">Loading data...</p>) : 
               supplierPerformanceData.length === 0 ? (<p className="text-center py-10 text-muted-foreground">No sales data available for the selected filters.</p>) : 
               (<PerformanceBreakdownTable data={supplierPerformanceData} breakdownTitle="Supplier"/>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byCategory">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Item Category</CardTitle>
              <CardDescription>Breakdown of sales metrics for each selected item category and date range.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (<p className="text-center py-10 text-muted-foreground">Loading data...</p>) : 
               categoryPerformanceData.length === 0 ? (<p className="text-center py-10 text-muted-foreground">No sales data available for the selected filters.</p>) : 
               (<PerformanceBreakdownTable data={categoryPerformanceData} breakdownTitle="Category"/>)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
