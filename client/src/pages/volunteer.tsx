import { VolunteerTaskCard } from "@/components/volunteer-task-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Volunteer() {
  //todo: remove mock functionality
  const availableTasks = [
    {
      id: "1",
      title: "Design Campaign Flyers for Lagos Rally",
      description: "Create visually appealing campaign materials for our upcoming youth rally. Must follow APC brand guidelines.",
      location: "Remote",
      skills: ["Graphic Design", "Adobe Photoshop"],
      points: 250,
      deadline: "March 25, 2024",
      difficulty: "Medium" as const,
    },
    {
      id: "2",
      title: "Door-to-Door Canvassing - Ikeja",
      description: "Join our team for voter registration drive in Ikeja. Training provided on-site.",
      location: "Ikeja, Lagos",
      skills: ["Communication", "Public Speaking"],
      points: 500,
      deadline: "March 30, 2024",
      difficulty: "Easy" as const,
    },
    {
      id: "3",
      title: "Social Media Content Creator",
      description: "Create engaging social media content to promote APC initiatives and policies to young Nigerians.",
      location: "Remote",
      skills: ["Content Writing", "Social Media", "Video Editing"],
      points: 350,
      deadline: "April 5, 2024",
      difficulty: "Medium" as const,
    },
    {
      id: "4",
      title: "Event Coordinator - Youth Summit",
      description: "Help coordinate logistics for the National Youth Summit in Abuja. Experience in event management preferred.",
      location: "Abuja",
      skills: ["Event Management", "Logistics", "Leadership"],
      points: 800,
      deadline: "April 10, 2024",
      difficulty: "Hard" as const,
    },
  ];

  const myTasks = [
    {
      id: "5",
      title: "Website Translation to Hausa",
      description: "Translate key website pages from English to Hausa for better accessibility.",
      location: "Remote",
      skills: ["Translation", "Hausa Language"],
      points: 400,
      difficulty: "Medium" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Volunteer Marketplace</h1>
        <p className="text-muted-foreground">
          Find volunteer opportunities, contribute your skills, and earn rewards
        </p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-volunteer">
          <TabsTrigger value="available" data-testid="tab-available">Available Tasks</TabsTrigger>
          <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">My Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by skill, location, or keyword..."
              className="pl-10"
              data-testid="input-search-tasks"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {availableTasks.map((task) => (
              <VolunteerTaskCard key={task.id} {...task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-tasks" className="mt-6">
          {myTasks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {myTasks.map((task) => (
                <VolunteerTaskCard key={task.id} {...task} />
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
