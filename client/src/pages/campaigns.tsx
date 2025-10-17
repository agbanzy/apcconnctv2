import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { IssueCampaignCard } from "@/components/issue-campaign-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search } from "lucide-react";
import type { IssueCampaign } from "@shared/schema";

export default function Campaigns() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: campaignsData, isLoading } = useQuery<{
    success: boolean;
    data: (IssueCampaign & { author: any })[];
  }>({
    queryKey: ["/api/campaigns"],
  });

  const voteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/vote`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Vote recorded",
        description: "Your support has been counted!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote failed",
        description: error?.message || "You may have already voted on this campaign.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ campaignId, content }: { campaignId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Comment failed",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const campaigns = campaignsData?.data || [];
  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Issue Campaigns</h1>
        <p className="text-muted-foreground">
          Raise awareness and rally support for important issues affecting your community
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-campaigns"
        />
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "No campaigns found matching your search." : "No campaigns available."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCampaigns.map((campaign) => (
            <IssueCampaignCard
              key={campaign.id}
              title={campaign.title}
              description={campaign.description}
              category={campaign.category}
              currentVotes={campaign.currentVotes || 0}
              targetVotes={campaign.targetVotes || 5000}
              author={campaign.author?.user?.firstName || "Unknown"}
              onVote={() => voteMutation.mutate(campaign.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
