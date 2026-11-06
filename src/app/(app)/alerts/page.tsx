
"use client";

import { useState, useEffect, useCallback } from 'react';
import { AlertForm } from "@/components/alerts/AlertForm";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { RecentAlertsDisplay } from "@/components/alerts/RecentAlertsDisplay";
import { ArchivedAlertsDisplay } from "@/components/alerts/ArchivedAlertsDisplay";
import type { AlertConfig, InventoryItem, TriggeredAlert, AlertType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ALERTS_CONFIG_KEY, RESELLER_INVENTORY_KEY, RECENT_TRIGGERED_ALERTS_KEY, ARCHIVED_TRIGGERED_ALERTS_KEY } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';


const initialInventoryForAlerts: InventoryItem[] = [];

export default function AlertsPage() {
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(initialInventoryForAlerts);
  const [editingAlertConfig, setEditingAlertConfig] = useState<AlertConfig | undefined>(undefined);
  const [alertConfigToDelete, setAlertConfigToDelete] = useState<string | null>(null);

  const [recentTriggeredAlerts, setRecentTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [archivedTriggeredAlerts, setArchivedTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [triggeredAlertToDelete, setTriggeredAlertToDelete] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const storedInventory = localStorage.getItem(RESELLER_INVENTORY_KEY);
    if (storedInventory) {
      try {
        setInventoryItems(JSON.parse(storedInventory));
      } catch (e) { console.error("Error parsing inventory for alerts page:", e); setInventoryItems([]); }
    } else { setInventoryItems([]); }

    const storedAlertConfigs = localStorage.getItem(ALERTS_CONFIG_KEY);
    if (storedAlertConfigs) {
      try {
        setAlertConfigs(JSON.parse(storedAlertConfigs));
      } catch (e) { console.error("Error parsing alert configs:", e); setAlertConfigs([]); }
    } else {
      localStorage.setItem(ALERTS_CONFIG_KEY, JSON.stringify([]));
      setAlertConfigs([]);
    }
  }, []);

  useEffect(() => {
    const storedRecent = localStorage.getItem(RECENT_TRIGGERED_ALERTS_KEY);
    if (storedRecent) {
      try { setRecentTriggeredAlerts(JSON.parse(storedRecent)); }
      catch (e) { console.error("Error parsing recent triggered alerts:", e); setRecentTriggeredAlerts([]); }
    } else {
      const sampleAlerts: TriggeredAlert[] = [
        { id: crypto.randomUUID(), alertConfigId: 'sample-cfg-1', alertConfigType: 'low_stock', message: "Item 'Vintage Lamp' stock is low (2 remaining). Consider reordering.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), isRead: false, isArchived: false, relatedItemName: 'Vintage Lamp' },
        { id: crypto.randomUUID(), alertConfigId: 'sample-cfg-2', alertConfigType: 'aging_inventory', message: "Task 'Review pricing for Old Books Collection' auto-created due to aging inventory.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), isRead: true, isArchived: false },
      ];
      localStorage.setItem(RECENT_TRIGGERED_ALERTS_KEY, JSON.stringify(sampleAlerts));
      setRecentTriggeredAlerts(sampleAlerts);
    }

    const storedArchived = localStorage.getItem(ARCHIVED_TRIGGERED_ALERTS_KEY);
    if (storedArchived) {
      try { setArchivedTriggeredAlerts(JSON.parse(storedArchived)); }
      catch (e) { console.error("Error parsing archived triggered alerts:", e); setArchivedTriggeredAlerts([]); }
    } else {
      localStorage.setItem(ARCHIVED_TRIGGERED_ALERTS_KEY, JSON.stringify([]));
      setArchivedTriggeredAlerts([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_CONFIG_KEY, JSON.stringify(alertConfigs));
      window.dispatchEvent(new StorageEvent('storage', { key: ALERTS_CONFIG_KEY, newValue: JSON.stringify(alertConfigs), storageArea: localStorage }));
    } catch (e: any) { /* Handle QuotaExceededError if needed */ }
  }, [alertConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_TRIGGERED_ALERTS_KEY, JSON.stringify(recentTriggeredAlerts));
      window.dispatchEvent(new StorageEvent('storage', { key: RECENT_TRIGGERED_ALERTS_KEY, newValue: JSON.stringify(recentTriggeredAlerts), storageArea: localStorage }));
    } catch (e: any) { /* Handle QuotaExceededError if needed */ }
  }, [recentTriggeredAlerts]);

  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVED_TRIGGERED_ALERTS_KEY, JSON.stringify(archivedTriggeredAlerts));
      window.dispatchEvent(new StorageEvent('storage', { key: ARCHIVED_TRIGGERED_ALERTS_KEY, newValue: JSON.stringify(archivedTriggeredAlerts), storageArea: localStorage }));
    } catch (e: any) { /* Handle QuotaExceededError if needed */ }
  }, [archivedTriggeredAlerts]);


  const handleAddAlertConfig = useCallback((config: AlertConfig) => {
    setAlertConfigs((prev) => [...prev, config]);
    toast({ title: "Alert Configuration Created", description: `New alert for "${config.type}" has been set.` });
  }, [toast]);

  const handleUpdateAlertConfig = useCallback((updatedConfig: AlertConfig) => {
    setAlertConfigs((prev) =>
      prev.map((config) => (config.id === updatedConfig.id ? updatedConfig : config))
    );
    setEditingAlertConfig(undefined);
    toast({ title: "Alert Configuration Updated", description: `Alert "${updatedConfig.type}" has been updated.` });
  }, [toast]);

  const handleEditAlertConfig = useCallback((config: AlertConfig) => {
    setEditingAlertConfig(config);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteAlertConfig = useCallback((configId: string) => {
    setAlertConfigToDelete(configId);
  }, []);

  const confirmDeleteAlertConfig = useCallback(() => {
    if (alertConfigToDelete) {
      const configDetails = alertConfigs.find(alert => alert.id === alertConfigToDelete)?.details || 'Alert Config';
      setAlertConfigs((prev) => prev.filter((alert) => alert.id !== alertConfigToDelete));
      toast({ title: "Alert Configuration Deleted", description: `Alert Config "${configDetails}" has been removed.`, variant: "destructive" });
      setAlertConfigToDelete(null);
    }
  }, [alertConfigToDelete, alertConfigs, toast]);

  const handleToggleAlertConfigActive = useCallback((configId: string, isActive: boolean) => {
    const configType = alertConfigs.find(alert => alert.id === configId)?.type || 'Alert Config';
    setAlertConfigs((prev) =>
      prev.map((config) =>
        config.id === configId ? { ...config, isActive } : config
      )
    );
    toast({ title: `Alert Config ${isActive ? "Activated" : "Deactivated"}`, description: `Alert Config for "${configType}" is now ${isActive ? "active" : "inactive"}.` });
  }, [alertConfigs, toast]);

  const handleAlertConfigSubmit = useCallback((data: AlertConfig) => {
    if (editingAlertConfig) {
      handleUpdateAlertConfig(data);
    } else {
      handleAddAlertConfig(data);
    }
  }, [editingAlertConfig, handleUpdateAlertConfig, handleAddAlertConfig]);

  const handleToggleReadStatus = useCallback((alertId: string) => {
    const alert = recentTriggeredAlerts.find(a => a.id === alertId);
    setRecentTriggeredAlerts(prev =>
      prev.map(a =>
        a.id === alertId ? { ...a, isRead: !a.isRead } : a
      )
    );
    if(alert) {
      toast({ title: `Alert ${!alert.isRead ? "Marked as Read" : "Marked as Unread"}`, description: `Alert "${alert.message.substring(0, 30)}..." status updated.` });
    }
  }, [recentTriggeredAlerts, toast]);

  const handleArchiveTriggeredAlert = useCallback((alertId: string) => {
    const alertToArchive = recentTriggeredAlerts.find(alert => alert.id === alertId);
    if (alertToArchive) {
      setRecentTriggeredAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setArchivedTriggeredAlerts(prev => [{ ...alertToArchive, isArchived: true, isRead: true }, ...prev]);
      toast({ title: "Alert Archived", description: `Alert "${alertToArchive.message.substring(0, 30)}..." moved to archive.` });
    }
  }, [recentTriggeredAlerts, toast]);

  const handleUnarchiveTriggeredAlert = useCallback((alertId: string) => {
    const alertToUnarchive = archivedTriggeredAlerts.find(alert => alert.id === alertId);
    if (alertToUnarchive) {
      setArchivedTriggeredAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setRecentTriggeredAlerts(prev => [{ ...alertToUnarchive, isArchived: false }, ...prev]);
      toast({ title: "Alert Unarchived", description: `Alert "${alertToUnarchive.message.substring(0, 30)}..." moved to recent alerts.` });
    }
  }, [archivedTriggeredAlerts, toast]);

  const handleDeleteArchivedTriggeredAlert = useCallback((alertId: string) => {
     setTriggeredAlertToDelete(alertId);
  }, []);

  const confirmDeleteTriggeredAlert = useCallback(() => {
    if (triggeredAlertToDelete) {
        const alertDetails = archivedTriggeredAlerts.find(alert => alert.id === triggeredAlertToDelete)?.message.substring(0,30) || 'Archived Alert';
        setArchivedTriggeredAlerts(prev => prev.filter(alert => alert.id !== triggeredAlertToDelete));
        toast({ title: "Archived Alert Deleted", description: `Alert "${alertDetails}..." permanently removed.`, variant: "destructive" });
        setTriggeredAlertToDelete(null);
    }
  }, [triggeredAlertToDelete, archivedTriggeredAlerts, toast]);


  return (
    <div className="space-y-8">
      <RecentAlertsDisplay
        alerts={recentTriggeredAlerts}
        onToggleRead={handleToggleReadStatus}
        onArchive={handleArchiveTriggeredAlert}
      />

      <ArchivedAlertsDisplay
        alerts={archivedTriggeredAlerts}
        onUnarchive={handleUnarchiveTriggeredAlert}
        onDelete={handleDeleteArchivedTriggeredAlert}
      />
      
      <Separator className="my-8" />

      <AlertForm inventoryItems={inventoryItems} onSubmit={handleAlertConfigSubmit} initialData={editingAlertConfig} key={editingAlertConfig?.id || 'new-alert-config'} />
      <AlertsTable alerts={alertConfigs} onEdit={handleEditAlertConfig} onDelete={handleDeleteAlertConfig} onToggleActive={handleToggleAlertConfigActive} />

      <AlertDialog open={!!alertConfigToDelete} onOpenChange={() => setAlertConfigToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this alert configuration rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertConfigToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAlertConfig} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!triggeredAlertToDelete} onOpenChange={() => setTriggeredAlertToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Archived Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this specific triggered alert instance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTriggeredAlertToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTriggeredAlert} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Alert Instance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
