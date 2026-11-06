
"use client";

import type { SourcedItemWish, SourcedItemStatus, Supplier } from "@/lib/types";
import { KanbanSourcingCard } from "./KanbanSourcingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface KanbanSourcingColumnProps {
  statusConfig: { value: SourcedItemStatus; label: string; icon?: React.ElementType };
  opportunities: SourcedItemWish[];
  allSuppliers: Supplier[];
  onEdit: (opportunityId: string) => void;
  onDelete: (opportunityId: string) => void;
  onUpdateStatus: (opportunityId: string, newStatus: SourcedItemStatus) => void;
  onConvertToInventory: (opportunity: SourcedItemWish) => void;
}

export function KanbanSourcingColumn({ statusConfig, opportunities, allSuppliers, onEdit, onDelete, onUpdateStatus, onConvertToInventory }: KanbanSourcingColumnProps) {
  const IconComponent = statusConfig.icon;
  const { setNodeRef, isOver } = useDroppable({
    id: statusConfig.value,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-none w-72 md:w-80 lg:w-96 bg-muted/60 rounded-lg shadow-sm h-full flex flex-col transition-colors duration-150 ease-in-out",
        isOver ? "bg-primary/10 ring-2 ring-primary/50" : "bg-muted/60"
      )}
    >
      <div className="p-3 border-b sticky top-0 bg-muted/80 backdrop-blur-sm z-10 rounded-t-lg shrink-0">
        <h3 className="text-base font-semibold flex items-center">
          {IconComponent && <IconComponent className="mr-2 h-5 w-5" />}
          {statusConfig.label}
          <span className="ml-2 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full">{opportunities.length}</span>
        </h3>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-3 space-y-1">
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No opportunities in this stage.</p>
          ) : (
            opportunities.map(op => (
              <KanbanSourcingCard
                key={op.id}
                opportunity={op}
                allSuppliers={allSuppliers}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateStatus={onUpdateStatus}
                onConvertToInventory={onConvertToInventory}
              />
            ))
          )}
           {isOver && opportunities.length === 0 && (
            <div className="h-20 flex items-center justify-center text-sm text-primary/80">
              Drop here
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
