
import type { InventoryItem, ItemStatus, SoldViaPlatformValue, Supplier, SupplierType, Contact, Note } from './types';
import { parseISO, isValid, format } from 'date-fns';
import { ITEM_STATUSES } from './constants'; // Import ITEM_STATUSES

// Helper to escape cell data for CSV
function escapeCsvCell(cellData: any): string {
  if (cellData === null || cellData === undefined) {
    return "";
  }
  const stringData = String(cellData);
  if (stringData.includes(",") || stringData.includes("\"") || stringData.includes("\n")) {
    return `"${stringData.replace(/"/g, '""')}"`;
  }
  return stringData;
}

const INVENTORY_CSV_HEADERS = [
  "id", "name", "nameOnInvoice", "category", "status", "quantity", "price", "purchaseDate", "dateAdded",
  "boxNumber", "itemImageUrl", "buyersPremiumPercent", "shippingAndHandling",
  "isTaxablePurchase", "totalPurchaseCost", "source", "invoiceNumber", "storeName",
  "supplierId", "targetPrice", "potentialProfit", "additionalNotes", "listedOn"
];

export function generateInventoryCsv(items: InventoryItem[]): string {
  const headerRow = INVENTORY_CSV_HEADERS.join(",");
  const itemRows = items.map(item => {
    const listedOnStr = item.listedOn ? item.listedOn.join("|") : "";
    const purchaseDateStr = item.purchaseDate ? format(parseISO(item.purchaseDate), 'yyyy-MM-dd') : "";
    const dateAddedStr = item.dateAdded ? format(parseISO(item.dateAdded), 'yyyy-MM-dd') : "";
    
    return [
      escapeCsvCell(item.id),
      escapeCsvCell(item.name),
      escapeCsvCell(item.nameOnInvoice), // Added
      escapeCsvCell(item.category),
      escapeCsvCell(item.status),
      escapeCsvCell(item.quantity),
      escapeCsvCell(item.price),
      escapeCsvCell(purchaseDateStr),
      escapeCsvCell(dateAddedStr),
      escapeCsvCell(item.boxNumber),
      escapeCsvCell(item.itemImageUrl),
      escapeCsvCell(item.buyersPremiumPercent),
      escapeCsvCell(item.shippingAndHandling),
      escapeCsvCell(item.isTaxablePurchase),
      escapeCsvCell(item.totalPurchaseCost),
      escapeCsvCell(item.source),
      escapeCsvCell(item.invoiceNumber),
      escapeCsvCell(item.storeName),
      escapeCsvCell(item.supplierId),
      escapeCsvCell(item.targetPrice),
      escapeCsvCell(item.potentialProfit),
      escapeCsvCell(item.additionalNotes),
      escapeCsvCell(listedOnStr)
    ].join(",");
  });
  return [headerRow, ...itemRows].join("\n");
}

