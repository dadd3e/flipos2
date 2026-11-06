
"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { InventoryItem, ItemStatus } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { ITEM_STATUSES } from "@/lib/constants";

export interface AgedInventoryItem extends InventoryItem {
  ageInDaysCalculated: number | null; 
}

type SortableColumnKey = keyof Omit<AgedInventoryItem, 'ageInDaysCalculated'> | 'ageInDaysCalculated';


interface InventoryAgingTableProps {
  items: AgedInventoryItem[];
  onSort: (columnKey: SortableColumnKey) => void;
  currentSortKey: SortableColumnKey;
  currentSortDirection: 'asc' | 'desc';
}

export function InventoryAgingTable({ items, onSort, currentSortKey, currentSortDirection }: InventoryAgingTableProps) {
  
  const formatDateString = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      const parsedDate = parseISO(dateString);
      if (isValid(parsedDate)) {
        return format(parsedDate, 'MM/dd/yyyy');
      }
      return "Invalid Date";
    } catch (e) {
      try {
          const simplerDate = new Date(dateString);
          if (isValid(simplerDate)) {
              return format(simplerDate, 'MM/dd/yyyy');
          }
          return dateString.substring(0,10); 
      } catch (finalError){
          return dateString.substring(0,10); 
      }
    }
  };

  const getSortIndicator = (columnKey: SortableColumnKey) => {
    if (currentSortKey === columnKey) {
      return currentSortDirection === 'asc' ? '↑' : '↓';
    }
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50 group-hover:opacity-100" />;
  };
  
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


  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Img</TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => onSort('name')} className="px-1 group">
                Name {getSortIndicator('name')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => onSort('category')} className="px-1 group">
                Category {getSortIndicator('category')}
              </Button>
            </TableHead>
             <TableHead>
              <Button variant="ghost" onClick={() => onSort('status')} className="px-1 group">
                Status {getSortIndicator('status')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => onSort('quantity')} className="px-1 group">
                Qty {getSortIndicator('quantity')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => onSort('purchaseDate')} className="px-1 group">
                Purchased {getSortIndicator('purchaseDate')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => onSort('dateAdded')} className="px-1 group">
                Added {getSortIndicator('dateAdded')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => onSort('ageInDaysCalculated')} className="px-1 group">
                Age (Days) {getSortIndicator('ageInDaysCalculated')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => onSort('price')} className="px-1 group">
                Unit Cost {getSortIndicator('price')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => onSort('totalPurchaseCost')} className="px-1 group">
                Total Cost {getSortIndicator('totalPurchaseCost')}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.itemImageUrl ? (
                  <Image src={item.itemImageUrl} alt={item.name} width={36} height={36} className="rounded object-cover aspect-square" referrerPolicy="no-referrer" data-ai-hint="product photo"/>
                ) : (
                  <div className="w-9 h-9 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No Img</div>
                )}
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.category || "-"}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell>{formatDateString(item.purchaseDate)}</TableCell>
              <TableCell>{formatDateString(item.dateAdded)}</TableCell>
              <TableCell className="text-right font-semibold">
                {item.ageInDaysCalculated !== null ? item.ageInDaysCalculated : "N/A"}
              </TableCell>
              <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
              <TableCell className="text-right font-semibold">${item.totalPurchaseCost.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
