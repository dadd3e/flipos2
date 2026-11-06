
"use client";

import { useState, useEffect } from 'react';
import { ProfitLossDisplay } from "@/components/reports/ProfitLossDisplay";
import type { ProfitLossData, Sale } from "@/lib/types";
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RESELLER_SALES_KEY } from '@/lib/constants';

function calculateProfitLoss(sales: Sale[]): ProfitLossData {
  if (sales.length === 0) {
    return {
      totalRevenue: 0,
      totalCostOfGoodsSold: 0,
      totalShippingCosts: 0,
      totalPlatformFees: 0,
      netProfit: 0,
      roi: 0,
    };
  }
  let totalRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalShippingCosts = 0;
  let totalPlatformFees = 0;

  sales.forEach(sale => {
    totalRevenue += sale.grossSaleAmount;
    totalShippingCosts += sale.actualShippingCostBySeller;
    totalPlatformFees += sale.totalPlatformFeesAndDiscounts;
    totalCostOfGoodsSold += sale.totalPurchaseCostOfItemSold * sale.quantitySold;
  });

  const netProfit = totalRevenue - totalCostOfGoodsSold - totalShippingCosts - totalPlatformFees;
  const roi = totalCostOfGoodsSold > 0 ? parseFloat(((netProfit / totalCostOfGoodsSold) * 100).toFixed(2)) : 0;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCostOfGoodsSold: parseFloat(totalCostOfGoodsSold.toFixed(2)),
    totalShippingCosts: parseFloat(totalShippingCosts.toFixed(2)),
    totalPlatformFees: parseFloat(totalPlatformFees.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    roi,
  };
}


export default function ProfitLossPage() {
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchDataAndCalculate = (isManualRefresh: boolean = false) => {
    setIsLoading(true);
    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    let salesData: Sale[] = [];
    if (storedSales) {
      try {
        const parsedSales = JSON.parse(storedSales);
        if(Array.isArray(parsedSales)) salesData = parsedSales;
      } catch (e) {
        console.error("Error parsing sales data for P&L report", e);
        salesData = [];
      }
    }

    const data = calculateProfitLoss(salesData); 
    setProfitLossData(data);
    setIsLoading(false);

    if (isManualRefresh && salesData.length > 0) { 
      toast({ title: "Report Updated", description: "Profit & Loss data has been recalculated." });
    } else if (!isManualRefresh && profitLossData === null && salesData.length === 0) { 
       toast({ title: "No Sales Data", description: "No sales data found to calculate P&L.", variant: "default"});
    }
  };

  useEffect(() => {
    fetchDataAndCalculate(false); // Initial load, not manual

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SALES_KEY) {
        fetchDataAndCalculate(false); // Update on storage change, not manual
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial fetch on mount

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Profit & Loss Report</h1>
        <Button onClick={() => fetchDataAndCalculate(true)} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {isLoading && !profitLossData ? (
         <p className="text-muted-foreground text-center py-8">Loading report data...</p>
      ) : (
        <ProfitLossDisplay data={profitLossData} />
      )}
    </div>
  );
}
