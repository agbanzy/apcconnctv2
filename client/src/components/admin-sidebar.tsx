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
            <p className="text-xs text-muted-foreground">APC Connect</p>
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
      <SidebarFooter className="p-4">
        <Link href="/dashboard">
          <div className="text-sm text-muted-foreground hover-elevate p-2 rounded-md cursor-pointer" data-testid="link-back-to-app">
            ← Back to App
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
