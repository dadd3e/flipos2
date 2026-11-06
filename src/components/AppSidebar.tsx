

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSkeleton,
  SidebarMenuFlyoutContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChartBig,
  Sparkles,
  Bell,
  Settings,
  PlusSquare,
  ListChecks,
  Clock3,
  ArchiveIcon,
  CalendarClock,
  CreditCard,
  ClipboardCheck,
  ChevronRight,
  Users,
  Search as SearchIcon,
  CalendarDays,
  Store,
  Zap,
  Heart,
  Receipt,
  Landmark as AuctionIcon, 
  AlertCircle, 
  HeartCrack,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { USER_APP_LOGO_KEY } from "@/lib/constants";


const baseNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Inventory",
    icon: Package,
    subItems: [
      { href: "/inventory/add", label: "Add New Item", icon: PlusSquare },
      { href: "/inventory", label: "Active", icon: ListChecks },
      { href: "/inventory/pending", label: "Pending", icon: Clock3 },
      { href: "/inventory/sold", label: "Sold", icon: ArchiveIcon },
      { href: "/inventory/written-off", label: "Written Off", icon: AlertCircle },
      { href: "/inventory/kept", label: "Kept", icon: HeartCrack },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    subItems: [
      { href: "/sales", label: "Log New Sale", icon: PlusSquare },
      { href: "/sales/recent", label: "Recent Sales", icon: CalendarClock },
      { href: "/sales/all", label: "All Sales", icon: ListChecks },
    ],
  },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  {
    label: "Expenses",
    icon: Receipt,
    subItems: [
      { href: "/expenses/invoices", label: "Manage Invoices", icon: FileText },
      { href: "/expenses/add", label: "Add New Expense", icon: PlusSquare },
      { href: "/expenses", label: "View Expenses", icon: ListChecks },
    ],
  },
  {
    label: "Sourcing",
    icon: Heart,
    subItems: [
      { href: "/sourcing/add", label: "Add Opportunity", icon: PlusSquare },
      { href: "/sourcing", label: "Opportunities", icon: ListChecks },
    ],
  },
  {
    label: "Auction Assist", 
    icon: AuctionIcon,
    subItems: [
      { href: "/auction-assist/auctions/add", label: "Add New Auction", icon: PlusSquare },
      { href: "/auction-assist/auctions", label: "View Auctions", icon: ListChecks },
    ],
  },
  {
    label: "Reports",
    icon: FileText,
    subItems: [
      { href: "/reports/profit-loss", label: "Profit & Loss", icon: BarChartBig },
      { href: "/reports/spending", label: "Spending", icon: CreditCard },
      { href: "/reports/inventory-aging", label: "Inventory Aging", icon: CalendarDays },
      { href: "/reports/sales-performance", label: "Sales Performance", icon: Store },
      { href: "/sample-graphs", label: "Sample Graphs", icon: Zap },
    ],
  },
  { href: "/tasks", label: "Task Manager", icon: ClipboardCheck },
];

const bottomContentNavItems = [
  { href: "/alerts", label: "Alerts", icon: Bell },
];

