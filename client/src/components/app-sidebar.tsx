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
  Bell,
  BadgeCheck,
  User,
  DollarSign,
  Trophy,
  CheckSquare,
  Activity,
  Newspaper,
  LogOut,
  Lightbulb,
  Heart,
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

const menuItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Dues",
    url: "/dues",
    icon: DollarSign,
  },
  {
    title: "Donations",
    url: "/donations",
    icon: Heart,
  },
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "Elections",
    url: "/elections",
    icon: Vote,
  },
  {
    title: "Ideas",
    url: "/ideas",
    icon: Lightbulb,
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "Political Literacy",
    url: "/political-literacy",
    icon: BookOpen,
  },
  {
    title: "Volunteer",
    url: "/volunteer",
    icon: Briefcase,
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: MessageSquare,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  },
  {
    title: "Micro Tasks",
    url: "/micro-tasks",
    icon: CheckSquare,
  },
  {
    title: "Situation Room",
    url: "/situation-room",
    icon: Activity,
  },
  {
    title: "News",
    url: "/news",
    icon: Newspaper,
  },
];

const adminItems = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
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
            <p className="text-xs text-muted-foreground">Modernizing Politics</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
        <div className="text-xs text-muted-foreground">
          <p>© 2025 APC Connect</p>
          <p>All rights reserved</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
