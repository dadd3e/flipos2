
"use client";

import Link from 'next/link';
import type { AuctionEvent, Supplier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark, ExternalLink, CalendarDays, ShoppingCart, ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SUPPLIER_TYPES } from '@/lib/constants';

interface CondensedAuctionEventsListProps {
  events: AuctionEvent[];
  allSuppliers: Supplier[];
  maxEventsToShow?: number;
}

export function CondensedAuctionEventsList({ events, allSuppliers, maxEventsToShow = 3 }: CondensedAuctionEventsListProps) {
  
  const getAuctionHouseName = (supplierId?: string) => {
    if (!supplierId) return "N/A";
    const supplier = allSuppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : "Unknown Auction House";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const eventsToShow = events.slice(0, maxEventsToShow);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="flex-grow">
            <CardTitle className="font-headline flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Upcoming Auctions
            </CardTitle>
            <CardDescription>
            Key details for your next few auction events.
            </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
          <Link href="/auction-assist/auctions">
            View All Auctions <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {eventsToShow.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No upcoming auctions scheduled.
          </p>
        ) : (
          <ScrollArea className="max-h-[300px] pr-3">
            <div className="space-y-3">
              {eventsToShow.map(event => (
                <div key={event.id} className="p-3 border rounded-md bg-background/70 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <Landmark className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-grow">
                      <Link href={`/auction-assist/auctions/${event.id}`} className="font-medium text-sm hover:underline">
                        {event.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center">
                          <CalendarDays className="mr-1 h-3.5 w-3.5" />
                          {formatDate(event.auctionDate)}
                        </div>
                        <div className="flex items-center truncate max-w-[150px] sm:max-w-none" title={getAuctionHouseName(event.auctionHouseSupplierId)}>
                          <ListChecks className="mr-1 h-3.5 w-3.5" />
                          {getAuctionHouseName(event.auctionHouseSupplierId)}
                        </div>
                        <div className="flex items-center">
                          <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                          {event.items?.length || 0} items tracked
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {events.length > maxEventsToShow && (
        <CardFooter className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
                Showing {maxEventsToShow} of {events.length} upcoming auctions.
            </p>
        </CardFooter>
      )}
    </Card>
  );
}
