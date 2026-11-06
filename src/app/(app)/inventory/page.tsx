
"use client";

import InventoryDisplayPage from "@/components/inventory/InventoryDisplayPage";

export default function ActiveInventoryPage() {
  return (
    <InventoryDisplayPage 
      statusFilter="Active"
      pageTitle="Active Inventory"
      emptyStateMessage="No active inventory items. Click 'Add New Item' to get started."
    />
  );
}

