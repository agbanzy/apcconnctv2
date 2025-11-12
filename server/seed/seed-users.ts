import { db } from "../db";
import * as schema from "../../shared/schema";
import { desc } from "drizzle-orm";
import bcrypt from "bcrypt";

const nigerianFirstNames = [
  "Adebayo", "Chidinma", "Oluwaseun", "Ngozi", "Emeka", "Fatima", "Ibrahim", "Aisha",
  "Chukwuma", "Nneka", "Yusuf", "Zainab", "Tunde", "Amara", "Ahmed", "Blessing",
  "Chinedu", "Chiamaka", "Musa", "Hauwa", "Babatunde", "Folake", "Usman", "Khadija",
  "Ikechukwu", "Chioma", "Abdullahi", "Halima", "Olumide", "Funmilayo", "Sani", "Maryam",
  "Chidi", "Adaeze", "Mohammed", "Rakiya", "Olusegun", "Titilayo", "Aliyu", "Aishatu",
  "Ifeanyi", "Chinonso", "Buhari", "Safiya", "Kehinde", "Omolara", "Yakubu", "Jamila",
  "Chukwudi", "Ifeoma", "Bashir", "Asabe", "Adewale", "Adeola", "Garba", "Hadiza"
];

const nigerianLastNames = [
  "Adeyemi", "Okafor", "Bello", "Mohammed", "Eze", "Hassan", "Okonkwo", "Abdullahi",
  "Nwosu", "Musa", "Chukwu", "Ibrahim", "Okeke", "Ahmed", "Adekunle", "Yusuf",
  "Ogundele", "Suleiman", "Anyanwu", "Umar", "Ojo", "Saleh", "Ibekwe", "Ali",
  "Williams", "Lawal", "Obi", "Garba", "Obiora", "Sani", "Akinola", "Usman",
  "Okoro", "Aliyu", "Chinwe", "Yakubu", "Adeleke", "Bala", "Nnadi", "Abubakar",
  "Okafor", "Haruna", "Uzor", "Sadiq", "Afolabi", "Tijani", "Chukwuemeka", "Danjuma"
];

function generateNIN(): string {
  return `${Math.floor(10000000000 + Math.random() * 90000000000)}`;
}

function generatePhoneNumber(): string {
  const prefixes = ["0803", "0806", "0813", "0816", "0703", "0706", "0813", "0814", "0903", "0906"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${suffix}`;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domain = Math.random() > 0.5 ? "gmail.com" : "yahoo.com";
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`;
  return `${username}@${domain}`;
}

async function getNextMemberIdSequence(): Promise<number> {
  const result = await db.select({ memberId: schema.members.memberId })
    .from(schema.members)
    .orderBy(desc(schema.members.memberId))
    .limit(1);
  
  if (result.length === 0) {
    return 10000;
  }
  
  const lastId = result[0].memberId;
  const match = lastId.match(/APC-\d{4}-NG-(\d+)/);
  return match ? parseInt(match[1]) + 1 : 10000;
}

let memberIdCounter = 10000;
function generateMemberId(): string {
  const year = new Date().getFullYear();
  const seqNum = memberIdCounter++;
  return `APC-${year}-NG-${seqNum.toString().padStart(6, '0')}`;
}

export async function seedUsers(targetCount: number = 5000) {
  console.log(`👥 Generating ${targetCount} dummy users...`);
  
  memberIdCounter = await getNextMemberIdSequence();
  
  const wards = await db.select().from(schema.wards);
  console.log(`  Found ${wards.length} wards in database`);
  
  if (wards.length === 0) {
    throw new Error("No wards found! Please seed administrative boundaries first.");
  }
  
  const usersPerWard = Math.ceil(targetCount / wards.length);
  console.log(`  Creating ${usersPerWard} users per ward`);
  
  const defaultPassword = await bcrypt.hash("password123", 10);
  
  const batchSize = 500;
  let totalInserted = 0;
  
  for (let wardIndex = 0; wardIndex < wards.length; wardIndex++) {
    const ward = wards[wardIndex];
    const wardUsers: schema.InsertUser[] = [];
    const wardMembers: schema.InsertMember[] = [];
    
    for (let userIndex = 0; userIndex < usersPerWard; userIndex++) {
      const firstName = nigerianFirstNames[Math.floor(Math.random() * nigerianFirstNames.length)];
      const lastName = nigerianLastNames[Math.floor(Math.random() * nigerianLastNames.length)];
      const email = generateEmail(firstName, lastName, wardIndex * usersPerWard + userIndex);
      
      wardUsers.push({
        email,
        password: defaultPassword,
        firstName,
        lastName,
        phone: generatePhoneNumber(),
        role: "member",
      });
      
      const shouldHavePhoto = Math.random() > 0.7;
      const photoUrl = shouldHavePhoto 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&size=256&background=random`
        : null;
      
      wardMembers.push({
        userId: "",
        memberId: generateMemberId(),
        nin: generateNIN(),
        ninVerified: Math.random() > 0.3,
        wardId: ward.id,
        status: "active",
        photoUrl,
      } as schema.InsertMember);
    }
    
    if (wardUsers.length > 0) {
      const insertedUsers = await db.insert(schema.users).values(wardUsers).returning();
      
      for (let i = 0; i < wardMembers.length; i++) {
        wardMembers[i].userId = insertedUsers[i].id;
      }
      
      await db.insert(schema.members).values(wardMembers as any);
      totalInserted += wardUsers.length;
      console.log(`  Progress: ${totalInserted}/${targetCount} users (${Math.round(totalInserted / targetCount * 100)}%)`);
    }
    
    if ((wardIndex + 1) % 10 === 0 || wardIndex === wards.length - 1) {
      console.log(`  Completed ${wardIndex + 1}/${wards.length} wards`);
    }
  }
  
  console.log(`✅ Successfully seeded ${totalInserted} users and members!`);
  return totalInserted;
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-users');

if (isMainModule) {
  seedUsers()
    .then((count) => {
      console.log(`\n🎉 User seeding completed! Total users: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ User seeding failed:", error);
      process.exit(1);
    });
}
