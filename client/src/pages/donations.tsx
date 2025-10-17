import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { DollarSign, Heart, TrendingUp, Filter } from "lucide-react";

interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  category: string;
  goalAmount: number;
  currentAmount: number;
  image: string | null;
  status: string;
}

interface Donation {
  id: string;
  donorName: string | null;
  campaignId: string | null;
  amount: number;
  isAnonymous: boolean;
  createdAt: string;
  campaign?: { title: string };
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];
const CATEGORIES = ["general", "campaign", "infrastructure", "youth_programs", "community_development", "emergency_relief"];

export default function Donations() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{ success: boolean; data: DonationCampaign[] }>({
    queryKey: ["/api/donation-campaigns"],
  });

  const { data: recentDonationsData } = useQuery<{ success: boolean; data: Donation[] }>({
    queryKey: ["/api/donations/recent"],
  });

  const createDonationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/donations/create", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    },
    onError: () => {
      toast({
        title: "Donation failed",
        description: "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const campaigns = campaignsData?.data || [];
  const recentDonations = recentDonationsData?.data || [];

  const filteredCampaigns = selectedCategory === "all" 
    ? campaigns 
    : campaigns.filter(c => c.category === selectedCategory);

  const activeCampaigns = filteredCampaigns.filter(c => c.status === "active");

  const handleQuickAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleDonation = (campaignId?: string) => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 100) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount (minimum ₦100)",
        variant: "destructive",
      });
      return;
    }

    createDonationMutation.mutate({
      amount,
      campaignId: campaignId || selectedCampaign || null,
      isAnonymous,
      message: message || null,
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-lg p-8">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold mb-3" data-testid="text-page-title">
            Support APC's Vision for Nigeria
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Your generous contributions help us build a better Nigeria through infrastructure development, 
            youth empowerment programs, and community initiatives across all states.
          </p>
          <div className="flex flex-wrap gap-3">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                onClick={() => handleQuickAmount(amount)}
                data-testid={`button-quick-amount-${amount}`}
              >
                ₦{amount.toLocaleString()}
              </Button>
            ))}
            <Input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              className="w-40"
              data-testid="input-custom-amount"
            />
          </div>
        </div>
      </div>

      {/* Active Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Active Campaigns</h2>
            <p className="text-sm text-muted-foreground">Choose a specific campaign to support</p>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {campaignsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCampaigns.map((campaign) => {
              const progress = campaign.goalAmount > 0 
                ? (campaign.currentAmount / campaign.goalAmount) * 100 
                : 0;
              
              return (
                <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <Badge variant="secondary" className="capitalize">
                        {campaign.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm mt-2">
                        <span className="font-semibold">₦{(campaign.currentAmount / 100).toLocaleString()}</span>
                        <span className="text-muted-foreground">of ₦{(campaign.goalAmount / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleDonation(campaign.id)}
                      disabled={createDonationMutation.isPending}
                      data-testid={`button-donate-campaign-${campaign.id}`}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Donate Now
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {!campaignsLoading && activeCampaigns.length === 0 && (
          <Card className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active campaigns in this category</p>
          </Card>
        )}
      </div>

      {/* General Donation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Make a General Donation</CardTitle>
          <CardDescription>Support APC's overall mission and objectives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Campaign (Optional)</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger data-testid="select-general-campaign">
                <SelectValue placeholder="General Donation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">General Donation</SelectItem>
                {activeCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="anonymous" 
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              data-testid="checkbox-anonymous"
            />
            <Label htmlFor="anonymous" className="text-sm font-normal">
              Make this an anonymous donation
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message with your donation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="textarea-donation-message"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => handleDonation()}
            disabled={createDonationMutation.isPending || (!selectedAmount && !customAmount)}
            data-testid="button-proceed-payment"
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Proceed to Payment
          </Button>
        </CardFooter>
      </Card>

      {/* Recent Donations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
          <CardDescription>Thank you to our generous supporters</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDonations.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No recent donations yet</p>
          ) : (
            <div className="space-y-3">
              {recentDonations.slice(0, 20).map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`donation-item-${donation.id}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {donation.isAnonymous ? "Anonymous" : donation.donorName || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {donation.campaign?.title || "General Donation"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(donation.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₦{(donation.amount / 100).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
