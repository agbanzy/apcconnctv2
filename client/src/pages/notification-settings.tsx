import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { registerPushNotifications, unregisterPushNotifications, isPushNotificationsEnabled } from "@/lib/push-notifications";
import { Bell, BellOff } from "lucide-react";

interface NotificationPreferences {
  eventReminders: boolean;
  electionAnnouncements: boolean;
  newsAlerts: boolean;
  duesReminders: boolean;
  taskAssignments: boolean;
  campaignUpdates: boolean;
  systemAnnouncements: boolean;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    isPushNotificationsEnabled().then(setPushEnabled);
  }, []);

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/push/preferences'],
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      return apiRequest('PATCH', '/api/push/preferences', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/push/preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const togglePushNotifications = async () => {
    if (pushEnabled) {
      const success = await unregisterPushNotifications();
      if (success) {
        setPushEnabled(false);
        toast({
          title: "Push notifications disabled",
          description: "You will no longer receive push notifications.",
        });
      }
    } else {
      const success = await registerPushNotifications();
      if (success) {
        setPushEnabled(true);
        toast({
          title: "Push notifications enabled",
          description: "You will now receive push notifications.",
        });
      } else {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-notification-settings" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive real-time notifications about important updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-enabled">Enable push notifications</Label>
            <Button
              onClick={togglePushNotifications}
              variant={pushEnabled ? "destructive" : "default"}
              data-testid="button-toggle-push"
            >
              {pushEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceToggle
            label="Event Reminders"
            description="Get notified about upcoming events"
            checked={preferences?.eventReminders ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ eventReminders: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-event-reminders"
          />

          <PreferenceToggle
            label="Election Announcements"
            description="Stay informed about elections and voting"
            checked={preferences?.electionAnnouncements ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ electionAnnouncements: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-election-announcements"
          />

          <PreferenceToggle
            label="News Alerts"
            description="Get breaking news from the party"
            checked={preferences?.newsAlerts ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ newsAlerts: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-news-alerts"
          />

          <PreferenceToggle
            label="Membership Dues Reminders"
            description="Reminders about upcoming membership dues"
            checked={preferences?.duesReminders ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ duesReminders: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-dues-reminders"
          />

          <PreferenceToggle
            label="Task Assignments"
            description="Get notified when tasks are assigned to you"
            checked={preferences?.taskAssignments ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ taskAssignments: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-task-assignments"
          />

          <PreferenceToggle
            label="Campaign Updates"
            description="Updates about party campaigns and initiatives"
            checked={preferences?.campaignUpdates ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ campaignUpdates: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-campaign-updates"
          />

          <PreferenceToggle
            label="System Announcements"
            description="Important platform updates and announcements"
            checked={preferences?.systemAnnouncements ?? true}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ systemAnnouncements: checked })
            }
            disabled={updatePreferences.isPending}
            dataTestId="toggle-system-announcements"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  dataTestId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  dataTestId: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={dataTestId}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={dataTestId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={dataTestId}
      />
    </div>
  );
}
