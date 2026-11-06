
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DeprecatedAddTaskPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main tasks page where the dialog is now handled
    router.replace('/tasks');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-2rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Redirecting...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            The Add Task page has been moved. You are being redirected to the main Task Manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
