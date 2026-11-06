import type { InventoryItem, Sale } from "./types";
import { RESELLER_INVENTORY_KEY, RESELLER_SALES_KEY } from "./constants";
import { cleanQuotes } from "./utils";

/**
 * Reconciles inventory items and sales records:
 * 1. Backfills missing primary photos from sales to inventory items and vice-versa.
 * 2. Synchronizes COGS between inventory items and associated sales records.
 * 3. Cleans any raw HTML entities like &quot; into " (symbol for inches).
 */
export function reconcileInventoryAndSales(): {
  inventoryUpdated: boolean;
  salesUpdated: boolean;
  inventory: InventoryItem[];
  sales: Sale[];
} {
  if (typeof window === "undefined") {
    return { inventoryUpdated: false, salesUpdated: false, inventory: [], sales: [] };
  }

  let inventory: InventoryItem[] = [];
  let sales: Sale[] = [];

  try {
    const rawInv = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (rawInv) inventory = JSON.parse(rawInv);
    if (!Array.isArray(inventory)) inventory = [];
  } catch {
    inventory = [];
  }

  try {
    const rawSales = localStorage.getItem(RESELLER_SALES_KEY);
    if (rawSales) sales = JSON.parse(rawSales);
    if (!Array.isArray(sales)) sales = [];
  } catch {
    sales = [];
  }

  let inventoryUpdated = false;
  let salesUpdated = false;

  // 1. Clean quotes/entities and synchronize photos and COGS for inventory
  inventory = inventory.map((item) => {
    let updatedItem = { ...item };

    if (item.name && item.name.includes("&")) {
      const cleaned = cleanQuotes(item.name);
      if (cleaned !== item.name) {
        updatedItem.name = cleaned;
        inventoryUpdated = true;
      }
    }
    if (item.nameOnInvoice && item.nameOnInvoice.includes("&")) {
      const cleaned = cleanQuotes(item.nameOnInvoice);
      if (cleaned !== item.nameOnInvoice) {
        updatedItem.nameOnInvoice = cleaned;
        inventoryUpdated = true;
      }
    }
    if (item.additionalNotes && item.additionalNotes.includes("&")) {
      const cleaned = cleanQuotes(item.additionalNotes);
      if (cleaned !== item.additionalNotes) {
        updatedItem.additionalNotes = cleaned;
        inventoryUpdated = true;
      }
    }

    // Find matching sale
    const matchingSale = sales.find(
      (s) =>
        s.itemId === item.id ||
        (item.etsyListingId && Number(s.etsyListingId) === Number(item.etsyListingId)) ||
        (s.itemName && item.name && s.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())
    );

    // Image backfill: If inventory item is missing image, copy from sale
    if ((!item.itemImageUrl || item.itemImageUrl.trim() === "") && matchingSale?.itemImageUrl) {
      updatedItem.itemImageUrl = matchingSale.itemImageUrl;
      inventoryUpdated = true;
    }

    return updatedItem;
  });

  // 2. Synchronize sales with inventory COGS and images
  sales = sales.map((sale) => {
    const matchingItem = inventory.find(
      (inv) =>
        inv.id === sale.itemId ||
        (sale.etsyListingId && Number(inv.etsyListingId) === Number(sale.etsyListingId)) ||
        (inv.name && sale.itemName && inv.name.trim().toLowerCase() === sale.itemName.trim().toLowerCase())
    );

    let updatedSale = { ...sale };

    if (sale.itemName && sale.itemName.includes("&")) {
      const cleaned = cleanQuotes(sale.itemName);
      if (cleaned !== sale.itemName) {
        updatedSale.itemName = cleaned;
        salesUpdated = true;
      }
    }

    // Link itemId if missing
    if (matchingItem && sale.itemId !== matchingItem.id) {
      updatedSale.itemId = matchingItem.id;
      salesUpdated = true;
    }

    // Image backfill: If sale is missing image, copy from inventory item
    if ((!sale.itemImageUrl || sale.itemImageUrl.trim() === "") && matchingItem?.itemImageUrl) {
      updatedSale.itemImageUrl = matchingItem.itemImageUrl;
      salesUpdated = true;
    }

    // COGS synchronization: If matching inventory item has a unit cost > 0
    if (matchingItem && typeof matchingItem.price === "number" && matchingItem.price > 0) {
      const invUnitCost = matchingItem.price;
      if (sale.totalPurchaseCostOfItemSold !== invUnitCost) {
        updatedSale.totalPurchaseCostOfItemSold = invUnitCost;
        const totalCogs = invUnitCost * (sale.quantitySold || 1);
        const shipping = sale.actualShippingCostBySeller || 0;
        const fees = sale.totalPlatformFeesAndDiscounts || 0;
        const gross = sale.grossSaleAmount || 0;
        updatedSale.profit = parseFloat((gross - fees - shipping - totalCogs).toFixed(2));
        salesUpdated = true;
      }
    }

    return updatedSale;
  });

  if (inventoryUpdated) {
    localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(inventory));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: RESELLER_INVENTORY_KEY,
        newValue: JSON.stringify(inventory),
        storageArea: localStorage,
      })
    );
  }

  if (salesUpdated) {
    localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(sales));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: RESELLER_SALES_KEY,
        newValue: JSON.stringify(sales),
        storageArea: localStorage,
      })
    );
  }

  return { inventoryUpdated, salesUpdated, inventory, sales };
}

