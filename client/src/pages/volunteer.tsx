import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { VolunteerTaskCard } from "@/components/volunteer-task-card";
import { NigeriaMap } from "@/components/nigeria-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, MapPin, X } from "lucide-react";
import type { VolunteerTask } from "@shared/schema";
import { format } from "date-fns";

export default function Volunteer() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const { data: tasksData, isLoading } = useQuery<{
    success: boolean;
    data: VolunteerTask[];
  }>({
    queryKey: ["/api/tasks"],
  });

  const applyMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/apply`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Application failed",
        description: error?.message || "You may have already applied for this task.",
        variant: "destructive",
      });
    },
  });

  const availableTasks = tasksData?.data?.filter(t => t.status === "open") || [];
  const myTasks = tasksData?.data?.filter(t => t.status === "in-progress") || [];
  
  let filteredAvailableTasks = availableTasks.filter(
    task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedState) {
    filteredAvailableTasks = filteredAvailableTasks.filter(
      task => task.location.toLowerCase().includes(selectedState.toLowerCase())
    );
  }

  const handleStateClick = (stateId: string, stateName: string) => {
    setSelectedState(stateName);
  };

  const clearStateFilter = () => {
    setSelectedState(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Volunteer Marketplace</h1>
        <p className="text-muted-foreground">
          Find volunteer opportunities, contribute your skills, and earn rewards
        </p>
      </div>

      {/* Volunteer Opportunities Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Opportunities by State</CardTitle>
              <CardDescription>Click on a state to find volunteer opportunities in that location</CardDescription>
            </div>
            {selectedState && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearStateFilter}
                data-testid="button-clear-state-filter"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter: {selectedState}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <NigeriaMap 
            mode="events" 
            showLegend={true}
            onStateClick={handleStateClick}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-volunteer">
          <TabsTrigger value="available" data-testid="tab-available">Available Tasks</TabsTrigger>
          <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">My Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by skill, location, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tasks"
              />
            </div>

            {selectedState && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Showing opportunities in {selectedState}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearStateFilter}
                  className="h-auto p-1"
                  data-testid="button-clear-location-filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {filteredAvailableTasks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No tasks found matching your search." : "No available tasks at the moment."}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredAvailableTasks.map((task) => (
                <VolunteerTaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  location={task.location}
                  skills={task.skills || []}
                  points={task.points}
                  deadline={task.deadline ? format(new Date(task.deadline), "MMM dd, yyyy") : undefined}
                  difficulty={task.difficulty}
                  onApply={() => applyMutation.mutate(task.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tasks" className="mt-6">
          {myTasks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {myTasks.map((task) => (
                <VolunteerTaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  location={task.location}
                  skills={task.skills || []}
                  points={task.points}
                  deadline={task.deadline ? format(new Date(task.deadline), "MMM dd, yyyy") : undefined}
                  difficulty={task.difficulty}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't applied for any tasks yet.</p>
              <Button data-testid="button-browse-tasks">Browse Available Tasks</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
