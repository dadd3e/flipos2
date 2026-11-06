
"use client";

import React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed UiCardDescription as it's only used from /ui/card
import { 
  Package, DollarSign, TrendingUp, AlertTriangle, PlusCircle, ShoppingCart, FileText, BellPlus,
  PackageCheck, ArchiveRestore, ListTodo, CalendarClock, Percent, SlidersHorizontal, Eye, EyeOff, TrendingDown, Loader2 as PageLoaderIcon, Landmark as AuctionIcon
} from "lucide-react";
import { LinkButton } from "@/components/common/LinkButton";
const SalesChart = dynamic(() => import('@/components/dashboard/SalesChart').then(mod => mod.SalesChart), { 
  ssr: false, 
  loading: () => <Card className="h-[360px] flex items-center justify-center"><PageLoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" /></Card> 
});
const InventoryChart = dynamic(() => import('@/components/dashboard/InventoryChart').then(mod => mod.InventoryChart), { 
  ssr: false, 
  loading: () => <Card className="h-[360px] flex items-center justify-center"><PageLoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" /></Card> 
});
import { CondensedTasksList } from "@/components/dashboard/CondensedTasksList";
import { CondensedAuctionEventsList } from "@/components/dashboard/CondensedAuctionEventsList";
import type { InventoryItem, DashboardCardKey, DashboardSettings, Sale, Task, AlertConfig, AuctionEvent, Supplier } from '@/lib/types';
import { 
    AVAILABLE_DASHBOARD_CARDS, DEFAULT_VISIBLE_CARDS, DASHBOARD_SETTINGS_KEY, RESELLER_INVENTORY_KEY, 
    RESELLER_SALES_KEY, RESELLER_TASKS_KEY, ALERTS_CONFIG_KEY, RESELLER_ARCHIVED_TASKS_KEY,
    RESELLER_AUCTION_EVENTS_KEY, RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS
} from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, format, subDays, isAfter, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [totalInventoryValue, setTotalInventoryValue] = useState<string>("$0.00");
  const [totalInventoryValueDesc, setTotalInventoryValueDesc] = useState<string>("Calculating...");
  const [totalEstimatedProfit, setTotalEstimatedProfit] = useState<string>("$0.00");
  const [totalEstimatedProfitDesc, setTotalEstimatedProfitDesc] = useState<string>("Calculating...");
  const [visibleCards, setVisibleCards] = useState<DashboardCardKey[]>(DEFAULT_VISIBLE_CARDS);
  const [activeAlertsCount, setActiveAlertsCount] = useState<string>("0");
  const [activeAlertsDesc, setActiveAlertsDesc] = useState<string>("Calculating...");
  const [activeItemsCount, setActiveItemsCount] = useState<string>("0");
  const [activeItemsDesc, setActiveItemsDesc] = useState<string>("Calculating...");
  const [pendingItemsCount, setPendingItemsCount] = useState<string>("0");
  const [pendingItemsDesc, setPendingItemsDesc] = useState<string>("Calculating...");
  const [unlistedInventoryValue, setUnlistedInventoryValue] = useState<string>("$0.00");
  const [unlistedInventoryDesc, setUnlistedInventoryDesc] = useState<string>("Calculating...");
  const [totalSales30d, setTotalSales30d] = useState<string>("$0.00");
  const [totalSales30dDesc, setTotalSales30dDesc] = useState<string>("Calculating...");
  const [totalItemsSold30d, setTotalItemsSold30d] = useState<string>("0");
  const [totalItemsSold30dDesc, setTotalItemsSold30dDesc] = useState<string>("Calculating...");
  const [netProfit30d, setNetProfit30d] = useState<string>("$0.00");
  const [netProfit30dDesc, setNetProfit30dDesc] = useState<string>("Calculating...");
  const [averageSalePrice30d, setAverageSalePrice30d] = useState<string>("$0.00");
  const [averageSalePrice30dDesc, setAverageSalePrice30dDesc] = useState<string>("Calculating...");
  const [sellThroughRate30d, setSellThroughRate30d] = useState<string>("0%");
  const [sellThroughRate30dDesc, setSellThroughRate30dDesc] = useState<string>("Calculating...");
  const [pendingTasksCount, setPendingTasksCount] = useState<string>("0");
  const [pendingTasksDesc, setPendingTasksDesc] = useState<string>("Calculating...");
  const [averageActiveInventoryAge, setAverageActiveInventoryAge] = useState<string>("0 days");
  const [averageActiveInventoryAgeDesc, setAverageActiveInventoryAgeDesc] = useState<string>("Calculating...");
  
  const [upcomingAuctionsCount, setUpcomingAuctionsCount] = useState<string>("0");
  const [upcomingAuctionsCountDesc, setUpcomingAuctionsCountDesc] = useState<string>("Calculating...");
  const [dashboardUpcomingAuctionEvents, setDashboardUpcomingAuctionEvents] = useState<AuctionEvent[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);

  const [activeDashboardTasks, setActiveDashboardTasks] = useState<Task[]>([]);
  const [isCustomizeSheetOpen, setIsCustomizeSheetOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const loadDashboardSettings = useCallback(() => {
    const storedSettings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings: DashboardSettings = JSON.parse(storedSettings);
        if (parsedSettings.visibleCards && Array.isArray(parsedSettings.visibleCards)) {
          setVisibleCards(parsedSettings.visibleCards);
        } else {
          setVisibleCards(DEFAULT_VISIBLE_CARDS); 
        }
      } catch (e) {
        console.error("Failed to parse dashboard settings, using defaults.", e);
        setVisibleCards(DEFAULT_VISIBLE_CARDS);
      }
    } else {
      setVisibleCards(DEFAULT_VISIBLE_CARDS);
      localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify({ visibleCards: DEFAULT_VISIBLE_CARDS }));
    }
  }, []);

  const saveDashboardSettings = useCallback(() => {
    const newSettings: DashboardSettings = { visibleCards };
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(newSettings));
    toast({
      title: "Dashboard Settings Saved",
      description: "Your card visibility preferences have been updated.",
    });
    window.dispatchEvent(new StorageEvent('storage', {
      key: DASHBOARD_SETTINGS_KEY,
      newValue: JSON.stringify(newSettings),
      storageArea: localStorage,
    }));
    setIsCustomizeSheetOpen(false); 
  }, [visibleCards, toast]);

  const calculateValues = useCallback(() => {
    let inventory: InventoryItem[] = [];
    let sales: Sale[] = [];
    let tasks: Task[] = [];
    let alerts: AlertConfig[] = [];
    let auctionEvents: AuctionEvent[] = [];
    let loadedSuppliers: Supplier[] = DEFAULT_SUPPLIERS;

    try {
      const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
      const parsedInventory = storedInventory ? JSON.parse(storedInventory) : [];
      if (Array.isArray(parsedInventory)) inventory = parsedInventory;
      else { inventory = []; console.error("Inventory data is not an array", parsedInventory); }
    } catch (e) { console.error("Error parsing inventory for dashboard:", e); inventory = []; }

    try {
      const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
      const parsedSales = storedSales ? JSON.parse(storedSales) : [];
      if (Array.isArray(parsedSales)) sales = parsedSales;
      else { sales = []; console.error("Sales data is not an array", parsedSales); }
    } catch (e) { console.error("Error parsing sales for dashboard:", e); sales = []; }
    
    try {
      const storedTasks = localStorage.getItem(RESELLER_TASKS_KEY);
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
      if(Array.isArray(parsedTasks)) tasks = parsedTasks;
      else { tasks = []; console.error("Tasks data is not an array", parsedTasks); }
    } catch (e) { console.error("Error parsing tasks for dashboard:", e); tasks = []; }

    try {
      const storedAlerts = localStorage.getItem(ALERTS_CONFIG_KEY);
      const parsedAlerts = storedAlerts ? JSON.parse(storedAlerts) : [];
      if(Array.isArray(parsedAlerts)) alerts = parsedAlerts;
      else { alerts = []; console.error("Alerts data is not an array", parsedAlerts); }
    } catch (e) { console.error("Error parsing alerts for dashboard:", e); alerts = []; }

    try {
      const storedAuctionEvents = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
      const parsedAuctionEvents = storedAuctionEvents ? JSON.parse(storedAuctionEvents) : [];
      if (Array.isArray(parsedAuctionEvents)) auctionEvents = parsedAuctionEvents;
      else { auctionEvents = []; console.error("Auction events data is not an array", parsedAuctionEvents); }
    } catch (e) { console.error("Error parsing auction events for dashboard:", e); auctionEvents = []; }

    try {
      const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      const parsedSuppliers = storedSuppliers ? JSON.parse(storedSuppliers) : DEFAULT_SUPPLIERS;
      if (Array.isArray(parsedSuppliers)) loadedSuppliers = parsedSuppliers;
      else { loadedSuppliers = DEFAULT_SUPPLIERS; console.error("Suppliers data is not an array", parsedSuppliers); }
    } catch (e) { console.error("Error parsing suppliers for dashboard:", e); loadedSuppliers = DEFAULT_SUPPLIERS; }
    setAllSuppliers(loadedSuppliers);

    const relevantItemsForValue = inventory.filter(item => item.status === 'Active' || item.status === 'Pending');
    if (relevantItemsForValue.length > 0) {
      const sumValue = relevantItemsForValue.reduce((acc, item) => acc + (item.totalPurchaseCost || 0), 0);
      setTotalInventoryValue(`$${sumValue.toFixed(2)}`);
      setTotalInventoryValueDesc(`Based on ${relevantItemsForValue.length} active/pending item(s)`);
    } else {
      setTotalInventoryValue("$0.00");
      setTotalInventoryValueDesc("No active or pending items");
    }
    const activeItemsForProfit = inventory.filter((item) => item.status === 'Active');
    if (activeItemsForProfit.length > 0) {
      const sumProfit = activeItemsForProfit.reduce((acc, item) => acc + (item.potentialProfit || 0), 0);
      setTotalEstimatedProfit(`${sumProfit < 0 ? "-" : ""}$${Math.abs(sumProfit).toFixed(2)}`);
      setTotalEstimatedProfitDesc(`Based on ${activeItemsForProfit.length} active item(s)`);
    } else {
      setTotalEstimatedProfit("$0.00");
      setTotalEstimatedProfitDesc("No active items for profit estimation");
    }
    const activeSystemAlerts = alerts.filter(alert => alert.isActive);
    setActiveAlertsCount(activeSystemAlerts.length.toString());
    setActiveAlertsDesc(activeSystemAlerts.length > 0 ? `${activeSystemAlerts.length} active system alert(s)` : "No active system alerts");

    const currentActiveItems = inventory.filter(item => item.status === 'Active');
    setActiveItemsCount(currentActiveItems.length.toString());
    setActiveItemsDesc(currentActiveItems.length > 0 ? `${currentActiveItems.length} items currently active` : "No active items");

    const currentPendingItems = inventory.filter(item => item.status === 'Pending');
    setPendingItemsCount(currentPendingItems.length.toString());
    setPendingItemsDesc(currentPendingItems.length > 0 ? `${currentPendingItems.length} items pending listing` : "No pending items");

    const unlistedValue = currentPendingItems.reduce((sum, item) => sum + (item.totalPurchaseCost || 0), 0);
    setUnlistedInventoryValue(`$${unlistedValue.toFixed(2)}`);
    setUnlistedInventoryDesc(currentPendingItems.length > 0 ? `Total cost of ${currentPendingItems.length} pending items` : "No pending items");
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSales = sales.filter(sale => {
      try { return isAfter(parseISO(sale.saleDate), thirtyDaysAgo); }
      catch { return false; }
    });

    const totalGrossSales30dNum = recentSales.reduce((sum, sale) => sum + sale.grossSaleAmount, 0);
    setTotalSales30d(`$${totalGrossSales30dNum.toFixed(2)}`);
    setTotalSales30dDesc(recentSales.length > 0 ? `From ${recentSales.length} sale(s) in last 30 days` : "No sales in last 30 days");

    const itemsSold30dNum = recentSales.reduce((sum, sale) => sum + sale.quantitySold, 0);
    setTotalItemsSold30d(itemsSold30dNum.toString());
    setTotalItemsSold30dDesc(itemsSold30dNum > 0 ? `${itemsSold30dNum} individual items sold recently` : "No items sold in last 30 days");
    
    const profit30dNum = recentSales.reduce((sum, sale) => sum + sale.profit, 0);
    setNetProfit30d(`${profit30dNum < 0 ? "-" : ""}$${Math.abs(profit30dNum).toFixed(2)}`);
    setNetProfit30dDesc(recentSales.length > 0 ? `Net profit from recent sales` : "No profit data for last 30 days");

    const asp30dNum = itemsSold30dNum > 0 ? totalGrossSales30dNum / itemsSold30dNum : 0;
    setAverageSalePrice30d(`$${asp30dNum.toFixed(2)}`);
    setAverageSalePrice30dDesc(itemsSold30dNum > 0 ? `Average per item sold recently` : "No sales for ASP calculation");

    const str30dNum = (itemsSold30dNum + currentActiveItems.length) > 0 ? (itemsSold30dNum / (itemsSold30dNum + currentActiveItems.length)) * 100 : 0;
    setSellThroughRate30d(`${str30dNum.toFixed(1)}%`);
    setSellThroughRate30dDesc(itemsSold30dNum > 0 || currentActiveItems.length > 0 ? `Recent sales vs. current stock` : "Not enough data");

    const currentActiveTasks = tasks.filter(task => task.status !== 'done');
    setPendingTasksCount(currentActiveTasks.length.toString());
    setPendingTasksDesc(currentActiveTasks.length > 0 ? `${currentActiveTasks.length} tasks require attention` : "All tasks completed!");
    setActiveDashboardTasks(currentActiveTasks);

    let totalAgeDays = 0;
    let itemsWithPurchaseDate = 0;
    const todayForAge = new Date();
    currentActiveItems.forEach(item => {
      if (item.purchaseDate) {
        try {
          totalAgeDays += differenceInDays(todayForAge, parseISO(item.purchaseDate));
          itemsWithPurchaseDate++;
        } catch { /* ignore invalid dates */ }
      }
    });
    const avgAge = itemsWithPurchaseDate > 0 ? totalAgeDays / itemsWithPurchaseDate : 0;
    setAverageActiveInventoryAge(`${avgAge.toFixed(0)} days`);
    setAverageActiveInventoryAgeDesc(itemsWithPurchaseDate > 0 ? `Avg. age of ${itemsWithPurchaseDate} active items with purchase date` : "No active items with purchase date");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const futureAuctions = auctionEvents.filter(event => {
        try {
            const eventDate = parseISO(event.auctionDate);
            return isValid(eventDate) && eventDate >= todayStart;
        } catch {
            return false;
        }
    }).sort((a,b) => parseISO(a.auctionDate).getTime() - parseISO(b.auctionDate).getTime());
    
    setUpcomingAuctionsCount(futureAuctions.length.toString());
    setUpcomingAuctionsCountDesc(futureAuctions.length > 0 ? `${futureAuctions.length} upcoming event(s)` : "No upcoming auctions");
    setDashboardUpcomingAuctionEvents(futureAuctions);

  }, []);


  const checkAndCreateAutomatedTasks = useCallback(() => {
    let inventory: InventoryItem[] = [];
    let sales: Sale[] = [];
    let tasks: Task[] = [];
    let alerts: AlertConfig[] = [];

    try {
      const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
      const parsedInventory = storedInventory ? JSON.parse(storedInventory) : [];
      if (Array.isArray(parsedInventory)) inventory = parsedInventory;
    } catch (e) { console.error("Error parsing inventory for task automation:", e); }

    try {
      const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
      const parsedSales = storedSales ? JSON.parse(storedSales) : [];
      if (Array.isArray(parsedSales)) sales = parsedSales;
    } catch (e) { console.error("Error parsing sales for task automation:", e); }
    
    try {
      const storedTasks = localStorage.getItem(RESELLER_TASKS_KEY);
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
      if (Array.isArray(parsedTasks)) tasks = parsedTasks;
    } catch (e) { console.error("Error parsing tasks for task automation:", e); }

    try {
      const storedAlerts = localStorage.getItem(ALERTS_CONFIG_KEY);
      const parsedAlerts = storedAlerts ? JSON.parse(storedAlerts) : [];
      if (Array.isArray(parsedAlerts)) alerts = parsedAlerts;
    } catch (e) { console.error("Error parsing alerts for task automation:", e); }


    let newTasksCreated: Task[] = [];
    const today = new Date();

    const agingInventoryAlertActive = alerts.find(a => a.type === 'aging_inventory' && a.isActive);
    if (agingInventoryAlertActive) {
      inventory.forEach(item => {
        if (item.status === 'Active') {
          try {
            const itemAddedDate = parseISO(item.dateAdded);
            if (differenceInDays(today, itemAddedDate) > 45) {
              const taskExists = tasks.some(task => 
                task.inventoryItemId === item.id && task.source === 'automated_aging_inventory'
              );
              if (!taskExists) {
                const newTask: Task = {
                  id: crypto.randomUUID(),
                  title: `Review Descriptions and Pricing - ${item.name}`,
                  status: 'todo',
                  priority: 'medium',
                  inventoryItemId: item.id,
                  inventoryItemName: item.name,
                  createdAt: today.toISOString(),
                  updatedAt: today.toISOString(),
                  source: 'automated_aging_inventory',
                };
                newTasksCreated.push(newTask);
              }
            }
          } catch (e) {
            console.error(`Error processing aging inventory for item ${item.id}:`, e);
          }
        }
      });
    }

    const customerSatisfactionAlertActive = alerts.find(a => a.type === 'customer_satisfaction' && a.isActive);
    if (customerSatisfactionAlertActive) {
      sales.forEach(sale => {
        try {
          const saleDate = parseISO(sale.saleDate);
          if (differenceInDays(today, saleDate) > 21) {
            const taskExists = tasks.some(task => 
              task.saleId === sale.id && task.source === 'automated_customer_satisfaction'
            );
            if (!taskExists) {
              const newTask: Task = {
                id: crypto.randomUUID(),
                title: `Customer Satisfaction - ${sale.itemName}`,
                status: 'todo',
                priority: 'medium',
                saleId: sale.id,
                saleIdentifier: `Sale of '${sale.itemName}' on ${format(saleDate, "MM/dd/yyyy")}`,
                createdAt: today.toISOString(),
                updatedAt: today.toISOString(),
                source: 'automated_customer_satisfaction',
              };
              newTasksCreated.push(newTask);
            }
          }
        } catch (e) {
          console.error(`Error processing customer satisfaction for sale ${sale.id}:`, e);
        }
      });
    }

    if (newTasksCreated.length > 0) {
      const allCurrentTasksRaw = localStorage.getItem(RESELLER_TASKS_KEY) || '[]';
      let allCurrentTasks: Task[] = [];
      try {
        allCurrentTasks = JSON.parse(allCurrentTasksRaw);
        if(!Array.isArray(allCurrentTasks)) allCurrentTasks = [];
      } catch { allCurrentTasks = []; }

      const combinedTasks = [...allCurrentTasks, ...newTasksCreated];
      localStorage.setItem(RESELLER_TASKS_KEY, JSON.stringify(combinedTasks));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_TASKS_KEY, newValue: JSON.stringify(combinedTasks), storageArea: localStorage }));
      toast({
        title: "Automated Tasks Created",
        description: `${newTasksCreated.length} new task(s) have been automatically generated.`,
      });
      setActiveDashboardTasks(combinedTasks.filter(task => task.status !== 'done'));
    }
  }, [toast]);
  
  const handleCompleteTaskFromDashboard = useCallback((taskId: string) => {
    const now = new Date().toISOString();
    let taskToArchive: Task | undefined;

    setActiveDashboardTasks(prevActiveTasks => {
      const updatedActiveTasks = prevActiveTasks.filter(task => {
        if (task.id === taskId) {
          taskToArchive = { ...task, status: 'done', updatedAt: now };
          return false; 
        }
        return true;
      });
      localStorage.setItem(RESELLER_TASKS_KEY, JSON.stringify(updatedActiveTasks));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_TASKS_KEY, newValue: JSON.stringify(updatedActiveTasks), storageArea: localStorage }));
      
      if (taskToArchive) {
        const storedArchivedTasksRaw = localStorage.getItem(RESELLER_ARCHIVED_TASKS_KEY);
        let currentArchivedTasks: Task[] = [];
        if (storedArchivedTasksRaw) {
          try { 
              const parsed = JSON.parse(storedArchivedTasksRaw);
              if(Array.isArray(parsed)) currentArchivedTasks = parsed;
          } catch(e) { console.error("Failed to parse archived tasks", e); }
        }
        const newArchivedTasks = [...currentArchivedTasks, taskToArchive];
        localStorage.setItem(RESELLER_ARCHIVED_TASKS_KEY, JSON.stringify(newArchivedTasks));
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ARCHIVED_TASKS_KEY, newValue: JSON.stringify(newArchivedTasks), storageArea: localStorage }));

        toast({
          title: "Task Completed & Archived",
          description: `Task "${(taskToArchive as Task).title}" marked as Done.`,
        });
      }
      return updatedActiveTasks;
    });
    calculateValues();
  }, [toast, calculateValues]);


  useEffect(() => {
    if (!isClient) return;

    loadDashboardSettings();
    calculateValues();
    checkAndCreateAutomatedTasks();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_INVENTORY_KEY || event.key === ALERTS_CONFIG_KEY || event.key === RESELLER_SALES_KEY || event.key === RESELLER_TASKS_KEY || event.key === RESELLER_ARCHIVED_TASKS_KEY || event.key === RESELLER_AUCTION_EVENTS_KEY || event.key === RESELLER_SUPPLIERS_KEY) {
        calculateValues();
      }
      if (event.key === DASHBOARD_SETTINGS_KEY) {
        loadDashboardSettings();
      }
      if (event.key === RESELLER_TASKS_KEY || event.key === RESELLER_INVENTORY_KEY || event.key === RESELLER_SALES_KEY || event.key === ALERTS_CONFIG_KEY) {
        checkAndCreateAutomatedTasks();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isClient, loadDashboardSettings, calculateValues, checkAndCreateAutomatedTasks]);

  const handleCardVisibilityChange = useCallback((cardId: DashboardCardKey, checked: boolean) => {
    setVisibleCards(prev =>
      checked ? [...prev, cardId] : prev.filter(id => id !== cardId)
    );
  }, []);

  const cardComponents = useMemo(() => ({
    totalInventoryValue: <StatCard title="Total Inventory Value" value={totalInventoryValue} description={totalInventoryValueDesc} icon={Package} />,
    totalEstimatedProfit: <StatCard title="Total Est. Profit" value={totalEstimatedProfit} description={totalEstimatedProfitDesc} icon={TrendingUp} className={parseFloat(totalEstimatedProfit.replace(/[^0-9.-]+/g,"")) >= 0 ? "" : "text-destructive"} />,
    activeAlerts: <StatCard title="Active Alert Configs" value={activeAlertsCount} description={activeAlertsDesc} icon={AlertTriangle} />,
    activeItemsCount: <StatCard title="Active Items" value={activeItemsCount} description={activeItemsDesc} icon={PackageCheck} />,
    pendingItemsCount: <StatCard title="Pending Items" value={pendingItemsCount} description={pendingItemsDesc} icon={ArchiveRestore} />,
    unlistedInventoryValue: <StatCard title="Unlisted Inv. Value" value={unlistedInventoryValue} description={unlistedInventoryDesc} icon={DollarSign} />,
    totalSales30d: <StatCard title="Gross Sales (30d)" value={totalSales30d} description={totalSales30dDesc} icon={DollarSign} />,
    totalItemsSold30d: <StatCard title="Items Sold (30d)" value={totalItemsSold30d} description={totalItemsSold30dDesc} icon={ShoppingCart} />,
    netProfit30d: <StatCard title="Net Profit (30d)" value={netProfit30d} description={netProfit30dDesc} icon={netProfit30d.startsWith('-') ? TrendingDown : TrendingUp} className={netProfit30d.startsWith('-') ? "text-destructive" : ""} />,
    averageSalePrice30d: <StatCard title="Avg. Sale Price (30d)" value={averageSalePrice30d} description={averageSalePrice30dDesc} icon={DollarSign} />,
    sellThroughRate30d: <StatCard title="Sell-Through (30d)" value={sellThroughRate30d} description={sellThroughRate30dDesc} icon={Percent} />,
    pendingTasksCount: <StatCard title="Pending Tasks" value={pendingTasksCount} description={pendingTasksDesc} icon={ListTodo} href="/tasks" />,
    averageActiveInventoryAge: <StatCard title="Avg. Inv. Age" value={averageActiveInventoryAge} description={averageActiveInventoryAgeDesc} icon={CalendarClock} />,
    upcomingAuctions: <StatCard title="Upcoming Auctions" value={upcomingAuctionsCount} description={upcomingAuctionsCountDesc} icon={AuctionIcon} href="/auction-assist/auctions" />,
  }), [
    totalInventoryValue, totalInventoryValueDesc, totalEstimatedProfit, totalEstimatedProfitDesc, 
    activeAlertsCount, activeAlertsDesc, activeItemsCount, activeItemsDesc, pendingItemsCount, pendingItemsDesc, 
    unlistedInventoryValue, unlistedInventoryDesc, totalSales30d, totalSales30dDesc, totalItemsSold30d, 
    totalItemsSold30dDesc, netProfit30d, netProfit30dDesc, averageSalePrice30d, averageSalePrice30dDesc, 
    sellThroughRate30d, sellThroughRate30dDesc, pendingTasksCount, pendingTasksDesc, 
    averageActiveInventoryAge, averageActiveInventoryAgeDesc, upcomingAuctionsCount, upcomingAuctionsCountDesc
  ]);

  if (!isClient) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <Card><CardHeader><CardTitle className="h-6 bg-muted rounded w-1/3"></CardTitle></CardHeader><CardContent className="h-20 bg-muted rounded"></CardContent></Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
        </div>
         <Card className="mt-6">
          <CardHeader><Skeleton className="h-6 w-1/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
           <Card><CardHeader><Skeleton className="h-5 w-1/3 mb-1" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
           <Card><CardHeader><Skeleton className="h-5 w-1/3 mb-1" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card data-ai-hint="team collaboration">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="font-headline">Quick Actions</CardTitle>
           <Sheet open={isCustomizeSheetOpen} onOpenChange={setIsCustomizeSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Customize Cards
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Customize Dashboard Cards</SheetTitle>
                <SheetDescription>
                  Select which cards you want to see on your dashboard.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-200px)] my-4 pr-3">
                <div className="space-y-3 py-2">
                  {AVAILABLE_DASHBOARD_CARDS.map(card => (
                    <div key={card.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                      <Label htmlFor={`visibility-${card.id}`} className="text-sm font-medium">
                        {card.title}
                      </Label>
                      <Switch
                        id={`visibility-${card.id}`}
                        checked={visibleCards.includes(card.id)}
                        onCheckedChange={(checked) => handleCardVisibilityChange(card.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <SheetFooter className="mt-auto border-t pt-4">
                <Button onClick={saveDashboardSettings} className="w-full">Save Settings</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <LinkButton href="/inventory/add" text="Add Item" icon={PlusCircle} variant="default" />
          <LinkButton href="/sales#log" text="Log Sale" icon={ShoppingCart} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground" />
          <LinkButton href="/expenses/invoices" text="Invoices" icon={FileText} variant="secondary" />
          <LinkButton href="/alerts#create" text="Set Alerts" icon={BellPlus} variant="default" className="bg-warning text-white hover:bg-warning/90" />
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {AVAILABLE_DASHBOARD_CARDS.filter(card => visibleCards.includes(card.id)).map(card => (
          <React.Fragment key={card.id}>
            {cardComponents[card.id]}
          </React.Fragment>
        ))}
         {AVAILABLE_DASHBOARD_CARDS.filter(card => visibleCards.includes(card.id)).length === 0 && (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="h-32 flex flex-col items-center justify-center">
              <EyeOff className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No cards selected for display.</p>
              <p className="text-sm text-muted-foreground">Click "Customize Cards" to add some.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6"> {/* Changed from grid to space-y for full width */}
        <CondensedTasksList tasks={activeDashboardTasks} onTaskComplete={handleCompleteTaskFromDashboard} />
        <CondensedAuctionEventsList events={dashboardUpcomingAuctionEvents} allSuppliers={allSuppliers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesChart />
        <InventoryChart />
      </div>

    </div>
  );
}
