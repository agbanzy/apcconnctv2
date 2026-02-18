import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { queryClient } from "@/lib/queryClient";
import { io } from "socket.io-client";
import {
  BarChart3,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Activity,
  Radio,
  Award,
  Building2,
} from "lucide-react";
import type { GeneralElection, GeneralElectionCandidate, Party } from "@shared/schema";

type CandidateWithParty = GeneralElectionCandidate & { party: Party };
type ElectionWithCandidates = GeneralElection & {
  candidates: CandidateWithParty[];
  state?: { name: string } | null;
};

type ResultSummary = {
  candidates: Array<{
    candidate_id: string;
    candidate_name: string;
    running_mate: string | null;
    image_url: string | null;
    party_id: string;
    party_name: string;
    party_abbreviation: string;
    party_color: string;
    total_votes: number;
  }>;
  totalPollingUnitsReported: number;
  totalPollingUnits: number;
};

type LiveFeedItem = {
  reported_at: string;
  polling_unit_name: string;
  ward_name: string;
  lga_name: string;
  state_name: string;
  party: string;
  party_color: string;
  candidate_name: string;
  votes: number;
};

type StateResult = {
  state_id: string;
  state_name: string;
  party: string;
  party_color: string;
  votes: number;
  pus_reported: number;
};

const POSITION_LABELS: Record<string, string> = {
  presidential: "Presidential",
  governorship: "Governorship",
  senatorial: "Senatorial",
  house_of_reps: "House of Representatives",
  state_assembly: "State House of Assembly",
  lga_chairman: "LGA Chairman",
  councillorship: "Councillorship",
};

const POSITION_ICONS: Record<string, typeof Building2> = {
  presidential: Building2,
  governorship: MapPin,
  senatorial: Users,
  house_of_reps: Users,
  state_assembly: Building2,
  lga_chairman: MapPin,
  councillorship: Users,
};

