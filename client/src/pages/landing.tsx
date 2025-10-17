import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useState, useRef, useEffect } from "react";
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
  Mail,
  Shield,
  FileText
} from "lucide-react";
import { FaTwitter, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function Landing() {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  // Testimonials
  const testimonials = [
    {
      name: "Aisha",
      age: 24,
      location: "Lagos",
      quote: "APC Connect made it easy to join my ward and volunteer for campaigns. I earned a badge for my first rally!",
      initials: "A"
    },
    {
      name: "Chidi",
      age: 30,
      location: "Kano",
      quote: "Paying my dues is seamless, and I love tracking our elected officials' progress.",
      initials: "C"
    },
    {
      name: "Funmi",
      age: 28,
      location: "Abuja",
      quote: "The electronic primaries are secure and transparent. I feel my vote counts!",
      initials: "F"
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
              Join the Movement: Empowering APC, Connecting Nigeria's Youth!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              APC Connect is your all-in-one platform to engage with the All Progressives Congress, shape the future, and make your voice heard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 border border-primary-border"
                  data-testid="button-get-started"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowDownloadModal(true)}
                data-testid="button-download-app"
              >
                <Download className="mr-2 h-5 w-5" />
                Download the App
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - 5 Comprehensive Features */}
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
                      <ul className="space-y-2">
                        {feature.points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works - 5 Steps */}
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
              data-testid="text-how-it-works-title"
            >
              How It Works
            </motion.h2>
            <motion.p 
              className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto"
              variants={fadeIn}
            >
              Get started with APC Connect in five simple steps
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
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

            <motion.div className="text-center" variants={fadeIn}>
              <Link href="/register">
                <Button size="lg" data-testid="button-start-journey">
                  Start Your Journey Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
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
              data-testid="text-testimonials-title"
            >
              What Members Say
            </motion.h2>
            <motion.p 
              className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto"
              variants={fadeIn}
            >
              Real stories from APC Connect members across Nigeria
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="h-full hover-elevate" data-testid={`card-testimonial-${index}`}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{testimonial.name}, {testimonial.age}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Quote className="h-8 w-8 text-primary/20 mb-2" />
                      <p className="text-muted-foreground italic">{testimonial.quote}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-primary text-primary-foreground">
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
              data-testid="text-impact-title"
            >
              Together, We Build a Stronger Nigeria
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <motion.div variants={fadeIn} className="text-center">
                <div className="text-5xl md:text-6xl font-mono font-bold mb-4" data-testid="text-youth-engaged">
                  <AnimatedNumber value={analytics?.totalMembers || 1000000} suffix="+" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Youth Engaged</h3>
                <p className="text-primary-foreground/80">Connecting young Nigerians to APC's vision</p>
              </motion.div>

              <motion.div variants={fadeIn} className="text-center">
                <div className="text-5xl md:text-6xl font-mono font-bold mb-4" data-testid="text-lgas-covered">
                  774
                </div>
                <h3 className="text-2xl font-bold mb-2">LGAs Covered</h3>
                <p className="text-primary-foreground/80">From wards to national, we're everywhere</p>
              </motion.div>

              <motion.div variants={fadeIn} className="text-center">
                <div className="text-5xl md:text-6xl font-mono font-bold mb-4" data-testid="text-transparent-governance">
                  100%
                </div>
                <h3 className="text-2xl font-bold mb-2">Transparent Governance</h3>
                <p className="text-primary-foreground/80">Your voice shapes policies and primaries</p>
              </motion.div>
            </div>

            <motion.div className="text-center" variants={fadeIn}>
              <Link href="/register">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 py-6"
                  data-testid="button-be-part-of-change"
                >
                  Be Part of the Change
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
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

      {/* Final Call to Action */}
      <section className="py-20 bg-background">
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
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Join thousands of members nationwide
            </p>
            <Link href="/register">
              <Button 
                size="lg" 
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
              <p className="text-muted-foreground text-sm mb-4">
                Your Voice, Your Party, Your Future.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground flex items-center gap-2" data-testid="link-about-apc">
                    <Shield className="h-4 w-4" />
                    About APC Connect
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => setShowDownloadModal(true)}
                    className="hover:text-foreground flex items-center gap-2"
                    data-testid="link-download-app"
                  >
                    <Download className="h-4 w-4" />
                    Download App
                  </button>
                </li>
                <li>
                  <a href="mailto:contact@apcconnect.ng" className="hover:text-foreground flex items-center gap-2" data-testid="link-contact">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground flex items-center gap-2" data-testid="link-privacy">
                    <FileText className="h-4 w-4" />
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Elections</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Events</Link></li>
                <li><Link href="/login" className="hover:text-foreground">News</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Volunteer</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="Twitter/X" data-testid="link-twitter">
                  <FaTwitter className="h-5 w-5" />
                </a>
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="Instagram" data-testid="link-instagram">
                  <FaInstagram className="h-5 w-5" />
                </a>
                <a href="#" className="hover-elevate p-2 rounded-lg" aria-label="WhatsApp" data-testid="link-whatsapp">
                  <FaWhatsapp className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 APC Connect. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Download App Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent data-testid="modal-download-app">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download APC Connect App
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-4">
                <p className="text-base">
                  The APC Connect mobile app is coming soon! Get ready for:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Offline access to your membership card and ward information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Push notifications for events, elections, and important updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Seamless mobile voting and engagement on the go</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground pt-2">
                  For now, you can access all features through our web platform. Sign up today to get notified when the app launches!
                </p>
                <div className="flex gap-4 pt-2">
                  <Link href="/register" className="flex-1">
                    <Button className="w-full" data-testid="button-modal-register">
                      Sign Up Now
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDownloadModal(false)}
                    data-testid="button-modal-close"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
