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

            {/* ================================================================
                NIN VERIFICATION INTEGRATION POINT - OPTIONAL DURING REGISTRATION
                ================================================================
                
                APPROACH 1: OPTIONAL NIN VERIFICATION DURING REGISTRATION
                ---------------------------------------------------------
                Add optional NIN input fields here to allow members to verify
                their NIN immediately during registration for faster activation.
                
                Benefits:
                - Streamlined onboarding - members can be activated immediately
                - Reduces friction for members who have NIN readily available
                - One-step registration and verification process
                
                Implementation:
                1. Add nin and dateOfBirth fields to formData state
                2. Add input fields below for NIN and date of birth
                3. Include these fields in the registration mutation
                4. Backend will attempt verification and activate if successful
                5. If verification fails, registration still succeeds but member
                   remains in 'pending' status for later verification
                
                Example UI Components to add here:

                <div className="space-y-2">
                  <Label htmlFor="nin">
                    National Identification Number (NIN) - Optional
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Verify your NIN now to activate your account immediately
                  </p>
                  <Input
                    id="nin"
                    type="text"
                    maxLength={11}
                    placeholder="12345678901"
                    value={formData.nin || ""}
                    onChange={(e) => handleChange("nin", e.target.value)}
                    data-testid="input-nin"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your 11-digit National Identification Number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth - Required for NIN verification
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth || ""}
                    onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                    disabled={!formData.nin}
                    data-testid="input-dob"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the date of birth on your NIN record
                  </p>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Why verify your NIN?</strong>
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Instant account activation</li>
                      <li>Access to all APC Connect features</li>
                      <li>Participate in elections and events</li>
                      <li>Required for membership verification</li>
                    </ul>
                    <p className="mt-2">
                      Don't have your NIN handy? You can verify later from your profile.
                    </p>
                  </AlertDescription>
                </Alert>
                
                UX Flow with Optional NIN Verification:
                ----------------------------------------
                1. User fills registration form
                2. User optionally enters NIN + date of birth
                3. User clicks "Create Account"
                4. Frontend sends registration data including NIN if provided
                5. Backend creates account and attempts NIN verification if provided
                   
                   SUCCESS CASE:
                   - NIN verified successfully
                   - Account status: "active"
                   - User is logged in and redirected to dashboard
                   - Success message: "Account created and verified successfully!"
                   
                   PARTIAL SUCCESS CASE:
                   - NIN verification failed but account created
                   - Account status: "pending"
                   - User is logged in but sees verification prompt
                   - Message: "Account created! Please verify your NIN to activate your account."
                   
                   NO NIN PROVIDED CASE:
                   - Account created without NIN
                   - Account status: "pending"
                   - User redirected to complete profile/verification
                   - Message: "Account created! Complete your profile to get started."
                
                ================================================================
                
                APPROACH 2: POST-REGISTRATION NIN VERIFICATION (CURRENT)
                ---------------------------------------------------------
                Members register first, then verify NIN later via profile page.
                This is the simpler approach and is currently implemented.
                
                Benefits:
                - Simpler registration form
                - Lower barrier to entry
                - Members can register even without NIN immediately available
                
                UX Flow with Post-Registration Verification:
                --------------------------------------------
                1. User registers without NIN
                2. User is logged in with status: "pending"
                3. Dashboard shows prominent "Verify NIN" card/banner
                4. User navigates to Profile/Settings page
                5. Profile page shows NIN verification form
                6. User enters NIN + date of birth
                7. User clicks "Verify NIN"
                8. Frontend calls POST /api/members/:id/verify-nin
                9. Success: Account activated, user can access all features
                10. Failure: Error shown with remaining attempts counter
                
                For this approach, the verification UI is in:
                - client/src/pages/profile.tsx (NIN verification form)
                - Dashboard shows verification status banner
                
                ================================================================ */}

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
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
