import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trophy, Award, Star, TrendingUp, Filter, Smartphone, ArrowRight, History, CheckCircle, XCircle, Clock } from "lucide-react";
import { BadgeCard } from "@/components/badge-card";
import { AchievementCard } from "@/components/achievement-card";
import { Leaderboard } from "@/components/leaderboard";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { format } from "date-fns";

const LEVELS = [
  { level: 1, minPoints: 0, maxPoints: 99, name: "Newcomer" },
  { level: 2, minPoints: 100, maxPoints: 249, name: "Member" },
  { level: 3, minPoints: 250, maxPoints: 499, name: "Active Member" },
  { level: 4, minPoints: 500, maxPoints: 999, name: "Dedicated Member" },
  { level: 5, minPoints: 1000, maxPoints: 1999, name: "Champion" },
  { level: 6, minPoints: 2000, maxPoints: 4999, name: "Leader" },
  { level: 7, minPoints: 5000, maxPoints: Infinity, name: "Legend" },
];

function getLevelInfo(points: number) {
  const currentLevel = LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints) || LEVELS[0];
  const nextLevel = LEVELS[currentLevel.level] || null;
  const progressToNext = nextLevel 
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;
  
  return { currentLevel, nextLevel, progressToNext };
}

const CARRIERS = ["MTN", "Airtel", "Glo", "9Mobile"];
const PREDEFINED_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function RewardsPage() {
  const { toast } = useToast();
  const [badgeFilter, setBadgeFilter] = useState<"all" | "earned" | "locked">("all");
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<string>("all");
  const [achievementSort, setAchievementSort] = useState<"progress" | "points" | "rarity">("progress");
  
  const [redemptionType, setRedemptionType] = useState<"airtime" | "data">("airtime");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("MTN");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [amount, setAmount] = useState<number>(100);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const memberId = memberData?.data?.id;

  const { data: myPoints, isLoading: pointsLoading } = useQuery({
    queryKey: [`/api/points/balance/${memberId}`],
    enabled: !!memberId,
  });

  const { data: allBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ["/api/gamification/badges"]
  });

  const { data: myBadgesData, isLoading: myBadgesLoading } = useQuery({
    queryKey: ["/api/badges/my-badges"]
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/achievements"]
  });

  const { data: myAchievements, isLoading: myAchievementsLoading } = useQuery({
    queryKey: ["/api/achievements/my-achievements"]
  });

  const { data: globalLeaderboard, isLoading: globalLeaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard/global"]
  });

  const { data: conversionSettings } = useQuery({
    queryKey: ["/api/rewards/conversion-settings"]
  });

  const { data: redemptionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/rewards/redemptions"]
  });

  const quoteMutation = useMutation({
    mutationFn: (data: { productType: string; carrier: string; nairaValue: number }) =>
      apiRequest("POST", "/api/rewards/quote", data),
    onSuccess: (data: any) => {
      setQuote(data?.data);
    }
  });

  const redeemMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; carrier: string; productType: string; nairaValue: number }) =>
      apiRequest("POST", "/api/rewards/redeem", data),
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: data?.data?.message || "Points redeemed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/redemptions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/points/balance/${memberId}`] });
      setShowConfirmDialog(false);
      setPhoneNumber("");
      setAmount(100);
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem points",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
    }
  });

  useEffect(() => {
    if (amount > 0) {
      quoteMutation.mutate({
        productType: redemptionType,
        carrier: selectedCarrier,
        nairaValue: amount
      });
    }
  }, [amount, redemptionType, selectedCarrier]);

  const checkBadgesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/badges/check"),
    onSuccess: (data: any) => {
      if (data?.data && data.data.length > 0) {
        toast({
          title: "🎉 New Badge Earned!",
          description: `You've earned ${data.data.length} new badge(s)!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/badges/my-badges"] });
        queryClient.invalidateQueries({ queryKey: [`/api/points/balance/${memberId}`] });
      }
    }
  });

  const checkAchievementsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/achievements/check"),
    onSuccess: (data: any) => {
      if (data?.data && data.data.length > 0) {
        toast({
          title: "🏆 Achievement Unlocked!",
          description: `You've unlocked ${data.data.length} new achievement(s)!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/achievements/my-achievements"] });
        queryClient.invalidateQueries({ queryKey: [`/api/points/balance/${memberId}`] });
      }
    }
  });

  const totalPoints = (myPoints as any)?.balance || 0;
  const breakdown = (myPoints as any)?.data?.breakdown || [];
  const { currentLevel, nextLevel, progressToNext } = getLevelInfo(totalPoints);

  const myBadges = (myBadgesData as any)?.data || [];
  const earnedBadgeIds = myBadges.map((ub: any) => ub.badgeId);

  const filteredBadges = ((allBadges as any)?.data || []).filter((badge: any) => {
    const isEarned = earnedBadgeIds.includes(badge.id);
    if (badgeFilter === "earned" && !isEarned) return false;
    if (badgeFilter === "locked" && isEarned) return false;
    if (badgeCategoryFilter !== "all" && badge.category !== badgeCategoryFilter) return false;
    return true;
  });

  const achievementsWithProgress = ((achievements as any)?.data || []).map((achievement: any) => {
    const userAch = ((myAchievements as any)?.data || []).find((ua: any) => ua.achievementId === achievement.id);
    return {
      ...achievement,
      progress: userAch?.progress || 0,
      completed: userAch?.completed || false,
      completedAt: userAch?.completedAt || null
    };
  }).sort((a: any, b: any) => {
    if (achievementSort === "progress") return (b.progress / b.requirement.value) - (a.progress / a.requirement.value);
    if (achievementSort === "points") return b.points - a.points;
    const rarityOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    return rarityOrder[b.rarity as keyof typeof rarityOrder] - rarityOrder[a.rarity as keyof typeof rarityOrder];
  });

  const categories = Array.from(new Set(((allBadges as any)?.data || []).map((b: any) => b.category)));

  return (
    <div className="container mx-auto p-6 space-y-8" data-testid="rewards-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Rewards & Achievements</h1>
          <p className="text-muted-foreground">Track your progress and compete with other members</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => checkBadgesMutation.mutate()}
            disabled={checkBadgesMutation.isPending}
            data-testid="button-check-badges"
          >
            <Award className="mr-2 h-4 w-4" />
            Check Badges
          </Button>
          <Button 
            onClick={() => checkAchievementsMutation.mutate()}
            disabled={checkAchievementsMutation.isPending}
            data-testid="button-check-achievements"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Check Achievements
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              My Progress Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pointsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-5xl font-bold text-primary" data-testid="total-points">
                      {totalPoints.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Current Level</p>
                    <Badge variant="default" className="text-2xl px-4 py-2">
                      Level {currentLevel.level}
                    </Badge>
                    <p className="text-sm font-semibold">{currentLevel.name}</p>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Badges Earned</p>
                    <p className="text-5xl font-bold" data-testid="badges-count">
                      {myBadges.length}
                    </p>
                  </div>
                </div>

                {nextLevel && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progress to Level {nextLevel.level}
                      </span>
                      <span className="font-semibold">
                        {totalPoints} / {nextLevel.minPoints} pts
                      </span>
                    </div>
                    <Progress value={progressToNext} className="h-3" />
                  </div>
                )}

                {breakdown.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Points Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {breakdown.map((item: any) => (
                        <Card key={item.source} className="p-3">
                          <p className="text-xs text-muted-foreground capitalize">{item.source}</p>
                          <p className="text-xl font-bold">{Number(item.total).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{item.count} entries</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card data-testid="redeem-points-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Redeem Points
          </CardTitle>
          <CardDescription>
            Convert your points to airtime or data bundles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={redemptionType} onValueChange={(v: any) => setRedemptionType(v)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="airtime" data-testid="tab-redeem-airtime">
                Airtime
              </TabsTrigger>
              <TabsTrigger value="data" data-testid="tab-redeem-data">
                Data
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="carrier" data-testid="label-carrier">Carrier</Label>
                  <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                    <SelectTrigger id="carrier" data-testid="select-carrier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((carrier) => (
                        <SelectItem key={carrier} value={carrier} data-testid={`carrier-${carrier.toLowerCase()}`}>
                          {carrier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" data-testid="label-phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="080xxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="input-phone-number"
                  />
                  {phoneNumber && !/^0[789][01]\d{8}$/.test(phoneNumber) && (
                    <p className="text-sm text-destructive">Invalid Nigerian phone number</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label data-testid="label-amount">Amount (NGN)</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {PREDEFINED_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={amount === amt ? "default" : "outline"}
                      onClick={() => setAmount(amt)}
                      data-testid={`button-amount-${amt}`}
                    >
                      ₦{amt}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  data-testid="input-custom-amount"
                />
              </div>

              {quote && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Points Required</p>
                        <p className="text-3xl font-bold text-primary" data-testid="text-points-required">
                          {quote.pointsNeeded?.toLocaleString()}
                        </p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">You'll Receive</p>
                        <p className="text-3xl font-bold">₦{quote.nairaValue}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Rate: {quote.rate} points = 1 NGN
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={
                  !phoneNumber ||
                  !/^0[789][01]\d{8}$/.test(phoneNumber) ||
                  !amount ||
                  !quote ||
                  (quote && totalPoints < quote.pointsNeeded)
                }
                onClick={() => setShowConfirmDialog(true)}
                data-testid="button-redeem-now"
              >
                {quote && totalPoints < quote.pointsNeeded
                  ? "Insufficient Points"
                  : `Redeem ${quote?.pointsNeeded || 0} Points`}
              </Button>
            </div>
          </Tabs>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Transaction History</h3>
            </div>
            {historyLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-date">Date</TableHead>
                      <TableHead data-testid="header-type">Type</TableHead>
                      <TableHead data-testid="header-carrier">Carrier</TableHead>
                      <TableHead data-testid="header-amount">Amount</TableHead>
                      <TableHead data-testid="header-points">Points</TableHead>
                      <TableHead data-testid="header-status">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(redemptionHistory as any)?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No redemptions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      (redemptionHistory as any)?.data?.map((redemption: any) => (
                        <TableRow key={redemption.id} data-testid={`row-redemption-${redemption.id}`}>
                          <TableCell>{format(new Date(redemption.createdAt), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="capitalize">{redemption.productType}</TableCell>
                          <TableCell>{redemption.carrier}</TableCell>
                          <TableCell>₦{redemption.nairaValue}</TableCell>
                          <TableCell>{redemption.pointsDebited}</TableCell>
                          <TableCell>
                            {redemption.status === "completed" && (
                              <Badge variant="default" className="gap-1" data-testid="status-completed">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                            {redemption.status === "pending" && (
                              <Badge variant="secondary" className="gap-1" data-testid="status-pending">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {redemption.status === "failed" && (
                              <Badge variant="destructive" className="gap-1" data-testid="status-failed">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to redeem {quote?.pointsNeeded} points for ₦{amount} {redemptionType} to {phoneNumber} ({selectedCarrier}).
              <br /><br />
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-redemption">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                redeemMutation.mutate({
                  phoneNumber,
                  carrier: selectedCarrier,
                  productType: redemptionType,
                  nairaValue: amount
                });
              }}
              disabled={redeemMutation.isPending}
              data-testid="button-confirm-redemption"
            >
              {redeemMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card data-testid="badges-section">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Badges
            </CardTitle>
            <div className="flex gap-2">
              <Select value={badgeFilter} onValueChange={(v: any) => setBadgeFilter(v)}>
                <SelectTrigger className="w-32" data-testid="filter-badge-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Badges</SelectItem>
                  <SelectItem value="earned">Earned</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={badgeCategoryFilter} onValueChange={setBadgeCategoryFilter}>
                <SelectTrigger className="w-40" data-testid="filter-badge-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(categories as string[]).map((cat: string) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {badgesLoading || myBadgesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBadges.map((badge: any) => {
                const userBadge = myBadges.find((ub: any) => ub.badgeId === badge.id);
                return (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    earned={!!userBadge}
                    earnedAt={userBadge?.earnedAt}
                    progress={userBadge?.progress || 0}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="achievements-section">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <Select value={achievementSort} onValueChange={(v: any) => setAchievementSort(v)}>
              <SelectTrigger className="w-40" data-testid="sort-achievements">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">By Progress</SelectItem>
                <SelectItem value="points">By Points</SelectItem>
                <SelectItem value="rarity">By Rarity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {achievementsLoading || myAchievementsLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {achievementsWithProgress.map((achievement: any) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={achievement.progress}
                  completed={achievement.completed}
                  completedAt={achievement.completedAt}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="leaderboards-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="global" data-testid="tab-global">Global</TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week">This Week</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month">This Month</TabsTrigger>
              <TabsTrigger value="year" data-testid="tab-year">This Year</TabsTrigger>
            </TabsList>

            <TabsContent value="global">
              {globalLeaderboardLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <Leaderboard 
                  data={(globalLeaderboard as any)?.data || []} 
                  title="Global Leaderboard" 
                  showPodium={true}
                />
              )}
            </TabsContent>

            <TabsContent value="week">
              <WeekLeaderboard />
            </TabsContent>

            <TabsContent value="month">
              <MonthLeaderboard />
            </TabsContent>

            <TabsContent value="year">
              <YearLeaderboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function WeekLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/leaderboard/timeframe/week"]
  });

  if (isLoading) return <Skeleton className="h-96" />;
  
  return (
    <Leaderboard 
      data={(data as any)?.data || []} 
      title="This Week's Top Performers" 
      showPodium={true}
    />
  );
}

function MonthLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/leaderboard/timeframe/month"]
  });

  if (isLoading) return <Skeleton className="h-96" />;
  
  return (
    <Leaderboard 
      data={(data as any)?.data || []} 
      title="This Month's Top Performers" 
      showPodium={true}
    />
  );
}

function YearLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/leaderboard/timeframe/year"]
  });

  if (isLoading) return <Skeleton className="h-96" />;
  
  return (
    <Leaderboard 
      data={(data as any)?.data || []} 
      title="This Year's Top Performers" 
      showPodium={true}
    />
  );
}
