
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import type { GeneralExpense } from "@/lib/types";
import { RESELLER_GENERAL_EXPENSES_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
// Removed Card, CardContent, CardHeader, CardTitle, CardDescription imports
// Removed PlusCircle, Edit3 imports from lucide-react

function AddExpenseContent() {
  const [editingExpense, setEditingExpense] = useState<GeneralExpense | undefined>(undefined);
  const [isLoadingEditExpense, setIsLoadingEditExpense] = useState<boolean>(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const editId = searchParams ? searchParams.get('editId') : null;
    if (editId) {
      setIsLoadingEditExpense(true);
      const storedExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
      const allExpenses: GeneralExpense[] = storedExpenses ? JSON.parse(storedExpenses) : [];
      const expenseToEdit = allExpenses.find(exp => exp.id === editId);
      if (expenseToEdit) {
        setEditingExpense(expenseToEdit);
      } else {
        toast({ title: "Not Found", description: `Expense with ID "${editId}" not found. Opening a new form.`, variant: "destructive" });
        router.replace('/expenses/add'); // Clear invalid editId
        setEditingExpense(undefined);
      }
      setIsLoadingEditExpense(false);
    } else {
      setEditingExpense(undefined);
      setIsLoadingEditExpense(false);
    }
  }, [searchParams, router, toast]);

  const persistAndSetExpenses = (updatedExpenses: GeneralExpense[], successMessage: string, isUpdate: boolean) => {
    try {
      const sortedExpenses = updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(RESELLER_GENERAL_EXPENSES_KEY, JSON.stringify(sortedExpenses));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_GENERAL_EXPENSES_KEY, newValue: JSON.stringify(sortedExpenses), storageArea: localStorage }));
      toast({ title: isUpdate ? "Expense Updated" : "Expense Added", description: successMessage });
      router.push('/expenses'); // Navigate to the list view after saving
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        toast({
          title: "Storage Full",
          description: "Could not save expense data. Browser local storage is full.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error Saving Expense",
          description: `An unexpected error occurred: ${e.message}`,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleAddExpense = (expenseData: GeneralExpense) => {
    const storedExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
    const currentExpenses: GeneralExpense[] = storedExpenses ? JSON.parse(storedExpenses) : [];
    const newExpenseWithId = { ...expenseData, id: crypto.randomUUID() };
    const newExpenses = [...currentExpenses, newExpenseWithId];
    persistAndSetExpenses(newExpenses, `${newExpenseWithId.description} of $${newExpenseWithId.amount.toFixed(2)} logged.`, false);
  };

  const handleUpdateExpense = (updatedExpenseData: GeneralExpense) => {
    const storedExpenses = localStorage.getItem(RESELLER_GENERAL_EXPENSES_KEY);
    const currentExpenses: GeneralExpense[] = storedExpenses ? JSON.parse(storedExpenses) : [];
    const newExpenses = currentExpenses.map(exp => exp.id === updatedExpenseData.id ? updatedExpenseData : exp);
    persistAndSetExpenses(newExpenses, `${updatedExpenseData.description} has been updated.`, true);
  };

  const handleSubmit = (data: GeneralExpense) => {
    if (editingExpense) {
      // Ensure the ID from editingExpense is used, not one potentially from form data if it's a new form instance
      handleUpdateExpense({ ...data, id: editingExpense.id });
    } else {
      handleAddExpense(data); // ID will be generated in handleAddExpense
    }
  };

  if (isLoadingEditExpense && searchParams && searchParams.get('editId')) {
    return <div className="text-center py-10">Loading expense for editing...</div>;
  }

  return (
    <div className="space-y-8">
       <ExpenseForm onSubmit={handleSubmit} initialData={editingExpense} key={editingExpense?.id || 'new-expense-form'}/>
    </div>
  );
}

export default function AddExpensePage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <AddExpenseContent />
    </Suspense>
  );
}
