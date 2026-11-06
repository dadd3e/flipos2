
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, Edit3, Lightbulb, CalendarDays, DollarSign, Users, Link2 as LinkIcon, StickyNote, Clock, PlusCircle, Building, UserCircle
} from "lucide-react";
import type { SourcedItemWish, Supplier, SourcedItemStatus, Note } from "@/lib/types";
import { SOURCING_OPPORTUNITIES_KEY, RESELLER_SUPPLIERS_KEY, SOURCED_ITEM_STATUSES, SUPPLIER_TYPES } from "@/lib/constants";
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

function ViewSourcingOpportunityContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [opportunity, setOpportunity] = useState<SourcedItemWish | null | undefined>(undefined); // undefined: loading, null: not found
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAddUpdateDialogOpen, setIsAddUpdateDialogOpen] = useState(false);
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const { toast } = useToast();


  useEffect(() => {
    if (id) {
      const storedOpportunitiesRaw = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY);
      if (storedOpportunitiesRaw) {
        try {
          const opportunitiesArray: SourcedItemWish[] = JSON.parse(storedOpportunitiesRaw);
          const foundOpportunity = opportunitiesArray.find(op => op.id === id);
          setOpportunity(foundOpportunity || null);
        } catch (e) {
          console.error("Failed to parse sourcing opportunities from localStorage", e);
          setOpportunity(null);
        }
      } else {
        setOpportunity(null); // No opportunities stored
      }

      const storedSuppliersRaw = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
      if (storedSuppliersRaw) {
        try {
          const parsedSuppliers = JSON.parse(storedSuppliersRaw);
          if (Array.isArray(parsedSuppliers)) {
            setSuppliers(parsedSuppliers);
          }
        } catch (e) {
          console.error("Failed to parse suppliers from localStorage", e);
          setSuppliers([]);
        }
      } else {
        setSuppliers([]);
      }
    } else {
      setOpportunity(null); // No ID provided
    }
  }, [id]);

  const getSupplierNameAndType = (supplierId?: string) => {
    if (!supplierId) return "N/A";
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return "Unknown Supplier";
    const typeLabel = SUPPLIER_TYPES.find(st => st.value === supplier.type)?.label || supplier.type;
    return `${supplier.name} (${typeLabel})`;
  };

  const formatDate = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, includeTime ? "MMMM d, yyyy p" : "MMMM d, yyyy") : "Invalid Date";
    } catch {
      return "Invalid Date";
    }
  };
  
  const getStatusDetails = (statusValue?: SourcedItemStatus) => {
    if (!statusValue) return { label: "N/A", icon: Lightbulb };
    return SOURCED_ITEM_STATUSES.find(s => s.value === statusValue) || { label: statusValue, icon: Lightbulb };
  };

  const handleAddUpdate = () => {
    if (!opportunity || !newUpdateContent.trim()) {
      toast({ title: "Error", description: "Update content cannot be empty.", variant: "destructive" });
      return;
    }

    const newUpdate: Note = {
      id: crypto.randomUUID(),
      content: newUpdateContent.trim(),
      timestamp: new Date().toISOString(),
      linkedTo: opportunity.id, // Link to the opportunity itself
      linkedToName: opportunity.itemName, 
    };

    const updatedOpportunity: SourcedItemWish = {
      ...opportunity,
      updatesLog: [...(opportunity.updatesLog || []), newUpdate],
      dateUpdated: new Date().toISOString(),
    };

    setOpportunity(updatedOpportunity); // Update local state

    const storedOpportunitiesRaw = localStorage.getItem(SOURCING_OPPORTUNITIES_KEY);
    const allOpportunities: SourcedItemWish[] = storedOpportunitiesRaw ? JSON.parse(storedOpportunitiesRaw) : [];
    const updatedAllOpportunities = allOpportunities.map(op => op.id === opportunity.id ? updatedOpportunity : op);
    localStorage.setItem(SOURCING_OPPORTUNITIES_KEY, JSON.stringify(updatedAllOpportunities));
    window.dispatchEvent(new StorageEvent('storage', { key: SOURCING_OPPORTUNITIES_KEY, newValue: JSON.stringify(updatedAllOpportunities), storageArea: localStorage }));

    toast({ title: "Update Added", description: "The new update has been logged." });
    setIsAddUpdateDialogOpen(false);
    setNewUpdateContent("");
  };

  const sortedUpdates = useMemo(() => {
    if (!opportunity || !opportunity.updatesLog) return [];
    return [...opportunity.updatesLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [opportunity]);


  if (opportunity === undefined) {
    return <div className="text-center py-10">Loading opportunity details...</div>;
  }

  if (opportunity === null) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Sourcing opportunity not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/sourcing">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Opportunities List
          </Link>
        </Button>
      </div>
    );
  }
  
  const { label: statusLabel, icon: StatusIcon } = getStatusDetails(opportunity.status);

  const DetailItem = ({ icon: Icon, label, value, valueClassName, isBadge, badgeVariant }: { icon: React.ElementType, label: string, value?: string | number | null, valueClassName?: string, isBadge?: boolean, badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined }) => (
    <div className="flex items-start py-2">
      <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 shrink-0" />
      <div className="flex-grow">
        <p className="text-sm text-muted-foreground">{label}</p>
        {isBadge && value ? (
          <Badge variant={badgeVariant || 'secondary'} className="mt-0.5">{value}</Badge>
        ) : (
          <p className={`text-base font-medium ${valueClassName}`}>{value || "N/A"}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
    <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-2rem)]">
      <div className="space-y-6 p-1 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline truncate" title={opportunity.itemName}>{opportunity.itemName}</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/sourcing">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/sourcing/add?editId=${opportunity.id}`}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Opportunity
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Opportunity Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <DetailItem icon={StatusIcon || Lightbulb} label="Status" value={statusLabel} isBadge />
            <DetailItem icon={CalendarDays} label="Target/Follow-up Date" value={formatDate(opportunity.targetDate)} />
            <DetailItem icon={DollarSign} label="Target Buy Price" value={opportunity.targetBuyPrice !== undefined ? `$${opportunity.targetBuyPrice.toFixed(2)}` : undefined} />
            <DetailItem icon={Users} label="Linked Supplier" value={getSupplierNameAndType(opportunity.supplierId)} />
          </CardContent>
        </Card>

        {opportunity.potentialSources && (
            <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5"/>Potential Sources</CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap">{opportunity.potentialSources}</p>
            </CardContent>
            </Card>
        )}

        {opportunity.notes && (
            <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5"/>Description / Main Notes</CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
            </CardContent>
            </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" /> Updates &amp; Activity Log</CardTitle>
              <CardDescription>Timestamped updates for this opportunity.</CardDescription>
            </div>
            <Button onClick={() => setIsAddUpdateDialogOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Update
            </Button>
          </CardHeader>
          <CardContent>
            {sortedUpdates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No updates logged yet for this opportunity.</p>
            ) : (
              <ScrollArea className="max-h-[300px] pr-3">
                <div className="space-y-4">
                  {sortedUpdates.map(update => (
                    <div key={update.id} className="p-3 border rounded-md bg-muted/30 relative">
                      <p className="text-sm whitespace-pre-wrap mb-2">{update.content}</p>
                      <div className="text-xs text-muted-foreground">
                        <span>{format(parseISO(update.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Timestamps</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
             <DetailItem icon={CalendarDays} label="Date Added" value={formatDate(opportunity.dateAdded, true)} />
             <DetailItem icon={CalendarDays} label="Last Updated" value={formatDate(opportunity.dateUpdated, true)} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>

    <Dialog open={isAddUpdateDialogOpen} onOpenChange={setIsAddUpdateDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Update</DialogTitle>
          <DialogDesc>
            Enter details for this update. It will be automatically timestamped.
          </DialogDesc>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div>
            <Label htmlFor="update-content" className="mb-1 block">Update Content</Label>
            <Textarea
              id="update-content"
              placeholder="Type your update here..."
              value={newUpdateContent}
              onChange={(e) => setNewUpdateContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => setNewUpdateContent("")}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleAddUpdate} disabled={!newUpdateContent.trim()}>Save Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function ViewSourcingOpportunityPage() {
    return (
        <Suspense fallback={<div>Loading opportunity details...</div>}>
            <ViewSourcingOpportunityContent />
        </Suspense>
    )
}
