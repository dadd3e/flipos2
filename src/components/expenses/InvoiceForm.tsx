"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Trash2, Search, Upload, FileText, Split, DollarSign, Sparkles, Loader2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceLineItem, InventoryItem, Supplier, SupplierType, PaymentMethod } from "@/lib/types";
import { RESELLER_SUPPLIERS_KEY, RESELLER_INVENTORY_KEY, PAYMENT_METHODS, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { parseInvoicePdf } from "@/ai/flows/parse-invoice-pdf-flow";

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required."),
  inventoryItemId: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  splitGroupId: z.string().optional(),
});

const invoiceSchema = z.object({
  date: z.date({ required_error: "Invoice date is required." }),
  supplierId: z.string().min(1, "Supplier is required."),
  invoiceNumber: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  taxAmount: z.coerce.number().min(0).default(0),
  buyersPremium: z.coerce.number().min(0).optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  paidBy: z.custom<PaymentMethod>(val => PAYMENT_METHODS.some(p => p.value === val), {
      message: "Invalid payment method."
  }),
  paidByOther: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => !(data.paidBy === 'Other' && !data.paidByOther?.trim()), {
    message: "Please specify the payment method.",
    path: ["paidByOther"],
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSubmit: (data: Invoice) => void;
  initialData?: Invoice;
  onCancel?: () => void;
}

export function InvoiceForm({ onSubmit, initialData, onCancel }: InvoiceFormProps) {
  const { toast } = useToast();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierNameFromDialog, setNewSupplierNameFromDialog] = useState("");
  
  const [activeInventorySearch, setActiveInventorySearch] = useState<{index: number, query: string} | null>(null);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddItemIndex, setQuickAddItemIndex] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [aiDataUrl, setAiDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData ? {
        ...initialData,
        date: parseISO(initialData.date),
        buyersPremium: initialData.buyersPremium,
        shippingCost: initialData.shippingCost,
    } : {
      date: new Date(),
      lineItems: [{ id: crypto.randomUUID(), description: "", price: 0 }],
      taxAmount: 0,
      buyersPremium: undefined,
      shippingCost: undefined,
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  
  const watchedLineItems = form.watch("lineItems");
  const watchedTaxAmount = form.watch("taxAmount");
  const watchedBuyersPremium = form.watch("buyersPremium");
  const watchedShippingCost = form.watch("shippingCost");

  const subtotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  }, [watchedLineItems]);

  const totalAmount = useMemo(() => {
    return subtotal + (Number(watchedTaxAmount) || 0) + (Number(watchedBuyersPremium) || 0) + (Number(watchedShippingCost) || 0);
  }, [subtotal, watchedTaxAmount, watchedBuyersPremium, watchedShippingCost]);

  const loadData = useCallback(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) setAllSuppliers(JSON.parse(storedSuppliers));
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) setInventoryItems(JSON.parse(storedInventory));
  }, []);

  useEffect(() => {
    loadData();
     const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_SUPPLIERS_KEY || event.key === RESELLER_INVENTORY_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);
  
  useEffect(() => {
    return () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    };
  }, [previewUrl]);

  const handleFormSubmit = useCallback((data: InvoiceFormValues) => {
    const finalData: Invoice = {
        id: initialData?.id || crypto.randomUUID(),
        ...data,
        date: data.date.toISOString(),
        lineItems: data.lineItems.map(item => ({
            ...item,
            inventoryItemName: item.inventoryItemId ? inventoryItems.find(i => i.id === item.inventoryItemId)?.name : undefined,
        })),
        subtotal: subtotal,
        totalAmount: totalAmount,
        buyersPremium: data.buyersPremium,
        shippingCost: data.shippingCost,
        dateAdded: initialData?.dateAdded || new Date().toISOString(),
    };
    onSubmit(finalData);
    if (!initialData) {
        form.reset({
          date: new Date(),
          lineItems: [{ id: crypto.randomUUID(), description: "", price: 0 }],
          taxAmount: 0,
          buyersPremium: undefined,
          shippingCost: undefined,
        });
    }
  }, [initialData, onSubmit, form, inventoryItems, subtotal, totalAmount]);

  const handleSaveNewSupplierFromDialog = useCallback(() => {
    const newName = newSupplierNameFromDialog.trim();
    if (!newName) {
      toast({ title: "Error", description: "Supplier name cannot be empty.", variant: "destructive" });
      return;
    }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(), name: newName, type: 'Store',
      contacts: [], dateAdded: new Date().toISOString(), lastUpdated: new Date().toISOString(),
    };
    const updatedSuppliers = [...allSuppliers, newSupplier];
    localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
    form.setValue('supplierId', newSupplier.id);
    setSupplierSearchQuery(newName);
    setAllSuppliers(updatedSuppliers);
    setIsAddSupplierDialogOpen(false);
    setNewSupplierNameFromDialog("");
    toast({ title: "Supplier Added", description: `Supplier "${newName}" added and selected.`});
  }, [newSupplierNameFromDialog, allSuppliers, form, toast]);

  const handleSplitLineItem = useCallback((index: number) => {
    const lineItems = form.getValues('lineItems');
    const currentItem = lineItems[index];

    if (!currentItem || currentItem.price <= 0) {
        toast({ title: "Cannot Split", description: "Line item must have a price greater than zero to be split.", variant: "destructive" });
        return;
    }

    const groupId = currentItem.splitGroupId || crypto.randomUUID();
    const itemsInGroup = lineItems.map((item, i) => ({ ...item, originalIndex: i }))
                                     .filter(item => item.splitGroupId === groupId);

    const isNewSplit = itemsInGroup.length === 0;
    const originalTotal = isNewSplit ? currentItem.price : itemsInGroup.reduce((sum, item) => sum + item.price, 0);
    const newItemCount = isNewSplit ? 2 : itemsInGroup.length + 1;

    const basePrice = Math.floor((originalTotal / newItemCount) * 100) / 100;
    const remainder = parseFloat((originalTotal - (basePrice * newItemCount)).toFixed(2));

    const newPrices = Array(newItemCount).fill(basePrice);
    for (let i = 0; i < Math.round(remainder * 100); i++) {
        newPrices[i % newItemCount] += 0.01;
    }

    if (isNewSplit) {
        update(index, { ...currentItem, price: newPrices[0], splitGroupId: groupId });
        append({ ...currentItem, id: crypto.randomUUID(), price: newPrices[1], inventoryItemId: undefined, splitGroupId: groupId });
    } else {
        itemsInGroup.forEach((item, i) => {
            update(item.originalIndex, { ...item, price: newPrices[i] });
        });
        append({ ...itemsInGroup[0], id: crypto.randomUUID(), price: newPrices[newItemCount - 1], inventoryItemId: undefined, splitGroupId: groupId });
    }

    toast({ title: "Line Item Split", description: `Item value of $${originalTotal.toFixed(2)} split across ${newItemCount} items.` });
  }, [form, toast, update, append]);
  
  const handleQuickAddItem = useCallback(() => {
    if (quickAddItemIndex === null || !newItemName.trim()) return;

    const priceFromLineItem = form.getValues(`lineItems.${quickAddItemIndex}.price`) || 0;

    const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        status: 'Pending',
        quantity: 1,
        price: priceFromLineItem,
        totalPurchaseCost: priceFromLineItem,
        dateAdded: new Date().toISOString(),
    };

    const currentInventory = JSON.parse(localStorage.getItem(RESELLER_INVENTORY_KEY) || '[]') as InventoryItem[];
    const newInventory = [...currentInventory, newItem];
    localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(newInventory));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_INVENTORY_KEY, newValue: JSON.stringify(newInventory) }));

    form.setValue(`lineItems.${quickAddItemIndex}.inventoryItemId`, newItem.id);
    
    toast({ title: "Item Created", description: `"${newItem.name}" added to inventory and linked.` });

    setIsQuickAddOpen(false);
    setNewItemName("");
    setQuickAddItemIndex(null);

  }, [quickAddItemIndex, newItemName, form, toast]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return allSuppliers.slice(0, 5);
    return allSuppliers.filter(s => s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())).slice(0, 5);
  }, [supplierSearchQuery, allSuppliers]);
  
  const filteredInventoryItems = useMemo(() => {
    if (!activeInventorySearch) return inventoryItems.slice(0, 5);
    return inventoryItems.filter(i => i.name.toLowerCase().includes(activeInventorySearch.query.toLowerCase())).slice(0, 5);
  }, [activeInventorySearch, inventoryItems]);

  const groupedLineItems = useMemo(() => {
    const groups: Record<string, number[]> = {};
    const ungrouped: number[] = [];
    fields.forEach((field, index) => {
        if (field.splitGroupId) {
            if (!groups[field.splitGroupId]) groups[field.splitGroupId] = [];
            groups[field.splitGroupId].push(index);
        } else {
            ungrouped.push(index);
        }
    });
    return { groups, ungrouped };
  }, [fields]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowPdfPreview(true);
      setAiDataUrl(null); // Reset until loaded

      const reader = new FileReader();
      reader.onloadend = () => {
        setAiDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPdfFile(null);
      setAiDataUrl(null);
      setPreviewUrl(null);
      if (file) toast({ title: "Invalid File", description: "Please select a PDF file.", variant: "destructive" });
    }
  };

  const handleParsePdf = async () => {
    if (!aiDataUrl) {
      toast({ title: "Processing...", description: "Please wait for the file to finish loading.", variant: "default" });
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseInvoicePdf({ pdfDataUri: aiDataUrl });

      let supplierFoundId: string | undefined = undefined;
      if (result.supplierName) {
        const lowerSupplierName = result.supplierName.toLowerCase();
        const foundSupplier = allSuppliers.find(s => s.name.toLowerCase() === lowerSupplierName);
        if (foundSupplier) {
          supplierFoundId = foundSupplier.id;
          setSupplierSearchQuery(foundSupplier.name);
        } else {
          setSupplierSearchQuery(result.supplierName);
        }
      }

      const newFormData: Partial<InvoiceFormValues> = {};
      if (result.date && isValid(parseISO(result.date))) newFormData.date = parseISO(result.date);
      if (supplierFoundId) newFormData.supplierId = supplierFoundId;
      if (result.invoiceNumber) newFormData.invoiceNumber = result.invoiceNumber;
      if (result.taxAmount !== undefined) newFormData.taxAmount = result.taxAmount;
      if (result.shippingCost !== undefined) newFormData.shippingCost = result.shippingCost;
      if (result.buyersPremium !== undefined) newFormData.buyersPremium = result.buyersPremium;

      form.reset({ ...form.getValues(), ...newFormData });

      if (result.lineItems && result.lineItems.length > 0) {
        replace(result.lineItems.map(item => ({
          id: crypto.randomUUID(),
          description: item.description,
          price: item.price,
        })));
      }
      toast({ title: "PDF Parsed", description: "Invoice details populated." });
    } catch (error) {
      toast({ title: "Parsing Failed", description: "Could not parse PDF.", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline"><Upload className="h-6 w-6" />PDF Upload &amp; Parsing (AI)</CardTitle>
              <CardDescription>Upload a PDF invoice to automatically fill the form fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="max-w-xs" />
                  <Button type="button" onClick={handleParsePdf} disabled={isParsing || !aiDataUrl}>
                      {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {isParsing ? "Parsing..." : "Parse PDF with AI"}
                  </Button>
              </div>
              {pdfFile && (
                  <div className="flex items-center space-x-2 pt-2">
                      <Switch id="show-pdf-preview" checked={showPdfPreview} onCheckedChange={setShowPdfPreview} />
                      <Label htmlFor="show-pdf-preview">Show PDF Preview (Split Screen)</Label>
                  </div>
              )}
          </CardContent>
      </Card>
      
      <div className={cn("flex flex-col gap-6", showPdfPreview && "lg:flex-row")}>
        <div className={cn("w-full space-y-6", showPdfPreview && "lg:w-1/2")}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 font-headline"><FileText className="h-6 w-6" />Invoice Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Invoice Date*</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn( "w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground" )}>{field.value ? ( format(field.value, "PPP") ) : ( <span>Pick a date</span> )}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="supplierId" render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="supplierSearchInput">Supplier*</FormLabel>
                              <Popover open={isSupplierSearchOpen} onOpenChange={setIsSupplierSearchOpen}>
                                <PopoverTrigger asChild>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="supplierSearchInput" ref={supplierSearchInputRef} placeholder="Search suppliers..." value={supplierSearchQuery} onChange={(e) => {setSupplierSearchQuery(e.target.value); if(field.value) field.onChange("");}} onFocus={() => setIsSupplierSearchOpen(true)} className="pl-10" />
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <ScrollArea className="max-h-60">
                                    {filteredSuppliers.map(s => <Button key={s.id} variant="ghost" className="w-full justify-start" onClick={() => {field.onChange(s.id); setSupplierSearchQuery(s.name); setIsSupplierSearchOpen(false);}}>{s.name}</Button>)}
                                    {supplierSearchQuery && !filteredSuppliers.some(s => s.name.toLowerCase() === supplierSearchQuery.toLowerCase()) && (
                                      <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => {setNewSupplierNameFromDialog(supplierSearchQuery); setIsAddSupplierDialogOpen(true);}}>
                                        <PlusCircle className="mr-2 h-4 w-4"/>Add new supplier: "{supplierSearchQuery}"
                                      </Button>
                                    )}
                                  </ScrollArea>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}/>
                      </div>
                       <FormField control={form.control} name="invoiceNumber" render={({ field }) => ( <FormItem><FormLabel>Invoice Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., INV-12345" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {groupedLineItems.ungrouped.map(index => {
                        const field = fields[index];
                        return (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 border p-3 rounded-lg">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-grow">
                                    <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field: f }) => ( <FormItem><FormLabel>Description*</FormLabel><FormControl><Input placeholder="Item description from invoice" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name={`lineItems.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price*</FormLabel><FormControl><Input type="number" placeholder="0.00" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name={`lineItems.${index}.inventoryItemId`} render={({ field: f }) => (
                                        <FormItem>
                                        <FormLabel>Link to Inventory Item</FormLabel>
                                        <Popover open={activeInventorySearch?.index === index} onOpenChange={(open) => setActiveInventorySearch(open ? {index, query: inventoryItems.find(i => i.id === f.value)?.name || ""} : null)}>
                                            <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Search inventory..." value={activeInventorySearch?.index === index ? activeInventorySearch.query : inventoryItems.find(i => i.id === f.value)?.name || ""} onChange={e => setActiveInventorySearch({index, query: e.target.value})} className="pl-10"/>
                                            </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <ScrollArea className="max-h-60">
                                                {filteredInventoryItems.map(i => <Button key={i.id} variant="ghost" className="w-full justify-start" onClick={() => {f.onChange(i.id); setActiveInventorySearch(null);}}>{i.name}</Button>)}
                                                {activeInventorySearch?.query && (
                                                <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => { setNewItemName(activeInventorySearch.query); setQuickAddItemIndex(index); setIsQuickAddOpen(true); setActiveInventorySearch(null); }}>
                                                    <PlusCircle className="mr-2 h-4 w-4"/> Add new item: "{activeInventorySearch.query}"
                                                </Button>
                                                )}
                                            </ScrollArea>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button type="button" variant="outline" size="icon" onClick={() => handleSplitLineItem(index)}><Split className="h-4 w-4" /></Button>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        );
                    })}

                    {Object.entries(groupedLineItems.groups).map(([groupId, indices]) => (
                      <div key={groupId} className="p-3 border-2 border-primary/50 rounded-lg space-y-3 bg-primary/5">
                        <p className="text-sm font-semibold text-primary">Split Item Group</p>
                        {indices.map((index, groupIndex) => {
                          const field = fields[index];
                          return (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-grow">
                                 <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field: f }) => ( <FormItem><FormLabel>Description* {groupIndex + 1}</FormLabel><FormControl><Input placeholder="Item description from invoice" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                                 <FormField control={form.control} name={`lineItems.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price* {groupIndex + 1}</FormLabel><FormControl><Input type="number" placeholder="0.00" {...f} /></FormControl><FormMessage /></FormItem> )}/>
                                 <FormField control={form.control} name={`lineItems.${index}.inventoryItemId`} render={({ field: f }) => (
                                    <FormItem>
                                        <FormLabel>Link to Inventory Item {groupIndex + 1}</FormLabel>
                                        <Popover open={activeInventorySearch?.index === index} onOpenChange={(open) => setActiveInventorySearch(open ? {index, query: inventoryItems.find(i => i.id === f.value)?.name || ""} : null)}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Search inventory..." value={activeInventorySearch?.index === index ? activeInventorySearch.query : inventoryItems.find(i => i.id === f.value)?.name || ""} onChange={e => setActiveInventorySearch({index, query: e.target.value})} className="pl-10"/>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <ScrollArea className="max-h-60">
                                                {filteredInventoryItems.map(i => <Button key={i.id} variant="ghost" className="w-full justify-start" onClick={() => {f.onChange(i.id); setActiveInventorySearch(null);}}>{i.name}</Button>)}
                                                {activeInventorySearch?.query && (
                                                <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => { setNewItemName(activeInventorySearch.query); setQuickAddItemIndex(index); setIsQuickAddOpen(true); setActiveInventorySearch(null); }}>
                                                    <PlusCircle className="mr-2 h-4 w-4"/> Add new item: "{activeInventorySearch.query}"
                                                </Button>
                                                )}
                                            </ScrollArea>
                                        </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                              </div>
                              <div className="flex items-end gap-2">
                                 <Button type="button" variant="outline" size="icon" onClick={() => handleSplitLineItem(index)}><Split className="h-4 w-4" /></Button>
                                 <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), description: "", price: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Add Line Item</Button>
                </CardContent>
              </Card>
              
              <Card>
                  <CardHeader><CardTitle>Payment &amp; Totals</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="buyersPremium" render={({ field }) => ( <FormItem><FormLabel>Buyer's Premium ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="shippingCost" render={({ field }) => ( <FormItem><FormLabel>Shipping ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                          <FormField control={form.control} name="taxAmount" render={({ field }) => ( <FormItem><FormLabel>Taxes ($)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <div>
                              <Label>Subtotal</Label>
                              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>{subtotal.toFixed(2)}</div>
                          </div>
                      </div>
                       <div>
                          <Label>Total Amount</Label>
                          <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-lg font-semibold"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>{totalAmount.toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="paidBy" render={({ field }) => ( <FormItem><FormLabel>Paid By*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl><SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          {form.watch("paidBy") === "Other" && ( <FormField control={form.control} name="paidByOther" render={({ field }) => ( <FormItem><FormLabel>Specify Other Payment</FormLabel><FormControl><Input placeholder="e.g., Bank Transfer" {...field} /></FormControl><FormMessage /></FormItem> )}/> )}
                      </div>
                  </CardContent>
              </Card>

              <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional notes about this invoice." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              
              <div className="flex gap-2">
                <Button type="submit">Save Invoice</Button>
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              </div>
            </form>
          </Form>
        </div>
        
        {showPdfPreview && previewUrl && (
            <div className="w-full lg:w-1/2 h-[80vh] lg:h-auto">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>PDF Preview</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)]">
                  <iframe src={previewUrl} className="w-full h-full border-0 rounded-md" title="PDF preview"></iframe>
                </CardContent>
              </Card>
            </div>
          )}
      </div>

      <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDesc>Enter the name for the new supplier. Type can be changed later.</DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input id="newSupplierName" placeholder="Enter supplier name" value={newSupplierNameFromDialog} onChange={(e) => setNewSupplierNameFromDialog(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter'){e.preventDefault(); handleSaveNewSupplierFromDialog();}}}/>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewSupplierNameFromDialog("")}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNewSupplierFromDialog}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Inventory Item</DialogTitle>
            <DialogDesc>
              Create a new inventory item. You can add more details later.
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
              <Label htmlFor="newItemName">Item Name</Label>
              <Input id="newItemName" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleQuickAddItem} disabled={!newItemName.trim()}>Create and Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
