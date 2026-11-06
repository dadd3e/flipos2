
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { InventoryItem, ItemStatus, Supplier, SupplierType } from '@/lib/types'; // Removed SoldViaPlatformValue
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ChevronDown, ChevronUp, DollarSign, Package, Users, CalendarDays } from 'lucide-react'; // Removed Edit, ImagePlus, Coins, CheckCircle2Icon, Briefcase, CheckboxIcon
import { ITEM_STATUSES, RESELLER_CATEGORIES_KEY, DEFAULT_CATEGORIES, RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS, TAX_RATE } from '@/lib/constants';
import { cn, cleanQuotes } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";

interface ExpandableInventoryRowProps {
  item: InventoryItem;
  onUpdate: (updatedItem: InventoryItem) => void;
  onDelete: (itemId: string) => void;
  onEditRedirect: (item: InventoryItem) => void;
  isSelected: boolean;
  onSelectionChange: (itemId: string, isSelected: boolean) => void;
}

const ExpandableInventoryRowComponent = ({ item, onUpdate, onDelete, onEditRedirect, isSelected, onSelectionChange }: ExpandableInventoryRowProps) => {
  const [editData, setEditData] = useState<InventoryItem>(item);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  // const prevItemIdRef = useRef(item.id); // Commented out as part of the latest simplification test


  // Effect to load categories and suppliers from localStorage on mount
  useEffect(() => {
    const storedCategories = localStorage.getItem(RESELLER_CATEGORIES_KEY);
    if (storedCategories) {
      try {
        const parsed = JSON.parse(storedCategories);
        if (Array.isArray(parsed)) setAvailableCategories(parsed.sort());
      } catch (e) { console.error("Error parsing categories for row", e); }
    }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers);
        if (Array.isArray(parsed)) setSuppliers(parsed);
      } catch (e) { console.error("Error parsing suppliers for row", e); }
    }
  }, []);

  // Effect to sync `item` prop to `editData` ONLY IF item.id changes
  // This is the core of the input preservation strategy
  useEffect(() => {
    // Only reset editData if the item prop is for a *different* item.id
    // This prevents overwriting local typing when the parent re-renders
    // with a new object reference for the *same* item.
    if (item.id !== editData.id) {
        setEditData(item);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]); // Depend ONLY on item.id to re-initialize for a new item

  // Sync other item props if they change AND the ID is the same, but avoid direct reset of currently focused fields
  useEffect(() => {
    if (item.id === editData.id) {
        // A more careful update, to avoid wiping user's current input
        // For non-input fields, or fields not currently focused, it's safer to update.
        // This part can be tricky. For now, we rely on the fact that editData only resets on item.id change.
        // If parent updates data for the *same* item, those updates won't reflect in an *open* expanded row until save/collapse.
        // This is a common tradeoff for inline editing to prevent input loss.
        // If we MUST reflect parent changes while open, it needs very granular state updates.
    }
  }, [item, editData.id]);


  const linkedSupplier = useMemo(() => {
    if (editData.supplierId && suppliers.length > 0) {
      return suppliers.find(s => s.id === editData.supplierId);
    }
    return null;
  }, [editData.supplierId, suppliers]);

  const handleInputChange = (field: keyof InventoryItem, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const formatNumericInputValue = (value: number | undefined | null | string): string => {
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  };
  
  const handleNumericInputChange = (field: keyof InventoryItem, value: string) => {
    if (value === "" || value === "-") {
      setEditData(prev => ({ ...prev, [field]: value === "" ? undefined : value }));
    } else if (value.endsWith(".") && !isNaN(parseFloat(value.slice(0, -1)))) {
        setEditData(prev => ({ ...prev, [field]: value }));
    } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            setEditData(prev => ({ ...prev, [field]: num }));
        }
        // If not a valid number or intermediate state, do nothing to prevent bad state
        // This might mean the input visually doesn't change for a bad character
    }
  };


  const handleSave = () => {
    if (!editData.name || editData.name.trim() === "") {
        toast({ title: "Error", description: "Item name cannot be empty.", variant: "destructive"});
        return;
    }

    let calculatedTotalPurchaseCost = editData.totalPurchaseCost;
    const priceVal = parseFloat(String(editData.price)) || 0;
    const buyersPremiumPercentVal = parseFloat(String(editData.buyersPremiumPercent)) || 0;
    const shippingVal = parseFloat(String(editData.shippingAndHandling)) || 0;
    const taxable = !!editData.isTaxablePurchase;
    const buyersPremiumAmount = parseFloat(((priceVal * buyersPremiumPercentVal) / 100).toFixed(2));
    const taxBase = priceVal + buyersPremiumAmount;
    const taxAmount = taxable ? parseFloat((taxBase * TAX_RATE).toFixed(2)) : 0;
    calculatedTotalPurchaseCost = parseFloat((priceVal + buyersPremiumAmount + shippingVal + taxAmount).toFixed(2));

    let calculatedPotentialProfit = editData.potentialProfit;
    const targetPriceVal = parseFloat(String(editData.targetPrice)) || 0;
    const projectedRevenue = parseFloat((targetPriceVal * 0.85).toFixed(2)); 
    calculatedPotentialProfit = parseFloat((projectedRevenue - calculatedTotalPurchaseCost).toFixed(2));
    
    let finalQuantity = editData.quantity;
    if (editData.status === 'Sold') {
        finalQuantity = 0;
    }


    const itemToUpdate: InventoryItem = {
      ...item, 
      ...editData,
      totalPurchaseCost: calculatedTotalPurchaseCost, 
      potentialProfit: calculatedPotentialProfit, 
      quantity: finalQuantity, 
      purchaseDate: (editData.purchaseDate && isValid(parseISO(editData.purchaseDate))) 
                      ? editData.purchaseDate // It's already an ISO string and valid
                      : undefined,
    };
    onUpdate(itemToUpdate);
    toast({ title: "Changes Saved", description: `Item "${itemToUpdate.name}" updated.`});
  };

  const handleCloseExpandedView = () => {
    setIsExpanded(false);
    setEditData(item); 
  };

  const getStatusBadgeVariant = (status?: ItemStatus) => {
    if (!status) return "outline";
    switch (status) {
      case 'Active': return 'default';
      case 'Pending': return 'secondary';
      case 'Sold': return 'destructive';
      default: return 'outline';
    }
  };

  const DetailItem = ({ icon: Icon, label, value, className, children }: { icon?: React.ElementType, label: string, value?: string | number | null, className?: string, children?: React.ReactNode }) => (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children ? <div className="text-sm">{children}</div> : <p className="text-sm">{value || "N/A"}</p>}
    </div>
  );

  return (
    <Card className={cn("overflow-hidden transition-all duration-300", isSelected ? "ring-2 ring-primary shadow-lg" : "shadow-sm hover:shadow-md")}>
      <div className="flex items-center p-3 gap-3 border-b">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
          aria-label={`Select item ${item.name}`}
          className="shrink-0"
        />
        <div className="flex-none w-10 h-10 rounded border bg-muted flex items-center justify-center">
          {item.itemImageUrl ? (
            <Image src={item.itemImageUrl} alt={cleanQuotes(item.name)} width={40} height={40} className="object-cover rounded" referrerPolicy="no-referrer" data-ai-hint="product photo"/>
          ) : (
            <Package className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 items-center gap-x-4 gap-y-1 flex-grow text-sm">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-semibold truncate" title={cleanQuotes(item.name)}>{cleanQuotes(item.name)}</p>
            <p className="text-xs text-muted-foreground">SKU: {item.id.substring(0, 10)}...</p>
          </div>
           <div className="hidden md:block">
             <Badge variant="outline" className="truncate max-w-[150px]" title={cleanQuotes(editData.additionalNotes) || "N/A"}>
               {(cleanQuotes(editData.additionalNotes) || "N/A").substring(0,20)}{ (editData.additionalNotes || "").length > 20 ? '...' : ''}
             </Badge>
           </div>
          <div className="hidden sm:block">
            <Badge variant={getStatusBadgeVariant(editData.status)}>{editData.status}</Badge>
             {editData.category && <span className="text-xs text-muted-foreground ml-1 truncate block" title={editData.category}>{editData.category}</span>}
          </div>
          <div className="text-right md:text-left">
            <p className="font-medium">${(editData.targetPrice || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Qty: {editData.quantity}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="ml-auto shrink-0">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>

      {isExpanded && (
        <CardContent className="p-4 space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              <div className="aspect-square w-full bg-muted rounded border flex items-center justify-center relative">
                {editData.itemImageUrl ? (
                  <Image src={editData.itemImageUrl} alt={editData.name || "Item image"} layout="fill" objectFit="contain" className="rounded" referrerPolicy="no-referrer" data-ai-hint="product detail"/>
                ) : (
                  // Using Package as a placeholder since ImagePlus was removed
                  <Package className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => onEditRedirect(item)}>+ Add/Change Image (Full Form)</Button>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <DetailItem label="Item Name">
                <Input value={editData.name || ""} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Item Display Name" />
              </DetailItem>
              <DetailItem label="Price (Selling Target)">
                 <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-muted-foreground mr-1.5"/>
                    <Input type="text" value={formatNumericInputValue(editData.targetPrice)} onChange={(e) => handleNumericInputChange('targetPrice', e.target.value)} placeholder="0.00" className="pl-7" />
                </div>
              </DetailItem>
              <DetailItem label="Notes">
                <Textarea value={editData.additionalNotes || ""} onChange={(e) => handleInputChange('additionalNotes', e.target.value)} placeholder="e.g., Summer Collection, condition details" rows={2} />
              </DetailItem>
              <DetailItem label="SKU (Item ID)">
                <Input value={item.id.substring(0,10)} disabled />
              </DetailItem>
              <DetailItem label="Cost (Unit Purchase Price)">
                <div className="flex items-center">
                    {/* Using DollarSign as Coins was removed */}
                    <DollarSign className="h-4 w-4 text-muted-foreground mr-1.5"/> 
                    <Input type="text" value={formatNumericInputValue(editData.price)} onChange={(e) => handleNumericInputChange('price', e.target.value)} placeholder="0.00" className="pl-7" />
                </div>
              </DetailItem>
              <DetailItem label="Category">
                 <Select value={editData.category || ""} onValueChange={(val) => handleInputChange('category', val)} >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                        {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
              </DetailItem>
              <DetailItem label="Status">
                <Select value={editData.status || "Active"} onValueChange={(val) => handleInputChange('status', val as ItemStatus)} >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                        {ITEM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
              </DetailItem>
              <DetailItem label="Vendor">
                {linkedSupplier ? (
                  <div className="flex h-10 w-full items-center rounded-full border border-input bg-muted px-3 py-2 text-sm">
                     {linkedSupplier.name} <span className="text-xs text-muted-foreground ml-1">({SUPPLIER_TYPES.find(st => st.value === linkedSupplier.type)?.label || linkedSupplier.type})</span>
                  </div>
                ) : (
                  <Input value={editData.storeName || ""} onChange={(e) => handleInputChange('storeName', e.target.value)} placeholder="Vendor/Store Name (if no linked supplier)" />
                )}
              </DetailItem>
              <DetailItem label="Purchase Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editData.purchaseDate && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {editData.purchaseDate && isValid(parseISO(editData.purchaseDate)) ? format(parseISO(editData.purchaseDate), "PPP") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                        mode="single" 
                        selected={editData.purchaseDate ? (isValid(parseISO(editData.purchaseDate)) ? parseISO(editData.purchaseDate) : undefined) : undefined} 
                        onSelect={(date) => {
                            handleInputChange('purchaseDate', date ? date.toISOString() : undefined);
                        }} 
                        initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </DetailItem>
               <DetailItem label="Stock (Total Qty)">
                <Input type="text" value={formatNumericInputValue(editData.quantity)} onChange={(e) => handleNumericInputChange('quantity', e.target.value)} placeholder="0" />
              </DetailItem>
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <Button variant="link" onClick={() => onEditRedirect(item)}>Advanced Edit Form</Button>
            <div className="flex items-center gap-2">
                {/* Using Package as CheckCircle2Icon was removed */}
                <Button size="sm" onClick={handleSave}><Package className="h-4 w-4 mr-1.5"/> Save Changes</Button>
                <Button size="sm" variant="outline" onClick={handleCloseExpandedView}>Close</Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const ExpandableInventoryRow = ExpandableInventoryRowComponent;
