import { MessageCircle } from "lucide-react";

export function Footer() {
  const whatsappLink = "https://wa.me/2348135566973?text=Hello%20Innoedge%20Technologies";
  
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} APC Connect. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:text-primary transition-colors"
              data-testid="link-innoedge"
            >
              Innoedge Technologies
              <MessageCircle className="h-4 w-4 text-green-600" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
