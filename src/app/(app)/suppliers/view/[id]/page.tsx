
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Building, Store as StoreIcon, User as UserIconG, Gavel, Mail, Phone, Globe, Edit3, ArrowLeft, Users, 
    MessageSquareIcon, Milestone, Briefcase, LayoutGrid, List, ShoppingBag, DollarSign, PlusCircle, StickyNote, UserCircle
} from "lucide-react"; // Changed UserIcon to UserIconG to avoid conflict
import type { Supplier, Contact, SupplierType, Note, InventoryItem } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, RESELLER_INVENTORY_KEY } from "@/lib/constants";
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

function ViewSupplierContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined; // Safely access id

  const [supplier, setSupplier] = useState<Supplier | null | undefined>(undefined); // undefined: loading, null: not found
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [contactViewMode, setContactViewMode] = useState<'grid' | 'card'>('grid');
  
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteLinkedTo, setNewNoteLinkedTo] = useState<'supplier' | string>('supplier');
  const { toast } = useToast();


  useEffect(() => {
    if (id) {
      const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      if (storedSuppliersRaw) {
        try {
          const suppliersArray: Supplier[] = JSON.parse(storedSuppliersRaw);
          const foundSupplier = suppliersArray.find(s => s.id === id);
          setSupplier(foundSupplier || null);
        } catch (e) {
          console.error("Failed to parse suppliers from localStorage", e);
          setSupplier(null);
        }
      } else {
        setSupplier(null); // No suppliers stored
      }

      const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
      if (storedInventory) {
        try {
          const parsedInventory: InventoryItem[] = JSON.parse(storedInventory);
          setInventoryItems(parsedInventory);
        } catch (e) {
          console.error("Failed to parse inventory from localStorage", e);
          setInventoryItems([]);
        }
      } else {
        setInventoryItems([]);
      }
    } else if (params && !id) { 
      // params object exists but no id on it (e.g. route like /suppliers/view/ but no [id] segment matched)
      // or params itself was null and id became undefined
      setSupplier(null); // Treat as not found
    }
  }, [id, params]);

  const totalSpendingWithSupplier = useMemo(() => {
    if (!supplier || inventoryItems.length === 0) {
      return 0;
    }
    return inventoryItems
      .filter(item => item.supplierId === supplier.id)
      .reduce((sum, item) => sum + item.totalPurchaseCost, 0);
  }, [supplier, inventoryItems]);

  const getSupplierTypeIcon = (type?: SupplierType): React.ElementType => {
    if (!type) return Building;
    return SUPPLIER_TYPES.find(st => st.value === type)?.icon || Building;
  };

  const handleAddNote = () => {
    if (!supplier || !newNoteContent.trim()) {
      toast({ title: "Error", description: "Note content cannot be empty.", variant: "destructive" });
      return;
    }

    let linkedToName = `Supplier: ${supplier.name}`;
    if (newNoteLinkedTo !== 'supplier') {
        const contact = supplier.contacts.find(c => c.id === newNoteLinkedTo);
        if (contact) {
            linkedToName = `Contact: ${contact.name}`;
        } else {
            // Fallback if contact ID is somehow invalid, should not happen with current UI
            linkedToName = "Unknown Contact";
        }
    }

    const newNote: Note = {
      id: crypto.randomUUID(),
      content: newNoteContent.trim(),
      timestamp: new Date().toISOString(),
      linkedTo: newNoteLinkedTo,
      linkedToName: linkedToName,
    };

    const updatedSupplier: Supplier = {
      ...supplier,
      notes: [...(supplier.notes || []), newNote],
      lastUpdated: new Date().toISOString(),
    };

    setSupplier(updatedSupplier); // Update local state for immediate UI refresh

    // Update localStorage
    const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    const allSuppliers: Supplier[] = storedSuppliersRaw ? JSON.parse(storedSuppliersRaw) : [];
    const updatedAllSuppliers = allSuppliers.map(s => s.id === supplier.id ? updatedSupplier : s);
    localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedAllSuppliers));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedAllSuppliers), storageArea: localStorage }));


    toast({ title: "Note Added", description: "The new note has been saved." });
    setIsAddNoteDialogOpen(false);
    setNewNoteContent("");
    setNewNoteLinkedTo('supplier');
  };
  
  const sortedNotes = useMemo(() => {
    if (!supplier || !supplier.notes) return [];
    return [...supplier.notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [supplier]);


  const SupplierTypeIcon = supplier ? getSupplierTypeIcon(supplier.type) : Building;

  if (supplier === undefined) {
    return <div className="text-center py-10">Loading supplier details...</div>;
  }

  if (supplier === null) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Supplier not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <SupplierTypeIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">{supplier.name}</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/suppliers">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/suppliers/form?editId=${supplier.id}`}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Supplier
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            Supplier Information
          </CardTitle>
          <CardDescription>
            Details for <span className="font-semibold">{supplier.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div><strong>Type:</strong> <Badge variant="secondary">{SUPPLIER_TYPES.find(st => st.value === supplier.type)?.label || supplier.type}</Badge></div>
            <div><strong>Date Added:</strong> {format(parseISO(supplier.dateAdded), 'MMMM d, yyyy')}</div>
            {supplier.address && <div><strong>Address:</strong> {supplier.address}</div>}
            {supplier.website && (
              <div>
                <strong>Website:</strong>{" "}
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  {supplier.website} <Globe className="h-4 w-4 opacity-70" />
                </a>
              </div>
            )}
          </div>
          {supplier.generalNotes && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-1">General Notes:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.generalNotes}</p>
              </div>
            </>
          )}
        </CardContent>
         <CardFooter className="text-xs text-muted-foreground">
            Last Updated: {format(parseISO(supplier.lastUpdated), 'MMMM d, yyyy p')}
          </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Spending Summary
            </CardTitle>
            <CardDescription>Total amount spent on inventory sourced from this supplier.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold flex items-center">
                <DollarSign className="mr-2 h-7 w-7 text-muted-foreground" />
                {totalSpendingWithSupplier.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
                Based on the 'Total Purchase Cost' of linked inventory items.
            </p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-grow">
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contacts ({supplier.contacts.length})
                </CardTitle>
                <CardDescription>
                    Key personnel associated with {supplier.name}.
                </CardDescription>
            </div>
            <Tabs value={contactViewMode} onValueChange={(value) => setContactViewMode(value as 'grid' | 'card')} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="grid"><LayoutGrid className="mr-2 h-4 w-4"/>Grid</TabsTrigger>
                <TabsTrigger value="card"><List className="mr-2 h-4 w-4"/>Card</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplier.contacts.length === 0 ? (
            <p className="text-muted-foreground">No contacts have been added for this supplier yet.</p>
          ) : (
            <>
              {contactViewMode === 'grid' && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.contacts.map((contact: Contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.role || '-'}</TableCell>
                          <TableCell>
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1">
                                <Mail className="h-4 w-4 opacity-70 shrink-0" /> {contact.email}
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {contact.phone ? (
                              <a href={`tel:${contact.phone}`} className="text-primary hover:underline flex items-center gap-1">
                                <Phone className="h-4 w-4 opacity-70 shrink-0" /> {contact.phone}
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={contact.contactNotes || undefined}>
                            {contact.contactNotes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {contactViewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplier.contacts.map((contact: Contact) => (
                    <Card key={contact.id} className="bg-muted/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserIconG className="h-5 w-5"/> {contact.name}
                        </CardTitle>
                        {contact.role && <CardDescription><Briefcase className="inline-block mr-1.5 h-3.5 w-3.5" />{contact.role}</CardDescription>}
                      </CardHeader>
                      <CardContent className="text-sm space-y-1.5">
                        {contact.email && (
                          <p className="flex items-center">
                            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                          </p>
                        )}
                        {contact.phone && (
                          <p className="flex items-center">
                            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a>
                          </p>
                        )}
                        {contact.contactNotes && (
                          <div className="pt-1">
                            <p className="flex items-start">
                                <MessageSquareIcon className="mr-2 h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <span className="whitespace-pre-wrap">{contact.contactNotes}</span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" /> Notes
            </CardTitle>
            <CardDescription>
              Date-stamped notes related to {supplier.name} or its contacts.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddNoteDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Note
          </Button>
        </CardHeader>
        <CardContent>
          {sortedNotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notes added yet for this supplier or its contacts.</p>
          ) : (
            <ScrollArea className="max-h-[400px] pr-3">
              <div className="space-y-4">
                {sortedNotes.map(note => (
                  <div key={note.id} className="p-3 border rounded-md bg-muted/30 relative">
                    <p className="text-sm whitespace-pre-wrap mb-2">{note.content}</p>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 items-center">
                        <div className="flex items-center">
                            {note.linkedTo === 'supplier' ? <Building className="mr-1.5 h-3.5 w-3.5"/> : <UserCircle className="mr-1.5 h-3.5 w-3.5"/>}
                            {note.linkedToName || (note.linkedTo === 'supplier' ? `Supplier: ${supplier.name}` : 'Linked Entity')}
                        </div>
                        <span>{format(parseISO(note.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

    </div>

    <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
            <DialogDescription>
              Enter the details for your new note. It will be automatically timestamped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label htmlFor="note-content" className="mb-1 block">Note Content</Label>
              <Textarea
                id="note-content"
                placeholder="Type your note here..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="note-linkedTo" className="mb-1 block">Link Note To</Label>
              <Select value={newNoteLinkedTo} onValueChange={(value) => setNewNoteLinkedTo(value as 'supplier' | string)}>
                <SelectTrigger id="note-linkedTo">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">This Supplier ({supplier.name})</SelectItem>
                  {supplier.contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      Contact: {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setNewNoteContent(""); setNewNoteLinkedTo('supplier'); }}>Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleAddNote} disabled={!newNoteContent.trim()}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function ViewSupplierPage() {
    return (
        <Suspense fallback={<div>Loading supplier...</div>}>
            <ViewSupplierContent />
        </Suspense>
    )
}
