
import type { InventoryItem, Sale, SpendingCategory, MonthlySpending, GeneralExpense } from './types';
import { format, parseISO, startOfMonth, subMonths, isWithinInterval, isValid } from 'date-fns';

export function calculateMonthlySpending(
  inventoryItems: InventoryItem[],
  sales: Sale[],
  generalExpenses: GeneralExpense[],
  numberOfMonths: number = 6
): MonthlySpending[] {
  const spendingByMonth: Record<string, Omit<MonthlySpending, 'month' | 'monthLabel'>> = {};
  const now = new Date();
  const allRelevantMonthKeys = new Set<string>();

  // Initialize for the last 'numberOfMonths'
  for (let i = 0; i < numberOfMonths; i++) {
    const monthDate = subMonths(startOfMonth(now), i);
    const monthKey = format(monthDate, 'yyyy-MM');
    allRelevantMonthKeys.add(monthKey);
  }

  // Collect all unique months from actual data
  inventoryItems.forEach(item => {
    if (item.dateAdded && item.shippingAndHandling && item.shippingAndHandling > 0) {
      try {
        const itemAddedDate = parseISO(item.dateAdded);
        if (isValid(itemAddedDate)) {
          allRelevantMonthKeys.add(format(itemAddedDate, 'yyyy-MM'));
        }
      } catch (e) { /* Ignore invalid dates for month collection */ }
    }
  });

  sales.forEach(sale => {
    try {
      const saleDate = parseISO(sale.saleDate);
      if (isValid(saleDate)) {
        allRelevantMonthKeys.add(format(saleDate, 'yyyy-MM'));
      }
    } catch (e) { /* Ignore invalid dates for month collection */ }
  });

  generalExpenses.forEach(expense => {
    try {
      const expenseDate = parseISO(expense.date);
      if (isValid(expenseDate)) {
        allRelevantMonthKeys.add(format(expenseDate, 'yyyy-MM'));
      }
    } catch (e) { /* Ignore invalid dates for month collection */ }
  });

  // Initialize all unique months found (and the recent ones)
  allRelevantMonthKeys.forEach(monthKey => {
    if (!spendingByMonth[monthKey]) {
      spendingByMonth[monthKey] = { cogs: 0, inboundShipping: 0, outboundShipping: 0, fees: 0, general: 0, total: 0 };
    }
  });

  // Process Sales for COGS, Outbound Shipping, Fees
  sales.forEach(sale => {
    try {
      const saleDate = parseISO(sale.saleDate);
      if (!isValid(saleDate)) throw new Error('Invalid sale date');
      const saleMonth = format(saleDate, 'yyyy-MM');
      if (spendingByMonth[saleMonth]) {
        const cogsForItem = sale.totalPurchaseCostOfItemSold * sale.quantitySold;
        spendingByMonth[saleMonth].cogs += cogsForItem;
        spendingByMonth[saleMonth].outboundShipping += sale.actualShippingCostBySeller;
        spendingByMonth[saleMonth].fees += sale.totalPlatformFeesAndDiscounts;
      }
    } catch (e) {
      console.warn(`Skipping sale due to invalid date or processing error: ${sale.id}, ${sale.saleDate}`, e);
    }
  });

  // Process Inventory Items for Inbound Shipping (attributed to month item was added)
  inventoryItems.forEach(item => {
    if (item.shippingAndHandling && item.shippingAndHandling > 0 && item.dateAdded) {
      try {
        const itemAddedDate = parseISO(item.dateAdded);
        if (!isValid(itemAddedDate)) throw new Error('Invalid item added date');
        const itemAddedMonth = format(itemAddedDate, 'yyyy-MM');
        if (spendingByMonth[itemAddedMonth]) {
          spendingByMonth[itemAddedMonth].inboundShipping += item.shippingAndHandling;
        }
      } catch (e) {
        console.warn(`Skipping inventory item for inbound shipping due to invalid date or processing error: ${item.id}, ${item.dateAdded}`, e);
      }
    }
  });

  // Process General Expenses
  generalExpenses.forEach(expense => {
    try {
      const expenseDate = parseISO(expense.date);
      if (!isValid(expenseDate)) throw new Error('Invalid expense date');
      const expenseMonth = format(expenseDate, 'yyyy-MM');
      if (spendingByMonth[expenseMonth]) {
        spendingByMonth[expenseMonth].general += expense.amount;
      }
    } catch (e) {
      console.warn(`Skipping general expense due to invalid date or processing error: ${expense.id}, ${expense.date}`, e);
    }
  });

  // Final pass to calculate totals and format for each month
  for (const monthKey in spendingByMonth) {
    const monthData = spendingByMonth[monthKey];
    monthData.total = parseFloat((monthData.cogs + monthData.inboundShipping + monthData.outboundShipping + monthData.fees + monthData.general).toFixed(2));
    monthData.cogs = parseFloat(monthData.cogs.toFixed(2));
    monthData.inboundShipping = parseFloat(monthData.inboundShipping.toFixed(2));
    monthData.outboundShipping = parseFloat(monthData.outboundShipping.toFixed(2));
    monthData.fees = parseFloat(monthData.fees.toFixed(2));
    monthData.general = parseFloat(monthData.general.toFixed(2));
  }

  return Object.entries(spendingByMonth)
    .map(([monthKey, data]) => ({
      month: monthKey,
      monthLabel: format(parseISO(monthKey + '-01'), 'MMM yyyy'), 
      ...data,
    }))
    .sort((a, b) => b.month.localeCompare(a.month)); 
}

export const SPENDING_CATEGORIES_CONFIG: { id: SpendingCategory; label: string; chartColor: string; icon?: any }[] = [
    { id: 'cogs', label: 'Cost of Goods Sold', chartColor: 'hsl(var(--chart-1))' },
    { id: 'inboundShipping', label: 'Inbound Shipping & Handling', chartColor: 'hsl(var(--chart-2))' },
    { id: 'outboundShipping', label: 'Outbound Shipping Costs', chartColor: 'hsl(var(--chart-3))' },
    { id: 'fees', label: 'Platform Fees & Discounts', chartColor: 'hsl(var(--chart-4))' },
    { id: 'general', label: 'General Business Expenses', chartColor: 'hsl(var(--chart-5))' },
];
