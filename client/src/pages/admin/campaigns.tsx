import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, BarChart3, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function AdminCampaigns() {
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const approveCampaignMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/campaigns/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Success", description: "Campaign approved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve campaign", variant: "destructive" });
    },
  });

  const rejectCampaignMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiRequest("PATCH", `/api/campaigns/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Success", description: "Campaign rejected" });
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject campaign", variant: "destructive" });
    },
  });

  const campaigns = campaignsData?.data || [];
  const pendingCampaigns = campaigns.filter((c: any) => c.status === 'active' && !c.approved);
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'approved');
  const completedCampaigns = campaigns.filter((c: any) => c.status === 'completed' || c.status === 'rejected');

  const handleReject = () => {
    if (!selectedCampaign || !rejectReason) return;
    rejectCampaignMutation.mutate({ id: selectedCampaign.id, reason: rejectReason });
  };

  if (isLoading) {
    return <div className="p-6">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Campaigns' }]} />
      
      <div>
        <h1 className="font-display text-3xl font-bold" data-testid="text-campaigns-title">Campaigns Management</h1>
        <p className="text-muted-foreground mt-1">Review and manage issue campaigns</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending campaigns
              </CardContent>
            </Card>
          ) : (
            pendingCampaigns.map((campaign: any) => (
              <Card key={campaign.id} data-testid={`campaign-pending-${campaign.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{campaign.title}</CardTitle>
                      <Badge variant="secondary" className="mt-2">{campaign.category}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveCampaignMutation.mutate(campaign.id)}
                        data-testid={`button-approve-${campaign.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setRejectDialogOpen(true);
                        }}
                        data-testid={`button-reject-${campaign.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{campaign.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {campaign.currentVotes || 0} / {campaign.targetVotes} votes
                      </span>
                    </div>
                    <Progress 
                      value={((campaign.currentVotes || 0) / campaign.targetVotes) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active campaigns
              </CardContent>
            </Card>
          ) : (
            activeCampaigns.map((campaign: any) => (
              <Card key={campaign.id} data-testid={`campaign-active-${campaign.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{campaign.title}</CardTitle>
                      <Badge variant="secondary" className="mt-2">{campaign.category}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-analytics-${campaign.id}`}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-moderate-${campaign.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Moderate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{campaign.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {campaign.currentVotes || 0} / {campaign.targetVotes} votes
                      </span>
                    </div>
                    <Progress 
                      value={((campaign.currentVotes || 0) / campaign.targetVotes) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No completed campaigns
              </CardContent>
            </Card>
          ) : (
            completedCampaigns.map((campaign: any) => (
              <Card key={campaign.id} data-testid={`campaign-completed-${campaign.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{campaign.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{campaign.category}</Badge>
                        <Badge variant={campaign.status === 'completed' ? 'default' : 'destructive'}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{campaign.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Final Votes</span>
                    <span className="font-medium">{campaign.currentVotes || 0}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-campaign">
          <DialogHeader>
            <DialogTitle>Reject Campaign</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Campaign</p>
              <p className="text-sm text-muted-foreground">{selectedCampaign?.title}</p>
            </div>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason}
              data-testid="button-confirm-reject"
            >
              Reject Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
