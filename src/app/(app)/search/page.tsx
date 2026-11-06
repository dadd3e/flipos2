
"use client";

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Users, Contact as ContactIcon, ExternalLink, Eye, Edit3 } from 'lucide-react';
import type { InventoryItem, Sale, Supplier, Contact } from '@/lib/types';
import { RESELLER_INVENTORY_KEY, RESELLER_SALES_KEY, RESELLER_SUPPLIERS_KEY, SUPPLIER_TYPES } from '@/lib/constants';
import { format, parseISO, isValid } from 'date-fns'; // Added isValid here
import { cleanQuotes } from '@/lib/utils';

interface SearchResults {
  inventory: InventoryItem[];
  sales: Sale[];
  suppliers: Supplier[]; // Contacts are part of suppliers
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams ? searchParams.get('q') || "" : "";

  const [results, setResults] = useState<SearchResults>({ inventory: [], sales: [], suppliers: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      setResults({ inventory: [], sales: [], suppliers: [] });
      return;
    }
    setIsLoading(true);

    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    const inventoryItems: InventoryItem[] = storedInventory ? JSON.parse(storedInventory) : [];

    const storedSales = localStorage.getItem(RESELLER_SALES_KEY);
    const salesData: Sale[] = storedSales ? JSON.parse(storedSales) : [];

    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    const suppliersData: Supplier[] = storedSuppliers ? JSON.parse(storedSuppliers) : [];

    const localLowerQuery = query.toLowerCase();

    const filteredInventory = inventoryItems.filter(item =>
      item.name.toLowerCase().includes(localLowerQuery) ||
      (item.category && item.category.toLowerCase().includes(localLowerQuery)) ||
      item.status.toLowerCase().includes(localLowerQuery) ||
      (item.boxNumber && item.boxNumber.toLowerCase().includes(localLowerQuery)) ||
      (item.source && item.source.toLowerCase().includes(localLowerQuery)) ||
      (item.storeName && item.storeName.toLowerCase().includes(localLowerQuery)) ||
      (item.additionalNotes && item.additionalNotes.toLowerCase().includes(localLowerQuery)) ||
      item.id.toLowerCase().includes(localLowerQuery)
    );

    const filteredSales = salesData.filter(sale =>
      sale.itemName.toLowerCase().includes(localLowerQuery) ||
      sale.soldVia.toLowerCase().includes(localLowerQuery) ||
      sale.id.toLowerCase().includes(localLowerQuery) ||
      (sale.saleDate && isValid(parseISO(sale.saleDate)) && format(parseISO(sale.saleDate), 'MM/dd/yyyy').includes(localLowerQuery))
    );

    const filteredSuppliers = suppliersData.filter(supplier => {
      const supplierMatch = supplier.name.toLowerCase().includes(localLowerQuery) ||
        supplier.type.toLowerCase().includes(localLowerQuery) ||
        (supplier.address && supplier.address.toLowerCase().includes(localLowerQuery)) ||
        (supplier.website && supplier.website.toLowerCase().includes(localLowerQuery)) ||
        (supplier.generalNotes && supplier.generalNotes.toLowerCase().includes(localLowerQuery)) ||
        supplier.id.toLowerCase().includes(localLowerQuery);

      if (supplierMatch) return true;

      return supplier.contacts.some(contact =>
        contact.name.toLowerCase().includes(localLowerQuery) ||
        (contact.role && contact.role.toLowerCase().includes(localLowerQuery)) ||
        (contact.email && contact.email.toLowerCase().includes(localLowerQuery)) ||
        (contact.phone && contact.phone.toLowerCase().includes(localLowerQuery)) ||
        (contact.contactNotes && contact.contactNotes.toLowerCase().includes(localLowerQuery))
      );
    });

    setResults({ inventory: filteredInventory, sales: filteredSales, suppliers: filteredSuppliers });
    setIsLoading(false);
  }, [query]);

  const getSupplierTypeLabel = (type: string) => SUPPLIER_TYPES.find(st => st.value === type)?.label || type;

  const totalResults = results.inventory.length + results.sales.length + results.suppliers.length;

  if (isLoading && query) {
    return <p className="text-center py-10 text-muted-foreground">Searching...</p>;
  }

  if (!query) {
    return <p className="text-center py-10 text-muted-foreground">Please enter a search term in the sidebar.</p>;
  }
  
  const lowerQuery = query.toLowerCase();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">
        Search Results for "{query}"
        <span className="text-lg text-muted-foreground ml-2">({totalResults} found)</span>
      </h1>

      {results.inventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-6 w-6" />Inventory Items ({results.inventory.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.inventory.map(item => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start hover:shadow-md transition-shadow">
                {item.itemImageUrl && (
                  <Image src={item.itemImageUrl} alt={cleanQuotes(item.name)} width={60} height={60} className="rounded-md object-cover aspect-square border shrink-0" referrerPolicy="no-referrer" data-ai-hint="product photo"/>
                )}
                <div className="flex-grow">
                  <Link href={`/inventory/view/${item.id}`} className="hover:underline">
                    <h3 className="font-semibold text-lg">{cleanQuotes(item.name)}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant={item.status === 'Active' ? 'default' : item.status === 'Sold' ? 'destructive' : 'secondary'}>{item.status}</Badge> | Qty: {item.quantity} | Cost: ${item.totalPurchaseCost.toFixed(2)}
                  </p>
                  {item.category && <p className="text-xs">Category: {item.category}</p>}
                  {item.source && <p className="text-xs">Source: {item.source} {item.storeName ? `(${item.storeName})` : ''}</p>}
                </div>
                <Button variant="outline" size="sm" asChild className="mt-2 sm:mt-0 sm:ml-auto">
                  <Link href={`/inventory/add?editId=${item.id}`}><Edit3 className="mr-2 h-4 w-4"/>Edit Item</Link>
                </Button>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {results.sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6" />Sales ({results.sales.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.sales.map(sale => (
              <Card key={sale.id} className="p-4 hover:shadow-md transition-shadow">
                 <Link href={`/sales/all`} className="hover:underline"> {/* Link to a specific sale view if created later */}
                    <h3 className="font-semibold text-lg">Sale of: {cleanQuotes(sale.itemName)}</h3>
                  </Link>
                <p className="text-sm text-muted-foreground">
                  Date: {sale.saleDate && isValid(parseISO(sale.saleDate)) ? format(parseISO(sale.saleDate), 'MM/dd/yyyy') : 'Invalid Date'} | Platform: <Badge variant="secondary">{sale.soldVia}</Badge>
                </p>
                <p className="text-sm">
                  Gross: ${sale.grossSaleAmount.toFixed(2)} | Profit: 
                  <span className={sale.profit >= 0 ? 'text-green-600' : 'text-destructive'}>
                    ${sale.profit.toFixed(2)}
                  </span>
                </p>
                 <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href={`/sales/all`}><Eye className="mr-2 h-4 w-4"/>View Sales Report</Link>
                </Button>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {results.suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" />Suppliers & Contacts ({results.suppliers.length})</CardTitle>
             <CardDescription>Results may include suppliers or their specific contacts matching your query.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.suppliers.map(supplier => (
              <Card key={supplier.id} className="p-4 hover:shadow-md transition-shadow">
                 <Link href={`/suppliers/view/${supplier.id}`} className="hover:underline">
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                  </Link>
                <p className="text-sm text-muted-foreground">
                  Type: <Badge variant="outline">{getSupplierTypeLabel(supplier.type)}</Badge>
                </p>
                {supplier.address && <p className="text-xs">Address: {supplier.address}</p>}
                {supplier.website && <p className="text-xs">Website: <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{supplier.website} <ExternalLink className="inline h-3 w-3" /></a></p>}
                
                {/* Highlight matching contacts */}
                {supplier.contacts.filter(c => 
                    c.name.toLowerCase().includes(lowerQuery) ||
                    (c.role && c.role.toLowerCase().includes(lowerQuery)) ||
                    (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
                    (c.phone && c.phone.toLowerCase().includes(lowerQuery))
                ).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <h4 className="text-xs font-semibold mb-1">Matching Contacts:</h4>
                        {supplier.contacts.filter(c => 
                            c.name.toLowerCase().includes(lowerQuery) ||
                            (c.role && c.role.toLowerCase().includes(lowerQuery)) ||
                            (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
                            (c.phone && c.phone.toLowerCase().includes(lowerQuery))
                        ).map(contact => (
                            <div key={contact.id} className="text-xs pl-2 py-0.5 bg-primary/5 rounded">
                                <ContactIcon className="inline h-3 w-3 mr-1"/>
                                {contact.name} {contact.role ? `(${contact.role})` : ''} - {contact.email || contact.phone}
                            </div>
                        ))}
                    </div>
                )}
                <Button variant="outline" size="sm" asChild className="mt-3">
                  <Link href={`/suppliers/view/${supplier.id}`}><Eye className="mr-2 h-4 w-4"/>View Supplier</Link>
                </Button>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {totalResults === 0 && !isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-lg">No results found for "{query}".</p>
            <p>Try a different search term or check your spelling.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export default function SearchPage() {
  return (
    // Suspense boundary is good practice for pages using useSearchParams
    <Suspense fallback={<div>Loading search page...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
