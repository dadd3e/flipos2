
"use client";

import InventoryDisplayPage from "@/components/inventory/InventoryDisplayPage";

export default function KeptInventoryPage() {
  return (
    <InventoryDisplayPage 
      statusFilter="Kept"
      pageTitle="Kept Inventory (Personal Use)"
      emptyStateMessage="No items marked as Kept for personal use. Update item status to see them here."
    />
  );
}

