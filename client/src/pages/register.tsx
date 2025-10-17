import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import logoUrl from "@assets/logo_1760719840683.png";
import type { State, Lga, Ward } from "@shared/schema";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    stateId: "",
    lgaId: "",
    wardId: "",
  });

  const { data: statesData } = useQuery<{ success: boolean; data: State[] }>({
    queryKey: ["/api/locations/states"],
  });

  const { data: lgasData } = useQuery<{ success: boolean; data: Lga[] }>({
    queryKey: ["/api/locations/states", formData.stateId, "lgas"],
    enabled: !!formData.stateId,
  });

  const { data: wardsData } = useQuery<{ success: boolean; data: Ward[] }>({
    queryKey: ["/api/locations/lgas", formData.lgaId, "wards"],
    enabled: !!formData.lgaId,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Registration successful!",
        description: "Welcome to APC Connect",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      if (field === "stateId") {
        updated.lgaId = "";
        updated.wardId = "";
      } else if (field === "lgaId") {
        updated.wardId = "";
      }
      
      return updated;
    });
  };

  const states = statesData?.data || [];
  const lgas = lgasData?.data || [];
  const wards = wardsData?.data || [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoUrl} alt="APC Logo" className="h-20 w-20" data-testid="img-logo" />
          </div>
          <CardTitle className="text-2xl font-display">Join APC Connect</CardTitle>
          <CardDescription>
            Create your account and become part of the movement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                  data-testid="input-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={formData.stateId} onValueChange={(value) => handleChange("stateId", value)}>
                <SelectTrigger data-testid="select-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lga">Local Government Area (LGA)</Label>
              <Select
                value={formData.lgaId}
                onValueChange={(value) => handleChange("lgaId", value)}
                disabled={!formData.stateId}
              >
                <SelectTrigger data-testid="select-lga">
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  {lgas.map((lga) => (
                    <SelectItem key={lga.id} value={lga.id}>
                      {lga.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select
                value={formData.wardId}
                onValueChange={(value) => handleChange("wardId", value)}
                disabled={!formData.lgaId}
              >
                <SelectTrigger data-testid="select-ward">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.id}>
                      {ward.name} (Ward {ward.wardNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login">
              <a className="text-primary hover:underline" data-testid="link-login">
                Sign in here
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
