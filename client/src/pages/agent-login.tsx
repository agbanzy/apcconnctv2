import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, MapPin, Vote, Send, CheckCircle, AlertTriangle, ArrowLeft, Radio, Loader2 } from "lucide-react";

type AgentSession = {
  agent: {
    id: string;
    agentCode: string;
    status: string;
    memberId: string;
    memberName: string;
  };
  pollingUnit: {
    id: string;
    name: string;
    unitCode: string;
    status: string;
  };
  location: {
    ward: string;
    lga: string;
    state: string;
  };
  election: {
    id: string;
    title: string;
    position: string;
    status: string;
  } | null;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    partyColor: string;
    partyId: string;
  }>;
};

export default function AgentLogin() {
  const { toast } = useToast();
  const [agentCode, setAgentCode] = useState("");
  const [agentPin, setAgentPin] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [registeredVoters, setRegisteredVoters] = useState("");
  const [accreditedVoters, setAccreditedVoters] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = async () => {
    if (!agentCode.trim() || !agentPin.trim()) {
      toast({ title: "Error", description: "Please enter your agent code and PIN", variant: "destructive" });
      return;
    }

    setIsLogging(true);
    try {
      const response = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentCode: agentCode.trim().toUpperCase(), agentPin: agentPin.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      setSession(data.data);
      toast({ title: "Logged In", description: `Welcome, ${data.data.agent.memberName}` });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLogging(false);
    }
  };

  const handleSubmitResults = async () => {
    if (!session || !session.election) return;

    const results = session.candidates.map(c => ({
      candidateId: c.id,
      partyId: c.partyId,
      votes: parseInt(votes[c.id] || "0"),
    }));

    const hasInvalid = results.some(r => isNaN(r.votes) || r.votes < 0);
    if (hasInvalid) {
      toast({ title: "Error", description: "Vote counts must be zero or positive numbers", variant: "destructive" });
      return;
    }

    const hasVotes = results.some(r => r.votes > 0);
    if (!hasVotes) {
      toast({ title: "Error", description: "Please enter vote counts for at least one candidate", variant: "destructive" });
      return;
    }

    const regVoters = registeredVoters ? parseInt(registeredVoters) : 0;
    const accVoters = accreditedVoters ? parseInt(accreditedVoters) : 0;
    if (registeredVoters && (isNaN(regVoters) || regVoters < 0)) {
      toast({ title: "Error", description: "Registered voters must be a positive number", variant: "destructive" });
      return;
    }
    if (accreditedVoters && (isNaN(accVoters) || accVoters < 0)) {
      toast({ title: "Error", description: "Accredited voters must be a positive number", variant: "destructive" });
      return;
    }
    if (regVoters > 0 && accVoters > regVoters) {
      toast({ title: "Warning", description: "Accredited voters exceeds registered voters. Please verify.", variant: "destructive" });
      return;
    }

    const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
    if (accVoters > 0 && totalVotes > accVoters) {
      toast({ title: "Warning", description: "Total votes exceed accredited voters. Please verify.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agent/submit-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentCode: session.agent.agentCode,
          agentPin: agentPin,
          electionId: session.election.id,
          pollingUnitId: session.pollingUnit.id,
          results,
          registeredVoters: registeredVoters || undefined,
          accreditedVoters: accreditedVoters || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
      toast({ title: "Results Submitted", description: `${data.data.submitted} results submitted successfully` });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setAgentCode("");
    setAgentPin("");
    setVotes({});
    setRegisteredVoters("");
    setAccreditedVoters("");
    setSubmitted(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-agent-login-title">Polling Agent Portal</h1>
            <p className="text-sm text-muted-foreground">Enter your agent credentials to access the results submission portal</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentCode">Agent Code</Label>
                <Input
                  id="agentCode"
                  placeholder="AGT-XXXX-XXXX"
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                  data-testid="input-agent-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentPin">PIN</Label>
                <Input
                  id="agentPin"
                  type="password"
                  placeholder="4-digit PIN"
                  maxLength={4}
                  value={agentPin}
                  onChange={(e) => setAgentPin(e.target.value.replace(/\D/g, ""))}
                  data-testid="input-agent-pin"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={isLogging || !agentCode.trim() || !agentPin.trim()}
                data-testid="button-agent-login"
              >
                {isLogging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                {isLogging ? "Logging in..." : "Login as Agent"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Contact your coordinator if you need agent credentials
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-submission-success">Results Submitted</h1>
          <p className="text-muted-foreground">
            Your results for <strong>{session.pollingUnit.name}</strong> have been successfully submitted and are now live.
          </p>
          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-medium">{session.agent.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{session.pollingUnit.unitCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{session.location.ward}, {session.location.lga}</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSubmitted(false)} data-testid="button-update-results">
              Update Results
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleLogout} data-testid="button-agent-logout">
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-back-logout">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" data-testid="text-agent-name">{session.agent.memberName}</p>
            <p className="text-xs text-muted-foreground">{session.agent.agentCode}</p>
          </div>
          <Badge variant={session.agent.status === "checked_in" ? "default" : "secondary"} data-testid="badge-agent-status">
            {session.agent.status === "checked_in" ? "Active" : session.agent.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-base truncate" data-testid="text-unit-name">{session.pollingUnit.name}</CardTitle>
                <CardDescription>{session.pollingUnit.unitCode}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex gap-4 text-muted-foreground flex-wrap">
              <span>{session.location.ward}</span>
              <span>{session.location.lga}</span>
              <span>{session.location.state}</span>
            </div>
          </CardContent>
        </Card>

        {session.election ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base" data-testid="text-election-title">{session.election.title}</CardTitle>
                  {session.election.status === "ongoing" && (
                    <Badge variant="destructive" className="gap-1 animate-pulse">
                      <Radio className="w-3 h-3" /> LIVE
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Vote className="w-5 h-5" /> Voter Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Registered Voters</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={registeredVoters}
                      onChange={(e) => setRegisteredVoters(e.target.value)}
                      data-testid="input-registered-voters"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Accredited Voters</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={accreditedVoters}
                      onChange={(e) => setAccreditedVoters(e.target.value)}
                      data-testid="input-accredited-voters"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Vote className="w-5 h-5" /> Enter Vote Counts
                </CardTitle>
                <CardDescription>Enter the number of votes for each candidate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center gap-3" data-testid={`row-candidate-${candidate.id}`}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: candidate.partyColor }}
                    >
                      {candidate.party}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">{candidate.party}</p>
                    </div>
                    <Input
                      type="number"
                      className="w-24 text-right"
                      placeholder="0"
                      min="0"
                      value={votes[candidate.id] || ""}
                      onChange={(e) => setVotes(prev => ({ ...prev, [candidate.id]: e.target.value }))}
                      data-testid={`input-votes-${candidate.id}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total votes entered:</span>
                    <span className="font-bold" data-testid="text-total-entered-votes">
                      {Object.values(votes).reduce((sum, v) => sum + (parseInt(v) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmitResults}
                disabled={isSubmitting}
                data-testid="button-submit-results"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Results"}
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No election assigned to this agent. Contact your coordinator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
