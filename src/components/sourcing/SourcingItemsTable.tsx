
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
import type { SourcedItemWish, SourcedItemStatus, Supplier } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, PackagePlus, Lightbulb, Users, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns';
import { SOURCED_ITEM_STATUSES, RESELLER_SUPPLIERS_KEY } from "@/lib/constants";
import { useEffect, useState } from "react";
import Link from 'next/link';

interface SourcingItemsTableProps {
  items: SourcedItemWish[];
  onEdit: (itemId: string) => void; // Changed to itemId
  onDelete: (itemId: string) => void;
  onConvertToInventory: (item: SourcedItemWish) => void;
}

export function SourcingItemsTable({ items, onEdit, onDelete, onConvertToInventory }: SourcingItemsTableProps) {
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        setAllSuppliers(JSON.parse(storedSuppliers));
      } catch (e) {
        console.error("Failed to parse suppliers for sourcing table", e);
        setAllSuppliers([]);
      }
    }
  }, []);
  
  const formatDateString = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed) ? format(parsed, 'MM/dd/yyyy') : "-";
    } catch {
      return "-"; 
    }
  };

  const getStatusLabelAndIcon = (statusValue: SourcedItemStatus) => {
    const statusConfig = SOURCED_ITEM_STATUSES.find(s => s.value === statusValue);
    return {
      label: statusConfig?.label || statusValue,
      icon: statusConfig?.icon,
    };
  };

  const getStatusBadgeVariant = (status: SourcedItemStatus) => {
    switch (status) {
      case 'Opportunity': return 'secondary';
      case 'InProgress': return 'default';
      case 'OnHold': return 'outline';
      case 'Negotiating': return 'default'; 
      case 'Completed': return 'outline'; 
      default: return 'outline';
    }
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return "-";
    const supplier = allSuppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : "Unknown";
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
           <Lightbulb className="h-6 w-6" /> Sourcing Opportunities
        </CardTitle>
        <CardDescription>
          Manage your sourcing opportunities. Track items you are looking for and their status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Your opportunity list is empty. Add items using the form above.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Linked Supplier</TableHead>
                  <TableHead className="text-right">Target Buy Price</TableHead>
                  <TableHead>Potential Sources</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const { label: statusLabel, icon: StatusIcon } = getStatusLabelAndIcon(item.status);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link href={`/sourcing/view/${item.id}`} className="hover:underline">
                          {item.itemName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)} className="whitespace-nowrap">
                          {StatusIcon && <StatusIcon className="mr-1.5 h-3.5 w-3.5" />}
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateString(item.targetDate)}</TableCell>
                      <TableCell className="text-xs">
                        {item.supplierId ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" /> {getSupplierName(item.supplierId)}
                          </div>
                        ): "-"}
                      </TableCell>
                      <TableCell className="text-right">{item.targetBuyPrice !== undefined ? `$${item.targetBuyPrice.toFixed(2)}` : "-"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={item.potentialSources}>{item.potentialSources || "-"}</TableCell>
                      <TableCell>{formatDateString(item.dateAdded)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/sourcing/view/${item.id}`} className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(item.id)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {item.status === 'Completed' && (
                              <DropdownMenuItem onClick={() => onConvertToInventory(item)}>
                                <PackagePlus className="mr-2 h-4 w-4" /> Convert to Inventory
                              </DropdownMenuItem>
                            )}
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
