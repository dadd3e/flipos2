"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Search, DollarSign as DollarSignIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Sale, InventoryItem, SoldViaPlatformValue, CashSaleSourceValue, CashSalePaidViaValue } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOLD_VIA_PLATFORMS, CASH_SALE_SOURCES, CASH_SALE_PAID_VIA_OPTIONS } from "@/lib/constants";
import { useState, useMemo, useRef, useCallback } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const baseSaleSchema = z.object({
  itemId: z.string().min(1, { message: "Please select an item." }),
  itemName: z.string(),
  totalPurchaseCostOfItemSold: z.coerce.number(),
  quantitySold: z.coerce.number().min(1, { message: "Quantity sold must be at least 1." }),
  saleDate: z.date({ required_error: "Sale date is required." }),
  soldVia: z.enum(SOLD_VIA_PLATFORMS.map(p => p.value) as [SoldViaPlatformValue, ...SoldViaPlatformValue[]], {
    required_error: "Please select where the item was sold.",
  }),
});

const ebaySchema = z.object({
  ebaySalePrice: z.coerce.number().min(0, "Sale price must be non-negative."),
  ebayShippingCharged: z.coerce.number().min(0, "Shipping charged must be non-negative."),
  ebayTransactionFees: z.coerce.number().min(0, "Transaction fees must be non-negative."),
  ebayShippingCost: z.coerce.number().min(0, "Shipping cost must be non-negative."),
});

const poshmarkSchema = z.object({
  poshmarkSalePrice: z.coerce.number().min(0, "Sale price must be non-negative."),
  poshmarkFees: z.coerce.number().min(0, "Poshmark fees must be non-negative."),
  poshmarkShippingDiscounts: z.coerce.number().min(0).optional(),
  poshmarkTaxesOnShippingDiscounts: z.coerce.number().min(0).optional(),
});

const cashSaleSchema = z.object({
  cashSalePrice: z.coerce.number().min(0, "Sale price must be non-negative."),
  cashSaleSource: z.enum(CASH_SALE_SOURCES.map(s => s.value) as [CashSaleSourceValue, ...CashSaleSourceValue[]], {
    required_error: "Please select the source for cash sale.",
  }),
  cashSalePaidVia: z.enum(CASH_SALE_PAID_VIA_OPTIONS.map(p => p.value) as [CashSalePaidViaValue, ...CashSalePaidViaValue[]], {
    required_error: "Please select how payment was received.",
  }),
  cashSalePayPalFees: z.coerce.number().min(0).optional(),
  cashSaleShippingCost: z.coerce.number().min(0).optional(),
});

const etsyDetailedSchema = z.object({
  etsySalePrice: z.coerce.number().min(0, "Etsy Sale Price must be non-negative."),
  etsyDiscount: z.coerce.number().min(0, "Etsy Discount must be non-negative.").optional(),
  etsyShippingCharged: z.coerce.number().min(0, "Etsy Shipping Charged must be non-negative."),
  etsyTaxes: z.coerce.number().min(0, "Etsy Taxes must be non-negative."),
  etsyShippingCost: z.coerce.number().min(0, "Etsy Shipping Cost must be non-negative."),
  etsyOffsiteAdFee: z.coerce.number().min(0, "Etsy Offsite Ad Fee must be non-negative.").optional(),
}).refine(data => (data.etsySalePrice ?? 0) >= (data.etsyDiscount ?? 0), {
  message: "Discount cannot be greater than the sale price.",
  path: ["etsyDiscount"],
});

const fbOtherSchema = z.object({ 
  etsyFbOtherSalePrice: z.coerce.number().min(0, "Sale price must be non-negative."),
  etsyFbOtherFees: z.coerce.number().min(0).optional(),
  etsyFbOtherShippingCost: z.coerce.number().min(0).optional(),
});

