
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Trash2, UserPlus, Users, Contact as ContactIcon, Building, Store as StoreIcon, User as UserIcon, Gavel } from "lucide-react";
import type { Supplier, Contact, SupplierType } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Contact name is required."),
  role: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  contactNotes: z.string().optional(),
});

const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters." }),
  type: z.enum(SUPPLIER_TYPES.map(st => st.value) as [SupplierType, ...SupplierType[]], {
    required_error: "Supplier type is required.",
  }),
  address: z.string().optional(),
  website: z.string().url("Invalid URL format.").optional().or(z.literal('')),
  generalNotes: z.string().optional(),
  contacts: z.array(contactSchema).optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  onSubmit: (data: SupplierFormValues) => void;
  initialData?: Supplier;
  onCancel?: () => void; // Optional: For closing sheet/dialog
}

export function SupplierForm({ onSubmit, initialData, onCancel }: SupplierFormProps) {
  const { toast } = useToast();
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || undefined,
      address: initialData?.address || "",
      website: initialData?.website || "",
      generalNotes: initialData?.generalNotes || "",
      contacts: initialData?.contacts?.map(c => ({
        id: c.id || crypto.randomUUID(),
        name: c.name || "",
        role: c.role || "",
        email: c.email || "",
        phone: c.phone || "",
        contactNotes: c.contactNotes || "",
      })) || [],
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "contacts",
  });
  
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        address: initialData.address || "",
        website: initialData.website || "",
        generalNotes: initialData.generalNotes || "",
        contacts: (initialData.contacts || []).map(c => ({
          id: c.id || crypto.randomUUID(),
          name: c.name || "",
          role: c.role || "",
          email: c.email || "",
          phone: c.phone || "",
          contactNotes: c.contactNotes || "",
        })),
      });
    } else {
      form.reset({ 
        name: "",
        type: undefined, 
        address: "",
        website: "",
        generalNotes: "",
        contacts: [],
      });
    }
  }, [initialData, form]);


  const handleFormSubmit = (data: SupplierFormValues) => {
    onSubmit(data);
    if (!initialData) { // Reset form if it was an "add new" operation
        form.reset({
            name: "", type: undefined, address: "", website: "", generalNotes: "", contacts: [],
        });
    }
  };

  const getSupplierTypeIcon = (type?: SupplierType) => {
    if (!type) return Building; 
    const typeConfig = SUPPLIER_TYPES.find(st => st.value === type);
    return typeConfig?.icon || Building; 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card className="p-4 sm:p-6 bg-muted/30">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Supplier Name*</FormLabel><FormControl><Input placeholder="e.g., Acme Auctions Ltd." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Type*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>{SUPPLIER_TYPES.map(st => (<SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem> )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="website" render={({ field }) => ( <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://www.example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="generalNotes" render={({ field }) => ( <FormItem><FormLabel>General Notes</FormLabel><FormControl><Textarea placeholder="Any general notes about this supplier..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6 bg-muted/30">
            <CardHeader className="p-0 pb-4 flex flex-row justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2"><ContactIcon className="h-5 w-5" />Contacts</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => appendContact({ id: crypto.randomUUID(), name: "", role: "", email: "", phone: "", contactNotes: "" })}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
            {contactFields.length === 0 && <p className="text-sm text-muted-foreground">No contacts added yet.</p>}
            {contactFields.map((field, index) => (
                <Card key={field.id} className="p-3 bg-background/70">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Contact {index + 1}</h4>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeContact(index)}>
                    <Trash2 className="h-4 w-4" /><span className="sr-only">Remove Contact</span>
                    </Button>
                </div>
                <div className="space-y-3">
                    <FormField control={form.control} name={`contacts.${index}.name`} render={({ field: f }) => ( <FormItem><FormLabel>Contact Name*</FormLabel><FormControl><Input placeholder="Jane Doe" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField control={form.control} name={`contacts.${index}.role`} render={({ field: f }) => ( <FormItem><FormLabel>Role</FormLabel><FormControl><Input placeholder="Manager, Buyer, etc." {...f} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`contacts.${index}.email`} render={({ field: f }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jane@example.com" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field: f }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="555-123-4567" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`contacts.${index}.contactNotes`} render={({ field: f }) => ( <FormItem><FormLabel>Contact Notes</FormLabel><FormControl><Textarea placeholder="Notes specific to this contact..." {...f} rows={2} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                </Card>
            ))}
            </CardContent>
        </Card>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button type="submit" className="w-full sm:w-auto">
            {initialData ? "Save Changes" : "Add Supplier"}
          </Button>
          {onCancel && (
             <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

    