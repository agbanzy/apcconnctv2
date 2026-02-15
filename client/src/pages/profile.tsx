import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { User, MapPin, Phone, Mail, QrCode, CreditCard, Camera, Upload } from "lucide-react";
import { DigitalIdCard } from "@/components/digital-id-card";
import { ObjectUploader } from "@/components/object-uploader";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });
  const member = memberData?.data;

  const [formData, setFormData] = useState({
    phone: user?.phone || "",
    nin: member?.nin || "",
  });

  useEffect(() => {
    if (member && !isEditing) {
      setFormData({
        phone: user?.phone || "",
        nin: member.nin || "",
      });
    }
  }, [member, user, isEditing]);

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

  const photoUploadMutation = useMutation({
    mutationFn: async (objectKey: string) => {
      const res = await apiRequest("POST", "/api/members/profile-photo", { objectKey });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", member?.id, "id-card"] });
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const res = await apiRequest("POST", "/api/objects/upload", {});
    const data = await res.json();
    return {
      method: data.data.method,
      url: data.data.url,
      objectKey: data.data.objectKey,
    };
  };

  const handleUploadComplete = (objectKey: string) => {
    if (objectKey) {
      photoUploadMutation.mutate(objectKey);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!user || !memberData?.data) {
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
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-primary">
                <AvatarImage src={member?.photoUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="text-3xl font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {member?.photoUrl ? "Update your profile photo" : "Upload a profile photo for your digital ID card"}
                </p>
                <ObjectUploader
                  maxFileSize={3145728}
                  allowedFileTypes={["image/jpeg", "image/png", "image/webp"]}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonVariant="default"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span>{member?.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                  </div>
                </ObjectUploader>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 3MB • JPG, PNG, or WebP
                </p>
              </div>
            </CardContent>
          </Card>

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
