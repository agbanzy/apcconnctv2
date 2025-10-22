import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Heart, Plus, Trash2, Edit, Download, Search, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["general", "campaign", "infrastructure", "youth_programs", "community_development", "emergency_relief"]),
  goalAmount: z.number().min(1, "Goal amount is required"),
  image: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
});

export default function AdminDonations() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/donations/stats"],
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/donation-campaigns"],
    select: (data: any) => data.data || [],
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery({
    queryKey: ["/api/admin/donations"],
    select: (data: any) => data.data || [],
  });

  const campaignForm = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general" as const,
      goalAmount: 0,
      image: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "active" as const,
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/donation-campaigns", {
        ...data,
        goalAmount: data.goalAmount * 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donation-campaigns"] });
      setCampaignDialog(false);
      campaignForm.reset();
      toast({ title: "Campaign created successfully" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/donation-campaigns/${id}`, {
        ...data,
        goalAmount: data.goalAmount ? data.goalAmount * 100 : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donation-campaigns"] });
      setCampaignDialog(false);
      setEditingCampaign(null);
      toast({ title: "Campaign updated successfully" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/donation-campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donation-campaigns"] });
      toast({ title: "Campaign deleted successfully" });
    },
  });

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    campaignForm.reset({
      ...campaign,
      goalAmount: campaign.goalAmount / 100,
      startDate: format(new Date(campaign.startDate), "yyyy-MM-dd"),
      endDate: campaign.endDate ? format(new Date(campaign.endDate), "yyyy-MM-dd") : "",
    });
    setCampaignDialog(true);
  };

  const handleExportDonations = () => {
    const csv = [
      ["Date", "Donor", "Email", "Amount (NGN)", "Campaign", "Payment Status", "Method", "Message"],
      ...filteredDonations.map((d: any) => [
        format(new Date(d.createdAt), "yyyy-MM-dd"),
        d.donorName || (d.member ? `${d.member.user.firstName} ${d.member.user.lastName}` : "Anonymous"),
        d.donorEmail || d.member?.user.email || "",
        (d.amount / 100).toFixed(2),
        d.campaign?.title || "General",
        d.paymentStatus,
        d.paymentMethod,
        d.message || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "donations-export.csv";
    a.click();
  };

  const filteredDonations = donations.filter((d: any) => {
    if (searchQuery) {
      const name = d.donorName || (d.member ? `${d.member.user.firstName} ${d.member.user.lastName}` : "");
      const email = d.donorEmail || d.member?.user.email || "";
      if (!name.toLowerCase().includes(searchQuery.toLowerCase()) && !email.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    if (campaignFilter !== "all" && d.campaignId !== campaignFilter) return false;
    if (statusFilter !== "all" && d.paymentStatus !== statusFilter) return false;
    return true;
  });

  const totalAmount = filteredDonations
    .filter((d: any) => d.paymentStatus === "completed")
    .reduce((sum: number, d: any) => sum + d.amount, 0);

  const completedDonations = donations.filter((d: any) => d.paymentStatus === "completed");
  const last30Days = completedDonations
    .filter((d: any) => {
      const date = new Date(d.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    })
    .reduce((acc: any, d: any) => {
      const date = format(new Date(d.createdAt), "MMM d");
      const existing = acc.find((item: any) => item.date === date);
      if (existing) {
        existing.amount += d.amount / 100;
      } else {
        acc.push({ date, amount: d.amount / 100 });
      }
      return acc;
    }, []);

  const byCampaign = completedDonations.reduce((acc: any, d: any) => {
    const campaign = d.campaign?.title || "General";
    const existing = acc.find((item: any) => item.name === campaign);
    if (existing) {
      existing.value += d.amount / 100;
    } else {
      acc.push({ name: campaign, value: d.amount / 100 });
    }
    return acc;
  }, []);

  const byCategory = completedDonations.reduce((acc: any, d: any) => {
    const category = d.campaign?.category || "general";
    const existing = acc.find((item: any) => item.name === category);
    if (existing) {
      existing.value += d.amount / 100;
    } else {
      acc.push({ name: category, value: d.amount / 100 });
    }
    return acc;
  }, []);

  const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Donations Management</h1>
        <p className="text-muted-foreground">Track and manage donations and campaigns</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-raised">
              ₦{((stats?.totalRaised || 0) / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-donors">{stats?.donorCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-campaigns">
              {campaigns.filter((c: any) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Donation</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-donation">
              ₦{((stats?.averageDonation || 0) / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="donations" data-testid="tab-donations">All Donations</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Donation Campaigns</CardTitle>
                <CardDescription>Manage fundraising campaigns</CardDescription>
              </div>
              <Button onClick={() => { setEditingCampaign(null); campaignForm.reset(); setCampaignDialog(true); }} data-testid="button-create-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign: any) => {
                    const progress = campaign.goalAmount > 0 ? (campaign.currentAmount / campaign.goalAmount) * 100 : 0;
                    return (
                      <Card key={campaign.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{campaign.title}</h3>
                              <p className="text-sm text-muted-foreground">{campaign.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge>{campaign.category}</Badge>
                                <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                                  {campaign.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updateCampaignMutation.mutate({
                                    id: campaign.id,
                                    status: campaign.status === "active" ? "paused" : "active",
                                  })
                                }
                                data-testid={`button-toggle-${campaign.id}`}
                              >
                                {campaign.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCampaign(campaign)}
                                data-testid={`button-edit-campaign-${campaign.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                data-testid={`button-delete-campaign-${campaign.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>₦{(campaign.currentAmount / 100).toLocaleString()} raised</span>
                              <span>Goal: ₦{(campaign.goalAmount / 100).toLocaleString()}</span>
                            </div>
                            <Progress value={progress} />
                            <div className="text-sm text-muted-foreground">
                              {progress.toFixed(1)}% of goal reached
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {campaigns.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No campaigns found</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Donations</CardTitle>
              <CardDescription>View and manage all donations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by donor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="input-search-donations"
                    />
                  </div>
                  <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                    <SelectTrigger className="w-full md:w-[180px]" data-testid="select-campaign">
                      <SelectValue placeholder="Campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {campaigns.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleExportDonations} variant="outline" data-testid="button-export-donations">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                {donationsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Donor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDonations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No donations found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredDonations.map((donation: any) => (
                              <TableRow key={donation.id}>
                                <TableCell>{format(new Date(donation.createdAt), "MMM d, yyyy")}</TableCell>
                                <TableCell>
                                  {donation.donorName || (donation.member ? `${donation.member.user.firstName} ${donation.member.user.lastName}` : "Anonymous")}
                                </TableCell>
                                <TableCell>₦{(donation.amount / 100).toLocaleString()}</TableCell>
                                <TableCell>{donation.campaign?.title || "General"}</TableCell>
                                <TableCell>
                                  <Badge variant={donation.paymentStatus === "completed" ? "default" : "secondary"}>
                                    {donation.paymentStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="capitalize">{donation.paymentMethod}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {filteredDonations.length} donations
                      </span>
                      <span className="font-semibold" data-testid="text-total-donations">
                        Total: ₦{(totalAmount / 100).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Donations Over Time (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={last30Days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#22c55e" name="Amount (NGN)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donations by Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={byCampaign} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {byCampaign.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donations by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Amount (NGN)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donation Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Donations:</span>
                  <span className="font-semibold">{stats?.donationCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Donation:</span>
                  <span className="font-semibold">₦{((stats?.averageDonation || 0) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Recurring:</span>
                  <span className="font-semibold">{stats?.recurringDonationsActive || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Donors:</span>
                  <span className="font-semibold">{stats?.donorCount || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-campaign-form">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? "Update campaign details" : "Create a new donation campaign"}
            </DialogDescription>
          </DialogHeader>
          <Form {...campaignForm}>
            <form onSubmit={campaignForm.handleSubmit((data) => {
              if (editingCampaign) {
                updateCampaignMutation.mutate({ id: editingCampaign.id, ...data });
              } else {
                createCampaignMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={campaignForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-campaign-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={campaignForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-campaign-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={campaignForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-campaign-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="campaign">Campaign</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="youth_programs">Youth Programs</SelectItem>
                          <SelectItem value="community_development">Community Development</SelectItem>
                          <SelectItem value="emergency_relief">Emergency Relief</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={campaignForm.control}
                  name="goalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Amount (NGN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-campaign-goal"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={campaignForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-campaign-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={campaignForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-campaign-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={campaignForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-campaign-image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={campaignForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" data-testid="button-save-campaign">
                  {editingCampaign ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
