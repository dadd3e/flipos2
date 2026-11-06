
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ListChecks, Palette, ShieldCheck, SlidersHorizontal, Edit3, Trash2, PlusCircle, LayoutDashboard, 
  Layers, Upload, Download, FileText, FileQuestion, UserCircle, Settings as SettingsIconLucide, Database, Brush, BellRing, ChevronDown,
  Store, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, LogIn, Copy, Check, Search, AlertTriangle, Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    ITEM_SOURCES, AVAILABLE_DASHBOARD_CARDS, DEFAULT_VISIBLE_CARDS, DASHBOARD_SETTINGS_KEY,
    RESELLER_CATEGORIES_KEY, DEFAULT_CATEGORIES, APP_THEME_KEY, AVAILABLE_THEMES, DEFAULT_THEME,
    RESELLER_INVENTORY_KEY, RESELLER_SUPPLIERS_KEY, DEFAULT_SUPPLIERS,
    RESELLER_PROFILE_BUSINESS_NAME_KEY, RESELLER_PROFILE_EMAIL_KEY, DEFAULT_BUSINESS_NAME, DEFAULT_EMAIL,
    RESELLER_ETSY_CONFIG_KEY
} from "@/lib/constants";
import type { DashboardCardKey, DashboardSettings, AppTheme, InventoryItem, Supplier, EtsyConfig } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInventoryCsv, parseInventoryCsv, generateSuppliersCsv, parseSuppliersCsv } from "@/lib/csvUtils";
import { EtsySyncDialog } from "@/components/etsy/EtsySyncDialog";


const SAMPLE_INVENTORY_CSV_CONTENT = `id,name,nameOnInvoice,category,status,quantity,price,purchaseDate,dateAdded,boxNumber,itemImageUrl,buyersPremiumPercent,shippingAndHandling,isTaxablePurchase,totalPurchaseCost,source,invoiceNumber,storeName,supplierId,targetPrice,potentialProfit,additionalNotes,listedOn
inv_sample_1,Vintage Ceramic Vase,Home Goods,Active,1,25.00,2023-10-15,2023-10-20,A1,https://placehold.co/100x100.png,0,5.00,false,30.00,Thrift Store,,Goodwill Main St,sup_sample_store,50.00,12.50,"Hand-painted, minor chip on base",eBay|Etsy
inv_sample_2,Rare Comic Book,Collectibles,Pending,1,150.00,2023-11-01,2023-11-05,B2,https://placehold.co/150x150.png,10,7.50,true,181.08,HiBid,INV-001,,sup_sample_auction,300.00,104.92,"First edition, slight wear",
inv_sample_3,Designer Handbag,Clothing,Active,1,250.00,2023-09-20,2023-09-22,C10,,15,10.00,false,297.50,PrivateSale,,,sup_sample_seller,450.00,135.00,"Authentic, excellent condition. Includes dust bag.",Poshmark`;

const SAMPLE_SUPPLIERS_CSV_CONTENT = `id,name,type,address,website,generalNotes,dateAdded,lastUpdated,contact1_name,contact1_role,contact1_email,contact1_phone,contact1_contactNotes,contactsCount,note1_content,note1_timestamp,note1_linkedTo,note1_linkedToName,notesCount
sup_sample_store,Goodwill Main St,Store,"123 Charity Lane, Anytown, USA",https://goodwill.example.com,"Regular weekly visits for new stock",2023-01-15 10:00:00,2023-10-20 14:30:00,Sarah Manager,Store Manager,sarah@goodwill.example.com,555-1234,"Prefers calls in morning regarding donations",1,"Discussed bulk purchase options.",2023-10-19 11:00:00,supplier,"Supplier: Goodwill Main St",1
sup_sample_auction,AuctionPro House,AuctionHouse,"456 Bidder Ave, Cityville",https://auctionpro.example.com,"Monthly auctions, specializes in antiques and collectibles.",2022-05-10 09:00:00,2023-11-01 16:00:00,John Doe,Auctioneer,john.doe@auctionpro.example.com,555-5678,"Always has interesting lots. Preview days are Mondays.",1,"Won lot #345 (Rare Comic Book), payment confirmed via email to John Doe",2023-11-01 15:30:00,sup_sample_auction_contact_1,"Contact: John Doe",1
sup_sample_seller,Jane Smith Collections,PrivateSeller,"By Appointment Only",,"Sells high-end designer items.",2023-08-01 12:00:00,2023-09-20 10:15:00,Jane Smith,Owner,jane.smith@email.com,555-8765,"Contact via email first. Very knowledgeable.",1,"Negotiated price for Designer Handbag.",2023-09-20 10:00:00,supplier,"Supplier: Jane Smith Collections",1`;

