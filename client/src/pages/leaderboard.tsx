import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, TrendingUp, MapPin } from "lucide-react";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [selectedStateId, setSelectedStateId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const { data: statesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/states"],
  });

  const { data: nationalData, isLoading: isLoadingNational } = useQuery<{
    success: boolean;
    data: any[];
    total: number;
  }>({
    queryKey: ["/api/leaderboards/national", { limit: pageSize, offset: (page - 1) * pageSize }],
  });

  const { data: stateData, isLoading: isLoadingState } = useQuery<{
    success: boolean;
    data: any[];
    total: number;
    stateName: string;
  }>({
    queryKey: ["/api/leaderboards/state", selectedStateId, { limit: pageSize, offset: 0 }],
    enabled: selectedStateId !== "all",
  });

  const { data: myRankData } = useQuery<{
    success: boolean;
    data: {
      nationalRank: number;
      nationalTotal: number;
      stateRank: number;
      stateTotal: number;
      totalPoints: number;
      nextRankPoints: number;
    };
  }>({
    queryKey: ["/api/leaderboards/my-rank"],
    enabled: !!memberData?.data?.id,
  });

  const states = statesData?.data || [];
  const myRank = myRankData?.data;
  const memberId = memberData?.data?.id;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          See where you rank among APC members nationwide
        </p>
      </div>

      {/* User Rank Card - Sticky */}
      {myRank && (
        <Card className="sticky top-4 z-10 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">National Rank</p>
                <p className="font-display text-3xl font-bold text-primary" data-testid="text-my-national-rank">
                  #{myRank.nationalRank}
                </p>
                <p className="text-xs text-muted-foreground">of {myRank.nationalTotal}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">State Rank</p>
                <p className="font-display text-3xl font-bold text-primary" data-testid="text-my-state-rank">
                  #{myRank.stateRank}
                </p>
                <p className="text-xs text-muted-foreground">of {myRank.stateTotal}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Points</p>
                <p className="font-display text-3xl font-bold text-primary" data-testid="text-my-total-points">
                  {(myRank.totalPoints ?? 0).toLocaleString()}
                </p>
                {(myRank.nextRankPoints ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {myRank.nextRankPoints} pts to next rank
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="national" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="national" data-testid="tab-national">
              National
            </TabsTrigger>
            <TabsTrigger value="state" data-testid="tab-state">
              By State
            </TabsTrigger>
          </TabsList>

          {selectedStateId !== "all" && (
            <Select value={selectedStateId} onValueChange={setSelectedStateId}>
              <SelectTrigger className="w-[200px]" data-testid="select-state">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* National Leaderboard */}
        <TabsContent value="national" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>National Leaderboard</CardTitle>
              <CardDescription>Top members across all states</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingNational ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (nationalData?.data || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leaderboard data available
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {(nationalData?.data || []).map((entry, index) => {
                      const rank = (page - 1) * pageSize + index + 1;
                      const isCurrentUser = entry.member?.id === memberId;
                      const userName = `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() || "Unknown Member";
                      
                      return (
                        <div
                          key={entry.member?.id || index}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            isCurrentUser ? "bg-primary/5 border-primary" : "hover-elevate"
                          }`}
                          data-testid={`leaderboard-entry-${rank}`}
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold">
                            {getRankBadge(rank) || `#${rank}`}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{userName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{entry.ward?.name || "N/A"}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono font-bold text-primary text-lg">
                              {entry.totalPoints?.toLocaleString() || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">points</p>
                          </div>

                          {isCurrentUser && (
                            <Badge variant="default">You</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {(nationalData?.total || 0) > pageSize && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * pageSize + 1} to{" "}
                        {Math.min(page * pageSize, nationalData?.total || 0)} of {nationalData?.total || 0}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          data-testid="button-prev-page"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page * pageSize >= (nationalData?.total || 0)}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* State Leaderboard */}
        <TabsContent value="state" className="space-y-4">
          {selectedStateId === "all" ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>Select a state to view its leaderboard</p>
                <Select value={selectedStateId} onValueChange={setSelectedStateId}>
                  <SelectTrigger className="w-[200px] mx-auto mt-4" data-testid="select-state-prompt">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{stateData?.stateName || "State"} Leaderboard</CardTitle>
                <CardDescription>Top members in this state</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingState ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (stateData?.data || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No members found in this state
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(stateData?.data || []).map((entry, index) => {
                      const rank = index + 1;
                      const isCurrentUser = entry.member?.id === memberId;
                      const userName = `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() || "Unknown Member";
                      
                      return (
                        <div
                          key={entry.member?.id || index}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            isCurrentUser ? "bg-primary/5 border-primary" : "hover-elevate"
                          }`}
                          data-testid={`state-leaderboard-entry-${rank}`}
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold">
                            {getRankBadge(rank) || `#${rank}`}
                          </div>

                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{userName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{entry.ward?.name || entry.lga?.name || "N/A"}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono font-bold text-primary text-lg">
                              {entry.totalPoints?.toLocaleString() || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">points</p>
                          </div>

                          {isCurrentUser && (
                            <Badge variant="default">You</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
