
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import type { ProfitLossData } from "@/lib/types";
import { DollarSign, TrendingUp, TrendingDown, Percent, Landmark, ShoppingCart, Truck } from "lucide-react";

interface ProfitLossDisplayProps {
  data: ProfitLossData | null;
  onRefresh?: () => void; // Optional refresh callback
}

export function ProfitLossDisplay({ data }: ProfitLossDisplayProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Profit & Loss Report</CardTitle>
          <CardDescription>No data available to generate the report. Please log sales and inventory purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ensure you have sales records and purchase prices for sold items to calculate profit and loss.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Profit & Loss Summary</CardTitle>
        <CardDescription>Overview of your financial performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Revenue" value={`$${data.totalRevenue.toFixed(2)}`} icon={DollarSign} />
          <StatCard title="Total COGS" value={`$${data.totalCostOfGoodsSold.toFixed(2)}`} icon={ShoppingCart} />
          <StatCard title="Gross Profit" value={`$${(data.totalRevenue - data.totalCostOfGoodsSold).toFixed(2)}`} icon={TrendingUp} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Shipping Costs" value={`$${data.totalShippingCosts.toFixed(2)}`} icon={Truck} />
          <StatCard title="Total Platform Fees" value={`$${(data.totalPlatformFees || 0).toFixed(2)}`} icon={Landmark} />
           <StatCard 
            title="Net Profit" 
            value={`$${data.netProfit.toFixed(2)}`} 
            icon={data.netProfit >= 0 ? TrendingUp : TrendingDown} 
            className={data.netProfit >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            title="Return on Investment (ROI)" 
            value={`${data.roi.toFixed(2)}%`} 
            icon={Percent} 
            className={data.roi >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>
        
        <CardDescription className="pt-4 border-t">
          <strong>Note:</strong> COGS (Cost of Goods Sold) is based on the purchase prices of items marked as sold. ROI is calculated as (Net Profit / Total COGS) * 100. Ensure all sales and purchase prices are accurately logged for precise reporting.
        </CardDescription>
      </CardContent>
    </Card>
  );
}

