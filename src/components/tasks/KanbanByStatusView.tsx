
"use client";

import { useState } from "react";
import type { Task, TaskStatus, TagDefinition } from "@/lib/types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { TASK_STATUSES } from "@/lib/constants";
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

interface KanbanByStatusViewProps {
  tasks: Task[];
  allTaskTagDefinitions: TagDefinition[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
}

export function KanbanByStatusView({ tasks, allTaskTagDefinitions, onEditTask, onDeleteTask, onUpdateTaskStatus, className }: KanbanByStatusViewProps) {
  const [activeDraggedTask, setActiveDraggedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, 
      },
    }),
    useSensor(KeyboardSensor)
  );

  const activeTaskStatuses = TASK_STATUSES.filter(status => status.value !== 'done');
  const activeTasks = tasks.filter(task => task.status !== 'done');

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = active.data.current?.taskObject as Task | undefined;
    if (task) {
      setActiveDraggedTask(task);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDraggedTask(null);
    const { active, over } = event;

    if (over && active.id) {
      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus; 
      const originalStatus = active.data.current?.status as TaskStatus | undefined;

      if (originalStatus && newStatus !== originalStatus) {
        onUpdateTaskStatus(taskId, newStatus);
      }
    }
  }

  if (activeTasks.length === 0 && activeTaskStatuses.length > 0) {
    return (
      <div className={cn("text-center py-10 text-muted-foreground flex-grow flex items-center justify-center", className)}>
        <div>
          <p>No active tasks to display in Kanban view.</p>
          <p>Tasks marked as 'Done' are archived and not shown here.</p>
        </div>
      </div>
    );
  }
  if (activeTaskStatuses.length === 0) {
    return <p className={cn("text-center py-10 text-muted-foreground", className)}>No active task statuses configured for Kanban view.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className={cn("w-full h-full whitespace-nowrap bg-background", className)}> {/* Changed background */}
        <div className="flex h-full gap-4 p-4"> {/* Adjusted gap and added padding */}
          {activeTaskStatuses.map(status => (
            <KanbanColumn
              key={status.value}
              status={status}
              tasks={activeTasks.filter(task => task.status === status.value)}
              allTaskTagDefinitions={allTaskTagDefinitions}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onUpdateTaskStatus={onUpdateTaskStatus}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeDraggedTask ? (
          <KanbanTaskCard
            task={activeDraggedTask}
            allTaskTagDefinitions={allTaskTagDefinitions}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
