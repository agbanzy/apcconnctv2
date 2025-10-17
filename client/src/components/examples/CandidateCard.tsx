import { CandidateCard } from "../candidate-card";
import { RadioGroup } from "@/components/ui/radio-group";

export default function CandidateCardExample() {
  return (
    <div className="p-4 max-w-2xl">
      <RadioGroup defaultValue="candidate-1">
        <CandidateCard
          id="candidate-1"
          name="Dr. Amina Bello"
          position="State Chairman"
          manifesto="Focus on youth inclusion, digital transformation of party operations, and grassroots mobilization across all 36 states."
          experience="15 years in party leadership, former youth coordinator"
          selected={true}
        />
      </RadioGroup>
    </div>
  );
}
