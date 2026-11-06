
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Package, ShoppingCart, Users, Search as SearchIcon, Link2, Tag, X, Palette } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority, InventoryItem, SoldViaPlatformValue, Sale, Supplier, Contact as ContactType, TagDefinition } from "@/lib/types";
import { TASK_STATUSES, TASK_PRIORITIES, SOLD_VIA_PLATFORMS, SUPPLIER_TYPES, TAG_COLOR_PALETTE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const taskSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES.map(s => s.value) as [TaskStatus, ...TaskStatus[]], {
    required_error: "Status is required.",
  }),
  priority: z.enum(TASK_PRIORITIES.map(p => p.value) as [TaskPriority, ...TaskPriority[]], {
    required_error: "Priority is required.",
  }),
  dueDate: z.date().optional(),
  inventoryItemId: z.string().optional(),
  soldViaPlatform: z.enum(SOLD_VIA_PLATFORMS.map(p => p.value) as [SoldViaPlatformValue, ...SoldViaPlatformValue[]]).optional(),
  saleId: z.string().optional(),
  inventoryItemName: z.string().optional(), 
  saleIdentifier: z.string().optional(),
  tags: z.array(z.string()).optional(), 
});

export type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormValues, chosenColorForNewTags: string, submitAction: 'saveAndClose' | 'saveAndAddNew') => void;
  initialData?: Task;
  inventoryItems: InventoryItem[];
  sales: Sale[];
  suppliers: Supplier[];
  allTagDefinitions: TagDefinition[]; 
}

type SearchableEntityType = "inventory" | "sale" | "platform" | "supplier" | "contact";
interface SearchableEntity {
  id: string;
  type: SearchableEntityType;
  displayLabel: string;
  secondaryLabel?: string;
  originalObject: InventoryItem | Sale | SoldViaPlatformValue | Supplier | ContactType;
}


