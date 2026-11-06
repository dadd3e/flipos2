
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const inventoryData: { name: string; value: number }[] = []; // No mock data

export function InventoryChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Inventory Value by Category</CardTitle>
        <CardDescription>Current estimated value of your inventory items.</CardDescription>
      </CardHeader>
      <CardContent>
        {inventoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No inventory data to display.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                itemStyle={{ color: 'hsl(var(--card-foreground))' }}
              />
              <Legend />
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
