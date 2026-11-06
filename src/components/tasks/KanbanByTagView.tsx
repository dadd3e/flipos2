
"use client";

import type { Task, TagDefinition } from "@/lib/types";
import { TagKanbanColumn } from "./TagKanbanColumn"; // New component for tag columns
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface KanbanByTagViewProps {
  tasks: Task[];
  allTaskTagDefinitions: TagDefinition[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: Task['status']) => void; // Keep for card actions
  className?: string;
}

export function KanbanByTagView({ 
  tasks, 
  allTaskTagDefinitions, 
  onEditTask, 
  onDeleteTask, 
  onUpdateTaskStatus, 
  className 
}: KanbanByTagViewProps) {

  const activeTasks = useMemo(() => tasks.filter(task => task.status !== 'done'), [tasks]);

  const { columns, untaggedTasks } = useMemo(() => {
    const tagMap: Record<string, Task[]> = {};
    const localUntaggedTasks: Task[] = [];

    allTaskTagDefinitions.forEach(tagDef => {
      tagMap[tagDef.name.toLowerCase()] = [];
    });

    activeTasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tagName => {
          const lowerTagName = tagName.toLowerCase();
          if (!tagMap[lowerTagName]) {
            // This case handles tags on tasks that might not have a global definition yet (e.g., imported data)
            // Or if a tag was removed globally but still exists on tasks.
            // For simplicity, we'll group them under their name, but they won't have a color from global defs.
            tagMap[lowerTagName] = []; 
          }
          tagMap[lowerTagName].push(task);
        });
      } else {
        localUntaggedTasks.push(task);
      }
    });
    
    const sortedColumns = allTaskTagDefinitions
        .filter(tagDef => tagMap[tagDef.name.toLowerCase()]?.length > 0 || activeTasks.some(t => t.tags?.includes(tagDef.name))) // Only show columns for tags that are in use by active tasks
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(tagDef => ({
            tagDefinition: tagDef,
            tasks: tagMap[tagDef.name.toLowerCase()] || [],
        }));


    return { columns: sortedColumns, untaggedTasks: localUntaggedTasks };
  }, [activeTasks, allTaskTagDefinitions]);


  if (activeTasks.length === 0 && columns.length === 0 && untaggedTasks.length === 0) {
    return (
      <div className={cn("text-center py-10 text-muted-foreground flex-grow flex items-center justify-center", className)}>
        <div>
          <p>No active tasks with tags to display in Kanban view.</p>
          <p>Tasks marked as 'Done' are archived and not shown here.</p>
        </div>
      </div>
    );
  }

  return (
    // DndContext is removed as drag-and-drop for tags is not implemented in this step
    <ScrollArea className={cn("w-full h-full whitespace-nowrap bg-background", className)}>
      <div className="flex h-full gap-4 p-4">
        {columns.map(({ tagDefinition, tasks: columnTasks }) => (
          <TagKanbanColumn
            key={tagDefinition.name}
            tagDefinition={tagDefinition}
            tasks={columnTasks}
            allTaskTagDefinitions={allTaskTagDefinitions}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />
        ))}
        {untaggedTasks.length > 0 && (
          <TagKanbanColumn
            tagDefinition={null} // For "Untagged" column
            tasks={untaggedTasks}
            allTaskTagDefinitions={allTaskTagDefinitions}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />
        )}
        {(columns.length === 0 && untaggedTasks.length === 0 && activeTasks.length > 0) && (
            <div className="text-center py-10 text-muted-foreground flex-grow flex items-center justify-center">
                <p>No tasks with tags found for Kanban view. Untagged tasks are shown if they exist.</p>
            </div>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