/**
 * Propagate a COGS update for an inventory item to all associated sales
 */
export function syncCOGSFromInventoryToSales(inventoryItem: InventoryItem): void {
  if (typeof window === "undefined") return;

  try {
    const rawSales = localStorage.getItem(RESELLER_SALES_KEY);
    if (!rawSales) return;
    const sales: Sale[] = JSON.parse(rawSales);
    if (!Array.isArray(sales)) return;

    const unitCost = Number(inventoryItem.price) || 0;
    let anySaleUpdated = false;

    const updatedSales = sales.map((sale) => {
      const isMatch =
        sale.itemId === inventoryItem.id ||
        (inventoryItem.etsyListingId && Number(sale.etsyListingId) === Number(inventoryItem.etsyListingId)) ||
        (sale.itemName && inventoryItem.name && sale.itemName.trim().toLowerCase() === inventoryItem.name.trim().toLowerCase());

      if (isMatch) {
        anySaleUpdated = true;
        const totalCogs = unitCost * (sale.quantitySold || 1);
        const shipping = sale.actualShippingCostBySeller || 0;
        const fees = sale.totalPlatformFeesAndDiscounts || 0;
        const gross = sale.grossSaleAmount || 0;
        return {
          ...sale,
          itemId: inventoryItem.id,
          totalPurchaseCostOfItemSold: unitCost,
          itemImageUrl: inventoryItem.itemImageUrl || sale.itemImageUrl,
          profit: parseFloat((gross - fees - shipping - totalCogs).toFixed(2)),
        };
      }
      return sale;
    });

    if (anySaleUpdated) {
      localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updatedSales));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RESELLER_SALES_KEY,
          newValue: JSON.stringify(updatedSales),
          storageArea: localStorage,
        })
      );
    }
  } catch (e) {
    console.error("Failed to sync COGS from inventory to sales:", e);
  }
}

/**
 * Update COGS from the Sales view and propagate back to the linked inventory item
 */
export function updateSaleAndLinkedInventoryCOGS(saleId: string, unitCost: number): void {
  if (typeof window === "undefined") return;

  try {
    const rawSales = localStorage.getItem(RESELLER_SALES_KEY);
    const rawInv = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (!rawSales) return;

    const sales: Sale[] = JSON.parse(rawSales);
    const inventory: InventoryItem[] = rawInv ? JSON.parse(rawInv) : [];

    let targetSale: Sale | undefined = undefined;

    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        targetSale = s;
        const totalCogs = unitCost * (s.quantitySold || 1);
        const shipping = s.actualShippingCostBySeller || 0;
        const fees = s.totalPlatformFeesAndDiscounts || 0;
        const gross = s.grossSaleAmount || 0;
        return {
          ...s,
          totalPurchaseCostOfItemSold: unitCost,
          profit: parseFloat((gross - fees - shipping - totalCogs).toFixed(2)),
        };
      }
      return s;
    });

    localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updatedSales));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: RESELLER_SALES_KEY,
        newValue: JSON.stringify(updatedSales),
        storageArea: localStorage,
      })
    );

    // Also update linked inventory item
    if (targetSale) {
      const saleObj: Sale = targetSale;
      let invUpdated = false;
      const updatedInventory = inventory.map((item) => {
        const isMatch =
          item.id === saleObj.itemId ||
          (saleObj.etsyListingId && Number(item.etsyListingId) === Number(saleObj.etsyListingId)) ||
          (item.name && saleObj.itemName && item.name.trim().toLowerCase() === saleObj.itemName.trim().toLowerCase());

        if (isMatch) {
          invUpdated = true;
          const qty = item.quantity || 1;
          return {
            ...item,
            price: unitCost,
            totalPurchaseCost: parseFloat((unitCost * qty).toFixed(2)),
            itemImageUrl: item.itemImageUrl || saleObj.itemImageUrl,
          };
        }
        return item;
      });

      if (invUpdated) {
        localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventory));
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: RESELLER_INVENTORY_KEY,
            newValue: JSON.stringify(updatedInventory),
            storageArea: localStorage,
          })
        );
      }
    }
  } catch (e) {
    console.error("Failed to update sale and linked inventory COGS:", e);
  }
}