export default function GeneralElections() {
  const [selectedElection, setSelectedElection] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("results");
  const [viewMode, setViewMode] = useState<"all" | "my">("my");

  const { data: allElectionsData, isLoading: allLoading } = useQuery<{
    success: boolean;
    data: ElectionWithCandidates[];
  }>({ queryKey: ["/api/general-elections"], enabled: viewMode === "all" });

  const { data: myElectionsData, isLoading: myLoading } = useQuery<{
    success: boolean;
    data: ElectionWithCandidates[];
    userLocation?: { state: string | null; lga: string | null; ward: string | null };
  }>({ queryKey: ["/api/general-elections/my-elections"], enabled: viewMode === "my" });

  const electionsData = viewMode === "my" ? myElectionsData : allElectionsData;
  const isLoading = viewMode === "my" ? myLoading : allLoading;

  const { data: summaryData, isLoading: summaryLoading } = useQuery<{
    success: boolean;
    data: ResultSummary;
  }>({
    queryKey: ["/api/general-elections", selectedElection, "results", "summary"],
    enabled: !!selectedElection,
  });

  const { data: stateData } = useQuery<{
    success: boolean;
    data: StateResult[];
  }>({
    queryKey: ["/api/general-elections", selectedElection, "results", "by-state"],
    enabled: !!selectedElection,
  });

  const { data: liveFeedData } = useQuery<{
    success: boolean;
    data: LiveFeedItem[];
  }>({
    queryKey: ["/api/general-elections", selectedElection, "results", "live-feed"],
    enabled: !!selectedElection,
  });

  useEffect(() => {
    const socket = io();
    socket.on("general-election:result-updated", () => {
      if (selectedElection) {
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections", selectedElection, "results", "summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections", selectedElection, "results", "by-state"] });
        queryClient.invalidateQueries({ queryKey: ["/api/general-elections", selectedElection, "results", "live-feed"] });
      }
    });
    socket.on("general-election:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections/my-elections"] });
    });
    socket.on("general-elections:bulk-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/general-elections/my-elections"] });
    });
    return () => { socket.disconnect(); };
  }, [selectedElection]);

  const elections = electionsData?.data || [];
  const filteredElections = positionFilter === "all"
    ? elections
    : elections.filter((e) => e.position === positionFilter);

  useEffect(() => {
    if (!selectedElection && filteredElections.length > 0) {
      setSelectedElection(filteredElections[0].id);
    }
  }, [filteredElections, selectedElection]);

  const currentElection = elections.find((e) => e.id === selectedElection);
  const summary = summaryData?.data;
  const totalVotes = summary?.candidates?.reduce((sum, c) => sum + c.total_votes, 0) || 0;
  const stateResults = stateData?.data || [];
  const liveFeed = liveFeedData?.data || [];

  const stateWinners = new Map<string, { party: string; color: string; votes: number }>();
  stateResults.forEach((r) => {
    const existing = stateWinners.get(r.state_name);
    if (!existing || r.votes > existing.votes) {
      stateWinners.set(r.state_name, { party: r.party, color: r.party_color, votes: r.votes });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="general-elections-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">General Elections</h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === "my" && myElectionsData?.userLocation?.state
              ? `Elections in your area: ${myElectionsData.userLocation.state}${myElectionsData.userLocation.lga ? ` / ${myElectionsData.userLocation.lga}` : ""}`
              : "Live election results and updates across Nigeria"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border rounded-md overflow-visible">
            <Button
              variant={viewMode === "my" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("my"); setSelectedElection(null); }}
              className="rounded-none rounded-l-md"
              data-testid="button-my-elections"
            >
              <MapPin className="w-4 h-4 mr-1" /> My Area
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("all"); setSelectedElection(null); }}
              className="rounded-none rounded-r-md"
              data-testid="button-all-elections"
            >
              All Elections
            </Button>
          </div>
          <Select value={positionFilter} onValueChange={(v) => { setPositionFilter(v); setSelectedElection(null); }}>
            <SelectTrigger className="w-[200px]" data-testid="select-position-filter">
              <SelectValue placeholder="Filter by position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="presidential">Presidential</SelectItem>
              <SelectItem value="governorship">Governorship</SelectItem>
              <SelectItem value="senatorial">Senatorial</SelectItem>
              <SelectItem value="house_of_reps">House of Reps</SelectItem>
              <SelectItem value="state_assembly">State Assembly</SelectItem>
              <SelectItem value="lga_chairman">LGA Chairman</SelectItem>
              <SelectItem value="councillorship">Councillorship</SelectItem>
            </SelectContent>
          </Select>
          {currentElection?.status === "ongoing" && (
            <Badge variant="destructive" className="gap-1 animate-pulse" data-testid="badge-live">
              <Radio className="w-3 h-3" /> LIVE
            </Badge>
          )}
        </div>
      </div>

      {filteredElections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No general elections found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filteredElections.map((election) => (
              <Button
                key={election.id}
                variant={selectedElection === election.id ? "default" : "outline"}
                className="whitespace-nowrap"
                onClick={() => setSelectedElection(election.id)}
                data-testid={`button-election-${election.id}`}
              >
                {POSITION_LABELS[election.position] || election.position}
                {election.state?.name ? ` - ${election.state.name}` : ""}
                <Badge variant="secondary" className="ml-2">
                  {election.electionYear}
                </Badge>
              </Button>
            ))}
          </div>

          {currentElection && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Votes</p>
                        <p className="text-2xl font-bold" data-testid="text-total-votes">
                          {totalVotes.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PUs Reported</p>
                        <p className="text-2xl font-bold" data-testid="text-pus-reported">
                          {(summary?.totalPollingUnitsReported || 0).toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}/ {(summary?.totalPollingUnits || 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Candidates</p>
                        <p className="text-2xl font-bold" data-testid="text-candidates-count">
                          {currentElection.candidates?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Clock className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge
                          variant={currentElection.status === "ongoing" ? "destructive" : currentElection.status === "completed" ? "default" : "secondary"}
                          data-testid="badge-election-status"
                        >
                          {currentElection.status?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList data-testid="tabs-results">
                  <TabsTrigger value="results">
                    <TrendingUp className="w-4 h-4 mr-1" /> Results
                  </TabsTrigger>
                  <TabsTrigger value="states">
                    <MapPin className="w-4 h-4 mr-1" /> By State
                  </TabsTrigger>
                  <TabsTrigger value="live-feed">
                    <Activity className="w-4 h-4 mr-1" /> Live Feed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="space-y-4">
                  {summaryLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {summary?.candidates?.map((candidate, idx) => {
                        const percentage = totalVotes > 0 ? (candidate.total_votes / totalVotes) * 100 : 0;
                        return (
                          <Card key={candidate.candidate_id} data-testid={`card-candidate-${candidate.candidate_id}`}>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {idx === 0 && totalVotes > 0 && (
                                    <Award className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                  )}
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: candidate.party_color }}
                                  >
                                    {candidate.party_abbreviation?.slice(0, 3)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate" data-testid={`text-candidate-name-${candidate.candidate_id}`}>
                                      {candidate.candidate_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {candidate.party_name} ({candidate.party_abbreviation})
                                      {candidate.running_mate && ` / ${candidate.running_mate}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xl font-bold" data-testid={`text-votes-${candidate.candidate_id}`}>
                                    {candidate.total_votes.toLocaleString()}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <Progress
                                value={percentage}
                                className="mt-3 h-3"
                                style={{
                                  ["--progress-background" as any]: candidate.party_color,
                                }}
                              />
                            </CardContent>
                          </Card>
                        );
                      })}
                      {(!summary?.candidates || summary.candidates.length === 0) && (
                        <Card>
                          <CardContent className="py-12 text-center text-muted-foreground">
                            No results reported yet. Results will appear here as they come in.
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="states" className="space-y-4">
                  {stateResults.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No state-level results available yet.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from(stateWinners.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([stateName, winner]) => {
                          const stateParties = stateResults
                            .filter((r) => r.state_name === stateName)
                            .sort((a, b) => b.votes - a.votes);
                          const stateTotal = stateParties.reduce((s, p) => s + p.votes, 0);

                          return (
                            <Card key={stateName} data-testid={`card-state-${stateName}`}>
                              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                                <CardTitle className="text-sm font-medium">{stateName}</CardTitle>
                                <Badge style={{ backgroundColor: winner.color, color: "#fff" }}>
                                  {winner.party}
                                </Badge>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {stateParties.slice(0, 4).map((p) => (
                                  <div key={p.party} className="flex items-center justify-between gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: p.party_color }}
                                      />
                                      <span>{p.party}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{p.votes.toLocaleString()}</span>
                                      <span className="text-muted-foreground text-xs">
                                        ({stateTotal > 0 ? ((p.votes / stateTotal) * 100).toFixed(0) : 0}%)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {stateParties[0]?.pus_reported || 0} PUs reported
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="live-feed" className="space-y-2">
                  {liveFeed.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Waiting for live results...
                      </CardContent>
                    </Card>
                  ) : (
                    liveFeed.map((item, idx) => (
                      <Card key={idx} data-testid={`card-feed-${idx}`}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: item.party_color }}
                              >
                                {item.party}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.candidate_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.polling_unit_name} - {item.ward_name}, {item.lga_name}, {item.state_name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold">{item.votes.toLocaleString()} votes</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.reported_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}