export function parseInventoryCsv(csvString: string): { data: InventoryItem[], errors: string[] } {
  const rows = csvString.split("\n").map(row => row.trim()).filter(row => row.length > 0);
  if (rows.length < 2) return { data: [], errors: ["CSV must have a header row and at least one data row."] };

  const header = rows[0].split(",").map(h => h.trim());
  const dataRows = rows.slice(1);
  const items: InventoryItem[] = [];
  const errors: string[] = [];

  const validStatuses = ITEM_STATUSES.map(s => s.value);

  dataRows.forEach((rowStr, rowIndex) => {
    const values = rowStr.split(","); 
    const rowData: any = {};
    header.forEach((colName, index) => {
      rowData[colName] = values[index] ? values[index].trim() : undefined;
    });

    try {
      const listedOnArray = rowData.listedOn ? (rowData.listedOn.split("|") as SoldViaPlatformValue[]) : [];
      
      const purchaseDateParsed = rowData.purchaseDate ? parseISO(rowData.purchaseDate) : undefined;
      if (rowData.purchaseDate && (!purchaseDateParsed || !isValid(purchaseDateParsed))) {
          errors.push(`Row ${rowIndex + 1}: Invalid purchaseDate format. Expected YYYY-MM-DD.`);
      }
      const dateAddedParsed = rowData.dateAdded ? parseISO(rowData.dateAdded) : new Date(); 
       if (rowData.dateAdded && !isValid(dateAddedParsed)) {
          errors.push(`Row ${rowIndex + 1}: Invalid dateAdded format. Defaulting to now.`);
      }
      
      let statusValue: ItemStatus = 'Pending'; // Default status
      if (rowData.status && validStatuses.includes(rowData.status as ItemStatus)) {
        statusValue = rowData.status as ItemStatus;
      } else if (rowData.status) {
        errors.push(`Row ${rowIndex + 1}: Invalid status "${rowData.status}". Defaulting to Pending.`);
      }


      const item: InventoryItem = {
        id: rowData.id || crypto.randomUUID(),
        name: rowData.name || `Unnamed Item ${rowIndex + 1}`,
        nameOnInvoice: rowData.nameOnInvoice, // Added
        category: rowData.category,
        status: statusValue,
        quantity: parseFloat(rowData.quantity) || 0,
        price: parseFloat(rowData.price) || 0,
        purchaseDate: purchaseDateParsed ? purchaseDateParsed.toISOString() : undefined,
        dateAdded: isValid(dateAddedParsed) ? dateAddedParsed.toISOString() : new Date().toISOString(),
        boxNumber: rowData.boxNumber,
        itemImageUrl: rowData.itemImageUrl,
        buyersPremiumPercent: rowData.buyersPremiumPercent ? parseFloat(rowData.buyersPremiumPercent) : undefined,
        shippingAndHandling: rowData.shippingAndHandling ? parseFloat(rowData.shippingAndHandling) : undefined,
        isTaxablePurchase: rowData.isTaxablePurchase === 'true',
        totalPurchaseCost: parseFloat(rowData.totalPurchaseCost) || 0,
        source: rowData.source,
        invoiceNumber: rowData.invoiceNumber,
        storeName: rowData.storeName,
        supplierId: rowData.supplierId,
        targetPrice: rowData.targetPrice ? parseFloat(rowData.targetPrice) : undefined,
        potentialProfit: rowData.potentialProfit ? parseFloat(rowData.potentialProfit) : undefined,
        additionalNotes: rowData.additionalNotes,
        listedOn: listedOnArray,
      };
      items.push(item);
    } catch (e: any) {
      errors.push(`Row ${rowIndex + 1}: Error parsing data - ${e.message}`);
    }
  });

  return { data: items, errors };
}


const SUPPLIER_CSV_HEADERS = [
  "id", "name", "type", "address", "website", "generalNotes", "dateAdded", "lastUpdated",
  "contact1_name", "contact1_role", "contact1_email", "contact1_phone", "contact1_contactNotes", "contactsCount",
  "note1_content", "note1_timestamp", "note1_linkedTo", "note1_linkedToName", "notesCount"
];

