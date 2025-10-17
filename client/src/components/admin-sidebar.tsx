import {
  LayoutDashboard,
  Users,
  Vote,
  Calendar,
  FileText,
  MessageSquare,
  AlertTriangle,
  Settings,
  Shield,
  Lightbulb,
  BookOpen,
  Heart,
  MessageCircle,
  CheckSquare,
  Award,
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
import apcLogo from "@assets/logo_1760719840683.png";

const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    url: "/admin/members",
    icon: Users,
  },
  {
    title: "Elections",
    url: "/admin/elections",
    icon: Vote,
  },
  {
    title: "Events",
    url: "/admin/events",
    icon: Calendar,
  },
  {
    title: "Content",
    url: "/admin/content",
    icon: FileText,
  },
  {
    title: "Campaigns",
    url: "/admin/campaigns",
    icon: MessageSquare,
  },
  {
    title: "Incidents",
    url: "/admin/incidents",
    icon: AlertTriangle,
  },
  {
    title: "Ideas",
    url: "/admin/ideas",
    icon: Lightbulb,
  },
  {
    title: "Knowledge Base",
    url: "/admin/knowledge",
    icon: BookOpen,
  },
  {
    title: "Donations",
    url: "/admin/donations",
    icon: Heart,
  },
  {
    title: "Chatbot Analytics",
    url: "/admin/chatbot-analytics",
    icon: MessageCircle,
  },
  {
    title: "Tasks",
    url: "/admin/tasks",
    icon: CheckSquare,
  },
  {
    title: "Badges",
    url: "/admin/badges",
    icon: Award,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div 
          onClick={() => setLocation("/admin/dashboard")}
          className="flex items-center gap-3 hover-elevate rounded-md p-2 cursor-pointer" 
          data-testid="link-admin-home"
        >
          <div className="flex items-center justify-center h-10 w-10 bg-primary rounded-md">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">apcng.org</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        <Link href="/dashboard">
          <div className="text-sm text-muted-foreground hover-elevate p-2 rounded-md cursor-pointer" data-testid="link-back-to-app">
            ← Back to App
          </div>
        </Link>
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
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
