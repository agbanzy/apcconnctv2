import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { 
  Users, 
  Vote, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Plus,
  FileText,
  Activity
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
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/analytics/overview"],
  });

  const membersTrendData = [
    { month: 'Jan', members: 850 },
    { month: 'Feb', members: 920 },
    { month: 'Mar', members: 1050 },
    { month: 'Apr', members: 1180 },
    { month: 'May', members: 1320 },
    { month: 'Jun', members: 1450 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 125000 },
    { month: 'Feb', revenue: 138000 },
    { month: 'Mar', revenue: 157500 },
    { month: 'Apr', revenue: 177000 },
    { month: 'May', revenue: 198000 },
    { month: 'Jun', revenue: 217500 },
  ];

  const engagementData = [
    { name: 'Active', value: 68 },
    { name: 'Moderate', value: 22 },
    { name: 'Low', value: 10 },
  ];

  const recentActivity = [
    { id: 1, action: 'New member registered', user: 'John Doe', time: '5 minutes ago' },
    { id: 2, action: 'Election created', user: 'Admin', time: '15 minutes ago' },
    { id: 3, action: 'Event published', user: 'Coordinator', time: '1 hour ago' },
    { id: 4, action: 'Campaign approved', user: 'Admin', time: '2 hours ago' },
    { id: 5, action: 'Incident reported', user: 'Member', time: '3 hours ago' },
    { id: 6, action: 'News post published', user: 'Admin', time: '4 hours ago' },
    { id: 7, action: 'Task completed', user: 'Volunteer', time: '5 hours ago' },
    { id: 8, action: 'Quiz attempted', user: 'Member', time: '6 hours ago' },
    { id: 9, action: 'Dues payment received', user: 'Member', time: '7 hours ago' },
    { id: 10, action: 'RSVP confirmed', user: 'Member', time: '8 hours ago' },
  ];

  const stats = overview?.data || {
    totalMembers: 1450,
    activeElections: 3,
    upcomingEvents: 8,
    duesCollected: 217500,
    engagementRate: 68
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Dashboard' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-admin-dashboard-title">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of platform metrics and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-create-election">
            <Vote className="h-4 w-4 mr-2" />
            Create Election
          </Button>
          <Button variant="outline" data-testid="button-create-event">
            <Calendar className="h-4 w-4 mr-2" />
            Create Event
          </Button>
          <Button data-testid="button-create-news">
            <FileText className="h-4 w-4 mr-2" />
            Create News
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
            <div className="text-2xl font-bold" data-testid="text-total-members">{stats.totalMembers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-elections">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-elections">{stats.activeElections}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-events">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-dues-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dues Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dues-collected">₦{(stats.duesCollected / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card data-testid="card-engagement-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-engagement-rate">{stats.engagementRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average activity</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-members-trend">
          <CardHeader>
            <CardTitle>Members Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={membersTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="members" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle>Dues Collection (₦)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-engagement-chart" className="md:col-span-1">
          <CardHeader>
            <CardTitle>Member Engagement</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-md hover-elevate" data-testid={`activity-${activity.id}`}>
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
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
              <p className="text-sm font-medium">API Status</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Operational</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Database</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">WebSocket</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Storage</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">78% Used</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
