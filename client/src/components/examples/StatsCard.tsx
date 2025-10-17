import { StatsCard } from "../stats-card";
import { Users } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Members"
        value="12,458"
        change={15.2}
        icon={Users}
      />
      <StatsCard
        title="Active Members"
        value="9,234"
        change={8.5}
        icon={Users}
      />
    </div>
  );
}
