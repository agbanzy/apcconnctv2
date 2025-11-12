import { db } from "../db";
import * as schema from "../../shared/schema";

const eventCategories = [
  "Town Hall",
  "Rally",
  "Summit",
  "Training",
  "Fundraiser",
  "Community Outreach",
  "Youth Forum",
  "Women's Conference",
  "Leadership Workshop",
  "Policy Dialogue",
];

const eventTitles: Record<string, string[]> = {
  "Town Hall": [
    "Town Hall Meeting with Constituents",
    "Community Listening Session",
    "People's Forum: Your Voice Matters",
    "Ward Development Discussion",
    "Meet Your Representatives",
  ],
  "Rally": [
    "Youth Mobilization Rally",
    "Progressive March for Change",
    "Unity Rally for Development",
    "Support Rally for Good Governance",
    "Victory Celebration Rally",
  ],
  "Summit": [
    "APC Leadership Summit",
    "State Development Summit",
    "Economic Growth Summit",
    "Education Reform Summit",
    "Healthcare Innovation Summit",
  ],
  "Training": [
    "Campaign Volunteers Training",
    "Political Education Workshop",
    "Grassroots Organizing Skills",
    "Digital Campaign Training",
    "Leadership Development Program",
  ],
  "Fundraiser": [
    "Campaign Fundraising Dinner",
    "Development Projects Fundraiser",
    "Community Support Fundraiser",
    "Party Building Fundraiser",
    "Election Campaign Fundraiser",
  ],
  "Community Outreach": [
    "Free Medical Outreach",
    "Back-to-School Support Program",
    "Community Clean-up Campaign",
    "Food Distribution Program",
    "Skills Acquisition Outreach",
  ],
  "Youth Forum": [
    "Youth Empowerment Forum",
    "Tech Skills for Youth",
    "Young Leaders Dialogue",
    "Student Engagement Session",
    "Youth in Politics Forum",
  ],
  "Women's Conference": [
    "Women in Leadership Conference",
    "Women Empowerment Summit",
    "Gender Equality Dialogue",
    "Women's Economic Forum",
    "Women in Politics Conference",
  ],
  "Leadership Workshop": [
    "Emerging Leaders Workshop",
    "Political Leadership Training",
    "Community Leaders Forum",
    "Ward Coordinators Workshop",
    "Effective Governance Workshop",
  ],
  "Policy Dialogue": [
    "Education Policy Roundtable",
    "Healthcare Policy Dialogue",
    "Economic Development Forum",
    "Security Policy Discussion",
    "Infrastructure Planning Session",
  ],
};

const eventDescriptions: Record<string, string[]> = {
  "Town Hall": [
    "Join us for an interactive town hall meeting where community members can directly engage with party leaders and representatives. Share your concerns, ask questions, and participate in shaping our collective future.",
    "An open forum for constituents to discuss pressing community issues and development priorities. Your voice matters in building a better tomorrow for all.",
    "A platform for transparent dialogue between the people and their elected representatives. Come and make your voice heard on issues that matter to you.",
  ],
  "Rally": [
    "A massive mobilization event to demonstrate our commitment to progress and good governance. Join thousands of party faithful as we march for change and development.",
    "Rally alongside fellow progressives to show support for our party's vision of a better Nigeria. Together, we are stronger and our voice cannot be ignored.",
    "A celebration of our achievements and a demonstration of our resolve to continue the fight for development and prosperity for all Nigerians.",
  ],
  "Summit": [
    "A high-level summit bringing together party leaders, stakeholders, and experts to chart the course for sustainable development and effective governance.",
    "An intensive dialogue session focused on crafting innovative solutions to pressing challenges facing our state and nation.",
    "Strategic planning and collaboration forum for party leadership and key stakeholders to align on priorities and action plans.",
  ],
  "Training": [
    "Comprehensive training program to equip volunteers and members with the skills needed for effective grassroots mobilization and community engagement.",
    "Hands-on workshop covering modern campaign strategies, voter outreach techniques, and digital organizing tools.",
    "Capacity building session to strengthen our party's human resources and prepare members for leadership roles.",
  ],
  "Fundraiser": [
    "An exclusive fundraising event to support our campaign activities and community development projects. Your contribution makes a real difference.",
    "Join prominent party leaders and donors for a special fundraising dinner to support our vision of progress and development.",
    "Support the party's initiatives through this fundraising event. Every contribution helps us serve the people better.",
  ],
  "Community Outreach": [
    "Free community service program reaching out to underserved communities with essential services and support.",
    "APC's commitment to the people demonstrated through direct community intervention and support programs.",
    "Bringing hope and tangible support to communities in need. Join us in making a difference in people's lives.",
  ],
  "Youth Forum": [
    "Engaging the next generation of leaders in meaningful dialogue about their role in shaping Nigeria's future.",
    "Empowering young people with knowledge, skills, and opportunities to become active participants in nation building.",
    "A platform for youth to voice their aspirations, concerns, and ideas for a better society.",
  ],
  "Women's Conference": [
    "Celebrating women's achievements and discussing strategies for greater women participation in governance and leadership.",
    "Addressing gender equity issues and charting pathways for women's economic and political empowerment.",
    "Bringing together women leaders and advocates to strengthen women's voices in policy and decision-making.",
  ],
  "Leadership Workshop": [
    "Developing the next generation of party leaders through intensive leadership training and mentorship.",
    "Equipping current and aspiring leaders with the skills and knowledge needed for effective governance and representation.",
    "Interactive workshop focused on ethical leadership, community service, and effective communication.",
  ],
  "Policy Dialogue": [
    "Expert-led discussion on evidence-based policy solutions to critical challenges in education, healthcare, and economic development.",
    "Bringing together policymakers, experts, and stakeholders to deliberate on effective strategies for sustainable development.",
    "A platform for informed debate and consensus-building on key policy issues affecting our communities.",
  ],
};

