import { VolunteerTaskCard } from "../volunteer-task-card";

export default function VolunteerTaskCardExample() {
  return (
    <div className="p-4 max-w-md">
      <VolunteerTaskCard
        title="Design Campaign Flyers for Lagos Rally"
        description="Create visually appealing campaign materials for our upcoming youth rally in Lagos. Must follow APC brand guidelines."
        location="Remote"
        skills={["Graphic Design", "Adobe Photoshop", "Social Media"]}
        points={250}
        deadline="March 25, 2024"
        difficulty="Medium"
      />
    </div>
  );
}
