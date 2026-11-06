
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; 
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit3, Trash2, CheckSquare, Activity, LayoutGrid, ArchiveRestore, Eye, EyeOff, TagIcon } from "lucide-react"; 
import type { Task, TaskStatus, TaskPriority, InventoryItem, Sale, Supplier, TagDefinition } from "@/lib/types"; 
import { 
    RESELLER_TASKS_KEY, 
    RESELLER_ARCHIVED_TASKS_KEY, 
    RESELLER_INVENTORY_KEY, 
    RESELLER_SALES_KEY, 
    RESELLER_SUPPLIERS_KEY, 
    DEFAULT_SUPPLIERS, 
    RESELLER_TASK_TAGS_KEY, 
    DEFAULT_TASK_TAGS,
    TAG_COLOR_PALETTE,
    TASK_STATUSES, 
    TASK_PRIORITIES,
    SOLD_VIA_PLATFORMS
} from "@/lib/constants"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog"; 
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, isPast } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { KanbanByStatusView } from '@/components/tasks/KanbanByStatusView';
import { TaskForm } from '@/components/tasks/TaskForm'; 
import { cn } from '@/lib/utils';
import type { TaskFormValues } from '@/components/tasks/TaskForm';
import { MoreHorizontal, CalendarDays, Layers, ShoppingCart, ListChecks, AlertTriangle } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type ViewMode = "checklist" | "kanbanStatus" | "groupedByTag";

