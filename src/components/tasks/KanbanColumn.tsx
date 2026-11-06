
"use client";

import type { Task, TaskStatus, TagDefinition } from "@/lib/types";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: { value: TaskStatus; label: string; icon?: React.ElementType };
  tasks: Task[];
  allTaskTagDefinitions: TagDefinition[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanColumn({ status, tasks, allTaskTagDefinitions, onEditTask, onDeleteTask, onUpdateTaskStatus }: KanbanColumnProps) {
  const IconComponent = status.icon;
  const { setNodeRef, isOver } = useDroppable({
    id: status.value, 
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-none w-72 md:w-80 rounded-xl h-full flex flex-col transition-colors duration-150 ease-in-out bg-muted/40", // Rounded-xl, lighter bg
        isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
      )}
    >
      <div className="p-4 flex justify-between items-center sticky top-0 bg-muted/40 backdrop-blur-sm z-10 rounded-t-xl shrink-0">
        <h3 className="text-base font-semibold flex items-center">
          {IconComponent && <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />}
          {status.label}
        </h3>
        <span className="text-sm font-medium text-muted-foreground bg-background/70 px-2 py-0.5 rounded-full h-6 min-w-[24px] flex items-center justify-center">
            {tasks.length}
        </span>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-4 pt-0 space-y-3"> {/* Adjusted padding */}
          {tasks.length === 0 ? (
            <div className={cn("min-h-[60px] flex items-center justify-center text-sm text-muted-foreground", isOver && "border-2 border-dashed border-primary/30 rounded-md")}>
              {isOver ? "Drop task here" : "No tasks."}
            </div>
          ) : (
            tasks.map(task => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                allTaskTagDefinitions={allTaskTagDefinitions}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onUpdateTaskStatus={onUpdateTaskStatus}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
