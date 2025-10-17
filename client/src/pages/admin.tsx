import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Vote, TrendingUp, Award, DollarSign, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Admin() {
  //todo: remove mock functionality
  const wardData = [
    { ward: "Ward 1", members: 234, dues: "₦1,170,000", engagement: 78 },
    { ward: "Ward 2", members: 189, dues: "₦945,000", engagement: 65 },
    { ward: "Ward 3", members: 312, dues: "₦1,560,000", engagement: 82 },
    { ward: "Ward 4", members: 276, dues: "₦1,380,000", engagement: 71 },
    { ward: "Ward 5", members: 298, dues: "₦1,490,000", engagement: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2" data-testid="text-page-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor membership, engagement, and financial metrics across wards and LGAs
          </p>
        </div>
        <Select defaultValue="lagos">
          <SelectTrigger className="w-[200px]" data-testid="select-state">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lagos">Lagos State</SelectItem>
            <SelectItem value="kano">Kano State</SelectItem>
            <SelectItem value="abuja">FCT Abuja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Members"
          value="12,458"
          change={15.2}
          icon={Users}
          description="Across all wards and LGAs"
        />
        <StatsCard
          title="Dues Collected"
          value="₦62.3M"
          change={23.8}
          icon={DollarSign}
          description="This month"
        />
        <StatsCard
          title="Avg. Engagement"
          value="76%"
          change={8.4}
          icon={TrendingUp}
          description="Member activity rate"
        />
        <StatsCard
          title="Active Volunteers"
          value="3,234"
          change={18.7}
          icon={Award}
          description="Completed tasks"
        />
        <StatsCard
          title="Primaries Votes"
          value="8,901"
          change={42.1}
          icon={Vote}
          description="Cast in current cycle"
        />
        <StatsCard
          title="Events This Month"
          value="47"
          change={12.3}
          icon={Calendar}
          description="Scheduled activities"
        />
      </div>

      <Card data-testid="card-ward-breakdown">
        <CardHeader>
          <CardTitle>Ward-Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-muted-foreground pb-2 border-b">
              <div>Ward</div>
              <div>Members</div>
              <div>Dues Collected</div>
              <div>Engagement</div>
            </div>
            {wardData.map((ward, idx) => (
              <div
                key={idx}
                className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg hover-elevate border"
                data-testid={`ward-${idx}`}
              >
                <div className="font-semibold">{ward.ward}</div>
                <div className="font-mono tabular-nums">{ward.members}</div>
                <div className="font-mono tabular-nums">{ward.dues}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${ward.engagement}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm tabular-nums">{ward.engagement}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