const saleFormValidationSchema = baseSaleSchema.extend({
  ebaySalePrice: z.coerce.number().optional(),
  ebayShippingCharged: z.coerce.number().optional(),
  ebayTransactionFees: z.coerce.number().optional(),
  ebayShippingCost: z.coerce.number().optional(),
  poshmarkSalePrice: z.coerce.number().optional(),
  poshmarkFees: z.coerce.number().optional(),
  poshmarkShippingDiscounts: z.coerce.number().optional(),
  poshmarkTaxesOnShippingDiscounts: z.coerce.number().optional(),
  cashSalePrice: z.coerce.number().optional(),
  cashSaleSource: z.enum(CASH_SALE_SOURCES.map(s => s.value) as [CashSaleSourceValue, ...CashSaleSourceValue[]]).optional(),
  cashSalePaidVia: z.enum(CASH_SALE_PAID_VIA_OPTIONS.map(p => p.value) as [CashSalePaidViaValue, ...CashSalePaidViaValue[]]).optional(),
  cashSalePayPalFees: z.coerce.number().optional(),
  cashSaleShippingCost: z.coerce.number().optional(),
  etsySalePrice: z.coerce.number().optional(),
  etsyDiscount: z.coerce.number().optional(),
  etsyShippingCharged: z.coerce.number().optional(),
  etsyTaxes: z.coerce.number().optional(),
  etsyShippingCost: z.coerce.number().optional(),
  etsyOffsiteAdFee: z.coerce.number().optional(),
  etsyFbOtherSalePrice: z.coerce.number().optional(),
  etsyFbOtherFees: z.coerce.number().optional(),
  etsyFbOtherShippingCost: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.soldVia === "eBay") {
    const result = ebaySchema.safeParse(data);
    if (!result.success) { result.error.issues.forEach(issue => ctx.addIssue(issue)); }
  } else if (data.soldVia === "Poshmark") {
    const result = poshmarkSchema.safeParse(data);
    if (!result.success) { result.error.issues.forEach(issue => ctx.addIssue(issue)); }
  } else if (data.soldVia === "Cash Sale") {
    const result = cashSaleSchema.safeParse(data);
    if (!result.success) { result.error.issues.forEach(issue => ctx.addIssue(issue)); }
    if (data.cashSalePaidVia === "PayPal" && (data.cashSalePayPalFees === undefined || data.cashSalePayPalFees < 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cashSalePayPalFees"], message: "PayPal fees are required if paid via PayPal and must be non-negative." });
    }
  } else if (data.soldVia === "Etsy") {
    const result = etsyDetailedSchema.safeParse(data);
    if (!result.success) { result.error.issues.forEach(issue => ctx.addIssue(issue)); }
  } else if (data.soldVia === "Facebook" || data.soldVia === "Other") {
     const result = fbOtherSchema.safeParse(data);
    if (!result.success) { result.error.issues.forEach(issue => ctx.addIssue(issue)); }
  }
});

type SaleFormValues = z.infer<typeof saleFormValidationSchema>;

interface SalesFormProps {
  inventoryItems: InventoryItem[]; 
  onSubmit: (data: Sale) => void;
}

const calculateEtsyFees = (values: Partial<SaleFormValues>) => {
  const salePrice = Number(values.etsySalePrice) || 0;
  const discount = Number(values.etsyDiscount) || 0;
  const shippingCharged = Number(values.etsyShippingCharged) || 0;
  const taxes = Number(values.etsyTaxes) || 0;

  const subtotal = parseFloat((salePrice - discount).toFixed(2));
  const orderTotal = parseFloat((subtotal + taxes + shippingCharged).toFixed(2));
  
  const processingFee = parseFloat(((orderTotal * 0.03) + 0.25).toFixed(2));
  const transactionFee = parseFloat(((subtotal + shippingCharged) * 0.065).toFixed(2));
  const regulatoryFee = parseFloat((orderTotal * 0.0115).toFixed(2));

  return { subtotal, orderTotal, processingFee, transactionFee, regulatoryFee };
};

