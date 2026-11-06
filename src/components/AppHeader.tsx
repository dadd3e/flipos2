
"use client";

import { Button } from "@/components/ui/button";
import { Settings, Bell } from "lucide-react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { ScrollArea } from "@/components/ui/scroll-area";


export function AppHeader() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold font-headline">FlipOS</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/alerts">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>

        <Sheet open={isSettingsSheetOpen} onOpenChange={setIsSettingsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg p-0"> {/* Use a wider sheet for settings */}
            <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
              <SheetTitle>Application Settings</SheetTitle>
              <SheetDescription>
                Manage your application preferences and data.
              </SheetDescription>
            </SheetHeader>
            {/* ScrollArea height calculation allows header to be sticky */}
            <ScrollArea className="h-[calc(100vh_-_5.5rem)]"> {/* Approx header height 5.5rem */}
              <div className="p-6">
                <SettingsContent />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

