
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItem, ItemStatus, SoldViaPlatformValue, Supplier, SupplierType } from "@/lib/types";
import { 
    TAX_RATE, ITEM_SOURCES, ITEM_STATUSES, SOLD_VIA_PLATFORMS, 
    RESELLER_CATEGORIES_KEY, DEFAULT_CATEGORIES, ADD_NEW_SUPPLIER_VALUE, RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS
} from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, DollarSign, TrendingUp, ListChecks, Building, Store as StoreIcon, User, CalendarIcon, FileSignature, Search as SearchIcon } from "lucide-react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react"; 
import Image from "next/image";
import { cn, cleanQuotes } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";


const ADD_NEW_CATEGORY_VALUE = "__add_new_category__";

const inventoryItemSchema = z.object({
  name: z.string().min(2, { message: "Item name must be at least 2 characters." }),
  nameOnInvoice: z.string().optional(),
  purchaseDate: z.date().optional().nullable(), 
  category: z.string().optional(),
  status: z.enum(ITEM_STATUSES.map(s => s.value) as [ItemStatus, ...ItemStatus[]], { required_error: "Status is required."}),
  quantity: z.coerce.number().min(0, { message: "Quantity must be a non-negative number." }),
  price: z.coerce.number().min(0, { message: "Price must be a non-negative number." }),
  boxNumber: z.string().optional(),
  itemImageUrl: z.string().optional(),
  buyersPremiumPercent: z.coerce.number().min(0).optional(),
  shippingAndHandling: z.coerce.number().min(0).optional(),
  isTaxablePurchase: z.boolean().optional().default(false),
  totalPurchaseCost: z.coerce.number().min(0),
  source: z.string().optional(),
  invoiceNumber: z.string().optional(),
  storeName: z.string().optional(), 
  supplierId: z.string().optional().nullable(), 
  targetPrice: z.coerce.number().min(0).optional(),
  potentialProfit: z.coerce.number().optional(),
  additionalNotes: z.string().optional(),
  listedOn: z.array(z.custom<SoldViaPlatformValue>()).optional(),
  id: z.string().optional(), 
});


type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

interface InventoryFormProps {
  onSubmit: (data: InventoryItem, submitAction: 'saveAndClose' | 'saveAndAddNew') => void;
  initialData?: Partial<InventoryItem>;
}

const getSupplierTypeFromSource = (source?: string): SupplierType | null => {
  if (!source) return null;
  if (source === "HiBid" || source === "MaxSold") return "AuctionHouse";
  if (source === "Thrift Store" || source === "Antique Store" || source === "Flea Market") return "Store";
  if (source === "Private Sale") return "PrivateSeller";
  if (SUPPLIER_TYPES.some(st => st.value === source)) return source as SupplierType;
  return null; 
};

const getSupplierTypeLabel = (type?: SupplierType | null): string => {
    if (!type) return 'Supplier';
    return SUPPLIER_TYPES.find(st => st.value === type)?.label || type;
};

function parseDateInput(str: string): Date | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  // Strictly allow only MM-DD-YYYY format
  const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    return date;
  }
  return null;
}

