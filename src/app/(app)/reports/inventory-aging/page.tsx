
"use client";

import { useState, useEffect, useMemo } from 'react';
import { InventoryAgingTable, type AgedInventoryItem } from "@/components/reports/InventoryAgingTable";
import type { InventoryItem } from "@/lib/types";
import { RESELLER_INVENTORY_KEY } from '@/lib/constants';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, RefreshCw, BarChartHorizontalBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type SortableColumn = keyof Omit<AgedInventoryItem, 'ageInDays'> | 'ageInDaysCalculated';

const ageBuckets = [
  { name: "0-30 Days", min: 0, max: 30 },
  { name: "31-60 Days", min: 31, max: 60 },
  { name: "61-90 Days", min: 61, max: 90 },
  { name: "91-120 Days", min: 91, max: 120 },
  { name: "121-180 Days", min: 121, max: 180 },
  { name: "180+ Days", min: 181, max: Infinity },
];

const ageBucketColors = [
  "hsl(var(--chart-age-step-1))", // 0-30 Days (Least Prominent)
  "hsl(var(--chart-age-step-2))", // 31-60 Days
  "hsl(var(--chart-age-step-3))", // 61-90 Days
  "hsl(var(--chart-age-step-4))", // 91-120 Days
  "hsl(var(--chart-age-step-5))", // 121-180 Days
  "hsl(var(--chart-age-step-6))", // 180+ Days (Most Prominent)
];

const inventoryAgingValueChartConfig = {
  value: { label: "Total Value" }, // Base label for tooltip
  // Individual bucket colors will be handled by <Cell>
} satisfies ChartConfig;