export function TaskForm({ onSubmit, initialData, inventoryItems, sales, suppliers, allTagDefinitions }: TaskFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [selectedLinkedEntity, setSelectedLinkedEntity] = useState<SearchableEntity | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [currentTagInput, setCurrentTagInput] = useState("");
  const [currentTaskTags, setCurrentTaskTags] = useState<string[]>([]); 
  const [selectedTagColor, setSelectedTagColor] = useState<string>(TAG_COLOR_PALETTE[0].background); 
  
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: undefined,
      inventoryItemId: "",
      soldViaPlatform: undefined,
      saleId: "",
      inventoryItemName: "",
      saleIdentifier: "",
      tags: [], 
    },
  });

  const generateSaleIdentifier = (sale: Sale | undefined): string | undefined => {
    if (!sale) return undefined;
    return `Sale of '${sale.itemName}' on ${format(parseISO(sale.saleDate), "MM/dd/yyyy")}`;
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || "",
        description: initialData.description || "",
        status: initialData.status || "todo",
        priority: initialData.priority || "medium",
        dueDate: initialData.dueDate ? parseISO(initialData.dueDate) : undefined,
        inventoryItemId: initialData.inventoryItemId || "",
        soldViaPlatform: initialData.soldViaPlatform || undefined,
        saleId: initialData.saleId || "",
        inventoryItemName: initialData.inventoryItemName || "",
        saleIdentifier: initialData.saleIdentifier || "",
        tags: initialData.tags || [], 
      });
      setCurrentTaskTags(initialData.tags || []); 

      if (initialData.inventoryItemId) {
        const item = inventoryItems.find(i => i.id === initialData.inventoryItemId);
        if (item) setSelectedLinkedEntity({ id: item.id, type: 'inventory', displayLabel: item.name, secondaryLabel: `Stock: ${item.quantity}`, originalObject: item });
      } else if (initialData.saleId) {
        const sale = sales.find(s => s.id === initialData.saleId);
        if (sale) setSelectedLinkedEntity({ id: sale.id, type: 'sale', displayLabel: generateSaleIdentifier(sale)!, secondaryLabel: `Platform: ${sale.soldVia}`, originalObject: sale });
      } else if (initialData.soldViaPlatform) {
        const platform = SOLD_VIA_PLATFORMS.find(p => p.value === initialData.soldViaPlatform);
        if (platform) setSelectedLinkedEntity({ id: platform.value, type: 'platform', displayLabel: platform.label, originalObject: platform.value });
      } else {
        setSelectedLinkedEntity(null);
      }
      setSearchQuery(selectedLinkedEntity?.displayLabel || "");

    } else {
      form.reset({
        title: "", description: "", status: "todo", priority: "medium", dueDate: undefined,
        inventoryItemId: "", soldViaPlatform: undefined, saleId: "",
        inventoryItemName: "", saleIdentifier: "", tags: [],
      });
      setCurrentTaskTags([]); 
      setSelectedLinkedEntity(null);
      setSearchQuery("");
    }
  }, [initialData, form, inventoryItems, sales]);


  const searchableEntities: SearchableEntity[] = useMemo(() => {
    const entities: SearchableEntity[] = [];
    inventoryItems.forEach(item => entities.push({
      id: item.id, type: 'inventory', displayLabel: item.name, secondaryLabel: `Stock: ${item.quantity} | Cat: ${item.category || 'N/A'}`, originalObject: item
    }));
    sales.forEach(sale => entities.push({
      id: sale.id, type: 'sale', displayLabel: generateSaleIdentifier(sale)!, secondaryLabel: `Platform: ${sale.soldVia} | Profit: $${sale.profit.toFixed(2)}`, originalObject: sale
    }));
    SOLD_VIA_PLATFORMS.forEach(platform => entities.push({
      id: platform.value, type: 'platform', displayLabel: platform.label, secondaryLabel: "Sales Platform", originalObject: platform.value
    }));
    suppliers.forEach(supplier => {
      entities.push({
        id: supplier.id, type: 'supplier', displayLabel: supplier.name, secondaryLabel: `Supplier (${SUPPLIER_TYPES.find(st => st.value === supplier.type)?.label})`, originalObject: supplier
      });
      supplier.contacts.forEach(contact => entities.push({
        id: `${supplier.id}_${contact.id}`, type: 'contact', displayLabel: `${contact.name} (${supplier.name})`, secondaryLabel: `Contact @ ${supplier.name}`, originalObject: contact
      }));
    });
    return entities;
  }, [inventoryItems, sales, suppliers]);

  const filteredSearchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return searchableEntities.filter(entity => 
      entity.displayLabel.toLowerCase().includes(lowerQuery) || 
      (entity.secondaryLabel && entity.secondaryLabel.toLowerCase().includes(lowerQuery)) ||
      (entity.type === 'inventory' && (entity.originalObject as InventoryItem).category?.toLowerCase().includes(lowerQuery))
    ).slice(0, 10); 
  }, [searchQuery, searchableEntities]);


  const handleSelectEntity = (entity: SearchableEntity) => {
    setSelectedLinkedEntity(entity);
    setSearchQuery(entity.displayLabel);
    setIsSearchPopoverOpen(false);
    form.setValue('inventoryItemId', undefined);
    form.setValue('inventoryItemName', undefined);
    form.setValue('saleId', undefined);
    form.setValue('saleIdentifier', undefined);
    form.setValue('soldViaPlatform', undefined);
    if (entity.type === 'inventory') {
      form.setValue('inventoryItemId', entity.id);
      form.setValue('inventoryItemName', (entity.originalObject as InventoryItem).name);
    } else if (entity.type === 'sale') {
      form.setValue('saleId', entity.id);
      form.setValue('saleIdentifier', generateSaleIdentifier(entity.originalObject as Sale));
    } else if (entity.type === 'platform') {
      form.setValue('soldViaPlatform', entity.originalObject as SoldViaPlatformValue);
    } 
    form.trigger(['inventoryItemId', 'saleId', 'soldViaPlatform']);
  };
  
  const handleAddTag = useCallback(() => {
    const tagNameToAdd = currentTagInput.trim(); 
    if (tagNameToAdd && !currentTaskTags.some(tag => tag.toLowerCase() === tagNameToAdd.toLowerCase())) {
      setCurrentTaskTags(prevTags => [...prevTags, tagNameToAdd]); 
    }
    setCurrentTagInput("");
  }, [currentTagInput, currentTaskTags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTaskTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
  };

  const getTagDefinition = (tagName: string): TagDefinition | undefined => {
    return allTagDefinitions.find(def => def.name.toLowerCase() === tagName.toLowerCase());
  };


  function handleFormSubmitWrapper(data: TaskFormValues, submitAction: 'saveAndClose' | 'saveAndAddNew') {
    const finalFormData = { ...data, tags: currentTaskTags };
    onSubmit(finalFormData, selectedTagColor, submitAction); 
     if (submitAction === 'saveAndAddNew') {
         form.reset({
            title: "", description: "", status: "todo", priority: "medium", dueDate: undefined,
            inventoryItemId: "", soldViaPlatform: undefined, saleId: "",
            inventoryItemName: "", saleIdentifier: "", tags: []
        });
        setCurrentTaskTags([]);
        setSelectedLinkedEntity(null);
        setSearchQuery("");
        setSelectedTagColor(TAG_COLOR_PALETTE[0].background); 
    }
  }

  const getEntityIcon = (type: SearchableEntityType) => {
    switch(type) {
      case 'inventory': return <Package className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'sale': return <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'platform': return <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'supplier': return <Users className="mr-2 h-4 w-4 text-muted-foreground" />;
      case 'contact': return <Users className="mr-2 h-4 w-4 text-muted-foreground" />;
      default: return <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />;
    }
  }

  return (
    <Card>
      <CardHeader className="hidden">
        <CardTitle className="flex items-center gap-2 font-headline">
          <PlusCircle className="h-6 w-6" />
          {initialData ? "Edit Task" : "Add New Task"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., List vintage t-shirt on eBay" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Add more details about the task..." {...field} /></FormControl><FormMessage /></FormItem> )}/>

            <FormItem>
              <FormLabel>Tags (Optional)</FormLabel>
              <div className="flex items-center gap-2 mb-2">
                <Input type="text" placeholder="Type tag and press Enter..." value={currentTagInput} onChange={(e) => setCurrentTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}} className="flex-grow"/>
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={!currentTagInput.trim()}>Add Tag</Button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                {TAG_COLOR_PALETTE.map(color => (
                  <button
                    type="button"
                    key={color.name}
                    title={color.name}
                    onClick={() => setSelectedTagColor(color.background)}
                    className={cn("h-6 w-6 rounded-full border-2", selectedTagColor === color.background ? "ring-2 ring-offset-2 ring-primary" : "border-transparent hover:border-muted-foreground")}
                    style={{ backgroundColor: color.background }}
                  />
                ))}
              </div>
              {currentTaskTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {currentTaskTags.map((tagName) => {
                    const tagDef = getTagDefinition(tagName);
                    const bgColor = tagDef ? tagDef.color : selectedTagColor; 
                    const textColor = tagDef ? tagDef.textColor : TAG_COLOR_PALETTE.find(p=>p.background === bgColor)?.text || "#000000";
                    return (
                        <Badge key={tagName} variant="outline" style={{ backgroundColor: bgColor, color: textColor, borderColor: bgColor }} className="flex items-center gap-1 text-xs px-2 py-1">
                        {tagName}
                        <button type="button" onClick={() => handleRemoveTag(tagName)} className="ml-1 rounded-full hover:bg-black/20 p-0.5" style={{ color: textColor }}>
                            <X className="h-3 w-3" /><span className="sr-only">Remove tag {tagName}</span>
                        </button>
                        </Badge>
                    );
                  })}
                </div>
              )}
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="priority" render={({ field }) => ( <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl><SelectContent>{TASK_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
            </div>
            <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Due Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>

            <FormItem>
                <FormLabel htmlFor="linkSearchInput">Link Task To (Optional)</FormLabel>
                 <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="linkSearchInput" ref={searchInputRef} placeholder="Search Inventory, Sales, Platforms..." value={searchQuery} onChange={(e) => { const newQuery = e.target.value; setSearchQuery(newQuery); setIsSearchPopoverOpen(true); if (selectedLinkedEntity && newQuery !== selectedLinkedEntity.displayLabel) { setSelectedLinkedEntity(null); form.resetField("inventoryItemId"); form.resetField("inventoryItemName"); form.resetField("saleId"); form.resetField("saleIdentifier"); form.resetField("soldViaPlatform"); }}} onFocus={() => setIsSearchPopoverOpen(true)} className="pl-10"/>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()} onInteractOutside={(e) => { if (searchInputRef.current && searchInputRef.current.contains(e.target as Node)) { return; } setIsSearchPopoverOpen(false);}}>
                        <ScrollArea className="max-h-60">
                        {isSearchPopoverOpen && filteredSearchResults.length === 0 && searchQuery && ( <div className="p-2 text-sm text-center text-muted-foreground">No results for "{searchQuery}".</div> )}
                        {isSearchPopoverOpen && filteredSearchResults.length > 0 && ( filteredSearchResults.map((entity) => ( <Button key={entity.id} variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => handleSelectEntity(entity)}> <div className="flex items-start w-full"> {getEntityIcon(entity.type)} <div className="flex flex-col items-start flex-grow"> <span className="block truncate">{entity.displayLabel}</span> {entity.secondaryLabel && <span className="text-xs text-muted-foreground block truncate">{entity.secondaryLabel}</span>} </div> </div> </Button> )) )}
                        {isSearchPopoverOpen && !searchQuery && searchableEntities.length > 0 && ( <div className="p-2 text-sm text-center text-muted-foreground">Type to search or browse recent items...</div> )}
                        {isSearchPopoverOpen && searchableEntities.length === 0 && ( <div className="p-2 text-sm text-center text-muted-foreground">No items available to link.</div> )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
                {selectedLinkedEntity && ( <div className="mt-2 p-2 border rounded-md bg-muted/50 text-sm"> <div className="flex items-center"> {getEntityIcon(selectedLinkedEntity.type)} <span className="font-medium">{selectedLinkedEntity.displayLabel}</span> </div> {selectedLinkedEntity.secondaryLabel && <p className="text-xs text-muted-foreground ml-6">{selectedLinkedEntity.secondaryLabel}</p>} <Button variant="link" size="sm" className="h-auto p-0 mt-1 ml-5 text-destructive" onClick={() => { setSelectedLinkedEntity(null); setSearchQuery(""); form.resetField("inventoryItemId"); form.resetField("inventoryItemName"); form.resetField("saleId"); form.resetField("saleIdentifier"); form.resetField("soldViaPlatform"); }}>Clear selection</Button> </div> )}
                <FormDescription>Associate this task with an inventory item, sale, platform, supplier, or contact.</FormDescription>
            </FormItem>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button type="button" onClick={form.handleSubmit(data => handleFormSubmitWrapper(data, 'saveAndClose'))} className="w-full sm:w-auto">
                {initialData ? "Update Task" : "Save Task"}
              </Button>
              {!initialData && (
                <Button type="button" onClick={form.handleSubmit(data => handleFormSubmitWrapper(data, 'saveAndAddNew'))} variant="secondary" className="w-full sm:w-auto">
                  Save & Add Another
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

