import { useLocation, Link } from "wouter";
import { Home, Users, Vote, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, path: "/dashboard", label: "Home" },
  { icon: Users, path: "/tasks", label: "Engage" },
  { icon: Vote, path: "/elections", label: "Vote" },
  { icon: Calendar, path: "/events", label: "Events" },
  { icon: User, path: "/profile", label: "Profile" },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ icon: Icon, path, label }) => {
          const isActive = location === path || 
            (path === "/dashboard" && location === "/");
          
          return (
            <Link key={path} href={path}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "text-primary"
                )}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
