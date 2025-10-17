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
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
import Analytics from "@/pages/analytics";
import Volunteer from "@/pages/volunteer";
import NotFound from "@/pages/not-found";

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

  if (!user && !isLoading) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={Login} />
        <Route component={() => <Redirect to="/login" />} />
      </Switch>
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
              <Route path="/login" component={() => <Redirect to="/" />} />
              <Route path="/register" component={() => <Redirect to="/" />} />
              <Route path="/" component={() => <ProtectedRoute component={Home} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
              <Route path="/dues" component={() => <ProtectedRoute component={Dues} />} />
              <Route path="/events" component={() => <ProtectedRoute component={Events} />} />
              <Route path="/elections" component={() => <ProtectedRoute component={Elections} />} />
              <Route path="/political-literacy" component={() => <ProtectedRoute component={PoliticalLiteracy} />} />
              <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
              <Route path="/leaderboard" component={() => <ProtectedRoute component={Leaderboard} />} />
              <Route path="/micro-tasks" component={() => <ProtectedRoute component={MicroTasks} />} />
              <Route path="/situation-room" component={() => <ProtectedRoute component={SituationRoom} />} />
              <Route path="/news" component={() => <ProtectedRoute component={News} />} />
              <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
              <Route path="/volunteer" component={() => <ProtectedRoute component={Volunteer} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
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
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
