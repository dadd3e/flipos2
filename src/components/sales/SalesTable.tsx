"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Sale, InventoryItem } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { MoreHorizontal, Trash2, Truck, AlertCircle, Package, ExternalLink, Tag, Link2, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns";
import { EditShippingDialog } from "./EditShippingDialog";
import { EditCogsDialog } from "./EditCogsDialog";
import { RESELLER_INVENTORY_KEY, RESELLER_SALES_KEY } from "@/lib/constants";
import { reconcileInventoryAndSales, updateSaleAndLinkedInventoryCOGS, syncCOGSFromInventoryToSales } from "@/lib/inventorySalesSync";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { useToast } from "@/hooks/use-toast";
import { cleanQuotes } from "@/lib/utils";

interface SalesTableProps {
  sales: Sale[];
  onDelete: (saleId: string) => void;
  onUpdateShippingCost?: (saleId: string, shippingCost: number) => void;
  onUpdateCogs?: (saleId: string, unitCost: number) => void;
}

export function SalesTable({ sales, onDelete, onUpdateShippingCost, onUpdateCogs }: SalesTableProps) {
  const { toast } = useToast();
  const [editingShippingSale, setEditingShippingSale] = useState<Sale | null>(null);
  const [editingCogsSale, setEditingCogsSale] = useState<Sale | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);

  const loadInventory = useCallback(() => {
    try {
      const stored = localStorage.getItem(RESELLER_INVENTORY_KEY);
      if (stored) {
        setInventoryList(JSON.parse(stored));
      } else {
        setInventoryList([]);
      }
    } catch {
      setInventoryList([]);
    }
  }, []);

  useEffect(() => {
    // Reconcile images and COGS between sales and inventory
    reconcileInventoryAndSales();
    loadInventory();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === RESELLER_INVENTORY_KEY || e.key === RESELLER_SALES_KEY) {
        loadInventory();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadInventory]);

  const formatDateString = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) ? format(parsedDate, "MM/dd/yyyy") : "Invalid Date";
    } catch {
      return dateString.substring(0, 10);
    }
  };

  const handleSaveShipping = (saleId: string, cost: number) => {
    if (onUpdateShippingCost) {
      onUpdateShippingCost(saleId, cost);
    } else {
      try {
        const stored = localStorage.getItem(RESELLER_SALES_KEY);
        if (stored) {
          const currentSales: Sale[] = JSON.parse(stored);
          const updated = currentSales.map((s) => {
            if (s.id === saleId) {
              const cogs = (s.totalPurchaseCostOfItemSold || 0) * (s.quantitySold || 1);
              const profit = s.grossSaleAmount - s.totalPlatformFeesAndDiscounts - cost - cogs;
              return {
                ...s,
                actualShippingCostBySeller: cost,
                profit: parseFloat(profit.toFixed(2)),
                needsShippingCostEntry: false,
              };
            }
            return s;
          });
          localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updated));
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: RESELLER_SALES_KEY,
              newValue: JSON.stringify(updated),
              storageArea: localStorage,
            })
          );
        }
      } catch (e) {
        console.error("Failed to update shipping cost:", e);
      }
    }
  };

  const handleSaveCogs = (saleId: string, unitCost: number) => {
    if (onUpdateCogs) {
      onUpdateCogs(saleId, unitCost);
    } else {
      updateSaleAndLinkedInventoryCOGS(saleId, unitCost);
    }
    loadInventory();
  };

  // Helper to find linked inventory item
  const findLinkedInventoryItem = (sale: Sale): InventoryItem | undefined => {
    return inventoryList.find(
      (inv) =>
        inv.id === sale.itemId ||
        (sale.etsyListingId && Number(inv.etsyListingId) === Number(sale.etsyListingId)) ||
        (inv.name && sale.itemName && inv.name.trim().toLowerCase() === sale.itemName.trim().toLowerCase())
    );
  };

  const handleOpenInventory = (sale: Sale) => {
    let item = findLinkedInventoryItem(sale);
    if (!item) {
      item = {
        id: sale.itemId || crypto.randomUUID(),
        name: sale.itemName,
        status: "Sold",
        price: sale.totalPurchaseCostOfItemSold || 0,
        totalPurchaseCost: sale.totalPurchaseCostOfItemSold || 0,
        quantity: 0,
        itemImageUrl: sale.itemImageUrl,
        etsyListingId: sale.etsyListingId ? Number(sale.etsyListingId) : undefined,
        dateAdded: sale.saleDate || new Date().toISOString(),
        listedOn: sale.soldVia ? [sale.soldVia] : ["Etsy"],
      };
      try {
        const stored = localStorage.getItem(RESELLER_INVENTORY_KEY);
        const currentInventory: InventoryItem[] = stored ? JSON.parse(stored) : [];
        currentInventory.push(item);
        localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(currentInventory));
        loadInventory();
      } catch (e) {
        console.error("Error creating linked inventory item:", e);
      }
    }
    setSelectedInventoryItem(item);
  };

  const handleSaveInventoryItem = (updatedItem: InventoryItem) => {
    try {
      const stored = localStorage.getItem(RESELLER_INVENTORY_KEY);
      let currentInventory: InventoryItem[] = stored ? JSON.parse(stored) : [];
      const idx = currentInventory.findIndex((i) => i.id === updatedItem.id);
      if (idx >= 0) {
        currentInventory[idx] = updatedItem;
      } else {
        currentInventory.push(updatedItem);
      }
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(currentInventory));

      syncCOGSFromInventoryToSales(updatedItem);
      reconcileInventoryAndSales();

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RESELLER_INVENTORY_KEY,
          newValue: JSON.stringify(currentInventory),
          storageArea: localStorage,
        })
      );

      toast({
        title: "Inventory Updated",
        description: `Saved changes to "${updatedItem.name}".`,
      });
      setSelectedInventoryItem(null);
      loadInventory();
    } catch (e) {
      console.error("Failed to update inventory from sales:", e);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Sales History</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No sales logged yet. Add sales using the form above or import from Etsy.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Sold Via</TableHead>
                  <TableHead className="text-right">Gross Sale</TableHead>
                  <TableHead className="text-right">Fees/Discounts</TableHead>
                  <TableHead className="text-right">Outbound Shipping</TableHead>
                  <TableHead className="text-right">COGS (Linked)</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const linkedItem = findLinkedInventoryItem(sale);

                  // Resolving photo: prioritize sale photo, fallback to linked item photo
                  const effectivePhoto = sale.itemImageUrl || linkedItem?.itemImageUrl;

                  // Resolving COGS: linked item's current cost has authority if > 0, fallback to sale record
                  const effectiveUnitCost =
                    linkedItem && typeof linkedItem.price === "number" && linkedItem.price > 0
                      ? linkedItem.price
                      : sale.totalPurchaseCostOfItemSold || 0;

                  const qty = sale.quantitySold || 1;
                  const totalCogsForDisplay = parseFloat((effectiveUnitCost * qty).toFixed(2));
                  const effectiveProfit = parseFloat(
                    (
                      sale.grossSaleAmount -
                      sale.totalPlatformFeesAndDiscounts -
                      (sale.actualShippingCostBySeller || 0) -
                      totalCogsForDisplay
                    ).toFixed(2)
                  );

                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {effectivePhoto ? (
                            <Image
                              src={effectivePhoto}
                              alt={cleanQuotes(sale.itemName)}
                              width={42}
                              height={42}
                              className="rounded object-cover aspect-square border shrink-0 bg-muted/30"
                              referrerPolicy="no-referrer"
                              data-ai-hint="product photo"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center text-muted-foreground text-xs shrink-0 border">
                              <Package className="h-4 w-4 text-muted-foreground/60" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenInventory(sale)}
                              className="font-medium line-clamp-2 max-w-[280px] text-left hover:text-primary hover:underline transition-colors cursor-pointer block"
                              title="Click to view and edit inventory item card"
                            >
                              {cleanQuotes(sale.itemName)}
                            </button>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                              {sale.isEtsyImport && (
                                <span>{sale.etsyReceiptId ? `Receipt #${sale.etsyReceiptId}` : "Etsy Import"}</span>
                              )}
                              {sale.etsyUrl && (
                                <a
                                  href={sale.etsyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:underline inline-flex items-center gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Listing <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                              {linkedItem && (
                                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                                  <Link2 className="h-2.5 w-2.5 text-primary" /> Inv #{linkedItem.id.substring(0, 6)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{sale.quantitySold}</TableCell>
                      <TableCell>{formatDateString(sale.saleDate)}</TableCell>
                      <TableCell>
                        <Badge variant={sale.soldVia === "Etsy" ? "default" : "secondary"}>
                          {sale.soldVia}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">${sale.grossSaleAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        -${sale.totalPlatformFeesAndDiscounts.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.needsShippingCostEntry ||
                        (sale.soldVia === "Etsy" && sale.actualShippingCostBySeller === 0) ? (
                          <button
                            type="button"
                            onClick={() => setEditingShippingSale(sale)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                            title="Click to enter what you paid for shipping"
                          >
                            <Truck className="h-3 w-3" />
                            <span>Enter $</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingShippingSale(sale)}
                            className="text-red-600 hover:underline cursor-pointer text-right font-medium"
                            title="Click to edit shipping cost"
                          >
                            -${sale.actualShippingCostBySeller.toFixed(2)}
                          </button>
                        )}
                      </TableCell>
                      {/* COGS CELL: Synchronized with linked inventory item */}
                      <TableCell className="text-right">
                        {totalCogsForDisplay === 0 ? (
                          <button
                            type="button"
                            onClick={() => setEditingCogsSale(sale)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 transition-colors"
                            title="Click to enter purchase cost (COGS) for this item"
                          >
                            <Tag className="h-3 w-3" />
                            <span>Enter COGS</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingCogsSale(sale)}
                            className="text-red-600 hover:underline cursor-pointer text-right font-medium"
                            title={`Click to edit unit cost ($${effectiveUnitCost.toFixed(2)}/unit)`}
                          >
                            -${totalCogsForDisplay.toFixed(2)}
                          </button>
                        )}
                      </TableCell>
                      {/* PROFIT CELL */}
                      <TableCell
                        className={`text-right font-semibold ${
                          effectiveProfit >= 0 ? "text-green-600" : "text-destructive"
                        }`}
                      >
                        ${effectiveProfit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenInventory(sale)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Inventory Card
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingCogsSale(sale)}>
                              <Tag className="mr-2 h-4 w-4" /> Edit Cost (COGS)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingShippingSale(sale)}>
                              <Truck className="mr-2 h-4 w-4" /> Edit Shipping Cost
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(sale.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <EditShippingDialog
        sale={editingShippingSale}
        isOpen={!!editingShippingSale}
        onOpenChange={(open) => {
          if (!open) setEditingShippingSale(null);
        }}
        onSaveShipping={handleSaveShipping}
      />

      <EditCogsDialog
        sale={editingCogsSale}
        isOpen={!!editingCogsSale}
        onOpenChange={(open) => {
          if (!open) setEditingCogsSale(null);
        }}
        onSaveCogs={handleSaveCogs}
        linkedInventoryItemName={editingCogsSale ? findLinkedInventoryItem(editingCogsSale)?.name : undefined}
      />

      <Sheet
        open={!!selectedInventoryItem}
        onOpenChange={(open) => {
          if (!open) setSelectedInventoryItem(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Inventory Item
            </SheetTitle>
            <SheetDescription>
              Update inventory details for "{selectedInventoryItem?.name}".
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh_-_5.5rem)]">
            <div className="p-6">
              {selectedInventoryItem && (
                <InventoryForm
                  onSubmit={handleSaveInventoryItem}
                  initialData={selectedInventoryItem}
                  key={selectedInventoryItem.id}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
