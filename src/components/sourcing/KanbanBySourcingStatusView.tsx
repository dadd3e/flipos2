
"use client";

import { useState } from "react";
import type { SourcedItemWish, SourcedItemStatus, Supplier } from "@/lib/types";
import { KanbanSourcingColumn } from "./KanbanSourcingColumn";
import { KanbanSourcingCard } from "./KanbanSourcingCard";
import { SOURCED_ITEM_STATUSES } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

interface KanbanBySourcingStatusViewProps {
  opportunities: SourcedItemWish[];
  allSuppliers: Supplier[];
  onEdit: (opportunityId: string) => void;
  onDelete: (opportunityId: string) => void;
  onUpdateStatus: (opportunityId: string, newStatus: SourcedItemStatus) => void;
  onConvertToInventory: (opportunity: SourcedItemWish) => void;
  className?: string;
}

export function KanbanBySourcingStatusView({ 
    opportunities, 
    allSuppliers,
    onEdit, 
    onDelete, 
    onUpdateStatus, 
    onConvertToInventory, 
    className 
}: KanbanBySourcingStatusViewProps) {
  const [activeDraggedOpportunity, setActiveDraggedOpportunity] = useState<SourcedItemWish | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const opportunity = active.data.current?.opportunityObject as SourcedItemWish | undefined;
    if (opportunity) {
      setActiveDraggedOpportunity(opportunity);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDraggedOpportunity(null);
    const { active, over } = event;

    if (over && active.id) {
      const opportunityId = active.id as string;
      const newStatus = over.id as SourcedItemStatus;
      const originalStatus = active.data.current?.status as SourcedItemStatus | undefined;

      if (originalStatus && newStatus !== originalStatus) {
        onUpdateStatus(opportunityId, newStatus);
      }
    }
  }

  if (opportunities.length === 0) {
    return (
      <div className={cn("text-center py-10 text-muted-foreground flex-grow flex items-center justify-center", className)}>
        <p>No sourcing opportunities to display in Kanban view.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className={cn("w-full h-full whitespace-nowrap", className)}>
        <div className="flex h-full gap-4 pb-4">
          {SOURCED_ITEM_STATUSES.map(statusConfig => (
            <KanbanSourcingColumn
              key={statusConfig.value}
              statusConfig={statusConfig}
              opportunities={opportunities.filter(op => op.status === statusConfig.value)}
              allSuppliers={allSuppliers}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateStatus={onUpdateStatus}
              onConvertToInventory={onConvertToInventory}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeDraggedOpportunity ? (
          <KanbanSourcingCard
            opportunity={activeDraggedOpportunity}
            allSuppliers={allSuppliers}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateStatus={onUpdateStatus}
            onConvertToInventory={onConvertToInventory}
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
