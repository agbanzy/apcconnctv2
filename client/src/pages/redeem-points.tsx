import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Smartphone, Wifi, ArrowLeft, Zap, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to generate unique idempotency key
function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export default function RedeemPoints() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"airtime" | "data">("airtime");

  // Airtime form state
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimePoints, setAirtimePoints] = useState("");

  // Data form state
  const [dataPhone, setDataPhone] = useState("");
  const [dataPoints, setDataPoints] = useState("");

  // Fetch user's member profile for balance
  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/members/me"],
  });

  // Fetch conversion settings
  const { data: settingsData } = useQuery<any>({
    queryKey: ["/api/points/conversion/settings"],
  });

  // Fetch networks
  const { data: networksData } = useQuery<any>({
    queryKey: ["/api/points/conversion/networks"],
  });

  // Fetch user's point balance
  const { data: balanceData } = useQuery<any>({
    queryKey: ["/api/points/balance", memberData?.id],
    queryFn: async () => {
      if (!memberData?.id) return null;
      const res = await fetch(`/api/points/balance/${memberData.id}`);
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: !!memberData?.id,
  });

  const airtimeSettings = settingsData?.settings?.find((s: any) => s.productType === "airtime");
  const dataSettings = settingsData?.settings?.find((s: any) => s.productType === "data");

  const calculateNaira = (points: string, productType: "airtime" | "data") => {
    const pointsNum = parseInt(points);
    if (isNaN(pointsNum)) return 0;
    const settings = productType === "airtime" ? airtimeSettings : dataSettings;
    const rate = settings ? parseFloat(settings.baseRate) : 1.0;
    return pointsNum * rate;
  };

  // Redeem airtime mutation
  const redeemAirtimeMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; pointsAmount: number; idempotencyKey: string }) => {
      const response = await fetch("/api/points/redeem/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to redeem airtime");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Airtime Recharge Successful!",
        description: data.message,
      });
      setAirtimePhone("");
      setAirtimePoints("");
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/redemptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem airtime",
        variant: "destructive",
      });
    },
  });

  // Redeem data mutation
  const redeemDataMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; pointsAmount: number; billerCode: string; idempotencyKey: string }) => {
      const response = await fetch("/api/points/redeem/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to redeem data");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data Recharge Successful!",
        description: data.message,
      });
      setDataPhone("");
      setDataPoints("");
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/redemptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem data",
        variant: "destructive",
      });
    },
  });

  const handleAirtimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pointsNum = parseInt(airtimePoints);
    
    if (!airtimeSettings) {
      toast({
        title: "Settings Not Available",
        description: "Conversion settings are not configured",
        variant: "destructive",
      });
      return;
    }

    if (pointsNum < airtimeSettings.minPoints || pointsNum > airtimeSettings.maxPoints) {
      toast({
        title: "Invalid Points Amount",
        description: `Please enter between ${airtimeSettings.minPoints} and ${airtimeSettings.maxPoints} points`,
        variant: "destructive",
      });
      return;
    }

    if (balanceData && pointsNum > balanceData.balance) {
      toast({
        title: "Insufficient Points",
        description: `You only have ${balanceData.balance} points available`,
        variant: "destructive",
      });
      return;
    }

    redeemAirtimeMutation.mutate({
      phoneNumber: airtimePhone,
      pointsAmount: pointsNum,
      idempotencyKey: generateIdempotencyKey(),
    });
  };

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pointsNum = parseInt(dataPoints);
    
    if (!dataSettings) {
      toast({
        title: "Settings Not Available",
        description: "Conversion settings are not configured",
        variant: "destructive",
      });
      return;
    }

    if (pointsNum < dataSettings.minPoints || pointsNum > dataSettings.maxPoints) {
      toast({
        title: "Invalid Points Amount",
        description: `Please enter between ${dataSettings.minPoints} and ${dataSettings.maxPoints} points`,
        variant: "destructive",
      });
      return;
    }

    if (balanceData && pointsNum > balanceData.balance) {
      toast({
        title: "Insufficient Points",
        description: `You only have ${balanceData.balance} points available`,
        variant: "destructive",
      });
      return;
    }

    // For data, we'll use MTN as default biller (BIL108)
    // In a full implementation, user would select network/data plan
    redeemDataMutation.mutate({
      phoneNumber: dataPhone,
      pointsAmount: pointsNum,
      billerCode: "BIL108", // MTN default
      idempotencyKey: generateIdempotencyKey(),
    });
  };

  const airtimeNaira = calculateNaira(airtimePoints, "airtime");
  const dataNaira = calculateNaira(dataPoints, "data");

  return (
    <div className="container max-p-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Redeem Points</h1>
          <p className="text-muted-foreground">
            Convert your points to airtime or data
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {balanceData?.balance?.toLocaleString() || "0"} points
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            1 point = ₦{airtimeSettings ? parseFloat(airtimeSettings.baseRate) : 1}
          </p>
        </CardContent>
      </Card>

      {/* Conversion Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Conversion Rates:</strong> Airtime & Data redemptions use a 1:1 ratio (1 point = ₦1).
          {airtimeSettings && ` Min: ${airtimeSettings.minPoints} pts, Max: ${airtimeSettings.maxPoints} pts`}
        </AlertDescription>
      </Alert>

      {/* Redemption Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "airtime" | "data")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="airtime" data-testid="tab-airtime">
            <Smartphone className="h-4 w-4 mr-2" />
            Airtime
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Wifi className="h-4 w-4 mr-2" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="airtime">
          <Card>
            <CardHeader>
              <CardTitle>Recharge Airtime</CardTitle>
              <CardDescription>
                Convert your points to airtime credit for any Nigerian network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAirtimeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="airtime-phone">Phone Number</Label>
                  <Input
                    id="airtime-phone"
                    data-testid="input-airtime-phone"
                    type="tel"
                    placeholder="08012345678"
                    value={airtimePhone}
                    onChange={(e) => setAirtimePhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number to receive airtime
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="airtime-points">Points to Redeem</Label>
                  <Input
                    id="airtime-points"
                    data-testid="input-airtime-points"
                    type="number"
                    placeholder={airtimeSettings ? `${airtimeSettings.minPoints} - ${airtimeSettings.maxPoints}` : "100"}
                    value={airtimePoints}
                    onChange={(e) => setAirtimePoints(e.target.value)}
                    min={airtimeSettings?.minPoints || 100}
                    max={airtimeSettings?.maxPoints || 10000}
                    required
                  />
                  {airtimePoints && (
                    <p className="text-sm font-medium text-primary">
                      = ₦{airtimeNaira.toLocaleString()} airtime
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={redeemAirtimeMutation.isPending}
                  data-testid="button-redeem-airtime"
                >
                  {redeemAirtimeMutation.isPending ? "Processing..." : "Redeem Airtime"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Buy Data Bundle</CardTitle>
              <CardDescription>
                Convert your points to data bundles for your mobile number
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDataSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data-phone">Phone Number</Label>
                  <Input
                    id="data-phone"
                    data-testid="input-data-phone"
                    type="tel"
                    placeholder="08012345678"
                    value={dataPhone}
                    onChange={(e) => setDataPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number to receive data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-points">Points to Redeem</Label>
                  <Input
                    id="data-points"
                    data-testid="input-data-points"
                    type="number"
                    placeholder={dataSettings ? `${dataSettings.minPoints} - ${dataSettings.maxPoints}` : "100"}
                    value={dataPoints}
                    onChange={(e) => setDataPoints(e.target.value)}
                    min={dataSettings?.minPoints || 100}
                    max={dataSettings?.maxPoints || 10000}
                    required
                  />
                  {dataPoints && (
                    <p className="text-sm font-medium text-primary">
                      = ₦{dataNaira.toLocaleString()} data bundle
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={redeemDataMutation.isPending}
                  data-testid="button-redeem-data"
                >
                  {redeemDataMutation.isPending ? "Processing..." : "Redeem Data"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction History Link */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/redemption-history")}
            data-testid="button-view-history"
          >
            View Redemption History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
