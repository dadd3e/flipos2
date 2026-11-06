
"use client";

import type { SourcedItemWish, SourcedItemStatus, Supplier } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, CalendarDays, PackagePlus, Users, GripVertical, DollarSign, Eye } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { SOURCED_ITEM_STATUSES, SUPPLIER_TYPES } from "@/lib/constants";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Link from 'next/link';

interface KanbanSourcingCardProps {
  opportunity: SourcedItemWish;
  allSuppliers: Supplier[];
  onEdit: (opportunityId: string) => void;
  onDelete: (opportunityId: string) => void;
  onUpdateStatus: (opportunityId: string, newStatus: SourcedItemStatus) => void;
  onConvertToInventory: (opportunity: SourcedItemWish) => void;
  isOverlay?: boolean;
}

export function KanbanSourcingCard({ opportunity, allSuppliers, onEdit, onDelete, onUpdateStatus, onConvertToInventory, isOverlay = false }: KanbanSourcingCardProps) {
  const getStatusDetails = (statusValue: SourcedItemStatus) => {
    return SOURCED_ITEM_STATUSES.find(s => s.value === statusValue) || { label: statusValue, icon: GripVertical };
  };
  const statusDetails = getStatusDetails(opportunity.status);

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return null;
    const supplier = allSuppliers.find(s => s.id === supplierId);
    return supplier ? `${supplier.name} (${SUPPLIER_TYPES.find(st => st.value === supplier.type)?.label || supplier.type})` : "Unknown Supplier";
  };

  const availableStatuses = SOURCED_ITEM_STATUSES.filter(s => s.value !== opportunity.status);

  const { attributes, listeners, setNodeRef, transform, isDragging, active } = useDraggable({
    id: opportunity.id,
    data: {
      status: opportunity.status,
      opportunityObject: opportunity,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };
  
  const isBeingActivelyDragged = active?.id === opportunity.id;

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-3", isOverlay && "shadow-2xl")}>
      <Card className={cn("shadow-md hover:shadow-lg transition-shadow bg-card w-full", isOverlay && "ring-2 ring-primary")}>
        <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
          <button {...listeners} {...attributes} className="cursor-grab p-1 text-muted-foreground hover:text-foreground mt-0.5" aria-label="Drag opportunity">
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex-grow">
            <Link href={`/sourcing/view/${opportunity.id}`} className="hover:underline">
                <CardTitle className="text-base font-semibold">{opportunity.itemName}</CardTitle>
            </Link>
          </div>
          <div className="flex items-center shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={isBeingActivelyDragged || isOverlay}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Opportunity Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/sourcing/view/${opportunity.id}`} className="flex items-center">
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(opportunity.id)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                {opportunity.status === 'Completed' && (
                  <DropdownMenuItem onClick={() => onConvertToInventory(opportunity)}>
                    <PackagePlus className="mr-2 h-4 w-4" /> Convert to Inventory
                  </DropdownMenuItem>
                )}
                {availableStatuses.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {availableStatuses.map(status => (
                      <DropdownMenuItem key={status.value} onClick={() => onUpdateStatus(opportunity.id, status.value)}>
                        Mark as {status.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(opportunity.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-sm text-muted-foreground space-y-1.5">
          {opportunity.targetDate && (
            <div className="flex items-center text-xs">
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Target: {format(parseISO(opportunity.targetDate), "MMM d, yyyy")}
            </div>
          )}
          {opportunity.supplierId && getSupplierName(opportunity.supplierId) && (
             <div className="flex items-center text-xs">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {getSupplierName(opportunity.supplierId)}
             </div>
          )}
          {opportunity.targetBuyPrice !== undefined && (
            <div className="flex items-center text-xs">
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              Target Buy: ${opportunity.targetBuyPrice.toFixed(2)}
            </div>
          )}
          {opportunity.potentialSources && (
            <p className="text-xs line-clamp-2" title={opportunity.potentialSources}>Sources: {opportunity.potentialSources}</p>
          )}
        </CardContent>
        {opportunity.notes && (
          <CardFooter className="p-3 pt-1 border-t">
            <p className="text-xs text-muted-foreground line-clamp-3" title={opportunity.notes}>Notes: {opportunity.notes}</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
