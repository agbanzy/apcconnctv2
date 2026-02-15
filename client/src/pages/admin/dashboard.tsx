import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  Users, 
  Vote, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  FileText,
  Activity,
  Download,
  Database,
  Radio,
  Server,
  HardDrive,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [exportingMembers, setExportingMembers] = useState(false);
  const [exportingVotes, setExportingVotes] = useState(false);
  const [exportingDonations, setExportingDonations] = useState(false);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: healthData } = useQuery({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 30000,
  });

  const handleExport = async (type: 'members' | 'votes' | 'donations') => {
    const setters = {
      members: setExportingMembers,
      votes: setExportingVotes,
      donations: setExportingDonations
    };

    try {
      setters[type](true);
      const response = await fetch(`/api/admin/export/${type}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${type}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${type}_export_${Date.now()}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} data has been exported successfully.`
      });
    } catch (error) {
      console.error(`Export ${type} error:`, error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : `Failed to export ${type} data`,
        variant: "destructive"
      });
    } finally {
      setters[type](false);
    }
  };

  const stats = (dashboardData as any)?.data || {};
  const membersTrendData = stats.monthlyMembers || [];
  const revenueData = stats.monthlyDues || [];
  const recentActivity = stats.recentActivity || [];
  const health = (healthData as any)?.data || {};

  const engagementData = [
    { name: 'Engagement', value: stats.engagementRate || 0 },
    { name: 'Remaining', value: 100 - (stats.engagementRate || 0) },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Dashboard' }]} />
      
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-admin-dashboard-title">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of platform metrics and recent activity</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/admin/elections')} data-testid="button-create-election">
            <Vote className="h-4 w-4 mr-2" />
            Elections
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/events')} data-testid="button-create-event">
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </Button>
          <Button onClick={() => navigate('/admin/content')} data-testid="button-create-news">
            <FileText className="h-4 w-4 mr-2" />
            Content
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card data-testid="card-total-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-members">{(stats.totalMembers || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeMembers || 0} active</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-elections">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-elections">{stats.activeElections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-events">{stats.upcomingEvents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-dues-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dues Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dues-collected">
              {stats.duesCollected > 0 ? `₦${(stats.duesCollected / 1000).toFixed(0)}K` : '₦0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total completed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-engagement-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-engagement-rate">{stats.engagementRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Activity ratio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-members-trend">
          <CardHeader>
            <CardTitle>Members Growth (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {membersTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={membersTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="members" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No membership data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle>Dues Collection (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No dues collection data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-data-export">
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <p className="text-sm text-muted-foreground">Download data in CSV format for reporting and analysis</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Members Data</h3>
                  <p className="text-xs text-muted-foreground">Export all member information</p>
                </div>
              </div>
              <Button 
                onClick={() => handleExport('members')}
                disabled={exportingMembers}
                className="w-full"
                data-testid="button-export-members"
              >
                {exportingMembers ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Members
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Vote className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Votes Data</h3>
                  <p className="text-xs text-muted-foreground">Export election voting records</p>
                </div>
              </div>
              <Button 
                onClick={() => handleExport('votes')}
                disabled={exportingVotes}
                className="w-full"
                data-testid="button-export-votes"
              >
                {exportingVotes ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Votes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Donations Data</h3>
                  <p className="text-xs text-muted-foreground">Export donation transactions</p>
                </div>
              </div>
              <Button 
                onClick={() => handleExport('donations')}
                disabled={exportingDonations}
                className="w-full"
                data-testid="button-export-donations"
              >
                {exportingDonations ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Donations
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-engagement-chart" className="md:col-span-1">
          <CardHeader>
            <CardTitle>Engagement Score</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS[0]} />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity" className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`activity-${activity.id}`}>
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={activity.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                        {activity.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-system-health">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">API Status</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${health.api === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">{health.api || 'Checking...'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Database</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${health.database === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">{health.database || 'Checking...'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">WebSocket</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${health.websocket === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-muted-foreground">{health.websocket || 'Checking...'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Memory</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${(health.memoryUsage || 0) < 80 ? 'bg-green-500' : (health.memoryUsage || 0) < 90 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">{health.memoryUsage ? `${health.memoryUsage}% Used` : 'Checking...'}</span>
              </div>
            </div>
          </div>
          {health.totalRecords && (
            <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-db-members">{health.totalRecords.members}</p>
                <p className="text-xs text-muted-foreground">Members in DB</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-db-events">{health.totalRecords.events}</p>
                <p className="text-xs text-muted-foreground">Events in DB</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-db-elections">{health.totalRecords.elections}</p>
                <p className="text-xs text-muted-foreground">Elections in DB</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
