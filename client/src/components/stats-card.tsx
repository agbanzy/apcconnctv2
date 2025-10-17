import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, change, icon: Icon, description }: StatsCardProps) {
  const isPositive = change && change > 0;

  return (
    <Card data-testid={`card-stats-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl font-bold tabular-nums" data-testid="text-stats-value">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {isPositive ? (
              <ArrowUp className="h-3 w-3 text-chart-1" />
            ) : (
              <ArrowDown className="h-3 w-3 text-destructive" />
            )}
            <span className={isPositive ? "text-chart-1" : "text-destructive"} data-testid="text-stats-change">
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