export default function TasksPage() {
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [archivedTasksState, setArchivedTasksState] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('checklist');
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [allTaskTagDefinitions, setAllTaskTagDefinitions] = useState<TagDefinition[]>(DEFAULT_TASK_TAGS); 


  useEffect(() => {
    const storedActiveTasks = localStorage.getItem(RESELLER_TASKS_KEY);
    if (storedActiveTasks) {
      try {
        const parsedTasks: Task[] = JSON.parse(storedActiveTasks);
        setActiveTasks(Array.isArray(parsedTasks) ? parsedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []);
      } catch (e) { console.error("Error parsing active tasks", e); setActiveTasks([]); }
    } else { setActiveTasks([]); localStorage.setItem(RESELLER_TASKS_KEY, JSON.stringify([]));}

    const storedArchivedTasks = localStorage.getItem(RESELLER_ARCHIVED_TASKS_KEY);
    if (storedArchivedTasks) {
      try {
        const parsedArchivedTasks: Task[] = JSON.parse(storedArchivedTasks);
        setArchivedTasksState(Array.isArray(parsedArchivedTasks) ? parsedArchivedTasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : []);
      } catch (e) { console.error("Error parsing archived tasks", e); setArchivedTasksState([]); }
    } else { setArchivedTasksState([]); localStorage.setItem(RESELLER_ARCHIVED_TASKS_KEY, JSON.stringify([]));}

    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) try { setInventoryItems(JSON.parse(storedInventory)); } catch (e) { console.error("Error parsing inventory for tasks page", e); setInventoryItems([]); }
    else { setInventoryItems([]); localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify([])); }

    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    if (storedSales) try { setSales(JSON.parse(storedSales)); } catch (e) { console.error("Error parsing sales for tasks page", e); setSales([]); }
    else { setSales([]); localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify([])); }

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    if (storedSuppliers) try { setSuppliers(JSON.parse(storedSuppliers)); } catch (e) { console.error("Error parsing suppliers for tasks page", e); setSuppliers(DEFAULT_SUPPLIERS); }
    else { setSuppliers(DEFAULT_SUPPLIERS); localStorage.setItem(RESELLER_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS));}
    
    const storedTaskTags = localStorage.getItem(RESELLER_TASK_TAGS_KEY);
    if (storedTaskTags) try { setAllTaskTagDefinitions(JSON.parse(storedTaskTags)); } catch(e) { console.error("Error parsing task tags", e); setAllTaskTagDefinitions(DEFAULT_TASK_TAGS);}
    else { setAllTaskTagDefinitions(DEFAULT_TASK_TAGS); localStorage.setItem(RESELLER_TASK_TAGS_KEY, JSON.stringify(DEFAULT_TASK_TAGS));}

    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === RESELLER_TASKS_KEY) {
        const newStoredTasks = localStorage.getItem(RESELLER_TASKS_KEY);
        try { setActiveTasks(newStoredTasks ? JSON.parse(newStoredTasks).sort((a:Task,b:Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []); } 
        catch (e) { console.error("Error parsing updated active tasks:", e); setActiveTasks([]); }
      }
      if (event.key === RESELLER_ARCHIVED_TASKS_KEY) {
        const newStoredArchived = localStorage.getItem(RESELLER_ARCHIVED_TASKS_KEY);
        try { setArchivedTasksState(newStoredArchived ? JSON.parse(newStoredArchived).sort((a:Task,b:Task) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : []); } 
        catch (e) { console.error("Error parsing updated archived tasks:", e); setArchivedTasksState([]);}
      }
      if (event.key === RESELLER_INVENTORY_KEY) {
        const newInv = localStorage.getItem(RESELLER_INVENTORY_KEY);
        if(newInv) try {setInventoryItems(JSON.parse(newInv));} catch {}
        else setInventoryItems([]);
      }
      if (event.key === RESELLER_SALES_KEY) {
        const newSales = localStorage.getItem(RESELLER_SALES_KEY);
        if(newSales) try {setSales(JSON.parse(newSales));} catch {}
        else setSales([]);
      }
      if (event.key === RESELLER_SUPPLIERS_KEY) {
        const newSupp = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
        if(newSupp) try {setSuppliers(JSON.parse(newSupp));} catch {}
        else setSuppliers(DEFAULT_SUPPLIERS);
      }
      if (event.key === RESELLER_TASK_TAGS_KEY) { 
        const newTags = localStorage.getItem(RESELLER_TASK_TAGS_KEY);
        if(newTags) try {setAllTaskTagDefinitions(JSON.parse(newTags));} catch {}
        else setAllTaskTagDefinitions(DEFAULT_TASK_TAGS);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleStorageError = (e: any, action: string) => {
    if (e.name === 'QuotaExceededError') {
      toast({
        title: "Storage Full",
        description: `Could not perform action (${action}). Browser local storage is full.`,
        variant: "destructive",
        duration: 10000,
      });
    } else {
      toast({
        title: `Error ${action}`,
        description: `An unexpected error occurred: ${e.message}`,
        variant: "destructive",
      });
    }
  };
  
  const persistActiveTasks = (tasks: Task[]) => {
    try {
      const sorted = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem(RESELLER_TASKS_KEY, JSON.stringify(sorted));
      setActiveTasks(sorted);
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_TASKS_KEY, newValue: JSON.stringify(sorted), storageArea: localStorage }));
      return true;
    } catch (e: any) {
      handleStorageError(e, "persisting active tasks");
      return false;
    }
  };
  
  const persistArchivedTasks = (tasks: Task[]) => {
    try {
      const sorted = tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      localStorage.setItem(RESELLER_ARCHIVED_TASKS_KEY, JSON.stringify(sorted));
      setArchivedTasksState(sorted);
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ARCHIVED_TASKS_KEY, newValue: JSON.stringify(sorted), storageArea: localStorage }));
      return true;
    } catch (e: any) {
      handleStorageError(e, "persisting archived tasks");
      return false;
    }
  };

  const getContrastTextColor = (hexcolor: string): string => {
    if (!hexcolor || hexcolor.length < 4) return '#000000'; 
    let r, g, b;
    if (hexcolor.length === 4) { 
        r = parseInt(hexcolor[1] + hexcolor[1], 16);
        g = parseInt(hexcolor[2] + hexcolor[2], 16);
        b = parseInt(hexcolor[3] + hexcolor[3], 16);
    } else if (hexcolor.length === 7) { 
        r = parseInt(hexcolor.substring(1, 3), 16);
        g = parseInt(hexcolor.substring(3, 5), 16);
        b = parseInt(hexcolor.substring(5, 7), 16);
    } else {
        return '#000000'; 
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  const persistGlobalTaskTags = (newTagNames: string[], chosenColor: string) => {
    try {
        const currentGlobalTagsRaw = localStorage.getItem(RESELLER_TASK_TAGS_KEY);
        const currentGlobalTags: TagDefinition[] = currentGlobalTagsRaw ? JSON.parse(currentGlobalTagsRaw) : DEFAULT_TASK_TAGS;
        
        const updatedGlobalTags = [...currentGlobalTags];
        newTagNames.forEach(tagName => {
            if (!updatedGlobalTags.find(def => def.name.toLowerCase() === tagName.toLowerCase())) {
                updatedGlobalTags.push({ 
                  name: tagName, 
                  color: chosenColor, 
                  textColor: getContrastTextColor(chosenColor) 
                });
            }
        });
        
        const sortedGlobalTags = updatedGlobalTags.sort((a, b) => a.name.localeCompare(b.name));
        
        localStorage.setItem(RESELLER_TASK_TAGS_KEY, JSON.stringify(sortedGlobalTags));
        setAllTaskTagDefinitions(sortedGlobalTags);
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_TASK_TAGS_KEY, newValue: JSON.stringify(sortedGlobalTags), storageArea: localStorage }));
        return true;
    } catch (e: any) {
        handleStorageError(e, "persisting global task tags");
        return false;
    }
  };

  const handleOpenAddTaskDialog = () => {
    setTaskToEdit(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    let task = activeTasks.find(t => t.id === taskId);
    let isFromArchive = false;
    if (!task) {
      task = archivedTasksState.find(t => t.id === taskId);
      isFromArchive = true;
    }

    if (task) {
      if (isFromArchive) {
        const restoredTask = { ...task, status: 'todo' as TaskStatus, updatedAt: new Date().toISOString() };
        const newActive = [...activeTasks, restoredTask];
        const newArchived = archivedTasksState.filter(t => t.id !== taskId);
        if (persistActiveTasks(newActive) && persistArchivedTasks(newArchived)) {
            setTaskToEdit(restoredTask); 
            setIsTaskDialogOpen(true);
            toast({ title: "Task Restored for Editing", description: `Task "${restoredTask.title}" moved to active tasks.`});
        }
      } else {
        setTaskToEdit(task);
        setIsTaskDialogOpen(true);
      }
    } else {
      toast({ title: "Error", description: "Task not found for editing.", variant: "destructive" });
    }
  };

  const handleDeleteTask = (taskId: string, isArchivedList: boolean) => {
    setTaskToDelete(JSON.stringify({ id: taskId, isArchived: isArchivedList }));
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const { id, isArchived } = JSON.parse(taskToDelete);
      let taskTitle = "Task";
      let success = false;
      if (isArchived) {
        const task = archivedTasksState.find(t => t.id === id);
        if (task) taskTitle = task.title;
        const updatedArchived = archivedTasksState.filter(t => t.id !== id);
        if (persistArchivedTasks(updatedArchived)) success = true;
      } else {
        const task = activeTasks.find(t => t.id === id);
        if (task) taskTitle = task.title;
        const updatedActive = activeTasks.filter(t => t.id !== id);
        if (persistActiveTasks(updatedActive)) success = true;
      }
      if (success) {
        toast({ title: "Task Deleted", description: `Task "${taskTitle}" has been removed.`, variant: "destructive" });
      }
      setTaskToDelete(null);
    }
  };
  
  const handleTaskFormSubmit = (formData: TaskFormValues, chosenColorForNewTags: string, submitAction: 'saveAndClose' | 'saveAndAddNew') => {
    const taskWithTags: Task = { 
        ...(taskToEdit || {}),
        ...formData, 
        id: taskToEdit?.id || crypto.randomUUID(),
        createdAt: taskToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: formData.tags || [], 
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
    };

    if (taskToEdit && taskToEdit.id === taskWithTags.id) { 
      const newActiveTasks = activeTasks.map(t => (t.id === taskWithTags.id ? taskWithTags : t));
      if (persistActiveTasks(newActiveTasks)) {
        toast({ title: "Task Updated", description: `Task "${taskWithTags.title}" has been updated.` });
        if(taskWithTags.tags && taskWithTags.tags.length > 0) persistGlobalTaskTags(taskWithTags.tags, chosenColorForNewTags);
      }
    } else { 
      const newActiveTasks = [...activeTasks, taskWithTags];
      if (persistActiveTasks(newActiveTasks)) {
        toast({ title: "Task Added", description: `Task "${taskWithTags.title}" has been created.` });
        if(taskWithTags.tags && taskWithTags.tags.length > 0) persistGlobalTaskTags(taskWithTags.tags, chosenColorForNewTags);
      }
    }
    if (submitAction === 'saveAndClose') {
      setIsTaskDialogOpen(false);
      setTaskToEdit(undefined);
    } else { 
      setTaskToEdit(undefined); 
    }
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus, isUnarchiving: boolean = false) => {
    const now = new Date().toISOString();
    let taskToNotify: Task | undefined;
    let newActive = [...activeTasks];
    let newArchived = [...archivedTasksState];

    if (isUnarchiving) {
        const task = newArchived.find(t => t.id === taskId);
        if (task) {
            taskToNotify = { ...task, status: newStatus, updatedAt: now };
            newActive = [...newActive, taskToNotify];
            newArchived = newArchived.filter(t => t.id !== taskId);
        }
    } else if (newStatus === 'done') {
        const task = newActive.find(t => t.id === taskId);
        if (task) {
            taskToNotify = { ...task, status: 'done', updatedAt: now };
            newArchived = [...newArchived, taskToNotify];
            newActive = newActive.filter(t => t.id !== taskId);
        }
    } else { 
        const task = newActive.find(t => t.id === taskId);
        if (task) {
            taskToNotify = { ...task, status: newStatus, updatedAt: now };
            newActive = newActive.map(t => t.id === taskId ? taskToNotify! : t);
        }
    }
    
    if (taskToNotify) {
        if (persistActiveTasks(newActive) && persistArchivedTasks(newArchived)) {
            if (isUnarchiving) {
                toast({ title: "Task Restored", description: `Task "${taskToNotify.title}" moved to active tasks as '${getStatusLabel(newStatus)}'.` });
            } else if (newStatus === 'done') {
                toast({ title: "Task Completed & Archived", description: `Task "${taskToNotify.title}" marked as Done and moved to archive.` });
            } else {
                toast({ title: "Task Status Updated", description: `Task "${taskToNotify.title}" marked as ${getStatusLabel(newStatus)}.` });
            }
        }
    }
  };

  const getStatusLabel = (statusValue: string) => TASK_STATUSES.find(s => s.value === statusValue)?.label || statusValue;
  const getPlatformLabel = (platformValue?: string) => platformValue ? (SOLD_VIA_PLATFORMS.find(p => p.value === platformValue)?.label || platformValue) : "N/A";

  const checklistTasksToDisplay = useMemo(() => {
    if (showArchivedTasks) {
      return [...activeTasks, ...archivedTasksState.map(t => ({...t, isArchived: true}))]
        .sort((a, b) => {
          if (a.status === 'done' && b.status !== 'done') return 1;
          if (a.status !== 'done' && b.status === 'done') return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }
    return activeTasks;
  }, [activeTasks, archivedTasksState, showArchivedTasks]);
  
  const tasksByTagGroup = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const untagged: Task[] = [];

    allTaskTagDefinitions.forEach(tagDef => {
      groups[tagDef.name] = [];
    });

    activeTasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        let taggedToDefinedCategory = false;
        task.tags.forEach(tagName => {
          const tagDef = allTaskTagDefinitions.find(def => def.name.toLowerCase() === tagName.toLowerCase());
          if (tagDef) {
            if (!groups[tagDef.name]) groups[tagDef.name] = [];
            groups[tagDef.name].push(task);
            taggedToDefinedCategory = true;
          }
        });
        if (!taggedToDefinedCategory) {
            untagged.push(task);
        }
      } else {
        untagged.push(task);
      }
    });
    
    const orderedTagGroups = allTaskTagDefinitions
        .filter(tagDef => groups[tagDef.name]?.length > 0) // Only show tags that have tasks
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort tag groups alphabetically
        .map(tagDef => ({
            tagDefinition: tagDef,
            tasks: groups[tagDef.name].sort((taskA, taskB) => { // Sort tasks within each group
              const priorityOrder: Record<TaskPriority, number> = { high: 1, medium: 2, low: 3 };
              if (priorityOrder[taskA.priority] !== priorityOrder[taskB.priority]) {
                return priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
              }
              if (taskA.dueDate && taskB.dueDate) {
                return parseISO(taskA.dueDate).getTime() - parseISO(taskB.dueDate).getTime();
              }
              if (taskA.dueDate) return -1;
              if (taskB.dueDate) return 1;
              return parseISO(taskB.createdAt).getTime() - parseISO(taskA.createdAt).getTime();
            }),
        }));

    if (untagged.length > 0) {
        orderedTagGroups.push({
            tagDefinition: { name: "Untagged", color: "hsl(var(--muted))", textColor: "hsl(var(--muted-foreground))" },
            tasks: untagged.sort((taskA, taskB) => { // Also sort untagged tasks
              const priorityOrder: Record<TaskPriority, number> = { high: 1, medium: 2, low: 3 };
              if (priorityOrder[taskA.priority] !== priorityOrder[taskB.priority]) {
                return priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
              }
              if (taskA.dueDate && taskB.dueDate) {
                return parseISO(taskA.dueDate).getTime() - parseISO(taskB.dueDate).getTime();
              }
              if (taskA.dueDate) return -1;
              if (taskB.dueDate) return 1;
              return parseISO(taskB.createdAt).getTime() - parseISO(taskA.createdAt).getTime();
            })
        });
    }
    return orderedTagGroups;
  }, [activeTasks, allTaskTagDefinitions]);


  if (isLoading) {
    return <p className="text-center py-10">Loading tasks...</p>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-8 flex flex-col h-[calc(100vh-var(--header-height,4rem)-2rem)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold font-headline">Task Manager</h1>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
            <Button onClick={handleOpenAddTaskDialog} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
            </Button>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 sm:w-auto mb-4 shrink-0">
            <TabsTrigger value="checklist"><CheckSquare className="mr-2 h-4 w-4" />Checklist</TabsTrigger>
            <TabsTrigger value="kanbanStatus"><Activity className="mr-2 h-4 w-4" />Kanban (Status)</TabsTrigger>
            <TabsTrigger value="groupedByTag"><TagIcon className="mr-2 h-4 w-4" />Grouped by Tag</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-grow overflow-y-auto">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                      <CardTitle>Task Checklist</CardTitle>
                      <CardDescription>Manage your tasks. Completed tasks are archived but can be viewed with the toggle.</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 mt-2 sm:mt-0">
                      <Switch
                      id="show-archived-tasks"
                      checked={showArchivedTasks}
                      onCheckedChange={setShowArchivedTasks}
                      />
                      <Label htmlFor="show-archived-tasks" className="whitespace-nowrap text-sm">
                      {showArchivedTasks ? <EyeOff className="inline mr-1 h-4 w-4" /> : <Eye className="inline mr-1 h-4 w-4" />}
                      {showArchivedTasks ? "Hide" : "Show"} Archived
                      </Label>
                  </div>
              </CardHeader>
              <CardContent>
                {checklistTasksToDisplay.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {showArchivedTasks ? "No tasks found (active or archived)." : "No active tasks. Add a new task or toggle to show archived."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {checklistTasksToDisplay.map(task => {
                      const isArchivedTask = (task as Task & {isArchived?: boolean}).isArchived;
                      const priorityInfo = TASK_PRIORITIES.find(p => p.value === task.priority);
                      const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
                      const isTaskOverdue = dueDate && !isArchivedTask && isPast(dueDate); // Overdue only if not archived
                      return (
                        <Card key={task.id} className={`p-4 shadow-sm hover:shadow-md transition-shadow ${isArchivedTask ? 'bg-muted/30 opacity-70' : ''}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`task-checklist-${task.id}`}
                              checked={task.status === 'done'}
                              onCheckedChange={() => handleUpdateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done', task.status === 'done')}
                              aria-label={task.status === 'done' ? `Restore task ${task.title}` : `Mark task ${task.title} as done`}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <Label htmlFor={`task-checklist-${task.id}`} className={`font-semibold text-base cursor-pointer ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </Label>
                                 <div className="flex items-center shrink-0">
                                    {priorityInfo && !isArchivedTask && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: priorityInfo.color }}/>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{priorityInfo.label} Priority</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                    <div className="flex gap-1 shrink-0">
                                      {task.status !== 'done' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTask(task.id)}>
                                          <Edit3 className="h-4 w-4" />
                                          <span className="sr-only">Edit Task</span>
                                        </Button>
                                      )}
                                      {task.status === 'done' && (
                                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Restore Task" onClick={() => handleUpdateTaskStatus(task.id, 'todo', true)}>
                                              <ArchiveRestore className="h-4 w-4" />
                                              <span className="sr-only">Restore Task</span>
                                          </Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task.id, !!isArchivedTask)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Task</span>
                                      </Button>
                                    </div>
                                 </div>
                              </div>
                              {task.description && <p className={`text-sm text-muted-foreground mt-1 ${task.status === 'done' ? 'line-through' : ''}`}>{task.description}</p>}
                              {(task.tags && task.tags.length > 0 && allTaskTagDefinitions.length > 0) && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                      {task.tags.map(tagName => {
                                          const tagDef = allTaskTagDefinitions.find(def => def.name.toLowerCase() === tagName.toLowerCase());
                                          const defaultColor = TAG_COLOR_PALETTE.find(p => p.name === "Gray") || { background: "#d1d5db", text: "#1f2937"};
                                          return (
                                              <Badge 
                                                  key={tagName} 
                                                  variant="outline"
                                                  className="text-xs px-1.5 py-0.5 rounded"
                                                  style={tagDef ? { backgroundColor: tagDef.color, color: tagDef.textColor, borderColor: tagDef.color } : { backgroundColor: defaultColor.background, color: defaultColor.text, borderColor: defaultColor.background }}
                                              >
                                                  {tagName}
                                              </Badge>
                                          );
                                      })}
                                  </div>
                              )}
                              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs items-center">
                                <div>
                                  <Badge variant={task.status === 'done' ? 'outline' : task.status === 'inprogress' ? 'secondary' : 'default'}>
                                    {getStatusLabel(task.status)} {isArchivedTask && "(Archived)"}
                                  </Badge>
                                </div>
                                
                                {dueDate && (
                                  <div className={cn("flex items-center", isTaskOverdue && "text-destructive font-medium")}>
                                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                    Due: {format(dueDate, "MMM d, yyyy")}
                                    {isTaskOverdue && <AlertTriangle className="ml-1 h-3.5 w-3.5" />}
                                  </div>
                                )}
                                {task.inventoryItemName && <div><Badge variant="secondary">Item: {task.inventoryItemName}</Badge></div>}
                                {task.soldViaPlatform && <div><Badge variant="secondary">Platform: {getPlatformLabel(task.soldViaPlatform)}</Badge></div>}
                                {task.saleIdentifier && <div><Badge variant="secondary">Sale: {task.saleIdentifier}</Badge></div>}
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                Created: {format(parseISO(task.createdAt), "MM/dd/yyyy HH:mm")}
                                {task.updatedAt !== task.createdAt && ` | Updated: ${format(parseISO(task.updatedAt), "MM/dd/yyyy HH:mm")}`}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanbanStatus" className="flex-grow flex flex-col overflow-hidden">
             <KanbanByStatusView
                tasks={activeTasks}
                allTaskTagDefinitions={allTaskTagDefinitions}
                onEditTask={handleEditTask}
                onDeleteTask={(taskId) => handleDeleteTask(taskId, false)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                className="flex-grow overflow-hidden"
              />
          </TabsContent>

          <TabsContent value="groupedByTag" className="flex-grow overflow-y-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Tasks Grouped by Tag</CardTitle>
                    <CardDescription>Active tasks organized by their assigned tags. Tasks with multiple tags will appear under each. Untagged tasks are listed last.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasksByTagGroup.length === 0 && activeTasks.length > 0 && (
                        <p className="text-muted-foreground text-center py-8">No tasks have tags assigned, or no tags are defined.</p>
                    )}
                    {tasksByTagGroup.length === 0 && activeTasks.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">No active tasks to display.</p>
                    )}
                    <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-18rem)]"> {/* Adjust height as needed */}
                        <div className="space-y-6 pr-3">
                            {tasksByTagGroup.map(({ tagDefinition, tasks: tasksInGroup }) => (
                                <div key={tagDefinition.name} className="mb-6">
                                    <h3 
                                        className="text-lg font-semibold mb-3 p-2 rounded-md flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10"
                                        style={{ backgroundColor: tagDefinition.color, color: tagDefinition.textColor, borderBottom: `2px solid ${tagDefinition.color}`}}
                                    >
                                        <TagIcon className="h-5 w-5" />
                                        {tagDefinition.name} 
                                        <span className="ml-auto text-xs font-normal px-1.5 py-0.5 rounded-full" style={{backgroundColor: tagDefinition.textColor, color: tagDefinition.color}}>{tasksInGroup.length}</span>
                                    </h3>
                                    {tasksInGroup.length === 0 ? (
                                        <p className="text-sm text-muted-foreground pl-2">No active tasks for this tag.</p>
                                    ) : (
                                        <div className="space-y-2">
                                        {tasksInGroup.map(task => {
                                            const priorityInfo = TASK_PRIORITIES.find(p => p.value === task.priority);
                                            const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
                                            const isTaskOverdue = dueDate && isPast(dueDate);
                                            return (
                                            <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-sm">{task.title}</span>
                                                            <div className="flex items-center shrink-0">
                                                                {priorityInfo && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityInfo.color }}/>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p>{priorityInfo.label} Priority</p></TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-2">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => handleEditTask(task.id)}><Edit3 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleDeleteTask(task.id, false)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground items-center">
                                                    {task.status !== 'todo' && <Badge variant={task.status === 'inprogress' ? "secondary" : "default"} className="text-xs">{getStatusLabel(task.status)}</Badge>}
                                                    {dueDate && (
                                                        <div className={cn("flex items-center", isTaskOverdue && "text-destructive font-medium")}>
                                                        <CalendarDays className="mr-1 h-3 w-3" />
                                                        {format(dueDate, "MMM d")}
                                                        {isTaskOverdue && <AlertTriangle className="ml-0.5 h-3 w-3" />}
                                                        </div>
                                                    )}
                                                    {task.inventoryItemName && <div className="flex items-center"><Layers className="mr-1 h-3 w-3" />{task.inventoryItemName}</div>}
                                                    {task.saleIdentifier && <div className="flex items-center"><ShoppingCart className="mr-1 h-3 w-3" />{task.saleIdentifier}</div>}
                                                </div>
                                            </Card>
                                            );
                                        })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Dialog open={isTaskDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setTaskToEdit(undefined); } setIsTaskDialogOpen(isOpen);}}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>{taskToEdit ? "Edit Task" : "Add New Task"}</DialogTitle>
                  <DialogDesc>
                  {taskToEdit ? `Update details for "${taskToEdit.title}".` : "Fill in the details for your new task."}
                  </DialogDesc>
              </DialogHeader>
              <TaskForm
                  onSubmit={(data, chosenColor, submitAction) => {
                      handleTaskFormSubmit(data, chosenColor, submitAction);
                      if (submitAction === 'saveAndClose') {
                          setIsTaskDialogOpen(false);
                          setTaskToEdit(undefined);
                      } else { 
                          setTaskToEdit(undefined); 
                      }
                  }}
                  initialData={taskToEdit}
                  inventoryItems={inventoryItems}
                  sales={sales}
                  suppliers={suppliers}
                  allTagDefinitions={allTaskTagDefinitions} 
                  key={taskToEdit?.id || 'new-task-dialog-form'} 
              />
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this task.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
    



