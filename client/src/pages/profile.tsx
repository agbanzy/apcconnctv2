import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { User, MapPin, Phone, Mail, QrCode, CreditCard } from "lucide-react";
import { DigitalIdCard } from "@/components/digital-id-card";

export default function Profile() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: user?.phone || "",
    nin: member?.nin || "",
  });

  const { data: qrCodeData, isLoading: isLoadingQR } = useQuery<{ success: boolean; data: { qrCode: string } }>({
    queryKey: ["/api/members", member?.id, "qr-code"],
    enabled: !!member?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { phone?: string; nin?: string }) => {
      const res = await apiRequest("PATCH", `/api/members/${member?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!user || !member) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and membership details
        </p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="info" data-testid="tab-info">
            <User className="h-4 w-4 mr-2" />
            Profile Info
          </TabsTrigger>
          <TabsTrigger value="id-card" data-testid="tab-id-card">
            <CreditCard className="h-4 w-4 mr-2" />
            Digital ID Card
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  value={`${user.firstName} ${user.lastName}`}
                  disabled
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  value={user.email}
                  disabled
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label>National Identification Number (NIN)</Label>
                <Input
                  value={formData.nin}
                  onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter 11-digit NIN"
                  maxLength={11}
                  data-testid="input-nin"
                />
              </div>

              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ phone: user.phone || "", nin: member.nin || "" });
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit"
                >
                  Edit Profile
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Member ID</Label>
              <p className="font-mono text-lg font-semibold" data-testid="text-member-id">
                {member.memberId}
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <div className="mt-1">
                <Badge
                  variant={member.status === "active" ? "default" : "secondary"}
                  data-testid="badge-status"
                >
                  {member.status?.toUpperCase()}
                </Badge>
              </div>
            </div>

            {member.ward && (
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <div className="mt-1 space-y-1">
                  <p data-testid="text-ward">Ward: {member.ward.name}</p>
                  {member.ward.lga && (
                    <p data-testid="text-lga">LGA: {member.ward.lga.name}</p>
                  )}
                  {member.ward.lga?.state && (
                    <p data-testid="text-state">State: {member.ward.lga.state.name}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <QrCode className="h-4 w-4" />
                Membership QR Code
              </Label>
              {isLoadingQR ? (
                <Skeleton className="h-48 w-48" />
              ) : qrCodeData?.data?.qrCode ? (
                <img
                  src={qrCodeData.data.qrCode}
                  alt="Membership QR Code"
                  className="w-48 h-48 border rounded-lg"
                  data-testid="img-qr-code"
                />
              ) : (
                <p className="text-sm text-muted-foreground">QR code not available</p>
              )}
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="id-card" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Digital Party ID Card</CardTitle>
            </CardHeader>
            <CardContent>
              {member?.id ? (
                <DigitalIdCard memberId={member.id} />
              ) : (
                <p className="text-center text-muted-foreground">
                  Unable to load ID card
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
