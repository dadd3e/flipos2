
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit3, Package, DollarSign, CalendarDays, Tag, Box, ShoppingBag, Users, FileText, Info, List, ImageOff, FileSignature } from "lucide-react";
import type { InventoryItem, Supplier, ItemStatus } from "@/lib/types";
import { RESELLER_INVENTORY_KEY, RESELLER_SUPPLIERS_KEY, ITEM_STATUSES, SOLD_VIA_PLATFORMS } from "@/lib/constants";
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, cleanQuotes } from '@/lib/utils';

function ViewInventoryItemContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined; 

  const [item, setItem] = useState<InventoryItem | null | undefined>(undefined); 
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (id) {
      const storedInventoryRaw = localStorage.getItem(RESELLER_INVENTORY_KEY);
      if (storedInventoryRaw) {
        try {
          const inventoryArray: InventoryItem[] = JSON.parse(storedInventoryRaw);
          const foundItem = inventoryArray.find(s => s.id === id);
          setItem(foundItem || null);
        } catch (e) {
          console.error("Failed to parse inventory from localStorage:", e);
          setItem(null);
        }
      } else {
        setItem(null); 
      }

      const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      if (storedSuppliersRaw) {
        try {
          const parsedSuppliers = JSON.parse(storedSuppliersRaw);
          if (Array.isArray(parsedSuppliers)) {
            setSuppliers(parsedSuppliers);
          } else {
            console.error("Suppliers data from localStorage is not an array:", parsedSuppliers);
            setSuppliers([]);
          }
        } catch (e) {
          console.error("Failed to parse suppliers from localStorage:", e);
          setSuppliers([]);
        }
      } else {
        setSuppliers([]);
      }
    } else if (params && !id) {
      setItem(null); 
    }
  }, [id, params]);

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return "N/A";
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? `${supplier.name} (${supplier.type})` : "Unknown Supplier";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMMM d, yyyy") : "Invalid Date";
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusLabel = (statusValue?: ItemStatus) => {
     if (!statusValue) return "N/A";
     return ITEM_STATUSES.find(s => s.value === statusValue)?.label || statusValue;
  };


  if (item === undefined) {
    return <div className="text-center py-10">Loading item details...</div>;
  }

  if (item === null) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Inventory item not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory List
          </Link>
        </Button>
      </div>
    );
  }

  const DetailItem = ({ icon: Icon, label, value, valueClassName, isBadge, badgeVariant }: { icon: React.ElementType, label: string, value?: string | number | null, valueClassName?: string, isBadge?: boolean, badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined }) => (
    <div className="flex items-start py-2">
      <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 shrink-0" />
      <div className="flex-grow">
        <p className="text-sm text-muted-foreground">{label}</p>
        {isBadge && value ? (
          <Badge variant={badgeVariant || 'secondary'} className="mt-0.5">{value}</Badge>
        ) : (
          <p className={cn("text-base font-medium", valueClassName)}>{value || "N/A"}</p>
        )}
      </div>
    </div>
  );
  
  const statusConfig = ITEM_STATUSES.find(s => s.value === item.status);
  const statusBadgeVariant = statusConfig?.value === 'Active' ? 'default' 
    : statusConfig?.value === 'Sold' ? 'destructive' 
    : statusConfig?.value === 'Pending' ? 'secondary'
    : 'outline';


  return (
    <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-2rem)]">
      <div className="space-y-6 p-1 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline truncate" title={cleanQuotes(item.name)}>{cleanQuotes(item.name)}</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/inventory">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/inventory/add?editId=${item.id}`}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Item
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
            {item.itemImageUrl ? (
                <div className="md:col-span-1 lg:col-span-1 mb-4 md:mb-0 flex justify-center items-center">
                    <Image src={item.itemImageUrl} alt={cleanQuotes(item.name)} width={200} height={200} className="rounded-lg object-contain border max-h-[200px]" referrerPolicy="no-referrer" data-ai-hint="product photo"/>
                </div>
            ) : (
                <div className="md:col-span-1 lg:col-span-1 mb-4 md:mb-0 flex flex-col justify-center items-center text-muted-foreground bg-muted/50 rounded-lg h-[200px]">
                    <ImageOff size={48} />
                    <p className="mt-2 text-sm">No Image</p>
                </div>
            )}
            <div className="md:col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailItem icon={Package} label="Item Name" value={cleanQuotes(item.name)} />
                {item.nameOnInvoice && <DetailItem icon={FileSignature} label="Name on Invoice" value={cleanQuotes(item.nameOnInvoice)} />}
                <DetailItem icon={Tag} label="Category" value={item.category} />
                <DetailItem icon={List} label="Status" value={getStatusLabel(item.status)} isBadge badgeVariant={statusBadgeVariant} />
                <DetailItem icon={Package} label="Quantity" value={item.quantity} />
                <DetailItem icon={Box} label="Box Number" value={item.boxNumber} />
                <DetailItem icon={CalendarDays} label="Date Added" value={formatDate(item.dateAdded)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
            <CardHeader><CardTitle>Purchase & Source Information</CardTitle></CardHeader>
            <CardContent className="space-y-0 divide-y">
                <DetailItem icon={CalendarDays} label="Purchase Date" value={formatDate(item.purchaseDate)} />
                <DetailItem icon={ShoppingBag} label="Source" value={item.source} />
                {item.supplierId && <DetailItem icon={Users} label="Supplier" value={getSupplierName(item.supplierId)} />}
                {item.storeName && !item.supplierId && <DetailItem icon={Info} label="Store Name" value={item.storeName} />}
                {item.invoiceNumber && <DetailItem icon={FileText} label="Invoice Number" value={item.invoiceNumber} />}
            </CardContent>
            </Card>

            <Card>
            <CardHeader><CardTitle>Cost Details</CardTitle></CardHeader>
            <CardContent className="space-y-0 divide-y">
                <DetailItem icon={DollarSign} label="Unit Purchase Price" value={`$${item.price.toFixed(2)}`} />
                {item.buyersPremiumPercent !== undefined && <DetailItem icon={DollarSign} label="Buyer's Premium" value={`${item.buyersPremiumPercent}%`} />}
                {item.shippingAndHandling !== undefined && <DetailItem icon={DollarSign} label="Inbound Shipping & Handling" value={`$${item.shippingAndHandling.toFixed(2)}`} />}
                <DetailItem icon={Info} label="Taxable Purchase" value={item.isTaxablePurchase ? "Yes" : "No"} />
                <DetailItem icon={DollarSign} label="Total Purchase Cost" value={`$${item.totalPurchaseCost.toFixed(2)}`} valueClassName="font-bold"/>
            </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
            <CardHeader><CardTitle>Sales Projection</CardTitle></CardHeader>
            <CardContent className="space-y-0 divide-y">
                <DetailItem icon={DollarSign} label="Target Listing Price" value={item.targetPrice ? `$${item.targetPrice.toFixed(2)}` : undefined} />
                <DetailItem icon={DollarSign} label="Potential Profit (Est.)" value={item.potentialProfit ? `$${item.potentialProfit.toFixed(2)}` : undefined} valueClassName={item.potentialProfit && item.potentialProfit < 0 ? "text-destructive" : "text-green-600"}/>
            </CardContent>
            </Card>

            <Card>
            <CardHeader><CardTitle>Listing Platforms</CardTitle></CardHeader>
            <CardContent>
                {item.listedOn && item.listedOn.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {item.listedOn.map(platform => (
                    <Badge key={platform} variant="outline">{SOLD_VIA_PLATFORMS.find(p=>p.value === platform)?.label || platform}</Badge>
                    ))}
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">Not listed on any specific platforms yet.</p>
                )}
            </CardContent>
            </Card>
        </div>

        {item.additionalNotes && (
            <Card>
            <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap">{cleanQuotes(item.additionalNotes)}</p>
            </CardContent>
            </Card>
        )}
      </div>
    </ScrollArea>
  );
}


export default function ViewInventoryItemPage() {
    return (
        <Suspense fallback={<div>Loading item details...</div>}>
            <ViewInventoryItemContent />
        </Suspense>
    )
}
