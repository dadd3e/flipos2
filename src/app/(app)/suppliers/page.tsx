
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetDescription as UiSheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, ListFilter, Edit3, Trash2, MoreHorizontal, Building, Store as StoreIcon, User as UserIcon, Gavel, Phone, Mail, Globe, Eye } from "lucide-react";
import type { Supplier, SupplierType, Contact as ContactType } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SupplierForm, type SupplierFormValues } from '@/components/suppliers/SupplierForm';
import { ScrollArea } from '@/components/ui/scroll-area';

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<SupplierType, boolean>>({
    AuctionHouse: true, Store: true, PrivateSeller: true, OperatingExpenses: true,
  });

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers) as Supplier[];
        setSuppliers(parsed.sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
      } catch (e) {
        setSuppliers(DEFAULT_SUPPLIERS);
      }
    } else {
        localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
        setSuppliers(DEFAULT_SUPPLIERS);
    }
    setIsLoading(false);

     const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SUPPLIERS_KEY) {
        const newStoredSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
        if (newStoredSuppliers) {
          try {
            const parsed = JSON.parse(newStoredSuppliers) as Supplier[];
            setSuppliers(parsed.sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
          } catch (e) { console.error("Error parsing updated suppliers:", e); }
        } else { setSuppliers(DEFAULT_SUPPLIERS); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFilterChange = (supplierType: SupplierType, checked: boolean) => {
    setActiveFilters(prev => ({ ...prev, [supplierType]: checked }));
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const typeMatch = activeFilters[supplier.type];
      if (!typeMatch) return false;
      if (!searchTerm.trim()) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return (
        supplier.name.toLowerCase().includes(lowerSearch) ||
        (supplier.address && supplier.address.toLowerCase().includes(lowerSearch)) ||
        supplier.contacts.some(contact => 
          contact.name.toLowerCase().includes(lowerSearch) ||
          (contact.email && contact.email.toLowerCase().includes(lowerSearch)) ||
          (contact.phone && contact.phone.toLowerCase().includes(lowerSearch))
        )
      );
    });
  }, [suppliers, searchTerm, activeFilters]);

  const handleDeleteSupplier = (id: string) => {
    setSupplierToDelete(id);
  };

  const confirmDeleteSupplier = () => {
    if (supplierToDelete) {
      const supplierName = suppliers.find(s => s.id === supplierToDelete)?.name || "Supplier";
      const updatedSuppliers = suppliers.filter(s => s.id !== supplierToDelete);
      setSuppliers(updatedSuppliers);
      localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
      toast({ title: "Supplier Deleted", description: `${supplierName} has been removed.`, variant: "destructive" });
      setSupplierToDelete(null);
    }
  };
  
  const getSupplierPhone = (supplier: Supplier): string | null => {
    if (supplier.contacts.length > 0 && supplier.contacts[0].phone) return supplier.contacts[0].phone;
    return null;
  };

  const getSupplierTypeIcon = (type: SupplierType) => {
    const typeConfig = SUPPLIER_TYPES.find(st => st.value === type);
    return typeConfig?.icon || Building;
  };

  const persistSuppliersAndUpdateState = (updatedList: Supplier[], successMessage: string, type: "Added" | "Updated") => {
    try {
        const sortedList = updatedList.sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(sortedList));
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(sortedList), storageArea: localStorage }));
        setSuppliers(sortedList);
        toast({ title: `Supplier ${type}`, description: successMessage });
        return true;
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          toast({ title: "Storage Full", description: "Could not save supplier. Browser local storage is full.", variant: "destructive", duration: 10000 });
        } else {
          toast({ title: `Error Saving Supplier`, description: `An unexpected error occurred: ${e.message}`, variant: "destructive" });
        }
        return false;
    }
  };

  const handleAddSupplierFromSheet = (data: SupplierFormValues) => {
    const now = new Date().toISOString();
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      ...data,
      contacts: (data.contacts || []).map(c => ({...c, id: c.id || crypto.randomUUID()})),
      dateAdded: now,
      lastUpdated: now,
    };
    const updatedSuppliersList = [...suppliers, newSupplier];
    if(persistSuppliersAndUpdateState(updatedSuppliersList, `${data.name} has been added.`, "Added")) {
        setIsAddSheetOpen(false);
    }
  };

  const handleUpdateSupplierFromSheet = (data: SupplierFormValues) => {
    if (!editingSupplier) return;
    const now = new Date().toISOString();
    const updatedSupplier: Supplier = {
      ...editingSupplier,
      ...data,
      contacts: (data.contacts || []).map(c => ({...c, id: c.id || crypto.randomUUID()})),
      lastUpdated: now,
    };
    const updatedSuppliersList = suppliers.map(s => s.id === editingSupplier.id ? updatedSupplier : s);
    if(persistSuppliersAndUpdateState(updatedSuppliersList, `${data.name} has been updated.`, "Updated")) {
        setIsEditSheetOpen(false);
        setEditingSupplier(undefined);
    }
  };

  const handleOpenEditSheet = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditSheetOpen(true);
  };


  if (isLoading) {
    return <p className="text-center py-10">Loading suppliers...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">Suppliers List</h1>
        <div className="flex gap-2 items-center w-full sm:w-auto">
            <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
                <SheetTrigger asChild>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl p-0">
                    <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
                        <SheetTitle>Add New Supplier</SheetTitle>
                        <UiSheetDescription>Enter details for the new supplier.</UiSheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
                        <div className="p-6">
                            <SupplierForm onSubmit={handleAddSupplierFromSheet} onCancel={() => setIsAddSheetOpen(false)} />
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle>Manage Suppliers</CardTitle>
                <CardDescription>View, search, filter, and manage your suppliers and their contacts.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <ListFilter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Suppliers</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <Label>Supplier Type</Label>
                  {SUPPLIER_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${type.value}`}
                        checked={activeFilters[type.value]}
                        onCheckedChange={(checked) => handleFilterChange(type.value, !!checked)}
                      />
                      <Label htmlFor={`filter-${type.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
                 <SheetClose asChild className="mt-4 w-full">
                    <Button type="button">Apply Filters</Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? `No suppliers match "${searchTerm}". Consider adjusting filters.` : "No suppliers yet. Add one to get started!"}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="font-medium hover:underline cursor-pointer" onClick={() => router.push(`/suppliers/view/${supplier.id}`)}>{supplier.name}</div>
                        {supplier.address && <div className="text-xs text-muted-foreground">{supplier.address}</div>}
                         {supplier.website && <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"><Globe className="h-3 w-3"/>Website</a>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {React.createElement(getSupplierTypeIcon(supplier.type), { className: "mr-1.5 h-3.5 w-3.5 opacity-70"})}
                          {SUPPLIER_TYPES.find(st => st.value === supplier.type)?.label || supplier.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {supplier.contacts.length > 0 ? (
                            <>
                                <div className="text-sm">{supplier.contacts[0].name}{supplier.contacts[0].role ? ` (${supplier.contacts[0].role})` : ''}</div>
                                {supplier.contacts[0].email && <a href={`mailto:${supplier.contacts[0].email}`} className="text-xs text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3"/> {supplier.contacts[0].email}</a>}
                                {supplier.contacts.length > 1 && <div className="text-xs text-muted-foreground mt-0.5"> + {supplier.contacts.length - 1} more</div>}
                            </>
                        ) : <span className="text-xs text-muted-foreground">No contacts</span>}
                      </TableCell>
                      <TableCell>
                        {getSupplierPhone(supplier) ? (
                            <a href={`tel:${getSupplierPhone(supplier)}`} className="text-primary hover:underline flex items-center text-xs">
                                <Phone className="mr-1 h-3 w-3"/> {getSupplierPhone(supplier)}
                            </a>
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{format(parseISO(supplier.dateAdded), 'MM/dd/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/suppliers/view/${supplier.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEditSheet(supplier)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteSupplier(supplier.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
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

    <Sheet open={isEditSheetOpen} onOpenChange={(isOpen) => { setIsEditSheetOpen(isOpen); if (!isOpen) setEditingSupplier(undefined); }}>
        <SheetContent className="w-full sm:max-w-2xl p-0">
            <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
                <SheetTitle>Edit Supplier</SheetTitle>
                <UiSheetDescription>Update details for {editingSupplier?.name || "this supplier"}.</UiSheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
                <div className="p-6">
                    {editingSupplier && (
                        <SupplierForm 
                            onSubmit={handleUpdateSupplierFromSheet} 
                            initialData={editingSupplier} 
                            onCancel={() => { setIsEditSheetOpen(false); setEditingSupplier(undefined); }}
                            key={editingSupplier.id} // Ensures form re-initializes
                        />
                    )}
                </div>
            </ScrollArea>
        </SheetContent>
    </Sheet>

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => {if(!open) setSupplierToDelete(null)}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this supplier and all associated contacts.
              Inventory items previously linked to this supplier will retain their supplier ID but will show as "Unknown Supplier".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSupplier} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SuppliersPage() {
    return (
        <Suspense fallback={<div>Loading suppliers...</div>}>
            <SuppliersPageContent />
        </Suspense>
    )
}

    