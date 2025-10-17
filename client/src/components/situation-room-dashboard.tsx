import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface PollingUnit {
  id: string;
  name: string;
  status: "active" | "delayed" | "completed" | "incident";
  votes: number;
  timestamp: string;
}

interface SituationRoomDashboardProps {
  pollingUnits: PollingUnit[];
  totalUnits: number;
}

export function SituationRoomDashboard({ pollingUnits, totalUnits }: SituationRoomDashboardProps) {
  const statusIcons = {
    active: <Clock className="h-4 w-4 text-chart-2" />,
    delayed: <AlertTriangle className="h-4 w-4 text-chart-4" />,
    completed: <CheckCircle className="h-4 w-4 text-chart-1" />,
    incident: <AlertTriangle className="h-4 w-4 text-destructive" />,
  };

  const statusColors = {
    active: "bg-chart-2 text-white",
    delayed: "bg-chart-4 text-white",
    completed: "bg-chart-1 text-white",
    incident: "bg-destructive text-destructive-foreground",
  };

  const completedCount = pollingUnits.filter((u) => u.status === "completed").length;
  const incidentCount = pollingUnits.filter((u) => u.status === "incident").length;

  return (
    <Card data-testid="card-situation-room">
      <CardHeader className="gap-3 space-y-0">
        <CardTitle>Election Day - Situation Room</CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Progress: </span>
            <span className="font-mono font-bold" data-testid="text-progress">
              {completedCount} / {totalUnits}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Incidents: </span>
            <span className="font-mono font-bold text-destructive" data-testid="text-incidents">
              {incidentCount}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pollingUnits.map((unit) => (
            <div
              key={unit.id}
              className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
              data-testid={`polling-unit-${unit.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center">
                  {statusIcons[unit.status]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold" data-testid={`text-unit-name-${unit.id}`}>
                      {unit.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${unit.id}`}>
                    {unit.timestamp}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unit.status === "completed" && (
                  <span className="font-mono text-sm" data-testid={`text-votes-${unit.id}`}>
                    {unit.votes} votes
                  </span>
                )}
                <Badge className={statusColors[unit.status]} data-testid={`badge-status-${unit.id}`}>
                  {unit.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
