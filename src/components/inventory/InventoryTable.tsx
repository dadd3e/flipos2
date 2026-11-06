
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
import type { InventoryItem, Supplier, SoldViaPlatformValue as SoldViaPlatformType, ItemStatus } from "@/lib/types"; // Added ItemStatus
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, Eye, FileSignature } from "lucide-react"; // Added FileSignature
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from 'date-fns';
import { useState, useEffect } from "react";
import { RESELLER_SUPPLIERS_KEY, SOLD_VIA_PLATFORMS, ITEM_STATUSES } from "@/lib/constants"; // Added ITEM_STATUSES
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { cleanQuotes } from "@/lib/utils";

export type InventoryTableColumnKey =
  | 'image'
  | 'nameOnInvoice' // Added
  | 'category'
  | 'purchaseDate'
  | 'status'
  | 'source' 
  | 'listedOn'
  | 'boxNumber'
  | 'quantity'
  | 'unitPrice'
  | 'totalCost'
  | 'notes'
  | 'dateAdded';

export interface ColumnDefinition {
  id: InventoryTableColumnKey;
  label: string;
  defaultVisible: boolean;
  isToggleable: boolean;
}


interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
  selectedIds: string[]; 
  onSelectionChange: (itemId: string, isSelected: boolean) => void; 
  onSelectAllChange: (isSelected: boolean) => void; 
  isAllSelected: boolean; 
  visibleColumns: Record<InventoryTableColumnKey, boolean>; 
}

export function InventoryTable({ 
  items, 
  onEdit, 
  onDelete, 
  selectedIds, 
  onSelectionChange,
  onSelectAllChange,
  isAllSelected,
  visibleColumns 
}: InventoryTableProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) {
      try {
        setSuppliers(JSON.parse(storedSuppliers));
      } catch (e) {
        console.error("Failed to parse suppliers for inventory table", e);
        setSuppliers([]);
      }
    }
  }, []);

  const getStatusBadgeVariant = (statusValue?: ItemStatus) => {
    if (!statusValue) return "outline";
    const statusConfig = ITEM_STATUSES.find(s => s.value === statusValue);
    if (!statusConfig) return "outline";

    switch (statusConfig.value) {
      case 'Active': return 'default';
      case 'Pending': return 'secondary';
      case 'Sold': return 'destructive';
      case 'Damaged': return 'destructive';
      case 'Donated': return 'outline';
      case 'Kept': return 'outline';
      default: return 'outline';
    }
  };
  
  const getStatusLabel = (statusValue?: ItemStatus) => {
    if (!statusValue) return "N/A";
    return ITEM_STATUSES.find(s => s.value === statusValue)?.label || statusValue;
 };


  const formatDateString = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) ? format(parsedDate, 'MM/dd/yyyy') : dateString.substring(0,10);
    } catch (e) {
      return dateString.substring(0,10); 
    }
  };

  const getSourceDisplay = (item: InventoryItem): string => {
    if (item.supplierId) {
      const supplier = suppliers.find(s => s.id === item.supplierId);
      if (supplier) {
        return `${supplier.name} (${supplier.type.replace('House', ' H.')})`;
      }
      return `Unknown Supplier (ID: ${item.supplierId.slice(-4)})`;
    }
    if (item.storeName && (item.source === "Thrift Store" || item.source === "Antique Store" || item.source === "Flea Market")) {
      return `${item.storeName} (${item.source})`;
    }
    if (item.invoiceNumber && (item.source === "HiBid" || item.source === "MaxSold")) {
      return `${item.source} (Inv: ${item.invoiceNumber})`;
    }
    return item.source || "-";
  };
  
  const getPlatformLabel = (platformValue: SoldViaPlatformType): string => {
    const platform = SOLD_VIA_PLATFORMS.find(p => p.value === platformValue);
    return platform ? platform.label : platformValue;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Inventory Details</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No inventory items in this view.</p>
        ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-2">
                  <Checkbox
                    checked={isAllSelected && items.length > 0}
                    onCheckedChange={(checked) => onSelectAllChange(!!checked)}
                    aria-label="Select all items"
                    disabled={items.length === 0}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                {visibleColumns.image && <TableHead className="w-[60px]">Image</TableHead>}
                {visibleColumns.nameOnInvoice && <TableHead>Name on Invoice</TableHead>}
                {visibleColumns.category && <TableHead>Category</TableHead>}
                {visibleColumns.purchaseDate && <TableHead>Purchase Date</TableHead>}
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.source && <TableHead>Source/Supplier</TableHead>}
                {visibleColumns.listedOn && <TableHead>Listed On</TableHead>}
                {visibleColumns.boxNumber && <TableHead>Box #</TableHead>}
                {visibleColumns.quantity && <TableHead className="text-right">Qty</TableHead>}
                {visibleColumns.unitPrice && <TableHead className="text-right">Unit Price</TableHead>}
                {visibleColumns.totalCost && <TableHead className="text-right">Total Cost</TableHead>}
                {visibleColumns.notes && <TableHead>Notes</TableHead>}
                {visibleColumns.dateAdded && <TableHead>Date Added</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.filter(item => item && item.id && item.name).map((item) => ( 
                <TableRow 
                  key={item.id} 
                  data-state={selectedIds.includes(item.id) ? "selected" : ""}
                >
                  <TableCell className="px-2">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
                      aria-label={`Select item ${cleanQuotes(item.name)}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                     <Link href={`/inventory/view/${item.id}`} className="hover:underline">
                        {cleanQuotes(item.name)}
                     </Link>
                  </TableCell>
                  {visibleColumns.image && (
                    <TableCell>
                      {item.itemImageUrl ? (
                        <Image src={item.itemImageUrl} alt={cleanQuotes(item.name)} width={40} height={40} className="rounded object-cover aspect-square" referrerPolicy="no-referrer" data-ai-hint="product photo"/>
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No Img</div>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.nameOnInvoice && <TableCell className="text-xs max-w-[150px] truncate" title={cleanQuotes(item.nameOnInvoice)}>{cleanQuotes(item.nameOnInvoice) || "-"}</TableCell>}
                  {visibleColumns.category && <TableCell>{item.category || "-"}</TableCell>}
                  {visibleColumns.purchaseDate && <TableCell>{formatDateString(item.purchaseDate)}</TableCell>}
                  {visibleColumns.status && (
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.source && <TableCell className="text-xs">{getSourceDisplay(item)}</TableCell>}
                  {visibleColumns.listedOn && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.listedOn && item.listedOn.length > 0 ? (
                          item.listedOn.map(platform => (
                            <Badge key={platform} variant="outline" className="text-xs">{getPlatformLabel(platform)}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.boxNumber && <TableCell>{item.boxNumber || "-"}</TableCell>}
                  {visibleColumns.quantity && <TableCell className="text-right">{item.quantity}</TableCell>}
                  {visibleColumns.unitPrice && <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>}
                  {visibleColumns.totalCost && <TableCell className="text-right font-semibold">${item.totalPurchaseCost.toFixed(2)}</TableCell>}
                  {visibleColumns.notes && <TableCell className="text-xs max-w-[150px] truncate" title={item.additionalNotes}>{item.additionalNotes || "-"}</TableCell>}
                  {visibleColumns.dateAdded && <TableCell>{formatDateString(item.dateAdded)}</TableCell>}
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
                          <Link href={`/inventory/view/${item.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
