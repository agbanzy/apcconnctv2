import { Switch, Route, Redirect, useLocation } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { Footer } from "@/components/footer";
import { AdminSidebar } from "@/components/admin-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

// Page Loader Component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  </div>
);

// Lazy load all public pages
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Profile = lazy(() => import("@/pages/profile"));
const Dues = lazy(() => import("@/pages/dues"));
const Events = lazy(() => import("@/pages/events"));
const Elections = lazy(() => import("@/pages/elections"));
const PoliticalLiteracy = lazy(() => import("@/pages/political-literacy"));
const Campaigns = lazy(() => import("@/pages/campaigns"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const MicroTasks = lazy(() => import("@/pages/micro-tasks"));
const SituationRoom = lazy(() => import("@/pages/situation-room"));
const News = lazy(() => import("@/pages/news"));
const NewsDetail = lazy(() => import("@/pages/news-detail"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Volunteer = lazy(() => import("@/pages/volunteer"));
const Donations = lazy(() => import("@/pages/donations"));
const Ideas = lazy(() => import("@/pages/ideas"));
const KnowledgeBase = lazy(() => import("@/pages/knowledge-base"));
const ArticlePage = lazy(() => import("@/pages/knowledge-base/article"));
const About = lazy(() => import("@/pages/about"));
const EventsGallery = lazy(() => import("@/pages/events-gallery"));
const LeadershipBoard = lazy(() => import("@/pages/leadership-board"));
const Tasks = lazy(() => import("@/pages/tasks"));
const InviteEarn = lazy(() => import("@/pages/invite-earn"));
const GeneralElections = lazy(() => import("@/pages/general-elections"));
const SearchPage = lazy(() => import("@/pages/search"));
const NotFound = lazy(() => import("@/pages/not-found"));
const IdCardVerify = lazy(() => import("@/pages/id-card-verify"));
const Rewards = lazy(() => import("@/pages/rewards"));
const NotificationSettings = lazy(() => import("@/pages/notification-settings"));
const PointsPage = lazy(() => import("@/pages/points"));
const PurchasePointsPage = lazy(() => import("@/pages/purchase-points"));
const UserTasksPage = lazy(() => import("@/pages/user-tasks"));
const ReferralsPage = lazy(() => import("@/pages/referrals"));
const RedeemPointsPage = lazy(() => import("@/pages/redeem-points"));
const RedemptionHistoryPage = lazy(() => import("@/pages/redemption-history"));
const AgentLogin = lazy(() => import("@/pages/agent-login"));

// Lazy load all admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminMembers = lazy(() => import("@/pages/admin/members"));
const AdminElections = lazy(() => import("@/pages/admin/elections"));
const AdminEvents = lazy(() => import("@/pages/admin/events"));
const AdminContent = lazy(() => import("@/pages/admin/content"));
const AdminCampaigns = lazy(() => import("@/pages/admin/campaigns"));
const AdminIncidents = lazy(() => import("@/pages/admin/incidents"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminIdeas = lazy(() => import("@/pages/admin/ideas"));
const AdminKnowledgeBase = lazy(() => import("@/pages/admin/knowledge-base"));
const AdminDonations = lazy(() => import("@/pages/admin/donations"));
const AdminChatbotAnalytics = lazy(() => import("@/pages/admin/chatbot-analytics"));
const AdminTasks = lazy(() => import("@/pages/admin/tasks"));
const AdminTaskApprovals = lazy(() => import("@/pages/admin/task-approvals"));
const AdminBadges = lazy(() => import("@/pages/admin/badges"));
const AdminDues = lazy(() => import("@/pages/admin/dues"));
const AdminRewardsSettings = lazy(() => import("@/pages/admin/rewards-settings"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/audit-logs"));
const AdminQuizzes = lazy(() => import("@/pages/admin/quizzes"));
const AdminAgentManagement = lazy(() => import("@/pages/admin/agent-management"));

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (location === "/agent") {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AgentLogin />
        </Suspense>
      </ErrorBoundary>
    );
  }

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

    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    );
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

    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    );
  }

  if (!user && !isLoading) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/id-card/verify/:memberId" component={IdCardVerify} />
            <Route path="/" component={Landing} />
            <Route component={() => <Redirect to="/" />} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    );
  }

  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
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
                <Suspense fallback={<PageLoader />}>
                  <Switch>
                    <Route path="/admin/dashboard" component={() => <AdminRoute component={AdminDashboard} />} />
                    <Route path="/admin/members" component={() => <AdminRoute component={AdminMembers} />} />
                    <Route path="/admin/dues" component={() => <AdminRoute component={AdminDues} />} />
                    <Route path="/admin/elections" component={() => <AdminRoute component={AdminElections} />} />
                    <Route path="/admin/events" component={() => <AdminRoute component={AdminEvents} />} />
                    <Route path="/admin/content" component={() => <AdminRoute component={AdminContent} />} />
                    <Route path="/admin/campaigns" component={() => <AdminRoute component={AdminCampaigns} />} />
                    <Route path="/admin/incidents" component={() => <AdminRoute component={AdminIncidents} />} />
                    <Route path="/admin/ideas" component={() => <AdminRoute component={AdminIdeas} />} />
                    <Route path="/admin/knowledge-base" component={() => <AdminRoute component={AdminKnowledgeBase} />} />
                    <Route path="/admin/donations" component={() => <AdminRoute component={AdminDonations} />} />
                    <Route path="/admin/chatbot-analytics" component={() => <AdminRoute component={AdminChatbotAnalytics} />} />
                    <Route path="/admin/tasks" component={() => <AdminRoute component={AdminTasks} />} />
                    <Route path="/admin/task-approvals" component={() => <AdminRoute component={AdminTaskApprovals} />} />
                    <Route path="/admin/badges" component={() => <AdminRoute component={AdminBadges} />} />
                    <Route path="/admin/quizzes" component={() => <AdminRoute component={AdminQuizzes} />} />
                    <Route path="/admin/agent-management" component={() => <AdminRoute component={AdminAgentManagement} />} />
                    <Route path="/admin/audit-logs" component={() => <AdminRoute component={AdminAuditLogs} />} />
                    <Route path="/admin/rewards-settings" component={() => <AdminRoute component={AdminRewardsSettings} />} />
                    <Route path="/admin/settings" component={() => <AdminRoute component={AdminSettings} />} />
                    <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />
                    <Route component={NotFound} />
                  </Switch>
                </Suspense>
              </main>
              <Footer />
            </div>
          </div>
          <ChatbotWidget />
        </SidebarProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/login" component={() => <Redirect to="/dashboard" />} />
                  <Route path="/register" component={() => <Redirect to="/dashboard" />} />
                  <Route path="/" component={() => <Redirect to="/dashboard" />} />
                  <Route path="/id-card/verify/:memberId" component={() => <ProtectedRoute component={IdCardVerify} />} />
                  <Route path="/dashboard" component={() => <ProtectedRoute component={Home} />} />
                  <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
                  <Route path="/dues" component={() => <ProtectedRoute component={Dues} />} />
                  <Route path="/donations" component={() => <ProtectedRoute component={Donations} />} />
                  <Route path="/events" component={() => <ProtectedRoute component={Events} />} />
                  <Route path="/elections" component={() => <ProtectedRoute component={Elections} />} />
                  <Route path="/political-literacy" component={() => <ProtectedRoute component={PoliticalLiteracy} />} />
                  <Route path="/quizzes" component={() => <ProtectedRoute component={PoliticalLiteracy} />} />
                  <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
                  <Route path="/leaderboard" component={() => <ProtectedRoute component={Leaderboard} />} />
                  <Route path="/micro-tasks" component={() => <ProtectedRoute component={MicroTasks} />} />
                  <Route path="/general-elections" component={() => <ProtectedRoute component={GeneralElections} />} />
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
                  <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
                  <Route path="/rewards" component={() => <ProtectedRoute component={Rewards} />} />
                  <Route path="/invite-earn" component={() => <ProtectedRoute component={InviteEarn} />} />
                  <Route path="/search" component={() => <ProtectedRoute component={SearchPage} />} />
                  <Route path="/settings/notifications" component={() => <ProtectedRoute component={NotificationSettings} />} />
                  <Route path="/points" component={() => <ProtectedRoute component={PointsPage} />} />
                  <Route path="/purchase-points" component={() => <ProtectedRoute component={PurchasePointsPage} />} />
                  <Route path="/redeem-points" component={() => <ProtectedRoute component={RedeemPointsPage} />} />
                  <Route path="/redemption-history" component={() => <ProtectedRoute component={RedemptionHistoryPage} />} />
                  <Route path="/user-tasks" component={() => <ProtectedRoute component={UserTasksPage} />} />
                  <Route path="/referrals" component={() => <ProtectedRoute component={ReferralsPage} />} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </main>
            <Footer />
          </div>
          <MobileBottomNav />
        </div>
        <ChatbotWidget />
      </SidebarProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
              <Toaster />
              <PWAInstallPrompt />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
