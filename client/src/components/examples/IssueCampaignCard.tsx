import { IssueCampaignCard } from "../issue-campaign-card";

export default function IssueCampaignCardExample() {
  return (
    <div className="p-4 max-w-md">
      <IssueCampaignCard
        title="Youth Employment Initiative in Kano State"
        description="Proposal to establish skill acquisition centers in all 44 LGAs of Kano State, focusing on technology, agriculture, and entrepreneurship training for unemployed youth."
        author="Ibrahim Mohammed"
        category="Employment"
        votes={1847}
        targetVotes={5000}
        comments={123}
        status="active"
      />
    </div>
  );
}
