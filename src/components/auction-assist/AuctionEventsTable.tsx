
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AuctionEvent, Supplier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, Eye, ExternalLink, Landmark, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns';
import { useState, useEffect, useMemo } from "react";
import { RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS } from "@/lib/constants";
import Link from 'next/link';
import { cn } from "@/lib/utils";

interface AuctionEventsTableProps {
  events: AuctionEvent[];
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

export function AuctionEventsTable({ events, onEdit, onDelete }: AuctionEventsTableProps) {
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsedSuppliers: Supplier[] = JSON.parse(storedSuppliers);
        setAllSuppliers(parsedSuppliers);
      } catch (e) {
        console.error("Failed to parse suppliers for auction events table", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
      }
    } else {
      setAllSuppliers(DEFAULT_SUPPLIERS);
    }
  }, []);

  const getAuctionHouseName = (supplierId: string): string => {
    const supplier = allSuppliers.find(s => s.id === supplierId && s.type === 'AuctionHouse');
    return supplier ? supplier.name : "Unknown Auction House";
  };

  const formatDateString = (dateString?: string): string => {
    if (!dateString) return "-";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMMM d, yyyy") : "Invalid Date";
    } catch {
      return "Invalid Date";
    }
  };

  const calculateEventMetrics = (event: AuctionEvent) => {
    let totalEstimatedCost = 0;
    let totalEstimatedProfit = 0;

    if (event.items && event.items.length > 0) {
      const bpDecimal = (event.buyersPremiumPercent ?? 0) / 100;
      const taxDecimal = (event.taxRatePercent ?? 0) / 100;

      event.items.forEach(item => {
        const itemCost = item.maxBid * (1 + bpDecimal) * (1 + taxDecimal);
        totalEstimatedCost += itemCost;
        totalEstimatedProfit += item.potentialProfit; // potentialProfit is already calculated
      });
    }
    return { totalEstimatedCost, totalEstimatedProfit };
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
           <Landmark className="h-6 w-6" /> Auction Events
        </CardTitle>
        <CardDescription>
          Manage your upcoming auction events. Add items to track under each event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No auction events scheduled yet. Add one to get started!</p>
        ) : (
          <div className="rounded-md border">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Title</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap max-w-[200px]">Auction House</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Est. Cost</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Est. Profit</TableHead>
                  <TableHead className="whitespace-nowrap text-center">URL</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const { totalEstimatedCost, totalEstimatedProfit } = calculateEventMetrics(event);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/auction-assist/auctions/${event.id}`} className="hover:underline">
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateString(event.auctionDate)}</TableCell>
                      <TableCell className="whitespace-nowrap truncate max-w-[200px]" title={getAuctionHouseName(event.auctionHouseSupplierId)}>
                        <Badge variant="outline">{getAuctionHouseName(event.auctionHouseSupplierId)}</Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground"/>
                            {totalEstimatedCost.toFixed(2)}
                        </div>
                      </TableCell>
                       <TableCell className={cn("text-right font-semibold whitespace-nowrap", totalEstimatedProfit >= 0 ? "text-green-600" : "text-destructive")}>
                         <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-3.5 w-3.5"/>
                            {totalEstimatedProfit.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-center">
                        {event.auctionUrl ? (
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 p-0">
                            <a href={event.auctionUrl} target="_blank" rel="noopener noreferrer" title="Open auction link">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/auction-assist/auctions/${event.id}`} className="flex items-center">
                                <ShoppingCart className="mr-2 h-4 w-4" /> Manage Items
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(event.id)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(event.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
