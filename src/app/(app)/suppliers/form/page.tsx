
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SupplierForm, type SupplierFormValues } from "@/components/suppliers/SupplierForm";
import type { Supplier } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Keep for page structure
import { Building, Edit, PlusCircle } from "lucide-react"; // Icons for page header


function AddEditSupplierPageContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Load all suppliers to find the one being edited, or to add to the list
  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    let loadedSuppliers = DEFAULT_SUPPLIERS;
    if (storedSuppliers) {
      try {
        const parsedSuppliers = JSON.parse(storedSuppliers) as Supplier[];
        loadedSuppliers = Array.isArray(parsedSuppliers) ? parsedSuppliers : DEFAULT_SUPPLIERS;
      } catch (e) {
        console.error("Failed to parse suppliers from localStorage for form page, using defaults.", e);
      }
    }
    setSuppliers(loadedSuppliers);
    if (!storedSuppliers && loadedSuppliers === DEFAULT_SUPPLIERS) {
      try { localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS)); } 
      catch (e: any) { /* Handle error */ }
    }
    setIsLoading(false); // Done loading initial suppliers list
  }, []);

  // Effect to set editingSupplier based on editId
  useEffect(() => {
    if (isLoading) return; // Wait for suppliers list to load

    const editId = searchParams ? searchParams.get('editId') : null;
    if (editId) {
      const supplierToEdit = suppliers.find(s => s.id === editId);
      if (supplierToEdit) {
        setEditingSupplier(supplierToEdit);
      } else {
        toast({ title: "Error", description: `Supplier not found for editing (ID: ${editId}). It may have been deleted.`, variant: "destructive" });
        router.push('/suppliers');
      }
    } else {
      setEditingSupplier(undefined); // Clear if no editId (new supplier mode)
    }
  }, [searchParams, suppliers, isLoading, router, toast]);

  const persistSuppliers = (updatedSuppliers: Supplier[]): boolean => {
    try {
      localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
      setSuppliers(updatedSuppliers);
      return true;
    } catch (e: any) {
      // Handle storage errors (e.g., quota exceeded)
      if (e.name === 'QuotaExceededError') {
        toast({ title: "Storage Full", description: "Could not save supplier. Browser local storage is full.", variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Error Saving Supplier", description: `An unexpected error occurred: ${e.message}`, variant: "destructive" });
      }
      return false;
    }
  };

  const handleSubmit = (data: SupplierFormValues) => {
    const now = new Date().toISOString();
    let updatedSuppliersList: Supplier[];
    let successMessage = "";

    if (editingSupplier) {
      const updatedSupplier: Supplier = {
        ...editingSupplier,
        ...data,
        contacts: (data.contacts || []).map(c => ({...c, id: c.id || crypto.randomUUID()})),
        lastUpdated: now,
      };
      updatedSuppliersList = suppliers.map(s => s.id === editingSupplier.id ? updatedSupplier : s);
      successMessage = `${data.name} has been updated.`;
    } else {
      const newSupplier: Supplier = {
        id: crypto.randomUUID(),
        ...data,
        contacts: (data.contacts || []).map(c => ({...c, id: c.id || crypto.randomUUID()})),
        dateAdded: now,
        lastUpdated: now,
      };
      updatedSuppliersList = [...suppliers, newSupplier];
      successMessage = `${data.name} has been added.`;
    }
    
    if (persistSuppliers(updatedSuppliersList)) {
      toast({ title: editingSupplier ? "Supplier Updated" : "Supplier Added", description: successMessage });
      router.push('/suppliers');
    }
  };
  
  const PageIcon = editingSupplier ? Edit : PlusCircle;

  if (isLoading && (!searchParams || !searchParams.get('editId'))) { 
    return <p className="text-center py-10">Loading supplier form...</p>;
  }
  if (isLoading && searchParams && searchParams.get('editId')) {
      return <p className="text-center py-10">Loading supplier details for editing...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <PageIcon className="h-6 w-6" />
            {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
          </CardTitle>
          <CardDescription>
            {editingSupplier ? `Update details for ${editingSupplier.name}.` : "Enter details for the new supplier."}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* Render SupplierForm only when not loading and either editingSupplier is defined (for edit) or it's undefined (for new) */}
            {(!isLoading && (editingSupplier || !searchParams?.get('editId'))) && (
                <SupplierForm onSubmit={handleSubmit} initialData={editingSupplier} onCancel={() => router.push('/suppliers')}/>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddEditSupplierFormPage() {
    return (
        <Suspense fallback={<div>Loading supplier form page...</div>}>
            <AddEditSupplierPageContent />
        </Suspense>
    )
}

    