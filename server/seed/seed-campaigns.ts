import { db } from "../db";
import * as schema from "../../shared/schema";

interface CampaignTemplate {
  title: string;
  description: string;
  category: string;
}

const campaignTemplates: CampaignTemplate[] = [
  // Infrastructure
  { title: "Fix Lagos-Ibadan Expressway", description: "Campaign to demand immediate repairs and expansion of the Lagos-Ibadan expressway to reduce accidents and travel time. This critical highway needs urgent attention to improve safety and economic activities.", category: "infrastructure" },
  { title: "Rural Electrification in Kano", description: "Advocate for extending the national grid to remote villages in Kano State. Many communities still lack access to electricity, hindering education, healthcare, and economic development.", category: "infrastructure" },
  { title: "Clean Water for Adamawa Communities", description: "Push for construction of boreholes and water treatment plants in Adamawa State. Access to clean water is a basic right that many communities are still denied.", category: "infrastructure" },
  { title: "Port Harcourt Road Rehabilitation", description: "Demand immediate action on the deplorable road conditions in Port Harcourt. Poor roads are affecting businesses and quality of life for residents.", category: "infrastructure" },
  { title: "Abuja Metro Expansion", description: "Campaign for the completion and expansion of Abuja metro rail system. Public transportation is essential for reducing traffic congestion and pollution.", category: "infrastructure" },
  
  // Education
  { title: "Free Quality Education for All", description: "Advocate for completely free and quality education from primary to secondary level across Nigeria. Every child deserves access to quality education regardless of their background.", category: "education" },
  { title: "STEM Scholarships for Northern Youth", description: "Push for scholarship programs targeting STEM students in Northern states. We need to bridge the educational gap and create opportunities for youth in technology.", category: "education" },
  { title: "Renovate Public Schools in Ogun State", description: "Demand immediate renovation of dilapidated public schools in Ogun State. Students deserve conducive learning environments with proper facilities.", category: "education" },
  { title: "Teachers' Salary Improvement", description: "Campaign for better salaries and welfare packages for teachers nationwide. Quality education starts with motivated and well-compensated teachers.", category: "education" },
  { title: "Digital Literacy Program for Rural Schools", description: "Advocate for computer labs and internet access in rural schools. Digital skills are essential for the 21st century workforce.", category: "education" },
  
  // Healthcare
  { title: "Free Maternal Healthcare in Sokoto", description: "Push for completely free maternal healthcare services in Sokoto State. Every mother deserves safe childbirth without financial barriers.", category: "healthcare" },
  { title: "Primary Healthcare Centers in Every Ward", description: "Campaign for building functional primary healthcare centers in every ward nationwide. Healthcare should be accessible to all Nigerians within walking distance.", category: "healthcare" },
  { title: "Medical Equipment for Teaching Hospitals", description: "Demand modern medical equipment for all federal teaching hospitals. Our hospitals need up-to-date technology to provide quality healthcare.", category: "healthcare" },
  { title: "Universal Health Insurance Coverage", description: "Advocate for comprehensive health insurance coverage for all Nigerians. Healthcare costs should not push families into poverty.", category: "healthcare" },
  { title: "Mental Health Awareness and Services", description: "Push for increased mental health services and awareness programs. Mental health is as important as physical health and deserves equal attention.", category: "healthcare" },
  
  // Security
  { title: "End Kidnapping in Niger State", description: "Demand immediate action to tackle the kidnapping menace in Niger State. Communities should be able to live without fear of abduction.", category: "security" },
  { title: "Community Policing Initiative", description: "Advocate for strengthening community policing across Nigeria. Local security solutions with community involvement are more effective.", category: "security" },
  { title: "Street Lighting for Lagos Safety", description: "Campaign for comprehensive street lighting in Lagos neighborhoods. Well-lit streets deter crime and improve quality of life.", category: "security" },
  { title: "Border Security Enhancement", description: "Push for better equipment and training for border security personnel. Secure borders are essential for national security and economic stability.", category: "security" },
  { title: "End Banditry in Zamfara", description: "Demand comprehensive military action and rehabilitation programs to end banditry in Zamfara State. People deserve to live and farm in peace.", category: "security" },
  
  // Youth Programs
  { title: "Tech Skills Training for Youth", description: "Advocate for government-sponsored tech training programs in all states. Young Nigerians need digital skills to compete globally.", category: "youth_programs" },
  { title: "Youth Entrepreneurship Fund", description: "Campaign for creation of accessible youth entrepreneurship funds. Young entrepreneurs need capital to turn their innovative ideas into reality.", category: "youth_programs" },
  { title: "Sports Development in Schools", description: "Push for investment in sports facilities and programs in public schools. Sports builds character and can be a pathway out of poverty.", category: "youth_programs" },
  { title: "National Youth Service Reform", description: "Demand reforms to make NYSC more impactful and beneficial for corps members. The program should better prepare youth for the workforce.", category: "youth_programs" },
  { title: "Job Creation in Manufacturing", description: "Advocate for policies that create manufacturing jobs for youth. Young Nigerians need meaningful employment opportunities.", category: "youth_programs" },
  
  // Economy
  { title: "Support Local Rice Farmers", description: "Campaign for better support and subsidies for local rice farmers. Nigeria can achieve rice self-sufficiency with proper support.", category: "economy" },
  { title: "SME Loan Access Program", description: "Push for easier access to loans for small and medium enterprises. SMEs are the backbone of the economy and need financial support.", category: "economy" },
  { title: "Reduce Petrol Prices", description: "Demand government action to reduce petrol prices and stabilize fuel supply. High fuel costs affect every aspect of Nigerian life.", category: "economy" },
  { title: "Electricity Tariff Reduction", description: "Campaign against arbitrary electricity tariff hikes. Nigerians should not pay more for epileptic power supply.", category: "economy" },
  { title: "Agricultural Mechanization", description: "Advocate for mechanization of agriculture across all states. Modern farming methods will increase food production and reduce costs.", category: "economy" },
  
  // Anti-Corruption
  { title: "Transparent Budget Implementation", description: "Demand full transparency in state and federal budget implementation. Every Nigerian has the right to know how public funds are spent.", category: "politics" },
  { title: "End Ghost Workers Syndrome", description: "Campaign for comprehensive audit and removal of ghost workers from government payroll. Public funds should not be wasted on non-existent employees.", category: "politics" },
  { title: "Asset Declaration Compliance", description: "Push for strict enforcement of asset declaration by all public office holders. Leaders must be accountable for their wealth.", category: "politics" },
  
  // Environment
  { title: "Stop Deforestation in Cross River", description: "Advocate for protection of Cross River forest reserves. Deforestation threatens biodiversity and contributes to climate change.", category: "environment" },
  { title: "Flood Control in Anambra", description: "Demand comprehensive flood control measures in Anambra State. Annual flooding displaces communities and destroys livelihoods.", category: "environment" },
  { title: "Waste Management in Kano", description: "Campaign for modern waste management systems in Kano metropolis. Clean cities improve health and quality of life.", category: "environment" },
  
  // Women's Rights
  { title: "35% Women Representation in Government", description: "Push for implementation of 35% affirmative action for women in government positions. Women deserve equal representation in leadership.", category: "politics" },
  { title: "End Gender-Based Violence", description: "Campaign for stronger laws and enforcement against gender-based violence. Every woman deserves to live free from violence and fear.", category: "politics" },
  
  // Disability Rights
  { title: "Accessibility for Persons with Disabilities", description: "Advocate for making all public buildings and transportation accessible to persons with disabilities. Accessibility is a right, not a privilege.", category: "politics" },
  { title: "Inclusive Education Policy", description: "Push for policies ensuring children with disabilities have access to quality education. No child should be left behind.", category: "education" },
];

