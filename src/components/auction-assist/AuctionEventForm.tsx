
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Landmark, Link as LinkIcon, Edit, Percent, Search as SearchIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { AuctionEvent, Supplier, SupplierType } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogClose, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";

const auctionEventFormSchema = z.object({
  title: z.string().min(3, { message: "Auction title must be at least 3 characters." }),
  auctionDate: z.date({ required_error: "Auction date is required." }),
  auctionHouseSupplierId: z.string().min(1, { message: "Auction House selection is required." }),
  auctionUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  buyersPremiumPercent: z.coerce.number().min(0, "Buyer's premium must be non-negative.").optional().nullable(),
  taxRatePercent: z.coerce.number().min(0, "Tax rate must be non-negative.").optional().nullable(),
  notes: z.string().optional(),
});

type AuctionEventFormValues = z.infer<typeof auctionEventFormSchema>;

interface AuctionEventFormProps {
  onSubmit: (data: AuctionEvent) => void;
  initialData?: AuctionEvent;
}

export function AuctionEventForm({ onSubmit, initialData }: AuctionEventFormProps) {
  const { toast } = useToast();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierNameFromDialog, setNewSupplierNameFromDialog] = useState("");
  
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AuctionEventFormValues>({
    resolver: zodResolver(auctionEventFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      auctionDate: initialData?.auctionDate ? parseISO(initialData.auctionDate) : undefined,
      auctionHouseSupplierId: initialData?.auctionHouseSupplierId || "",
      auctionUrl: initialData?.auctionUrl || "",
      buyersPremiumPercent: initialData?.buyersPremiumPercent === undefined ? null : initialData.buyersPremiumPercent,
      taxRatePercent: initialData?.taxRatePercent === undefined ? null : initialData.taxRatePercent,
      notes: initialData?.notes || "",
    },
  });

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsedSuppliers: Supplier[] = JSON.parse(storedSuppliers);
        setAllSuppliers(parsedSuppliers);
      } catch (e) {
        console.error("Failed to parse suppliers for auction form", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
      }
    } else {
      setAllSuppliers(DEFAULT_SUPPLIERS);
    }

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === RESELLER_SUPPLIERS_KEY) {
            const newStoredSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
            if (newStoredSuppliers) {
                try {
                    const parsed: Supplier[] = JSON.parse(newStoredSuppliers);
                    setAllSuppliers(parsed);
                } catch { setAllSuppliers(DEFAULT_SUPPLIERS); }
            } else { setAllSuppliers(DEFAULT_SUPPLIERS); }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    const defaultValues = {
      title: initialData?.title || "",
      auctionDate: initialData?.auctionDate ? parseISO(initialData.auctionDate) : undefined,
      auctionHouseSupplierId: initialData?.auctionHouseSupplierId || "",
      auctionUrl: initialData?.auctionUrl || "",
      buyersPremiumPercent: initialData?.buyersPremiumPercent === undefined ? null : initialData.buyersPremiumPercent,
      taxRatePercent: initialData?.taxRatePercent === undefined ? null : initialData.taxRatePercent,
      notes: initialData?.notes || "",
    };
    form.reset(defaultValues);

    if (initialData?.auctionHouseSupplierId) {
      const linkedSupplier = allSuppliers.find(s => s.id === initialData.auctionHouseSupplierId);
      if (linkedSupplier) {
        setSupplierSearchQuery(linkedSupplier.name);
      }
    } else {
      setSupplierSearchQuery("");
    }
  }, [initialData, form, allSuppliers]);


  const handleFormSubmit = (data: AuctionEventFormValues) => {
    const auctionEventData: AuctionEvent = {
      id: initialData?.id || crypto.randomUUID(),
      dateAdded: initialData?.dateAdded || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      ...data,
      auctionDate: data.auctionDate.toISOString(),
      buyersPremiumPercent: data.buyersPremiumPercent === null ? undefined : data.buyersPremiumPercent,
      taxRatePercent: data.taxRatePercent === null ? undefined : data.taxRatePercent,
    };
    onSubmit(auctionEventData);
    if (!initialData?.id) {
      form.reset({
        title: "",
        auctionDate: undefined,
        auctionHouseSupplierId: "",
        auctionUrl: "",
        buyersPremiumPercent: null,
        taxRatePercent: null,
        notes: "",
      });
      setSupplierSearchQuery("");
    }
  };

  const handleSaveNewSupplierFromDialog = () => {
    const newName = newSupplierNameFromDialog.trim();
    if (!newName) {
      toast({ title: "Error", description: "Auction House name cannot be empty.", variant: "destructive" });
      return;
    }
    const auctionHouseType: SupplierType = 'AuctionHouse';
    const existingSuppliers: Supplier[] = JSON.parse(localStorage.getItem(RESELLER_SUPPLIERS_KEY) || JSON.stringify(DEFAULT_SUPPLIERS));
    if (existingSuppliers.some(sup => sup.name.toLowerCase() === newName.toLowerCase() && sup.type === auctionHouseType)) {
      toast({ title: "Error", description: `Auction House "${newName}" already exists.`, variant: "destructive" });
      return;
    }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      name: newName,
      type: auctionHouseType,
      contacts: [],
      dateAdded: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    const updatedSuppliers = [...existingSuppliers, newSupplier];
    localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
    
    form.setValue('auctionHouseSupplierId', newSupplier.id);
    setSupplierSearchQuery(newSupplier.name); 
    setAllSuppliers(updatedSuppliers);
    setIsAddSupplierDialogOpen(false);
    setNewSupplierNameFromDialog("");
    toast({ title: "Auction House Added", description: `Supplier "${newName}" added and selected.` });
    setIsSupplierSearchOpen(false);
  };

  const formatNumericInputValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return "";
    }
    return String(value);
  };
  
  const filteredAuctionHousesForSearch = useMemo(() => {
    const auctionHouses = allSuppliers.filter(s => s.type === 'AuctionHouse');
    if (!supplierSearchQuery.trim()) return auctionHouses.slice(0, 5);
    return auctionHouses.filter(s => 
      s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [supplierSearchQuery, allSuppliers]);

  const handleSelectSupplier = (supplier: Supplier) => {
    form.setValue("auctionHouseSupplierId", supplier.id);
    setSupplierSearchQuery(supplier.name);
    setIsSupplierSearchOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            {initialData ? <Edit className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
            {initialData ? "Edit Auction Event" : "Add New Auction Event"}
          </CardTitle>
          <CardDescription>
            {initialData ? "Update details for this auction." : "Enter details for an upcoming auction."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auction Title/Name*</FormLabel>
                    <FormControl><Input placeholder="e.g., Weekly Consignment Auction" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="auctionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Auction Date*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="auctionHouseSupplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="auctionHouseSearchInput">Auction House*</FormLabel>
                      <Popover open={isSupplierSearchOpen} onOpenChange={setIsSupplierSearchOpen}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="auctionHouseSearchInput"
                              ref={supplierSearchInputRef}
                              placeholder="Search auction houses or type to add new..."
                              value={supplierSearchQuery}
                              onChange={(e) => {
                                const newQuery = e.target.value;
                                setSupplierSearchQuery(newQuery);
                                setIsSupplierSearchOpen(true);
                                if (field.value && allSuppliers.find(s => s.id === field.value)?.name !== newQuery) {
                                  field.onChange(""); 
                                }
                              }}
                              onFocus={() => setIsSupplierSearchOpen(true)}
                              className="pl-10"
                            />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onInteractOutside={(e) => { if (supplierSearchInputRef.current && supplierSearchInputRef.current.contains(e.target as Node)) { return; } setIsSupplierSearchOpen(false); }}
                        >
                          <ScrollArea className="max-h-60">
                            {filteredAuctionHousesForSearch.length > 0 &&
                              filteredAuctionHousesForSearch.map(ah => (
                                <Button key={ah.id} variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => handleSelectSupplier(ah)}>
                                  {ah.name}
                                </Button>
                              ))}
                            {filteredAuctionHousesForSearch.length === 0 && supplierSearchQuery.trim() !== "" && (
                              <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left text-primary hover:text-primary-foreground"
                                onClick={() => {
                                  setNewSupplierNameFromDialog(supplierSearchQuery);
                                  // Type is fixed for Auction Events
                                  setIsAddSupplierDialogOpen(true);
                                  setIsSupplierSearchOpen(false);
                                }}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" /> Create new Auction House: "{supplierSearchQuery}"
                              </Button>
                            )}
                            {supplierSearchQuery.trim() === "" && (
                               <p className="p-2 text-xs text-muted-foreground text-center">Type to search auction houses.</p>
                            )}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="auctionUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auction URL (Optional)</FormLabel>
                    <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 text-muted-foreground mr-2" />
                        <FormControl><Input placeholder="https://auction.example.com/event/123" {...field} className="pl-8" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="buyersPremiumPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer's Premium (%) (Optional)</FormLabel>
                       <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 15" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} className="pl-8"/></FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxRatePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%) (Optional)</FormLabel>
                       <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 13" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} className="pl-8"/></FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any specific notes about this auction event..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto">
                {initialData ? "Update Auction Event" : "Save Auction Event"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Auction House</DialogTitle>
            <DialogDesc>
              Enter the name for the new Auction House. Full details can be added later from the Suppliers page.
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              id="newAuctionHouseName" 
              placeholder="Enter Auction House name" 
              value={newSupplierNameFromDialog} 
              onChange={(e) => setNewSupplierNameFromDialog(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewSupplierFromDialog();}}}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewSupplierNameFromDialog("")}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNewSupplierFromDialog}>Save Auction House</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

