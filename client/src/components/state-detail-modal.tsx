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
  Building2,
  Vote,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface StateDetailModalProps {
  stateId: string | null;
  stateName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StateStats {
  stateId: string;
  name: string;
  code: string;
  memberCount: number;
  activeMembers: number;
  upcomingEvents: number;
  activeCampaigns: number;
  lgasCovered: number;
  wardsCovered: number;
  pollingUnitsCount: number;
  newsCount: number;
  tasksCount: number;
}

interface LgaStats {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  activeMembers: number;
  wardCount: number;
  pollingUnitsCount: number;
  eventsCount: number;
}

const COLORS = ['hsl(142 65% 35%)', 'hsl(142 65% 50%)', 'hsl(142 65% 65%)', 'hsl(142 65% 80%)'];

export function StateDetailModal({ stateId, stateName, open, onOpenChange }: StateDetailModalProps) {
  const { data: mapRaw, isLoading: isLoadingMap } = useQuery<{ success: boolean; data: { states: StateStats[] } }>({
    queryKey: ['/api/analytics/map-data'],
    enabled: open,
  });

  const { data: lgaRaw, isLoading: isLoadingLgas } = useQuery<{ success: boolean; data: LgaStats[] }>({
    queryKey: ['/api/analytics/state', stateId, 'lgas'],
    enabled: !!stateId && open,
  });

  if (!stateId || !stateName) return null;

  const stateStats = mapRaw?.data?.states?.find((s) => s.name === stateName || s.stateId === stateId);
  const lgasData = lgaRaw?.data || [];
  const isLoading = isLoadingMap || isLoadingLgas;

  const memberChartData = stateStats ? [
    { name: 'Active', value: stateStats.activeMembers },
    { name: 'Inactive', value: Math.max(0, stateStats.memberCount - stateStats.activeMembers) },
  ] : [];

  const activityScore = stateStats
    ? ((stateStats.activeMembers / Math.max(stateStats.memberCount, 1)) * 100)
    : 0;

  const lgaBarData = lgasData
    .filter((l) => l.memberCount > 0)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 15)
    .map((l) => ({ name: l.name.length > 12 ? l.name.slice(0, 12) + '...' : l.name, members: l.memberCount, active: l.activeMembers }));

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
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
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
                        {(stateStats?.memberCount || 0).toLocaleString()}
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
                        {(stateStats?.activeMembers || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Polling Units
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Vote className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold" data-testid="text-polling-units">
                        {(stateStats?.pollingUnitsCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Events
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
              </div>

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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coverage Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-md bg-muted/50">
                      <div className="text-2xl font-bold" data-testid="badge-lgas-total">{lgasData.length}</div>
                      <div className="text-xs text-muted-foreground">Total LGAs</div>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/50">
                      <div className="text-2xl font-bold" data-testid="badge-lgas-covered">
                        {stateStats?.lgasCovered || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">LGAs with Members</div>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/50">
                      <div className="text-2xl font-bold" data-testid="badge-wards-covered">
                        {stateStats?.wardsCovered || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Wards with Members</div>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/50">
                      <div className="text-2xl font-bold" data-testid="badge-campaigns">
                        {stateStats?.activeCampaigns || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Active Campaigns</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                          {memberChartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {lgaBarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Members by LGA (Top {lgaBarData.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, lgaBarData.length * 30)}>
                      <BarChart data={lgaBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="members" fill="hsl(142, 65%, 45%)" name="Total Members" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="active" fill="hsl(142, 65%, 65%)" name="Active Members" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Local Government Areas ({lgasData.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lgasData.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1">
                        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                          <span>LGA Name</span>
                          <span className="text-right">Members</span>
                          <span className="text-right">Wards</span>
                          <span className="text-right">PUs</span>
                        </div>
                        {lgasData.map((lga) => (
                          <div
                            key={lga.id}
                            className="grid grid-cols-[1fr_80px_80px_80px] gap-2 items-center px-3 py-2 rounded-md hover-elevate"
                            data-testid={`lga-row-${lga.id}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm truncate">{lga.name}</span>
                              {lga.memberCount > 0 && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {lga.activeMembers} active
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-right" data-testid={`lga-members-${lga.id}`}>
                              {lga.memberCount.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground text-right">
                              {lga.wardCount}
                            </span>
                            <span className="text-sm text-muted-foreground text-right">
                              {lga.pollingUnitsCount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No LGA data available for this state
                    </p>
                  )}
                </CardContent>
              </Card>

              <Separator />

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
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
