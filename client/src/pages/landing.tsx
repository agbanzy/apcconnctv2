import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingHeader } from "@/components/landing-header";
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

function FloatingBadge({ icon: Icon, text, delay, style }: { 
  icon: any; 
  text: string; 
  delay: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="absolute hidden lg:flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg"
      style={style}
      data-testid={`badge-${text.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{text}</span>
    </motion.div>
  );
}

export default function Landing() {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { t } = useLanguage();

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
      title: t.featureJoinTitle,
      points: [
        t.featureJoinPoint1,
        t.featureJoinPoint2,
        t.featureJoinPoint3
      ]
    },
    {
      icon: Scale,
      title: t.featureShapeTitle,
      points: [
        t.featureShapePoint1,
        t.featureShapePoint2,
        t.featureShapePoint3
      ]
    },
    {
      icon: Megaphone,
      title: t.featureMobilizeTitle,
      points: [
        t.featureMobilizePoint1,
        t.featureMobilizePoint2,
        t.featureMobilizePoint3
      ]
    },
    {
      icon: ClipboardCheck,
      title: t.featureElectionsTitle,
      points: [
        t.featureElectionsPoint1,
        t.featureElectionsPoint2,
        t.featureElectionsPoint3
      ]
    },
    {
      icon: GraduationCap,
      title: t.featureYouthTitle,
      points: [
        t.featureYouthPoint1,
        t.featureYouthPoint2,
        t.featureYouthPoint3
      ]
    }
  ];

  // How it works steps - 5 steps
  const steps = [
    {
      number: "01",
      title: t.stepSignUpTitle,
      description: t.stepSignUpDesc
    },
    {
      number: "02",
      title: t.stepEngageTitle,
      description: t.stepEngageDesc
    },
    {
      number: "03",
      title: t.stepPayDuesTitle,
      description: t.stepPayDuesDesc
    },
    {
      number: "04",
      title: t.stepVoteTitle,
      description: t.stepVoteDesc
    },
    {
      number: "05",
      title: t.stepMobilizeTitle,
      description: t.stepMobilizeDesc
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
      <LandingHeader />
      
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        {/* Static Background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        {/* Static Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-primary/20 to-black/70" />

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
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-6 tracking-tight leading-[1.1]" data-testid="text-hero-title">
              <span className="block mb-2">{t.heroTitle}</span>
              <span className="block text-primary drop-shadow-[0_0_30px_rgba(20,83,45,0.5)]">{t.heroSubtitle}</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t.heroDescription}
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
                  {t.getStarted}
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
                {t.downloadApp}
              </Button>
            </motion.div>

            {/* Quick Stats Below Hero - Enhanced */}
            <motion.div
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              {[
                { value: analytics?.totalMembers || 1000000, label: "Active Members", suffix: "+" },
                { value: analytics?.totalEvents || 500, label: "Events Hosted", suffix: "+" },
                { value: analytics?.totalElections || 150, label: "Elections Held", suffix: "+" },
                { value: 774, label: "LGAs Covered", suffix: "" }
              ].map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="text-white bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                  data-testid={`stat-${index}`}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="text-3xl md:text-5xl lg:text-6xl font-mono font-black text-primary drop-shadow-lg">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs md:text-sm lg:text-base text-white/90 mt-2 font-medium">{stat.label}</div>
                </motion.div>
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
      <section id="features" className="py-24 bg-muted/30">
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
      <section id="how-it-works" className="py-24 bg-muted/30">
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
                {t.howItWorks}
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

            {/* Enhanced Embla Carousel */}
            <div className="relative px-4 md:px-12">
              <div className="overflow-hidden rounded-xl" ref={emblaRef}>
                <div className="flex gap-6">
                  {testimonials.map((testimonial, index) => (
                    <motion.div 
                      key={index} 
                      className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 px-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full hover-elevate transition-all duration-300 border-2" data-testid={`card-testimonial-${index}`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-primary/30 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg md:text-xl font-black">
                                {testimonial.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base md:text-lg truncate">{testimonial.name}</div>
                              <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{testimonial.location}</span>
                                <span className="text-xs">• {testimonial.age}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="relative">
                            <Quote className="h-8 w-8 md:h-10 md:w-10 text-primary/10 absolute -top-2 -left-2" />
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed pl-6 italic">
                              {testimonial.quote}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Enhanced Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-md hover:bg-background border-2 shadow-lg z-10 hover:scale-110 transition-all"
                onClick={scrollPrev}
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-md hover:bg-background border-2 shadow-lg z-10 hover:scale-110 transition-all"
                onClick={scrollNext}
                data-testid="button-carousel-next"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
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
      <section id="impact" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
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
                {t.ourImpact}
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
