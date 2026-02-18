import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, MapPin, Vote, Send, CheckCircle, AlertTriangle,
  ArrowLeft, Radio, Loader2, Camera, FileImage, Upload, Trash2,
  ChevronRight, Clock, Ban
} from "lucide-react";

type ElectionData = {
  id: string;
  title: string;
  position: string;
  status: string;
  electionDate: string;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    partyColor: string;
    partyId: string;
    partyName: string;
  }>;
  submittedResults: Array<{
    candidateId: string;
    partyId: string;
    votes: number;
    isVerified: boolean;
  }>;
  registeredVoters: number;
  accreditedVoters: number;
  hasResults: boolean;
  resultSheets: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    isVerified: boolean;
    uploadedAt: string;
  }>;
};

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
  elections: ElectionData[];
};

export default function AgentLogin() {
  const { toast } = useToast();
  const [agentCode, setAgentCode] = useState("");
  const [agentPin, setAgentPin] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [activeElectionId, setActiveElectionId] = useState<string>("");
  const [votes, setVotes] = useState<Record<string, Record<string, string>>>({});
  const [voterInfo, setVoterInfo] = useState<Record<string, { registered: string; accredited: string }>>({});
  const [submittedElections, setSubmittedElections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: edmData, isLoading: edmLoading } = useQuery({
    queryKey: ["/api/election-day-mode"],
  });
  const isEdmActive = edmData?.data?.isActive === true;

  const activeElection = session?.elections.find(e => e.id === activeElectionId);
  const completedCount = submittedElections.size;
  const totalElections = session?.elections.length || 0;

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

      const sessionData = data.data;
      setSession(sessionData);

      if (sessionData.elections.length > 0) {
        setActiveElectionId(sessionData.elections[0].id);
      }

      const alreadySubmitted = new Set<string>();
      const prefillVotes: Record<string, Record<string, string>> = {};
      const prefillVoterInfo: Record<string, { registered: string; accredited: string }> = {};

      sessionData.elections.forEach((el: ElectionData) => {
        if (el.hasResults) {
          alreadySubmitted.add(el.id);
          const elVotes: Record<string, string> = {};
          el.submittedResults.forEach((r: any) => {
            elVotes[r.candidateId] = String(r.votes);
          });
          prefillVotes[el.id] = elVotes;
        }
        prefillVoterInfo[el.id] = {
          registered: el.registeredVoters ? String(el.registeredVoters) : "",
          accredited: el.accreditedVoters ? String(el.accreditedVoters) : "",
        };
      });

      setSubmittedElections(alreadySubmitted);
      setVotes(prefillVotes);
      setVoterInfo(prefillVoterInfo);

      toast({ title: "Logged In", description: `Welcome, ${sessionData.agent.memberName}` });
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLogging(false);
    }
  };

  const handleSubmitElection = async (electionId: string) => {
    if (!session) return;

    const election = session.elections.find(e => e.id === electionId);
    if (!election) return;

    const elVotes = votes[electionId] || {};
    const results = election.candidates.map(c => ({
      candidateId: c.id,
      partyId: c.partyId,
      votes: parseInt(elVotes[c.id] || "0"),
    }));

    const hasInvalid = results.some(r => isNaN(r.votes) || r.votes < 0);
    if (hasInvalid) {
      toast({ title: "Error", description: "Vote counts must be zero or positive numbers", variant: "destructive" });
      return;
    }

    const hasVotes = results.some(r => r.votes > 0);
    if (!hasVotes) {
      toast({ title: "Error", description: "Please enter vote counts for at least one party", variant: "destructive" });
      return;
    }

    const vi = voterInfo[electionId] || { registered: "", accredited: "" };
    const regVoters = vi.registered ? parseInt(vi.registered) : 0;
    const accVoters = vi.accredited ? parseInt(vi.accredited) : 0;

    if (regVoters > 0 && accVoters > regVoters) {
      toast({ title: "Warning", description: "Accredited voters exceeds registered voters", variant: "destructive" });
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
          electionId,
          pollingUnitId: session.pollingUnit.id,
          results,
          registeredVoters: vi.registered || undefined,
          accreditedVoters: vi.accredited || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");

      const updatedSubmitted = new Set(Array.from(submittedElections));
      updatedSubmitted.add(electionId);
      setSubmittedElections(updatedSubmitted);
      toast({ title: "Results Submitted", description: `${election.title} - ${data.data.submitted} results recorded` });

      const nextUnsubmitted = session.elections.find(
        e => e.id !== electionId && !updatedSubmitted.has(e.id)
      );
      if (nextUnsubmitted) {
        setActiveElectionId(nextUnsubmitted.id);
      }
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadResultSheet = async (electionId: string, file: File) => {
    if (!session) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("agentCode", session.agent.agentCode);
      formData.append("agentPin", agentPin);
      formData.append("electionId", electionId);
      formData.append("pollingUnitId", session.pollingUnit.id);
      formData.append("resultSheet", file);

      const response = await fetch("/api/agent/upload-result-sheet", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      const election = session.elections.find(e => e.id === electionId);
      if (election) {
        const updatedElections = session.elections.map(e =>
          e.id === electionId
            ? {
                ...e,
                resultSheets: [...e.resultSheets, {
                  id: data.data?.id || `sheet-${Date.now()}`,
                  fileUrl: URL.createObjectURL(file),
                  fileName: data.data?.fileName || file.name,
                  isVerified: false,
                  uploadedAt: data.data?.uploadedAt || new Date().toISOString(),
                }],
              }
            : e
        );
        setSession({ ...session, elections: updatedElections });
      }

      toast({ title: "Result Sheet Uploaded", description: `${file.name} uploaded successfully` });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!session) return;

    const unsubmitted = session.elections.filter(e => !submittedElections.has(e.id));
    const submissions = unsubmitted
      .filter(el => {
        const elVotes = votes[el.id] || {};
        return el.candidates.some(c => parseInt(elVotes[c.id] || "0") > 0);
      })
      .map(el => {
        const elVotes = votes[el.id] || {};
        const vi = voterInfo[el.id] || { registered: "", accredited: "" };
        const results = el.candidates.map(c => ({
          candidateId: c.id,
          partyId: c.partyId,
          votes: parseInt(elVotes[c.id] || "0"),
        }));
        const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
        const accVoters = parseInt(vi.accredited || "0");
        if (accVoters > 0 && totalVotes > accVoters) {
          toast({ title: "Warning", description: `${el.title}: Total votes (${totalVotes}) exceed accredited voters (${accVoters}). Please verify.`, variant: "destructive" });
        }
        return {
          electionId: el.id,
          results,
          registeredVoters: vi.registered || undefined,
          accreditedVoters: vi.accredited || undefined,
        };
      });

    if (submissions.length === 0) {
      toast({ title: "Nothing to Submit", description: "Enter votes for at least one election first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agent/submit-results-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentCode: session.agent.agentCode,
          agentPin: agentPin,
          pollingUnitId: session.pollingUnit.id,
          submissions,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Batch submission failed");

      const newSubmitted = new Set(Array.from(submittedElections));
      submissions.forEach(s => newSubmitted.add(s.electionId));
      setSubmittedElections(newSubmitted);

      toast({
        title: "All Results Submitted",
        description: `${data.data.totalElections} election(s) submitted successfully`,
      });
    } catch (error: any) {
      toast({ title: "Batch Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setAgentCode("");
    setAgentPin("");
    setVotes({});
    setVoterInfo({});
    setSubmittedElections(new Set());
    setActiveElectionId("");
  };

  if (edmLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Checking election status...</p>
      </div>
    );
  }

  if (!isEdmActive && !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Ban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-edm-inactive-title">Election Day Not Active</h1>
          <p className="text-sm text-muted-foreground">
            The polling agent portal is currently closed. It will be available once Election Day Mode is activated by an administrator.
          </p>
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              If you believe this is an error, contact your coordinator or party administrator.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

  const allSubmitted = totalElections > 0 && completedCount === totalElections;

  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-submission-success">All Results Submitted</h1>
          <p className="text-muted-foreground">
            Results for all {totalElections} election(s) at <strong>{session.pollingUnit.name}</strong> have been successfully submitted.
          </p>
          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between flex-wrap gap-1">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-medium">{session.agent.memberName}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-1">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{session.pollingUnit.unitCode}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-1">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{session.location.ward}, {session.location.lga}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-1">
                <span className="text-muted-foreground">Elections</span>
                <span className="font-medium">{completedCount} / {totalElections}</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {
              setSubmittedElections(new Set());
              if (session.elections.length > 0) setActiveElectionId(session.elections[0].id);
            }} data-testid="button-update-results">
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
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
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

      <div className="max-w-2xl mx-auto p-4 space-y-4">
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
          <CardContent className="text-sm space-y-2">
            <div className="flex gap-4 text-muted-foreground flex-wrap">
              <span>{session.location.ward}</span>
              <span>{session.location.lga}</span>
              <span>{session.location.state}</span>
            </div>
            {totalElections > 0 && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completedCount} / {totalElections} elections</span>
                </div>
                <Progress value={(completedCount / totalElections) * 100} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {session.elections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No active elections found. Contact your coordinator.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={activeElectionId} onValueChange={setActiveElectionId}>
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                {session.elections.map((el) => (
                  <TabsTrigger
                    key={el.id}
                    value={el.id}
                    className="text-xs flex items-center gap-1 flex-1 min-w-0"
                    data-testid={`tab-election-${el.id}`}
                  >
                    {submittedElections.has(el.id) && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    <span className="truncate">{el.title.replace(/^2026\s+/, "").replace(/\s+Area Council\s+Chairmanship$/, "")}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {session.elections.map((election) => {
                const elVotes = votes[election.id] || {};
                const vi = voterInfo[election.id] || { registered: "", accredited: "" };
                const isElSubmitted = submittedElections.has(election.id);

                return (
                  <TabsContent key={election.id} value={election.id} className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-base" data-testid={`text-election-title-${election.id}`}>
                            {election.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {isElSubmitted && (
                              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                <CheckCircle className="w-3 h-3" /> Submitted
                              </Badge>
                            )}
                            {election.status === "ongoing" && (
                              <Badge variant="destructive" className="gap-1 animate-pulse">
                                <Radio className="w-3 h-3" /> LIVE
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {election.position.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          {election.electionDate && ` - ${new Date(election.electionDate).toLocaleDateString()}`}
                        </CardDescription>
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
                              value={vi.registered}
                              onChange={(e) => setVoterInfo(prev => ({
                                ...prev,
                                [election.id]: { ...prev[election.id], registered: e.target.value }
                              }))}
                              data-testid={`input-registered-voters-${election.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Accredited Voters</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={vi.accredited}
                              onChange={(e) => setVoterInfo(prev => ({
                                ...prev,
                                [election.id]: { ...prev[election.id], accredited: e.target.value }
                              }))}
                              data-testid={`input-accredited-voters-${election.id}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Vote className="w-5 h-5" /> Party Vote Counts
                        </CardTitle>
                        <CardDescription>Enter the number of votes for each party/candidate</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {election.candidates.map((candidate) => {
                          const existingResult = election.submittedResults.find(r => r.candidateId === candidate.id);
                          return (
                            <div key={candidate.id} className="flex items-center gap-3" data-testid={`row-candidate-${candidate.id}`}>
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: candidate.partyColor }}
                              >
                                {candidate.party}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{candidate.name}</p>
                                <p className="text-xs text-muted-foreground">{candidate.partyName || candidate.party}</p>
                              </div>
                              {existingResult?.isVerified && (
                                <Badge variant="outline" className="text-green-600 border-green-600 text-xs flex-shrink-0">
                                  Verified
                                </Badge>
                              )}
                              <Input
                                type="number"
                                className="w-24 text-right"
                                placeholder="0"
                                min="0"
                                value={elVotes[candidate.id] || ""}
                                onChange={(e) => setVotes(prev => ({
                                  ...prev,
                                  [election.id]: { ...(prev[election.id] || {}), [candidate.id]: e.target.value }
                                }))}
                                data-testid={`input-votes-${candidate.id}`}
                              />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="py-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total votes entered:</span>
                          <span className="font-bold" data-testid={`text-total-votes-${election.id}`}>
                            {Object.values(elVotes).reduce((sum, v) => sum + (parseInt(v) || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileImage className="w-5 h-5" /> Result Sheet Photo
                        </CardTitle>
                        <CardDescription>Upload a photo of the official INEC result sheet</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {election.resultSheets.length > 0 && (
                          <div className="space-y-2">
                            {election.resultSheets.map((rs, idx) => (
                              <div key={rs.id || idx} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileImage className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate">{rs.fileName}</span>
                                </div>
                                {rs.isVerified ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs flex-shrink-0">Verified</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">Pending</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadResultSheet(election.id, file);
                            e.target.value = "";
                          }}
                          data-testid={`input-result-sheet-${election.id}`}
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid={`button-upload-result-sheet-${election.id}`}
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 mr-2" />
                          )}
                          {isUploading ? "Uploading..." : "Take Photo / Upload"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleSubmitElection(election.id)}
                      disabled={isSubmitting}
                      data-testid={`button-submit-election-${election.id}`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {isSubmitting ? "Submitting..." : isElSubmitted ? "Update Results" : "Submit Results"}
                    </Button>
                  </TabsContent>
                );
              })}
            </Tabs>

            {totalElections > 1 && (
              <Card>
                <CardContent className="py-4">
                  <Button
                    className="w-full"
                    size="lg"
                    variant="default"
                    onClick={handleSubmitAll}
                    disabled={isSubmitting || completedCount === totalElections}
                    data-testid="button-submit-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit All Remaining Elections ({totalElections - completedCount} left)
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
