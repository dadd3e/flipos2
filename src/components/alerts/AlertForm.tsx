
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AlertConfig, InventoryItem, AlertType } from "@/lib/types";
import { ALERT_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from "@/components/ui/card";
import { BellPlus } from "lucide-react";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const alertSchema = z.object({
  type: z.custom<AlertType>(val => ALERT_TYPES.some(type => type.value === val), {
    message: "Invalid alert type selected",
  }),
  itemName: z.string().optional(),
  threshold: z.coerce.number().optional(),
  details: z.string().min(5, { message: "Details must be at least 5 characters." }),
}).refine(data => {
  if (data.type === "low_stock" && (data.itemName === undefined || data.itemName.trim() === "" || data.threshold === undefined || data.threshold < 0)) {
    return false;
  }
  return true;
}, {
  message: "For Low Stock alerts, Item Name and a valid Threshold are required.",
  path: ["itemName"], 
});


type AlertFormValues = z.infer<typeof alertSchema>;

interface AlertFormProps {
  inventoryItems: InventoryItem[]; 
  onSubmit: (data: AlertConfig) => void;
  initialData?: Partial<AlertConfig>;
}

export function AlertForm({ inventoryItems, onSubmit, initialData }: AlertFormProps) {
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      type: initialData?.type || "low_stock",
      itemName: initialData?.itemName || "",
      threshold: initialData?.threshold || 0,
      details: initialData?.details || "",
    },
  });

  const selectedAlertType = form.watch("type");

  const handleSubmit = useCallback((data: AlertFormValues) => {
    const fullAlertData: AlertConfig = {
      id: initialData?.id || crypto.randomUUID(),
      creationDate: initialData?.creationDate || new Date().toISOString(),
      isActive: initialData?.isActive === undefined ? true : initialData.isActive,
      type: data.type, 
      details: data.details,
      ...(data.type === 'low_stock' || data.type === 'listing_expiration' ? { itemName: data.itemName } : {}),
      ...(data.type === 'low_stock' ? { threshold: data.threshold } : {}),
    };
    onSubmit(fullAlertData);
    if (!initialData?.id) { 
        form.reset({
            type: "low_stock", 
            itemName: "",
            threshold: 0,
            details: "",
        });
    }
  }, [initialData, onSubmit, form]);
  
  const activeInventoryItems = inventoryItems.filter(item => item.status === 'Active');

  return (
    <Card id="create">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
            <BellPlus className="h-6 w-6" />
            {initialData?.id ? "Edit Alert Configuration" : "Create New Alert Configuration"}
        </CardTitle>
        <UiCardDescription>
          Configure alert types. Some types like 'Aging Inventory' and 'Customer Satisfaction' will automatically create tasks based on system-wide checks when active.
        </UiCardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select alert type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALERT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAlertType === "low_stock" && (
              <>
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item for Low Stock Alert</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={activeInventoryItems.length === 0 ? "No active items available" : "Select an active item"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeInventoryItems.length === 0 && <p className="p-2 text-sm text-muted-foreground">No active items.</p>}
                          {activeInventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name} (Current Stock: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Threshold</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? 0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {selectedAlertType === "listing_expiration" && (
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item for Listing Expiration</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={inventoryItems.length === 0 ? "No items available" : "Select an item"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inventoryItems.length === 0 && <p className="p-2 text-sm text-muted-foreground">No items available.</p>}
                          {inventoryItems.map((item) => ( 
                            <SelectItem key={item.id} value={item.name}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
            
            {(selectedAlertType === "aging_inventory" || selectedAlertType === "customer_satisfaction") && (
                 <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                   This alert type enables automated task creation.
                   {selectedAlertType === "aging_inventory" && " Tasks will be generated for inventory items active for over 45 days to review descriptions and pricing."}
                   {selectedAlertType === "customer_satisfaction" && " Tasks will be generated 21 days after a sale to follow up with the customer."}
                   Ensure this alert is active for tasks to be created. No specific item or threshold is needed here.
                </p>
            )}


            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Details / Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., General notes about this alert configuration." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full sm:w-auto">
                {initialData?.id ? "Update Alert Configuration" : "Create Alert Configuration"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
