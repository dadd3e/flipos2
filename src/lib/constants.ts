

import type { AlertType, ItemStatus, SoldViaPlatformValue, CashSaleSourceValue, CashSalePaidViaValue, DashboardCard, DashboardCardKey, TaskStatus, TaskPriority, AppTheme, SupplierType, Supplier, GeneralExpenseCategory, SourcedItemStatus, AuctionEvent, TagDefinition, TriggeredAlert, PaymentMethod } from "./types";
import { ListTodo, Activity, CheckCircle2, Building, Store as StoreIcon, User, Gavel, PackageCheck, ArchiveRestore, Hourglass, CalendarClock, Percent, Briefcase, Search, Lightbulb, PauseCircle, Handshake, MessagesSquare, Landmark, AlertCircle, Gift, HeartCrack } from "lucide-react";

// Re-export types needed by other modules that import from constants
export type { AppTheme, TaskStatus, TaskPriority, SoldViaPlatformValue, ItemStatus, AlertType, SupplierType, SourcedItemStatus, AuctionEvent, TagDefinition, TriggeredAlert, PaymentMethod };

export const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: "low_stock", label: "Low Stock Notification" },
  { value: "high_value_sale_opportunity", label: "High-Value Sales Opportunity" },
  { value: "listing_expiration", label: "Listing Expiration Date" },
  { value: "aging_inventory", label: "Aging Inventory Task Trigger" },
  { value: "customer_satisfaction", label: "Customer Satisfaction Task Trigger" },
];

export const TAX_RATE = 0.13; // 13%

export const ITEM_SOURCES = [
  "HiBid",
  "MaxSold",
  "Thrift Store",
  "Antique Store",
  "Flea Market",
  "Facebook",
  "Kijiji",
  "Private Sale",
  "Other",
];

export const ITEM_STATUSES: { value: ItemStatus; label: string; icon?: React.ElementType }[] = [
  { value: 'Active', label: 'Active', icon: PackageCheck },
  { value: 'Pending', label: 'Pending', icon: Hourglass },
  { value: 'Sold', label: 'Sold', icon: ArchiveRestore },
  { value: 'Damaged', label: 'Damaged', icon: AlertCircle },
  { value: 'Donated', label: 'Donated', icon: Gift },
  { value: 'Kept', label: 'Kept (Personal Use)', icon: HeartCrack },
];

export const SOLD_VIA_PLATFORMS: { value: SoldViaPlatformValue; label: string }[] = [
  { value: "Etsy", label: "Etsy" },
  { value: "eBay", label: "eBay" },
  { value: "Poshmark", label: "Poshmark" },
  { value: "Facebook", label: "Facebook Marketplace (as platform)" },
  { value: "Cash Sale", label: "Cash Sale" },
  { value: "Other", label: "Other" },
] as const;

export const CASH_SALE_SOURCES: {value: CashSaleSourceValue; label: string}[] = [
  { value: "Facebook", label: "Facebook Marketplace" },
  { value: "Kijiji", label: "Kijiji" },
  { value: "Private Sale", label: "Private Sale" },
] as const;

export const CASH_SALE_PAID_VIA_OPTIONS: {value: CashSalePaidViaValue; label: string}[] = [
  { value: "Cash", label: "Cash" },
  { value: "Interac e-Transfer", label: "Interac e-Transfer" },
  { value: "PayPal", label: "PayPal" },
] as const;

// Dashboard Card Configuration
export const AVAILABLE_DASHBOARD_CARDS: DashboardCard[] = [
  { id: 'totalInventoryValue', title: 'Total Inventory Value' },
  { id: 'totalEstimatedProfit', title: 'Total Est. Profit' },
  { id: 'activeItemsCount', title: 'Active Items Count' },
  { id: 'pendingItemsCount', title: 'Pending Items Count' },
  { id: 'unlistedInventoryValue', title: 'Unlisted Inv. Value' },
  { id: 'totalSales30d', title: 'Gross Sales (30d)' },
  { id: 'totalItemsSold30d', title: 'Items Sold (30d)' },
  { id: 'netProfit30d', title: 'Net Profit (30d)' },
  { id: 'averageSalePrice30d', title: 'Avg. Sale Price (30d)' },
  { id: 'sellThroughRate30d', title: 'Sell-Through (30d)' },
  { id: 'pendingTasksCount', title: 'Pending Tasks' },
  { id: 'averageActiveInventoryAge', title: 'Avg. Inv. Age' },
  { id: 'activeAlerts', title: 'Active Alerts' },
  { id: 'upcomingAuctions', title: 'Upcoming Auctions' },
];

export const DEFAULT_VISIBLE_CARDS: DashboardCardKey[] = [
  'totalInventoryValue',
  'totalEstimatedProfit',
  'activeItemsCount',
  'totalSales30d',
  'netProfit30d',
  'pendingTasksCount',
  'upcomingAuctions',
  'sellThroughRate30d',
];

export const DASHBOARD_SETTINGS_KEY = 'resellerDashboardSettings';
export const ALERTS_CONFIG_KEY = 'resellerAlertsConfig'; // Renamed for clarity
export const RECENT_TRIGGERED_ALERTS_KEY = 'resellerRecentTriggeredAlerts';
export const ARCHIVED_TRIGGERED_ALERTS_KEY = 'resellerArchivedTriggeredAlerts';