function getRandomLocation(stateName: string): string {
  const locations = [
    `${stateName} State Secretariat`,
    `${stateName} Government House`,
    `${stateName} Capital City`,
    `Local Government Areas in ${stateName}`,
    `Rural Communities of ${stateName}`,
    `${stateName} Metropolitan Area`,
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function getRandomTargetVotes(): number {
  const targets = [1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
  return targets[Math.floor(Math.random() * targets.length)];
}

function getRandomCurrentVotes(targetVotes: number): number {
  // Random progress between 0% and 95% of target
  const progressPercent = Math.random() * 0.95;
  return Math.floor(targetVotes * progressPercent);
}

function getRandomStatus(): schema.IssueCampaign["status"] {
  const statuses: schema.IssueCampaign["status"][] = ["active", "approved", "completed", "rejected"];
  const weights = [60, 25, 10, 5]; // Higher weight for active campaigns
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return statuses[i];
    }
  }
  
  return "active";
}

export async function seedCampaigns(targetCount: number = 75) {
  console.log(`📢 Generating ${targetCount} political campaigns...`);
  
  // Get all states and members from database
  const states = await db.select().from(schema.states);
  const members = await db.select().from(schema.members);
  
  console.log(`  Found ${states.length} states and ${members.length} members`);
  
  if (states.length === 0) {
    throw new Error("No states found! Please seed administrative boundaries first.");
  }
  
  if (members.length === 0) {
    throw new Error("No members found! Please seed users/members first.");
  }
  
  const campaigns: schema.InsertCampaign[] = [];
  
  // Distribute campaigns across templates
  for (let i = 0; i < targetCount; i++) {
    const template = campaignTemplates[i % campaignTemplates.length];
    const randomState = states[Math.floor(Math.random() * states.length)];
    const randomMember = members[Math.floor(Math.random() * members.length)];
    const targetVotes = getRandomTargetVotes();
    
    // Personalize the title with state name for some campaigns
    const shouldPersonalize = Math.random() > 0.5;
    const title = shouldPersonalize 
      ? `${template.title} - ${randomState.name}`
      : template.title;
    
    const description = template.description + ` This campaign focuses on ${randomState.name} State and surrounding communities.`;
    
    campaigns.push({
      title,
      description,
      category: template.category,
      authorId: randomMember.id,
      targetVotes,
      currentVotes: getRandomCurrentVotes(targetVotes),
      status: getRandomStatus(),
    } as schema.InsertCampaign);
  }
  
  console.log(`💾 Inserting ${campaigns.length} campaigns in batches...`);
  
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < campaigns.length; i += batchSize) {
    const batch = campaigns.slice(i, i + batchSize);
    await db.insert(schema.issueCampaigns).values(batch as any);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${campaigns.length} campaigns`);
  }
  
  console.log(`✅ Successfully seeded ${campaigns.length} political campaigns!`);
  
  return campaigns.length;
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-campaigns');

if (isMainModule) {
  seedCampaigns()
    .then((count) => {
      console.log(`\n🎉 Campaign seeding completed! Total campaigns: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Campaign seeding failed:", error);
      process.exit(1);
    });
}
