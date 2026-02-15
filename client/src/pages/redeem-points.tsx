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
import { Smartphone, Wifi, ArrowLeft, Zap, Info, TrendingUp, History, Coins, Banknote, Building2, CheckCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Helper function to generate unique idempotency key
function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export default function RedeemPoints() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"airtime" | "data" | "cash">("airtime");

  // Airtime form state
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimePoints, setAirtimePoints] = useState("");

  // Data form state
  const [dataPhone, setDataPhone] = useState("");
  const [dataPoints, setDataPoints] = useState("");

  // Cash withdrawal form state
  const [cashBankCode, setCashBankCode] = useState("");
  const [cashAccountNumber, setCashAccountNumber] = useState("");
  const [cashAccountName, setCashAccountName] = useState("");
  const [cashPoints, setCashPoints] = useState("");
  const [isAccountVerified, setIsAccountVerified] = useState(false);

  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/members/me"],
  });

  const memberId = memberData?.data?.id;

  const { data: settingsData } = useQuery<any>({
    queryKey: ["/api/points/conversion/settings"],
  });

  const { data: networksData } = useQuery<any>({
    queryKey: ["/api/points/conversion/networks"],
  });

  const { data: balanceData } = useQuery<any>({
    queryKey: ["/api/points/balance", memberId],
    enabled: !!memberId,
  });

  const airtimeSettings = settingsData?.settings?.find((s: any) => s.productType === "airtime");
  const dataSettings = settingsData?.settings?.find((s: any) => s.productType === "data");
  const cashSettings = settingsData?.settings?.find((s: any) => s.productType === "cash");

  // Fetch Nigerian banks
  const { data: banksData, isLoading: banksLoading } = useQuery<any>({
    queryKey: ["/api/points/banks"],
    enabled: activeTab === "cash",
  });

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

  // Verify bank account mutation
  const verifyBankMutation = useMutation({
    mutationFn: async (data: { accountNumber: string; bankCode: string }) => {
      const response = await fetch("/api/points/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify account");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCashAccountName(data.account?.account_name || "");
      setIsAccountVerified(true);
      toast({
        title: "Account Verified",
        description: `Account Name: ${data.account?.account_name}`,
      });
    },
    onError: (error: any) => {
      setIsAccountVerified(false);
      setCashAccountName("");
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify bank account",
        variant: "destructive",
      });
    },
  });

  // Redeem cash mutation - accountName is verified server-side for security
  const redeemCashMutation = useMutation({
    mutationFn: async (data: { pointsAmount: number; accountNumber: string; bankCode: string }) => {
      const response = await fetch("/api/points/redeem/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process withdrawal");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Initiated!",
        description: data.message,
      });
      setCashBankCode("");
      setCashAccountNumber("");
      setCashAccountName("");
      setCashPoints("");
      setIsAccountVerified(false);
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/redemptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
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

  const handleVerifyBank = () => {
    if (!cashBankCode || !cashAccountNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a bank and enter account number",
        variant: "destructive",
      });
      return;
    }

    if (cashAccountNumber.length !== 10) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be 10 digits",
        variant: "destructive",
      });
      return;
    }

    verifyBankMutation.mutate({
      accountNumber: cashAccountNumber,
      bankCode: cashBankCode,
    });
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pointsNum = parseInt(cashPoints);

    if (!isAccountVerified || !cashAccountName) {
      toast({
        title: "Account Not Verified",
        description: "Please verify your bank account first",
        variant: "destructive",
      });
      return;
    }

    const minPoints = cashSettings?.minPoints || 500;
    const maxPoints = cashSettings?.maxPoints || 50000;

    if (pointsNum < minPoints || pointsNum > maxPoints) {
      toast({
        title: "Invalid Points Amount",
        description: `Please enter between ${minPoints} and ${maxPoints} points`,
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

    redeemCashMutation.mutate({
      pointsAmount: pointsNum,
      accountNumber: cashAccountNumber,
      bankCode: cashBankCode,
    });
  };

  const airtimeNaira = calculateNaira(airtimePoints, "airtime");
  const dataNaira = calculateNaira(dataPoints, "data");
  const balance = balanceData?.balance || 0;
  const cashNaira = cashPoints ? parseInt(cashPoints) * (cashSettings ? parseFloat(cashSettings.baseRate) : 1.0) : 0;
  const cashProgress = (cashPoints && balance > 0) ? Math.min((parseInt(cashPoints) / balance) * 100, 100) : 0;
  const conversionRate = airtimeSettings ? parseFloat(airtimeSettings.baseRate) : 1.0;
  const airtimeProgress = (airtimePoints && balance > 0) ? Math.min((parseInt(airtimePoints) / balance) * 100, 100) : 0;
  const dataProgress = (dataPoints && balance > 0) ? Math.min((parseInt(dataPoints) / balance) * 100, 100) : 0;

  return (
    <div className="container max-w-4xl p-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold" data-testid="text-redeem-title">Redeem Points</h1>
          <p className="text-muted-foreground">
            Convert your points to airtime, data, or cash instantly
          </p>
        </div>
      </div>

      {/* Enhanced Balance Card with Visual Indicators */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Coins className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
                <div className="text-4xl font-bold mt-1" data-testid="text-balance">
                  {balance.toLocaleString()}
                  <span className="text-2xl ml-2 text-muted-foreground font-normal">points</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <Badge variant="secondary" className="text-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                1 point = ₦{conversionRate.toFixed(2)}
              </Badge>
              <p className="text-sm text-muted-foreground">
                = ₦{(balance * conversionRate).toLocaleString()} total value
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Info with Better Visual Hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Redemption Limits</p>
              <p className="text-sm text-muted-foreground">
                Airtime/Data: {airtimeSettings?.minPoints || 100} - {(airtimeSettings?.maxPoints || 10000).toLocaleString()} pts
              </p>
              <p className="text-sm text-muted-foreground">
                Cash: 500 - 50,000 pts (Min ₦100 transfer)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Processing Speed</p>
              <p className="text-sm text-muted-foreground">
                Airtime & data: Instant | Cash: 1-24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redemption Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "airtime" | "data" | "cash")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="airtime" data-testid="tab-airtime">
            <Smartphone className="h-4 w-4 mr-2" />
            Airtime
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Wifi className="h-4 w-4 mr-2" />
            Data
          </TabsTrigger>
          <TabsTrigger value="cash" data-testid="tab-cash">
            <Banknote className="h-4 w-4 mr-2" />
            Cash
          </TabsTrigger>
        </TabsList>

        <TabsContent value="airtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Recharge Airtime
              </CardTitle>
              <CardDescription>
                Convert your points to airtime credit for any Nigerian network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAirtimeSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="airtime-phone">Phone Number</Label>
                  <Input
                    id="airtime-phone"
                    data-testid="input-airtime-phone"
                    type="tel"
                    placeholder="08012345678"
                    value={airtimePhone}
                    onChange={(e) => setAirtimePhone(e.target.value)}
                    className="text-lg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Works with MTN, Glo, Airtel, and 9mobile
                  </p>
                </div>

                <div className="space-y-3">
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
                    className="text-lg"
                    required
                  />
                  {airtimePoints && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Conversion</span>
                        <span className="font-bold text-lg text-primary">
                          ₦{airtimeNaira.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={airtimeProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{parseInt(airtimePoints).toLocaleString()} pts</span>
                        <span>{balance > 0 ? ((parseInt(airtimePoints) / balance) * 100).toFixed(1) : "0"}% of balance</span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={redeemAirtimeMutation.isPending}
                  data-testid="button-redeem-airtime"
                >
                  {redeemAirtimeMutation.isPending ? "Processing..." : `Redeem ${airtimePoints ? `₦${airtimeNaira.toLocaleString()}` : ""} Airtime`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Buy Data Bundle
              </CardTitle>
              <CardDescription>
                Convert your points to data bundles for your mobile number
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDataSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="data-phone">Phone Number</Label>
                  <Input
                    id="data-phone"
                    data-testid="input-data-phone"
                    type="tel"
                    placeholder="08012345678"
                    value={dataPhone}
                    onChange={(e) => setDataPhone(e.target.value)}
                    className="text-lg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Works with MTN, Glo, Airtel, and 9mobile
                  </p>
                </div>

                <div className="space-y-3">
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
                    className="text-lg"
                    required
                  />
                  {dataPoints && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Conversion</span>
                        <span className="font-bold text-lg text-primary">
                          ₦{dataNaira.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={dataProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{parseInt(dataPoints).toLocaleString()} pts</span>
                        <span>{balance > 0 ? ((parseInt(dataPoints) / balance) * 100).toFixed(1) : "0"}% of balance</span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={redeemDataMutation.isPending}
                  data-testid="button-redeem-data"
                >
                  {redeemDataMutation.isPending ? "Processing..." : `Redeem ${dataPoints ? `₦${dataNaira.toLocaleString()}` : ""} Data`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Withdraw to Bank
              </CardTitle>
              <CardDescription>
                Transfer your points as cash to any Nigerian bank account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCashSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cash-bank">Select Bank</Label>
                  <Select
                    value={cashBankCode}
                    onValueChange={(value) => {
                      setCashBankCode(value);
                      setIsAccountVerified(false);
                      setCashAccountName("");
                    }}
                  >
                    <SelectTrigger data-testid="select-bank">
                      <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select your bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {banksData?.banks?.map((bank: any) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cash-account">Account Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cash-account"
                      data-testid="input-cash-account"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0123456789"
                      value={cashAccountNumber}
                      onChange={(e) => {
                        setCashAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setIsAccountVerified(false);
                        setCashAccountName("");
                      }}
                      className="text-lg flex-1"
                      maxLength={10}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyBank}
                      disabled={verifyBankMutation.isPending || cashAccountNumber.length !== 10 || !cashBankCode}
                      data-testid="button-verify-bank"
                    >
                      {verifyBankMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your 10-digit account number
                  </p>
                </div>

                {isAccountVerified && cashAccountName && (
                  <Alert className="border-primary/20 bg-primary/5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <AlertDescription className="flex items-center gap-2">
                      <span className="font-medium">Account Name:</span>
                      <span data-testid="text-account-name">{cashAccountName}</span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label htmlFor="cash-points">Points to Withdraw</Label>
                  <Input
                    id="cash-points"
                    data-testid="input-cash-points"
                    type="number"
                    placeholder={cashSettings ? `${cashSettings.minPoints} - ${cashSettings.maxPoints}` : "500 - 50000"}
                    value={cashPoints}
                    onChange={(e) => setCashPoints(e.target.value)}
                    min={cashSettings?.minPoints || 500}
                    max={cashSettings?.maxPoints || 50000}
                    className="text-lg"
                    disabled={!isAccountVerified}
                    required
                  />
                  {cashPoints && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">You'll Receive</span>
                        <span className="font-bold text-lg text-primary">
                          ₦{cashNaira.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={cashProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{parseInt(cashPoints).toLocaleString()} pts</span>
                        <span>{balance > 0 ? ((parseInt(cashPoints) / balance) * 100).toFixed(1) : "0"}% of balance</span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={redeemCashMutation.isPending || !isAccountVerified}
                  data-testid="button-redeem-cash"
                >
                  {redeemCashMutation.isPending ? "Processing..." : `Withdraw ${cashPoints ? `₦${cashNaira.toLocaleString()}` : ""}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Transaction History Link */}
      <Card className="hover-elevate transition-all duration-300">
        <CardContent className="p-6">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => navigate("/redemption-history")}
            data-testid="button-view-history"
          >
            <History className="h-4 w-4 mr-2" />
            View Redemption History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
