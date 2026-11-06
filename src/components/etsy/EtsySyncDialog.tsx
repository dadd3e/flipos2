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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Store, KeyRound, Download, RefreshCw, CheckCircle2, AlertTriangle, 
  ExternalLink, Package, ShoppingCart, Loader2, LogIn, Copy, Check, Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EtsyConfig, InventoryItem, Sale } from "@/lib/types";
import { RESELLER_ETSY_CONFIG_KEY, RESELLER_INVENTORY_KEY, RESELLER_SALES_KEY } from "@/lib/constants";
import { reconcileInventoryAndSales } from "@/lib/inventorySalesSync";
import { cleanQuotes } from "@/lib/utils";

interface EtsySyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "inventory" | "sales" | "settings";
  onSyncComplete?: () => void;
}

export function EtsySyncDialog({
  isOpen,
  onOpenChange,
  defaultTab = "inventory",
  onSyncComplete,
}: EtsySyncDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const [keystring, setKeystring] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [shopId, setShopId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopNameInput, setShopNameInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [lastInventorySync, setLastInventorySync] = useState<string | null>(null);
  const [lastSalesSync, setLastSalesSync] = useState<string | null>(null);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFindingShop, setIsFindingShop] = useState(false);
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);
  const [isSyncingSales, setIsSyncingSales] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const [redirectUri, setRedirectUri] = useState("");

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectUri(`${window.location.origin}/api/etsy/oauth/callback`);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(RESELLER_ETSY_CONFIG_KEY);
    if (stored) {
      try {
        const config: EtsyConfig = JSON.parse(stored);
        const key = config.keystring || config.apiKey || "";
        setKeystring(key);
        setSharedSecret(config.sharedSecret || "");
        setShopId(config.shopId || "");
        setShopName(config.shopName || "");
        setShopNameInput(config.shopName || "");
        setAccessToken(config.accessToken || "");
        setRefreshToken(config.refreshToken || "");
        setIsConnected(!!(config.isConnected && config.shopId));
        setLastInventorySync(config.lastInventorySync || null);
        setLastSalesSync(config.lastSalesSync || null);
      } catch (e) {
        console.error("Failed to parse Etsy config:", e);
      }
    }
  }, [isOpen]);

  const saveConfig = (newConfig: Partial<EtsyConfig>) => {
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(RESELLER_ETSY_CONFIG_KEY) || "{}");
      } catch {
        return {};
      }
    })();
    const merged: EtsyConfig = {
      ...existing,
      keystring,
      apiKey: keystring,
      sharedSecret: newConfig.sharedSecret ?? sharedSecret,
      shopId: newConfig.shopId ?? shopId,
      shopName: newConfig.shopName ?? shopName,
      accessToken: newConfig.accessToken ?? accessToken,
      refreshToken: newConfig.refreshToken ?? refreshToken,
      ...newConfig,
    };
    localStorage.setItem(RESELLER_ETSY_CONFIG_KEY, JSON.stringify(merged));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: RESELLER_ETSY_CONFIG_KEY,
        newValue: JSON.stringify(merged),
        storageArea: localStorage,
      })
    );
  };

  // Listen for OAuth message from the popup window, broadcast channel, or storage
  useEffect(() => {
    const handleAuthData = (data: any) => {
      if (data?.exchangeSuccess) {
        setIsLoggingIn(false);
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        if (data.shopId) setShopId(data.shopId);
        if (data.shopName) {
          setShopName(data.shopName);
          setShopNameInput(data.shopName);
        }
        setIsConnected(true);
        saveConfig({
          keystring: data.apiKey || keystring,
          apiKey: data.apiKey || keystring,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          shopId: data.shopId || shopId,
          shopName: data.shopName || shopName,
          isConnected: true,
        });
        toast({
          title: "Connected to Etsy!",
          description: data.shopName
            ? `Logged in to shop "${data.shopName}". Ready to sync active inventory & sales!`
            : "Etsy connection verified.",
        });
      } else if (data?.error) {
        setIsLoggingIn(false);
        toast({
          title: "Etsy Connection Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "ETSY_AUTH_SUCCESS" || event.data?.type === "ETSY_AUTH_COMPLETE") {
        handleAuthData(event.data.data);
      } else if (event.data?.type === "ETSY_AUTH_ERROR") {
        setIsLoggingIn(false);
        toast({
          title: "Etsy Authorization Error",
          description: event.data.error,
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("etsy_oauth_channel");
      bc.onmessage = (e) => {
        if (e.data?.type === "ETSY_AUTH_SUCCESS" || e.data?.type === "ETSY_AUTH_COMPLETE") {
          handleAuthData(e.data.data);
        }
      };
    } catch (e) {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === RESELLER_ETSY_CONFIG_KEY && e.newValue) {
        try {
          const config = JSON.parse(e.newValue);
          if (config?.isConnected) {
            setIsLoggingIn(false);
            setKeystring(config.keystring || config.apiKey || "");
            setShopId(config.shopId || "");
            setShopName(config.shopName || "");
            setShopNameInput(config.shopName || "");
            setAccessToken(config.accessToken || "");
            setRefreshToken(config.refreshToken || "");
            setIsConnected(true);
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, [keystring, shopId, shopName]);

  const handleLoginViaEtsy = async () => {
    if (!keystring.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Etsy API Key (Keystring) first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const callbackUrl = `${window.location.origin}/api/etsy/oauth/callback`;
      const res = await fetch("/api/etsy/oauth/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keystring,
          sharedSecret,
          shopName: shopNameInput.trim(),
          redirectUri: callbackUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate Etsy login link.");
      }

      sessionStorage.setItem("etsy_pkce_verifier", data.codeVerifier);
      sessionStorage.setItem("etsy_pkce_keystring", keystring.trim());
      sessionStorage.setItem("etsy_pkce_redirect_uri", callbackUrl);

      // Save the API key in local state
      saveConfig({ keystring: keystring.trim(), apiKey: keystring.trim() });

      // Open the Etsy OAuth login popup directly
      const authWindow = window.open(
        data.authUrl,
        "etsy_oauth_popup",
        "width=650,height=750,left=150,top=80"
      );

      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to complete Etsy login.",
          variant: "destructive",
        });
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      toast({
        title: "Error Starting Etsy Login",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleFindShopByName = async () => {
    if (!keystring.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Etsy API Key (Keystring) first.",
        variant: "destructive",
      });
      return;
    }
    if (!shopNameInput.trim()) {
      toast({
        title: "Shop Name Required",
        description: "Please type the name of your Etsy shop (e.g., MyCoolShop).",
        variant: "destructive",
      });
      return;
    }

    setIsFindingShop(true);
    try {
      const res = await fetch("/api/etsy/find-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keystring,
          sharedSecret,
          shopName: shopNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not find Etsy shop.");
      }

      setShopId(data.shop.shopId);
      setShopName(data.shop.shopName);
      setIsConnected(true);

      saveConfig({
        keystring: keystring.trim(),
        apiKey: keystring.trim(),
        sharedSecret,
        shopId: data.shop.shopId,
        shopName: data.shop.shopName,
        isConnected: true,
      });

      toast({
        title: "Shop Located!",
        description: `Found shop "${data.shop.shopName}" (Numeric ID: ${data.shop.shopId}). Active listings: ${data.shop.listingActiveCount}.`,
      });
    } catch (err: any) {
      toast({
        title: "Shop Lookup Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsFindingShop(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAccessToken("");
    setShopId("");
    setShopName("");
    setShopNameInput("");
    saveConfig({
      accessToken: "",
      shopId: "",
      shopName: "",
      isConnected: false,
    });
    toast({
      title: "Disconnected",
      description: "Etsy connection cleared.",
    });
  };

  const copyCallbackUrl = () => {
    if (redirectUri) {
      navigator.clipboard.writeText(redirectUri);
      setCopiedCallback(true);
      toast({ title: "Copied!", description: "Callback URL copied to clipboard." });
      setTimeout(() => setCopiedCallback(false), 2500);
    }
  };

  const handleSyncInventory = async () => {
    if (!keystring.trim() || !shopId.trim()) {
      toast({
        title: "Connection Needed",
        description: "Please click 'Log in with Etsy' or enter your Shop Name first.",
        variant: "destructive",
      });
      setActiveTab("settings");
      return;
    }

    setIsSyncingInventory(true);
    try {
      const res = await fetch("/api/etsy/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keystring, sharedSecret, shopId, accessToken, refreshToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch Etsy listings");
      }

      if (data.newAccessToken) {
        setAccessToken(data.newAccessToken);
        if (data.newRefreshToken) setRefreshToken(data.newRefreshToken);
        saveConfig({
          accessToken: data.newAccessToken,
          refreshToken: data.newRefreshToken || refreshToken,
        });
      }

      const importedItems: InventoryItem[] = data.items || [];
      const currentStored = localStorage.getItem(RESELLER_INVENTORY_KEY);
      const existingInventory: InventoryItem[] = currentStored ? JSON.parse(currentStored) : [];

      let addedCount = 0;
      let updatedCount = 0;

      const updatedInventory = [...existingInventory];

      importedItems.forEach((imported) => {
        const cleanedName = cleanQuotes(imported.name);
        const cleanedNotes = cleanQuotes(imported.additionalNotes);

        const existingIdx = updatedInventory.findIndex(
          (item) => item.etsyListingId === imported.etsyListingId
        );

        if (existingIdx > -1) {
          const original = updatedInventory[existingIdx];
          updatedInventory[existingIdx] = {
            ...original,
            name: cleanedName,
            quantity: imported.quantity,
            targetPrice: imported.targetPrice,
            potentialProfit: imported.targetPrice
              ? imported.targetPrice * 0.85 - (original.totalPurchaseCost || 0)
              : original.potentialProfit,
            itemImageUrl: imported.itemImageUrl || original.itemImageUrl,
            additionalNotes: cleanedNotes || original.additionalNotes,
            etsyUrl: imported.etsyUrl,
            status: "Active",
          };
          updatedCount++;
        } else {
          updatedInventory.unshift({
            ...imported,
            name: cleanedName,
            additionalNotes: cleanedNotes,
          });
          addedCount++;
        }
      });

      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventory));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RESELLER_INVENTORY_KEY,
          newValue: JSON.stringify(updatedInventory),
          storageArea: localStorage,
        })
      );

      const nowIso = new Date().toISOString();
      setLastInventorySync(nowIso);
      saveConfig({ lastInventorySync: nowIso, isConnected: true });

      toast({
        title: "Etsy Inventory Synced!",
        description: `Imported ${addedCount} new active items, updated ${updatedCount} existing items.`,
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      if (
        err.message?.toLowerCase().includes("reconnect") ||
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("expired")
      ) {
        setActiveTab("settings");
      }
      toast({
        title: "Inventory Sync Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingInventory(false);
    }
  };

  const handleSyncSales = async () => {
    if (!keystring.trim() || !shopId.trim() || !accessToken.trim()) {
      toast({
        title: "Etsy Login Required",
        description: "To import sales receipts and fees, please click 'Log In with Etsy' under the Connect tab.",
        variant: "destructive",
      });
      setActiveTab("settings");
      return;
    }

    setIsSyncingSales(true);
    try {
      const res = await fetch("/api/etsy/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keystring, sharedSecret, shopId, accessToken, refreshToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch Etsy sales receipts");
      }

      if (data.newAccessToken) {
        setAccessToken(data.newAccessToken);
        if (data.newRefreshToken) setRefreshToken(data.newRefreshToken);
        saveConfig({
          accessToken: data.newAccessToken,
          refreshToken: data.newRefreshToken || refreshToken,
        });
      }

      const importedSales: Sale[] = data.sales || [];
      const currentStoredSales = localStorage.getItem(RESELLER_SALES_KEY);
      const existingSales: Sale[] = currentStoredSales ? JSON.parse(currentStoredSales) : [];

      const currentStoredInv = localStorage.getItem(RESELLER_INVENTORY_KEY);
      const inventory: InventoryItem[] = currentStoredInv ? JSON.parse(currentStoredInv) : [];

      let addedSalesCount = 0;
      let alreadyImportedCount = 0;
      let createdInventoryCount = 0;
      let updatedInventoryCount = 0;

      const newSalesToAppend: Sale[] = [];
      const updatedInventory = [...inventory];

      for (const rawSale of importedSales) {
        rawSale.itemName = cleanQuotes(rawSale.itemName);
        const existingIdx = existingSales.findIndex(
          (s) =>
            (rawSale.etsyTransactionId && s.etsyTransactionId === rawSale.etsyTransactionId) ||
            (rawSale.etsyReceiptId &&
              s.etsyReceiptId === rawSale.etsyReceiptId &&
              s.itemName === rawSale.itemName)
        );

        if (existingIdx > -1) {
          alreadyImportedCount++;
          // Ensure existing sale has photo and listing metadata if missing
          if (rawSale.itemImageUrl && !existingSales[existingIdx].itemImageUrl) {
            existingSales[existingIdx].itemImageUrl = rawSale.itemImageUrl;
          }
          if (rawSale.etsyListingId && !existingSales[existingIdx].etsyListingId) {
            existingSales[existingIdx].etsyListingId = rawSale.etsyListingId;
          }
          if (rawSale.etsyUrl && !existingSales[existingIdx].etsyUrl) {
            existingSales[existingIdx].etsyUrl = rawSale.etsyUrl;
          }
          continue;
        }

        // Match inventory item if one already exists
        const matchedIndex = updatedInventory.findIndex(
          (inv) =>
            (rawSale.etsyListingId && Number(inv.etsyListingId) === Number(rawSale.etsyListingId)) ||
            (inv.name && rawSale.itemName && inv.name.trim().toLowerCase() === rawSale.itemName.trim().toLowerCase()) ||
            (rawSale.itemId && inv.id === rawSale.itemId)
        );

        let finalItemId = rawSale.itemId;
        let unitCost = 0;

        if (matchedIndex > -1) {
          const matched = updatedInventory[matchedIndex];
          finalItemId = matched.id;
          unitCost = matched.price || 0;

          // Always attach the primary photo to the inventory item if available
          const effectivePhoto = rawSale.itemImageUrl || matched.itemImageUrl;

          // Deduct quantity if active, or transition to Sold
          let newQty = matched.quantity;
          let newStatus = matched.status;
          if (matched.status === "Active") {
            const soldQty = rawSale.quantitySold || 1;
            if (matched.quantity <= soldQty) {
              newStatus = "Sold";
              newQty = 0;
            } else {
              newQty = matched.quantity - soldQty;
            }
          }

          updatedInventory[matchedIndex] = {
            ...matched,
            itemImageUrl: effectivePhoto,
            quantity: newQty,
            status: newStatus,
            etsyListingId: matched.etsyListingId || rawSale.etsyListingId,
            etsyUrl: matched.etsyUrl || rawSale.etsyUrl,
          };
          updatedInventoryCount++;
        } else {
          // Automatically create inventory item if one does not exist
          const newInvId = crypto.randomUUID();
          finalItemId = newInvId;

          const newInvItem: InventoryItem = {
            id: newInvId,
            name: rawSale.itemName,
            category: "Etsy Sales",
            status: "Sold",
            quantity: rawSale.quantitySold || 1,
            price: 0, // COGS defaults to 0 until user enters purchase cost
            totalPurchaseCost: 0,
            source: "Etsy",
            targetPrice: rawSale.etsySalePrice || rawSale.grossSaleAmount,
            potentialProfit: rawSale.netRevenuePreCOGS || 0,
            itemImageUrl: rawSale.itemImageUrl,
            etsyListingId: rawSale.etsyListingId,
            etsyUrl: rawSale.etsyUrl,
            listedOn: ["Etsy"],
            dateAdded: rawSale.saleDate || new Date().toISOString(),
            purchaseDate: (rawSale.saleDate || new Date().toISOString()).split("T")[0],
            additionalNotes: `Auto-created from Etsy sale (Receipt #${rawSale.etsyReceiptId || ""}${rawSale.etsyTransactionId ? `, Tx #${rawSale.etsyTransactionId}` : ""}). Primary photo imported. Enter purchase cost (COGS) in inventory to calculate exact profit.`,
          };

          updatedInventory.unshift(newInvItem);
          createdInventoryCount++;
        }

        const saleWithCOGS: Sale = {
          ...rawSale,
          itemId: finalItemId,
          totalPurchaseCostOfItemSold: unitCost,
          profit: parseFloat(
            (rawSale.netRevenuePreCOGS - unitCost * (rawSale.quantitySold || 1)).toFixed(2)
          ),
          needsShippingCostEntry: true,
          soldVia: "Etsy",
        } as Sale;

        newSalesToAppend.push(saleWithCOGS);
        addedSalesCount++;
      }

      const updatedSales = [...newSalesToAppend, ...existingSales];
      localStorage.setItem(RESELLER_SALES_KEY, JSON.stringify(updatedSales));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RESELLER_SALES_KEY,
          newValue: JSON.stringify(updatedSales),
          storageArea: localStorage,
        })
      );

      // Save updated inventory
      localStorage.setItem(RESELLER_INVENTORY_KEY, JSON.stringify(updatedInventory));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RESELLER_INVENTORY_KEY,
          newValue: JSON.stringify(updatedInventory),
          storageArea: localStorage,
        })
      );

      // Reconcile any missing links or photos across inventory and sales
      reconcileInventoryAndSales();

      const nowIso = new Date().toISOString();
      setLastSalesSync(nowIso);
      saveConfig({ lastSalesSync: nowIso, isConnected: true });

      const details = [];
      if (addedSalesCount > 0) details.push(`${addedSalesCount} new sale(s) imported`);
      if (createdInventoryCount > 0) details.push(`${createdInventoryCount} new sold inventory item(s) created with photos`);
      if (updatedInventoryCount > 0) details.push(`${updatedInventoryCount} inventory item(s) updated`);
      if (alreadyImportedCount > 0) details.push(`${alreadyImportedCount} already imported`);

      toast({
        title: "Etsy Sales Synced!",
        description: details.join(". ") || "Sales up to date.",
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      if (
        err.message?.toLowerCase().includes("reconnect") ||
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("expired")
      ) {
        setActiveTab("settings");
      }
      toast({
        title: "Sales Sync Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingSales(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-orange-600" />
              <DialogTitle className="font-headline text-xl">Etsy Shop Integration</DialogTitle>
            </div>
            {isConnected && shopId ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected {shopName ? `(${shopName})` : `(ID: ${shopId})`}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not Connected</Badge>
            )}
          </div>
          <DialogDescription>
            Import active inventory listings and completed sales with exact fees directly from Etsy.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="inventory" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="h-4 w-4" /> Active Inventory
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-1 text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4" /> Sales &amp; Fees
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs sm:text-sm">
              <KeyRound className="h-4 w-4" /> Connect Shop
            </TabsTrigger>
          </TabsList>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="space-y-4 pt-3">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-600" /> Import Active Etsy Listings
                </CardTitle>
                <CardDescription className="text-xs">
                  Pulls all active items currently listed in your Etsy shop, including photos, titles, prices, and quantities.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-md">
                  <div>• Added as <strong>Active</strong> items with platform tag <strong>Etsy</strong>.</div>
                  <div>• Existing listings with the same Etsy ID update price &amp; quantity without altering your purchase cost.</div>
                  {lastInventorySync && (
                    <div className="pt-1 text-foreground font-medium">Last synced: {new Date(lastInventorySync).toLocaleString()}</div>
                  )}
                </div>

                <Button
                  onClick={handleSyncInventory}
                  disabled={isSyncingInventory || !keystring || !shopId}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSyncingInventory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Listings from Etsy...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Sync Active Inventory from Etsy
                    </>
                  )}
                </Button>

                {(!keystring || !shopId) && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Please connect your shop first under the "Connect Shop" tab.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SALES TAB */}
          <TabsContent value="sales" className="space-y-4 pt-3">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-orange-600" /> Import Completed Etsy Sales
                </CardTitle>
                <CardDescription className="text-xs">
                  Pulls paid receipts. Platform is set to "Etsy" and actual Etsy payment processing &amp; transaction fees are recorded automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-md">
                  <div>• <strong>Auto-Creates Sold Inventory:</strong> If a sold item is not in FlipOS inventory, an inventory item with status <strong>Sold</strong> and its primary photo is automatically created.</div>
                  <div>• <strong>Primary Photos:</strong> Listing photos are retrieved from Etsy and attached to both sales history and inventory.</div>
                  <div>• <strong>Sold Via Platform:</strong> Etsy with real payment processing &amp; transaction fees recorded.</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>• <strong>Outbound Shipping Cost:</strong> Marked with</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 text-amber-700 bg-amber-50">Needs Shipping $</Badge>
                    <span>so you can enter what you paid for postage.</span>
                  </div>
                  {lastSalesSync && (
                    <div className="pt-1 text-foreground font-medium">Last synced: {new Date(lastSalesSync).toLocaleString()}</div>
                  )}
                </div>

                <Button
                  onClick={handleSyncSales}
                  disabled={isSyncingSales || !keystring || !shopId || !accessToken}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSyncingSales ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Orders from Etsy...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" /> Sync Sales Receipts from Etsy
                    </>
                  )}
                </Button>

                {!accessToken && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    To import sales, click "Log in with Etsy" under the Connect Shop tab.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS / ONE-CLICK LOGIN TAB */}
          <TabsContent value="settings" className="space-y-4 pt-3">
            <div className="space-y-4">
              {/* Step 1: Keystring */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="etsy-api-key" className="font-semibold text-sm">
                    1. Etsy Keystring (Client ID) <span className="text-destructive">*</span>
                  </Label>
                  <a
                    href="https://www.etsy.com/developers/your-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                  >
                    Etsy Developer Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  id="etsy-api-key"
                  placeholder="Paste your Etsy Keystring here"
                  value={keystring}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setKeystring(val);
                    saveConfig({ keystring: val, apiKey: val });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Found in your registered app under "Keystring" on the Etsy Developer site.
                </p>
              </div>

              {/* Step 1b: Shared Secret */}
              <div className="space-y-2">
                <Label htmlFor="etsy-shared-secret" className="font-semibold text-sm">
                  2. Etsy Shared Secret <span className="text-xs font-normal text-muted-foreground">(Required by Etsy Open API v3)</span>
                </Label>
                <Input
                  id="etsy-shared-secret"
                  type="password"
                  placeholder="Paste your Etsy Shared Secret here"
                  value={sharedSecret}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setSharedSecret(val);
                    saveConfig({ sharedSecret: val });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Found right next to Keystring under "Your Apps" in the Etsy Developer Portal.
                </p>
              </div>

              {/* Step 2: One-click Etsy Login */}
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                      <LogIn className="h-4 w-4 text-orange-600" />
                      3. Connect Your Etsy Account
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click below to log in directly via Etsy. We will automatically detect your shop name, shop ID, and authorization.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleLoginViaEtsy}
                  disabled={isLoggingIn || !keystring.trim()}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for Etsy Authorization...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Log In with Etsy
                    </>
                  )}
                </Button>

                {isConnected && shopId && (
                  <div className="bg-white dark:bg-neutral-900 rounded p-2.5 border text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <div>
                        <span className="font-semibold">Connected to:</span> {shopName || "Etsy Shop"}
                        <span className="text-muted-foreground ml-1.5">(ID: {shopId})</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive h-7 px-2 text-xs">
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>

              {/* Optional: Look up by Shop Name (for inventory-only without OAuth) */}
              <div className="rounded-lg border p-3.5 space-y-2.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="etsy-shop-name" className="text-xs font-semibold">
                    Alternative: Connect with Shop Name
                  </Label>
                  <span className="text-[11px] text-muted-foreground">No login needed for Active Inventory</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="etsy-shop-name"
                    placeholder="Enter your shop name (e.g. VintageHaven)"
                    value={shopNameInput}
                    onChange={(e) => setShopNameInput(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={handleFindShopByName}
                    disabled={isFindingShop || !keystring.trim() || !shopNameInput.trim()}
                    className="shrink-0 text-xs"
                  >
                    {isFindingShop ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5 mr-1" /> Find Shop
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Etsy Developer App Setup Helper */}
              {redirectUri && (
                <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5 border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Etsy App Callback URL:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCallbackUrl}
                      className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
                    >
                      {copiedCallback ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-green-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Callback URL
                        </>
                      )}
                    </Button>
                  </div>
                  <code className="block bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono break-all select-all">
                    {redirectUri}
                  </code>
                  <p className="text-[11px] text-muted-foreground">
                    In your Etsy Developer app settings, paste this into the "Callback URLs" field.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
