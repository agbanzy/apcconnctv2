import { MembershipCard } from "@/components/membership-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2 } from "lucide-react";

export default function Membership() {
  //todo: remove mock functionality
  const memberData = {
    memberName: "Adebayo Johnson",
    memberId: "APC-2024-NG-12345",
    ward: "Ward 5",
    lga: "Lagos Island",
    state: "Lagos",
    membershipStatus: "active" as const,
    joinDate: "January 2024",
  };

  const duesHistory = [
    { month: "March 2024", amount: "₦5,000", status: "paid", date: "Mar 1, 2024" },
    { month: "February 2024", amount: "₦5,000", status: "paid", date: "Feb 1, 2024" },
    { month: "January 2024", amount: "₦5,000", status: "paid", date: "Jan 1, 2024" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Membership</h1>
        <p className="text-muted-foreground">
          Manage your APC membership, view your digital ID, and track dues payments
        </p>
      </div>

      <MembershipCard {...memberData} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-dues">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Membership Dues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-chart-1/10 rounded-lg border border-chart-1/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Next Payment Due</span>
                <Badge className="bg-chart-1 text-white">Active</Badge>
              </div>
              <div className="font-mono text-3xl font-bold text-primary">₦5,000</div>
              <p className="text-sm text-muted-foreground mt-1">Due: April 1, 2024</p>
            </div>
            <Button className="w-full" data-testid="button-pay-dues">
              Pay Dues Now
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-dues-history">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duesHistory.map((payment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`payment-${idx}`}
                >
                  <div>
                    <div className="font-semibold">{payment.month}</div>
                    <div className="text-xs text-muted-foreground">{payment.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">{payment.amount}</div>
                    <div className="flex items-center gap-1 text-chart-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
