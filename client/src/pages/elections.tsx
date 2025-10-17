import { useState } from "react";
import { CandidateCard } from "@/components/candidate-card";
import { VoteResultsChart } from "@/components/vote-results-chart";
import { SituationRoomDashboard } from "@/components/situation-room-dashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup } from "@/components/ui/radio-group";
import { Vote } from "lucide-react";

export default function Elections() {
  const [selectedCandidate, setSelectedCandidate] = useState("");

  //todo: remove mock functionality
  const candidates = [
    {
      id: "candidate-1",
      name: "Dr. Amina Bello",
      position: "State Chairman",
      manifesto: "Focus on youth inclusion, digital transformation of party operations, and grassroots mobilization across all 36 states.",
      experience: "15 years in party leadership, former youth coordinator",
    },
    {
      id: "candidate-2",
      name: "Hon. Chukwudi Okafor",
      position: "State Chairman",
      manifesto: "Strengthening party structures at ward level, improving member welfare, and transparent financial management.",
      experience: "10 years as LGA chairman, extensive grassroots experience",
    },
  ];

  const results = {
    position: "State Chairman - Lagos",
    status: "completed" as const,
    totalVotes: 15420,
    results: [
      { candidateName: "Dr. Amina Bello", votes: 8234, percentage: 53.4, isWinner: true },
      { candidateName: "Hon. Chukwudi Okafor", votes: 4890, percentage: 31.7 },
      { candidateName: "Mrs. Fatima Ahmed", votes: 2296, percentage: 14.9 },
    ],
  };

  const pollingUnits = [
    { id: "PU-001", name: "Polling Unit 001 - Central School", status: "completed" as const, votes: 342, timestamp: "10:45 AM" },
    { id: "PU-002", name: "Polling Unit 002 - Community Hall", status: "active" as const, votes: 0, timestamp: "11:30 AM" },
    { id: "PU-003", name: "Polling Unit 003 - Market Square", status: "incident" as const, votes: 0, timestamp: "11:15 AM" },
    { id: "PU-004", name: "Polling Unit 004 - Primary School", status: "delayed" as const, votes: 0, timestamp: "09:30 AM" },
  ];

  const handleVote = () => {
    console.log("Vote cast for:", selectedCandidate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Elections & Primaries</h1>
        <p className="text-muted-foreground">
          Participate in electronic primaries, view results, and monitor election day activities
        </p>
      </div>

      <Tabs defaultValue="vote" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-elections">
          <TabsTrigger value="vote" data-testid="tab-vote">Cast Vote</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="situation-room" data-testid="tab-situation-room">Situation Room</TabsTrigger>
        </TabsList>

        <TabsContent value="vote" className="space-y-6 mt-6">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <h3 className="font-semibold mb-2">State Chairman Election - Lagos</h3>
            <p className="text-sm text-muted-foreground">
              Select your preferred candidate. Your vote is anonymous and secured with blockchain technology.
            </p>
          </div>

          <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate}>
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  {...candidate}
                  selected={selectedCandidate === candidate.id}
                />
              ))}
            </div>
          </RadioGroup>

          <Button
            size="lg"
            className="w-full"
            disabled={!selectedCandidate}
            onClick={handleVote}
            data-testid="button-submit-vote"
          >
            <Vote className="h-5 w-5 mr-2" />
            Cast Your Vote
          </Button>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <VoteResultsChart {...results} />
        </TabsContent>

        <TabsContent value="situation-room" className="mt-6">
          <SituationRoomDashboard pollingUnits={pollingUnits} totalUnits={250} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
