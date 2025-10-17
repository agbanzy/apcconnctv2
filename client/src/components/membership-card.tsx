import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2 } from "lucide-react";

interface MembershipCardProps {
  memberName: string;
  memberId: string;
  ward: string;
  lga: string;
  state: string;
  membershipStatus: "active" | "pending" | "expired";
  joinDate: string;
}

export function MembershipCard({
  memberName,
  memberId,
  ward,
  lga,
  state,
  membershipStatus,
  joinDate,
}: MembershipCardProps) {
  const statusColors = {
    active: "bg-chart-1 text-white",
    pending: "bg-chart-4 text-white",
    expired: "bg-destructive text-destructive-foreground",
  };

  return (
    <Card className="relative overflow-hidden p-6" data-testid="card-membership">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-4 flex-1">
          <div>
            <Badge className={statusColors[membershipStatus]} data-testid={`badge-status-${membershipStatus}`}>
              {membershipStatus === "active" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {membershipStatus.toUpperCase()}
            </Badge>
          </div>
          
          <div>
            <h3 className="font-display text-2xl font-bold" data-testid="text-member-name">{memberName}</h3>
            <p className="font-mono text-sm text-muted-foreground" data-testid="text-member-id">ID: {memberId}</p>
          </div>

          <div className="space-y-1 text-sm">
            <p data-testid="text-location">
              <span className="text-muted-foreground">Ward:</span> {ward}
            </p>
            <p>
              <span className="text-muted-foreground">LGA:</span> {lga}
            </p>
            <p>
              <span className="text-muted-foreground">State:</span> {state}
            </p>
            <p>
              <span className="text-muted-foreground">Member Since:</span> {joinDate}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="bg-white p-2 rounded-md">
            <QRCodeSVG
              value={memberId}
              size={80}
              level="H"
              data-testid="qr-code-membership"
            />
          </div>
          <p className="text-xs text-muted-foreground">Scan to verify</p>
        </div>
      </div>
    </Card>
  );
}
