
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import type { MonthlySpending, SpendingCategory } from "@/lib/types";
import { SPENDING_CATEGORIES_CONFIG } from "@/lib/reportingUtils";
import { DollarSign, ShoppingCart, Truck, HandCoins, Banknote, type LucideIcon } from "lucide-react";

// Type categoryIcons more strictly and include all SpendingCategory types + 'total'
const categoryIcons: Record<SpendingCategory | 'total', LucideIcon> = {
  cogs: ShoppingCart,
  inboundShipping: Truck,
  outboundShipping: Truck,
  fees: HandCoins,
  general: DollarSign, // Added 'general' with a default icon
  total: Banknote,
};

interface SpendingCardViewProps {
  data: MonthlySpending[];
}

export function SpendingCardView({ data }: SpendingCardViewProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No spending data available for card view.</p>;
  }

  return (
    <div className="space-y-6">
      {data.map((monthData) => (
        <Card key={monthData.month}>
          <CardHeader>
            <CardTitle className="font-headline text-xl">{monthData.monthLabel} Spending Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPENDING_CATEGORIES_CONFIG.map(category => (
                <StatCard
                  key={category.id}
                  title={category.label}
                  value={`$${monthData[category.id].toFixed(2)}`}
                  icon={categoryIcons[category.id]} // Directly use the typed icon
                  className={monthData[category.id] > 0 ? "" : "opacity-70"}
                />
              ))}
              <StatCard
                title="Total Spending"
                value={`$${monthData.total.toFixed(2)}`}
                icon={categoryIcons.total} // Directly use the typed icon
                className="font-semibold"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
