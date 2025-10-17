import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { 
  UserPlus, 
  Scale, 
  Megaphone, 
  ClipboardCheck, 
  GraduationCap,
  Calendar,
  MapPin,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  Quote,
  Download,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Target,
  Award,
  Lightbulb,
  Activity,
  Globe
} from "lucide-react";
import { FaTwitter, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NigeriaMap } from "@/components/nigeria-map";
import heroImage from "@assets/generated_images/APC_youth_rally_hero_f3829ce8.png";
import type { NewsPost, Event, Member, IssueCampaign, Idea, State } from "@shared/schema";

interface AnalyticsOverview {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalElections: number;
  totalVotes: number;
  activeCampaigns: number;
  totalIdeas: number;
  statesWithPresence: number;
  wardsCovered: number;
  totalEngagementPoints: number;
}

interface RecentActivity {
  recentMembers: (Member & { user: any; ward: any })[];
  upcomingEvents: (Event & { state: State | null })[];
  popularCampaigns: (IssueCampaign & { author: any })[];
  trendingIdeas: (Idea & { author: any })[];
}

interface StateStats {
  state: State;
  memberCount: number;
  activeMembers: number;
  upcomingEvents: number;
  activeCampaigns: number;
  lgasCovered: number;
  wardsCovered: number;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6 }
};

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const duration = 2000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function FloatingBadge({ icon: Icon, text, delay }: { icon: any; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="absolute hidden lg:flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg"
      data-testid={`badge-${text.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{text}</span>
    </motion.div>
  );
}

export default function Landing() {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Testimonial carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false })
  ]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  const [selectedState, setSelectedState] = useState<string>("");

  // Fetch public analytics for landing page
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<{ success: boolean; data: AnalyticsOverview }>({
    queryKey: ["/api/analytics/public-overview"],
    retry: false
  });

  // Fetch recent activity
  const { data: activityData, isLoading: isLoadingActivity } = useQuery<{ success: boolean; data: RecentActivity }>({
    queryKey: ["/api/analytics/recent-activity"],
    retry: false
  });

  // Fetch states for dropdown
  const { data: statesData } = useQuery<{ success: boolean; data: State[] }>({
    queryKey: ["/api/locations/states"],
  });

  // Fetch state-specific stats when state is selected
  const { data: stateStatsData, isLoading: isLoadingStateStats } = useQuery<{ success: boolean; data: StateStats }>({
    queryKey: ["/api/analytics/state-stats", selectedState],
    enabled: !!selectedState,
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
  const activity = activityData?.data;
  const states = statesData?.data || [];
  const stateStats = stateStatsData?.data;
  const news = newsData?.data?.slice(0, 3) || [];
  const allEvents = eventsData?.data || [];
  const now = new Date();
  const upcomingEvents = allEvents.filter(e => new Date(e.date) > now).slice(0, 4);

  // Features data - 5 comprehensive features
  const features = [
    {
      icon: UserPlus,
      title: "Join the Party, Your Way",
      points: [
        "Sign up with NIN verification in minutes",
        "Pay dues securely via mobile money or card",
        "Get your digital APC ID card for instant recognition"
      ]
    },
    {
      icon: Scale,
      title: "Shape the Future with Inclusive Governance",
      points: [
        "Share ideas and vote on policies that matter to you",
        "Track elected officials' promises and hold them accountable",
        "Participate in transparent electronic primaries"
      ]
    },
    {
      icon: Megaphone,
      title: "Mobilize Like Never Before",
      points: [
        "Share campaigns on X, WhatsApp, and Instagram with one tap",
        "Lead local events and rallies with easy-to-use tools",
        "Earn rewards for completing micro-tasks like inviting friends"
      ]
    },
    {
      icon: ClipboardCheck,
      title: "Power Up for Elections",
      points: [
        "Organize voter registration drives and canvassing",
        "Vote securely in primaries with blockchain technology",
        "Monitor elections in real-time with our situation room"
      ]
    },
    {
      icon: GraduationCap,
      title: "Engage as a Young Leader",
      points: [
        "Learn about APC and Nigerian politics through fun quizzes",
        "Connect with mentors and volunteer for campaigns",
        "Climb leaderboards and earn badges for your impact"
      ]
    }
  ];

  // How it works steps - 5 steps
  const steps = [
    {
      number: "01",
      title: "Sign Up",
      description: "Register with your NIN and join your local ward"
    },
    {
      number: "02",
      title: "Engage",
      description: "Explore events, share ideas, and volunteer for tasks"
    },
    {
      number: "03",
      title: "Pay Dues",
      description: "Stay active with easy, secure payments"
    },
    {
      number: "04",
      title: "Vote & Lead",
      description: "Participate in primaries and shape APC's future"
    },
    {
      number: "05",
      title: "Mobilize",
      description: "Rally your community and track your impact"
    }
  ];

  // Expanded testimonials - 9 testimonials from diverse Nigerian cities
  const testimonials = [
    {
      name: "Aisha Mohammed",
      age: 24,
      location: "Lagos",
      quote: "APC Connect made it easy to join my ward and volunteer for campaigns. I earned a badge for my first rally!",
      initials: "AM"
    },
    {
      name: "Chidi Okafor",
      age: 30,
      location: "Kano",
      quote: "Paying my dues is seamless, and I love tracking our elected officials' progress. True accountability!",
      initials: "CO"
    },
    {
      name: "Funmilayo Adeyemi",
      age: 28,
      location: "Abuja",
      quote: "The electronic primaries are secure and transparent. I feel my vote counts for the first time!",
      initials: "FA"
    },
    {
      name: "Emeka Nwankwo",
      age: 26,
      location: "Port Harcourt",
      quote: "As a first-time party member, the platform is incredibly user-friendly. I'm now a ward coordinator!",
      initials: "EN"
    },
    {
      name: "Zainab Ibrahim",
      age: 22,
      location: "Ibadan",
      quote: "The micro-tasks feature helps me contribute even with my busy schedule. Every action counts!",
      initials: "ZI"
    },
    {
      name: "Tunde Bakare",
      age: 35,
      location: "Kaduna",
      quote: "The situation room during elections gave me confidence in our democratic process. Game changer!",
      initials: "TB"
    },
    {
      name: "Ngozi Okonkwo",
      age: 27,
      location: "Enugu",
      quote: "I've learned so much through the political literacy quizzes. Now I'm educating others in my community!",
      initials: "NO"
    },
    {
      name: "Ibrahim Usman",
      age: 31,
      location: "Benin City",
      quote: "The blockchain voting system is revolutionary. Finally, technology serving democracy!",
      initials: "IU"
    },
    {
      name: "Blessing Okoro",
      age: 25,
      location: "Calabar",
      quote: "From volunteer to campaign lead in 6 months! APC Connect empowers young leaders like me.",
      initials: "BO"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Enhanced Hero Section with Parallax */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Parallax Background */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
          {/* Animated Gradient Overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,83,45,0.6) 50%, rgba(0,0,0,0.7) 100%)",
              opacity
            }}
            animate={{
              background: [
                "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,83,45,0.6) 50%, rgba(0,0,0,0.7) 100%)",
                "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(20,83,45,0.7) 50%, rgba(0,0,0,0.8) 100%)",
                "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,83,45,0.6) 50%, rgba(0,0,0,0.7) 100%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Floating Badges */}
        <FloatingBadge 
          icon={Shield} 
          text="Blockchain Secured" 
          delay={0.5}
          style={{ top: "20%", right: "10%" }}
        />
        <FloatingBadge 
          icon={Users} 
          text="1M+ Members" 
          delay={0.7}
          style={{ top: "40%", left: "8%" }}
        />
        <FloatingBadge 
          icon={Zap} 
          text="Real-time Updates" 
          delay={0.9}
          style={{ bottom: "25%", right: "15%" }}
        />
        <FloatingBadge 
          icon={TrendingUp} 
          text="774 LGAs Covered" 
          delay={1.1}
          style={{ bottom: "35%", left: "12%" }}
        />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Badge className="mb-6 text-base px-6 py-2 bg-primary/20 text-primary-foreground border-primary" data-testid="badge-new-platform">
                🚀 Empowering Nigeria's Youth Since 2024
              </Badge>
            </motion.div>
            
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-8 tracking-tight leading-tight" data-testid="text-hero-title">
              Join the Movement:<br />
              <span className="text-primary">Empowering APC,</span><br />
              Connecting Nigeria's Youth!
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl text-white/95 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              Your all-in-one platform to engage with the All Progressives Congress, shape the future, and make your voice heard.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 border-2 border-primary-border shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
                  data-testid="button-get-started"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-7 bg-white/10 backdrop-blur-md border-2 border-white/40 text-white hover:bg-white/20 hover:border-white/60 transition-all duration-300"
                onClick={() => setShowDownloadModal(true)}
                data-testid="button-download-app"
              >
                <Download className="mr-2 h-6 w-6" />
                Download the App
              </Button>
            </motion.div>

            {/* Quick Stats Below Hero */}
            <motion.div
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              {[
                { value: analytics?.totalMembers || 1000000, label: "Active Members" },
                { value: analytics?.totalEvents || 500, label: "Events Hosted" },
                { value: analytics?.totalElections || 150, label: "Elections Held" },
                { value: 774, label: "LGAs Covered" }
              ].map((stat, index) => (
                <div key={index} className="text-white" data-testid={`stat-${index}`}>
                  <div className="text-3xl md:text-4xl font-mono font-bold text-primary">
                    <AnimatedNumber value={stat.value} suffix="+" />
                  </div>
                  <div className="text-sm md:text-base text-white/80 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/60 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Interactive Map Section - APC Across Nigeria */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-map">
                National Coverage
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-map-title"
              >
                Our Presence Across Nigeria
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
                See APC Connect's impact in all 36 states and FCT. Interactive map showing membership distribution, events, and campaign activity nationwide.
              </p>
            </motion.div>

            <motion.div variants={scaleIn} className="max-w-6xl mx-auto">
              <NigeriaMap mode="members" showLegend={true} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Real-Time Stats Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-stats">
                Live Statistics
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-stats-title"
              >
                APC Connect by the Numbers
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Real-time data showcasing our growing community and nationwide impact
              </p>
            </motion.div>

            {isLoadingAnalytics ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[
                  { 
                    icon: Users, 
                    value: analytics?.totalMembers || 0, 
                    label: "Total Members",
                    color: "text-primary"
                  },
                  { 
                    icon: Activity, 
                    value: analytics?.activeMembers || 0, 
                    label: "Active Members",
                    color: "text-accent"
                  },
                  { 
                    icon: Globe, 
                    value: analytics?.statesWithPresence || 0, 
                    label: "States Covered",
                    color: "text-primary"
                  },
                  { 
                    icon: MapPin, 
                    value: analytics?.wardsCovered || 0, 
                    label: "Wards Covered",
                    color: "text-accent"
                  },
                  { 
                    icon: Calendar, 
                    value: analytics?.upcomingEvents || 0, 
                    label: "Upcoming Events",
                    color: "text-primary"
                  },
                  { 
                    icon: Megaphone, 
                    value: analytics?.activeCampaigns || 0, 
                    label: "Active Campaigns",
                    color: "text-accent"
                  },
                  { 
                    icon: Lightbulb, 
                    value: analytics?.totalIdeas || 0, 
                    label: "Ideas Submitted",
                    color: "text-primary"
                  },
                  { 
                    icon: Award, 
                    value: analytics?.totalEngagementPoints || 0, 
                    label: "Engagement Points",
                    color: "text-accent"
                  }
                ].map((stat, index) => (
                  <motion.div key={index} variants={scaleIn}>
                    <Card className="hover-elevate transition-all duration-300" data-testid={`card-stat-${index}`}>
                      <CardContent className="p-6">
                        <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4`}>
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="text-3xl font-mono font-bold mb-1">
                          <AnimatedNumber value={stat.value} suffix="+" />
                        </div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section - Enhanced with Stagger Animations */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-features">
                Platform Features
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-features-title"
              >
                Everything You Need to Participate
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Modern democratic tools designed for Nigeria's digital-first generation
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  variants={scaleIn}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                >
                  <Card className="h-full hover-elevate transition-all duration-300 border-2" data-testid={`card-feature-${index}`}>
                    <CardHeader>
                      <motion.div 
                        className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6"
                        whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
                      >
                        <feature.icon className="h-8 w-8 text-primary" />
                      </motion.div>
                      <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {feature.points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                            <span className="text-primary mt-1 text-xl">•</span>
                            <span className="text-base">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Secondary CTA */}
            <motion.div className="text-center mt-16" variants={fadeIn}>
              <Link href="/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="button-explore-features">
                  Explore All Features
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works - 5 Steps */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-how-it-works">
                Simple Process
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-how-it-works-title"
              >
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Get started with APC Connect in five simple steps
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
              {steps.map((step, index) => (
                <motion.div 
                  key={index}
                  className="relative"
                  variants={fadeIn}
                  whileHover={{ scale: 1.05 }}
                  data-testid={`step-${index}`}
                >
                  <div className="text-center">
                    <motion.div 
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 border-2 border-primary/20"
                      whileHover={{ borderColor: "hsl(var(--primary))", transition: { duration: 0.3 } }}
                    >
                      <span className="text-4xl font-bold font-mono text-primary">{step.number}</span>
                    </motion.div>
                    <h3 className="font-display text-xl md:text-2xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-base">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/40 to-transparent -z-10" />
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div className="text-center bg-primary/5 rounded-xl p-8 max-w-4xl mx-auto mt-12" variants={fadeIn}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    <AnimatedNumber value={analytics?.totalMembers || 12000} suffix="+" />
                  </div>
                  <p className="text-sm text-muted-foreground">Members joined this way</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    <AnimatedNumber value={analytics?.totalEvents || 500} suffix="+" />
                  </div>
                  <p className="text-sm text-muted-foreground">Events organized</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    <AnimatedNumber value={analytics?.statesWithPresence || 37} />
                  </div>
                  <p className="text-sm text-muted-foreground">States covered</p>
                </div>
              </div>
              <Link href="/register">
                <Button size="lg" className="text-lg px-10 py-7" data-testid="button-start-journey">
                  Start Your Journey Today
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Latest Activity Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-activity">
                Live Updates
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-activity-title"
              >
                Latest Platform Activity
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                See what's happening right now across APC Connect
              </p>
            </motion.div>

            {isLoadingActivity ? (
              <div className="max-w-5xl mx-auto">
                <Skeleton className="h-12 w-full mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div variants={scaleIn} className="max-w-5xl mx-auto">
                <Tabs defaultValue="members" className="w-full" data-testid="tabs-activity">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
                    <TabsTrigger value="members" data-testid="tab-members">
                      <Users className="h-4 w-4 mr-2" />
                      New Members
                    </TabsTrigger>
                    <TabsTrigger value="events" data-testid="tab-events">
                      <Calendar className="h-4 w-4 mr-2" />
                      Upcoming Events
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                      <Megaphone className="h-4 w-4 mr-2" />
                      Popular Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="ideas" data-testid="tab-ideas">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Trending Ideas
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activity?.recentMembers?.slice(0, 6).map((member: any, index: number) => (
                        <Card key={index} className="hover-elevate" data-testid={`card-member-${index}`}>
                          <CardContent className="p-4 flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {member.user?.firstName} {member.user?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {member.ward?.lga?.state?.name || "Nigeria"}
                              </p>
                            </div>
                            <Badge variant="outline">New</Badge>
                          </CardContent>
                        </Card>
                      )) || <p className="text-center text-muted-foreground py-8">No recent members</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-0">
                    <div className="grid grid-cols-1 gap-4">
                      {activity?.upcomingEvents?.slice(0, 5).map((event: any, index: number) => (
                        <Card key={index} className="hover-elevate" data-testid={`card-event-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{event.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(event.date).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) || <p className="text-center text-muted-foreground py-8">No upcoming events</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="campaigns" className="mt-0">
                    <div className="grid grid-cols-1 gap-4">
                      {activity?.popularCampaigns?.map((campaign: any, index: number) => (
                        <Card key={index} className="hover-elevate" data-testid={`card-campaign-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Megaphone className="h-6 w-6 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1">{campaign.title}</h3>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{campaign.description}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{campaign.category}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {campaign.currentVotes}/{campaign.targetVotes} votes
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) || <p className="text-center text-muted-foreground py-8">No active campaigns</p>}
                    </div>
                  </TabsContent>

                  <TabsContent value="ideas" className="mt-0">
                    <div className="grid grid-cols-1 gap-4">
                      {activity?.trendingIdeas?.map((idea: any, index: number) => (
                        <Card key={index} className="hover-elevate" data-testid={`card-idea-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Lightbulb className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1">{idea.title}</h3>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{idea.description}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{idea.category}</Badge>
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <ThumbsUp className="h-3 w-3" />
                                    {idea.votesCount} votes
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) || <p className="text-center text-muted-foreground py-8">No trending ideas</p>}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-testimonials">
                Member Stories
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-testimonials-title"
              >
                What Members Say
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Real stories from APC Connect members across all 36 states and FCT
              </p>
            </motion.div>

            {/* Embla Carousel */}
            <div className="relative">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-6">
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={index} 
                      className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0"
                    >
                      <Card className="h-full hover-elevate transition-all duration-300" data-testid={`card-testimonial-${index}`}>
                        <CardHeader>
                          <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                {testimonial.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-lg">{testimonial.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {testimonial.location} • {testimonial.age} years
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Quote className="h-10 w-10 text-primary/20 mb-4" />
                          <p className="text-muted-foreground italic text-base leading-relaxed">
                            {testimonial.quote}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background border-2"
                onClick={scrollPrev}
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 h-12 w-12 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background border-2"
                onClick={scrollNext}
                data-testid="button-carousel-next"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Secondary CTA */}
            <motion.div className="text-center mt-16" variants={fadeIn}>
              <p className="text-muted-foreground mb-6 text-lg">
                Join thousands of young Nigerians making a difference
              </p>
              <Link href="/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="button-join-community">
                  Join Our Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Impact Section with Enhanced Visuals */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-impact-title"
              >
                Together, We Build a Stronger Nigeria
              </h2>
              <p className="text-primary-foreground/90 text-lg md:text-xl max-w-3xl mx-auto">
                Our platform connects young Nigerians with democratic processes across all 774 LGAs
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <motion.div variants={scaleIn} className="text-center">
                <div className="text-5xl md:text-7xl font-mono font-bold mb-4" data-testid="text-youth-engaged">
                  <AnimatedNumber value={analytics?.totalMembers || 1000000} suffix="+" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">Youth Engaged</h3>
                <p className="text-primary-foreground/80 text-lg">Connecting young Nigerians to APC's progressive vision</p>
              </motion.div>

              <motion.div variants={scaleIn} className="text-center">
                <div className="text-5xl md:text-7xl font-mono font-bold mb-4" data-testid="text-lgas-covered">
                  774
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">LGAs Covered</h3>
                <p className="text-primary-foreground/80 text-lg">From wards to national, we're everywhere in Nigeria</p>
              </motion.div>

              <motion.div variants={scaleIn} className="text-center">
                <div className="text-5xl md:text-7xl font-mono font-bold mb-4" data-testid="text-transparent-governance">
                  100%
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">Transparent Governance</h3>
                <p className="text-primary-foreground/80 text-lg">Your voice shapes policies and primaries</p>
              </motion.div>
            </div>

            <motion.div className="text-center" variants={fadeIn}>
              <Link href="/register">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-10 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  data-testid="button-be-part-of-change"
                >
                  Be Part of the Change
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Recent News with Enhanced Animations */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <div className="flex items-center justify-between mb-12">
              <motion.div variants={fadeIn}>
                <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-news">
                  Stay Informed
                </Badge>
                <h2 
                  className="font-display text-4xl md:text-5xl font-bold"
                  data-testid="text-news-title"
                >
                  Latest News
                </h2>
              </motion.div>
              <Link href="/login">
                <Button variant="ghost" size="lg" data-testid="button-view-all-news">
                  View All
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {isLoadingNews ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : news.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((post, index) => (
                  <motion.div 
                    key={post.id} 
                    variants={scaleIn}
                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  >
                    <Card className="h-full hover-elevate overflow-hidden transition-all duration-300" data-testid={`card-news-${index}`}>
                      {post.imageUrl && (
                        <div className="h-56 bg-muted overflow-hidden">
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <Badge className="w-fit mb-3">{post.category}</Badge>
                        <CardTitle className="text-xl line-clamp-2 leading-tight">{post.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 mb-4 text-base">{post.excerpt}</p>
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
              <p className="text-center text-muted-foreground py-12 text-lg">No news available</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events with Enhanced Design */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <div className="flex items-center justify-between mb-12">
              <motion.div variants={fadeIn}>
                <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-events">
                  Community Events
                </Badge>
                <h2 
                  className="font-display text-4xl md:text-5xl font-bold"
                  data-testid="text-events-title"
                >
                  Upcoming Events
                </h2>
              </motion.div>
              <Link href="/login">
                <Button variant="ghost" size="lg" data-testid="button-view-all-events">
                  View All
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {isLoadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {upcomingEvents.map((event, index) => (
                  <motion.div 
                    key={event.id} 
                    variants={scaleIn}
                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  >
                    <Card className="h-full hover-elevate transition-all duration-300" data-testid={`card-event-${index}`}>
                      <CardHeader>
                        <Badge className="w-fit mb-3">{event.category}</Badge>
                        <CardTitle className="text-lg line-clamp-2 leading-tight">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <Link href="/login">
                          <Button className="w-full mt-4" variant="outline" size="sm" data-testid={`button-rsvp-${index}`}>
                            RSVP Now
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-lg">No upcoming events</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Join Your State CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-12">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-join-state">
                Get Started Now
              </Badge>
              <h2 
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                data-testid="text-join-state-title"
              >
                Join APC Connect in Your State
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Select your state to see local statistics and connect with members in your area
              </p>
            </motion.div>

            <motion.div variants={scaleIn} className="max-w-2xl mx-auto">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Your State</label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="w-full" data-testid="select-state">
                        <SelectValue placeholder="Choose your state..." />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isLoadingStateStats ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : selectedState && stateStats ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-primary/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary mb-1">
                            {stateStats.memberCount.toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground">Members</p>
                        </div>
                        <div className="bg-accent/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-accent mb-1">
                            {stateStats.activeMembers.toLocaleString()}
                          </div>
                          <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary mb-1">
                            {stateStats.upcomingEvents}
                          </div>
                          <p className="text-sm text-muted-foreground">Events</p>
                        </div>
                        <div className="bg-accent/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-accent mb-1">
                            {stateStats.activeCampaigns}
                          </div>
                          <p className="text-sm text-muted-foreground">Campaigns</p>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary mb-1">
                            {stateStats.lgasCovered}
                          </div>
                          <p className="text-sm text-muted-foreground">LGAs</p>
                        </div>
                        <div className="bg-accent/5 rounded-lg p-4">
                          <div className="text-2xl font-bold text-accent mb-1">
                            {stateStats.wardsCovered}
                          </div>
                          <p className="text-sm text-muted-foreground">Wards</p>
                        </div>
                      </div>

                      <Link href={`/register?state=${selectedState}`}>
                        <Button className="w-full text-lg py-6" size="lg" data-testid="button-join-selected-state">
                          Join APC in {stateStats.state.name}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </motion.div>
                  ) : selectedState ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading state statistics...
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select a state to view statistics and join your local chapter
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-final-cta-title">
              Ready to Shape Nigeria's Future?
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join over 1 million young Nigerians building a stronger democracy through APC Connect
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-10 py-7" data-testid="button-final-cta-register">
                  Create Free Account
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7" data-testid="button-final-cta-login">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Download App Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent data-testid="dialog-download-app">
          <DialogHeader>
            <DialogTitle className="text-2xl">Download APC Connect</DialogTitle>
            <DialogDescription className="text-base">
              Get the mobile app for iOS and Android
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button className="w-full justify-start text-lg h-14" variant="outline" data-testid="button-download-ios">
              <Download className="mr-3 h-5 w-5" />
              Download for iOS
            </Button>
            <Button className="w-full justify-start text-lg h-14" variant="outline" data-testid="button-download-android">
              <Download className="mr-3 h-5 w-5" />
              Download for Android
            </Button>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Or access the web version by creating an account
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
