import { QuizCard } from "../quiz-card";

export default function QuizCardExample() {
  return (
    <div className="p-4 max-w-2xl">
      <QuizCard
        question="What is the primary focus of APC's youth employment initiative?"
        options={[
          "Skill acquisition and entrepreneurship training",
          "Government job placement only",
          "Financial loans without training",
          "Overseas employment programs"
        ]}
        correctAnswer={0}
        category="Party Manifesto"
        points={50}
      />
    </div>
  );
}