// Task Manager Constants
export const TASK_STATUSES: { value: TaskStatus; label: string; icon?: React.ElementType }[] = [
  { value: 'todo', label: 'To Do', icon: ListTodo },
  { value: 'inprogress', label: 'In Progress', icon: Activity },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string; }[] = [
  { value: 'low', label: 'Low', color: 'hsl(217, 91%, 60%)' }, // Blue
  { value: 'medium', label: 'Medium', color: 'hsl(48, 96%, 53%)' }, // Yellow
  { value: 'high', label: 'High', color: 'hsl(0, 72%, 51%)' }, // Red
];

export const RESELLER_TASKS_KEY = 'resellerTasks';
export const RESELLER_ARCHIVED_TASKS_KEY = 'resellerArchivedTasks';
export const RESELLER_INVENTORY_KEY = 'resellerInventory';
export const RESELLER_SALES_KEY = 'resellerSales';
export const RESELLER_TASK_TAGS_KEY = 'resellerTaskTagsDefinitions';
export const DEFAULT_TASK_TAGS: TagDefinition[] = [];

// Predefined palette for tag colors
export const TAG_COLOR_PALETTE: { name: string; background: string; text: string }[] = [
  { name: "Rose", background: "#fda4af", text: "#881337" }, // rose-300, rose-800
  { name: "Sky", background: "#7dd3fc", text: "#075985" }, // sky-300, sky-800
  { name: "Teal", background: "#5eead4", text: "#115e59" }, // teal-300, teal-700
  { name: "Amber", background: "#fcd34d", text: "#92400e" }, // amber-300, amber-800
  { name: "Lime", background: "#bef264", text: "#3f6212" }, // lime-300, lime-700
  { name: "Violet", background: "#c4b5fd", text: "#5b21b6" }, // violet-300, violet-700
  { name: "Gray", background: "#d1d5db", text: "#1f2937" }, // gray-300, gray-800
];


// Item Categories
export const RESELLER_CATEGORIES_KEY = 'resellerItemCategories';
export const DEFAULT_CATEGORIES: string[] = [
  "Collectibles",
  "Clothing",
  "Electronics",
  "Home Goods",
  "Jewelry",
  "Toys & Games",
  "Books & Media",
  "Antiques",
  "Sports Equipment",
  "Other",
];

// Theme Configuration
export const APP_THEME_KEY = 'resellerAppTheme';
export const AVAILABLE_THEMES: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Light (Default)' },
  { value: 'dark', label: 'Dark' },
  { value: 'retro', label: 'Retro' },
  { value: 'throwback', label: 'Throwback' },
  { value: 'lavender', label: 'Lavender' },
];
export const DEFAULT_THEME: AppTheme = 'light';

// Supplier CRM Constants
export const RESELLER_SUPPLIERS_KEY = 'resellerSuppliers';
export const ADD_NEW_SUPPLIER_VALUE = "__add_new_supplier__";

export const SUPPLIER_TYPES: { value: SupplierType; label: string; icon: React.ElementType }[] = [
  { value: 'AuctionHouse', label: 'Auction House', icon: Gavel },
  { value: 'Store', label: 'Store', icon: StoreIcon },
  { value: 'PrivateSeller', label: 'Private Seller', icon: User },
  { value: 'OperatingExpenses', label: 'Operating Expenses', icon: Briefcase },
];
export const DEFAULT_SUPPLIERS: Supplier[] = [];

// General Expense Tracking Constants
export const RESELLER_GENERAL_EXPENSES_KEY = 'resellerGeneralExpenses';
export const GENERAL_EXPENSE_CATEGORIES: { value: GeneralExpenseCategory; label: string }[] = [
  { value: "Shipping Supplies", label: "Shipping Supplies" },
  { value: "Software & Subscriptions", label: "Software & Subscriptions" },
  { value: "Office Supplies", label: "Office Supplies" },
  { value: "Mileage", label: "Mileage" },
  { value: "Storage Fees", label: "Storage Fees" },
  { value: "Education & Training", label: "Education & Training" },
  { value: "Other", label: "Other" },
];

// Sourcing Assistance Constants
export const SOURCING_OPPORTUNITIES_KEY = 'resellerSourcingOpportunities';
export const SOURCED_ITEM_STATUSES: { value: SourcedItemStatus; label: string; icon?: React.ElementType }[] = [
  { value: 'Opportunity', label: 'Opportunity', icon: Lightbulb },
  { value: 'InProgress', label: 'In Progress', icon: Activity },
  { value: 'OnHold', label: 'On Hold', icon: PauseCircle },
  { value: 'Negotiating', label: 'Negotiating', icon: Handshake },
  { value: 'Completed', label: 'Completed', icon: CheckCircle2 },
];
export const USER_APP_LOGO_KEY = 'userAppLogo';

// Profile Information Constants
export const RESELLER_PROFILE_BUSINESS_NAME_KEY = 'resellerProfileBusinessName';
export const RESELLER_PROFILE_EMAIL_KEY = 'resellerProfileEmail';
export const DEFAULT_BUSINESS_NAME = 'My Reselling Co.';
export const DEFAULT_EMAIL = 'user@example.com';
export const RESELLER_ETSY_CONFIG_KEY = 'resellerEtsyConfig';
export const RESELLER_STALLION_CONFIG_KEY = 'resellerStallionConfig';

// Auction Assist Constants
export const RESELLER_AUCTION_EVENTS_KEY = 'resellerAuctionEvents';

// Invoice Management Constants
export const RESELLER_INVOICES_KEY = 'resellerInvoices';
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Debit', label: 'Debit' },
  { value: 'PayPal', label: 'PayPal' },
  { value: 'Other', label: 'Other' },
];
