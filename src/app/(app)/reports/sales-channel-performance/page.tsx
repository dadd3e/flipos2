
"use client";

import { useState, useEffect, useMemo } from 'react';
import { SalesChannelPerformanceTable } from "@/components/reports/SalesChannelPerformanceTable";
import type { Sale, PerformanceBreakdownData, SoldViaPlatformValue } from "@/lib/types"; // Changed PlatformPerformanceData to PerformanceBreakdownData
import { RESELLER_SALES_KEY, SOLD_VIA_PLATFORMS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, RefreshCw, Filter as FilterIcon, CalendarDays, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SalesChannelPerformancePage() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const initialPlatformFilters = SOLD_VIA_PLATFORMS.reduce((acc, platform) => {
    acc[platform.value] = true;
    return acc;
  }, {} as Record<SoldViaPlatformValue, boolean>);
  const [platformFilters, setPlatformFilters] = useState<Record<SoldViaPlatformValue, boolean>>(initialPlatformFilters);

  const loadSalesData = () => {
    setIsLoading(true);
    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    if (storedSales) {
      try {
        setAllSales(JSON.parse(storedSales));
      } catch (e) {
        console.error("Error parsing sales data for channel performance report:", e);
        setAllSales([]);
      }
    } else {
      setAllSales([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSalesData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SALES_KEY) {
        loadSalesData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const performanceData = useMemo((): PerformanceBreakdownData[] => { // Changed to PerformanceBreakdownData
    const filteredSalesByDate = dateRange?.from && dateRange?.to
      ? allSales.filter(sale => {
          try {
            const saleDate = parseISO(sale.saleDate);
            return isWithinInterval(saleDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
          } catch (e) { return false; }
        })
      : allSales;

    const dataByPlatform: Record<SoldViaPlatformValue, Omit<PerformanceBreakdownData, 'id' | 'label'>> =
      SOLD_VIA_PLATFORMS.reduce((acc, platformConst) => {
        if (platformFilters[platformConst.value]) {
          acc[platformConst.value] = {
            totalSalesRevenue: 0,
            totalCOGS: 0,
            totalProfit: 0,
            numberOfSales: 0,
            totalQuantitySold: 0,
            profitMargin: 0,
            averageSalePrice: 0,
            averageProfitPerItem: 0,
          };
        }
        return acc;
      }, {} as Record<SoldViaPlatformValue, Omit<PerformanceBreakdownData, 'id' | 'label'>>);

    filteredSalesByDate.forEach(sale => {
      if (platformFilters[sale.soldVia]) {
        const platformData = dataByPlatform[sale.soldVia];
        if (platformData) {
          platformData.totalSalesRevenue += sale.grossSaleAmount;
          platformData.totalCOGS += sale.totalPurchaseCostOfItemSold * sale.quantitySold;
          platformData.totalProfit += sale.profit;
          platformData.numberOfSales += 1;
          platformData.totalQuantitySold += sale.quantitySold;
        }
      }
    });

    return SOLD_VIA_PLATFORMS
      .filter(platformConst => platformFilters[platformConst.value])
      .map(platformConst => {
        const data = dataByPlatform[platformConst.value];
        if (!data) {
          return {
            id: platformConst.value, // Changed from platform to id
            label: platformConst.label, // Changed from platformLabel to label
            totalSalesRevenue: 0, totalCOGS: 0, totalProfit: 0, numberOfSales: 0, totalQuantitySold: 0,
            profitMargin: 0, averageSalePrice: 0, averageProfitPerItem: 0,
          };
        }
        const profitMargin = data.totalSalesRevenue > 0 ? (data.totalProfit / data.totalSalesRevenue) * 100 : 0;
        const averageSalePrice = data.totalQuantitySold > 0 ? data.totalSalesRevenue / data.totalQuantitySold : 0;
        const averageProfitPerItem = data.totalQuantitySold > 0 ? data.totalProfit / data.totalQuantitySold : 0;

        return {
          id: platformConst.value, // Changed from platform to id
          label: platformConst.label, // Changed from platformLabel to label
          totalSalesRevenue: parseFloat(data.totalSalesRevenue.toFixed(2)),
          totalCOGS: parseFloat(data.totalCOGS.toFixed(2)),
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          numberOfSales: data.numberOfSales,
          totalQuantitySold: data.totalQuantitySold,
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          averageSalePrice: parseFloat(averageSalePrice.toFixed(2)),
          averageProfitPerItem: parseFloat(averageProfitPerItem.toFixed(2)),
        };
      }).filter(d => d.numberOfSales > 0);
  }, [allSales, dateRange, platformFilters]);

  const handleRefreshData = () => {
    loadSalesData();
    toast({ title: "Report Updated", description: "Sales channel performance data has been refreshed." });
  };

  const handlePlatformFilterChange = (platformValue: SoldViaPlatformValue, checked: boolean) => {
    setPlatformFilters(prev => ({ ...prev, [platformValue]: checked }));
  };
  
  const clearAllFilters = () => {
    setDateRange(undefined);
    setPlatformFilters(initialPlatformFilters);
    toast({ title: "Filters Cleared", description: "All report filters have been reset." });
  };

  const isAnyFilterActive = useMemo(() => {
    return dateRange !== undefined || Object.values(platformFilters).some(v => !v); 
  }, [dateRange, platformFilters]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Store className="h-7 w-7" /> Sales Channel Performance
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
              <SheetHeader>
                <SheetTitle>Filter Report</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div>
                  <Label className="text-base font-medium">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                   {dateRange && (
                    <Button variant="link" size="sm" className="px-0 mt-1" onClick={() => setDateRange(undefined)}>Clear Dates</Button>
                  )}
                </div>
                <div>
                  <Label className="text-base font-medium">Sales Channels</Label>
                  <div className="space-y-2 mt-1">
                    {SOLD_VIA_PLATFORMS.map(platform => (
                      <div key={platform.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`platform-filter-${platform.value}`}
                          checked={platformFilters[platform.value]}
                          onCheckedChange={(checked) => handlePlatformFilterChange(platform.value, !!checked)}
                        />
                        <Label htmlFor={`platform-filter-${platform.value}`} className="font-normal text-sm">{platform.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="pt-4 border-t">
                 <Button type="button" variant="ghost" onClick={clearAllFilters} disabled={!isAnyFilterActive} className="mr-auto">
                    <XCircle className="mr-2 h-4 w-4" /> Clear All Filters
                  </Button>
                <SheetClose asChild>
                  <Button type="button">Apply</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Performance by Sales Channel</CardTitle>
          <CardDescription>
            Detailed breakdown of sales, profit, and other metrics for each selected channel and date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Loading sales data...</p>
          ) : performanceData.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">
              No sales data available for the selected filters.
            </p>
          ) : (
            <SalesChannelPerformanceTable data={performanceData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

