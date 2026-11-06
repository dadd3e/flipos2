
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Receipt, Briefcase, PlusCircle, Search as SearchIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { GeneralExpense, GeneralExpenseCategory, Supplier, SupplierType } from "@/lib/types";
import { GENERAL_EXPENSE_CATEGORIES, RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc, 
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";


const expenseSchema = z.object({
  date: z.date({ required_error: "Expense date is required." }),
  category: z.custom<GeneralExpenseCategory>(val => GENERAL_EXPENSE_CATEGORIES.some(cat => cat.value === val), {
    message: "Invalid expense category selected",
  }),
  supplierId: z.string().optional().nullable(),
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0." }),
  notes: z.string().optional(),
  receiptUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSubmit: (data: GeneralExpense) => void;
  initialData?: GeneralExpense;
}

export function ExpenseForm({ onSubmit, initialData }: ExpenseFormProps) {
  const { toast } = useToast();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [newSupplierNameFromDialog, setNewSupplierNameFromDialog] = useState("");
  
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const supplierSearchInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: initialData?.date ? parseISO(initialData.date) : undefined,
      category: initialData?.category || GENERAL_EXPENSE_CATEGORIES[0].value,
      supplierId: initialData?.supplierId || null,
      description: initialData?.description || "",
      amount: initialData?.amount || undefined,
      notes: initialData?.notes || "",
      receiptUrl: initialData?.receiptUrl || "",
    },
  });
  
  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsed = JSON.parse(storedSuppliers);
        if (Array.isArray(parsed)) setAllSuppliers(parsed);
      } catch (e) { 
        console.error("Failed to parse suppliers for expense form", e);
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
      date: initialData?.date ? parseISO(initialData.date) : new Date(),
      category: initialData?.category || GENERAL_EXPENSE_CATEGORIES[0].value,
      supplierId: initialData?.supplierId || null,
      description: initialData?.description || "",
      amount: initialData?.amount || undefined,
      notes: initialData?.notes || "",
      receiptUrl: initialData?.receiptUrl || "",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset, allSuppliers]);


  function handleFormSubmit(data: ExpenseFormValues) {
    const fullExpenseData: GeneralExpense = {
      id: initialData?.id || crypto.randomUUID(),
      ...data,
      date: data.date.toISOString(),
      supplierId: data.supplierId || undefined,
    };
    onSubmit(fullExpenseData);
    if (!initialData?.id) {
      form.reset({
        date: new Date(), 
        category: GENERAL_EXPENSE_CATEGORIES[0].value,
        supplierId: null,
        description: "",
        amount: undefined,
        notes: "",
        receiptUrl: "",
      });
      setSupplierSearchQuery("");
    }
  }
  
  const handleSaveNewSupplierFromDialog = () => {
    const newName = newSupplierNameFromDialog.trim();
    if (!newName) {
      toast({ title: "Error", description: "Supplier name cannot be empty.", variant: "destructive" });
      return;
    }
    const operatingExpenseSupplierType: SupplierType = 'OperatingExpenses';
    if (allSuppliers.some(sup => sup.name.toLowerCase() === newName.toLowerCase() && sup.type === operatingExpenseSupplierType)) {
      toast({ title: "Error", description: `Supplier "${newName}" of type Operating Expenses already exists.`, variant: "destructive" });
      return;
    }
    const newSupplier: Supplier = {
      id: crypto.randomUUID(),
      name: newName,
      type: operatingExpenseSupplierType,
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
    toast({ title: "Supplier Added", description: `Operating Expense Supplier "${newName}" added and selected.` });
    setIsSupplierSearchOpen(false);
  };

  const operatingExpenseSuppliersForSearch = useMemo(() => {
    const opExSuppliers = allSuppliers.filter(s => s.type === 'OperatingExpenses');
    if (!supplierSearchQuery.trim()) return opExSuppliers.slice(0, 5);
    return opExSuppliers.filter(s => 
      s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [supplierSearchQuery, allSuppliers]);

  const handleSelectSupplier = (supplier: Supplier) => {
    form.setValue("supplierId", supplier.id);
    setSupplierSearchQuery(supplier.name);
    setIsSupplierSearchOpen(false);
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Receipt className="h-6 w-6" />
            {initialData ? "Edit Expense" : "Log New Expense"}
          </CardTitle>
          <CardDescription>
            {initialData ? "Update the details for this expense." : "Enter details for a new business expense."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expense Date</FormLabel>
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
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expense category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENERAL_EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="expenseSupplierSearchInput">Supplier (Optional - for Operating Expenses)</FormLabel>
                    <Popover open={isSupplierSearchOpen} onOpenChange={setIsSupplierSearchOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="expenseSupplierSearchInput"
                            ref={supplierSearchInputRef}
                            placeholder="Search operating expense suppliers or type to add new..."
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
                          {operatingExpenseSuppliersForSearch.length > 0 && 
                            operatingExpenseSuppliersForSearch.map(s => (
                              <Button key={s.id} variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => handleSelectSupplier(s)}>
                                {s.name}
                              </Button>
                            ))}
                          {operatingExpenseSuppliersForSearch.length === 0 && supplierSearchQuery.trim() !== "" && (
                            <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left text-primary hover:text-primary-foreground"
                              onClick={() => {
                                setNewSupplierNameFromDialog(supplierSearchQuery);
                                // Type is fixed for expenses
                                setIsAddSupplierDialogOpen(true);
                                setIsSupplierSearchOpen(false);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" /> Create new Operating Expense Supplier: "{supplierSearchQuery}"
                            </Button>
                          )}
                          {supplierSearchQuery.trim() === "" && (
                             <p className="p-2 text-xs text-muted-foreground text-center">Type to search operating expense suppliers.</p>
                          )}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="e.g., Shipping boxes, Printer ink" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://example.com/receipt.pdf" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Any additional details..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto">
                {initialData ? "Update Expense" : "Log Expense"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Operating Expense Supplier</DialogTitle>
            <DialogDesc>
              Enter the name for the new supplier. This supplier will be categorized under "Operating Expenses".
            </DialogDesc>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input 
              id="newOpExSupplierName" 
              placeholder="Enter supplier name" 
              value={newSupplierNameFromDialog} 
              onChange={(e) => setNewSupplierNameFromDialog(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveNewSupplierFromDialog();}}}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setNewSupplierNameFromDialog("")}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNewSupplierFromDialog}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

