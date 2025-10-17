import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4" data-testid="breadcrumb-nav">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <Link href={item.href}>
              <span className="hover:text-foreground cursor-pointer" data-testid={`breadcrumb-${index}`}>
                {item.label}
              </span>
            </Link>
          ) : (
            <span className="text-foreground font-medium" data-testid={`breadcrumb-${index}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
