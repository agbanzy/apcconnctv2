import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Dues from "@/pages/dues";
import Events from "@/pages/events";
import Elections from "@/pages/elections";
import PoliticalLiteracy from "@/pages/political-literacy";
import Campaigns from "@/pages/campaigns";
import Leaderboard from "@/pages/leaderboard";
import MicroTasks from "@/pages/micro-tasks";
import SituationRoom from "@/pages/situation-room";
import News from "@/pages/news";
import NewsDetail from "@/pages/news-detail";
import Analytics from "@/pages/analytics";
import Volunteer from "@/pages/volunteer";
import Donations from "@/pages/donations";
import Ideas from "@/pages/ideas";
import KnowledgeBase from "@/pages/knowledge-base";
import ArticlePage from "@/pages/knowledge-base/article";
import About from "@/pages/about";
import EventsGallery from "@/pages/events-gallery";
import LeadershipBoard from "@/pages/leadership-board";
import NotFound from "@/pages/not-found";
import { ChatbotWidget } from "@/components/chatbot-widget";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminMembers from "@/pages/admin/members";
import AdminElections from "@/pages/admin/elections";
import AdminEvents from "@/pages/admin/events";
import AdminContent from "@/pages/admin/content";
import AdminCampaigns from "@/pages/admin/campaigns";
import AdminIncidents from "@/pages/admin/incidents";
import AdminSettings from "@/pages/admin/settings";
import AdminIdeas from "@/pages/admin/ideas";
import AdminKnowledge from "@/pages/admin/knowledge";
import AdminDonations from "@/pages/admin/donations";
import AdminChatbotAnalytics from "@/pages/admin/chatbot-analytics";
import { AdminSidebar } from "@/components/admin-sidebar";

function AppContent() {
  const { user, isLoading } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Skeleton className="h-32 w-64" />
        </div>
      );
    }
    
    if (!user) {
      return <Redirect to="/login" />;
    }
    
    return <Component />;
  }

  function AdminRoute({ component: Component }: { component: React.ComponentType }) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Skeleton className="h-32 w-64" />
        </div>
      );
    }
    
    if (!user) {
      return <Redirect to="/login" />;
    }

    if (user.role !== "admin" && user.role !== "coordinator") {
      return <Redirect to="/dashboard" />;
    }
    
    return <Component />;
  }

  if (!user && !isLoading) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={Landing} />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
    );
  }

  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-4 border-b">
              <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Switch>
                <Route path="/admin/dashboard" component={() => <AdminRoute component={AdminDashboard} />} />
                <Route path="/admin/members" component={() => <AdminRoute component={AdminMembers} />} />
                <Route path="/admin/elections" component={() => <AdminRoute component={AdminElections} />} />
                <Route path="/admin/events" component={() => <AdminRoute component={AdminEvents} />} />
                <Route path="/admin/content" component={() => <AdminRoute component={AdminContent} />} />
                <Route path="/admin/campaigns" component={() => <AdminRoute component={AdminCampaigns} />} />
                <Route path="/admin/incidents" component={() => <AdminRoute component={AdminIncidents} />} />
                <Route path="/admin/ideas" component={() => <AdminRoute component={AdminIdeas} />} />
                <Route path="/admin/knowledge" component={() => <AdminRoute component={AdminKnowledge} />} />
                <Route path="/admin/donations" component={() => <AdminRoute component={AdminDonations} />} />
                <Route path="/admin/chatbot-analytics" component={() => <AdminRoute component={AdminChatbotAnalytics} />} />
                <Route path="/admin/settings" component={() => <AdminRoute component={AdminSettings} />} />
                <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs">
                  3
                </Badge>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/login" component={() => <Redirect to="/dashboard" />} />
              <Route path="/register" component={() => <Redirect to="/dashboard" />} />
              <Route path="/" component={() => <Redirect to="/dashboard" />} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Home} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
              <Route path="/dues" component={() => <ProtectedRoute component={Dues} />} />
              <Route path="/donations" component={() => <ProtectedRoute component={Donations} />} />
              <Route path="/events" component={() => <ProtectedRoute component={Events} />} />
              <Route path="/elections" component={() => <ProtectedRoute component={Elections} />} />
              <Route path="/political-literacy" component={() => <ProtectedRoute component={PoliticalLiteracy} />} />
              <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
              <Route path="/leaderboard" component={() => <ProtectedRoute component={Leaderboard} />} />
              <Route path="/micro-tasks" component={() => <ProtectedRoute component={MicroTasks} />} />
              <Route path="/situation-room" component={() => <ProtectedRoute component={SituationRoom} />} />
              <Route path="/news/:id" component={() => <ProtectedRoute component={NewsDetail} />} />
              <Route path="/news" component={() => <ProtectedRoute component={News} />} />
              <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
              <Route path="/volunteer" component={() => <ProtectedRoute component={Volunteer} />} />
              <Route path="/ideas" component={() => <ProtectedRoute component={Ideas} />} />
              <Route path="/knowledge-base/article/:slug" component={() => <ProtectedRoute component={ArticlePage} />} />
              <Route path="/knowledge-base" component={() => <ProtectedRoute component={KnowledgeBase} />} />
              <Route path="/about" component={() => <ProtectedRoute component={About} />} />
              <Route path="/events-gallery" component={() => <ProtectedRoute component={EventsGallery} />} />
              <Route path="/leadership-board" component={() => <ProtectedRoute component={LeadershipBoard} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <ChatbotWidget />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
            <PWAInstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
