
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"; // Added ChartConfig
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { TrendingUp, Package, ShoppingCart, Activity, DollarSign, Zap } from 'lucide-react';

// --- Mock Data Definitions ---

const monthlySalesData = [
  { month: "Jan", sales: 4000, profit: 2400 },
  { month: "Feb", sales: 3000, profit: 1398 },
  { month: "Mar", sales: 2000, profit: 9800 },
  { month: "Apr", sales: 2780, profit: 3908 },
  { month: "May", sales: 1890, profit: 4800 },
  { month: "Jun", sales: 2390, profit: 3800 },
  { month: "Jul", sales: 3490, profit: 4300 },
];

const categorySalesData = [
  { name: 'Electronics', value: 400, fill: 'hsl(var(--chart-1))' },
  { name: 'Clothing', value: 300, fill: 'hsl(var(--chart-2))' },
  { name: 'Home Goods', value: 300, fill: 'hsl(var(--chart-3))' },
  { name: 'Collectibles', value: 200, fill: 'hsl(var(--chart-4))' },
  { name: 'Other', value: 278, fill: 'hsl(var(--chart-5))' },
];

const inventoryAgingData = [
  { ageBucket: '0-30 Days', count: 25, value: 1200, fill: 'hsl(var(--chart-1))' },
  { ageBucket: '31-60 Days', count: 15, value: 900, fill: 'hsl(var(--chart-2))' },
  { ageBucket: '61-90 Days', count: 10, value: 1500, fill: 'hsl(var(--chart-3))' },
  { ageBucket: '90+ Days', count: 5, value: 2000, fill: 'hsl(var(--chart-4))' },
];

const salesChannelData = [
  { channel: 'eBay', sales: 1200, profit: 600, AOV: 50 },
  { channel: 'Etsy', sales: 900, profit: 450, AOV: 30 },
  { channel: 'Poshmark', sales: 700, profit: 300, AOV: 40 },
  { channel: 'Facebook', sales: 1000, profit: 700, AOV: 25 },
  { channel: 'Cash Sale', sales: 500, profit: 400, AOV: 100 },
];

// --- Reusable Chart Style Component ---
const ChartStyleToggle = ({ defaultValue, onValueChange, children, numStyles = 3 }: { defaultValue: string, onValueChange: (value: string) => void, children: React.ReactNode, numStyles?: number }) => {
  const gridColsClass = numStyles === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <Tabs defaultValue={defaultValue} onValueChange={onValueChange} className="mb-4">
      <TabsList className={`grid w-full ${gridColsClass} sm:w-auto`}>
        <TabsTrigger value="style1">Style 1</TabsTrigger>
        <TabsTrigger value="style2">Style 2</TabsTrigger>
        <TabsTrigger value="style3">Style 3</TabsTrigger>
        {numStyles === 4 && <TabsTrigger value="style4">Style 4</TabsTrigger>}
      </TabsList>
      {children}
    </Tabs>
  );
};

