import { MicroTaskCard } from "../micro-task-card";

export default function MicroTaskCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2 max-w-4xl">
      <MicroTaskCard
        title="Share APC Connect on Social Media"
        description="Share the APC Connect app on your social media platforms and help us reach more young Nigerians."
        points={25}
        timeEstimate="5 minutes"
        category="Social Sharing"
      />
      <MicroTaskCard
        title="Invite 5 Friends to Join APC"
        description="Invite at least 5 friends to join APC Connect and help grow our community."
        points={100}
        timeEstimate="15 minutes"
        category="Recruitment"
        completed={true}
      />
    </div>
  );
}