export default function InventoryAgingPage() {
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortableColumn>('ageInDaysCalculated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [todayForAgeCalc, setTodayForAgeCalc] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTodayForAgeCalc(new Date());
  }, []);

  const loadInventory = (isManualRefresh: boolean = false) => {
    setIsLoading(true);
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    let loadedItems: InventoryItem[] = [];
    if (storedInventory) {
      try {
        const parsedItems = JSON.parse(storedInventory);
        if (Array.isArray(parsedItems)) {
          loadedItems = parsedItems;
        }
        setAllInventory(loadedItems);
      } catch (e) {
        console.error("Error parsing inventory for aging report:", e);
        setAllInventory([]);
      }
    } else {
      setAllInventory([]);
    }
    setIsLoading(false);
    if (isManualRefresh) {
      toast({ title: "Report Updated", description: "Inventory aging data has been refreshed." });
    }
  };

  useEffect(() => {
    loadInventory(false); 

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_INVENTORY_KEY) {
        const updatedStoredInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
        let newInventory: InventoryItem[] = [];
        if (updatedStoredInventory) {
          try { 
            const parsed = JSON.parse(updatedStoredInventory);
            if (Array.isArray(parsed)) newInventory = parsed;
           } 
          catch (e) { console.error("Error parsing updated inventory for aging report", e); }
        }
        setAllInventory(newInventory);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const agedInventoryData = useMemo(() => {
    if (!todayForAgeCalc) return []; 

    const today = todayForAgeCalc;
    const relevantItems = allInventory.filter(item => item.status === 'Active' || item.status === 'Pending');
    
    let processedItems: AgedInventoryItem[] = relevantItems.map(item => {
      let ageInDays: number | null = null;
      if (item.purchaseDate) {
        try {
          const purchaseDateParsed = parseISO(item.purchaseDate);
          if (isValid(purchaseDateParsed)) {
            ageInDays = differenceInDays(today, purchaseDateParsed);
          }
        } catch (e) {
          // ageInDays remains null
        }
      }
      return {
        ...item,
        ageInDaysCalculated: ageInDays,
      };
    });

    processedItems.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'ageInDaysCalculated') {
        valA = a.ageInDaysCalculated;
        valB = b.ageInDaysCalculated;
        if (valA === null && valB !== null) return 1;
        if (valA !== null && valB === null) return -1;
        if (valA === null && valB === null) return 0;
      } else {
        valA = a[sortBy as keyof InventoryItem];
        valB = b[sortBy as keyof InventoryItem];
      }
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        const numA = valA ?? (sortDirection === 'asc' ? Infinity : -Infinity);
        const numB = valB ?? (sortDirection === 'asc' ? Infinity : -Infinity);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      const dateA = valA && isValid(parseISO(String(valA))) ? parseISO(String(valA)).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
      const dateB = valB && isValid(parseISO(String(valB))) ? parseISO(String(valB)).getTime() : (sortDirection === 'asc' ? Infinity : -Infinity);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return processedItems;
  }, [allInventory, sortBy, sortDirection, todayForAgeCalc]);

  const inventoryAgingValueChartData = useMemo(() => {
    // Initialize buckets with 0 value and correct color
    const bucketValues: Record<string, { value: number; fillColor: string }> = ageBuckets.reduce(
      (acc, bucket, index) => {
        acc[bucket.name] = { value: 0, fillColor: ageBucketColors[index] };
        return acc;
      },
      {} as Record<string, { value: number; fillColor: string }>
    );

    if (agedInventoryData && agedInventoryData.length > 0) {
        agedInventoryData.forEach(item => {
          if (item.ageInDaysCalculated !== null && item.totalPurchaseCost) {
            for (const bucket of ageBuckets) {
              if (item.ageInDaysCalculated >= bucket.min && item.ageInDaysCalculated <= bucket.max) {
                bucketValues[bucket.name].value += item.totalPurchaseCost;
                break;
              }
            }
          }
        });
    }
    
    return ageBuckets.map((bucket) => ({
      name: bucket.name,
      value: parseFloat(bucketValues[bucket.name].value.toFixed(2)),
      fillColor: bucketValues[bucket.name].fillColor,
    }));

  }, [agedInventoryData]);


  const handleSort = (columnKey: SortableColumn) => {
    if (sortBy === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDirection('desc'); 
    }
  };

  if (!todayForAgeCalc && isLoading) { 
    return <p className="text-center py-10 text-muted-foreground">Loading inventory data...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <CalendarDays className="h-7 w-7" /> Inventory Aging Report
        </h1>
        <Button onClick={() => loadInventory(true)} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartHorizontalBig className="h-6 w-6" />
            Inventory Value by Age Bucket
          </CardTitle>
          <CardDescription>
            Total purchase value of 'Active' and 'Pending' inventory items grouped by age since purchase date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && inventoryAgingValueChartData.every(b => b.value === 0) ? (
            <p className="text-center py-10 text-muted-foreground">Loading chart data...</p>
          ) : inventoryAgingValueChartData.every(b => b.value === 0) && !allInventory.some(item => item.status === 'Active' || item.status === 'Pending') ? (
            <p className="text-center py-10 text-muted-foreground">No active or pending inventory to display in chart.</p>
          ) : inventoryAgingValueChartData.every(b => b.value === 0) ? (
             <p className="text-center py-10 text-muted-foreground">No data for chart. Ensure items have purchase dates and costs.</p>
          ) : (
            <ChartContainer config={inventoryAgingValueChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={Math.max(300, inventoryAgingValueChartData.length * 40)}>
                <BarChart data={inventoryAgingValueChartData} layout="vertical" margin={{ right: 30, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="value" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <YAxis dataKey="name" type="category" width={100} interval={0} />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent 
                                nameKey="name" 
                                formatter={(value, name, item) => (
                                    <div className="flex flex-col">
                                        <span className="font-medium" style={{ color: item.payload.fillColor }}>{item.payload.name}</span>
                                        <span className="text-muted-foreground">Total Value: ${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                )}
                            />}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {inventoryAgingValueChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aged Inventory Details</CardTitle>
          <CardDescription>
            This report shows 'Active' and 'Pending' items and how long they have been in your inventory since their <strong className="font-semibold">purchase date</strong>. Items without a purchase date will show 'N/A' for age.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && agedInventoryData.length === 0 ? ( 
            <p className="text-center py-10 text-muted-foreground">Loading inventory data...</p>
          ) : agedInventoryData.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No active or pending inventory items to display.</p>
          ) : (
            <InventoryAgingTable
              items={agedInventoryData}
              onSort={handleSort}
              currentSortKey={sortBy}
              currentSortDirection={sortDirection}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    

