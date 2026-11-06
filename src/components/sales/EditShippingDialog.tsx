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
import { Truck, DollarSign } from "lucide-react";
import type { Sale } from "@/lib/types";

interface EditShippingDialogProps {
  sale: Sale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveShipping: (saleId: string, actualShippingCost: number) => void;
}

export function EditShippingDialog({
  sale,
  isOpen,
  onOpenChange,
  onSaveShipping,
}: EditShippingDialogProps) {
  const [shippingCost, setShippingCost] = useState<string>("");

  useEffect(() => {
    if (sale) {
      setShippingCost(sale.actualShippingCostBySeller > 0 ? sale.actualShippingCostBySeller.toString() : "");
    }
  }, [sale]);

  const handleSave = () => {
    if (!sale) return;
    const numericCost = parseFloat(shippingCost) || 0;
    onSaveShipping(sale.id, Math.max(0, numericCost));
    onOpenChange(false);
  };

  if (!sale) return null;

  const currentGross = sale.grossSaleAmount || 0;
  const currentFees = sale.totalPlatformFeesAndDiscounts || 0;
  const cogs = (sale.totalPurchaseCostOfItemSold || 0) * (sale.quantitySold || 1);
  const inputShipping = parseFloat(shippingCost) || 0;
  const projectedProfit = currentGross - currentFees - cogs - inputShipping;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Enter Actual Shipping Cost
          </DialogTitle>
          <DialogDescription>
            Enter what you paid to ship <strong>{sale.itemName}</strong> to the buyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Gross Sale:</span>
              <span className="font-medium">${currentGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Etsy Fees & Discounts:</span>
              <span className="font-medium text-destructive">-${currentFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Cost (COGS):</span>
              <span className="font-medium text-destructive">-${cogs.toFixed(2)}</span>
            </div>
            {sale.etsyShippingCharged !== undefined && sale.etsyShippingCharged > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Buyer Paid Shipping:</span>
                <span>${sale.etsyShippingCharged.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualShippingCost">Actual Shipping Paid by You ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="actualShippingCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-8"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will update your profit calculation.
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
            Save Shipping Cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
