import { VoteResultsChart } from "../vote-results-chart";

export default function VoteResultsChartExample() {
  return (
    <div className="p-4 max-w-2xl">
      <VoteResultsChart
        position="State Chairman - Lagos"
        status="completed"
        totalVotes={15420}
        results={[
          { candidateName: "Dr. Amina Bello", votes: 8234, percentage: 53.4, isWinner: true },
          { candidateName: "Hon. Chukwudi Okafor", votes: 4890, percentage: 31.7 },
          { candidateName: "Mrs. Fatima Ahmed", votes: 2296, percentage: 14.9 },
        ]}
      />
    </div>
  );
}
