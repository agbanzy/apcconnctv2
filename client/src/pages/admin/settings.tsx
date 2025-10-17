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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Award, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const badgeSchema = z.object({
  name: z.string().min(3, "Name required"),
  description: z.string().min(10, "Description required"),
  criteria: z.string().min(5, "Criteria required"),
});

export default function AdminSettings() {
  const { toast } = useToast();
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const { data: badgesData } = useQuery({ queryKey: ["/api/badges"] });

  const badgeForm = useForm({
    resolver: zodResolver(badgeSchema),
    defaultValues: { name: "", description: "", criteria: "" },
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
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notifications/broadcast", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Notification sent" });
      setNotificationDialogOpen(false);
    },
  });

  const badges = badgesData?.data || [];

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
                  No badges created
                </CardContent>
              </Card>
            ) : (
              badges.map((badge: any) => (
                <Card key={badge.id} data-testid={`badge-card-${badge.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-base">{badge.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
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
                      <Button size="sm" variant="outline" className="w-full" data-testid={`button-award-${badge.id}`}>
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
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-md">
                  <p className="text-sm font-medium">Welcome to APC Connect</p>
                  <p className="text-xs text-muted-foreground mt-1">Sent to all members • 2 hours ago</p>
                </div>
                <div className="p-3 border rounded-md">
                  <p className="text-sm font-medium">New Election Announcement</p>
                  <p className="text-xs text-muted-foreground mt-1">Sent to Lagos members • 1 day ago</p>
                </div>
                <div className="p-3 border rounded-md">
                  <p className="text-sm font-medium">Event Reminder</p>
                  <p className="text-xs text-muted-foreground mt-1">Sent to RSVPs • 3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card data-testid="card-system-config">
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Disable public access to the platform</p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                  data-testid="switch-maintenance"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Member Registration</p>
                  <p className="text-xs text-muted-foreground">Allow new members to register</p>
                </div>
                <Switch defaultChecked data-testid="switch-registration" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Election Voting</p>
                  <p className="text-xs text-muted-foreground">Enable voting on elections</p>
                </div>
                <Switch defaultChecked data-testid="switch-voting" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Campaign Creation</p>
                  <p className="text-xs text-muted-foreground">Allow members to create campaigns</p>
                </div>
                <Switch defaultChecked data-testid="switch-campaigns" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Send email notifications to members</p>
                </div>
                <Switch defaultChecked data-testid="switch-emails" />
              </div>
              <div className="pt-4">
                <Button data-testid="button-save-config">Save Configuration</Button>
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
                <Button type="submit" data-testid="button-submit-badge">Create Badge</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent data-testid="dialog-send-notification">
          <DialogHeader>
            <DialogTitle>Send Mass Notification</DialogTitle>
            <DialogDescription>Send a notification to selected members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipients</label>
              <Select>
                <SelectTrigger className="mt-2" data-testid="select-recipients">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="active">Active Members</SelectItem>
                  <SelectItem value="state">By State</SelectItem>
                  <SelectItem value="lga">By LGA</SelectItem>
                  <SelectItem value="ward">By Ward</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input className="mt-2" placeholder="Notification title" data-testid="input-notification-title" />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea className="mt-2" rows={4} placeholder="Notification message" data-testid="input-notification-message" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>Cancel</Button>
            <Button data-testid="button-submit-notification">Send Notification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
