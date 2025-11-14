import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Check, Sparkles, TrendingUp, MessageCircle, Edit3 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface PointPackage {
  points: number;
  naira: number;
  exchangeRate: number;
}

interface CustomRateConfig {
  exchangeRate: number;
  minPoints: number;
  maxPoints: number;
}

export default function PurchasePointsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPoints, setCustomPoints] = useState<string>("");

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const memberId = memberData?.data?.id;

  const { data: balanceData } = useQuery<{ success: boolean; balance: number }>({
    queryKey: [`/api/points/balance/${memberId}`],
    enabled: !!memberId,
  });

  const { data: packagesData, isLoading: isLoadingPackages } = useQuery<{
    success: boolean;
    packages: PointPackage[];
    customRate: CustomRateConfig;
  }>({
    queryKey: ["/api/points/packages"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (params: { mode: "preset" | "custom"; points: number; naira: number }) => {
      const response = await apiRequest(
        "POST",
        "/api/points/purchase",
        {
          mode: params.mode,
          pointsAmount: params.points,
          nairaAmount: params.naira,
          callbackUrl: `${window.location.origin}/purchase-points`,
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      // Redirect to Flutterwave payment page
      window.location.href = data.authorizationUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate purchase",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await apiRequest(
        "POST",
        "/api/points/purchase/verify",
        { reference }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/points/balance/${memberId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/points/transactions/${memberId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/points/purchases/${memberId}`] });
      
      toast({
        title: "🎉 Purchase Successful!",
        description: `${data.purchase.pointsAmount} points have been added to your account`,
      });
      
      setIsProcessing(false);
      
      // Redirect to points page after 2 seconds
      setTimeout(() => {
        setLocation("/points");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Check for payment callback
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    
    if (reference && !isProcessing) {
      setIsProcessing(true);
      verifyMutation.mutate(reference);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  const handlePurchase = (pkg: PointPackage) => {
    setSelectedPackage(pkg);
    setIsProcessing(true);
    purchaseMutation.mutate({ mode: "preset", points: pkg.points, naira: pkg.naira });
  };

  const handleCustomPurchase = () => {
    const points = parseInt(customPoints);
    if (isNaN(points) || !customRate) return;

    const naira = Math.round(points / customRate.exchangeRate);
    setIsProcessing(true);
    purchaseMutation.mutate({ mode: "custom", points, naira });
  };

  const packages = packagesData?.packages || [];
  const customRate = packagesData?.customRate;
  const balance = balanceData?.balance || 0;

  const customPointsNum = parseInt(customPoints) || 0;
  const customNairaCost = customRate && customPointsNum > 0 
    ? Math.round(customPointsNum / customRate.exchangeRate) 
    : 0;
  const isCustomValid = customRate && customPointsNum >= customRate.minPoints && customPointsNum <= customRate.maxPoints;
  
  // Find best value package (highest exchange rate)
  const bestValuePackage = packages.reduce((best, pkg) => 
    pkg.exchangeRate > best.exchangeRate ? pkg : best
  , packages[0]);

  const calculateSavings = (pkg: PointPackage) => {
    const baseRate = 1.0; // Base rate is 1:1
    const saved = pkg.points * (1 - (1 / pkg.exchangeRate));
    return Math.round(saved);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Purchase Points</h1>
        <p className="text-muted-foreground mt-2">
          Get points to participate in user-created tasks and activities
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="font-display text-2xl font-bold text-primary" data-testid="text-current-balance">
                  {balance.toLocaleString()} pts
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Secure payment via Paystack
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Selection */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Choose a Package</h2>
        {isLoadingPackages ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg, index) => {
              const isBestValue = pkg.points === bestValuePackage?.points;
              const savings = calculateSavings(pkg);
              
              return (
                <Card
                  key={index}
                  className={`relative hover-elevate ${
                    isBestValue ? "border-primary border-2" : ""
                  }`}
                  data-testid={`package-card-${pkg.points}`}
                >
                  {isBestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Best Value
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Coins className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                      {pkg.points.toLocaleString()} pts
                    </CardTitle>
                    <CardDescription className="text-lg font-semibold text-foreground">
                      ₦{pkg.naira.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Benefits */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Instant credit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Secure payment</span>
                      </div>
                      {savings > 0 && (
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <TrendingUp className="h-4 w-4" />
                          <span>Save {savings.toLocaleString()} pts!</span>
                        </div>
                      )}
                    </div>

                    {/* Exchange Rate */}
                    <div className="pt-2 border-t text-center text-xs text-muted-foreground">
                      Rate: ₦1 = {pkg.exchangeRate.toFixed(2)} pts
                    </div>

                    {/* Purchase Button */}
                    <Button
                      className="w-full"
                      variant={isBestValue ? "default" : "outline"}
                      onClick={() => handlePurchase(pkg)}
                      disabled={isProcessing || purchaseMutation.isPending}
                      data-testid={`button-purchase-${pkg.points}`}
                    >
                      {isProcessing && selectedPackage?.points === pkg.points
                        ? "Processing..."
                        : "Purchase Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Custom Amount Card */}
            {customRate && (
              <Card className="relative hover-elevate border-primary" data-testid="package-card-custom">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Custom Amount
                  </Badge>
                </div>
                
                <CardHeader className="text-center pb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">
                    Buy Any Amount
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {customPointsNum > 0 ? `₦${customNairaCost.toLocaleString()}` : "Enter points"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Custom Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-points">Points Amount</Label>
                    <Input
                      id="custom-points"
                      type="number"
                      placeholder={`${customRate.minPoints.toLocaleString()} - ${customRate.maxPoints.toLocaleString()}`}
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      min={customRate.minPoints}
                      max={customRate.maxPoints}
                      data-testid="input-custom-points"
                    />
                    {customPointsNum > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cost: ₦{customNairaCost.toLocaleString()} ({customPointsNum.toLocaleString()} pts)
                      </p>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Any amount you need</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Instant credit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Secure payment</span>
                    </div>
                  </div>

                  {/* Exchange Rate */}
                  <div className="pt-2 border-t text-center text-xs text-muted-foreground">
                    Rate: ₦1 = {customRate.exchangeRate.toFixed(2)} pts
                  </div>

                  {/* Purchase Button */}
                  <Button
                    className="w-full"
                    onClick={handleCustomPurchase}
                    disabled={!isCustomValid || isProcessing || purchaseMutation.isPending}
                    data-testid="button-purchase-custom"
                  >
                    {isProcessing && !selectedPackage
                      ? "Processing..."
                      : "Purchase Now"}
                  </Button>
                  
                  {customPointsNum > 0 && !isCustomValid && (
                    <p className="text-xs text-destructive text-center">
                      Amount must be between {customRate.minPoints.toLocaleString()} and {customRate.maxPoints.toLocaleString()} points
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Enterprise Package */}
            <Card className="relative hover-elevate border-accent" data-testid="package-card-enterprise">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Enterprise
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-4">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <Coins className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  Custom Package
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  Contact Us
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Benefits */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Custom pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Bulk discounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Dedicated support</span>
                  </div>
                </div>

                {/* Info */}
                <div className="pt-2 border-t text-center text-xs text-muted-foreground">
                  For large volume purchases
                </div>

                {/* WhatsApp Contact Button */}
                <Button
                  className="w-full bg-[#25D366] text-white border-[#1EAA52]"
                  onClick={() => window.open('https://wa.me/2349000000000?text=Hello,%20I%20am%20interested%20in%20enterprise%20point%20packages', '_blank')}
                  data-testid="button-enterprise-contact"
                >
                  <SiWhatsapp className="h-4 w-4 mr-2" />
                  Contact on WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p>Select a package above</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p>Complete secure payment via Paystack</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p>Points are instantly credited to your account</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Use Your Points For</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <p>Creating and funding user tasks</p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <p>Rewarding volunteers and contributors</p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <p>Supporting community initiatives</p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <p>Transferring to other members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            🔒 All transactions are secured by Paystack. Your payment information is never stored on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
