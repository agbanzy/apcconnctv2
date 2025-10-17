import { LeaderboardItem } from "../leaderboard-item";

export default function LeaderboardItemExample() {
  return (
    <div className="p-4 max-w-2xl space-y-3">
      <LeaderboardItem
        rank={1}
        name="Ibrahim Mohammed"
        points={3850}
        ward="Ward 7, Kano Municipal"
      />
      <LeaderboardItem
        rank={2}
        name="Chioma Okafor"
        points={3420}
        ward="Ward 3, Ikeja"
      />
      <LeaderboardItem
        rank={3}
        name="Adebayo Johnson"
        points={2890}
        ward="Ward 5, Lagos Island"
        isCurrentUser={true}
      />
    </div>
  );
}
