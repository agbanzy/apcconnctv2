import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Users, Vote, TrendingUp, Award, DollarSign, Calendar, Filter, Repeat } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemberWithDues {
  id: string;
  memberId: string;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  ward: {
    name: string;
    lga: {
      name: string;
      state: {
        name: string;
      };
    };
  };
  latestDues?: {
    id: string;
    amount: string;
    paymentStatus: string;
    dueDate: string;
    paidAt?: string;
  };
  recurringDues?: {
    id: string;
    amount: string;
    frequency: string;
    status: string;
    nextPaymentDate: string;
  };
  duesStatus: string;
  hasRecurring: boolean;
}

export default function Admin() {
  const { toast } = useToast();
  const [duesFilter, setDuesFilter] = useState<string>("all");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");

  const { data: membersData, isLoading: loadingMembers } = useQuery<{ 
    success: boolean; 
    data: MemberWithDues[] 
  }>({
    queryKey: ["/api/admin/dues/all"],
  });

  const generateBulkDuesMutation = useMutation({
    mutationFn: async (data: { amount: number; dueDate: string }) => {
      const res = await apiRequest("POST", "/api/admin/dues/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dues/all"] });
      toast({
        title: "Bulk dues generated",
        description: `Generated dues for ${data.count} active members`,
      });
      setBulkAmount("");
      setBulkDueDate("");
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate bulk dues. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBulkDues = () => {
    if (!bulkAmount || !bulkDueDate) {
      toast({
        title: "Missing fields",
        description: "Please enter both amount and due date",
        variant: "destructive",
      });
      return;
    }

    generateBulkDuesMutation.mutate({
      amount: parseFloat(bulkAmount),
      dueDate: bulkDueDate,
    });
  };

  const members = membersData?.data || [];
  const filteredMembers = members.filter((member) => {
    if (duesFilter === "all") return true;
    if (duesFilter === "paid") return member.duesStatus === "paid";
    if (duesFilter === "pending") return member.duesStatus === "pending";
    if (duesFilter === "overdue") {
      return member.latestDues && 
             member.duesStatus === "pending" && 
             new Date(member.latestDues.dueDate) < new Date();
    }
    return true;
  });

  // Calculate summary stats
  const totalMembers = members.length;
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  
  const totalCollectedThisMonth = members.reduce((sum, member) => {
    if (member.latestDues?.paidAt) {
      const paidDate = new Date(member.latestDues.paidAt);
      if (paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear) {
        return sum + parseFloat(member.latestDues.amount);
      }
    }
    return sum;
  }, 0);

  const pendingPayments = members.filter(m => m.duesStatus === "pending").length;
  const membersWithRecurring = members.filter(m => m.hasRecurring).length;

  const wardData = [
    { ward: "Ward 1", members: 234, dues: "₦1,170,000", engagement: 78 },
    { ward: "Ward 2", members: 189, dues: "₦945,000", engagement: 65 },
    { ward: "Ward 3", members: 312, dues: "₦1,560,000", engagement: 82 },
    { ward: "Ward 4", members: 276, dues: "₦1,380,000", engagement: 71 },
    { ward: "Ward 5", members: 298, dues: "₦1,490,000", engagement: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor membership, engagement, and financial metrics across wards and LGAs
          </p>
        </div>
        <Select defaultValue="lagos">
          <SelectTrigger className="w-[200px]" data-testid="select-state">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lagos">Lagos State</SelectItem>
            <SelectItem value="kano">Kano State</SelectItem>
            <SelectItem value="abuja">FCT Abuja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList data-testid="tabs-admin">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="dues" data-testid="tab-dues">Dues Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              title="Total Members"
              value="12,458"
              change={15.2}
              icon={Users}
              description="Across all wards and LGAs"
            />
            <StatsCard
              title="Dues Collected"
              value="₦62.3M"
              change={23.8}
              icon={DollarSign}
              description="This month"
            />
            <StatsCard
              title="Avg. Engagement"
              value="76%"
              change={8.4}
              icon={TrendingUp}
              description="Member activity rate"
            />
            <StatsCard
              title="Active Volunteers"
              value="3,234"
              change={18.7}
              icon={Award}
              description="Completed tasks"
            />
            <StatsCard
              title="Primaries Votes"
              value="8,901"
              change={42.1}
              icon={Vote}
              description="Cast in current cycle"
            />
            <StatsCard
              title="Events This Month"
              value="47"
              change={12.3}
              icon={Calendar}
              description="Scheduled activities"
            />
          </div>

          <Card data-testid="card-ward-breakdown">
            <CardHeader>
              <CardTitle>Ward-Level Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-muted-foreground pb-2 border-b">
                  <div>Ward</div>
                  <div>Members</div>
                  <div>Dues Collected</div>
                  <div>Engagement</div>
                </div>
                {wardData.map((ward, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg hover-elevate border"
                    data-testid={`ward-${idx}`}
                  >
                    <div className="font-semibold">{ward.ward}</div>
                    <div className="font-mono tabular-nums">{ward.members}</div>
                    <div className="font-mono tabular-nums">{ward.dues}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${ward.engagement}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm tabular-nums">{ward.engagement}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-members">
                  {loadingMembers ? <Skeleton className="h-8 w-20" /> : totalMembers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active and pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-collected-month">
                  {loadingMembers ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    `₦${totalCollectedThisMonth.toLocaleString()}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  From paid dues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-payments">
                  {loadingMembers ? <Skeleton className="h-8 w-16" /> : pendingPayments.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recurring Dues</CardTitle>
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-recurring-members">
                  {loadingMembers ? <Skeleton className="h-8 w-16" /> : membersWithRecurring.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active subscriptions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generate Bulk Dues</CardTitle>
              <CardDescription>
                Create dues for all active members at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bulk-amount">Amount (₦)</Label>
                  <Input
                    id="bulk-amount"
                    type="number"
                    placeholder="5000"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    data-testid="input-bulk-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-due-date">Due Date</Label>
                  <Input
                    id="bulk-due-date"
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    data-testid="input-bulk-due-date"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleGenerateBulkDues}
                    disabled={generateBulkDuesMutation.isPending}
                    className="w-full"
                    data-testid="button-generate-bulk-dues"
                  >
                    {generateBulkDuesMutation.isPending ? "Generating..." : "Generate Dues for All Members"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-dues-management">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Members Dues Status</CardTitle>
                  <CardDescription>View and manage all member dues</CardDescription>
                </div>
                <Select value={duesFilter} onValueChange={setDuesFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-dues-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Latest Dues Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Recurring Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No members found matching the selected filter
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                            <TableCell className="font-mono" data-testid={`text-member-id-${member.id}`}>
                              {member.memberId}
                            </TableCell>
                            <TableCell data-testid={`text-member-name-${member.id}`}>
                              {member.user?.firstName || "Unknown"} {member.user?.lastName || ""}
                            </TableCell>
                            <TableCell data-testid={`text-member-ward-${member.id}`}>
                              {member.ward.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  member.duesStatus === "paid"
                                    ? "default"
                                    : member.duesStatus === "pending"
                                    ? "secondary"
                                    : "outline"
                                }
                                data-testid={`badge-dues-status-${member.id}`}
                              >
                                {member.duesStatus === "paid" && "Paid"}
                                {member.duesStatus === "pending" && "Pending"}
                                {member.duesStatus === "none" && "No Dues"}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-payment-date-${member.id}`}>
                              {member.latestDues?.paidAt
                                ? format(new Date(member.latestDues.paidAt), "MMM dd, yyyy")
                                : member.latestDues?.dueDate
                                ? `Due: ${format(new Date(member.latestDues.dueDate), "MMM dd, yyyy")}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {member.hasRecurring ? (
                                <Badge variant="outline" data-testid={`badge-recurring-${member.id}`}>
                                  <Repeat className="h-3 w-3 mr-1" />
                                  {member.recurringDues?.frequency}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums" data-testid={`text-amount-${member.id}`}>
                              {member.latestDues
                                ? `₦${parseFloat(member.latestDues.amount).toLocaleString()}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
