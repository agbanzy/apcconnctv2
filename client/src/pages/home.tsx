import { StatsCard } from "@/components/stats-card";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import { MicroTaskCard } from "@/components/micro-task-card";
import { Users, Vote, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/APC_youth_rally_hero_f3829ce8.png";

export default function Home() {
  //todo: remove mock functionality - Replace with real API data
  const mockNews = [
    {
      id: "1",
      title: "APC Youth Wing Launches Digital Membership Drive",
      excerpt: "The All Progressives Congress youth wing announces a comprehensive digital campaign targeting young Nigerians across all 36 states.",
      category: "Membership",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      imageUrl: heroImage,
      likes: 324,
      comments: 45,
    },
    {
      id: "2",
      title: "Electronic Primaries Set for June 2024",
      excerpt: "Party leadership confirms blockchain-secured electronic primaries will be held across all states with real-time transparency.",
      category: "Elections",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      likes: 567,
      comments: 89,
    },
  ];

  const mockEvents = [
    {
      id: "1",
      title: "National Youth Summit 2024",
      description: "Join thousands of young party members for policy discussions, networking, and skills training.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: "International Conference Center, Abuja",
      attendees: 2340,
      maxAttendees: 5000,
      category: "Summit",
    },
  ];

  const mockTasks = [
    {
      id: "1",
      title: "Share APC Connect on Social Media",
      description: "Share the app on your platforms and earn points.",
      points: 25,
      timeEstimate: "5 minutes",
      category: "Social Sharing",
    },
    {
      id: "2",
      title: "Complete Your Profile",
      description: "Add your skills and interests to get matched with relevant opportunities.",
      points: 50,
      timeEstimate: "10 minutes",
      category: "Profile",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div
        className="relative h-[50vh] rounded-lg overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="font-display text-4xl md:text-6xl font-black text-white mb-4" data-testid="text-hero-title">
            MODERNIZING NIGERIAN POLITICS
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl">
            Join APC Connect - The digital platform empowering youth, enabling transparent governance, and revolutionizing political engagement across Nigeria.
          </p>
          <div className="flex gap-4">
            <Button size="lg" variant="default" data-testid="button-get-started">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Platform Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Members"
            value="12,458"
            change={15.2}
            icon={Users}
          />
          <StatsCard
            title="Active Volunteers"
            value="3,234"
            change={23.5}
            icon={Users}
          />
          <StatsCard
            title="Upcoming Events"
            value="47"
            change={8.3}
            icon={Calendar}
          />
          <StatsCard
            title="Votes Cast (Primaries)"
            value="8,901"
            change={42.1}
            icon={Vote}
          />
        </div>
      </div>

      {/* Quick Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Quick Tasks</h2>
          <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
            View All
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {mockTasks.map((task) => (
            <MicroTaskCard key={task.id} {...task} />
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Latest News</h2>
          <Button variant="ghost" size="sm" data-testid="button-view-all-news">
            View All
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {mockNews.map((news) => (
            <NewsCard key={news.id} {...news} />
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">Upcoming Events</h2>
          <Button variant="ghost" size="sm" data-testid="button-view-all-events">
            View All
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </div>
    </div>
  );
}
