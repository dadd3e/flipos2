
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuctionEventsTable } from "@/components/auction-assist/AuctionEventsTable";
import type { AuctionEvent } from "@/lib/types";
import { RESELLER_AUCTION_EVENTS_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { PlusCircle, Landmark } from 'lucide-react';

export default function AuctionEventsPage() {
  const [auctionEvents, setAuctionEvents] = useState<AuctionEvent[]>([]);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const loadAuctionEvents = useCallback(() => {
    const storedEvents = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
    if (storedEvents) {
      try {
        const parsedEvents = JSON.parse(storedEvents);
        setAuctionEvents(Array.isArray(parsedEvents) ? parsedEvents.sort((a,b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime()) : []);
      } catch (e) {
        console.error("Error parsing auction events from localStorage:", e);
        setAuctionEvents([]);
      }
    } else {
      localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify([]));
      setAuctionEvents([]);
    }
  }, []);

  useEffect(() => {
    loadAuctionEvents();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_AUCTION_EVENTS_KEY) {
        loadAuctionEvents();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAuctionEvents]);

  const persistAuctionEvents = useCallback((updatedEvents: AuctionEvent[]) => {
    try {
      const sortedEvents = updatedEvents.sort((a, b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime());
      localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify(sortedEvents));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_AUCTION_EVENTS_KEY, newValue: JSON.stringify(sortedEvents), storageArea: localStorage }));
      setAuctionEvents(sortedEvents); // Update state directly as it's the source of truth for this component
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not save auction event data. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Auction Events",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  }, [toast]);

  const handleEdit = useCallback((eventId: string) => {
    router.push(`/auction-assist/auctions/add?editId=${eventId}`);
  }, [router]);

  const handleDelete = useCallback((eventId: string) => {
    setEventToDelete(eventId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (eventToDelete) {
      const eventDetails = auctionEvents.find(event => event.id === eventToDelete)?.title || 'Auction Event';
      const updatedEvents = auctionEvents.filter((event) => event.id !== eventToDelete);
      if (persistAuctionEvents(updatedEvents)) {
        toast({ title: "Auction Event Deleted", description: `Event "${eventDetails}" has been removed.`, variant: "destructive" });
        setEventToDelete(null);
      }
    }
  }, [eventToDelete, auctionEvents, persistAuctionEvents, toast]);

  return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Landmark className="h-8 w-8" /> Auction Events
          </h1>
          <Button onClick={() => router.push('/auction-assist/auctions/add')} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Button>
        </div>
        
        <AuctionEventsTable events={auctionEvents} onEdit={handleEdit} onDelete={handleDelete} />

        <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this auction event.
                Any items linked to this auction event will need to be manually re-associated if this event is recreated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Event
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
