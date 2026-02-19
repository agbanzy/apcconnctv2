import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Users, TrendingUp, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  memberId: string;
  referralCode: string | null;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Referral {
  id: string;
  referredId: string;
  status: string;
  pointsEarned: number;
  createdAt: string;
  referred: {
    memberId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function InviteEarn() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: memberData } = useQuery<{ success: boolean; data: Member }>({
    queryKey: ["/api/members/me"],
  });

  const { data: referralsData } = useQuery<{ success: boolean; data: Referral[] }>({
    queryKey: ["/api/referrals/my-referrals"],
  });

  const member = memberData?.data;
  const referrals = referralsData?.data || [];
  const completedReferrals = referrals.filter(r => r.status === "completed");
  const totalPointsEarned = completedReferrals.reduce((sum, r) => sum + r.pointsEarned, 0);

  const referralLink = member?.referralCode 
    ? `${window.location.origin}/register?ref=${member.referralCode}`
    : "";

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: "Join APC Nigeria",
          text: `Join me on APC Nigeria! Use my referral code to get started.`,
          url: referralLink,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Invite & Earn Rewards
          </h1>
          <p className="text-muted-foreground text-lg">
            Grow the APC community and earn points for every successful referral
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="card-total-referrals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-referrals">
                {referrals.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedReferrals.length} completed
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-points-earned">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-points-earned">
                {totalPointsEarned}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From referrals
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-referrals">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-referrals">
                {referrals.filter(r => r.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting activation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Section */}
        <Card data-testid="card-referral-link">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends and family to invite them to join APC Nigeria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {member?.referralCode ? (
              <>
                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-referral-link"
                  />
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={shareReferralLink}
                    variant="default"
                    className="flex-1"
                    data-testid="button-share-link"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-copy-link-text"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Your Referral Code:</p>
                  <p className="text-2xl font-bold font-mono text-primary" data-testid="text-referral-code">
                    {member.referralCode}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Your referral code will be generated shortly.</p>
                <p className="text-sm mt-2">Please check back in a moment.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card data-testid="card-how-it-works">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Earn rewards by inviting others to join APC Nigeria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  1
                </div>
                <h3 className="font-semibold">Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Copy your unique referral link and share it with friends and family
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  2
                </div>
                <h3 className="font-semibold">They Join</h3>
                <p className="text-sm text-muted-foreground">
                  When someone registers using your link, they become your referral
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  3
                </div>
                <h3 className="font-semibold">Earn Points</h3>
                <p className="text-sm text-muted-foreground">
                  Once they become active members, you earn 100 points per referral!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <Card data-testid="card-referrals-list">
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>
                People who joined using your referral link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`referral-${referral.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {referral.referred.user.firstName} {referral.referred.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {referral.referred.memberId}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={referral.status === "completed" ? "default" : "secondary"}
                        data-testid={`badge-status-${referral.id}`}
                      >
                        {referral.status}
                      </Badge>
                      {referral.status === "completed" && (
                        <span className="text-sm font-semibold text-primary" data-testid={`text-points-${referral.id}`}>
                          +{referral.pointsEarned} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
