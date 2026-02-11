import {
  Home,
  Users,
  Vote,
  Calendar,
  BookOpen,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Settings,
  User,
  DollarSign,
  Trophy,
  CheckSquare,
  Activity,
  Newspaper,
  LogOut,
  Lightbulb,
  Heart,
  Info,
  Image,
  Shield,
  Award,
  GraduationCap,
  UserPlus,
  BarChart3,
  Search,
  Bell,
  Coins,
  ShoppingCart,
  Gift,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import apcLogo from "@assets/logo_1760719840683.png";
import { useLanguage } from "@/contexts/LanguageContext";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const coreMenuItems = [
    {
      title: t.dashboard,
      url: "/dashboard",
      icon: Home,
    },
    {
      title: t.profile,
      url: "/profile",
      icon: User,
    },
    {
      title: t.news,
      url: "/news",
      icon: Newspaper,
    },
    {
      title: t.search,
      url: "/search",
      icon: Search,
    },
  ];

  const pointsItems = [
    {
      title: t.myPoints,
      url: "/points",
      icon: Coins,
    },
    {
      title: t.purchasePoints,
      url: "/purchase-points",
      icon: ShoppingCart,
    },
    {
      title: t.pointConversion,
      url: "/redeem-points",
      icon: Smartphone,
    },
    {
      title: t.userTasks,
      url: "/user-tasks",
      icon: CheckSquare,
    },
    {
      title: t.referrals,
      url: "/referrals",
      icon: Gift,
    },
  ];

  const engagementItems = [
    {
      title: t.tasksAndJobs,
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: t.rewardsAndBadges,
      url: "/rewards",
      icon: Award,
    },
    {
      title: t.leaderboard,
      url: "/leaderboard",
      icon: Trophy,
    },
    {
      title: t.inviteAndEarn,
      url: "/invite-earn",
      icon: UserPlus,
    },
  ];

  const politicalItems = [
    {
      title: t.electionsAndVoting,
      url: "/elections",
      icon: Vote,
    },
    {
      title: "General Elections",
      url: "/general-elections",
      icon: BarChart3,
    },
    {
      title: t.campaigns,
      url: "/campaigns",
      icon: MessageSquare,
    },
    {
      title: t.volunteerTasks,
      url: "/volunteer",
      icon: Briefcase,
    },
  ];

  const communityItems = [
    {
      title: t.events,
      url: "/events",
      icon: Calendar,
    },
    {
      title: t.ideasHub,
      url: "/ideas",
      icon: Lightbulb,
    },
    {
      title: t.donations,
      url: "/donations",
      icon: Heart,
    },
    {
      title: t.duesPayment,
      url: "/dues",
      icon: DollarSign,
    },
  ];

  const knowledgeItems = [
    {
      title: t.politicalLiteracy,
      url: "/political-literacy",
      icon: GraduationCap,
    },
    {
      title: t.knowledgeBase,
      url: "/knowledge-base",
      icon: BookOpen,
    },
    {
      title: t.aboutAPC,
      url: "/about",
      icon: Info,
    },
  ];

  const monitoringItems = [
    {
      title: t.situationRoom,
      url: "/situation-room",
      icon: Activity,
    },
    {
      title: t.eventsGallery,
      url: "/events-gallery",
      icon: Image,
    },
    {
      title: t.leadership,
      url: "/leadership-board",
      icon: Shield,
    },
  ];

  const adminItems = [
    {
      title: t.analytics,
      url: "/analytics",
      icon: TrendingUp,
    },
  ];

  const settingsItems = [
    {
      title: t.notificationSettings,
      url: "/settings/notifications",
      icon: Bell,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div 
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-3 hover-elevate rounded-md p-2 cursor-pointer" 
          data-testid="link-home"
        >
          <img src={apcLogo} alt="APC Logo" className="h-10 w-10 object-contain" />
          <div>
            <h2 className="font-display text-lg font-bold text-primary">{t.appName}</h2>
            <p className="text-xs text-muted-foreground">apcng.org</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionCore}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionPointsRewards}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pointsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionEngagement}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {engagementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionPolitical}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {politicalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionCommunity}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionKnowledge}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {knowledgeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionMonitoring}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitoringItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionSettings}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.role === "admin" || user?.role === "coordinator") && (
          <SidebarGroup>
            <SidebarGroupLabel>{t.sectionAdmin}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith('/admin')}>
                    <Link href="/admin/dashboard" data-testid="link-admin-panel">
                      <Settings className="h-4 w-4" />
                      <span>{t.adminPanel}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-4">
        {user && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout} 
            className="w-full"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.logout}
          </Button>
        )}
        <div className="text-xs text-muted-foreground text-center">
          <p className="font-semibold">© 2025 APC Nigeria</p>
          <a 
            href="https://apcng.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            apcng.org
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
