
"use client";

import type { Task, TagDefinition, TaskStatus } from "@/lib/types";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TagIcon } from "lucide-react";

interface TagKanbanColumnProps {
  tagDefinition: TagDefinition | null; // Null for "Untagged" column
  tasks: Task[];
  allTaskTagDefinitions: TagDefinition[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export function TagKanbanColumn({ 
  tagDefinition, 
  tasks, 
  allTaskTagDefinitions, 
  onEditTask, 
  onDeleteTask, 
  onUpdateTaskStatus 
}: TagKanbanColumnProps) {
  const columnName = tagDefinition ? tagDefinition.name : "Untagged";
  const columnColor = tagDefinition ? tagDefinition.color : "hsl(var(--muted))"; 
  const columnTextColor = tagDefinition ? tagDefinition.textColor : "hsl(var(--muted-foreground))";

  return (
    <div
      className={cn(
        "flex-none w-72 md:w-80 rounded-xl h-full flex flex-col transition-colors duration-150 ease-in-out bg-muted/40"
      )}
    >
      <div 
        className="p-4 flex justify-between items-center sticky top-0 backdrop-blur-sm z-10 rounded-t-xl shrink-0 border-b"
        style={{ borderBottomColor: tagDefinition ? columnColor : 'hsl(var(--border))' }}
      >
        <h3 className="text-base font-semibold flex items-center gap-2 truncate" title={columnName}>
          <TagIcon className="h-4 w-4 shrink-0" style={{ color: tagDefinition ? columnColor : 'hsl(var(--muted-foreground))' }} />
          <span className="truncate">{columnName}</span>
        </h3>
        <span 
          className="text-sm font-medium px-2 py-0.5 rounded-full h-6 min-w-[24px] flex items-center justify-center"
          style={{ backgroundColor: tagDefinition ? columnColor : 'hsl(var(--muted))', color: tagDefinition ? columnTextColor : 'hsl(var(--muted-foreground))' }}
        >
          {tasks.length}
        </span>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-4 pt-0 space-y-3">
          {tasks.length === 0 ? (
            <div className={cn("min-h-[60px] flex items-center justify-center text-sm text-muted-foreground")}>
              No tasks.
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
