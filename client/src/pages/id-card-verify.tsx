import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

export default function IdCardVerify() {
  const [, params] = useRoute("/id-card/verify/:memberId");
  const memberId = params?.memberId;
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    verified: boolean;
    data?: {
      memberId: string;
      name: string;
      status: string;
      verifiedAt: string;
    };
    error?: string;
  }>({
    queryKey: ["/api/id-card/verify", memberId],
    queryFn: async () => {
      const res = await fetch(
        `/api/id-card/verify/${memberId}?token=${token}`
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Verification failed");
      }
      return result;
    },
    enabled: !!memberId && !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!memberId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Invalid Verification Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The verification link is malformed or incomplete. Please ensure
              you have the complete URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = data?.verified === true;
  const verificationData = data?.data;
  const errorMessage = error instanceof Error ? error.message : data?.error;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card
        className={`w-full max-w-md ${
          isValid ? "border-green-500" : "border-destructive"
        }`}
        data-testid="card-verification-result"
      >
        <CardHeader>
          <CardTitle
            className={`flex items-center gap-2 ${
              isValid ? "text-green-600 dark:text-green-500" : "text-destructive"
            }`}
            data-testid="text-verification-title"
          >
            {isValid ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                ID Card Verified
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6" />
                Verification Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isValid && verificationData ? (
            <>
              <div
                className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3"
                data-testid="container-verification-success"
              >
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Shield className="h-5 w-5" />
                  <span className="font-semibold">Authentic APC Member</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Member Name</p>
                    <p className="font-semibold" data-testid="text-verified-name">
                      {verificationData.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Member ID</p>
                    <p
                      className="font-mono font-semibold"
                      data-testid="text-verified-member-id"
                    >
                      {verificationData.memberId}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        verificationData.status === "active"
                          ? "default"
                          : "secondary"
                      }
                      data-testid="badge-verified-status"
                    >
                      {verificationData.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                <p data-testid="text-verified-at">
                  Verified at{" "}
                  {new Date(verificationData.verifiedAt).toLocaleString("en-NG", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </>
          ) : (
            <div
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2"
              data-testid="container-verification-error"
            >
              <p className="font-semibold text-destructive">
                Unable to Verify ID Card
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-error-message">
                {errorMessage || "The ID card could not be verified. It may be invalid, expired, or revoked."}
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 justify-center">
              <img
                src="/logo_1760719840683.png"
                alt="APC Logo"
                className="h-8 w-auto opacity-80"
              />
              <div className="text-center">
                <p className="text-xs font-bold" style={{ color: "#8FA658" }}>
                  ALL PROGRESSIVES CONGRESS
                </p>
                <p className="text-xs text-muted-foreground">
                  Digital ID Verification System
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