export function generateSuppliersCsv(suppliers: Supplier[]): string {
  const headerRow = SUPPLIER_CSV_HEADERS.join(",");
  const supplierRows = suppliers.map(supplier => {
    const primaryContact = supplier.contacts && supplier.contacts.length > 0 ? supplier.contacts[0] : undefined;
    const primaryNote = supplier.notes && supplier.notes.length > 0 ? supplier.notes[0] : undefined;
    
    const dateAddedStr = supplier.dateAdded ? format(parseISO(supplier.dateAdded), 'yyyy-MM-dd HH:mm:ss') : "";
    const lastUpdatedStr = supplier.lastUpdated ? format(parseISO(supplier.lastUpdated), 'yyyy-MM-dd HH:mm:ss') : "";
    const noteTimestampStr = primaryNote?.timestamp ? format(parseISO(primaryNote.timestamp), 'yyyy-MM-dd HH:mm:ss') : "";


    return [
      escapeCsvCell(supplier.id),
      escapeCsvCell(supplier.name),
      escapeCsvCell(supplier.type),
      escapeCsvCell(supplier.address),
      escapeCsvCell(supplier.website),
      escapeCsvCell(supplier.generalNotes),
      escapeCsvCell(dateAddedStr),
      escapeCsvCell(lastUpdatedStr),
      escapeCsvCell(primaryContact?.name),
      escapeCsvCell(primaryContact?.role),
      escapeCsvCell(primaryContact?.email),
      escapeCsvCell(primaryContact?.phone),
      escapeCsvCell(primaryContact?.contactNotes),
      escapeCsvCell(supplier.contacts?.length || 0),
      escapeCsvCell(primaryNote?.content),
      escapeCsvCell(noteTimestampStr),
      escapeCsvCell(primaryNote?.linkedTo),
      escapeCsvCell(primaryNote?.linkedToName),
      escapeCsvCell(supplier.notes?.length || 0),
    ].join(",");
  });
  return [headerRow, ...supplierRows].join("\n");
}


export function parseSuppliersCsv(csvString: string): { data: Supplier[], errors: string[] } {
  const rows = csvString.split("\n").map(row => row.trim()).filter(row => row.length > 0);
  if (rows.length < 2) return { data: [], errors: ["CSV must have a header row and at least one data row."] };

  const header = rows[0].split(",").map(h => h.trim());
  const dataRows = rows.slice(1);
  const suppliers: Supplier[] = [];
  const errors: string[] = [];

  dataRows.forEach((rowStr, rowIndex) => {
    const values = rowStr.split(","); 
    const rowData: any = {};
    header.forEach((colName, index) => {
      rowData[colName] = values[index] ? values[index].trim() : undefined;
    });

    try {
      const contacts: Contact[] = [];
      if (rowData.contact1_name) {
        contacts.push({
          id: crypto.randomUUID(),
          name: rowData.contact1_name,
          role: rowData.contact1_role,
          email: rowData.contact1_email,
          phone: rowData.contact1_phone,
          contactNotes: rowData.contact1_contactNotes,
        });
      }

      const notes: Note[] = [];
      if (rowData.note1_content && rowData.note1_timestamp) {
         const noteTimestampParsed = parseISO(rowData.note1_timestamp);
         if (isValid(noteTimestampParsed)) {
            notes.push({
              id: crypto.randomUUID(),
              content: rowData.note1_content,
              timestamp: noteTimestampParsed.toISOString(),
              linkedTo: rowData.note1_linkedTo || 'supplier',
              linkedToName: rowData.note1_linkedToName,
            });
         } else {
             errors.push(`Row ${rowIndex + 1}: Invalid note1_timestamp. Note not imported.`);
         }
      }
      
      const dateAddedParsed = rowData.dateAdded ? parseISO(rowData.dateAdded) : new Date();
      const lastUpdatedParsed = rowData.lastUpdated ? parseISO(rowData.lastUpdated) : new Date();


      const supplier: Supplier = {
        id: rowData.id || crypto.randomUUID(),
        name: rowData.name || `Unnamed Supplier ${rowIndex + 1}`,
        type: (rowData.type as SupplierType) || 'Store', 
        address: rowData.address,
        website: rowData.website,
        generalNotes: rowData.generalNotes,
        dateAdded: isValid(dateAddedParsed) ? dateAddedParsed.toISOString() : new Date().toISOString(),
        lastUpdated: isValid(lastUpdatedParsed) ? lastUpdatedParsed.toISOString() : new Date().toISOString(),
        contacts,
        notes,
      };
      suppliers.push(supplier);
    } catch (e: any) {
      errors.push(`Row ${rowIndex + 1}: Error parsing supplier data - ${e.message}`);
    }
  });

  return { data: suppliers, errors };
}
