import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Award, Send, Trash2, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDistanceToNow } from "date-fns";

const badgeSchema = z.object({
  name: z.string().min(3, "Name required"),
  description: z.string().min(10, "Description required"),
  criteria: z.string().min(5, "Criteria required"),
});

const notificationSchema = z.object({
  title: z.string().min(3, "Title required"),
  message: z.string().min(10, "Message required"),
  recipients: z.string().min(1, "Select recipients"),
});

export default function AdminSettings() {
  const { toast } = useToast();
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [deleteConfirmBadge, setDeleteConfirmBadge] = useState<any>(null);
  const [awardDialogBadge, setAwardDialogBadge] = useState<any>(null);
  const [awardMemberId, setAwardMemberId] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  const { data: badgesData } = useQuery({ queryKey: ["/api/badges"] });
  const { data: configData } = useQuery({ queryKey: ["/api/admin/system-config"] });
  const { data: recentNotificationsData } = useQuery({ queryKey: ["/api/admin/recent-notifications"] });
  const { data: membersData } = useQuery({ queryKey: ["/api/members"] });

  const config = (configData as any)?.data || {};
  const [localConfig, setLocalConfig] = useState<Record<string, boolean>>({});
  const activeConfig = { ...config, ...localConfig };

  const badgeForm = useForm({
    resolver: zodResolver(badgeSchema),
    defaultValues: { name: "", description: "", criteria: "" },
  });

  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: "", message: "", recipients: "all" },
  });

  const createBadgeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/badges", {
      ...data,
      imageUrl: "/placeholder-badge.png"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Success", description: "Badge created" });
      setBadgeDialogOpen(false);
      badgeForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create badge", variant: "destructive" });
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/badges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Success", description: "Badge deleted" });
      setDeleteConfirmBadge(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete badge", variant: "destructive" });
    },
  });

  const awardBadgeMutation = useMutation({
    mutationFn: ({ badgeId, memberId }: { badgeId: string; memberId: string }) =>
      apiRequest("POST", `/api/badges/${badgeId}/award`, { memberId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Badge awarded to member" });
      setAwardDialogBadge(null);
      setAwardMemberId("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to award badge", variant: "destructive" });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notifications/broadcast", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Notification sent to members" });
      setNotificationDialogOpen(false);
      notificationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recent-notifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    },
  });

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await apiRequest("PUT", "/api/admin/system-config", activeConfig);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-config"] });
      setLocalConfig({});
      toast({ title: "Success", description: "System configuration saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    } finally {
      setConfigSaving(false);
    }
  };

  const badges = (badgesData as any)?.data || [];
  const recentNotifications = (recentNotificationsData as any)?.data || [];
  const members = (membersData as any)?.data || [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]} />
      
      <div>
        <h1 className="font-display text-3xl font-bold" data-testid="text-settings-title">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">Manage badges, notifications, and system configuration</p>
      </div>

      <Tabs defaultValue="badges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="badges" data-testid="tab-badges">Badges</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System Config</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBadgeDialogOpen(true)} data-testid="button-create-badge">
              <Plus className="h-4 w-4 mr-2" />
              Create Badge
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {badges.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No badges created yet. Create your first badge to get started.
                </CardContent>
              </Card>
            ) : (
              badges.map((badge: any) => (
                <Card key={badge.id} data-testid={`badge-card-${badge.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-primary shrink-0" />
                        <div>
                          <CardTitle className="text-base">{badge.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setDeleteConfirmBadge(badge)}
                        data-testid={`button-delete-badge-${badge.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Criteria:</span> {badge.criteria}
                    </p>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setAwardDialogBadge(badge)}
                        data-testid={`button-award-${badge.id}`}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Award Badge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNotificationDialogOpen(true)} data-testid="button-send-notification">
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
                ) : (
                  recentNotifications.map((n: any, i: number) => (
                    <div key={i} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{n.count} recipients</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.message?.substring(0, 80)}{n.message?.length > 80 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card data-testid="card-system-config">
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">These settings are persisted and affect the entire platform</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Disable public access to the platform</p>
                </div>
                <Switch
                  checked={activeConfig.maintenance_mode || false}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, maintenance_mode: checked }))}
                  data-testid="switch-maintenance"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Member Registration</p>
                  <p className="text-xs text-muted-foreground">Allow new members to register</p>
                </div>
                <Switch
                  checked={activeConfig.member_registration !== false}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, member_registration: checked }))}
                  data-testid="switch-registration"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Election Voting</p>
                  <p className="text-xs text-muted-foreground">Enable voting on elections</p>
                </div>
                <Switch
                  checked={activeConfig.election_voting !== false}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, election_voting: checked }))}
                  data-testid="switch-voting"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Campaign Creation</p>
                  <p className="text-xs text-muted-foreground">Allow members to create campaigns</p>
                </div>
                <Switch
                  checked={activeConfig.campaign_creation !== false}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, campaign_creation: checked }))}
                  data-testid="switch-campaigns"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Send email notifications to members</p>
                </div>
                <Switch
                  checked={activeConfig.email_notifications !== false}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, email_notifications: checked }))}
                  data-testid="switch-emails"
                />
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleSaveConfig}
                  disabled={configSaving || Object.keys(localConfig).length === 0}
                  data-testid="button-save-config"
                >
                  {configSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent data-testid="dialog-create-badge">
          <DialogHeader>
            <DialogTitle>Create Badge</DialogTitle>
            <DialogDescription>Create a new achievement badge for members</DialogDescription>
          </DialogHeader>
          <Form {...badgeForm}>
            <form onSubmit={badgeForm.handleSubmit((data) => createBadgeMutation.mutate(data))} className="space-y-4">
              <FormField
                control={badgeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Super Voter" data-testid="input-badge-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={badgeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="What this badge represents" data-testid="input-badge-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={badgeForm.control}
                name="criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Earning Criteria</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Vote in 5 elections" data-testid="input-badge-criteria" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBadgeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createBadgeMutation.isPending} data-testid="button-submit-badge">
                  {createBadgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Badge
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmBadge} onOpenChange={() => setDeleteConfirmBadge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Badge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmBadge?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmBadge && deleteBadgeMutation.mutate(deleteConfirmBadge.id)}
              data-testid="button-confirm-delete-badge"
            >
              {deleteBadgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!awardDialogBadge} onOpenChange={() => { setAwardDialogBadge(null); setAwardMemberId(""); }}>
        <DialogContent data-testid="dialog-award-badge">
          <DialogHeader>
            <DialogTitle>Award Badge: {awardDialogBadge?.name}</DialogTitle>
            <DialogDescription>Select a member to award this badge to</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={awardMemberId} onValueChange={setAwardMemberId}>
              <SelectTrigger data-testid="select-award-member">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.user?.firstName} {m.user?.lastName} ({m.memberId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAwardDialogBadge(null); setAwardMemberId(""); }}>Cancel</Button>
            <Button
              disabled={!awardMemberId || awardBadgeMutation.isPending}
              onClick={() => awardDialogBadge && awardBadgeMutation.mutate({ badgeId: awardDialogBadge.id, memberId: awardMemberId })}
              data-testid="button-confirm-award"
            >
              {awardBadgeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}
              Award Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent data-testid="dialog-send-notification">
          <DialogHeader>
            <DialogTitle>Send Mass Notification</DialogTitle>
            <DialogDescription>Send a notification to selected members</DialogDescription>
          </DialogHeader>
          <Form {...notificationForm}>
            <form onSubmit={notificationForm.handleSubmit((data) => sendNotificationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={notificationForm.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipients</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-recipients">
                          <SelectValue placeholder="Select recipients" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value="active">Active Members</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={notificationForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Notification title" data-testid="input-notification-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={notificationForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Notification message" data-testid="input-notification-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNotificationDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={sendNotificationMutation.isPending} data-testid="button-submit-notification">
                  {sendNotificationMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Notification
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