function getRandomCategory(): string {
  return eventCategories[Math.floor(Math.random() * eventCategories.length)];
}

function getRandomTitle(category: string): string {
  const titles = eventTitles[category] || eventTitles["Town Hall"];
  return titles[Math.floor(Math.random() * titles.length)];
}

function getRandomDescription(category: string): string {
  const descriptions = eventDescriptions[category] || eventDescriptions["Town Hall"];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomDate(isPast: boolean): Date {
  const now = new Date();
  
  if (isPast) {
    // Random date in the past 6 months
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date;
  } else {
    // Random date in the next 6 months
    const daysAhead = Math.floor(Math.random() * 180) + 1;
    const date = new Date(now);
    date.setDate(date.getDate() + daysAhead);
    return date;
  }
}

function getRandomLocation(stateName: string): string {
  const locations = [
    `${stateName} State APC Secretariat`,
    `${stateName} Government House Banquet Hall`,
    `${stateName} Convention Center`,
    `${stateName} Central Mosque`,
    `${stateName} Cathedral Hall`,
    `${stateName} Community Center`,
    `${stateName} Town Hall`,
    `${stateName} Sports Stadium`,
    `${stateName} City Square`,
    `Ward 1, ${stateName}`,
    `Ward 5, ${stateName}`,
    `Local Government Headquarters, ${stateName}`,
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function getRandomMaxAttendees(): number {
  const sizes = [50, 100, 200, 300, 500, 1000, 2000, 5000];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

export async function seedEvents(targetCount: number = 250) {
  console.log(`📅 Generating ${targetCount} political events...`);
  
  // Get all states from database
  const states = await db.select().from(schema.states);
  
  console.log(`  Found ${states.length} states`);
  
  if (states.length === 0) {
    throw new Error("No states found! Please seed administrative boundaries first.");
  }
  
  const events: schema.InsertEvent[] = [];
  
  // Distribute events across states
  const eventsPerState = Math.ceil(targetCount / states.length);
  
  for (const state of states) {
    // Create events for this state
    const numEvents = Math.min(eventsPerState, targetCount - events.length);
    
    for (let i = 0; i < numEvents; i++) {
      const category = getRandomCategory();
      const title = getRandomTitle(category);
      const description = getRandomDescription(category);
      
      // 40% past events, 60% upcoming events
      const isPast = Math.random() < 0.4;
      const eventDate = getRandomDate(isPast);
      
      const location = getRandomLocation(state.name);
      const maxAttendees = getRandomMaxAttendees();
      
      events.push({
        title: `${title} - ${state.name}`,
        description,
        category,
        date: eventDate,
        location,
        stateId: state.id,
        maxAttendees,
      } as schema.InsertEvent);
    }
  }
  
  console.log(`💾 Inserting ${events.length} events in batches...`);
  
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await db.insert(schema.events).values(batch as any);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${events.length} events`);
  }
  
  console.log(`✅ Successfully seeded ${events.length} political events!`);
  
  return events.length;
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-events');

if (isMainModule) {
  seedEvents()
    .then((count) => {
      console.log(`\n🎉 Event seeding completed! Total events: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Event seeding failed:", error);
      process.exit(1);
    });
}
