import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, Vote, DollarSign, TrendingUp } from "lucide-react";
import { NigeriaMap } from "@/components/nigeria-map";
import { StateDetailModal } from "@/components/state-detail-modal";

export default function Analytics() {
  const { user } = useAuth();
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStateClick = (stateId: string, stateName: string) => {
    setSelectedStateId(stateId);
    setSelectedStateName(stateName);
    setIsModalOpen(true);
  };

  const { data: overviewData, isLoading: isLoadingOverview } = useQuery<{
    success: boolean;
    data: {
      totalMembers: number;
      activeMembers: number;
      totalEvents: number;
      totalElections: number;
      totalVotes: number;
    };
  }>({
    queryKey: ["/api/analytics/overview"],
    enabled: user?.role === "admin" || user?.role === "coordinator",
  });

  const { data: membershipData } = useQuery<{
    success: boolean;
    data: Array<{
      wardId: string;
      count: number;
      ward: any;
    }>;
  }>({
    queryKey: ["/api/analytics/membership-stats"],
    enabled: user?.role === "admin" || user?.role === "coordinator",
  });

  const { data: engagementData } = useQuery<{
    success: boolean;
    data: {
      totalRsvps: number;
      totalQuizAttempts: number;
      totalTaskApplications: number;
      totalCampaignVotes: number;
    };
  }>({
    queryKey: ["/api/analytics/engagement-metrics"],
    enabled: user?.role === "admin" || user?.role === "coordinator",
  });

  const { data: duesData } = useQuery<{
    success: boolean;
    data: {
      totalDues: number;
      paidDues: number;
      pendingDues: number;
    };
  }>({
    queryKey: ["/api/analytics/dues-summary"],
    enabled: user?.role === "admin" || user?.role === "coordinator",
  });

  if (user?.role !== "admin" && user?.role !== "coordinator") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view analytics.
        </p>
      </div>
    );
  }

  if (isLoadingOverview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const overview = overviewData?.data;
  const engagement = engagementData?.data;
  const dues = duesData?.data;
  const membershipStats = membershipData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive insights into platform performance and member engagement
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Membership Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Members"
            value={overview?.totalMembers.toString() || "0"}
            change={0}
            icon={Users}
          />
          <StatsCard
            title="Active Members"
            value={overview?.activeMembers.toString() || "0"}
            change={0}
            icon={Users}
          />
          <StatsCard
            title="Total Events"
            value={overview?.totalEvents.toString() || "0"}
            change={0}
            icon={Calendar}
          />
          <StatsCard
            title="Elections"
            value={overview?.totalElections.toString() || "0"}
            change={0}
            icon={Vote}
          />
          <StatsCard
            title="Votes Cast"
            value={overview?.totalVotes.toString() || "0"}
            change={0}
            icon={TrendingUp}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Nationwide Coverage Map</h2>
        <NigeriaMap 
          onStateClick={handleStateClick}
          showLegend={true}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Engagement Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Event RSVPs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-rsvps">
                {engagement?.totalRsvps || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-quiz-attempts">
                {engagement?.totalQuizAttempts || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Task Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-task-applications">
                {engagement?.totalTaskApplications || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Campaign Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-campaign-votes">
                {engagement?.totalCampaignVotes || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Membership Dues</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-dues">
                ₦{(dues?.totalDues || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600" data-testid="text-paid-dues">
                ₦{(dues?.paidDues || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600" data-testid="text-pending-dues">
                ₦{(dues?.pendingDues || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership by Ward</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {membershipStats.slice(0, 10).map((stat) => (
              <div
                key={stat.wardId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="font-medium">
                  {stat.ward?.name || "Unknown Ward"}
                </span>
                <span className="text-muted-foreground">{stat.count} members</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <StateDetailModal
        stateId={selectedStateId}
        stateName={selectedStateName}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
