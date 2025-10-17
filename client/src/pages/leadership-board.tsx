import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Search,
  Shield,
  Award
} from "lucide-react";
import { FaTwitter, FaFacebook, FaLinkedin } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Mock data for national executives
const nationalExecutives = [
  {
    name: "Dr. Abdullahi Umar Ganduje",
    position: "National Chairman",
    bio: "Leading the APC with vision and commitment to progressive governance across Nigeria",
    initials: "AG",
    email: "chairman@apc.ng",
    phone: "+234 xxx xxx xxxx"
  },
  {
    name: "Rt. Hon. Emma Enukwu",
    position: "Deputy National Chairman (North)",
    bio: "Championing party coordination and grassroots mobilization in Northern Nigeria",
    initials: "EE",
    email: "deputy.north@apc.ng"
  },
  {
    name: "Chief Victor Giadom",
    position: "Deputy National Chairman (South)",
    bio: "Strengthening party structures and member engagement across Southern Nigeria",
    initials: "VG",
    email: "deputy.south@apc.ng"
  },
  {
    name: "Sen. Ajibola Basiru",
    position: "National Secretary",
    bio: "Ensuring transparency and accountability in party administration",
    initials: "AB",
    email: "secretary@apc.ng"
  },
  {
    name: "Alhaji Sani Zoro",
    position: "National Treasurer",
    bio: "Managing party finances with integrity and fiscal responsibility",
    initials: "SZ",
    email: "treasurer@apc.ng"
  },
  {
    name: "Barr. Felix Morka",
    position: "National Publicity Secretary",
    bio: "Communicating APC's progressive vision to Nigerians nationwide",
    initials: "FM",
    email: "publicity@apc.ng"
  }
];

// Nigerian states
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// Mock state coordinators
const stateCoordinators = nigerianStates.map((state, index) => ({
  name: `Hon. ${["Abubakar", "Chinedu", "Emeka", "Fatima", "Ibrahim", "Ngozi", "Oluwaseun", "Yusuf"][index % 8]} ${["Adebayo", "Okafor", "Musa", "Ibrahim", "Nwankwo", "Ahmed", "Williams", "Mohammed"][index % 8]}`,
  position: `${state} State Coordinator`,
  state: state,
  bio: `Leading APC activities and coordinating party operations across ${state} State`,
  initials: state.substring(0, 2).toUpperCase(),
  email: `${state.toLowerCase().replace(/\s+/g, '')}@apc.ng`,
  phone: "+234 xxx xxx xxxx"
}));

// Geopolitical zones
const zones = [
  {
    name: "North Central",
    states: ["Benue", "FCT", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
    coordinator: "Alhaji Musa Bello",
    initials: "MB"
  },
  {
    name: "North East",
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
    coordinator: "Dr. Ibrahim Shehu",
    initials: "IS"
  },
  {
    name: "North West",
    states: ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
    coordinator: "Mal. Yusuf Dankwambo",
    initials: "YD"
  },
  {
    name: "South East",
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
    coordinator: "Chief Emeka Ihedioha",
    initials: "EI"
  },
  {
    name: "South South",
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
    coordinator: "Chief Victor Ochei",
    initials: "VO"
  },
  {
    name: "South West",
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    coordinator: "Hon. Adebayo Adelabu",
    initials: "AA"
  }
];

export default function LeadershipBoard() {
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter coordinators
  const filteredCoordinators = stateCoordinators.filter((coordinator) => {
    const matchesState = stateFilter === "all" || coordinator.state === stateFilter;
    const matchesSearch = coordinator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coordinator.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-12 bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge className="mb-4 text-base px-6 py-2" data-testid="badge-leadership">
              Party Leadership
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4" data-testid="text-page-title">
              APC Leadership Board
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Meet the dedicated leaders driving progressive change across Nigeria's 36 states and FCT
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="executives" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8" data-testid="tabs-leadership">
              <TabsTrigger value="executives" data-testid="tab-executives">
                National Executives
              </TabsTrigger>
              <TabsTrigger value="coordinators" data-testid="tab-coordinators">
                State Coordinators
              </TabsTrigger>
              <TabsTrigger value="zones" data-testid="tab-zones">
                Zonal Leaders
              </TabsTrigger>
            </TabsList>

            {/* National Executives */}
            <TabsContent value="executives">
              <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2" data-testid="text-executives-title">
                    National Executive Committee
                  </h2>
                  <p className="text-muted-foreground">
                    Leading the All Progressives Congress nationwide
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nationalExecutives.map((executive, index) => (
                    <motion.div key={index} variants={fadeIn}>
                      <Card className="h-full hover-elevate" data-testid={`card-executive-${index}`}>
                        <CardHeader className="text-center pb-4">
                          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                              {executive.initials}
                            </AvatarFallback>
                          </Avatar>
                          <CardTitle className="text-xl" data-testid={`text-executive-name-${index}`}>
                            {executive.name}
                          </CardTitle>
                          <Badge className="mx-auto mt-2" variant="secondary">
                            {executive.position}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground text-center leading-relaxed">
                            {executive.bio}
                          </p>
                          
                          <div className="space-y-2 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{executive.email}</span>
                            </div>
                            {executive.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-muted-foreground">{executive.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 justify-center pt-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-twitter-${index}`}>
                              <FaTwitter className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-facebook-${index}`}>
                              <FaFacebook className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-linkedin-${index}`}>
                              <FaLinkedin className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* State Coordinators */}
            <TabsContent value="coordinators">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2" data-testid="text-coordinators-title">
                    State Coordinators
                  </h2>
                  <p className="text-muted-foreground">
                    Coordinating party activities across all 36 states and FCT
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or state..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-coordinator"
                      />
                    </div>
                  </div>

                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="w-full md:w-64" data-testid="select-state-filter">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Coordinators Grid */}
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={staggerContainer}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {filteredCoordinators.map((coordinator, index) => (
                    <motion.div key={index} variants={fadeIn}>
                      <Card className="h-full hover-elevate" data-testid={`card-coordinator-${index}`}>
                        <CardHeader className="text-center pb-3">
                          <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                              {coordinator.initials}
                            </AvatarFallback>
                          </Avatar>
                          <CardTitle className="text-lg leading-tight" data-testid={`text-coordinator-name-${index}`}>
                            {coordinator.name}
                          </CardTitle>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-sm text-muted-foreground">{coordinator.state}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-muted-foreground text-center">
                            {coordinator.bio}
                          </p>
                          
                          <div className="space-y-1 pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs">
                              <Mail className="h-3 w-3 text-primary flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{coordinator.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Phone className="h-3 w-3 text-primary flex-shrink-0" />
                              <span className="text-muted-foreground">{coordinator.phone}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </TabsContent>

            {/* Zonal Leaders */}
            <TabsContent value="zones">
              <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2" data-testid="text-zones-title">
                    Geopolitical Zone Coordinators
                  </h2>
                  <p className="text-muted-foreground">
                    Leading APC operations across Nigeria's six geopolitical zones
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {zones.map((zone, index) => (
                    <motion.div key={index} variants={fadeIn}>
                      <Card className="h-full hover-elevate" data-testid={`card-zone-${index}`}>
                        <CardHeader>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-xl" data-testid={`text-zone-name-${index}`}>
                                {zone.name}
                              </CardTitle>
                              <Badge variant="secondary" className="mt-1">
                                {zone.states.length} States
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {zone.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">
                                {zone.coordinator}
                              </p>
                              <p className="text-xs text-muted-foreground">Zone Coordinator</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              Covered States
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {zone.states.map((state) => (
                                <Badge key={state} variant="outline" className="text-xs">
                                  {state}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
