import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { useRef } from "react";

interface DigitalIdCardProps {
  memberId: string;
}

export function DigitalIdCard({ memberId }: DigitalIdCardProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: cardData, isLoading } = useQuery<{
    success: boolean;
    data: {
      member: any;
      token: string;
      idCard: any;
    };
  }>({
    queryKey: ["/api/members", memberId, "id-card"],
  });

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `APC-ID-Card-${cardData?.data.member.memberId}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Success",
        description: "ID card downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download ID card",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const verifyUrl = `${window.location.origin}/id-card/verify/${memberId}?token=${cardData?.data.token}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "APC Digital ID Card",
          text: "Verify my APC membership ID card",
          url: verifyUrl,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(verifyUrl);
        toast({
          title: "Link copied",
          description: "Verification link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 w-full max-w-md mx-auto" />
        <div className="flex gap-2 justify-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!cardData?.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Unable to load ID card
          </p>
        </CardContent>
      </Card>
    );
  }

  const { member, token } = cardData.data;
  const user = member.user;
  const ward = member.ward;
  const lga = ward?.lga;
  const state = lga?.state;

  // Mask NIN to show only last 4 digits
  const maskedNin = member.nin
    ? `****${member.nin.slice(-4)}`
    : "Not provided";

  const verifyUrl = `${window.location.origin}/id-card/verify/${memberId}?token=${token}`;

  return (
    <div className="space-y-6">
      <div
        ref={cardRef}
        className="relative bg-gradient-to-br from-[#8FA658] via-[#3B82C8] to-[#E42F45] p-1 rounded-xl max-w-md mx-auto"
        data-testid="id-card-container"
      >
        <div className="bg-card rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={member.photoUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                <AvatarFallback className="text-lg font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg" data-testid="text-member-name">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="font-mono text-sm text-muted-foreground" data-testid="text-member-id">
                  {member.memberId}
                </p>
              </div>
            </div>
            <Badge
              variant={member.status === "active" ? "default" : "secondary"}
              className="ml-2"
              data-testid="badge-status"
            >
              {member.status === "active" ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : member.status === "pending" ? (
                <Clock className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {member.status}
            </Badge>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">NIN</p>
                <p className="font-mono" data-testid="text-nin">
                  {maskedNin}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ward</p>
                <p className="font-medium" data-testid="text-ward">
                  {ward?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">LGA</p>
                <p className="font-medium" data-testid="text-lga">
                  {lga?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">State</p>
                <p className="font-medium" data-testid="text-state">
                  {state?.name || "N/A"}
                </p>
              </div>
            </div>

            <div className="text-sm pt-2">
              <p className="text-muted-foreground text-xs">Member Since</p>
              <p className="font-medium" data-testid="text-join-date">
                {new Date(member.joinDate).toLocaleDateString("en-NG", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">
                Scan to verify authenticity
              </p>
              <div className="inline-block bg-white p-2 rounded">
                <QRCodeSVG
                  value={verifyUrl}
                  size={100}
                  level="H"
                  includeMargin={false}
                  data-testid="qr-code"
                />
              </div>
            </div>
            <div className="text-right">
              <img
                src="/logo_1760719840683.png"
                alt="APC Logo"
                className="h-12 w-auto opacity-80"
                data-testid="img-logo"
              />
              <p className="text-xs font-bold mt-2" style={{ color: "#8FA658" }}>
                ALL PROGRESSIVES CONGRESS
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          onClick={handleDownload}
          variant="default"
          data-testid="button-download"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          data-testid="button-share"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
