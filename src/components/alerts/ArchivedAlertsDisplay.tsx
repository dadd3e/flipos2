
"use client";

import type { TriggeredAlert } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArchiveRestore, Trash2, ArchiveX, Archive } from "lucide-react"; // Added Archive here
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { ALERT_TYPES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ArchivedAlertsDisplayProps {
  alerts: TriggeredAlert[];
  onUnarchive: (alertId: string) => void;
  onDelete: (alertId: string) => void;
}

export function ArchivedAlertsDisplay({ alerts, onUnarchive, onDelete }: ArchivedAlertsDisplayProps) {
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
          <ArchiveX className="h-6 w-6 text-muted-foreground" />
          Archived Alerts
        </CardTitle>
        <CardDescription>
          View and manage your archived alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No archived alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 border rounded-lg flex items-start gap-3 bg-muted/30 opacity-60">
                <div className="flex-shrink-0 mt-1">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-muted-foreground">{alert.message}</h4>
                     <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
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
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onUnarchive(alert.id)}>
                                <ArchiveRestore className="h-4 w-4" />
                                <span className="sr-only">Unarchive Alert</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Unarchive Alert</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => onDelete(alert.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Alert</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete Alert Permanently</p>
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
