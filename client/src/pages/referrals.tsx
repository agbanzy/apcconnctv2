import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Copy, Check, Share2, TrendingUp, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const { data: referralCodeData, isLoading: isLoadingCode } = useQuery<{
    success: boolean;
    data: {
      referralCode: string;
      isNew: boolean;
    };
  }>({
    queryKey: ["/api/referrals/my-code"],
    enabled: !!memberData?.data?.id,
  });

  const { data: referralsData, isLoading: isLoadingReferrals } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ["/api/referrals/my-referrals"],
    enabled: !!memberData?.data?.id,
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery<{
    success: boolean;
    data: {
      totalReferrals: number;
      totalPointsEarned: number;
      activeReferrals: number;
      pendingReferrals: number;
      referralsByMonth: Array<{ month: string; count: number }>;
    };
  }>({
    queryKey: ["/api/referrals/stats"],
    enabled: !!memberData?.data?.id,
  });

  const referralCode = referralCodeData?.data?.referralCode || "";
  const referrals = referralsData?.data || [];
  const stats = statsData?.data;

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Join APC Connect and help build Nigeria's future! Use my referral code: ${referralCode}\n\nRegister here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const shareViaFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const shareViaTwitter = () => {
    const message = `Join me on APC Connect! Use referral code: ${referralCode}`;
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground mt-1">
          Earn 100 points for every friend you refer to APC Connect
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-total-referrals">
                    {stats?.totalReferrals || 0}
                  </p>
                )}
              </div>
              <Users className="h-10 w-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-primary" data-testid="text-points-earned">
                    {stats?.totalPointsEarned || 0}
                  </p>
                )}
              </div>
              <Award className="h-10 w-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Referrals</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-active-referrals">
                    {stats?.activeReferrals || 0}
                  </p>
                )}
              </div>
              <TrendingUp className="h-10 w-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>Share this code with friends to earn points</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Code Display */}
            <div className="space-y-4">
              {isLoadingCode ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-4 rounded-lg border-2 border-primary bg-primary/5">
                      <p className="text-center font-mono text-2xl font-bold text-primary" data-testid="text-referral-code">
                        {referralCode}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(referralCode)}
                      data-testid="button-copy-code"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Referral Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={referralLink}
                        className="flex-1 px-3 py-2 text-sm rounded-md border bg-muted font-mono"
                        data-testid="input-referral-link"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(referralLink)}
                        data-testid="button-copy-link"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Share via:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaWhatsApp}
                    data-testid="button-share-whatsapp"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaFacebook}
                    data-testid="button-share-facebook"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaTwitter}
                    data-testid="button-share-twitter"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-6 rounded-lg border bg-muted/50">
              <p className="text-sm font-semibold mb-4">Scan to Register</p>
              {isLoadingCode ? (
                <Skeleton className="h-48 w-48" />
              ) : (
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={referralLink}
                    size={192}
                    level="M"
                    data-testid="qr-code"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Share this QR code for easy mobile registration
              </p>
            </div>
          </div>

          {/* How It Works */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">How It Works</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p>Share your unique referral code or link with friends</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p>They register using your code</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p>You earn 100 points when they complete registration!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>People who joined using your referral code</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReferrals ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm mt-2">Start sharing your code to earn points!</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Points Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id} data-testid={`referral-row-${referral.id}`}>
                      <TableCell className="font-medium">
                        {referral.user?.firstName} {referral.user?.lastName}
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.member?.joinDate || referral.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            referral.member?.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {referral.member?.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        100 pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
