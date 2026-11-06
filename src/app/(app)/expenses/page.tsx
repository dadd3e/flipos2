

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import type { GeneralExpense, Supplier, GeneralExpenseCategory } from "@/lib/types";
import { RESELLER_GENERAL_EXPENSES_KEY, RESELLER_SUPPLIERS_KEY, GENERAL_EXPENSE_CATEGORIES, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Receipt, ListFilter, XCircle, CalendarDays, FilePlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { DateRange } from "react-day-picker";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ExpensesLogPage() {
  const [allExpenses, setAllExpenses] = useState<GeneralExpense[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const initialCategoryFilters = useMemo(() => GENERAL_EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = false;
    return acc;
  }, {} as Record<GeneralExpenseCategory, boolean>), []);
  const [selectedCategories, setSelectedCategories] = useState<Record<GeneralExpenseCategory, boolean>>(initialCategoryFilters);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, boolean>>({});
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    const storedExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
    if (storedExpenses) {
      try {
        const parsedExpenses = JSON.parse(storedExpenses);
        setAllExpenses(Array.isArray(parsedExpenses) ? parsedExpenses : []);
      } catch (e) {
        console.error("Error parsing general expenses from localStorage:", e);
        setAllExpenses([]);
      }
    } else {
      try { localStorage.setItem(RESELLER_GENERAL_EXPENSES_KEY, JSON.stringify([])); } catch (e: any) { /* ignore */ }
      setAllExpenses([]);
    }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        const parsedSuppliers = JSON.parse(storedSuppliers);
        setAllSuppliers(Array.isArray(parsedSuppliers) ? parsedSuppliers : DEFAULT_SUPPLIERS);
        const initialSupFilters = (Array.isArray(parsedSuppliers) ? parsedSuppliers : DEFAULT_SUPPLIERS)
            .filter(sup => sup.type === 'OperatingExpenses')
            .reduce((acc, sup) => { acc[sup.id] = false; return acc; }, {} as Record<string, boolean>);
        setSelectedSuppliers(initialSupFilters);

      } catch (e) {
        console.error("Error parsing suppliers from localStorage:", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
        setSelectedSuppliers({});
      }
    } else {
      try { localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS)); } catch (e:any) { /*ignore*/}
      setAllSuppliers(DEFAULT_SUPPLIERS);
      setSelectedSuppliers({});
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_GENERAL_EXPENSES_KEY) {
        const newStoredExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
        if (newStoredExpenses) {
          try {
            const parsedExpenses = JSON.parse(newStoredExpenses);
            setAllExpenses(Array.isArray(parsedExpenses) ? parsedExpenses : []);
          } catch (e) {
            console.error("Error parsing updated general expenses from localStorage:", e);
            setAllExpenses([]);
          }
        } else { setAllExpenses([]); }
      }
      if (event.key === RESELLER_SUPPLIERS_KEY) {
        const newStoredSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
         if (newStoredSuppliers) {
          try {
            const parsedSuppliers = JSON.parse(newStoredSuppliers);
            setAllSuppliers(Array.isArray(parsedSuppliers) ? parsedSuppliers : DEFAULT_SUPPLIERS);
             const updatedSupFilters = (Array.isArray(parsedSuppliers) ? parsedSuppliers : DEFAULT_SUPPLIERS)
                .filter(sup => sup.type === 'OperatingExpenses')
                .reduce((acc, sup) => { acc[sup.id] = selectedSuppliers[sup.id] || false; return acc; }, {} as Record<string, boolean>);
             setSelectedSuppliers(updatedSupFilters);
          } catch (e) {
            console.error("Error parsing updated suppliers:", e);
            setAllSuppliers(DEFAULT_SUPPLIERS);
            setSelectedSuppliers({});
          }
        } else {
          setAllSuppliers(DEFAULT_SUPPLIERS);
          setSelectedSuppliers({});
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const operatingExpenseSuppliers = useMemo(() => {
    return allSuppliers.filter(s => s.type === 'OperatingExpenses');
  }, [allSuppliers]);

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter(expense => {
      if (dateRange?.from && dateRange?.to) {
        try {
          const expenseDate = parseISO(expense.date);
          if (!isWithinInterval(expenseDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) {
            return false;
          }
        } catch (e) { return false; }
      } else if (dateRange?.from) {
         try {
          const expenseDate = parseISO(expense.date);
          if (expenseDate < startOfDay(dateRange.from)) return false;
        } catch (e) { return false; }
      }

      const activeCategoryFilters = Object.entries(selectedCategories).filter(([, checked]) => checked).map(([key]) => key);
      if (activeCategoryFilters.length > 0 && !activeCategoryFilters.includes(expense.category)) {
        return false;
      }

      const activeSupplierFilters = Object.entries(selectedSuppliers).filter(([, checked]) => checked).map(([key]) => key);
      if (activeSupplierFilters.length > 0) {
          if (!expense.supplierId || !activeSupplierFilters.includes(expense.supplierId)) {
              return false;
          }
      }
      return true;
    });
  }, [allExpenses, dateRange, selectedCategories, selectedSuppliers]);

  const persistExpenses = useCallback((updatedExpenses: GeneralExpense[]) => {
    try {
      localStorage.setItem(RESELLER_GENERAL_EXPENSES_KEY, JSON.stringify(updatedExpenses));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_GENERAL_EXPENSES_KEY, newValue: JSON.stringify(updatedExpenses), storageArea: localStorage }));
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not save expense data. Browser local storage is full. Please export and clear some data.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Expenses",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  }, [toast]);

  const handleEdit = useCallback((expense: GeneralExpense) => {
    router.push(`/expenses/add?editId=${expense.id}`);
  }, [router]);

  const handleDelete = useCallback((expenseId: string) => {
    setExpenseToDelete(expenseId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (expenseToDelete) {
      const expenseDetails = allExpenses.find(exp => exp.id === expenseToDelete)?.description || 'Expense';
      const updatedExpenses = allExpenses.filter((exp) => exp.id !== expenseToDelete);
      if (persistExpenses(updatedExpenses)) {
        toast({ title: "Expense Deleted", description: `Expense "${expenseDetails}" has been removed.`, variant: "destructive" });
        setExpenseToDelete(null);
      }
    }
  }, [expenseToDelete, allExpenses, persistExpenses, toast]);

  const handleExportExpenses = useCallback(() => {
    if (filteredExpenses.length === 0) {
      toast({ title: "No Data", description: "No expenses match current filters to export.", variant: "destructive" });
      return;
    }
    const header = "id,date,category,supplierId,description,amount,notes,receiptUrl\n";
    const csvRows = filteredExpenses.map(exp =>
      [
        exp.id,
        exp.date,
        exp.category,
        exp.supplierId || "",
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.amount,
        `"${(exp.notes || "").replace(/"/g, '""')}"`,
        exp.receiptUrl || ""
      ].join(",")
    );
    const csvString = header + csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "filtered_general_expenses.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Expenses Exported", description: "Your filtered general expenses have been downloaded as a CSV file." });
  }, [filteredExpenses, toast]);
  
  const handleCategoryFilterChange = useCallback((categoryValue: GeneralExpenseCategory, checked: boolean) => {
    setSelectedCategories(prev => ({ ...prev, [categoryValue]: checked }));
  }, []);

  const handleSupplierFilterChange = useCallback((supplierId: string, checked: boolean) => {
    setSelectedSuppliers(prev => ({ ...prev, [supplierId]: checked }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setDateRange(undefined);
    setSelectedCategories(initialCategoryFilters);
    const initialSupFilters = operatingExpenseSuppliers.reduce((acc, sup) => { acc[sup.id] = false; return acc; }, {} as Record<string, boolean>);
    setSelectedSuppliers(initialSupFilters);
    toast({ title: "Filters Cleared", description: "All expense log filters have been reset." });
  }, [toast, initialCategoryFilters, operatingExpenseSuppliers]);

  const isAnyFilterActive = useMemo(() => {
    return dateRange !== undefined ||
           Object.values(selectedCategories).some(v => v) ||
           Object.values(selectedSuppliers).some(v => v);
  }, [dateRange, selectedCategories, selectedSuppliers]);


  return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Receipt className="h-7 w-7" /> General Expense Log
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => router.push('/expenses/invoices')} variant="outline" className="w-full sm:w-auto">
                  <FilePlus className="mr-2 h-4 w-4" /> Add Invoice
              </Button>
              <Button onClick={() => router.push('/expenses/add')} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ListFilter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                  </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Filter Expenses</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-180px)] pr-3">
                    <div className="py-4 space-y-6">
                      <div>
                        <Label className="text-base font-medium">Date Range</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !dateRange && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                                dateRange.to ? (
                                  <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                ) : (
                                  format(dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={1}
                            />
                          </PopoverContent>
                        </Popover>
                        {dateRange && (
                          <Button variant="link" size="sm" className="px-0 mt-1" onClick={() => setDateRange(undefined)}>Clear Dates</Button>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-base font-medium">Category</Label>
                        <div className="space-y-2 mt-1 max-h-60 overflow-y-auto">
                          {GENERAL_EXPENSE_CATEGORIES.map(category => (
                            <div key={category.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-cat-${category.value}`}
                                checked={selectedCategories[category.value]}
                                onCheckedChange={(checked) => handleCategoryFilterChange(category.value, !!checked)}
                              />
                              <Label htmlFor={`filter-cat-${category.value}`} className="font-normal text-sm">{category.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-base font-medium">Supplier (Operating Expenses)</Label>
                        <div className="space-y-2 mt-1 max-h-60 overflow-y-auto">
                          {operatingExpenseSuppliers.length === 0 && <p className="text-xs text-muted-foreground">No 'Operating Expense' type suppliers found.</p>}
                          {operatingExpenseSuppliers.map(supplier => (
                            <div key={supplier.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-sup-${supplier.id}`}
                                checked={selectedSuppliers[supplier.id] || false}
                                onCheckedChange={(checked) => handleSupplierFilterChange(supplier.id, !!checked)}
                              />
                              <Label htmlFor={`filter-sup-${supplier.id}`} className="font-normal text-sm">{supplier.name}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <SheetFooter className="pt-4 border-t absolute bottom-0 left-0 right-0 bg-background p-6">
                    <Button type="button" variant="ghost" onClick={clearAllFilters} disabled={!isAnyFilterActive} className="mr-auto">
                      <XCircle className="mr-2 h-4 w-4" /> Clear All
                    </Button>
                    <Button type="button" onClick={() => setIsFilterSheetOpen(false)}>Apply</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <Button onClick={handleExportExpenses} variant="outline" className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export (CSV)
              </Button>
          </div>
        </div>
        <ExpensesTable expenses={filteredExpenses} onEdit={handleEdit} onDelete={handleDelete} />
        {allExpenses.length > 0 && filteredExpenses.length === 0 && isAnyFilterActive && (
            <p className="text-center text-muted-foreground py-4">No expenses match the current filters.</p>
        )}

        <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this expense record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Expense
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
