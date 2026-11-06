
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
import { DollarSign, Link as LinkIcon, ShoppingCart } from "lucide-react";
import type { AuctionItem } from "@/lib/types";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const auctionItemFormSchema = z.object({
  itemName: z.string().min(2, "Item name must be at least 2 characters."),
  itemUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  estimatedSalePrice: z.coerce.number().min(0, "Estimated sale price must be non-negative."),
  maxBid: z.coerce.number().min(0, "Max bid must be non-negative."),
  potentialProfit: z.coerce.number(), // Calculated, but include for form state
});

type AuctionItemFormValues = z.infer<typeof auctionItemFormSchema>;

interface AuctionItemFormProps {
  auctionEventId: string;
  onSubmit: (data: AuctionItem) => void;
  initialData?: Partial<AuctionItem>;
  onCancel?: () => void;
  auctionBuyersPremiumPercent?: number;
  auctionTaxRatePercent?: number;
}

export function AuctionItemForm({ 
    auctionEventId, 
    onSubmit, 
    initialData, 
    onCancel, 
    auctionBuyersPremiumPercent, 
    auctionTaxRatePercent 
}: AuctionItemFormProps) {
  const form = useForm<AuctionItemFormValues>({
    resolver: zodResolver(auctionItemFormSchema),
    defaultValues: {
      itemName: initialData?.itemName || "",
      itemUrl: initialData?.itemUrl || "",
      estimatedSalePrice: initialData?.estimatedSalePrice || 0,
      maxBid: initialData?.maxBid || 0,
      potentialProfit: initialData?.potentialProfit || 0,
    },
  });

  const watchedEstSalePrice = form.watch("estimatedSalePrice");
  const watchedMaxBid = form.watch("maxBid");

  useEffect(() => {
    const estSalePrice = parseFloat(String(watchedEstSalePrice)) || 0;
    const maxBidPrice = parseFloat(String(watchedMaxBid)) || 0;
    
    const bpDecimal = (auctionBuyersPremiumPercent || 0) / 100;
    const trDecimal = (auctionTaxRatePercent || 0) / 100;

    const costWithPremiumAndTax = maxBidPrice * (1 + bpDecimal) * (1 + trDecimal);
    const estNetRevenueAfterSellingFee = estSalePrice * 0.85; // Assuming 15% selling fee

    const profit = parseFloat((estNetRevenueAfterSellingFee - costWithPremiumAndTax).toFixed(2));
    form.setValue("potentialProfit", profit);
  }, [watchedEstSalePrice, watchedMaxBid, auctionBuyersPremiumPercent, auctionTaxRatePercent, form]);
  
  useEffect(() => {
    form.reset({
      itemName: initialData?.itemName || "",
      itemUrl: initialData?.itemUrl || "",
      estimatedSalePrice: initialData?.estimatedSalePrice || 0,
      maxBid: initialData?.maxBid || 0,
      potentialProfit: initialData?.potentialProfit || 0, // This will be recalculated by the effect above if inputs change
    });
  }, [initialData, form]);

  function handleFormSubmit(data: AuctionItemFormValues) {
    const auctionItemData: AuctionItem = {
      id: initialData?.id || crypto.randomUUID(),
      auctionEventId: auctionEventId,
      ...data,
      // potentialProfit is already correctly set in the form state by the useEffect hook
    };
    onSubmit(auctionItemData);
    if (!initialData?.id) { // Reset only if adding new, not editing
      form.reset({
        itemName: "",
        itemUrl: "",
        estimatedSalePrice: 0,
        maxBid: 0,
        potentialProfit: 0,
      });
    }
  }
  
  const formatNumericInputValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return "";
    }
    return String(value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name*</FormLabel>
              <FormControl><Input placeholder="e.g., Lot #123 - Antique Vase" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="itemUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item URL (Optional)</FormLabel>
              <div className="flex items-center">
                  <LinkIcon className="h-4 w-4 text-muted-foreground mr-2" />
                  <FormControl><Input placeholder="https://auction.com/item/789" {...field} className="pl-8" /></FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimatedSalePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Est. Sale Price*</FormLabel>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-8" value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} /></FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxBid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Bid*</FormLabel>
                 <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-8" value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} /></FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="potentialProfit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Potential Profit</FormLabel>
                <div className={cn(
                    "flex h-10 w-full items-center rounded-full border border-input bg-muted px-3 py-2 text-sm",
                    field.value < 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"
                )}>
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  {field.value.toFixed(2)}
                </div>
                <FormDescription className="text-xs">
                  (Est. Sale Price * 0.85) - (Max Bid + Auction BP + Tax on Bid & BP)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        <div className="flex gap-2">
          <Button type="submit" className="flex-grow sm:flex-grow-0">
            {initialData?.id ? "Update Item" : "Add Item to Auction"}
          </Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-grow sm:flex-grow-0">Cancel</Button>}
        </div>
      </form>
    </Form>
  );
}
