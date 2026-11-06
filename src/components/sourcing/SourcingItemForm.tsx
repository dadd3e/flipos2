
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { SourcedItemWish, SourcedItemStatus, Supplier, SupplierType } from "@/lib/types";
import { SOURCED_ITEM_STATUSES, RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS, SUPPLIER_TYPES } from "@/lib/constants";
import { PlusCircle, Edit, CalendarIcon, Briefcase, Search as SearchIcon } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Dialog, DialogClose, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";


const sourcedItemFormSchema = z.object({
  itemName: z.string().min(2, "Opportunity name must be at least 2 characters."),
  targetDate: z.date().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  status: z.enum(SOURCED_ITEM_STATUSES.map(s => s.value) as [SourcedItemStatus, ...SourcedItemStatus[]]),
  targetBuyPrice: z.coerce.number().min(0).optional().nullable(),
  potentialSources: z.string().optional(),
  notes: z.string().optional(),
});

type SourcingFormValues = z.infer<typeof sourcedItemFormSchema>;

interface SourcingItemFormProps {
  onSubmit: (data: SourcedItemWish) => void;
  initialData?: SourcedItemWish;
}

export function SourcingItemForm({ onSubmit, initialData }: SourcingItemFormProps) {
  const { toast } = useToast();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierNameFromDialog, setNewSupplierNameFromDialog] = useState("");
  const [newSupplierTypeFromDialog, setNewSupplierTypeFromDialog] = useState<SupplierType>("Store"); 
  
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<SourcingFormValues>({
    resolver: zodResolver(sourcedItemFormSchema),
    defaultValues: {
      itemName: "",
      targetDate: null,
      supplierId: null,
      status: "Opportunity",
      targetBuyPrice: null,
      potentialSources: "",
      notes: "",
    },
  });

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers);
        if (Array.isArray(parsed)) setAllSuppliers(parsed);
      } catch (e) {
        console.error("Failed to parse suppliers for sourcing form", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
      }
    } else {
      setAllSuppliers(DEFAULT_SUPPLIERS);
    }
     const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SUPPLIERS_KEY) {
        const newStoredSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
        if (newStoredSuppliers) {
          try { setAllSuppliers(JSON.parse(newStoredSuppliers)); }
          catch { setAllSuppliers(DEFAULT_SUPPLIERS); }
        } else { setAllSuppliers(DEFAULT_SUPPLIERS); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    const defaultValues = {
        itemName: initialData?.itemName || "",
        targetDate: initialData?.targetDate ? parseISO(initialData.targetDate) : null,
        supplierId: initialData?.supplierId || null,
        status: initialData?.status || "Opportunity", 
        targetBuyPrice: initialData?.targetBuyPrice === undefined ? null : initialData.targetBuyPrice,
        potentialSources: initialData?.potentialSources || "",
        notes: initialData?.notes || "",
    };
    form.reset(defaultValues);

    if (initialData?.supplierId) {
        const linkedSupplier = allSuppliers.find(s => s.id === initialData.supplierId);
        if (linkedSupplier) {
            setSupplierSearchQuery(linkedSupplier.name);
        }
    } else {
        setSupplierSearchQuery("");
    }
  }, [initialData, form, allSuppliers]);


  async function handleFormSubmit(data: SourcingFormValues) {
    const fullItemData: SourcedItemWish = {
      id: initialData?.id || crypto.randomUUID(), 
      dateAdded: initialData?.dateAdded || new Date().toISOString(), 
      dateUpdated: new Date().toISOString(), 
      updatesLog: initialData?.updatesLog || [], // Preserve existing logs
      ...data,
      targetDate: data.targetDate ? data.targetDate.toISOString() : undefined,
      supplierId: data.supplierId || undefined,
      targetBuyPrice: data.targetBuyPrice === null ? undefined : data.targetBuyPrice,
    };
    onSubmit(fullItemData);
    if (!initialData) { 
      form.reset({
        itemName: "",
        targetDate: null,
        supplierId: null,
        status: "Opportunity", 
        targetBuyPrice: null,
        potentialSources: "",
        notes: "",
      });
      setSupplierSearchQuery("");
    }
  }
  
  const formatNumericInputValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return "";
    }
    return String(value);
  };

  const filteredSuppliersForSearch = useMemo(() => {
    if (!supplierSearchQuery.trim()) return allSuppliers.slice(0, 5);
    return allSuppliers.filter(s => 
      s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [supplierSearchQuery, allSuppliers]);

  const handleSelectSupplier = (supplier: Supplier) => {
    form.setValue("supplierId", supplier.id);
    setSupplierSearchQuery(supplier.name);
    setIsSupplierSearchOpen(false);
  };
  
  const getSupplierTypeLabel = (type: SupplierType) => {
    return SUPPLIER_TYPES.find(st => st.value === type)?.label || type;
  }
  
  const handleSaveNewSupplierFromDialog = () => {
    const newName = newSupplierNameFromDialog.trim();
    if (!newName || !newSupplierTypeFromDialog) {
      toast({ title: "Error", description: "Supplier name and type are required.", variant: "destructive" });
      return;
    }
    if (allSuppliers.some(sup => sup.name.toLowerCase() === newName.toLowerCase() && sup.type === newSupplierTypeFromDialog)) {
      toast({ title: "Error", description: `Supplier "${newName}" of type ${newSupplierTypeFromDialog} already exists.`, variant: "destructive" });
      return;
    }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      name: newName,
      type: newSupplierTypeFromDialog,
      contacts: [],
      dateAdded: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    const updatedSuppliers = [...allSuppliers, newSupplier];
    localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
    form.setValue('supplierId', newSupplier.id);
    setSupplierSearchQuery(newSupplier.name); 
    setAllSuppliers(updatedSuppliers);
    setIsAddSupplierDialogOpen(false);
    setNewSupplierNameFromDialog("");
    setNewSupplierTypeFromDialog("Store"); 
    toast({ title: "Supplier Added", description: `${getSupplierTypeLabel(newSupplierTypeFromDialog)} "${newName}" added and selected.` });
    setIsSupplierSearchOpen(false);
  };


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          {initialData ? <Edit className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
          {initialData ? "Edit Opportunity Item" : "Add Sourcing Opportunity"}
        </CardTitle>
        <CardDescription>
          {initialData ? "Update the details for this sourcing opportunity." : "Track items you are looking for and potential sourcing opportunities."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity*</FormLabel>
                  <FormControl><Input placeholder="e.g., Vintage Pyrex Bowl Set, Rare Comic Book" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target/Follow-up Date</FormLabel>
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
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => field.onChange(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="sourcingSupplierSearchInput">Linked Supplier (Optional)</FormLabel>
                    <Popover open={isSupplierSearchOpen} onOpenChange={setIsSupplierSearchOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="sourcingSupplierSearchInput"
                            ref={supplierSearchInputRef}
                            placeholder="Search suppliers or type to add new..."
                            value={supplierSearchQuery}
                            onChange={(e) => {
                              const newQuery = e.target.value;
                              setSupplierSearchQuery(newQuery);
                              setIsSupplierSearchOpen(true);
                              if (field.value && allSuppliers.find(s => s.id === field.value)?.name !== newQuery) {
                                field.onChange(null); 
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
                           {filteredSuppliersForSearch.length > 0 &&
                            filteredSuppliersForSearch.map((s) => (
                              <Button key={s.id} variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => handleSelectSupplier(s)}>
                                <div className="flex flex-col items-start">
                                  <span>{s.name}</span>
                                  <span className="text-xs text-muted-foreground">({getSupplierTypeLabel(s.type)})</span>
                                </div>
                              </Button>
                            ))}
                          {filteredSuppliersForSearch.length === 0 && supplierSearchQuery.trim() !== "" && (
                            <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left text-primary hover:text-primary-foreground"
                              onClick={() => {
                                setNewSupplierNameFromDialog(supplierSearchQuery);
                                // Let user pick type in dialog for sourcing form
                                setNewSupplierTypeFromDialog("Store"); // Default type
                                setIsAddSupplierDialogOpen(true);
                                setIsSupplierSearchOpen(false);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" /> Create new supplier: "{supplierSearchQuery}"
                            </Button>
                          )}
                          {supplierSearchQuery.trim() === "" && (
                             <p className="p-2 text-xs text-muted-foreground text-center">Type to search suppliers.</p>
                          )}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SOURCED_ITEM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetBuyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Buy Price ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 20.00" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="potentialSources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potential Sources</FormLabel>
                  <FormControl><Textarea placeholder="e.g., Local thrift stores, Online marketplaces, Specific auctions..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="e.g., Specific color/pattern, condition requirements..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto">
              {initialData ? "Update Opportunity" : "Add Opportunity"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>

    <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDesc>
              Enter the name and type for the new supplier. Full details can be added later from the Suppliers page.
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              id="newSourcingSupplierName" 
              placeholder="Enter supplier name" 
              value={newSupplierNameFromDialog} 
              onChange={(e) => setNewSupplierNameFromDialog(e.target.value)} 
            />
            <Select value={newSupplierTypeFromDialog} onValueChange={(value) => setNewSupplierTypeFromDialog(value as SupplierType)}>
                <SelectTrigger><SelectValue placeholder="Select supplier type" /></SelectTrigger>
                <SelectContent>
                    {SUPPLIER_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => { setNewSupplierNameFromDialog(""); setNewSupplierTypeFromDialog("Store"); }}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNewSupplierFromDialog}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

