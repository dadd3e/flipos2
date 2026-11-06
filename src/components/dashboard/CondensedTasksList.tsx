
"use client";

import Link from 'next/link';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListChecks, ExternalLink, CalendarDays } from 'lucide-react'; // Removed AlertTriangle
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { TASK_PRIORITIES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CondensedTasksListProps {
  tasks: Task[];
  maxTasksToShow?: number;
  onTaskComplete: (taskId: string) => void;
}

const priorityOrder: Record<Task['priority'], number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export function CondensedTasksList({ tasks, maxTasksToShow = 5, onTaskComplete }: CondensedTasksListProps) {
  const sortedTasks = tasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.dueDate && b.dueDate) {
        return differenceInDays(parseISO(a.dueDate), parseISO(b.dueDate));
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return differenceInDays(parseISO(b.createdAt), parseISO(a.createdAt));
    });

  const tasksToShow = sortedTasks.slice(0, maxTasksToShow);

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priorityValue: string) => TASK_PRIORITIES.find(p => p.value === priorityValue)?.label || priorityValue;
  
  const getDueDateInfo = (dueDate?: string): { text: string; isPastDue: boolean; isUrgent: boolean } => {
    if (!dueDate) return { text: '', isPastDue: false, isUrgent: false };
    const date = parseISO(dueDate);
    const today = new Date();
    const pastDue = isPast(date) && !isSameDay(date, today);
    const urgent = differenceInDays(date, today) <= 3 && !pastDue;

    return {
      text: format(date, "MMM d"),
      isPastDue: pastDue,
      isUrgent: urgent,
    };
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };


  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="flex-grow">
            <CardTitle className="font-headline flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Active Tasks
            </CardTitle>
            <CardDescription>
            Your most relevant active tasks. Completed tasks are archived.
            </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
          <Link href="/tasks">
            View All Tasks <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasksToShow.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active tasks. Well done! 🎉
          </p>
        ) : (
          <ScrollArea className="max-h-[300px] pr-3">
            <div className="space-y-3">
              {tasksToShow.map(task => {
                const dueDateInfo = getDueDateInfo(task.dueDate);
                return (
                  <div key={task.id} className="p-3 border rounded-md bg-background/70 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id={`task-condensed-${task.id}`}
                            aria-label={`Mark task ${task.title} as done`}
                            className="mt-1"
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    onTaskComplete(task.id);
                                }
                            }}
                        />
                        <div className="flex-grow">
                            <Label htmlFor={`task-condensed-${task.id}`} className="font-medium text-sm cursor-pointer hover:underline">
                                <Link href={`/tasks/add?editId=${task.id}`}>
                                    {task.title}
                                </Link>
                            </Label>
                            <div className="mt-1 flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap">
                                <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs capitalize">
                                {getPriorityLabel(task.priority)}
                                </Badge>
                                {task.dueDate && (
                                <div className={`flex items-center ${dueDateInfo.isPastDue ? 'text-destructive font-semibold' : dueDateInfo.isUrgent ? 'text-orange-500 font-semibold' : ''}`}>
                                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                    Due: {dueDateInfo.text}
                                    {dueDateInfo.isPastDue && " (Overdue)"}
                                </div>
                                )}
                                {task.inventoryItemName && (
                                    <span className="truncate" title={`Item: ${task.inventoryItemName}`}>Item: {task.inventoryItemName}</span>
                                )}
                                {task.saleIdentifier && (
                                    <span className="truncate" title={`Sale: ${task.saleIdentifier}`}>Sale: {task.saleIdentifier}</span>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {sortedTasks.length > maxTasksToShow && (
        <CardFooter className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
                Showing {maxTasksToShow} of {sortedTasks.length} active tasks.
            </p>
        </CardFooter>
      )}
    </Card>
  );
}

    

    