function SidebarSkeletonPlaceholder() {
  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-2 flex items-stretch justify-start group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:py-2 group-data-[collapsible=offcanvas]:hidden">
        <div
          className={cn(
            "flex items-center gap-2 font-semibold font-headline text-lg",
            "size-9 rounded-full p-0 flex items-center justify-center gap-0 bg-primary text-primary-foreground"
          )}
          title="FlipOS Dashboard"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden">FlipOS</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
        </SidebarMenu>
        <div className="mt-auto">
          <SidebarMenu>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    className={cn(
                      "justify-start w-full",
                      "!size-9 rounded-full !p-0 flex items-center justify-center"
                    )}
                    disabled
                    tooltip={{children: "Settings", side: "right", align: "center"}}
                >
                  <Settings className="h-5 w-5 mr-0" />
                  <span className="hidden">Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [hasMounted, setHasMounted] = React.useState(false);
  const [userAppLogo, setUserAppLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLogo = localStorage.getItem(USER_APP_LOGO_KEY);
      setUserAppLogo(storedLogo);
    }
    setHasMounted(true);
  }, []);

  const isSubItemGroupActive = React.useCallback((subItems: Array<{ href: string }>) => {
    if (!pathname) return false;
    return subItems.some(sub => pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href + "/")));
  }, [pathname]);

  React.useEffect(() => {
    if (!hasMounted || !pathname) return;
    let activeParentLabel: string | null = null;
    for (const item of baseNavItems) {
      if ('subItems' in item && item.subItems && isSubItemGroupActive(item.subItems)) {
        activeParentLabel = item.label;
        break;
      }
    }
    setExpandedSection(activeParentLabel);
  }, [pathname, hasMounted, isSubItemGroupActive]);

  const toggleSection = React.useCallback((label: string) => {
    setExpandedSection(prev => (prev === label ? null : label));
  }, []);

  const isParentButtonActive = React.useCallback((item: (typeof baseNavItems[number] | typeof bottomContentNavItems[number])) => {
    if (!pathname) return false;
    
    if ('subItems' in item && item.subItems && item.subItems.length > 0) {
      return item.subItems.some(sub =>
        pathname === sub.href || (sub.href !== "/" && pathname.startsWith(sub.href + "/"))
      );
    } else if ('href' in item && item.href) {
      if (item.href === "/") return pathname === "/";
      return pathname === item.href || pathname.startsWith(item.href + "/");
    }
    return false;
  }, [pathname]);

  const handleSearchSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      if (isMobile) setOpenMobile(false);
    }
  }, [searchTerm, router, isMobile, setOpenMobile]);

  const handleMobileLinkClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const renderMenuItems = React.useCallback((items: typeof baseNavItems | typeof bottomContentNavItems) => {
    return items.map((item) =>
      ('subItems' in item && item.subItems) ? (
        <SidebarMenuItem key={item.label} className="relative">
          <SidebarMenuButton
            className="justify-start w-full"
            isActive={isParentButtonActive(item)}
            onClick={() => toggleSection(item.label)}
            aria-expanded={expandedSection === item.label}
            tooltip={{ children: item.label, side: "right", align:"center" }}
          >
            <item.icon className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden flex-1">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden",
                expandedSection === item.label ? "rotate-90" : ""
              )}
            />
          </SidebarMenuButton>

          {expandedSection === item.label && item.subItems && (
            <ul className="ml-7 mt-1 border-l border-sidebar-border pl-2 space-y-1 group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden">
              {item.subItems.map((subItem) => (
                <li key={subItem.href}>
                  <Link
                    href={subItem.href}
                    onClick={handleMobileLinkClick}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                       (pathname === subItem.href || (pathname && subItem.href !== "/" && pathname.startsWith(subItem.href + "/"))) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )}
                  >
                    <subItem.icon className="mr-2 h-4 w-4" />
                    {subItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {item.subItems && ( 
            <SidebarMenuFlyoutContent>
              {item.subItems.map((subItem) => (
                <li key={`${subItem.href}-flyout`}>
                  <Link
                    href={subItem.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                      (pathname === subItem.href || (pathname && subItem.href !== "/" && pathname.startsWith(subItem.href + "/"))) && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <subItem.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{subItem.label}</span>
                  </Link>
                </li>
              ))}
            </SidebarMenuFlyoutContent>
          )}
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem key={item.href || item.label}>
          <SidebarMenuButton
            asChild
            className="justify-start w-full"
            isActive={isParentButtonActive(item)}
            tooltip={{ children: item.label, side: "right", align:"center" }}
          >
            <Link href={item.href!} onClick={handleMobileLinkClick}>
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    );
  }, [pathname, expandedSection, isParentButtonActive, toggleSection, handleMobileLinkClick]);

  if (!hasMounted) {
    return <SidebarSkeletonPlaceholder />;
  }

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
        <SidebarHeader className="p-2 flex items-stretch justify-start group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:py-2 group-data-[collapsible=offcanvas]:hidden">
            <div className={cn("group/logo-container relative w-full flex items-center justify-start gap-2")}>
                 <div className="flex items-center gap-2">
                    <Link
                        href="/"
                        onClick={handleMobileLinkClick}
                        className={cn(
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md flex items-center",
                            "group-data-[state=expanded]:justify-start group-data-[state=expanded]:gap-2 group-data-[state=expanded]:font-semibold group-data-[state=expanded]:font-headline group-data-[state=expanded]:text-lg group-data-[state=expanded]:text-sidebar-foreground group-data-[state=expanded]:p-2",
                            "group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-primary group-data-[collapsible=icon]:text-primary-foreground group-data-[collapsible=icon]:hover:bg-primary/90 group-data-[collapsible=icon]:justify-center",
                            "group-data-[collapsible=offcanvas]:hidden"
                        )}
                        title="FlipOS Dashboard"
                    >
                    {hasMounted && userAppLogo ? (
                        <Image
                        src={userAppLogo}
                        alt="User App Logo"
                        width={state === "collapsed" ? 28 : 32} 
                        height={state === "collapsed" ? 28 : 32}
                        className="rounded-sm object-contain"
                        />
                    ) : (
                        <Sparkles className="h-6 w-6 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                    )}
                    </Link>
                    <span className="font-semibold font-headline text-lg text-sidebar-foreground group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:inline">FlipOS</span>
                 </div>
            </div>
        </SidebarHeader>
        <SidebarContent 
          className={cn(
            "p-2 group-data-[collapsible=offcanvas]:p-2 group-data-[collapsible=icon]:overflow-visible", 
            "data-[state=expanded]:overflow-y-auto data-[state=expanded]:overflow-x-hidden" 
          )}
        >
          <SidebarMenu>
            {renderMenuItems(baseNavItems)}
          </SidebarMenu>
          <div className="mt-auto">
            <SidebarMenu>
              {renderMenuItems(bottomContentNavItems)}
            </SidebarMenu>
          </div>
        </SidebarContent>
         <form onSubmit={handleSearchSubmit} className="p-2 border-t group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:block">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 h-9 bg-sidebar-accent border-sidebar-border focus:bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        <SidebarFooter className="p-2 border-t group-data-[collapsible=offcanvas]:p-2">
           <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton
                      asChild
                      className="justify-start w-full"
                      isActive={isParentButtonActive({ href: "/settings", label: "Settings", icon: Settings })}
                      tooltip={{ children: "Settings", side: "right", align:"center" }}
                  >
                    <Link href="/settings" onClick={handleMobileLinkClick}>
                      <Settings className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden">Settings</span>
                    </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
