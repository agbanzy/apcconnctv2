import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Calendar,
  Megaphone,
  MapPin,
  TrendingUp,
  Award,
  ExternalLink,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface StateDetailModalProps {
  stateId: string | null;
  stateName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StateStats {
  memberCount: number;
  activeMembers: number;
  upcomingEvents: number;
  activeCampaigns: number;
  lgasCovered: number;
  wardsCovered: number;
}

interface LGA {
  id: string;
  name: string;
  memberCount: number;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  votes: number;
}

const COLORS = ['hsl(142 65% 35%)', 'hsl(142 65% 50%)', 'hsl(142 65% 65%)', 'hsl(142 65% 80%)'];

export function StateDetailModal({ stateId, stateName, open, onOpenChange }: StateDetailModalProps) {
  const { data: mapData } = useQuery<{ states: StateStats[] }>({
    queryKey: ['/api/analytics/map-data'],
  });

  const { data: lgasData } = useQuery<LGA[]>({
    queryKey: stateId ? ['/api/locations/states', stateId, 'lgas'] : [],
    enabled: !!stateId && open,
  });

  const { data: eventsData } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: open,
  });

  const { data: campaignsData } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    enabled: open,
  });

  const stateStats = mapData?.states.find((s: any) => s.name === stateName);

  if (!stateId || !stateName) return null;

  const memberChartData = stateStats ? [
    { name: 'Active', value: stateStats.activeMembers },
    { name: 'Inactive', value: stateStats.memberCount - stateStats.activeMembers },
  ] : [];

  const activityScore = stateStats 
    ? ((stateStats.activeMembers / Math.max(stateStats.memberCount, 1)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="modal-state-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MapPin className="h-6 w-6 text-primary" />
            {stateName} State
          </DialogTitle>
          <DialogDescription>
            Detailed overview of APC Connect activities in {stateName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Key Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold" data-testid="text-total-members">
                      {stateStats?.memberCount || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold" data-testid="text-active-members">
                      {stateStats?.activeMembers || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold" data-testid="text-upcoming-events">
                      {stateStats?.upcomingEvents || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold" data-testid="text-active-campaigns">
                      {stateStats?.activeCampaigns || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Activity Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={activityScore} className="h-3" data-testid="progress-activity" />
                <p className="text-sm text-muted-foreground">
                  {activityScore.toFixed(1)}% of members are active
                </p>
              </CardContent>
            </Card>

            {/* Coverage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coverage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">LGAs Covered</span>
                  <Badge variant="outline" data-testid="badge-lgas-covered">
                    {stateStats?.lgasCovered || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Wards Covered</span>
                  <Badge variant="outline" data-testid="badge-wards-covered">
                    {stateStats?.wardsCovered || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Member Distribution Chart */}
            {stateStats && stateStats.memberCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Member Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={memberChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {memberChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* LGAs List */}
            {lgasData && lgasData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Local Government Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {lgasData.map((lga: any) => (
                        <div
                          key={lga.id}
                          className="flex items-center justify-between p-2 rounded-md hover-elevate"
                          data-testid={`lga-${lga.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <span className="text-sm">{lga.name}</span>
                          <Badge variant="outline">{lga.code}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Call to Action */}
            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1"
                data-testid="button-view-members"
              >
                <Users className="h-4 w-4 mr-2" />
                View Members in {stateName}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                data-testid="button-view-events"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Events
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                data-testid="button-join-campaign"
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Join Campaign
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
