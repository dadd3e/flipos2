
"use client";

import InventoryDisplayPage from "@/components/inventory/InventoryDisplayPage";

export default function SoldInventoryPage() {
  return (
    <InventoryDisplayPage 
      statusFilter="Sold"
      pageTitle="Sold Inventory"
      emptyStateMessage="No sold inventory items. Log sales to see items here."
    />
  );
}

