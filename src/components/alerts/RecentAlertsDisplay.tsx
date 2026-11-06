
"use client";

import type { TriggeredAlert } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Archive, Eye, EyeOff } from "lucide-react";
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { ALERT_TYPES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecentAlertsDisplayProps {
  alerts: TriggeredAlert[];
  onToggleRead: (alertId: string) => void;
  onArchive: (alertId: string) => void;
}

export function RecentAlertsDisplay({ alerts, onToggleRead, onArchive }: RecentAlertsDisplayProps) {
  const getAlertTypeLabel = (typeValue: string) => {
    return ALERT_TYPES.find(t => t.value === typeValue)?.label || typeValue;
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNowStrict(parseISO(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getFormattedTimestamp = (timestamp: string) => {
     try {
      return format(parseISO(timestamp), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid Date";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Recent Triggered Alerts
        </CardTitle>
        <CardDescription>
          Manage your recent system-generated alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No recent alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 border rounded-lg flex items-start gap-3 transition-colors ${alert.isRead ? 'bg-muted/50 opacity-70' : 'bg-background'}`}>
                <div className="flex-shrink-0 mt-1">
                  {alert.isRead ? <BellOff className="h-5 w-5 text-muted-foreground" /> : <Bell className="h-5 w-5 text-primary animate-pulse" />}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-medium ${alert.isRead ? 'text-muted-foreground' : ''}`}>{alert.message}</h4>
                    <Badge variant={alert.isRead ? "outline" : "secondary"} className="text-xs whitespace-nowrap ml-2">
                      {getAlertTypeLabel(alert.alertConfigType)}
                    </Badge>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-1 cursor-default">{getRelativeTime(alert.timestamp)}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{getFormattedTimestamp(alert.timestamp)}</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 ml-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onToggleRead(alert.id)}>
                          {alert.isRead ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          <span className="sr-only">{alert.isRead ? "Mark as Unread" : "Mark as Read"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{alert.isRead ? "Mark as Unread" : "Mark as Read"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onArchive(alert.id)}>
                                <Archive className="h-4 w-4" />
                                <span className="sr-only">Archive Alert</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Archive Alert</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