// --- Chart Configs ---
const monthlySalesChartConfig = {
  sales: { label: "Sales", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const monthlyProfitChartConfig = {
  profit: { label: "Profit", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const categorySalesChartConfig = {
  value: { label: "Sales" },
  Electronics: { label: "Electronics", color: "hsl(var(--chart-1))" },
  Clothing: { label: "Clothing", color: "hsl(var(--chart-2))" },
  'Home Goods': { label: "Home Goods", color: "hsl(var(--chart-3))" },
  Collectibles: { label: "Collectibles", color: "hsl(var(--chart-4))" },
  Other: { label: "Other", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const inventoryAgingChartConfig = {
  count: { label: "Item Count", color: "hsl(var(--chart-1))" },
  value: { label: "Total Value ($)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const salesChannelChartConfig = {
  sales: { label: "Sales ($)", color: "hsl(var(--chart-1))" },
  profit: { label: "Profit ($)", color: "hsl(var(--chart-2))" },
  AOV: { label: "Average Order Value ($)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


// --- Individual Chart Components ---

// 1. Monthly Sales Revenue Chart
const MonthlySalesRevenueChart = () => {
  const [style, setStyle] = useState('style1');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp /> Monthly Sales Revenue</CardTitle>
        <CardDescription>Total gross sales revenue per month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartStyleToggle defaultValue="style1" onValueChange={setStyle}>
          <TabsContent value="style1">
            <ChartContainer config={monthlySalesChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style2">
            <ChartContainer config={monthlySalesChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="sales" stroke="var(--color-sales)" fill="var(--color-sales)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style3">
            <ChartContainer config={monthlySalesChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </ChartStyleToggle>
      </CardContent>
    </Card>
  );
};

// 2. Monthly Net Profit Chart
const MonthlyNetProfitChart = () => {
  const [style, setStyle] = useState('style1');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign /> Monthly Net Profit</CardTitle>
        <CardDescription>Net profit generated each month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartStyleToggle defaultValue="style1" onValueChange={setStyle}>
          <TabsContent value="style1">
            <ChartContainer config={monthlyProfitChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style2">
            <ChartContainer config={monthlyProfitChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="profit" barSize={20} fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style3">
            <ChartContainer config={monthlyProfitChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySalesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="month" type="category" width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="profit" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </ChartStyleToggle>
      </CardContent>
    </Card>
  );
};

// 3. Sales Distribution by Category (Pie Chart)
const CategorySalesPieChart = () => {
  const [style, setStyle] = useState('style1');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Package /> Sales by Category</CardTitle>
        <CardDescription>Distribution of sales revenue across item categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartStyleToggle defaultValue="style1" onValueChange={setStyle}>
          <TabsContent value="style1">
            <ChartContainer config={categorySalesChartConfig} className="mx-auto aspect-square max-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                  <Pie data={categorySalesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style2">
            <ChartContainer config={categorySalesChartConfig} className="mx-auto aspect-square max-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <ChartLegend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    content={<ChartLegendContent nameKey="name" />}
                  />
                  <Pie data={categorySalesData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-donut-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style3">
            <ChartContainer config={categorySalesChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categorySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Sales">
                      {categorySalesData.map((entry, index) => (
                          <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </ChartStyleToggle>
      </CardContent>
    </Card>
  );
};

// 4. Inventory Aging Profile (Bar Chart)
const InventoryAgingChart = () => {
  const [style, setStyle] = useState('style1');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity /> Inventory Aging</CardTitle>
        <CardDescription>Number of items and their total value by age bucket.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartStyleToggle defaultValue="style1" onValueChange={setStyle}>
          <TabsContent value="style1">
            <ChartContainer config={inventoryAgingChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryAgingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageBucket" />
                  <YAxis yAxisId="left" orientation="left" stroke="var(--color-count)" />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-value)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" name="Item Count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="value" name="Total Value ($)" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style2"> 
            <ChartContainer config={inventoryAgingChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryAgingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageBucket" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" stackId="a" name="Item Count" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="value" stackId="a" name="Total Value ($)" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style3">
            <ChartContainer config={inventoryAgingChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryAgingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="ageBucket" type="category" width={80}/>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="value" name="Total Value ($)" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </ChartStyleToggle>
      </CardContent>
    </Card>
  );
};

// 5. Sales Channel Comparison (Radar Chart)
const SalesChannelRadarChart = () => {
  const [style, setStyle] = useState('style1');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShoppingCart /> Sales Channel Performance</CardTitle>
        <CardDescription>Comparison of sales, profit, and AOV across channels.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartStyleToggle defaultValue="style1" onValueChange={setStyle}>
          <TabsContent value="style1">
            <ChartContainer config={salesChannelChartConfig} className="mx-auto aspect-square max-h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={salesChannelData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="channel" />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Radar name="Sales ($)" dataKey="sales" stroke="var(--color-sales)" fill="var(--color-sales)" fillOpacity={0.6} />
                  <Radar name="Profit ($)" dataKey="profit" stroke="var(--color-profit)" fill="var(--color-profit)" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="style2">
            <ChartContainer config={salesChannelChartConfig} className="mx-auto aspect-square max-h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={salesChannelData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="channel" />
                  <PolarRadiusAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Radar name="Average Order Value ($)" dataKey="AOV" stroke="var(--color-AOV)" fill="var(--color-AOV)" fillOpacity={0.7} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
           <TabsContent value="style3">
            <ChartContainer config={salesChannelChartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesChannelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="sales" name="Sales ($)" fill="hsl(var(--chart-4))" radius={[4,4,0,0]}/>
                  <Bar dataKey="profit" name="Profit ($)" fill="hsl(var(--chart-5))" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </TabsContent>
        </ChartStyleToggle>
      </CardContent>
    </Card>
  );
};


export default function SampleGraphsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Zap /> Sample Graphs & Charts</h1>
      <p className="text-muted-foreground">
        This page demonstrates various chart types and styles using Recharts and ShadCN UI components.
        Each chart includes a toggle for different UI presentations.
      </p>
      
      <MonthlySalesRevenueChart />
      <MonthlyNetProfitChart />
      <CategorySalesPieChart />
      <InventoryAgingChart />
      <SalesChannelRadarChart />

    </div>
  );
}
    
