
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { GeneralExpense, Supplier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, ExternalLink, FileText, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from "react";
import { RESELLER_SUPPLIERS_KEY } from "@/lib/constants";

interface ExpensesTableProps {
  expenses: GeneralExpense[];
  onEdit: (expense: GeneralExpense) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpensesTable({ expenses, onEdit, onDelete }: ExpensesTableProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        setSuppliers(JSON.parse(storedSuppliers));
      } catch (e) {
        console.error("Failed to parse suppliers for expenses table", e);
        setSuppliers([]);
      }
    }
  }, []);

  const formatDateString = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MM/dd/yyyy');
    } catch {
      return dateString; // Fallback for invalid dates
    }
  };

  const getSupplierName = (supplierId?: string): string => {
    if (!supplierId) return "-";
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : "Unknown";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <FileText className="h-6 w-6" /> Logged Expenses
        </CardTitle>
        <CardDescription>
          View and manage your recorded general business expenses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No expenses logged yet. Use the form above to add new expenses.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDateString(expense.date)}</TableCell>
                    <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-xs">
                      {expense.supplierId ? (
                        <div className="flex items-center gap-1">
                           <Briefcase className="h-3 w-3 text-muted-foreground" />
                           {getSupplierName(expense.supplierId)}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={expense.notes}>{expense.notes || "-"}</TableCell>
                    <TableCell>
                      {expense.receiptUrl ? (
                        <Button variant="link" size="sm" asChild className="h-auto p-0">
                          <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                            View Receipt <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(expense)}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(expense.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
