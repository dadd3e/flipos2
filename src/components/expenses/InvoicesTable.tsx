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
import type { Invoice, Supplier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import { useState, useEffect, useCallback } from "react";
import { RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS } from "@/lib/constants";
import { useRouter } from 'next/navigation';

interface InvoicesTableProps {
  invoices: Invoice[];
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

export function InvoicesTable({ invoices, onEdit, onDelete }: InvoicesTableProps) {
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const router = useRouter();

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        setAllSuppliers(JSON.parse(storedSuppliers));
      } catch (e) {
        console.error("Failed to parse suppliers for invoices table", e);
        setAllSuppliers(DEFAULT_SUPPLIERS);
      }
    }
  }, []);

  const getSupplierName = useCallback((supplierId: string) => {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    return supplier?.name || "Unknown Supplier";
  }, [allSuppliers]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Log</CardTitle>
        <CardDescription>A list of all your recorded invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No invoices have been logged yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right"># Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{format(parseISO(invoice.date), "PPP")}</TableCell>
                    <TableCell><Badge variant="outline">{invoice.invoiceNumber || 'N/A'}</Badge></TableCell>
                    <TableCell>{getSupplierName(invoice.supplierId)}</TableCell>
                    <TableCell className="text-right">{invoice.lineItems.length}</TableCell>
                    <TableCell className="text-right font-semibold">${invoice.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/expenses/invoices/view/${invoice.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(invoice.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