const calculateFinancials = (data: SaleFormValues, etsyCalculated: any): { gross: number, fees: number, shipping: number } => {
  let gross = 0;
  let fees = 0;
  let shipping = 0;

  switch (data.soldVia) {
    case "Etsy":
      gross = etsyCalculated.orderTotal;
      fees = parseFloat((
        etsyCalculated.processingFee +
        etsyCalculated.transactionFee +
        etsyCalculated.regulatoryFee +
        (data.etsyOffsiteAdFee || 0) +
        (data.etsyDiscount || 0) 
      ).toFixed(2));
      shipping = data.etsyShippingCost || 0;
      break;
    case "eBay":
      gross = (data.ebaySalePrice || 0) + (data.ebayShippingCharged || 0);
      fees = data.ebayTransactionFees || 0;
      shipping = data.ebayShippingCost || 0;
      break;
    case "Poshmark":
      gross = data.poshmarkSalePrice || 0;
      fees = (data.poshmarkFees || 0) + (data.poshmarkShippingDiscounts || 0) + (data.poshmarkTaxesOnShippingDiscounts || 0);
      shipping = 0; 
      break;
    case "Cash Sale":
      gross = data.cashSalePrice || 0;
      fees = data.cashSalePaidVia === "PayPal" ? (data.cashSalePayPalFees || 0) : 0;
      shipping = data.cashSaleShippingCost || 0;
      break;
    case "Facebook":
    case "Other":
      gross = data.etsyFbOtherSalePrice || 0;
      fees = data.etsyFbOtherFees || 0;
      shipping = data.etsyFbOtherShippingCost || 0;
      break;
  }
  return { gross, fees, shipping };
};

