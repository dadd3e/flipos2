
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const salesData: { name: string; sales: number }[] = []; // No mock data

export function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Sales Overview (Last 6 Months)</CardTitle>
        <CardDescription>Track your sales performance over time.</CardDescription>
      </CardHeader>
      <CardContent>
      {salesData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No sales data to display.</p>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
              itemStyle={{ color: 'hsl(var(--card-foreground))' }}
            />
            <Legend />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
