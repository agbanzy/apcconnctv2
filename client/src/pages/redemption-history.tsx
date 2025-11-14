import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Smartphone, Wifi, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function RedemptionHistory() {
  const [, navigate] = useLocation();

  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/members/me"],
  });

  const { data: redemptionsData, isLoading } = useQuery<any>({
    queryKey: ["/api/points/redemptions", memberData?.id],
    queryFn: async () => {
      if (!memberData?.id) return null;
      const res = await fetch(`/api/points/redemptions/${memberData.id}`);
      if (!res.ok) throw new Error("Failed to fetch redemptions");
      return res.json();
    },
    enabled: !!memberData?.id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl p-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/redeem-points")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Redemption History</h1>
          <p className="text-muted-foreground">
            View your airtime and data redemptions
          </p>
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && redemptionsData?.redemptions?.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No redemptions yet. Start redeeming your points!
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate("/redeem-points")}>
                Redeem Points
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {redemptionsData?.redemptions?.map((redemption: any) => (
        <Card key={redemption.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {redemption.productType === "airtime" ? (
                  <Smartphone className="h-5 w-5 text-primary" />
                ) : (
                  <Wifi className="h-5 w-5 text-primary" />
                )}
                <div>
                  <CardTitle className="text-lg">
                    {redemption.productType === "airtime" ? "Airtime" : "Data"} Redemption
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(redemption.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(redemption.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{redemption.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Network</p>
                <p className="font-medium">{redemption.carrier}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Points Used</p>
                <p className="font-medium text-lg">{redemption.pointsDebited.toLocaleString()} pts</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-medium text-lg text-primary">₦{parseFloat(redemption.nairaValue).toLocaleString()}</p>
              </div>
            </div>

            {redemption.status === "failed" && redemption.errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Error</p>
                  <p className="text-sm text-muted-foreground">{redemption.errorMessage}</p>
                </div>
              </div>
            )}

            {redemption.flutterwaveReference && (
              <div>
                <p className="text-xs text-muted-foreground">Reference: {redemption.flutterwaveReference}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
