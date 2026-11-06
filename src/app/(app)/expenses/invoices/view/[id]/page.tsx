"use client";

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit3, FileText, CalendarDays, Building, DollarSign, List, Info, CreditCard, Package, Truck } from "lucide-react";
import type { Invoice, Supplier, InventoryItem } from "@/lib/types";
import { RESELLER_INVOICES_KEY, RESELLER_SUPPLIERS_KEY, RESELLER_INVENTORY_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';

function ViewInvoiceContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (id) {
      const storedInvoicesRaw = localStorage.getItem(RESELLER_INVOICES_KEY);
      if (storedInvoicesRaw) {
        try {
          const invoicesArray: Invoice[] = JSON.parse(storedInvoicesRaw);
          const foundInvoice = invoicesArray.find(inv => inv.id === id);
          setInvoice(foundInvoice || null);
        } catch { setInvoice(null); }
      } else { setInvoice(null); }

      const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      if (storedSuppliersRaw) {
        try { setSuppliers(JSON.parse(storedSuppliersRaw)); }
        catch { setSuppliers(DEFAULT_SUPPLIERS); }
      }
      
      const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
      if (storedInventoryRaw) {
          try { setInventory(JSON.parse(storedInventoryRaw)); }
          catch { setInventory([]); }
      }

    } else {
      setInvoice(null);
    }
  }, [id]);

  const getSupplierName = useCallback((supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || "Unknown Supplier";
  }, [suppliers]);
  
  const getInventoryItemName = useCallback((itemId?: string) => {
      if (!itemId) return null;
      return inventory.find(i => i.id === itemId)?.name || null;
  }, [inventory]);

  if (invoice === undefined) {
    return <div className="text-center py-10">Loading invoice details...</div>;
  }

  if (invoice === null) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/expenses/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-2rem)]">
      <div className="space-y-6 p-1 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold font-headline">Invoice {invoice.invoiceNumber || ''}</h1>
              <p className="text-muted-foreground">from {getSupplierName(invoice.supplierId)}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/expenses/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link></Button>
            <Button onClick={() => router.push('/expenses/invoices')} className="w-full sm:w-auto"><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-muted-foreground" /><p><strong>Date:</strong> {format(parseISO(invoice.date), "PPP")}</p></div>
             <div className="flex items-center gap-3"><Building className="h-5 w-5 text-muted-foreground" /><p><strong>Supplier:</strong> {getSupplierName(invoice.supplierId)}</p></div>
             <div className="flex items-center gap-3"><Info className="h-5 w-5 text-muted-foreground" /><p><strong>Invoice #:</strong> <Badge variant="secondary">{invoice.invoiceNumber || "N/A"}</Badge></p></div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Linked Inventory Item</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {invoice.lineItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                        {item.inventoryItemId ? (
                                            <Link href={`/inventory/view/${item.inventoryItemId}`} className="text-primary hover:underline">{getInventoryItemName(item.inventoryItemId) || 'View Item'}</Link>
                                        ) : (<span className="text-muted-foreground text-xs">Not Linked</span>)}
                                    </TableCell>
                                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

         <Card>
            <CardHeader><CardTitle>Totals & Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-sm text-muted-foreground">Subtotal</p><p className="font-semibold">${invoice.subtotal.toFixed(2)}</p></div>
                    {invoice.buyersPremium !== undefined && <div><p className="text-sm text-muted-foreground">Buyer's Premium</p><p className="font-semibold">${invoice.buyersPremium.toFixed(2)}</p></div>}
                    {invoice.shippingCost !== undefined && <div><p className="text-sm text-muted-foreground">Shipping</p><p className="font-semibold">${invoice.shippingCost.toFixed(2)}</p></div>}
                    <div><p className="text-sm text-muted-foreground">Tax</p><p className="font-semibold">${invoice.taxAmount.toFixed(2)}</p></div>
                    <div className="col-span-2 md:col-span-1"><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">${invoice.totalAmount.toFixed(2)}</p></div>
                </div>
                <Separator />
                 <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-muted-foreground" /><p><strong>Paid Via:</strong> {invoice.paidBy === "Other" ? invoice.paidByOther : invoice.paidBy}</p></div>
            </CardContent>
         </Card>
         
         {invoice.notes && (
             <Card>
                <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{invoice.notes}</p></CardContent>
             </Card>
         )}

      </div>
    </ScrollArea>
  );
}

export default function ViewInvoicePage() {
    return (
        <Suspense fallback={<div>Loading invoice...</div>}>
            <ViewInvoiceContent />
        </Suspense>
    )
}
