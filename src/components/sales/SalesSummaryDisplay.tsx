
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import type { Sale } from "@/lib/types";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";

interface SalesSummaryDisplayProps {
  sales: Sale[];
  title?: string;
  description?: string;
}

interface CalculatedSummary {
  totalGrossSales: number;
  totalCogs: number;
  totalNetProfit: number;
  totalFeesAndDiscounts: number;
  totalShippingBySeller: number;
}

export function calculateSalesSummary(sales: Sale[]): CalculatedSummary {
  let totalGrossSales = 0;
  let totalCogs = 0;
  let totalNetProfit = 0;
  let totalFeesAndDiscounts = 0;
  let totalShippingBySeller = 0;

  sales.forEach(sale => {
    totalGrossSales += sale.grossSaleAmount;
    totalCogs += sale.totalPurchaseCostOfItemSold * sale.quantitySold;
    totalNetProfit += sale.profit;
    totalFeesAndDiscounts += sale.totalPlatformFeesAndDiscounts;
    totalShippingBySeller += sale.actualShippingCostBySeller;
  });

  return {
    totalGrossSales: parseFloat(totalGrossSales.toFixed(2)),
    totalCogs: parseFloat(totalCogs.toFixed(2)),
    totalNetProfit: parseFloat(totalNetProfit.toFixed(2)),
    totalFeesAndDiscounts: parseFloat(totalFeesAndDiscounts.toFixed(2)),
    totalShippingBySeller: parseFloat(totalShippingBySeller.toFixed(2)),
  };
}

export function SalesSummaryDisplay({ sales, title = "Sales Summary", description = "Overview of sales performance." }: SalesSummaryDisplayProps) {
  const summary = calculateSalesSummary(sales);

  if (sales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No sales data available for this period or platform.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Gross Sales" value={`$${summary.totalGrossSales.toFixed(2)}`} icon={DollarSign} />
          <StatCard title="Total COGS" value={`$${summary.totalCogs.toFixed(2)}`} icon={ShoppingCart} />
          <StatCard 
            title="Net Profit" 
            value={`$${summary.totalNetProfit.toFixed(2)}`} 
            icon={summary.totalNetProfit >= 0 ? TrendingUp : TrendingDown} 
            className={summary.totalNetProfit >= 0 ? "" : "text-destructive"} // Use theme colors
          />
        </div>
         <CardDescription className="text-xs pt-2 border-t">
          Additional Details: Fees & Discounts: ${summary.totalFeesAndDiscounts.toFixed(2)} | Shipping by Seller: ${summary.totalShippingBySeller.toFixed(2)}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
