
"use client";

import InventoryDisplayPage from "@/components/inventory/InventoryDisplayPage";

export default function PendingInventoryPage() {
  return (
    <InventoryDisplayPage 
      statusFilter="Pending"
      pageTitle="Pending Inventory"
      emptyStateMessage="No pending inventory items. Add some or update status from Active."
    />
  );
}

