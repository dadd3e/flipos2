
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PerformanceBreakdownData } from "@/lib/types"; // Changed from PlatformPerformanceData
import { Badge } from "@/components/ui/badge";

interface SalesChannelPerformanceTableProps {
  data: PerformanceBreakdownData[]; // Changed from PlatformPerformanceData
}

export function SalesChannelPerformanceTable({ data }: SalesChannelPerformanceTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No performance data to display.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead className="text-right">Total Sales ($)</TableHead>
            <TableHead className="text-right">Total COGS ($)</TableHead>
            <TableHead className="text-right">Total Profit ($)</TableHead>
            <TableHead className="text-right"># Sales</TableHead>
            <TableHead className="text-right">Qty Sold</TableHead>
            <TableHead className="text-right">Profit Margin (%)</TableHead>
            <TableHead className="text-right">Avg. Sale Price ($)</TableHead>
            <TableHead className="text-right">Avg. Profit/Item ($)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((itemData) => ( // Changed platformData to itemData
            <TableRow key={itemData.id}> {/* Changed platformData.platform to itemData.id */}
              <TableCell className="font-medium">
                <Badge variant="secondary">{itemData.label}</Badge> {/* Changed platformData.platformLabel to itemData.label */}
              </TableCell>
              <TableCell className="text-right">${itemData.totalSalesRevenue.toFixed(2)}</TableCell>
              <TableCell className="text-right">${itemData.totalCOGS.toFixed(2)}</TableCell>
              <TableCell className={`text-right font-semibold ${itemData.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                ${itemData.totalProfit.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">{itemData.numberOfSales}</TableCell>
              <TableCell className="text-right">{itemData.totalQuantitySold}</TableCell>
              <TableCell className={`text-right ${itemData.profitMargin >= 0 ? '' : 'text-destructive'}`}>
                {itemData.profitMargin.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right">${itemData.averageSalePrice.toFixed(2)}</TableCell>
              <TableCell className={`text-right ${itemData.averageProfitPerItem >= 0 ? '' : 'text-destructive'}`}>
                ${itemData.averageProfitPerItem.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

