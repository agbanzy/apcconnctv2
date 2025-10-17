import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
import type { MembershipDues } from "@shared/schema";

export default function Dues() {
  const { member } = useAuth();
  const { toast } = useToast();

  const { data: duesData, isLoading } = useQuery<{ success: boolean; data: MembershipDues[] }>({
    queryKey: ["/api/dues"],
    enabled: !!member,
  });

  const { data: historyData } = useQuery<{ success: boolean; data: MembershipDues[] }>({
    queryKey: ["/api/dues/history"],
    enabled: !!member,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ amount, duesId }: { amount: string; duesId: string }) => {
      const res = await apiRequest("POST", "/api/dues/stripe-checkout", { amount, duesId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    },
    onError: () => {
      toast({
        title: "Checkout failed",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = (dues: MembershipDues) => {
    checkoutMutation.mutate({
      amount: dues.amount.toString(),
      duesId: dues.id,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const dues = duesData?.data || [];
  const history = historyData?.data || [];
  const pendingDues = dues.filter((d) => d.status === "pending");
  const totalPending = pendingDues.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Membership Dues</h1>
        <p className="text-muted-foreground">
          Manage your membership dues and payment history
        </p>
      </div>

      {pendingDues.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mb-4" data-testid="text-total-pending">
              ₦{totalPending.toLocaleString()}
            </p>
            <div className="space-y-3">
              {pendingDues.map((due) => (
                <div
                  key={due.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg"
                  data-testid={`due-item-${due.id}`}
                >
                  <div>
                    <p className="font-semibold">₦{parseFloat(due.amount.toString()).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(due.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePayment(due)}
                    disabled={checkoutMutation.isPending}
                    data-testid={`button-pay-${due.id}`}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payment history yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`history-item-${payment.id}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">₦{parseFloat(payment.amount.toString()).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paidAt
                        ? `Paid on ${format(new Date(payment.paidAt), "MMM dd, yyyy")}`
                        : `Due on ${format(new Date(payment.dueDate), "MMM dd, yyyy")}`}
                    </p>
                    {payment.paymentMethod && (
                      <p className="text-xs text-muted-foreground capitalize">
                        via {payment.paymentMethod}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={payment.status === "paid" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}
                    data-testid={`badge-status-${payment.id}`}
                  >
                    {payment.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {payment.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {payment.status?.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