type SettingsCategoryValue = "profile" | "dashboard" | "categories" | "theme" | "data" | "integrations" | "advanced";

interface SettingsCategory {
  value: SettingsCategoryValue;
  label: string;
  icon: React.ElementType;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { value: "profile", label: "Business Profile", icon: UserCircle },
  { value: "integrations", label: "Etsy Integration", icon: Store },
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "categories", label: "Item Categories", icon: Layers },
  { value: "theme", label: "Appearance", icon: Brush },
  { value: "data", label: "Data Management", icon: Database },
  { value: "advanced", label: "Advanced Customization", icon: SettingsIconLucide },
];

export function SettingsContent() {
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_NAME);
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [currentSourceOptions, setCurrentSourceOptions] = useState<string[]>([]);
  const [newSourceOption, setNewSourceOption] = useState("");
  const [visibleDashboardCards, setVisibleDashboardCards] = useState<DashboardCardKey[]>(DEFAULT_VISIBLE_CARDS);
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  const [newItemCategory, setNewItemCategory] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(DEFAULT_THEME);
  const { toast } = useToast();

  const inventoryImportRef = useRef<HTMLInputElement>(null);
  const supplierImportRef = useRef<HTMLInputElement>(null);
  
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState<SettingsCategoryValue>("integrations");
  const [etsyConfig, setEtsyConfig] = useState<EtsyConfig>({ keystring: '', apiKey: '', shopId: '', accessToken: '' });
  const [isEtsySyncOpen, setIsEtsySyncOpen] = useState(false);
  const [etsySyncTab, setEtsySyncTab] = useState<'inventory' | 'sales'>('inventory');
  const [isLoggingInEtsy, setIsLoggingInEtsy] = useState(false);
  const [isFindingShop, setIsFindingShop] = useState(false);
  const [shopNameInput, setShopNameInput] = useState('');
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRedirectUri(`${window.location.origin}/api/etsy/oauth/callback`);
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') || params.get('tab');
      if (cat && SETTINGS_CATEGORIES.some(c => c.value === cat)) {
        setSelectedSettingsCategory(cat as SettingsCategoryValue);
      }
    }
  }, []);

  useEffect(() => {
    const storedBusinessName = localStorage.getItem(RESELLER_PROFILE_BUSINESS_NAME_KEY);
    if (storedBusinessName) {
      setBusinessName(storedBusinessName);
    } else {
      localStorage.setItem(RESELLER_PROFILE_BUSINESS_NAME_KEY, DEFAULT_BUSINESS_NAME);
      setBusinessName(DEFAULT_BUSINESS_NAME);
    }

    const storedEmail = localStorage.getItem(RESELLER_PROFILE_EMAIL_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      localStorage.setItem(RESELLER_PROFILE_EMAIL_KEY, DEFAULT_EMAIL);
      setEmail(DEFAULT_EMAIL);
    }

    const storedEtsyConfig = localStorage.getItem(RESELLER_ETSY_CONFIG_KEY);
    if (storedEtsyConfig) {
      try {
        const parsed = JSON.parse(storedEtsyConfig);
        if (parsed && typeof parsed === 'object') {
          const key = parsed.keystring || parsed.apiKey || '';
          setEtsyConfig({
            keystring: key,
            apiKey: key,
            sharedSecret: parsed.sharedSecret || '',
            shopId: parsed.shopId || '',
            accessToken: parsed.accessToken || '',
            shopName: parsed.shopName || '',
            isConnected: !!(parsed.isConnected && parsed.shopId),
          });
          if (parsed.shopName) {
            setShopNameInput(parsed.shopName);
          }
        }
      } catch (e) {
        console.error("Failed to parse Etsy config", e);
      }
    }

    setCurrentSourceOptions(ITEM_SOURCES);
    const storedSettings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings: DashboardSettings = JSON.parse(storedSettings);
        if (parsedSettings.visibleCards) {
          setVisibleDashboardCards(parsedSettings.visibleCards);
        }
      } catch (e) {
        console.error("Failed to parse dashboard settings from localStorage", e);
        localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify({ visibleCards: DEFAULT_VISIBLE_CARDS }));
      }
    } else {
      localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify({ visibleCards: DEFAULT_VISIBLE_CARDS }));
    }
    const storedCategories = localStorage.getItem(RESELLER_CATEGORIES_KEY);
    if (storedCategories) {
      try {
        const parsedCategories = JSON.parse(storedCategories);
        if (Array.isArray(parsedCategories)) {
          setItemCategories(parsedCategories);
        } else {
          setItemCategories(DEFAULT_CATEGORIES);
          localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        }
      } catch (e) {
        console.error("Failed to parse item categories from localStorage", e);
        setItemCategories(DEFAULT_CATEGORIES);
        localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      }
    } else {
      setItemCategories(DEFAULT_CATEGORIES);
      localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }
    const storedTheme = localStorage.getItem(APP_THEME_KEY) as AppTheme | null;
    if (storedTheme && AVAILABLE_THEMES.some(t => t.value === storedTheme)) {
      setSelectedTheme(storedTheme);
    } else {
      setSelectedTheme(DEFAULT_THEME);
    }
  }, []);

  const handleSaveProfile = useCallback(() => {
    localStorage.setItem(RESELLER_PROFILE_BUSINESS_NAME_KEY, businessName);
    localStorage.setItem(RESELLER_PROFILE_EMAIL_KEY, email);
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_PROFILE_BUSINESS_NAME_KEY, newValue: businessName, storageArea: localStorage }));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_PROFILE_EMAIL_KEY, newValue: email, storageArea: localStorage }));
    toast({ title: "Profile Saved", description: "Your business details have been updated." });
  }, [businessName, email, toast]);

  const handleSaveEtsyConfig = useCallback((newConfig?: Partial<EtsyConfig>) => {
    const key = newConfig?.keystring || newConfig?.apiKey || etsyConfig.keystring || etsyConfig.apiKey || '';
    const toSave: EtsyConfig = {
      ...etsyConfig,
      keystring: key,
      apiKey: key,
      ...(newConfig || {}),
    };
    setEtsyConfig(toSave);
    localStorage.setItem(RESELLER_ETSY_CONFIG_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ETSY_CONFIG_KEY, newValue: JSON.stringify(toSave), storageArea: localStorage }));
    toast({ title: "Etsy Settings Saved", description: "Your Etsy credentials have been updated." });
  }, [etsyConfig, toast]);

  // Listen for OAuth message from the Etsy popup window, BroadcastChannel, or storage
  useEffect(() => {
    const handleAuthData = (data: any) => {
      if (data?.exchangeSuccess) {
        setIsLoggingInEtsy(false);
        const hasShop = !!(data.shopId || etsyConfig.shopId);
        const updated: EtsyConfig = {
          keystring: data.apiKey || etsyConfig.keystring || etsyConfig.apiKey || '',
          apiKey: data.apiKey || etsyConfig.keystring || etsyConfig.apiKey || '',
          sharedSecret: data.sharedSecret || etsyConfig.sharedSecret || '',
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          shopId: data.shopId || etsyConfig.shopId,
          shopName: data.shopName || etsyConfig.shopName,
          isConnected: hasShop,
        };
        setEtsyConfig(updated);
        if (data.shopName) setShopNameInput(data.shopName);
        localStorage.setItem(RESELLER_ETSY_CONFIG_KEY, JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ETSY_CONFIG_KEY, newValue: JSON.stringify(updated), storageArea: localStorage }));
        if (hasShop) {
          toast({
            title: "Connected to Etsy!",
            description: data.shopName ? `Logged in to shop "${data.shopName}". Ready to sync active inventory & sales!` : "Etsy connection verified.",
          });
        } else {
          toast({
            title: "Etsy Authenticated",
            description: "Please enter your Etsy Shop Name below to link your inventory.",
          });
        }
      } else if (data?.error) {
        setIsLoggingInEtsy(false);
        toast({ title: 'Etsy Connection Failed', description: data.error, variant: 'destructive' });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'ETSY_AUTH_SUCCESS' || event.data?.type === 'ETSY_AUTH_COMPLETE') {
        handleAuthData(event.data.data);
      } else if (event.data?.type === 'ETSY_AUTH_ERROR') {
        setIsLoggingInEtsy(false);
        toast({ title: 'Etsy Authorization Error', description: event.data.error, variant: 'destructive' });
      }
    };

    window.addEventListener('message', handleMessage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('etsy_oauth_channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'ETSY_AUTH_SUCCESS' || e.data?.type === 'ETSY_AUTH_COMPLETE') {
          handleAuthData(e.data.data);
        }
      };
    } catch (e) {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === RESELLER_ETSY_CONFIG_KEY && e.newValue) {
        try {
          const config = JSON.parse(e.newValue);
          if (config?.isConnected) {
            setIsLoggingInEtsy(false);
            setEtsyConfig(config);
            if (config.shopName) setShopNameInput(config.shopName);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, [etsyConfig, toast]);

  const handleLoginViaEtsy = useCallback(async () => {
    const key = etsyConfig.keystring || etsyConfig.apiKey || '';
    if (!key.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Etsy API Key (Keystring) first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingInEtsy(true);
    try {
      const callbackUrl = `${window.location.origin}/api/etsy/oauth/callback`;
      const res = await fetch('/api/etsy/oauth/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          sharedSecret: etsyConfig.sharedSecret || '',
          shopName: shopNameInput.trim(),
          redirectUri: callbackUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate Etsy login link.');
      }

      sessionStorage.setItem('etsy_pkce_verifier', data.codeVerifier);
      sessionStorage.setItem('etsy_pkce_keystring', key.trim());
      sessionStorage.setItem('etsy_pkce_redirect_uri', callbackUrl);

      // Open the Etsy OAuth login popup directly
      const authWindow = window.open(
        data.authUrl,
        'etsy_oauth_popup',
        'width=650,height=750,left=150,top=80'
      );

      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to complete Etsy login.",
          variant: "destructive"
        });
        setIsLoggingInEtsy(false);
      }
    } catch (err: any) {
      setIsLoggingInEtsy(false);
      toast({ title: "Login Error", description: err.message, variant: "destructive" });
    }
  }, [etsyConfig, shopNameInput, toast]);

  const handleFindShopByName = useCallback(async () => {
    const key = etsyConfig.keystring || etsyConfig.apiKey || '';
    if (!key.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Etsy API Key (Keystring) first.",
        variant: "destructive"
      });
      return;
    }
    if (!shopNameInput.trim()) {
      toast({
        title: "Shop Name Required",
        description: "Please enter your Etsy shop name.",
        variant: "destructive"
      });
      return;
    }

    setIsFindingShop(true);
    try {
      const res = await fetch('/api/etsy/find-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          sharedSecret: etsyConfig.sharedSecret || '',
          shopName: shopNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not find Etsy shop.');
      }

      const updated: EtsyConfig = {
        ...etsyConfig,
        shopId: data.shop.shopId,
        shopName: data.shop.shopName,
        isConnected: true,
      };

      setEtsyConfig(updated);
      localStorage.setItem(RESELLER_ETSY_CONFIG_KEY, JSON.stringify(updated));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ETSY_CONFIG_KEY, newValue: JSON.stringify(updated), storageArea: localStorage }));

      toast({
        title: "Shop Located!",
        description: `Found shop "${data.shop.shopName}" (Numeric ID: ${data.shop.shopId}). Active listings: ${data.shop.listingActiveCount}.`,
      });
    } catch (err: any) {
      toast({ title: "Shop Lookup Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsFindingShop(false);
    }
  }, [etsyConfig, shopNameInput, toast]);

  const handleDisconnectEtsy = useCallback(() => {
    const updated: EtsyConfig = {
      ...etsyConfig,
      shopId: '',
      shopName: '',
      accessToken: '',
      isConnected: false,
    };
    setEtsyConfig(updated);
    setShopNameInput('');
    localStorage.setItem(RESELLER_ETSY_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_ETSY_CONFIG_KEY, newValue: JSON.stringify(updated), storageArea: localStorage }));
    toast({ title: "Disconnected", description: "Etsy shop connection cleared." });
  }, [etsyConfig, toast]);

  const copyCallbackUrl = useCallback(() => {
    if (redirectUri) {
      navigator.clipboard.writeText(redirectUri);
      setCopiedCallback(true);
      toast({ title: "Copied!", description: "Callback URL copied to clipboard." });
      setTimeout(() => setCopiedCallback(false), 2500);
    }
  }, [redirectUri, toast]);

  const handleAddSourceOption = useCallback(() => {
    if (newSourceOption.trim() && !currentSourceOptions.includes(newSourceOption.trim())) {
      setCurrentSourceOptions(prev => [...prev, newSourceOption.trim()]);
      setNewSourceOption("");
    }
  }, [newSourceOption, currentSourceOptions]);

  const handleRemoveSourceOption = useCallback((optionToRemove: string) => {
    setCurrentSourceOptions(prev => prev.filter(option => option !== optionToRemove));
  }, []);

  const handleDashboardCardVisibilityChange = useCallback((cardId: DashboardCardKey, checked: boolean) => {
    setVisibleDashboardCards(prev =>
      checked ? [...prev, cardId] : prev.filter(id => id !== cardId)
    );
  }, []);

  const saveDashboardSettings = useCallback(() => {
    const newSettings: DashboardSettings = { visibleCards: visibleDashboardCards };
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(newSettings));
    toast({
      title: "Dashboard Settings Saved",
      description: "Your dashboard card visibility preferences have been updated.",
    });
    window.dispatchEvent(new StorageEvent('storage', {
      key: DASHBOARD_SETTINGS_KEY,
      newValue: JSON.stringify(newSettings),
      storageArea: localStorage,
    }));
  }, [visibleDashboardCards, toast]);

  const handleAddNewCategory = useCallback(() => {
    if (newItemCategory.trim() && !itemCategories.some(cat => cat.toLowerCase() === newItemCategory.trim().toLowerCase())) {
      const newCats = [...itemCategories, newItemCategory.trim()].sort();
      setItemCategories(newCats);
      localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(newCats));
      window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_CATEGORIES_KEY, newValue: JSON.stringify(newCats), storageArea: localStorage }));
      setNewItemCategory("");
      toast({ title: "Category Added", description: `Category "${newItemCategory.trim()}" has been added.` });
    } else if (itemCategories.some(cat => cat.toLowerCase() === newItemCategory.trim().toLowerCase())) {
      toast({ title: "Category Exists", description: `Category "${newItemCategory.trim()}" already exists.`, variant: "destructive" });
    }
  }, [newItemCategory, itemCategories, toast]);

  const handleRemoveCategory = useCallback((categoryToRemove: string) => {
    const newCats = itemCategories.filter(cat => cat !== categoryToRemove);
    setItemCategories(newCats);
    localStorage.setItem(RESELLER_CATEGORIES_KEY, JSON.stringify(newCats));
    window.dispatchEvent(new StorageEvent('storage', { key: RESELLER_CATEGORIES_KEY, newValue: JSON.stringify(newCats), storageArea: localStorage }));
    toast({ title: "Category Removed", description: `Category "${categoryToRemove}" has been removed.`, variant: "destructive" });
  }, [itemCategories, toast]);

  const applyThemeToDocument = useCallback((theme: AppTheme) => {
    const htmlEl = document.documentElement;
    AVAILABLE_THEMES.forEach(t => {
      if (t.value !== 'light') { htmlEl.classList.remove(t.value); }
    });
    if (theme === 'dark') htmlEl.classList.add('dark');
    else if (theme === 'retro') htmlEl.classList.add('retro');
    else if (theme === 'throwback') htmlEl.classList.add('throwback');
    else if (theme === 'lavender') htmlEl.classList.add('lavender');
  }, []);

  const handleThemeChange = useCallback((newTheme: AppTheme) => {
    setSelectedTheme(newTheme);
    localStorage.setItem(APP_THEME_KEY, newTheme);
    applyThemeToDocument(newTheme);
    window.dispatchEvent(new StorageEvent('storage', {
      key: APP_THEME_KEY,
      newValue: newTheme,
      storageArea: localStorage,
    }));
    toast({
      title: "Theme Updated",
      description: `Switched to ${AVAILABLE_THEMES.find(t => t.value === newTheme)?.label || newTheme} theme.`,
    });
  }, [toast, applyThemeToDocument]);

  const downloadFile = useCallback((filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportInventory = useCallback(() => {
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    const inventory: InventoryItem[] = storedInventory ? JSON.parse(storedInventory) : [];
    if (inventory.length === 0) {
      toast({ title: "No Inventory", description: "There is no inventory data to export.", variant: "destructive"});
      return;
    }
    const csvString = generateInventoryCsv(inventory);
    downloadFile("reseller_inventory_export.csv", csvString);
    toast({ title: "Inventory Exported", description: "Inventory data downloaded as CSV." });
  }, [toast, downloadFile]);

  const handleExportSuppliers = useCallback(() => {
    const storedSuppliers = localStorage.getItem(RESELLER_SUPPLIERS_KEY);
    const suppliers: Supplier[] = storedSuppliers ? JSON.parse(storedSuppliers) : DEFAULT_SUPPLIERS;
     if (suppliers.length === 0) {
      toast({ title: "No Suppliers", description: "There is no supplier data to export.", variant: "destructive"});
      return;
    }
    const csvString = generateSuppliersCsv(suppliers);
    downloadFile("reseller_suppliers_export.csv", csvString);
    toast({ title: "Suppliers Exported", description: "Suppliers data downloaded as CSV." });
  }, [toast, downloadFile]);

  const handleImportFile = useCallback((
    file: File | null,
    parser: (csvString: string) => { data: any[]; errors: string[] },
    storageKey: string,
    entityName: string
  ) => {
    if (!file) {
      toast({ title: "No File Selected", description: `Please select a CSV file to import ${entityName}.`, variant: "destructive"});
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvString = event.target?.result as string;
      const { data, errors } = parser(csvString);
      if (errors.length > 0) {
        errors.forEach(err => console.error(`Import Error (${entityName}): ${err}`));
        toast({
          title: `${entityName} Import Partially Successful`,
          description: `${data.length} ${entityName.toLowerCase()}(s) imported. ${errors.length} rows had errors (see console for details).`,
          variant: data.length > 0 ? "default" : "destructive",
          duration: 7000,
        });
      } else {
        toast({ title: `${entityName} Import Successful`, description: `${data.length} ${entityName.toLowerCase()}(s) imported successfully.` });
      }
      if (data.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(data));
        window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: JSON.stringify(data), storageArea: localStorage }));
      }
    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: `Could not read the selected file for ${entityName}.`, variant: "destructive"});
    };
    reader.readAsText(file);
    if (entityName === "Inventory" && inventoryImportRef.current) inventoryImportRef.current.value = "";
    if (entityName === "Suppliers" && supplierImportRef.current) supplierImportRef.current.value = "";
  }, [toast]);

  const currentCategory = SETTINGS_CATEGORIES.find(cat => cat.value === selectedSettingsCategory);
  const CurrentCategoryIcon = currentCategory?.icon || SettingsIconLucide;


  return (
    <div className="space-y-6">
      <div className="mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto justify-between text-lg py-6">
              <div className="flex items-center gap-2">
                <CurrentCategoryIcon className="h-5 w-5" />
                {currentCategory?.label || "Select Category"}
              </div>
              <ChevronDown className="h-5 w-5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full md:w-[--radix-dropdown-menu-trigger-width]" align="start">
            <DropdownMenuLabel>Settings Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SETTINGS_CATEGORIES.map((category) => (
              <DropdownMenuItem key={category.value} onSelect={() => setSelectedSettingsCategory(category.value)}>
                <category.icon className="mr-2 h-4 w-4" />
                <span>{category.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedSettingsCategory === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary"/>Business Profile</CardTitle>
            <CardDescription>Manage your business and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-medium text-lg">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                </div>
            </div>

            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </CardContent>
        </Card>
      )}

      {selectedSettingsCategory === 'integrations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-6 w-6 text-orange-600" />
                    Etsy Shop Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your Etsy shop to sync active inventory and import sales with exact fees.
                  </CardDescription>
                </div>
                {etsyConfig.apiKey && etsyConfig.shopId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-600" /> Configured
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 text-sm text-orange-900 dark:text-orange-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-orange-600" />
                  What FlipOS does with Etsy:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Active Inventory:</strong> Pulls your active shop listings, images, SKU, and prices directly into your FlipOS inventory.</li>
                  <li><strong>Sales & Exact Fees:</strong> Fetches sales receipts with "Etsy" as the platform and incorporates the exact fees paid directly from Etsy's API (no manual formula estimation needed).</li>
                  <li><strong>Outbound Shipping Cost:</strong> Since Etsy doesn't track what you spent on shipping labels externally, Etsy sales are flagged with "Needs Shipping $" so you can enter the outbound cost manually.</li>
                </ul>
              </div>

              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-medium text-lg">Connect Etsy Account</h3>
                <p className="text-xs text-muted-foreground">
                  Simply enter your Etsy API Key and click "Log in with Etsy" to automatically link your shop.
                </p>

                <div className="space-y-4">
                  {/* Step 1: Keystring */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="etsyApiKey" className="font-semibold text-sm">
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
                      id="etsyApiKey"
                      placeholder="Paste your Etsy Keystring here"
                      value={etsyConfig.keystring || etsyConfig.apiKey || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        handleSaveEtsyConfig({ keystring: val, apiKey: val });
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Found in your registered app under "Keystring" on the Etsy Developer site.
                    </p>
                  </div>

                  {/* Step 1b: Shared Secret */}
                  <div className="space-y-1.5">
                    <Label htmlFor="etsySharedSecret" className="font-semibold text-sm">
                      2. Etsy Shared Secret <span className="text-xs font-normal text-muted-foreground">(Required by Etsy Open API v3)</span>
                    </Label>
                    <Input
                      id="etsySharedSecret"
                      type="password"
                      placeholder="Paste your Etsy Shared Secret here"
                      value={etsyConfig.sharedSecret || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        handleSaveEtsyConfig({ sharedSecret: val });
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Found right next to Keystring under "Your Apps" in the Etsy Developer Portal.
                    </p>
                  </div>

                  {/* Step 2: One-click Etsy Login */}
                  <div className="rounded-lg border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/60 p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                        <LogIn className="h-4 w-4 text-orange-600" />
                        3. Authorize via Etsy
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Log in directly through Etsy. FlipOS will automatically detect your shop name, shop ID, and permissions.
                      </p>
                    </div>

                    <Button
                      onClick={handleLoginViaEtsy}
                      disabled={isLoggingInEtsy || !(etsyConfig.keystring || etsyConfig.apiKey)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium"
                    >
                      {isLoggingInEtsy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for Etsy Authorization...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" /> Log In with Etsy
                        </>
                      )}
                    </Button>

                    {etsyConfig.isConnected && etsyConfig.shopId && (
                      <div className="bg-white dark:bg-neutral-900 rounded p-2.5 border text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <div>
                            <span className="font-semibold">Connected to:</span> {etsyConfig.shopName || "Etsy Shop"}
                            <span className="text-muted-foreground ml-1.5">(Shop ID: {etsyConfig.shopId})</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDisconnectEtsy} className="text-destructive h-7 px-2 text-xs">
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Alternative: Shop Name Lookup */}
                  <div className="rounded-lg border p-3.5 space-y-2.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="settings-etsy-shop-name" className="text-xs font-semibold">
                        Alternative: Connect with Shop Name
                      </Label>
                      <span className="text-[11px] text-muted-foreground">No login needed for Active Inventory</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="settings-etsy-shop-name"
                        placeholder="Enter shop name (e.g. VintageHaven)"
                        value={shopNameInput}
                        onChange={(e) => setShopNameInput(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={handleFindShopByName}
                        disabled={isFindingShop || !(etsyConfig.keystring || etsyConfig.apiKey) || !shopNameInput.trim()}
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

                  {/* Callback URL helper */}
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
              </div>

              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-medium text-lg">Quick Sync Actions</h3>
                <p className="text-xs text-muted-foreground">
                  Launch the interactive Etsy synchronization modal to fetch inventory or sales.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEtsySyncTab('inventory');
                      setIsEtsySyncOpen(true);
                    }}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <Store className="mr-2 h-4 w-4 text-orange-600" />
                    Sync Active Inventory
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEtsySyncTab('sales');
                      setIsEtsySyncOpen(true);
                    }}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <RefreshCw className="mr-2 h-4 w-4 text-orange-600" />
                    Sync Sales Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedSettingsCategory === 'dashboard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-primary"/>Dashboard Customization</CardTitle>
            <CardDescription>Choose which summary cards are visible on your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {AVAILABLE_DASHBOARD_CARDS.map(card => (
                <div key={card.id} className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor={`visibility-${card.id}`} className="text-sm font-medium">
                    {card.title}
                  </Label>
                  <Switch
                    id={`visibility-${card.id}`}
                    checked={visibleDashboardCards.includes(card.id)}
                    onCheckedChange={(checked) => handleDashboardCardVisibilityChange(card.id, checked)}
                  />
                </div>
              ))}
            </div>
            <Button onClick={saveDashboardSettings}>Save Dashboard Settings</Button>
          </CardContent>
        </Card>
      )}

      {selectedSettingsCategory === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers className="h-6 w-6 text-primary"/>Manage Item Categories</CardTitle>
            <CardDescription>Add, view, or remove categories for your inventory items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New category name"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleAddNewCategory}><PlusCircle className="mr-2 h-4 w-4" />Add Category</Button>
            </div>
            <div className="space-y-2 pt-2">
              {itemCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories defined yet. Add some above.</p>
              ) : (
                itemCategories.map(category => (
                  <div key={category} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <span>{category}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveCategory(category)} title={`Delete category "${category}"`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSettingsCategory === 'theme' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-6 w-6 text-primary"/>Theme Customization</CardTitle>
            <CardDescription>Select your preferred application theme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="themeSelect">Choose Theme</Label>
              <Select value={selectedTheme} onValueChange={(value: AppTheme) => handleThemeChange(value)}>
                <SelectTrigger id="themeSelect" className="w-[280px]">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_THEMES.map(theme => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Your theme preference is saved locally in your browser.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedSettingsCategory === 'data' && (
         <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary"/>Data Management</CardTitle>
              <CardDescription>Import and export your application data. Ensure CSV files match the provided sample format for successful imports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 p-4 border rounded-md">
                <h3 className="font-medium text-lg">Export Data</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleExportInventory} variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Inventory (CSV)
                  </Button>
                  <Button onClick={handleExportSuppliers} variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Suppliers (CSV)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Download your data in CSV format for backup or external analysis.
                </p>
              </div>
              <div className="space-y-3 p-4 border rounded-md">
                <h3 className="font-medium text-lg">Import Data from CSV</h3>
                <p className="text-sm text-muted-foreground pb-2">
                  Import data from CSV files. <strong className="text-destructive">Warning:</strong> Importing will replace all existing data of that type. Backup your data first by exporting.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="inventoryCsvImport">Import Inventory from CSV</Label>
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <Input id="inventoryCsvImport" type="file" accept=".csv" ref={inventoryImportRef} className="max-w-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    <Button onClick={() => handleImportFile(inventoryImportRef.current?.files?.[0] || null, parseInventoryCsv, RESELLER_INVENTORY_KEY, "Inventory")} className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" /> Import Inventory
                    </Button>
                  </div>
                  <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => downloadFile("sample_inventory.csv", SAMPLE_INVENTORY_CSV_CONTENT)}>
                    <FileQuestion className="mr-1.5 h-3.5 w-3.5" /> Download Sample Inventory CSV
                  </Button>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label htmlFor="supplierCsvImport">Import Suppliers from CSV</Label>
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <Input id="supplierCsvImport" type="file" accept=".csv" ref={supplierImportRef} className="max-w-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    <Button onClick={() => handleImportFile(supplierImportRef.current?.files?.[0] || null, parseSuppliersCsv, RESELLER_SUPPLIERS_KEY, "Suppliers")} className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" /> Import Suppliers
                    </Button>
                  </div>
                  <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => downloadFile("sample_suppliers.csv", SAMPLE_SUPPLIERS_CSV_CONTENT)}>
                    <FileQuestion className="mr-1.5 h-3.5 w-3.5" /> Download Sample Suppliers CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      )}

      {selectedSettingsCategory === 'advanced' && (
         <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-6 w-6 text-primary"/>Customization Settings</CardTitle>
                <CardDescription>Tailor the application to your specific needs. The features below are illustrative mockups for future development.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 border rounded-md">
                  <h3 className="font-medium flex items-center gap-2"><ListChecks className="h-5 w-5"/>Manage Inventory Form</h3>
                  <p className="text-sm text-muted-foreground">
                    Below are mockups for how you might customize the "Add New Inventory Item" form. These controls are not yet functional.
                  </p>
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold">Custom Fields (Illustrative)</h4>
                    <p className="text-xs text-muted-foreground">
                      Future enhancements will allow you to add new fields (text, number, date, etc.) to your inventory items.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input placeholder="New field name" className="max-w-xs" disabled />
                      <Button variant="outline" disabled><PlusCircle className="mr-2 h-4 w-4" />Add Custom Field</Button>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Your custom field "Additional Notes" is an example of a field that could be managed here.
                    </p>
                  </div>
                  <Separator className="my-4"/>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Source Dropdown Options (Illustrative)</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage the options available in the "Source" dropdown on the inventory form.
                    </p>
                    <div className="space-y-2">
                      {currentSourceOptions.map(option => (
                        <div key={option} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                          <span>{option}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled title="Edit (Non-functional)">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveSourceOption(option)} disabled title="Delete (Non-functional)">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        placeholder="New source option"
                        className="max-w-xs"
                        value={newSourceOption}
                        onChange={(e) => setNewSourceOption(e.target.value)}
                        disabled
                      />
                      <Button variant="outline" onClick={handleAddSourceOption} disabled><PlusCircle className="mr-2 h-4 w-4" />Add Source Option</Button>
                    </div>
                    <Button className="mt-2" disabled>Save Source Options</Button>
                  </div>
                  <Separator className="my-4"/>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Formula Fields (Illustrative)</h4>
                    <p className="text-xs text-muted-foreground">
                      In the future, you could define fields that calculate values based on other fields (e.g., custom profit calculations).
                    </p>
                    <Button variant="outline" disabled>Manage Formula Fields (Coming Soon)</Button>
                  </div>
                  <Separator className="my-4"/>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Form Layout (Illustrative)</h4>
                    <p className="text-xs text-muted-foreground">
                      Future updates might allow reordering or regrouping fields on the inventory form.
                    </p>
                    <Button variant="outline" disabled>Modify Inventory Form Layout (Coming Soon)</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BellRing className="h-6 w-6 text-primary"/>Notification Preferences</CardTitle>
                <CardDescription>Control how you receive alerts and updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNotifications" className="flex flex-col space-y-1">
                    <span>Email Notifications</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                      Receive important updates and alerts via email.
                    </span>
                  </Label>
                  <Switch id="emailNotifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="inAppNotifications" className="flex flex-col space-y-1">
                    <span>In-App Notifications</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                      Show notifications within the Reseller Insights app.
                    </span>
                  </Label>
                  <Switch id="inAppNotifications" defaultChecked />
                </div>
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </div>
      )}

      <EtsySyncDialog
        isOpen={isEtsySyncOpen}
        onOpenChange={setIsEtsySyncOpen}
        defaultTab={etsySyncTab}
      />
    </div>
  );
}
