import { motion } from "framer-motion";
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Shield, 
  Zap,
  CheckCircle,
  TrendingUp,
  Vote,
  Lightbulb,
  Calendar,
  ArrowRight,
  History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function About() {
  const coreValues = [
    {
      icon: Shield,
      title: "Transparency",
      description: "Open governance with blockchain-secured elections and public accountability"
    },
    {
      icon: Users,
      title: "Inclusion",
      description: "Every voice matters - from ward level to national, all 774 LGAs represented"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "Leveraging technology to modernize political engagement for Nigeria's youth"
    }
  ];

  const platformFeatures = [
    {
      icon: Vote,
      title: "Blockchain Voting",
      description: "Immutable, transparent electoral process with real-time verification and audit trails"
    },
    {
      icon: Shield,
      title: "NIN Verification",
      description: "Secure member authentication tied to National Identification Numbers"
    },
    {
      icon: Lightbulb,
      title: "Idea Marketplace",
      description: "Crowdsourced policy ideas voted on by members to shape party direction"
    },
    {
      icon: TrendingUp,
      title: "Impact Analytics",
      description: "Real-time dashboards tracking member engagement, votes, and campaign metrics"
    }
  ];

  const milestones = [
    {
      year: "2013",
      title: "APC Founded",
      description: "All Progressives Congress formed through merger of ACN, CPC, ANPP, and nPDP factions"
    },
    {
      year: "2015",
      title: "Historic Victory",
      description: "First opposition party to win presidential election in Nigeria's history"
    },
    {
      year: "2023",
      title: "Continued Leadership",
      description: "APC maintains presidency with commitment to democratic reforms"
    },
    {
      year: "2024",
      title: "APC Connect Launch",
      description: "Digital platform connecting 1M+ young Nigerians to party activities"
    }
  ];

  const impactStats = [
    { value: "1M+", label: "Members Registered", icon: Users },
    { value: "150+", label: "Elections Conducted", icon: Vote },
    { value: "500+", label: "Campaigns Supported", icon: TrendingUp },
    { value: "10K+", label: "Ideas Submitted", icon: Lightbulb }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/20 via-background to-background overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "40px 40px"
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge className="mb-6 text-base px-6 py-2" data-testid="badge-about">
              About Us
            </Badge>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight" data-testid="text-hero-title">
              Building Nigeria's Digital Democracy
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8">
              APC Connect is revolutionizing political engagement by empowering young Nigerians to actively participate in democratic processes through innovative technology.
            </p>
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6" data-testid="button-join-movement">
                Join the Movement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
              <motion.div variants={fadeIn}>
                <Card className="h-full border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Target className="h-7 w-7 text-primary" />
                      </div>
                      <CardTitle className="text-3xl" data-testid="text-mission-title">Our Mission</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      To democratize political participation by providing every Nigerian youth with accessible, 
                      transparent tools to engage with the All Progressives Congress, from ward-level decisions 
                      to national elections—ensuring every voice is heard and every vote counts.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Eye className="h-7 w-7 text-primary" />
                      </div>
                      <CardTitle className="text-3xl" data-testid="text-vision-title">Our Vision</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      A Nigeria where every young person is an active stakeholder in governance, where 
                      technology bridges the gap between citizens and leaders, and where the next generation 
                      shapes policy through transparent, accountable democratic processes.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Core Values */}
            <motion.div variants={fadeIn} className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4" data-testid="text-values-title">
                Our Core Values
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The principles that guide everything we build and every decision we make
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {coreValues.map((value, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="h-full hover-elevate" data-testid={`card-value-${index}`}>
                    <CardHeader>
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <value.icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Party History */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-history">
                Our Journey
              </Badge>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4" data-testid="text-history-title">
                Party History
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                From a historic merger to leading Nigeria's democratic future
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              {milestones.map((milestone, index) => (
                <motion.div 
                  key={index} 
                  variants={fadeIn}
                  className="relative pl-8 pb-12 last:pb-0"
                  data-testid={`milestone-${index}`}
                >
                  {index < milestones.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-primary/20" />
                  )}
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <History className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <Card className="hover-elevate">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-lg px-4 py-1">{milestone.year}</Badge>
                        <CardTitle className="text-2xl">{milestone.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-lg leading-relaxed">{milestone.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <Badge className="mb-4 text-sm px-4 py-1" data-testid="badge-features">
                Technology Stack
              </Badge>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4" data-testid="text-features-title">
                What Makes Us Unique
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Cutting-edge technology powering transparent, secure democratic engagement
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {platformFeatures.map((feature, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="h-full hover-elevate border-2" data-testid={`card-feature-${index}`}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                          <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeIn} className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4" data-testid="text-impact-title">
                Our Impact
              </h2>
              <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto">
                Real numbers showing how we're transforming political engagement across Nigeria
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {impactStats.map((stat, index) => (
                <motion.div 
                  key={index} 
                  variants={fadeIn}
                  className="text-center"
                  data-testid={`stat-${index}`}
                >
                  <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div className="text-4xl md:text-5xl font-mono font-bold mb-2">{stat.value}</div>
                  <div className="text-primary-foreground/80 text-base">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section (Coming Soon) */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6" data-testid="text-team-title">
              Meet the Team
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our dedicated team of technologists, political strategists, and community leaders working to 
              modernize Nigerian democracy.
            </p>
            <Badge variant="secondary" className="text-lg px-6 py-2" data-testid="badge-coming-soon">
              Coming Soon
            </Badge>
            <Separator className="my-12" />
            <Link href="/leadership-board">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" data-testid="button-view-leadership">
                View Party Leadership
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6" data-testid="text-cta-title">
              Be Part of the Change
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join over 1 million young Nigerians using APC Connect to shape the future of Nigerian democracy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-6" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="button-learn-more">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
