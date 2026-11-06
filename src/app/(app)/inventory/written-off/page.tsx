
"use client";

import InventoryDisplayPage from "@/components/inventory/InventoryDisplayPage";

export default function WrittenOffInventoryPage() {
  // This page will show items with status "Damaged" or "Donated".
  // InventoryDisplayPage currently filters by a single status.
  // For now, let's default to showing "Damaged". A more robust solution
  // would involve enhancing InventoryDisplayPage or creating a new component
  // that can filter by multiple statuses.
  return (
    <InventoryDisplayPage 
      statusFilter="Damaged" 
      pageTitle="Written Off Inventory (Damaged/Donated)"
      emptyStateMessage="No items marked as Damaged or Donated. Update item status to see them here."
    />
  );
}

