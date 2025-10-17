import { QuizCard } from "@/components/quiz-card";
import { IssueCampaignCard } from "@/components/issue-campaign-card";
import { LeaderboardItem } from "@/components/leaderboard-item";
import { BadgeDisplay } from "@/components/badge-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function Engage() {
  //todo: remove mock functionality
  const quizzes = [
    {
      question: "What is the primary focus of APC's youth employment initiative?",
      options: [
        "Skill acquisition and entrepreneurship training",
        "Government job placement only",
        "Financial loans without training",
        "Overseas employment programs"
      ],
      correctAnswer: 0,
      category: "Party Manifesto",
      points: 50,
    },
  ];

  const campaigns = [
    {
      title: "Youth Employment Initiative in Kano State",
      description: "Proposal to establish skill acquisition centers in all 44 LGAs, focusing on technology, agriculture, and entrepreneurship.",
      author: "Ibrahim Mohammed",
      category: "Employment",
      votes: 1847,
      targetVotes: 5000,
      comments: 123,
      status: "active" as const,
    },
    {
      title: "Free Education for Primary Schools",
      description: "Implementation of completely free education including books and uniforms for all primary school students across the state.",
      author: "Ngozi Okonkwo",
      category: "Education",
      votes: 3421,
      targetVotes: 5000,
      comments: 234,
      status: "approved" as const,
    },
  ];

  const leaderboard = [
    { rank: 1, name: "Ibrahim Mohammed", points: 3850, ward: "Ward 7, Kano Municipal" },
    { rank: 2, name: "Chioma Okafor", points: 3420, ward: "Ward 3, Ikeja" },
    { rank: 3, name: "Adebayo Johnson", points: 2890, ward: "Ward 5, Lagos Island", isCurrentUser: true },
    { rank: 4, name: "Fatima Ahmed", points: 2456, ward: "Ward 12, Abuja Municipal" },
    { rank: 5, name: "Emeka Nwankwo", points: 2103, ward: "Ward 8, Port Harcourt" },
  ];

  const badges = [
    {
      id: "grassroots-champion",
      name: "Grassroots Champion",
      description: "Complete 10 ward-level activities",
      icon: "grassroots" as const,
      earned: true,
      earnedDate: "Feb 15, 2024",
    },
    {
      id: "voter-mobilizer",
      name: "Voter Mobilizer",
      description: "Register 50+ new voters",
      icon: "voter" as const,
      earned: true,
      earnedDate: "Mar 1, 2024",
    },
    {
      id: "party-champion",
      name: "Party Champion",
      description: "Achieve top ranking in state",
      icon: "champion" as const,
      earned: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Engage & Learn</h1>
        <p className="text-muted-foreground">
          Participate in political literacy, support campaigns, and compete on the leaderboard
        </p>
      </div>

      <Tabs defaultValue="literacy" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-engage">
          <TabsTrigger value="literacy" data-testid="tab-literacy">Political Literacy</TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Issue Campaigns</TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="badges" data-testid="tab-badges">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="literacy" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Test Your Knowledge</h2>
            <Button variant="outline" size="sm" data-testid="button-view-all-quizzes">
              View All Quizzes
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {quizzes.map((quiz, idx) => (
              <QuizCard key={idx} {...quiz} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Active Campaigns</h2>
            <Button size="sm" data-testid="button-create-campaign">
              Create Campaign
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {campaigns.map((campaign, idx) => (
              <IssueCampaignCard key={idx} {...campaign} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6 mt-6">
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Top Contributors</h2>
            <div className="space-y-3">
              {leaderboard.map((item) => (
                <LeaderboardItem key={item.rank} {...item} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          <BadgeDisplay badges={badges} totalPoints={2890} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
