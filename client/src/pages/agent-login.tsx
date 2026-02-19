import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  MapPin,
  Vote,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Radio,
  Loader2,
  Phone,
  FileWarning,
  Camera,
  Navigation,
} from "lucide-react";
import { Link } from "wouter";

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

const SOS_PHONE = "08135566973";

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
  const [activeTab, setActiveTab] = useState("results");

  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");
  const [incidentImages, setIncidentImages] = useState<File[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

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

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}
        );
      }

      fetchIncidents(data.data.agent.agentCode, agentPin.trim());
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLogging(false);
    }
  };

  const fetchIncidents = async (code: string, pin: string) => {
    try {
      const res = await fetch(`/api/agent/my-incidents?agentCode=${code}&agentPin=${pin}`);
      const json = await res.json();
      if (json.success) setIncidents(json.data || []);
    } catch {}
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

  const handleReportIncident = async () => {
    if (!session || !incidentDescription.trim()) {
      toast({ title: "Error", description: "Please describe the incident", variant: "destructive" });
      return;
    }

    setIsReporting(true);
    try {
      const formData = new FormData();
      formData.append("agentCode", session.agent.agentCode);
      formData.append("agentPin", agentPin);
      formData.append("severity", incidentSeverity);
      formData.append("description", incidentDescription);
      if (incidentLocation) formData.append("location", incidentLocation);
      if (geoLocation) {
        formData.append("latitude", geoLocation.lat.toString());
        formData.append("longitude", geoLocation.lng.toString());
      }
      for (const file of incidentImages) {
        formData.append("images", file);
      }

      const response = await fetch("/api/agent/report-incident", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to report");

      toast({ title: "Incident Reported", description: "Your report has been submitted to the command center" });
      setIncidentOpen(false);
      setIncidentDescription("");
      setIncidentLocation("");
      setIncidentSeverity("medium");
      setIncidentImages([]);
      fetchIncidents(session.agent.agentCode, agentPin);
    } catch (error: any) {
      toast({ title: "Report Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsReporting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast({ title: "Location Updated", description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        },
        () => toast({ title: "Error", description: "Could not get location", variant: "destructive" })
      );
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
    setIncidents([]);
    setActiveTab("results");
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

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Contact your coordinator if you need agent credentials
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline" data-testid="link-member-login">
              Back to Member Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const totalVotesSubmitted = Object.values(votes).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-submission-success">Results Submitted</h1>
          <p className="text-muted-foreground">
            Your results for <strong>{session.pollingUnit.name}</strong> have been successfully submitted.
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
              <div className="border-t pt-2 mt-2">
                <p className="font-medium mb-2">Vote Breakdown</p>
                {session.candidates.map((c) => (
                  <div key={c.id} className="flex justify-between items-center" data-testid={`result-party-${c.partyId}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.partyColor }} />
                      <span className="text-muted-foreground">{c.party}</span>
                    </div>
                    <span className="font-mono font-medium">{parseInt(votes[c.id] || "0").toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                  <span>Total</span>
                  <span className="font-mono">{totalVotesSubmitted.toLocaleString()}</span>
                </div>
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
          <a href={`tel:${SOS_PHONE}`} className="block">
            <Button variant="destructive" className="w-full gap-2" data-testid="button-sos-call">
              <Phone className="w-4 h-4" />
              SOS Call Command Center
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const totalEnteredVotes = Object.values(votes).reduce((sum, v) => sum + (parseInt(v) || 0), 0);

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
          <div className="flex items-center gap-1">
            <a href={`tel:${SOS_PHONE}`}>
              <Button variant="destructive" size="icon" data-testid="button-header-sos">
                <Phone className="w-4 h-4" />
              </Button>
            </a>
            <Badge variant={session.agent.status === "checked_in" ? "default" : "secondary"} data-testid="badge-agent-status">
              {session.agent.status === "checked_in" ? "Active" : session.agent.status}
            </Badge>
          </div>
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
            {geoLocation && (
              <p className="text-xs text-muted-foreground">
                GPS: {geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setIncidentOpen(true)}
            data-testid="button-report-incident"
          >
            <FileWarning className="w-4 h-4" />
            Report Incident
          </Button>
          <a href={`tel:${SOS_PHONE}`}>
            <Button variant="outline" className="w-full gap-2 border-destructive text-destructive" data-testid="button-sos-main">
              <Phone className="w-4 h-4" />
              SOS: {SOS_PHONE}
            </Button>
          </a>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="results" className="flex-1" data-testid="tab-results">Results</TabsTrigger>
            <TabsTrigger value="incidents" className="flex-1" data-testid="tab-incidents">
              Incidents {incidents.length > 0 && `(${incidents.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4 mt-4">
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
                    <CardDescription>{session.election.position}</CardDescription>
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
                      <Vote className="w-5 h-5" /> Enter Vote Counts per Party
                    </CardTitle>
                    <CardDescription>Enter the number of votes for each candidate/party</CardDescription>
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
                          {totalEnteredVotes.toLocaleString()}
                        </span>
                      </div>
                      {parseInt(accreditedVoters) > 0 && (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Turnout:</span>
                          <span>{((totalEnteredVotes / parseInt(accreditedVoters)) * 100).toFixed(1)}%</span>
                        </div>
                      )}
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
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4 mt-4">
            <Button className="w-full gap-2" onClick={() => setIncidentOpen(true)} data-testid="button-new-incident">
              <FileWarning className="w-4 h-4" />
              Report New Incident
            </Button>

            {incidents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-muted-foreground">No incidents reported. All clear!</p>
                </CardContent>
              </Card>
            ) : (
              incidents.map((inc: any) => (
                <Card key={inc.id} data-testid={`incident-card-${inc.id}`}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={inc.severity === "high" ? "destructive" : inc.severity === "medium" ? "outline" : "default"}
                      >
                        {inc.severity}
                      </Badge>
                      <Badge variant="secondary">{inc.status}</Badge>
                    </div>
                    <p className="text-sm">{inc.description}</p>
                    {inc.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {inc.location}
                      </p>
                    )}
                    {inc.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(inc.createdAt).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Report Incident
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                <SelectTrigger data-testid="select-incident-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention</SelectItem>
                  <SelectItem value="high">High - Urgent/Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what happened in detail..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                rows={4}
                data-testid="input-incident-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Location Description</Label>
              <Input
                placeholder="e.g., Near polling booth entrance"
                value={incidentLocation}
                onChange={(e) => setIncidentLocation(e.target.value)}
                data-testid="input-incident-location"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleGetLocation} className="gap-1" data-testid="button-get-location">
                <Navigation className="w-3 h-3" />
                Tag GPS Location
              </Button>
              {geoLocation && (
                <span className="text-xs text-muted-foreground">
                  {geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Attach Photos (up to 5)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 5);
                  setIncidentImages(files);
                }}
                data-testid="input-incident-images"
              />
              {incidentImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {incidentImages.length} file(s) selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIncidentOpen(false)} data-testid="button-cancel-incident">
              Cancel
            </Button>
            <Button
              onClick={handleReportIncident}
              disabled={isReporting || !incidentDescription.trim()}
              data-testid="button-submit-incident"
            >
              {isReporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isReporting ? "Reporting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
