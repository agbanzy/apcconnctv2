import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1" data-testid="link-home">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">APC</span>
                </div>
                <span className="text-xl font-bold hidden sm:inline">{t.appName}</span>
              </a>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#features" 
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate active-elevate-2 rounded-md"
                data-testid="link-features"
              >
                {t.features}
              </a>
              <a 
                href="#how-it-works" 
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate active-elevate-2 rounded-md"
                data-testid="link-how-it-works"
              >
                {t.howItWorks}
              </a>
              <a 
                href="#impact" 
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate active-elevate-2 rounded-md"
                data-testid="link-impact"
              >
                {t.ourImpact}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  {t.login}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="button-register">
                  {t.register}
                </Button>
              </Link>
              <LanguageSelector />
            </div>

            <div className="sm:hidden flex items-center gap-2">
              <LanguageSelector />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4" data-testid="mobile-menu">
            <nav className="flex flex-col gap-2">
              <a 
                href="#features" 
                className="px-3 py-2 text-sm font-medium hover-elevate active-elevate-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-features"
              >
                {t.features}
              </a>
              <a 
                href="#how-it-works" 
                className="px-3 py-2 text-sm font-medium hover-elevate active-elevate-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-how-it-works"
              >
                {t.howItWorks}
              </a>
              <a 
                href="#impact" 
                className="px-3 py-2 text-sm font-medium hover-elevate active-elevate-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-impact"
              >
                {t.ourImpact}
              </a>
              <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                <Link href="/login">
                  <Button variant="ghost" className="w-full justify-start" data-testid="mobile-button-login">
                    {t.login}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="w-full" data-testid="mobile-button-register">
                    {t.register}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
