import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Copy, Trash2, BarChart3, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const electionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  position: z.string().min(3, "Position is required"),
  startDate: z.string(),
  endDate: z.string(),
});

const candidateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  manifesto: z.string().min(10, "Manifesto must be at least 10 characters"),
  experience: z.string().min(10, "Experience must be at least 10 characters"),
});

export default function AdminElections() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<any>(null);

  const { data: electionsData, isLoading } = useQuery({
    queryKey: ["/api/elections"],
  });

  const form = useForm({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      title: "",
      description: "",
      position: "",
      startDate: "",
      endDate: "",
    },
  });

  const candidateForm = useForm({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      name: "",
      manifesto: "",
      experience: "",
    },
  });

  const createElectionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/elections", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      toast({ title: "Success", description: "Election created successfully" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create election", variant: "destructive" });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/elections/${selectedElection?.id}/candidates`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      toast({ title: "Success", description: "Candidate added successfully" });
      setCandidateDialogOpen(false);
      candidateForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add candidate", variant: "destructive" });
    },
  });

  const deleteElectionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/elections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      toast({ title: "Success", description: "Election deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete election", variant: "destructive" });
    },
  });

  const elections = electionsData?.data || [];
  const filteredElections = elections.filter((e: any) => 
    statusFilter === "all" || e.status === statusFilter
  );

  const exportResults = (election: any) => {
    toast({ title: "Info", description: "Exporting election results..." });
  };

  const cloneElection = (election: any) => {
    form.setValue("title", `${election.title} (Copy)`);
    form.setValue("description", election.description);
    form.setValue("position", election.position);
    setCreateDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading elections...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Elections' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-elections-title">Elections Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage elections</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-election">
          <Plus className="h-4 w-4 mr-2" />
          Create Election
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Elections</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredElections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No elections found
            </CardContent>
          </Card>
        ) : (
          filteredElections.map((election: any) => (
            <Card key={election.id} data-testid={`election-card-${election.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{election.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{election.position}</p>
                  </div>
                  <Badge 
                    variant={election.status === 'ongoing' ? 'default' : election.status === 'upcoming' ? 'secondary' : 'outline'}
                  >
                    {election.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">{election.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Start: {new Date(election.startDate).toLocaleDateString()}</span>
                    <span>End: {new Date(election.endDate).toLocaleDateString()}</span>
                    <span>Votes: {election.totalVotes || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedElection(election);
                        setCandidateDialogOpen(true);
                      }}
                      data-testid={`button-add-candidate-${election.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Candidate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportResults(election)}
                      data-testid={`button-export-${election.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => cloneElection(election)}
                      data-testid={`button-clone-${election.id}`}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Clone
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteElectionMutation.mutate(election.id)}
                      data-testid={`button-delete-${election.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-election">
          <DialogHeader>
            <DialogTitle>Create New Election</DialogTitle>
            <DialogDescription>Set up a new election for members to vote</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createElectionMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Election title" data-testid="input-election-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., State Chairman" data-testid="input-election-position" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Election description" rows={3} data-testid="input-election-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-election-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-election-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-election">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-election">Create Election</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={candidateDialogOpen} onOpenChange={setCandidateDialogOpen}>
        <DialogContent data-testid="dialog-add-candidate">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
            <DialogDescription>Add a new candidate to {selectedElection?.title}</DialogDescription>
          </DialogHeader>
          <Form {...candidateForm}>
            <form onSubmit={candidateForm.handleSubmit((data) => addCandidateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={candidateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" data-testid="input-candidate-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={candidateForm.control}
                name="manifesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manifesto</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Campaign manifesto" rows={3} data-testid="input-candidate-manifesto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={candidateForm.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Political experience" rows={3} data-testid="input-candidate-experience" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCandidateDialogOpen(false)} data-testid="button-cancel-candidate">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-candidate">Add Candidate</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
