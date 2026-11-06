
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuctionEventForm } from "@/components/auction-assist/AuctionEventForm";
import type { AuctionEvent } from "@/lib/types";
import { RESELLER_AUCTION_EVENTS_KEY } from "@/lib/constants"; 
import { useToast } from "@/hooks/use-toast";

function AddAuctionEventContent() {
  const [auctionEvents, setAuctionEvents] = useState<AuctionEvent[]>([]); 
  const [editingEvent, setEditingEvent] = useState<AuctionEvent | undefined>(undefined);
  const [isLoadingEditEvent, setIsLoadingEditEvent] = useState<boolean>(false); // Keep this for UI feedback
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Effect to load the main list of auction events from localStorage
  // This list is used for adding new events or updating the list after an edit.
  useEffect(() => {
    const storedEvents = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY); 
    if (storedEvents) {
      try {
        const parsedItems = JSON.parse(storedEvents);
        setAuctionEvents(Array.isArray(parsedItems) ? parsedItems : []);
      } catch (e) {
        console.error("Error parsing auction events for add/edit page:", e);
        setAuctionEvents([]);
      }
    } else {
      try {
        localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify([])); 
      } catch (e: any) { /* Handle potential error during initial setItem */ }
      setAuctionEvents([]);
    }

    // Listen for storage changes to keep 'auctionEvents' state in sync
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === RESELLER_AUCTION_EVENTS_KEY) { 
            const newStoredEvents = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY); 
            if (newStoredEvents) {
                try {
                    setAuctionEvents(JSON.parse(newStoredEvents));
                } catch (e) {
                    console.error("Error parsing updated auction events:", e);
                    setAuctionEvents([]);
                }
            } else {
                setAuctionEvents([]);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Effect to handle setting the editingEvent based on URL search parameter (editId)
  // This effect reads directly from localStorage to find the event for editing.
  useEffect(() => {
    if (!searchParams) {
      setIsLoadingEditEvent(false);
      setEditingEvent(undefined);
      return;
    }

    const rawEditId = searchParams.get('editId');
    const editId = rawEditId ? rawEditId.trim() : null;

    if (editId) {
      setIsLoadingEditEvent(true);
      let eventToEdit: AuctionEvent | undefined = undefined;
      try {
        const storedEventsRaw = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
        if (storedEventsRaw) {
          const parsedLocalStorageEvents: AuctionEvent[] = JSON.parse(storedEventsRaw);
          if (Array.isArray(parsedLocalStorageEvents)) {
            eventToEdit = parsedLocalStorageEvents.find(event => event.id === editId);
          } else {
            console.error("[EditMode AuctionEvent] Data in localStorage is not an array. Data:", parsedLocalStorageEvents);
            // Potentially set localStorage to empty array if data is corrupted
            // localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify([]));
          }
        }
        // If storedEventsRaw is null, eventToEdit remains undefined.
      } catch (e) {
        console.error("[EditMode AuctionEvent] Error parsing localStorage for edit event:", e);
        // Handle error appropriately, e.g., toast, eventToEdit remains undefined.
      }

      if (eventToEdit) {
        setEditingEvent(eventToEdit);
      } else {
        // Event not found in localStorage or localStorage was empty/corrupted.
        console.warn(`[EditMode AuctionEvent] Event with ID "${editId}" not found in localStorage. Opening a new event form.`);
        toast({ title: "Not Found", description: `Auction Event with ID "${editId}" not found. Opening a new form.`, variant: "destructive" });
        router.replace('/auction-assist/auctions/add'); // Clear invalid editId from URL
        setEditingEvent(undefined); // Ensure form is for 'new' if redirected
      }
      setIsLoadingEditEvent(false);
    } else {
      // No editId in URL params, so it's a new event.
      setEditingEvent(undefined);
      setIsLoadingEditEvent(false);
    }
  }, [searchParams, router, toast]); // Removed auctionEvents from dependencies here

  const persistAuctionEvents = (updatedEvents: AuctionEvent[]): boolean => { 
    const sortedEvents = updatedEvents.sort((a, b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime());
    try {
      localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify(sortedEvents)); 
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_AUCTION_EVENTS_KEY, newValue: JSON.stringify(sortedEvents), storageArea: localStorage })); 
      setAuctionEvents(sortedEvents); // Update the main list state
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not save auction event. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Auction Event",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleAddEvent = (eventData: AuctionEvent) => {
    const newEventWithId = { ...eventData, id: crypto.randomUUID(), dateAdded: new Date().toISOString(), lastUpdated: new Date().toISOString() };
    const newEvents = [...auctionEvents, newEventWithId]; 
    if (persistAuctionEvents(newEvents)) { 
      toast({ title: "Auction Event Added", description: `"${eventData.title}" added to upcoming auctions.` });
      router.push('/auction-assist/auctions');
    }
  };

  const handleUpdateEvent = (updatedEventData: AuctionEvent) => {
    // Ensure the items array from the editingEvent is preserved if not modified by the form
    // The AuctionEventForm itself doesn't manage 'items', so if editingEvent had items,
    // they should be carried over.
    const originalEvent = auctionEvents.find(event => event.id === updatedEventData.id);
    const itemsToPreserve = originalEvent?.items;

    const newEvents = auctionEvents.map((event) => 
      event.id === updatedEventData.id 
        ? {...updatedEventData, items: itemsToPreserve, lastUpdated: new Date().toISOString()} 
        : event
    ); 
    if (persistAuctionEvents(newEvents)) { 
      setEditingEvent(undefined);
      toast({ title: "Auction Event Updated", description: `"${updatedEventData.title}" has been updated.` });
      router.push('/auction-assist/auctions');
    }
  };
  
  const handleSubmitForm = (data: AuctionEvent) => {
    if (editingEvent) {
      handleUpdateEvent(data); 
    } else {
      handleAddEvent(data); 
    }
  };
  
  if (isLoadingEditEvent && searchParams && searchParams.get('editId')) {
    return <div className="text-center py-10">Loading auction event for editing...</div>;
  }

  return (
    <div className="space-y-8">
      <AuctionEventForm 
        onSubmit={handleSubmitForm} 
        initialData={editingEvent} 
        key={editingEvent?.id || 'new-auction-event-form'} 
      />
    </div>
  );
}

export default function AddAuctionEventPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <AddAuctionEventContent />
    </Suspense>
  )
}
