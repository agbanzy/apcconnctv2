import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { CreditCard, DollarSign, Clock, CheckCircle, Repeat, Pause, Play, X, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MembershipDues } from "@shared/schema";

interface RecurringDues {
  id: string;
  amount: string;
  frequency: string;
  status: string;
  nextPaymentDate: string;
  lastPaymentDate?: string;
}

export default function Dues() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [recurringAmount, setRecurringAmount] = useState<string>("5000");
  const [customAmount, setCustomAmount] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState<string>("monthly");

  const { data: duesData, isLoading } = useQuery<{ success: boolean; data: MembershipDues[] }>({
    queryKey: ["/api/dues"],
    enabled: !!member,
  });

  const { data: recurringData, isLoading: loadingRecurring } = useQuery<{ 
    success: boolean; 
    data: RecurringDues | null 
  }>({
    queryKey: ["/api/dues/recurring"],
    enabled: !!member,
  });

  const setupRecurringMutation = useMutation({
    mutationFn: async (data: { amount: number; frequency: string }) => {
      const res = await apiRequest("POST", "/api/dues/recurring/setup", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    },
    onError: () => {
      toast({
        title: "Setup failed",
        description: "Failed to setup recurring payments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const pauseRecurringMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/dues/recurring/pause", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues/recurring"] });
      toast({
        title: "Recurring payments paused",
        description: "Your automatic payments have been paused",
      });
    },
    onError: () => {
      toast({
        title: "Pause failed",
        description: "Failed to pause recurring payments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resumeRecurringMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/dues/recurring/resume", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues/recurring"] });
      toast({
        title: "Recurring payments resumed",
        description: "Your automatic payments have been resumed",
      });
    },
    onError: () => {
      toast({
        title: "Resume failed",
        description: "Failed to resume recurring payments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelRecurringMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/dues/recurring", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues/recurring"] });
      toast({
        title: "Recurring payments cancelled",
        description: "Your automatic payments have been cancelled",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation failed",
        description: "Failed to cancel recurring payments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const res = await apiRequest("POST", "/api/dues/checkout", { amount });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
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

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await apiRequest("POST", "/api/dues/verify", { reference });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      toast({
        title: "Payment successful",
        description: "Your dues payment has been confirmed!",
      });
      window.history.replaceState({}, '', '/dues');
    },
    onError: () => {
      toast({
        title: "Verification failed",
        description: "Failed to verify payment. Please contact support.",
        variant: "destructive",
      });
    },
  });

  const verifyRecurringMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await apiRequest("POST", "/api/dues/recurring/verify", { reference });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dues/recurring"] });
      toast({
        title: "Recurring payment setup successful",
        description: "Your automatic payments have been activated!",
      });
      window.history.replaceState({}, '', '/dues');
    },
    onError: () => {
      toast({
        title: "Verification failed",
        description: "Failed to verify recurring payment setup. Please contact support.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference) {
      // Check if this is a recurring payment verification or regular payment
      if (window.location.pathname.includes('/dues/recurring/verify') || 
          window.location.search.includes('recurring')) {
        verifyRecurringMutation.mutate(reference);
      } else {
        verifyMutation.mutate(reference);
      }
    }
  }, []);

  const handlePayment = (amount: number) => {
    checkoutMutation.mutate({ amount });
  };

  const handleSetupRecurring = () => {
    const amount = recurringAmount === "custom" 
      ? parseFloat(customAmount) 
      : parseFloat(recurringAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setupRecurringMutation.mutate({
      amount,
      frequency: recurringFrequency,
    });
  };

  if (isLoading || loadingRecurring) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const dues = duesData?.data || [];
  const recurringDues = recurringData?.data;
  const pendingDues = dues.filter((d) => d.paymentStatus === "pending");
  const paidDues = dues.filter((d) => d.paymentStatus === "completed");
  const totalPending = pendingDues.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);

  // Membership status based on member and dues
  const membershipStatus = member?.status === "active" 
    ? "active" 
    : member?.status === "pending" 
    ? "pending" 
    : "expired";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">Membership Dues</h1>
          <Badge
            variant={
              membershipStatus === "active" 
                ? "default" 
                : membershipStatus === "pending" 
                ? "secondary" 
                : "destructive"
            }
            data-testid="badge-membership-status"
          >
            {membershipStatus === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
            {membershipStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
            Membership: {membershipStatus.charAt(0).toUpperCase() + membershipStatus.slice(1)}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage your membership dues and payment history
        </p>
      </div>

      {/* Recurring Payment Section */}
      {recurringDues ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Membership Dues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold" data-testid="text-recurring-amount">
                  ₦{parseFloat(recurringDues.amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="text-lg font-semibold capitalize" data-testid="text-recurring-frequency">
                  {recurringDues.frequency}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Payment</p>
                <p className="text-lg font-semibold flex items-center gap-2" data-testid="text-next-payment">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(recurringDues.nextPaymentDate), "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Payment</p>
                <p className="text-lg font-semibold" data-testid="text-last-payment">
                  {recurringDues.lastPaymentDate
                    ? format(new Date(recurringDues.lastPaymentDate), "MMM dd, yyyy")
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t flex-wrap">
              <Badge
                variant={recurringDues.status === "active" ? "default" : "secondary"}
                data-testid="badge-recurring-status"
              >
                Status: {recurringDues.status.charAt(0).toUpperCase() + recurringDues.status.slice(1)}
              </Badge>

              {recurringDues.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pauseRecurringMutation.mutate()}
                    disabled={pauseRecurringMutation.isPending}
                    data-testid="button-pause-recurring"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Recurring Payments
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel recurring payments?")) {
                        cancelRecurringMutation.mutate();
                      }
                    }}
                    disabled={cancelRecurringMutation.isPending}
                    data-testid="button-cancel-recurring"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}

              {recurringDues.status === "paused" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => resumeRecurringMutation.mutate()}
                  disabled={resumeRecurringMutation.isPending}
                  data-testid="button-resume-recurring"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Recurring Payments
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Setup Automatic Monthly Payments
            </CardTitle>
            <CardDescription>
              Set up recurring payments and never miss a dues deadline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recurring-amount">Amount</Label>
                <Select value={recurringAmount} onValueChange={setRecurringAmount}>
                  <SelectTrigger id="recurring-amount" data-testid="select-recurring-amount">
                    <SelectValue placeholder="Select amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5000">₦5,000</SelectItem>
                    <SelectItem value="10000">₦10,000</SelectItem>
                    <SelectItem value="15000">₦15,000</SelectItem>
                    <SelectItem value="custom">Custom Amount</SelectItem>
                  </SelectContent>
                </Select>
                {recurringAmount === "custom" && (
                  <Input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    data-testid="input-custom-amount"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-frequency">Frequency</Label>
                <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                  <SelectTrigger id="recurring-frequency" data-testid="select-recurring-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSetupRecurring}
              disabled={setupRecurringMutation.isPending}
              className="w-full"
              data-testid="button-setup-recurring"
            >
              <Repeat className="h-4 w-4 mr-2" />
              {setupRecurringMutation.isPending ? "Setting up..." : "Setup Recurring Payments"}
            </Button>
          </CardContent>
        </Card>
      )}

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
                  className="flex items-center justify-between p-4 bg-background rounded-lg flex-wrap gap-4"
                  data-testid={`due-item-${due.id}`}
                >
                  <div>
                    <p className="font-semibold">₦{parseFloat(due.amount.toString()).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(due.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePayment(parseFloat(due.amount.toString()))}
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
          {paidDues.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payment history yet</p>
          ) : (
            <div className="space-y-3">
              {paidDues.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg flex-wrap gap-4"
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
                    variant={payment.paymentStatus === "completed" ? "default" : payment.paymentStatus === "pending" ? "secondary" : "destructive"}
                    data-testid={`badge-status-${payment.id}`}
                  >
                    {payment.paymentStatus === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {payment.paymentStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {payment.paymentStatus?.toUpperCase()}
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
