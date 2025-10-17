import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface VoteResult {
  candidateName: string;
  votes: number;
  percentage: number;
  isWinner?: boolean;
}

interface VoteResultsChartProps {
  position: string;
  results: VoteResult[];
  totalVotes: number;
  status: "ongoing" | "completed";
}

export function VoteResultsChart({ position, results, totalVotes, status }: VoteResultsChartProps) {
  return (
    <Card data-testid="card-vote-results">
      <CardHeader className="gap-2 space-y-0">
        <div className="flex items-center justify-between">
          <CardTitle data-testid="text-position">{position}</CardTitle>
          <Badge variant={status === "completed" ? "default" : "secondary"} data-testid="badge-status">
            {status === "completed" ? "Final Results" : "Live Results"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Total Votes: <span className="font-mono font-semibold" data-testid="text-total-votes">{totalVotes.toLocaleString()}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((result, idx) => (
          <div key={idx} className="space-y-2" data-testid={`result-${idx}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid={`text-candidate-${idx}`}>{result.candidateName}</span>
                {result.isWinner && (
                  <CheckCircle2 className="h-4 w-4 text-chart-1" data-testid="icon-winner" />
                )}
              </div>
              <div className="text-right">
                <span className="font-mono font-bold tabular-nums" data-testid={`text-percentage-${idx}`}>
                  {result.percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground ml-2" data-testid={`text-votes-${idx}`}>
                  ({result.votes.toLocaleString()})
                </span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  result.isWinner ? "bg-chart-1" : "bg-chart-2"
                }`}
                style={{ width: `${result.percentage}%` }}
                data-testid={`bar-${idx}`}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
