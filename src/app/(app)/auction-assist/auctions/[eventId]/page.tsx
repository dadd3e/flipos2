
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit3, Trash2, ArrowLeft, Landmark, CalendarDays, Link as LinkIconComp, DollarSign, PlusCircle, ShoppingCart, Eye, Percent } from "lucide-react";
import type { AuctionEvent, AuctionItem, Supplier } from "@/lib/types";
import { RESELLER_AUCTION_EVENTS_KEY, RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuctionItemForm } from '@/components/auction-assist/AuctionItemForm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


function AuctionEventDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string | undefined;

  const [auctionEvent, setAuctionEvent] = useState<AuctionEvent | null | undefined>(undefined);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editingAuctionItem, setEditingAuctionItem] = useState<AuctionItem | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null); // For AuctionItem deletion
  
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      const storedEventsRaw = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
      if (storedEventsRaw) {
        try {
          const eventsArray: AuctionEvent[] = JSON.parse(storedEventsRaw);
          const foundEvent = eventsArray.find(event => event.id === eventId);
          setAuctionEvent(foundEvent || null);
        } catch (e) {
          console.error("Failed to parse auction events from localStorage", e);
          setAuctionEvent(null);
        }
      } else {
        setAuctionEvent(null);
      }

      const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      if (storedSuppliersRaw) {
        try {
          const parsedSuppliers = JSON.parse(storedSuppliersRaw);
          if (Array.isArray(parsedSuppliers)) setAllSuppliers(parsedSuppliers);
        } catch (e) { console.error("Failed to parse suppliers", e); setAllSuppliers(DEFAULT_SUPPLIERS); }
      }
    } else {
      setAuctionEvent(null);
    }
  }, [eventId]);

  const persistAuctionEvents = (updatedEvents: AuctionEvent[]) => {
    const sortedEvents = updatedEvents.sort((a, b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime());
    localStorage.setItem(RESELLER_AUCTION_EVENTS_KEY, JSON.stringify(sortedEvents));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_AUCTION_EVENTS_KEY, newValue: JSON.stringify(sortedEvents), storageArea: localStorage }));
  };

  const handleAuctionItemSubmit = (itemData: AuctionItem) => {
    if (!auctionEvent) return;

    const isEditing = auctionEvent.items?.some(item => item.id === itemData.id);
    let updatedItems: AuctionItem[];

    if (isEditing) {
      updatedItems = (auctionEvent.items || []).map(item => item.id === itemData.id ? itemData : item);
      toast({ title: "Auction Item Updated", description: `"${itemData.itemName}" details saved.` });
    } else {
      updatedItems = [...(auctionEvent.items || []), itemData];
      toast({ title: "Auction Item Added", description: `"${itemData.itemName}" added to this auction.` });
    }
    
    const updatedEvent: AuctionEvent = { ...auctionEvent, items: updatedItems, lastUpdated: new Date().toISOString() };
    setAuctionEvent(updatedEvent);

    const allEventsRaw = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
    const allEvents: AuctionEvent[] = allEventsRaw ? JSON.parse(allEventsRaw) : [];
    const updatedAllEvents = allEvents.map(event => event.id === auctionEvent.id ? updatedEvent : event);
    persistAuctionEvents(updatedAllEvents);
    
    setIsAddItemDialogOpen(false);
    setEditingAuctionItem(undefined);
  };
  
  const handleEditAuctionItem = (item: AuctionItem) => {
    setEditingAuctionItem(item);
    setIsAddItemDialogOpen(true);
  };

  const handleDeleteAuctionItem = (itemId: string) => {
    setItemToDelete(itemId);
  };
  
  const confirmDeleteAuctionItem = () => {
    if (!auctionEvent || !itemToDelete) return;
    const item = auctionEvent.items?.find(i => i.id === itemToDelete);
    if (!item) return;

    const updatedItems = (auctionEvent.items || []).filter(i => i.id !== itemToDelete);
    const updatedEvent: AuctionEvent = { ...auctionEvent, items: updatedItems, lastUpdated: new Date().toISOString() };
    setAuctionEvent(updatedEvent);

    const allEventsRaw = localStorage.getItem(RESELLER_AUCTION_EVENTS_KEY);
    const allEvents: AuctionEvent[] = allEventsRaw ? JSON.parse(allEventsRaw) : [];
    const updatedAllEvents = allEvents.map(event => event.id === auctionEvent.id ? updatedEvent : event);
    persistAuctionEvents(updatedAllEvents);

    toast({ title: "Auction Item Deleted", description: `"${item.itemName}" removed from this auction.`, variant: "destructive" });
    setItemToDelete(null);
  };


  const getAuctionHouseName = (supplierId?: string) => {
    if (!supplierId) return "N/A";
    const supplier = allSuppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : "Unknown Auction House";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMMM d, yyyy") : "Invalid Date";
    } catch { return "Invalid Date"; }
  };

  if (auctionEvent === undefined) return <p className="text-center py-10">Loading auction event details...</p>;
  if (auctionEvent === null) return (
    <div className="text-center py-10">
      <p className="text-xl text-muted-foreground">Auction event not found.</p>
      <Button asChild variant="link" className="mt-4"><Link href="/auction-assist/auctions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Auctions</Link></Button>
    </div>
  );

  return (
    <>
      <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-2rem)]">
        <div className="space-y-6 p-1 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline truncate" title={auctionEvent.title}>{auctionEvent.title}</h1>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/auction-assist/auctions"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link></Button>
              <Button asChild className="w-full sm:w-auto"><Link href={`/auction-assist/auctions/add?editId=${auctionEvent.id}`}><Edit3 className="mr-2 h-4 w-4" /> Edit Event</Link></Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Auction Event Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><strong>Date:</strong> {formatDate(auctionEvent.auctionDate)}</div>
              <div><strong>Auction House:</strong> <Badge variant="secondary">{getAuctionHouseName(auctionEvent.auctionHouseSupplierId)}</Badge></div>
              {auctionEvent.auctionUrl && <div><strong>URL:</strong> <a href={auctionEvent.auctionUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{auctionEvent.auctionUrl} <LinkIconComp className="h-4 w-4 opacity-70"/></a></div>}
              {auctionEvent.buyersPremiumPercent !== undefined && <div><strong>Buyer's Premium:</strong> {auctionEvent.buyersPremiumPercent}%</div>}
              {auctionEvent.taxRatePercent !== undefined && <div><strong>Tax Rate:</strong> {auctionEvent.taxRatePercent}%</div>}
            </CardContent>
            {auctionEvent.notes && <CardFooter><p className="text-sm text-muted-foreground whitespace-pre-wrap"><strong>Notes:</strong> {auctionEvent.notes}</p></CardFooter>}
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="font-headline flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Tracked Items</CardTitle>
                <CardDescription>Items you are planning to bid on in this auction.</CardDescription>
              </div>
              <Button onClick={() => { setEditingAuctionItem(undefined); setIsAddItemDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {!auctionEvent.items || auctionEvent.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No items added to this auction event yet.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead className="text-right">Est. Sale Price</TableHead>
                        <TableHead className="text-right">Max Bid</TableHead>
                        <TableHead className="text-right">Potential Profit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auctionEvent.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>
                            {item.itemUrl ? <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">View <Eye className="h-3.5 w-3.5"/></a> : "-"}
                          </TableCell>
                          <TableCell className="text-right">${item.estimatedSalePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.maxBid.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-semibold ${item.potentialProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            ${item.potentialProfit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAuctionItem(item)}><Edit3 className="mr-2 h-4 w-4" /> Edit Item</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteAuctionItem(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete Item</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <Dialog open={isAddItemDialogOpen} onOpenChange={(isOpen) => { setIsAddItemDialogOpen(isOpen); if (!isOpen) setEditingAuctionItem(undefined); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAuctionItem ? "Edit" : "Add"} Item for Auction: {auctionEvent.title}</DialogTitle>
            <DialogDesc>Enter details for the item you're tracking for this auction.</DialogDesc>
          </DialogHeader>
          <AuctionItemForm
            auctionEventId={auctionEvent.id}
            onSubmit={handleAuctionItemSubmit}
            initialData={editingAuctionItem}
            onCancel={() => { setIsAddItemDialogOpen(false); setEditingAuctionItem(undefined); }}
            auctionBuyersPremiumPercent={auctionEvent.buyersPremiumPercent}
            auctionTaxRatePercent={auctionEvent.taxRatePercent}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Auction Item?</AlertDialogTitle><AlertDialogDescription>This will remove "{auctionEvent.items?.find(i=>i.id === itemToDelete)?.itemName}" from this auction. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteAuctionItem} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Item</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ViewAuctionEventPage() {
  return (
    <Suspense fallback={<div>Loading auction event...</div>}>
      <AuctionEventDetailsContent />
    </Suspense>
  );
}
