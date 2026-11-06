
"use client";

import type { Task, TaskStatus, TagDefinition } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Edit3, Trash2, CalendarDays, Layers, ShoppingBag, ListChecks, GripVertical, TagIcon, AlertTriangle } from "lucide-react";
import { format, parseISO, isPast } from 'date-fns';
import { TASK_PRIORITIES, TASK_STATUSES, SOLD_VIA_PLATFORMS, TAG_COLOR_PALETTE } from "@/lib/constants";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface KanbanTaskCardProps {
  task: Task;
  allTaskTagDefinitions: TagDefinition[];
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  isOverlay?: boolean; 
}

export function KanbanTaskCard({ task, allTaskTagDefinitions, onEditTask, onDeleteTask, onUpdateTaskStatus, isOverlay = false }: KanbanTaskCardProps) {
  const priorityInfo = TASK_PRIORITIES.find(p => p.value === task.priority);
  const getPlatformLabel = (platformValue?: string) => platformValue ? (SOLD_VIA_PLATFORMS.find(p => p.value === platformValue)?.label || platformValue) : "";

  const availableStatuses = TASK_STATUSES.filter(s => s.value !== task.status && s.value !== 'done');

  const { attributes, listeners, setNodeRef, transform, isDragging, active } = useDraggable({
    id: task.id,
    data: {
      status: task.status,
      taskObject: task, 
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto', 
  };
  
  const isBeingActivelyDragged = active?.id === task.id;
  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate);

  const getTagDefinition = (tagName: string): TagDefinition | undefined => {
    return allTaskTagDefinitions.find(def => def.name.toLowerCase() === tagName.toLowerCase());
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isOverlay && "shadow-2xl")}>
      <Card className={cn("shadow-sm hover:shadow-md transition-shadow bg-card rounded-lg p-3 w-full", isOverlay && "ring-2 ring-primary")}>
        <CardHeader className="p-0 flex flex-row items-start gap-1 mb-2">
          <button {...listeners} {...attributes} className="cursor-grab p-1 text-muted-foreground hover:text-foreground -ml-1 mt-0.5" aria-label="Drag task">
            <GripVertical className="h-4 w-4" />
          </button>
          <CardTitle className="text-sm font-medium flex-grow pt-0.5 flex items-center justify-between w-full">
            <span className="truncate" title={task.title}>{task.title}</span>
            {priorityInfo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="ml-2 h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: priorityInfo.color }}
                      aria-label={`${priorityInfo.label} Priority`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{priorityInfo.label} Priority</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          <div className="flex items-center shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={isBeingActivelyDragged || isOverlay}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Task Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditTask(task.id)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Task
                </DropdownMenuItem>
                {availableStatuses.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {availableStatuses.map(status => (
                      <DropdownMenuItem key={status.value} onClick={() => onUpdateTaskStatus(task.id, status.value)}>
                        Mark as {status.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onUpdateTaskStatus(task.id, 'done')} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                  <ListChecks className="mr-2 h-4 w-4" /> Mark as Done & Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1 text-xs space-y-1.5">
          {task.description && <p className="text-muted-foreground line-clamp-2">{task.description}</p>}
          
          {(task.tags && task.tags.length > 0 && allTaskTagDefinitions.length > 0) && (
            <div className="flex flex-wrap gap-1 pt-0.5">
                {task.tags.map(tagName => {
                    const tagDef = getTagDefinition(tagName);
                    const defaultColor = TAG_COLOR_PALETTE.find(p => p.name === "Gray") || { background: "#d1d5db", text: "#1f2937"};
                    const bgColor = tagDef ? tagDef.color : defaultColor.background;
                    const textColor = tagDef ? tagDef.textColor : defaultColor.text;
                    return (
                        <Badge 
                            key={tagName} 
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.5 font-normal rounded"
                            style={{ backgroundColor: bgColor, color: textColor, borderColor: bgColor }}
                        >
                            {tagName}
                        </Badge>
                    );
                })}
            </div>
          )}
          
          <div className="flex items-center gap-x-2 gap-y-1 text-muted-foreground flex-wrap pt-1">
            {dueDate && (
              <div className={cn("flex items-center text-[11px]", isOverdue && "text-destructive font-medium")}>
                <CalendarDays className="mr-1 h-3 w-3" />
                {format(dueDate, "MMM d")}
                {isOverdue && <AlertTriangle className="ml-0.5 h-3 w-3" />}
              </div>
            )}
          </div>
        </CardContent>
        {(task.inventoryItemName || task.soldViaPlatform || task.saleIdentifier) && (
          <CardFooter className="p-0 pt-1.5 mt-1.5 border-t text-[11px] text-muted-foreground space-y-0.5 flex-col items-start">
            {task.inventoryItemName && (
              <div className="flex items-center">
                <Layers className="mr-1 h-3 w-3" /> Linked Item: <span className="font-medium ml-1 truncate">{task.inventoryItemName}</span>
              </div>
            )}
            {task.soldViaPlatform && (
              <div className="flex items-center">
                <ShoppingBag className="mr-1 h-3 w-3" /> Platform: <span className="font-medium ml-1">{getPlatformLabel(task.soldViaPlatform)}</span>
              </div>
            )}
            {task.saleIdentifier && (
              <div className="flex items-center">
                <ListChecks className="mr-1 h-3 w-3" /> Linked Sale: <span className="font-medium ml-1 truncate">{task.saleIdentifier}</span>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
