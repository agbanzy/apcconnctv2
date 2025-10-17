import { BadgeDisplay } from "../badge-display";

export default function BadgeDisplayExample() {
  return (
    <div className="p-4 max-w-4xl">
      <BadgeDisplay
        totalPoints={2450}
        badges={[
          {
            id: "grassroots-champion",
            name: "Grassroots Champion",
            description: "Complete 10 ward-level activities",
            icon: "grassroots",
            earned: true,
            earnedDate: "Feb 15, 2024",
          },
          {
            id: "voter-mobilizer",
            name: "Voter Mobilizer",
            description: "Register 50+ new voters",
            icon: "voter",
            earned: true,
            earnedDate: "Mar 1, 2024",
          },
          {
            id: "party-champion",
            name: "Party Champion",
            description: "Achieve top ranking in state",
            icon: "champion",
            earned: false,
          },
          {
            id: "youth-activist",
            name: "Youth Activist",
            description: "Participate in 5 youth rallies",
            icon: "activist",
            earned: true,
            earnedDate: "Jan 20, 2024",
          },
          {
            id: "community-organizer",
            name: "Community Organizer",
            description: "Organize 3 community events",
            icon: "organizer",
            earned: false,
          },
          {
            id: "digital-pioneer",
            name: "Digital Pioneer",
            description: "Early adopter of APC Connect",
            icon: "pioneer",
            earned: true,
            earnedDate: "Jan 1, 2024",
          },
        ]}
      />
    </div>
  );
}