export function InventoryForm({ onSubmit, initialData }: InventoryFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.itemImageUrl || null);
  const { toast } = useToast();
  
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryNameFromDialog, setNewCategoryNameFromDialog] = useState("");

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierNameFromDialog, setNewSupplierNameFromDialog] = useState("");
  const [currentSupplierTypeForDialog, setCurrentSupplierTypeForDialog] = useState<SupplierType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  
  const [supplierSearchQuery, setSupplierSearchQuery] = useState(initialData?.storeName || "");
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);
  const supplierContainerRef = useRef<HTMLDivElement>(null);

  const [dateText, setDateText] = useState(() => (initialData?.purchaseDate ? format(parseISO(initialData.purchaseDate), "MM-dd-yyyy") : ""));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (supplierContainerRef.current && !supplierContainerRef.current.contains(event.target as Node)) {
        setIsSupplierSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadDataFromLocalStorage = useCallback(() => {
    const storedCategories = localStorage.getItem(RESELLER_CATEGORIES_KEY);
    if (storedCategories) {
      try {
        const parsed = JSON.parse(storedCategories);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          setAvailableCategories(parsed.sort());
        } else { setAvailableCategories(DEFAULT_CATEGORIES); }
      } catch (e) { setAvailableCategories(DEFAULT_CATEGORIES); }
    } else { setAvailableCategories(DEFAULT_CATEGORIES); }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers);
        if (Array.isArray(parsed)) {
          setAllSuppliers(parsed);
        } else { setAllSuppliers(DEFAULT_SUPPLIERS); }
      } catch (e) { setAllSuppliers(DEFAULT_SUPPLIERS); }
    } else { setAllSuppliers(DEFAULT_SUPPLIERS); }
  }, []);
  
  useEffect(() => {
    loadDataFromLocalStorage();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_CATEGORIES_KEY) loadDataFromLocalStorage();
      if (event.key === RESELLER_SUPPLIERS_KEY) loadDataFromLocalStorage();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDataFromLocalStorage]);

  const defaultFormValues: InventoryFormValues = useMemo(() => {
    return {
      id: initialData?.id,
      name: cleanQuotes(initialData?.name) || "",
      nameOnInvoice: cleanQuotes(initialData?.nameOnInvoice) || "",
      purchaseDate: initialData?.purchaseDate ? parseISO(initialData.purchaseDate) : null,
      category: initialData?.category || "",
      status: initialData?.status || "Active",
      quantity: initialData?.quantity === undefined ? 1 : initialData.quantity,
      price: initialData?.price || 0,
      boxNumber: initialData?.boxNumber || "",
      itemImageUrl: initialData?.itemImageUrl || "",
      buyersPremiumPercent: initialData?.buyersPremiumPercent, 
      shippingAndHandling: initialData?.shippingAndHandling, 
      isTaxablePurchase: initialData?.isTaxablePurchase || false,
      totalPurchaseCost: initialData?.totalPurchaseCost || 0, 
      source: initialData?.source || "",
      invoiceNumber: initialData?.invoiceNumber || "",
      storeName: initialData?.storeName || "",
      supplierId: initialData?.supplierId || null,
      targetPrice: initialData?.targetPrice, 
      potentialProfit: initialData?.potentialProfit,
      additionalNotes: cleanQuotes(initialData?.additionalNotes) || "",
      listedOn: initialData?.listedOn || [],
    };
  }, [initialData]);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaultFormValues, 
  });

  const prevInitialDataIdRef = useRef<string | undefined>(initialData?.id);

  useEffect(() => {
    // In Add New Item mode, NEVER reset the form due to external storage or supplier state updates
    if (!initialData && !prevInitialDataIdRef.current) {
      return;
    }

    // Only synchronize when initialData actually changes (e.g. user selected a different item to edit or closed the edit sheet)
    if (initialData?.id !== prevInitialDataIdRef.current) {
      prevInitialDataIdRef.current = initialData?.id;

      if (initialData) {
        form.reset({
          id: initialData.id,
          name: cleanQuotes(initialData.name) || "",
          nameOnInvoice: cleanQuotes(initialData.nameOnInvoice) || "",
          purchaseDate: initialData.purchaseDate ? parseISO(initialData.purchaseDate) : null,
          category: initialData.category || "",
          status: initialData.status || "Active",
          quantity: initialData.quantity === undefined ? 1 : initialData.quantity,
          price: initialData.price || 0,
          boxNumber: initialData.boxNumber || "",
          itemImageUrl: initialData.itemImageUrl || "",
          buyersPremiumPercent: initialData.buyersPremiumPercent,
          shippingAndHandling: initialData.shippingAndHandling,
          isTaxablePurchase: initialData.isTaxablePurchase || false,
          totalPurchaseCost: initialData.totalPurchaseCost || 0,
          source: initialData.source || "",
          invoiceNumber: initialData.invoiceNumber || "",
          storeName: initialData.storeName || "",
          supplierId: initialData.supplierId || null,
          targetPrice: initialData.targetPrice,
          potentialProfit: initialData.potentialProfit,
          additionalNotes: cleanQuotes(initialData.additionalNotes) || "",
          listedOn: initialData.listedOn || [],
        });
        setImagePreview(initialData.itemImageUrl || null);
        if (initialData.supplierId && allSuppliers.length > 0) {
          const supplier = allSuppliers.find((s) => s.id === initialData.supplierId);
          setSupplierSearchQuery(supplier?.name || initialData.storeName || "");
        } else {
          setSupplierSearchQuery(initialData.storeName || "");
        }
      } else {
        form.reset(defaultFormValues);
        setImagePreview(null);
        setSupplierSearchQuery("");
        setDateText("");
      }
    }
  }, [initialData, form, defaultFormValues, allSuppliers]);

  const watchedSupplierId = form.watch("supplierId");
  useEffect(() => {
    if (watchedSupplierId && allSuppliers.length > 0) {
      const supplier = allSuppliers.find((s) => s.id === watchedSupplierId);
      if (supplier) {
        setSupplierSearchQuery((prev) => (prev !== supplier.name ? supplier.name : prev));
      }
    }
  }, [watchedSupplierId, allSuppliers]);

  const watchedPurchaseDate = form.watch("purchaseDate");
  useEffect(() => {
    if (watchedPurchaseDate && isValid(watchedPurchaseDate)) {
      const formatted = format(watchedPurchaseDate, "MM-dd-yyyy");
      setDateText((prev) => (parseDateInput(prev)?.getTime() === watchedPurchaseDate.getTime() ? prev : formatted));
    } else if (!watchedPurchaseDate) {
      setDateText((prev) => (prev ? "" : prev));
    }
  }, [watchedPurchaseDate]);

  const handleDateTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateText(val);
    const parsed = parseDateInput(val);
    if (parsed && isValid(parsed)) {
      form.setValue("purchaseDate", parsed, { shouldValidate: true, shouldDirty: true });
    } else if (!val.trim()) {
      form.setValue("purchaseDate", null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleDateTextBlur = () => {
    const parsed = parseDateInput(dateText);
    if (parsed && isValid(parsed)) {
      const formatted = format(parsed, "MM-dd-yyyy");
      setDateText(formatted);
      form.setValue("purchaseDate", parsed, { shouldValidate: true, shouldDirty: true });
    } else if (!dateText.trim()) {
      form.setValue("purchaseDate", null, { shouldValidate: true, shouldDirty: true });
    }
  };


  const watchedPrice = form.watch("price");
  const watchedBuyersPremiumPercent = form.watch("buyersPremiumPercent");
  const watchedShippingAndHandling = form.watch("shippingAndHandling");
  const watchedIsTaxablePurchase = form.watch("isTaxablePurchase");
  const watchedSource = form.watch("source");
  const watchedTargetPrice = form.watch("targetPrice");
  const watchedQuantity = form.watch("quantity");
  const watchedStatus = form.watch("status");
  const watchedItemName = form.watch("name");

  useEffect(() => {
    const priceVal = parseFloat(String(watchedPrice)) || 0;
    const buyersPremiumPercentVal = parseFloat(String(watchedBuyersPremiumPercent)) || 0;
    const shippingVal = parseFloat(String(watchedShippingAndHandling)) || 0;
    const taxable = !!watchedIsTaxablePurchase;

    const buyersPremiumAmount = parseFloat(((priceVal * buyersPremiumPercentVal) / 100).toFixed(2));
    const taxBase = priceVal + buyersPremiumAmount;
    const taxAmount = taxable ? parseFloat((taxBase * TAX_RATE).toFixed(2)) : 0;

    const total = priceVal + buyersPremiumAmount + shippingVal + taxAmount;
    form.setValue("totalPurchaseCost", parseFloat(total.toFixed(2)));
  }, [watchedPrice, watchedBuyersPremiumPercent, watchedShippingAndHandling, watchedIsTaxablePurchase, form]);

  useEffect(() => {
    const currentTotalPurchaseCost = parseFloat(String(form.getValues("totalPurchaseCost"))) || 0;
    const targetPriceVal = parseFloat(String(watchedTargetPrice)) || 0;
    const projectedRevenue = parseFloat((targetPriceVal * 0.85).toFixed(2)); 
    const profit = projectedRevenue - currentTotalPurchaseCost;
    form.setValue("potentialProfit", parseFloat(profit.toFixed(2)));
  }, [watchedTargetPrice, form]); // form.watch("totalPurchaseCost") removed from deps, form.getValues is used

  useEffect(() => {
    if (['Sold', 'Damaged', 'Donated', 'Kept'].includes(watchedStatus) && watchedQuantity !== 0) {
      form.setValue('quantity', 0);
    }
  }, [watchedStatus, watchedQuantity, form]);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue("itemImageUrl", result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      form.setValue("itemImageUrl", "");
    }
    if (fileInputRef.current) {
      fileInputRef.current.blur();
    }
  }, [form]);

  function handleFormSubmit(data: InventoryFormValues, submitAction: 'saveAndClose' | 'saveAndAddNew') {
    const trimmedStoreQuery = supplierSearchQuery.trim();
    let finalSupplierId = data.supplierId || undefined;
    let finalStoreName = trimmedStoreQuery || data.storeName || undefined;

    if (trimmedStoreQuery && relevantSupplierTypeForDisplay) {
      if (!finalSupplierId) {
        const existingSup = allSuppliers.find(
          (s) => s.type === relevantSupplierTypeForDisplay && s.name.toLowerCase() === trimmedStoreQuery.toLowerCase()
        );
        if (existingSup) {
          finalSupplierId = existingSup.id;
        } else {
          // Auto-create supplier so it's remembered in the CRM
          const newSup: Supplier = {
            id: crypto.randomUUID(),
            name: trimmedStoreQuery,
            type: relevantSupplierTypeForDisplay,
            contacts: [],
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          };
          const updatedSuppliers = [...allSuppliers, newSup];
          localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: RESELLER_SUPPLIERS_KEY,
              newValue: JSON.stringify(updatedSuppliers),
              storageArea: localStorage,
            })
          );
          setAllSuppliers(updatedSuppliers);
          finalSupplierId = newSup.id;
        }
      }
    }

    const fullItemData: InventoryItem = {
      id: initialData?.id || crypto.randomUUID(),
      dateAdded: initialData?.dateAdded || new Date().toISOString(),
      ...data,
      name: cleanQuotes(data.name),
      nameOnInvoice: data.nameOnInvoice ? cleanQuotes(data.nameOnInvoice) : undefined,
      purchaseDate: data.purchaseDate ? data.purchaseDate.toISOString() : undefined,
      category: data.category || undefined,
      status: data.status as ItemStatus, 
      buyersPremiumPercent: Number.isFinite(data.buyersPremiumPercent) ? data.buyersPremiumPercent : 0,
      shippingAndHandling: Number.isFinite(data.shippingAndHandling) ? data.shippingAndHandling : 0,
      itemImageUrl: imagePreview || data.itemImageUrl,
      invoiceNumber: data.invoiceNumber || undefined,
      storeName: finalStoreName,
      supplierId: finalSupplierId,
      targetPrice: Number.isFinite(data.targetPrice) ? data.targetPrice : 0,
      potentialProfit: Number.isFinite(data.potentialProfit) ? data.potentialProfit : 0,
      additionalNotes: data.additionalNotes ? cleanQuotes(data.additionalNotes) : undefined,
      listedOn: data.listedOn || [],
    };
    onSubmit(fullItemData, submitAction);

    if (submitAction === 'saveAndAddNew') {
      const blankDefaultFormValues: InventoryFormValues = {
        id: undefined, name: "", nameOnInvoice: "", purchaseDate: undefined, category: "", status: "Active" as ItemStatus,
        quantity: 1, price: 0, boxNumber: "", itemImageUrl: "", buyersPremiumPercent: undefined,
        shippingAndHandling: undefined, isTaxablePurchase: false, totalPurchaseCost: 0, source: "",
        invoiceNumber: "", storeName: "", supplierId: null, targetPrice: undefined, potentialProfit: undefined,
        additionalNotes: "", listedOn: [],
      };
      form.reset(blankDefaultFormValues); 
      setImagePreview(null);
      setSupplierSearchQuery("");
      setDateText("");
    }
  }

  const handleSaveNewCategoryFromDialog = useCallback(() => {
    const newName = newCategoryNameFromDialog.trim();
    if (!newName) {
      toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (availableCategories.some(cat => cat.toLowerCase() === newName.toLowerCase())) {
      toast({ title: "Error", description: `Category "${newName}" already exists.`, variant: "destructive" });
      return;
    }
    const updatedCategories = [...availableCategories, newName].sort();
    localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(updatedCategories));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_CATEGORIES_KEY, newValue: JSON.stringify(updatedCategories), storageArea: localStorage }));
    form.setValue('category', newName);
    setAvailableCategories(updatedCategories);
    setIsAddCategoryDialogOpen(false);
    setNewCategoryNameFromDialog("");
    toast({ title: "Category Added", description: `Category "${newName}" added.` });
  }, [newCategoryNameFromDialog, availableCategories, form, toast]);
  
  const handleSaveNewSupplierFromDialog = useCallback(() => {
    const newName = newSupplierNameFromDialog.trim();
    if (!currentSupplierTypeForDialog || !newName) {
      toast({ title: "Error", description: "Supplier name and type are required.", variant: "destructive" });
      return;
    }
    if (allSuppliers.some(sup => sup.name.toLowerCase() === newName.toLowerCase() && sup.type === currentSupplierTypeForDialog)) {
      toast({ title: "Error", description: `Supplier "${newName}" of type ${getSupplierTypeLabel(currentSupplierTypeForDialog)} already exists.`, variant: "destructive" });
      return;
    }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      name: newName,
      type: currentSupplierTypeForDialog,
      contacts: [],
      dateAdded: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    const updatedSuppliers = [...allSuppliers, newSupplier];
    localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(updatedSuppliers));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_SUPPLIERS_KEY, newValue: JSON.stringify(updatedSuppliers), storageArea: localStorage }));
    
    form.setValue('supplierId', newSupplier.id, { shouldDirty: true, shouldValidate: true });
    form.setValue('storeName', newSupplier.name, { shouldDirty: true });
    setSupplierSearchQuery(newSupplier.name);
    setAllSuppliers(updatedSuppliers); 
    
    setIsAddSupplierDialogOpen(false);
    setNewSupplierNameFromDialog("");
    toast({ title: "Supplier Added", description: `${getSupplierTypeLabel(currentSupplierTypeForDialog)} "${newName}" added and selected.` });
    setIsSupplierSearchOpen(false);
  }, [newSupplierNameFromDialog, currentSupplierTypeForDialog, allSuppliers, form, toast]);
  
  const formatNumericInputValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return "";
    }
    return String(value);
  };

  const relevantSupplierTypeForDisplay = useMemo(() => getSupplierTypeFromSource(watchedSource), [watchedSource]);

  const supplierFieldLabel = useMemo(() => {
    const type = getSupplierTypeFromSource(watchedSource);
    return getSupplierTypeLabel(type); 
  }, [watchedSource]);
  
  const filteredSuppliersForSearch = useMemo(() => {
    const typeToFilter = getSupplierTypeFromSource(watchedSource);
    if (!typeToFilter) return []; 
    
    const relevantSuppliers = allSuppliers.filter(s => s.type === typeToFilter);
    if (!supplierSearchQuery.trim()) return relevantSuppliers.slice(0, 5); 
    
    return relevantSuppliers.filter(s => 
      s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [supplierSearchQuery, allSuppliers, watchedSource]);

  const handleSelectSupplier = useCallback((supplier: Supplier) => {
    form.setValue("supplierId", supplier.id, { shouldDirty: true, shouldValidate: true });
    form.setValue("storeName", supplier.name, { shouldDirty: true });
    setSupplierSearchQuery(supplier.name);
    setIsSupplierSearchOpen(false);
  }, [form]);

  const handleOpenAddSupplierDialog = useCallback(() => {
    const derivedType = getSupplierTypeFromSource(watchedSource);
    if (!derivedType) {
      toast({ title: "Cannot Add Supplier", description: "Select a source type that maps to a supplier (e.g., HiBid, Thrift Store, Private Sale) before adding a new one.", variant: "destructive" });
      return;
    }
    setCurrentSupplierTypeForDialog(derivedType);
    setNewSupplierNameFromDialog(supplierSearchQuery);
    setIsAddSupplierDialogOpen(true);
    setIsSupplierSearchOpen(false);
  }, [watchedSource, supplierSearchQuery, toast]);

  const showInvoiceNumberField = ["HiBid", "MaxSold"].includes(watchedSource || "");


  return (
    <>
      <Card id="add">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <PlusCircle className="h-6 w-6" />
            {initialData?.id ? "Edit Inventory Item" : "Add New Inventory Item"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g., Vintage T-Shirt" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="nameOnInvoice" render={({ field }) => ( <FormItem><FormLabel>Name on Invoice (Optional)</FormLabel><FormControl><Input placeholder="e.g., Lot #123 - Ceramic Dish" {...field} /></FormControl><FormDescription>How the item appears on the purchase invoice, if different.</FormDescription><FormMessage /></FormItem> )}/>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel htmlFor="purchaseDateInput">Purchase Date</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            id="purchaseDateInput"
                            placeholder="MM-DD-YYYY"
                            value={dateText}
                            onChange={handleDateTextChange}
                            onBlur={handleDateTextBlur}
                            className="flex-1"
                          />
                        </FormControl>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label="Open purchase date calendar"
                              className={cn("shrink-0", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              fromYear={1970}
                              toYear={new Date().getFullYear() + 1}
                              selected={field.value ?? undefined}
                              onSelect={(date) => {
                                field.onChange(date || null);
                                if (date && isValid(date)) {
                                  setDateText(format(date, "MM-dd-yyyy"));
                                } else {
                                  setDateText("");
                                }
                                setIsCalendarOpen(false);
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => { if (value === ADD_NEW_CATEGORY_VALUE) { setIsAddCategoryDialogOpen(true); field.onChange(form.getValues('category')); } else { field.onChange(value); }}} value={field.value || ""} defaultValue={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={availableCategories.length === 0 ? "No categories - Add one" : "Select a category"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                        <SelectItem value={ADD_NEW_CATEGORY_VALUE} className="text-primary hover:text-primary-foreground">✨ Add New Category...</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem> )}/>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{ITEM_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="1" {...field} value={formatNumericInputValue(field.value)} disabled={['Sold', 'Damaged', 'Donated', 'Kept'].includes(form.getValues("status"))} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="boxNumber" render={({ field }) => ( <FormItem><FormLabel>Box #</FormLabel><FormControl><Input placeholder="A15" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value); 
                      const newRelevantSupplierType = getSupplierTypeFromSource(value);
                      const currentSupplierId = form.getValues("supplierId");

                      if (!newRelevantSupplierType) {
                        form.setValue("supplierId", null, { shouldDirty: true });
                      } else if (currentSupplierId) { 
                        const currentSupplier = allSuppliers.find(s => s.id === currentSupplierId);
                        if (currentSupplier && currentSupplier.type !== newRelevantSupplierType) {
                          form.setValue("supplierId", null, { shouldDirty: true });
                        }
                      }
                    }}
                    value={field.value || ""}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                    <SelectContent>{ITEM_SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem> )}/>

              {relevantSupplierTypeForDisplay && (
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="invSupplierSearchInput">{supplierFieldLabel}</FormLabel>
                      <div className="relative" ref={supplierContainerRef}>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <Input
                          id="invSupplierSearchInput"
                          ref={supplierSearchInputRef}
                          placeholder={`Enter ${supplierFieldLabel.toLowerCase()} name...`}
                          value={supplierSearchQuery}
                          onChange={(e) => {
                            const newQuery = e.target.value;
                            setSupplierSearchQuery(newQuery);
                            setIsSupplierSearchOpen(true);
                            const matched = allSuppliers.find(
                              (s) => s.type === relevantSupplierTypeForDisplay && s.name.toLowerCase() === newQuery.trim().toLowerCase()
                            );
                            if (matched) {
                              field.onChange(matched.id);
                            } else {
                              field.onChange(null);
                            }
                          }}
                          onFocus={() => setIsSupplierSearchOpen(true)}
                          className="pl-10"
                        />
                        {isSupplierSearchOpen && (filteredSuppliersForSearch.length > 0 || supplierSearchQuery.trim() !== "") && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                            <ScrollArea className="max-h-60 p-1">
                              {filteredSuppliersForSearch.length > 0 &&
                                filteredSuppliersForSearch.map((s) => (
                                  <Button
                                    key={s.id}
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start p-2 h-auto text-left text-sm"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectSupplier(s);
                                    }}
                                  >
                                    {s.name}
                                  </Button>
                                ))}
                              {supplierSearchQuery.trim() !== "" &&
                                !allSuppliers.some(
                                  (s) =>
                                    s.type === relevantSupplierTypeForDisplay &&
                                    s.name.toLowerCase() === supplierSearchQuery.trim().toLowerCase()
                                ) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start p-2 h-auto text-left text-sm text-primary hover:text-primary-foreground font-medium"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleOpenAddSupplierDialog();
                                    }}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4 shrink-0" />
                                    Add "{supplierSearchQuery.trim()}" as new {supplierFieldLabel}
                                  </Button>
                                )}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showInvoiceNumberField && (
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => ( <FormItem><FormLabel>Invoice #</FormLabel><FormControl><Input placeholder="Enter invoice number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              )}
              
              <FormItem>
                <FormLabel htmlFor="itemImageUploadInput">Item Image</FormLabel>
                <div className="flex items-center gap-4">
                  <FormControl><Input id="itemImageUploadInput" type="file" accept="image/*" onChange={handleImageChange} className="max-w-xs" ref={fileInputRef} /></FormControl>
                  {imagePreview && (<Image src={imagePreview} alt="Item preview" width={80} height={80} className="rounded-md object-cover aspect-square border" data-ai-hint="product photo"/>)}
                </div>
                <FormMessage>{form.formState.errors.itemImageUrl?.message}</FormMessage>
              </FormItem>

              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5" />Currently Listed On</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <FormField control={form.control} name="listedOn" render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        {SOLD_VIA_PLATFORMS.filter(p => p.value !== 'Cash Sale' && p.value !== 'Other').map((platform) => (
                          <FormField key={platform.value} control={form.control} name="listedOn" render={({ field }) => (
                            <FormItem key={platform.value} className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl><Checkbox checked={field.value?.includes(platform.value)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), platform.value]) : field.onChange( (field.value || []).filter( (value) => value !== platform.value ) ); }} /></FormControl>
                              <FormLabel className="font-normal">{platform.label}</FormLabel>
                            </FormItem> )} /> ))}
                      </div><FormMessage />
                    </FormItem> )}/>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 p-4 space-y-4">
                <CardHeader className="p-0 pb-2"><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5" />Cost Details</CardTitle></CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                value={formatNumericInputValue(field.value)}
                                onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={form.control} name="buyersPremiumPercent" render={({ field }) => ( <FormItem><FormLabel>Buyer's Premium (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 10" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="shippingAndHandling" render={({ field }) => ( <FormItem><FormLabel>Shipping &amp; Handling ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="isTaxablePurchase" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 mt-6 bg-background"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Taxable ({(TAX_RATE * 100).toFixed(0)}%)</FormLabel></div></FormItem> )}/>
                  </div>
                  <FormItem><FormLabel>Total Purchase Cost</FormLabel><div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-base font-semibold md:text-sm")}>{`$${(form.getValues("totalPurchaseCost") ?? 0).toFixed(2)}`}</div><FormMessage /></FormItem>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 p-4 space-y-4">
                  <CardHeader className="p-0 pb-2"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" />Sales Projections</CardTitle></CardHeader>
                  <CardContent className="p-0 space-y-4">
                      <FormField control={form.control} name="targetPrice" render={({ field }) => (
                          <FormItem>
                          <FormLabel>Target Price ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={formatNumericInputValue(field.value)} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}/></FormControl>
                          <FormMessage />
                          </FormItem> )}/>
                      <FormItem><FormLabel>Potential Profit</FormLabel><div className={cn("flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-base font-semibold md:text-sm", (form.getValues("potentialProfit") ?? 0) < 0 ? "text-destructive" : "text-green-600")}>{`$${(form.getValues("potentialProfit") ?? 0).toFixed(2)}`}</div><FormMessage /><FormDescription className="text-xs pt-1">Approx. Profit: (Target Price * 0.85) - Total Cost</FormDescription></FormItem>
                  </CardContent>
              </Card>

              <FormField control={form.control} name="additionalNotes" render={({ field }) => ( <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea placeholder="Condition, brand, rarity, etc." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={form.handleSubmit((data) => handleFormSubmit(data, 'saveAndClose'))} className="w-full sm:w-auto">{initialData?.id ? "Update Item" : "Add Item"}</Button>
                {!initialData?.id && (<Button type="button" onClick={form.handleSubmit((data) => handleFormSubmit(data, 'saveAndAddNew'))} variant="secondary" className="w-full sm:w-auto">Add &amp; Create Another</Button>)}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Category</DialogTitle><DialogDesc>Enter name for the new category.</DialogDesc></DialogHeader>
          <div className="space-y-4 py-2"><Input id="newCategoryName" placeholder="e.g., Vintage Glassware" value={newCategoryNameFromDialog} onChange={(e) => setNewCategoryNameFromDialog(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCategoryFromDialog();}}}/></div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewCategoryNameFromDialog("")}>Cancel</Button></DialogClose><Button type="button" onClick={handleSaveNewCategoryFromDialog}>Save Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New {getSupplierTypeLabel(currentSupplierTypeForDialog)}</DialogTitle>
            <DialogDesc>
              Enter the name for the new {getSupplierTypeLabel(currentSupplierTypeForDialog)?.toLowerCase()}. Full details can be added later.
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              id="newInvFormSupplierName" 
              placeholder="Enter name" 
              value={newSupplierNameFromDialog} 
              onChange={(e) => setNewSupplierNameFromDialog(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewSupplierFromDialog();}}}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => { setNewSupplierNameFromDialog(""); setCurrentSupplierTypeForDialog(null); }}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNewSupplierFromDialog}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
