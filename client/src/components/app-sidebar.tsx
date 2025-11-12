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
  Search,
  Bell,
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

const coreMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "News",
    url: "/news",
    icon: Newspaper,
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
];

const engagementItems = [
  {
    title: "Tasks & Jobs",
    url: "/tasks",
    icon: CheckSquare,
  },
  {
    title: "Rewards & Badges",
    url: "/rewards",
    icon: Award,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  },
  {
    title: "Invite & Earn",
    url: "/invite-earn",
    icon: UserPlus,
  },
];

const politicalItems = [
  {
    title: "Elections & Voting",
    url: "/elections",
    icon: Vote,
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: MessageSquare,
  },
  {
    title: "Volunteer Tasks",
    url: "/volunteer",
    icon: Briefcase,
  },
];

const communityItems = [
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "Ideas Hub",
    url: "/ideas",
    icon: Lightbulb,
  },
  {
    title: "Donations",
    url: "/donations",
    icon: Heart,
  },
  {
    title: "Dues Payment",
    url: "/dues",
    icon: DollarSign,
  },
];

const knowledgeItems = [
  {
    title: "Political Literacy",
    url: "/political-literacy",
    icon: GraduationCap,
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "About APC",
    url: "/about",
    icon: Info,
  },
];

const monitoringItems = [
  {
    title: "Situation Room",
    url: "/situation-room",
    icon: Activity,
  },
  {
    title: "Events Gallery",
    url: "/events-gallery",
    icon: Image,
  },
  {
    title: "Leadership",
    url: "/leadership-board",
    icon: Shield,
  },
];

const adminItems = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
  },
];

const settingsItems = [
  {
    title: "Notification Settings",
    url: "/settings/notifications",
    icon: Bell,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

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
            <h2 className="font-display text-lg font-bold text-primary">APC Connect</h2>
            <p className="text-xs text-muted-foreground">apcng.org</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
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
          <SidebarGroupLabel>Engagement</SidebarGroupLabel>
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
          <SidebarGroupLabel>Political Action</SidebarGroupLabel>
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
          <SidebarGroupLabel>Community</SidebarGroupLabel>
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
          <SidebarGroupLabel>Learn</SidebarGroupLabel>
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
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
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
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
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
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith('/admin')}>
                    <Link href="/admin/dashboard" data-testid="link-admin-panel">
                      <Settings className="h-4 w-4" />
                      <span>Admin Panel</span>
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
            Logout
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
