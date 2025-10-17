import { NewsCard } from "../news-card";
import heroImage from "@assets/generated_images/APC_youth_rally_hero_f3829ce8.png";

export default function NewsCardExample() {
  return (
    <div className="p-4 max-w-md">
      <NewsCard
        title="APC Youth Wing Launches Digital Membership Drive Across 36 States"
        excerpt="The All Progressives Congress youth wing has announced a comprehensive digital membership campaign targeting young Nigerians across all states."
        category="Membership"
        timestamp={new Date(Date.now() - 2 * 60 * 60 * 1000)}
        imageUrl={heroImage}
        likes={324}
        comments={45}
      />
    </div>
  );
}