export function SalesForm({ inventoryItems, onSubmit }: SalesFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormValidationSchema),
    defaultValues: { quantitySold: 1 },
  });

  const watchedValues = form.watch();

  const etsyCalculations = useMemo(() => {
    if (watchedValues.soldVia === "Etsy") {
      return calculateEtsyFees(watchedValues);
    }
    return { subtotal: 0, orderTotal: 0, processingFee: 0, transactionFee: 0, regulatoryFee: 0 };
  }, [watchedValues]);

  const currentProfit = useMemo(() => {
    const quantity = Number(watchedValues.quantitySold) || 0;
    const cogsPerUnit = Number(watchedValues.totalPurchaseCostOfItemSold) || 0;
    const totalCOGS = parseFloat((cogsPerUnit * quantity).toFixed(2));
    
    const { gross, fees, shipping } = calculateFinancials(watchedValues, etsyCalculations);
    const netRevenuePreCOGS = parseFloat((gross - fees - shipping).toFixed(2));
    return parseFloat((netRevenuePreCOGS - totalCOGS).toFixed(2));
  }, [watchedValues, etsyCalculations]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return inventoryItems; 
    return inventoryItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, inventoryItems]);

  const handleItemSelect = useCallback((item: InventoryItem) => {
    setSelectedInventoryItem(item);
    form.setValue("itemId", item.id);
    form.setValue("itemName", item.name); 
    const costPerUnit = item.quantity > 0 ? parseFloat((item.totalPurchaseCost / item.quantity).toFixed(2)) : item.totalPurchaseCost;
    form.setValue("totalPurchaseCostOfItemSold", costPerUnit);
    const currentQuantitySold = form.getValues("quantitySold");
    if (currentQuantitySold > item.quantity || currentQuantitySold === 0 ) {
      form.setValue("quantitySold", Math.min(1, item.quantity)); 
    }
    form.clearErrors("quantitySold");
    form.clearErrors("itemId");
    setSearchTerm(item.name); 
    setIsItemSearchOpen(false);
  }, [form]);

  const handleSubmitInternal = useCallback((data: SaleFormValues) => {
    if (!selectedInventoryItem) {
        form.setError("itemId", {type: "manual", message: "Please select a valid item."});
        return;
    }
    if (data.quantitySold > selectedInventoryItem.quantity) {
      form.setError("quantitySold", { type: "manual", message: `Only ${selectedInventoryItem.quantity} of ${selectedInventoryItem.name} in stock.`});
      return;
    }

    const { gross, fees, shipping } = calculateFinancials(data, etsyCalculations);
    const costPerUnit = data.totalPurchaseCostOfItemSold;
    const netRevenuePreCOGS = parseFloat((gross - fees - shipping).toFixed(2));
    const finalProfit = parseFloat((netRevenuePreCOGS - (costPerUnit * data.quantitySold)).toFixed(2));

    const saleData: Sale = {
      id: crypto.randomUUID(),
      itemId: selectedInventoryItem.id,
      itemName: selectedInventoryItem.name,
      quantitySold: data.quantitySold,
      saleDate: data.saleDate.toISOString(),
      totalPurchaseCostOfItemSold: costPerUnit,
      soldVia: data.soldVia,
      grossSaleAmount: parseFloat(gross.toFixed(2)),
      totalPlatformFeesAndDiscounts: parseFloat(fees.toFixed(2)),
      actualShippingCostBySeller: parseFloat(shipping.toFixed(2)),
      netRevenuePreCOGS,
      profit: finalProfit,
      // Spread platform specific fields
      ...(data.soldVia === 'Etsy' && {
        etsySalePrice: data.etsySalePrice,
        etsyDiscount: data.etsyDiscount,
        etsySubtotal: etsyCalculations.subtotal,
        etsyShippingCharged: data.etsyShippingCharged,
        etsyTaxes: data.etsyTaxes,
        etsyShippingCost: data.etsyShippingCost,
        etsyOrderTotal: etsyCalculations.orderTotal,
        etsyProcessingFee: etsyCalculations.processingFee,
        etsyTransactionFee: etsyCalculations.transactionFee,
        etsyRegulatoryOperatingFee: etsyCalculations.regulatoryFee,
        etsyOffsiteAdFee: data.etsyOffsiteAdFee,
      }),
      ...(data.soldVia === 'eBay' && {
        ebaySalePrice: data.ebaySalePrice,
        ebayShippingCharged: data.ebayShippingCharged,
        ebayTransactionFees: data.ebayTransactionFees,
        ebayShippingCost: data.ebayShippingCost,
      }),
      ...(data.soldVia === 'Poshmark' && {
        poshmarkSalePrice: data.poshmarkSalePrice,
        poshmarkFees: data.poshmarkFees,
        poshmarkShippingDiscounts: data.poshmarkShippingDiscounts,
        poshmarkTaxesOnShippingDiscounts: data.poshmarkTaxesOnShippingDiscounts,
      }),
      ...(data.soldVia === 'Cash Sale' && {
        cashSalePrice: data.cashSalePrice,
        cashSaleSource: data.cashSaleSource,
        cashSalePaidVia: data.cashSalePaidVia,
        cashSalePayPalFees: data.cashSalePayPalFees,
        cashSaleShippingCost: data.cashSaleShippingCost,
      }),
      ...( (data.soldVia === 'Facebook' || data.soldVia === 'Other') && {
        etsyFbOtherSalePrice: data.etsyFbOtherSalePrice,
        etsyFbOtherFees: data.etsyFbOtherFees,
        etsyFbOtherShippingCost: data.etsyFbOtherShippingCost,
      }),
    };

    onSubmit(saleData);
    form.reset({ quantitySold: 1 });
    setSearchTerm("");
    setSelectedInventoryItem(null);
  }, [form, onSubmit, selectedInventoryItem, etsyCalculations]);

  const renderCalculatedField = (label: string, value: number) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
        <DollarSignIcon className="mr-2 h-4 w-4 text-muted-foreground" />
        {value.toFixed(2)}
      </div>
    </FormItem>
  );

  return (
    <Card id="log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <PlusCircle className="h-6 w-6" />
          Log New Sale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
            <FormField
              control={form.control}
              name="itemId" 
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel htmlFor="itemNameSearchInput">Search Item Name</FormLabel>
                  <Popover open={isItemSearchOpen} onOpenChange={setIsItemSearchOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="itemNameSearchInput"
                          ref={searchInputRef}
                          placeholder="Type to search for an active item..."
                          value={searchTerm}
                          onChange={(e) => {
                            const newSearchTerm = e.target.value;
                            setSearchTerm(newSearchTerm);
                            setIsItemSearchOpen(true); 
                            if (selectedInventoryItem && newSearchTerm !== selectedInventoryItem.name) {
                              setSelectedInventoryItem(null);
                              form.setValue("itemId", "");
                            }
                          }}
                          onFocus={() => { if (!selectedInventoryItem) { setIsItemSearchOpen(true); }}}
                          className="pl-10"
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="w-[--radix-popover-trigger-width] p-0" 
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                           if (searchInputRef.current && searchInputRef.current.contains(e.target as Node)) { return; }
                           setIsItemSearchOpen(false);
                        }}
                    >
                      <ScrollArea className="max-h-60">
                        {isItemSearchOpen && inventoryItems.length === 0 && (<div className="p-2 text-sm text-center text-muted-foreground">No active items available to sell.</div>)}
                        {isItemSearchOpen && inventoryItems.length > 0 && searchResults.length === 0 && searchTerm && (<div className="p-2 text-sm text-center text-muted-foreground">No active items match "{searchTerm}".</div>)}
                        {isItemSearchOpen && searchResults.length > 0 && ( searchResults.map((item) => (
                            <Button key={item.id} variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => handleItemSelect(item)}>
                              <div className="flex flex-col items-start">
                                <div>{item.name}</div>
                                <div className="text-xs text-muted-foreground">Stock: {item.quantity} | Unit Cost: ${(item.totalPurchaseCost && item.quantity > 0 ? (item.totalPurchaseCost / item.quantity) : item.totalPurchaseCost).toFixed(2)}</div>
                              </div>
                            </Button>
                        )))}
                         {isItemSearchOpen && inventoryItems.length > 0 && searchResults.length === 0 && !searchTerm && (<div className="p-2 text-sm text-center text-muted-foreground">Type to search active items.</div>)}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  <FormMessage /> 
                </FormItem>
              )}
            />
            
            {selectedInventoryItem && (
                <div className="p-3 border rounded-md bg-muted/50">
                    <p className="font-medium text-sm">{selectedInventoryItem.name}</p>
                    <p className="text-xs text-muted-foreground">Current Stock: {selectedInventoryItem.quantity} | Unit Cost: ${(watchedValues.totalPurchaseCostOfItemSold || 0).toFixed(2)}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="quantitySold" render={({ field }) => ( <FormItem><FormLabel>Quantity Sold</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={(e) => { const value = parseInt(e.target.value); if (selectedInventoryItem && value > selectedInventoryItem.quantity) { field.onChange(selectedInventoryItem.quantity); form.setError("quantitySold", {type: "manual", message: `Max ${selectedInventoryItem.quantity} available.`}); } else if (value < 1 && e.target.value !== "" && !isNaN(value)) { field.onChange(1); form.setError("quantitySold", {type: "manual", message: `Minimum 1.`}); } else { field.onChange(isNaN(value) ? "" : value); form.clearErrors("quantitySold"); }}}/></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="saleDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Sale Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
            </div>

            <FormField control={form.control} name="soldVia" render={({ field }) => ( 
              <FormItem>
                <FormLabel>Sold Via</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SOLD_VIA_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem> 
            )}/>

            {watchedValues.soldVia === "Etsy" && (
              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg">Etsy Details</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="etsySalePrice" render={({ field }) => ( <FormItem><FormLabel>Sale Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="etsyDiscount" render={({ field }) => ( <FormItem><FormLabel>Discount ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  {renderCalculatedField("Subtotal ($)", etsyCalculations.subtotal)}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="etsyShippingCharged" render={({ field }) => ( <FormItem><FormLabel>Shipping Charged to Buyer ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="etsyTaxes" render={({ field }) => ( <FormItem><FormLabel>Taxes Collected ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  {renderCalculatedField("Order Total ($)", etsyCalculations.orderTotal)}
                  <FormField control={form.control} name="etsyShippingCost" render={({ field }) => ( <FormItem><FormLabel>Actual Shipping Cost ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormLabel className="font-medium text-base">Etsy Fees</FormLabel>
                  {renderCalculatedField("Processing Fee (3% of Order Total + $0.25)", etsyCalculations.processingFee)}
                  {renderCalculatedField("Transaction Fee (6.5% of Subtotal + Shipping Charged)", etsyCalculations.transactionFee)}
                  {renderCalculatedField("Regulatory Operating Fee (1.15% of Order Total)", etsyCalculations.regulatoryFee)}
                  <FormField control={form.control} name="etsyOffsiteAdFee" render={({ field }) => ( <FormItem><FormLabel>Offsite Ad Fee ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
              </Card>
            )}

            {watchedValues.soldVia === "eBay" && (
              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg">eBay Details</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-4">
                  <FormField control={form.control} name="ebaySalePrice" render={({ field }) => ( <FormItem><FormLabel>Sale Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="ebayShippingCharged" render={({ field }) => ( <FormItem><FormLabel>Shipping Charged to Buyer ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="ebayTransactionFees" render={({ field }) => ( <FormItem><FormLabel>Transaction Fees (incl. HST) ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="ebayShippingCost" render={({ field }) => ( <FormItem><FormLabel>Actual Shipping Cost ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
              </Card>
            )}

            {watchedValues.soldVia === "Poshmark" && (
              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg">Poshmark Details</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-4">
                  <FormField control={form.control} name="poshmarkSalePrice" render={({ field }) => ( <FormItem><FormLabel>Listing Sale Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="poshmarkFees" render={({ field }) => ( <FormItem><FormLabel>Poshmark Fees ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="poshmarkShippingDiscounts" render={({ field }) => ( <FormItem><FormLabel>Shipping Discount Given ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="poshmarkTaxesOnShippingDiscounts" render={({ field }) => ( <FormItem><FormLabel>Taxes on Shipping Discount ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
              </Card>
            )}

            {watchedValues.soldVia === "Cash Sale" && (
              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg">Cash Sale Details</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-4">
                  <FormField control={form.control} name="cashSalePrice" render={({ field }) => ( <FormItem><FormLabel>Sale Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="cashSaleSource" render={({ field }) => ( <FormItem><FormLabel>Source</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl><SelectContent>{CASH_SALE_SOURCES.map(s=><SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="cashSalePaidVia" render={({ field }) => ( <FormItem><FormLabel>Paid Via</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl><SelectContent>{CASH_SALE_PAID_VIA_OPTIONS.map(p=><SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  {watchedValues.cashSalePaidVia === "PayPal" && ( <FormField control={form.control} name="cashSalePayPalFees" render={({ field }) => ( <FormItem><FormLabel>PayPal Fees ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} /> )}
                  <FormField control={form.control} name="cashSaleShippingCost" render={({ field }) => ( <FormItem><FormLabel>Shipping Cost ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
              </Card>
            )}

            {(watchedValues.soldVia === "Facebook" || watchedValues.soldVia === "Other") && (
                <Card className="bg-muted/30 p-4 space-y-4">
                 <CardHeader className="p-0 pb-2"><CardTitle className="text-lg">{SOLD_VIA_PLATFORMS.find(p => p.value === watchedValues.soldVia)?.label || watchedValues.soldVia} Details</CardTitle></CardHeader>
                 <CardContent className="p-0 space-y-4">
                    <FormField control={form.control} name="etsyFbOtherSalePrice" render={({ field }) => ( <FormItem><FormLabel>Gross Sale Amount Received ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="etsyFbOtherFees" render={({ field }) => ( <FormItem><FormLabel>Total Platform Fees ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="etsyFbOtherShippingCost" render={({ field }) => ( <FormItem><FormLabel>Actual Shipping Cost ($) (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )} />
                 </CardContent>
                </Card>
            )}

            <FormItem>
                <FormLabel>Calculated Profit</FormLabel>
                <div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-base font-semibold md:text-sm", currentProfit < 0 ? "text-destructive" : "text-green-600")}>
                    {`$${currentProfit.toFixed(2)}`}
                </div>
                <FormDescription className="text-xs pt-1">Profit = (Revenue from Sale) - (Total Fees) - (Shipping Cost by Seller) - (COGS).{watchedValues.soldVia === "Etsy" && " For Etsy, Revenue from Sale = Subtotal + Shipping Charged."}</FormDescription>
            </FormItem>

            <Button type="submit" className="w-full sm:w-auto" disabled={!selectedInventoryItem || !form.formState.isValid}>Log Sale</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}