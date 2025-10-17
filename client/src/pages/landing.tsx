import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Vote, 
  BookOpen, 
  Users, 
  Megaphone, 
  Monitor, 
  Trophy, 
  IdCard, 
  Smartphone,
  Calendar,
  MapPin,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import heroImage from "@assets/generated_images/APC_youth_rally_hero_f3829ce8.png";
import type { NewsPost, Event } from "@shared/schema";

interface AnalyticsOverview {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  totalElections: number;
  totalVotes: number;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Landing() {
  // Fetch public analytics for landing page
  const { data: analyticsData } = useQuery<{ success: boolean; data: AnalyticsOverview }>({
    queryKey: ["/api/analytics/public-overview"],
    retry: false
  });

  // Fetch news
  const { data: newsData, isLoading: isLoadingNews } = useQuery<{
    success: boolean;
    data: (NewsPost & { author: any })[];
  }>({
    queryKey: ["/api/news"],
  });

  // Fetch events
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<{
    success: boolean;
    data: Event[];
  }>({
    queryKey: ["/api/events"],
  });

  const analytics = analyticsData?.data;
  const news = newsData?.data?.slice(0, 3) || [];
  const allEvents = eventsData?.data || [];
  const now = new Date();
  const upcomingEvents = allEvents.filter(e => new Date(e.date) > now).slice(0, 4);

  // Features data
  const features = [
    {
      icon: Vote,
      title: "Electronic Primaries & Voting",
      description: "Secure, transparent digital voting system for party primaries with blockchain verification"
    },
    {
      icon: BookOpen,
      title: "Political Literacy Hub",
      description: "Educational resources, quizzes, and content to enhance political knowledge"
    },
    {
      icon: Users,
      title: "Volunteer Marketplace",
      description: "Connect with volunteer opportunities and contribute to party activities"
    },
    {
      icon: Megaphone,
      title: "Issue Campaigns",
      description: "Create and support campaigns on issues that matter to your community"
    },
    {
      icon: Monitor,
      title: "Real-time Election Monitoring",
      description: "Track polling units and report incidents during elections"
    },
    {
      icon: Trophy,
      title: "Gamification & Leaderboards",
      description: "Earn points, badges, and recognition for your political engagement"
    },
    {
      icon: IdCard,
      title: "Membership Management",
      description: "Digital membership cards, dues payment, and NIN verification"
    },
    {
      icon: Smartphone,
      title: "Mobile-First PWA",
      description: "Progressive web app that works offline and installs on any device"
    }
  ];

  // How it works steps
  const steps = [
    {
      number: "01",
      title: "Register & Verify NIN",
      description: "Create your account and verify your National Identification Number for secure membership"
    },
    {
      number: "02",
      title: "Join Your Ward",
      description: "Connect with your local ward and become part of your community's political voice"
    },
    {
      number: "03",
      title: "Participate & Engage",
      description: "Vote in primaries, attend events, complete tasks, and engage with campaigns"
    },
    {
      number: "04",
      title: "Earn Points & Badges",
      description: "Build your reputation through active participation and climb the leaderboards"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.5)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-5xl md:text-7xl font-black text-white mb-6 tracking-tight" data-testid="text-hero-title">
              Modernize Nigerian Politics with APC Connect
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Empowering youth engagement, enabling transparent governance, and revolutionizing political participation across Nigeria
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 border border-primary-border"
                  data-testid="button-join-apc"
                >
                  Join APC
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                  data-testid="button-login"
                >
                  Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 
              className="font-display text-4xl md:text-5xl font-bold text-center mb-12"
              variants={fadeIn}
              data-testid="text-stats-title"
            >
              Platform Impact
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div variants={fadeIn}>
                <Card className="hover-elevate" data-testid="card-stat-members">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold text-primary" data-testid="text-total-members">
                      {analytics?.totalMembers?.toLocaleString() || "10,000+"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={fadeIn}>
                <Card className="hover-elevate" data-testid="card-stat-elections">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Active Elections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold text-primary" data-testid="text-active-elections">
                      {analytics?.totalElections?.toLocaleString() || "12"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="hover-elevate" data-testid="card-stat-events">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Upcoming Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold text-primary" data-testid="text-upcoming-events">
                      {analytics?.totalEvents?.toLocaleString() || upcomingEvents.length.toString()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="hover-elevate" data-testid="card-stat-news">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">News Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-mono font-bold text-primary" data-testid="text-news-articles">
                      {news.length > 0 ? news.length.toString() : "50+"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 
              className="font-display text-4xl md:text-5xl font-bold text-center mb-4"
              variants={fadeIn}
              data-testid="text-features-title"
            >
              Platform Features
            </motion.h2>
            <motion.p 
              className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto"
              variants={fadeIn}
            >
              Everything you need to participate in modern democratic processes
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="h-full hover-elevate" data-testid={`card-feature-${index}`}>
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recent News */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <div className="flex items-center justify-between mb-12">
              <motion.h2 
                className="font-display text-4xl md:text-5xl font-bold"
                variants={fadeIn}
                data-testid="text-news-title"
              >
                Latest News
              </motion.h2>
              <Link href="/login">
                <Button variant="ghost" data-testid="button-view-all-news">
                  View All News
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoadingNews ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : news.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((post, index) => (
                  <motion.div key={post.id} variants={fadeIn}>
                    <Card className="h-full hover-elevate overflow-hidden" data-testid={`card-news-${index}`}>
                      {post.imageUrl && (
                        <div className="h-48 bg-muted overflow-hidden">
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <Badge className="w-fit mb-2">{post.category}</Badge>
                        <CardTitle className="text-xl line-clamp-2">{post.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{post.likes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.comments || 0}</span>
                          </div>
                          {post.publishedAt && (
                            <span className="ml-auto">
                              {new Date(post.publishedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No news available</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <div className="flex items-center justify-between mb-12">
              <motion.h2 
                className="font-display text-4xl md:text-5xl font-bold"
                variants={fadeIn}
                data-testid="text-events-title"
              >
                Upcoming Events
              </motion.h2>
              <Link href="/login">
                <Button variant="ghost" data-testid="button-view-all-events">
                  View All Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-56" />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {upcomingEvents.map((event, index) => (
                  <motion.div key={event.id} variants={fadeIn}>
                    <Card className="h-full hover-elevate" data-testid={`card-event-${index}`}>
                      <CardHeader>
                        <Badge className="w-fit mb-2">{event.category}</Badge>
                        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{event.location}</span>
                        </div>
                        {event.maxAttendees && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{event.maxAttendees} max attendees</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No upcoming events</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 
              className="font-display text-4xl md:text-5xl font-bold text-center mb-4"
              variants={fadeIn}
              data-testid="text-how-it-works-title"
            >
              How It Works
            </motion.h2>
            <motion.p 
              className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto"
              variants={fadeIn}
            >
              Get started with APC Connect in four simple steps
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div 
                  key={index}
                  className="relative"
                  variants={fadeIn}
                  data-testid={`step-${index}`}
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                      <span className="text-3xl font-bold font-mono text-primary">{step.number}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-border -z-10" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-4xl md:text-6xl font-black mb-6" data-testid="text-cta-title">
              Ready to Transform Nigerian Politics?
            </h2>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Join 10,000+ members nationwide
            </p>
            <Link href="/register">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6"
                data-testid="button-join-today"
              >
                Join APC Connect Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-display font-bold text-lg mb-4">APC Connect</h3>
              <p className="text-muted-foreground text-sm">
                Modernizing Nigerian politics through digital engagement and transparent governance.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Elections</a></li>
                <li><a href="#" className="hover:text-foreground">Events</a></li>
                <li><a href="#" className="hover:text-foreground">News</a></li>
                <li><a href="#" className="hover:text-foreground">Volunteer</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About APC</a></li>
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="YouTube">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 APC Connect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
