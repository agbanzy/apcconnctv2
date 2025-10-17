import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CandidateCard } from "@/components/candidate-card";
import { VoteResultsChart } from "@/components/vote-results-chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Vote } from "lucide-react";
import type { Election, Candidate } from "@shared/schema";

export default function Elections() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);

  const { data: electionsData, isLoading } = useQuery<{
    success: boolean;
    data: Election[];
  }>({
    queryKey: ["/api/elections"],
  });

  const { data: electionDetailsData } = useQuery<{
    success: boolean;
    data: Election & { candidates: Candidate[] };
  }>({
    queryKey: ["/api/elections", selectedElectionId],
    enabled: !!selectedElectionId,
  });

  const { data: resultsData } = useQuery<{
    success: boolean;
    data: {
      election: Election;
      candidates: Candidate[];
      totalVotes: number;
    };
  }>({
    queryKey: ["/api/elections", selectedElectionId, "results"],
    enabled: !!selectedElectionId,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ electionId, candidateId }: { electionId: string; candidateId: string }) => {
      const res = await apiRequest("POST", `/api/elections/${electionId}/vote`, { candidateId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      toast({
        title: "Vote recorded",
        description: "Your vote has been successfully cast and secured with blockchain technology!",
      });
      setSelectedCandidate("");
    },
    onError: (error: any) => {
      toast({
        title: "Vote failed",
        description: error?.message || "You may have already voted in this election.",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (selectedElectionId && selectedCandidate) {
      voteMutation.mutate({
        electionId: selectedElectionId,
        candidateId: selectedCandidate,
      });
    }
  };

  const elections = electionsData?.data || [];
  const firstElection = elections[0];
  const currentElection = selectedElectionId 
    ? elections.find(e => e.id === selectedElectionId) || firstElection
    : firstElection;
  
  if (!selectedElectionId && firstElection) {
    setSelectedElectionId(firstElection.id);
  }

  const candidates = electionDetailsData?.data?.candidates || [];
  const results = resultsData?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No elections available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Elections & Primaries</h1>
        <p className="text-muted-foreground">
          Participate in electronic primaries, view results, and monitor election day activities
        </p>
      </div>

      <Tabs defaultValue="vote" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-elections">
          <TabsTrigger value="vote" data-testid="tab-vote">Cast Vote</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="vote" className="space-y-6 mt-6">
          {currentElection && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h3 className="font-semibold mb-2">{currentElection.title}</h3>
              <p className="text-sm text-muted-foreground">
                {currentElection.description || "Select your preferred candidate. Your vote is anonymous and secured with blockchain technology."}
              </p>
            </div>
          )}

          {candidates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No candidates available</p>
          ) : (
            <>
              <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <div className="space-y-4">
                  {candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      id={candidate.id}
                      name={candidate.name}
                      position={currentElection?.position || ""}
                      manifesto={candidate.manifesto}
                      experience={candidate.experience}
                      selected={selectedCandidate === candidate.id}
                    />
                  ))}
                </div>
              </RadioGroup>

              <Button
                size="lg"
                className="w-full"
                disabled={!selectedCandidate || voteMutation.isPending}
                onClick={handleVote}
                data-testid="button-submit-vote"
              >
                <Vote className="h-5 w-5 mr-2" />
                {voteMutation.isPending ? "Casting Vote..." : "Cast Your Vote"}
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {results ? (
            <VoteResultsChart
              position={results.election.position}
              status={results.election.status as "ongoing" | "completed"}
              totalVotes={results.totalVotes}
              results={results.candidates.map(c => ({
                candidateName: c.name,
                votes: c.votes || 0,
                percentage: results.totalVotes > 0 ? ((c.votes || 0) / results.totalVotes) * 100 : 0,
                isWinner: c.votes === Math.max(...results.candidates.map(cand => cand.votes || 0)),
              }))}
            />
          ) : (
            <p className="text-center py-8 text-muted-foreground">Results not available yet</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
