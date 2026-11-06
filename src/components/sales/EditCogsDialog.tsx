"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Tag, Link2 } from "lucide-react";
import type { Sale } from "@/lib/types";

interface EditCogsDialogProps {
  sale: Sale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveCogs: (saleId: string, unitCost: number) => void;
  linkedInventoryItemName?: string;
}

export function EditCogsDialog({
  sale,
  isOpen,
  onOpenChange,
  onSaveCogs,
  linkedInventoryItemName,
}: EditCogsDialogProps) {
  const [unitCostInput, setUnitCostInput] = useState<string>("");

  useEffect(() => {
    if (sale) {
      setUnitCostInput(
        sale.totalPurchaseCostOfItemSold > 0 ? sale.totalPurchaseCostOfItemSold.toString() : ""
      );
    }
  }, [sale]);

  if (!sale) return null;

  const currentGross = sale.grossSaleAmount || 0;
  const currentFees = sale.totalPlatformFeesAndDiscounts || 0;
  const shipping = sale.actualShippingCostBySeller || 0;
  const inputUnitCost = parseFloat(unitCostInput) || 0;
  const qty = sale.quantitySold || 1;
  const totalCogs = inputUnitCost * qty;
  const projectedProfit = currentGross - currentFees - shipping - totalCogs;

  const handleSave = () => {
    onSaveCogs(sale.id, Math.max(0, inputUnitCost));
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Set Purchase Cost (COGS)
          </DialogTitle>
          <DialogDescription>
            Enter what you paid to acquire <strong>{sale.itemName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {linkedInventoryItemName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-md border">
              <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Linked to inventory item: <strong>{linkedInventoryItemName}</strong></span>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Sale:</span>
              <span className="font-medium">${currentGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fees & Discounts:</span>
              <span className="font-medium text-destructive">-${currentFees.toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outbound Shipping Paid:</span>
                <span className="font-medium text-destructive">-${shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total COGS ({qty} {qty === 1 ? "unit" : "units"}):</span>
              <span className="text-destructive">-${totalCogs.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCogsInput">Purchase Cost Per Unit ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="unitCogsInput"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-8"
                value={unitCostInput}
                onChange={(e) => setUnitCostInput(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This updates both this sale and the associated inventory item across FlipOS.
            </p>
          </div>

          <div className="rounded-md border p-3 flex justify-between items-center bg-card">
            <span className="text-sm font-medium">Updated Net Profit:</span>
            <span className={`text-base font-bold ${projectedProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
              ${projectedProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Cost &amp; Recalculate Profit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
