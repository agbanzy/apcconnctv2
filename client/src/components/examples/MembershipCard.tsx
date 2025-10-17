import { MembershipCard } from "../membership-card";

export default function MembershipCardExample() {
  return (
    <div className="p-4">
      <MembershipCard
        memberName="Adebayo Johnson"
        memberId="APC-2024-NG-12345"
        ward="Ward 5"
        lga="Lagos Island"
        state="Lagos"
        membershipStatus="active"
        joinDate="January 2024"
      />
    </div>
  );
}
