import { db } from "./db.js";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const nigerianData = {
  "Lagos": {
    "lgas": {
      "Alimosho": ["Agbado", "Egbe", "Ikotun", "Idimu", "Ijegun"],
      "Ajeromi-Ifelodun": ["Ajeromi", "Olodi", "Layeni", "Temidire"],
      "Kosofe": ["Agboyi", "Kosofe", "Ikosi", "Ogudu"],
      "Mushin": ["Idi-Oro", "Odiolowo", "Itire-Ikate", "Odi-Olowo"],
      "Oshodi-Isolo": ["Oshodi", "Isolo", "Ajao Estate", "Mafoluku"],
      "Ojo": ["Ojo Town", "Ajangbadi", "Okokomaiko", "Satellite"],
      "Ikorodu": ["Ikorodu", "Ijede", "Imota", "Igbogbo"],
      "Surulere": ["Surulere", "Coker", "Itire", "Ijeshatedo"],
      "Agege": ["Agege", "Orile Agege", "Keke", "Dopemu"],
      "Ifako-Ijaiye": ["Ifako", "Ijaiye", "Ojokoro", "Iju"],
      "Somolu": ["Somolu", "Bariga", "Igbobi", "Fola Agoro"],
      "Amuwo-Odofin": ["Amuwo", "Festac", "Mile 2", "Kirikiri"],
      "Lagos Mainland": ["Yaba", "Ebute Metta", "Iddo", "Oyingbo"],
      "Ikeja": ["Ikeja GRA", "Allen", "Ojodu", "Oregun"],
      "Eti-Osa": ["Victoria Island", "Ikoyi", "Lekki", "Ajah"],
      "Badagry": ["Badagry", "Seme", "Ajara", "Iworo"],
      "Apapa": ["Apapa", "Ajegunle", "Marine Beach", "Sari-Iganmu"],
      "Lagos Island": ["Lagos Island", "Isale Eko", "Sandgrouse", "Adeniji"],
      "Epe": ["Epe", "Ejirin", "Eredo", "Poka"],
      "Ibeju-Lekki": ["Ibeju", "Lekki", "Akodo", "Orimedu"]
    }
  },
  "Kano": {
    "lgas": {
      "Kano Municipal": ["Fagge", "Dala", "Gwale", "Kumbotso"],
      "Nassarawa": ["Nassarawa", "Bompai", "Kurna", "Tudun Wada"],
      "Tarauni": ["Tarauni", "Unguwa Uku", "Rijiyar Zaki"],
      "Dala": ["Dala", "Gwammaja", "Goron Dutse"],
      "Kumbotso": ["Kumbotso", "Danbare", "Chiranchi"]
    }
  },
  "Kaduna": {
    "lgas": {
      "Kaduna North": ["Unguwan Rimi", "Tudun Wada", "Badiko"],
      "Kaduna South": ["Television", "Makera", "Badiko"],
      "Chikun": ["Gwagwada", "Kakau", "Nasarawa"],
      "Zaria": ["Sabon Gari", "Tudun Wada", "Zaria City"]
    }
  },
  "Rivers": {
    "lgas": {
      "Port Harcourt": ["Diobu", "Mile 1", "Trans-Amadi", "GRA"],
      "Obio-Akpor": ["Rumuolumeni", "Rumuokwurusi", "Elelenwo"],
      "Eleme": ["Eleme", "Akpajo", "Alode"],
      "Ikwerre": ["Isiokpo", "Elele", "Omerelu"]
    }
  },
  "Abuja FCT": {
    "lgas": {
      "Abuja Municipal": ["Garki", "Wuse", "Asokoro", "Maitama"],
      "Gwagwalada": ["Gwagwalada", "Tunga Maje", "Zuba"],
      "Kuje": ["Kuje", "Rubochi", "Chibiri"],
      "Bwari": ["Bwari", "Kubwa", "Dutse"]
    }
  },
  "Oyo": {
    "lgas": {
      "Ibadan North": ["Bodija", "Agodi", "Oke-Ado"],
      "Ibadan South-West": ["Oke-Bola", "Molete", "Ring Road"],
      "Egbeda": ["Egbeda", "Alakia", "Olodo"],
      "Akinyele": ["Moniya", "Akinyele", "Olorunsogo"]
    }
  },
  "Delta": {
    "lgas": {
      "Warri South": ["Warri", "Ugbomro", "Ogunu"],
      "Uvwie": ["Effurun", "Ekpan", "Ugbolokposo"],
      "Oshimili South": ["Asaba", "Cable Point", "Okpanam"],
      "Sapele": ["Sapele", "Okpe", "Elume"]
    }
  },
  "Anambra": {
    "lgas": {
      "Awka North": ["Achalla", "Amansea", "Isu-Aniocha"],
      "Awka South": ["Awka", "Nibo", "Isiagu"],
      "Onitsha North": ["Inland Town", "Fegge", "GRA"],
      "Onitsha South": ["Onitsha", "Fegge", "Woliwo"]
    }
  },
  "Katsina": {
    "lgas": {
      "Katsina": ["Katsina", "Kofar Sauri", "Kofar Marusa"],
      "Funtua": ["Funtua", "Dan Ali", "Batsari"],
      "Daura": ["Daura", "Maiadua", "Sandamu"],
      "Dutsin-Ma": ["Dutsin-Ma", "Kurfi", "Safana"]
    }
  },
  "Bauchi": {
    "lgas": {
      "Bauchi": ["Bauchi Central", "Hardo", "Galambi"],
      "Ningi": ["Ningi", "Burra", "Gwaram"],
      "Toro": ["Toro", "Jama'are", "Lame"]
    }
  },
  "Plateau": {
    "lgas": {
      "Jos North": ["Gangare", "Jenta Adamu", "Nasarawa"],
      "Jos South": ["Bukuru", "Gyel", "Vom"],
      "Jos East": ["Angware", "Fursum", "Kuru"]
    }
  },
  "Imo": {
    "lgas": {
      "Owerri Municipal": ["Owerri", "New Owerri", "Ikenegbu"],
      "Owerri North": ["Egbu", "Ihitta", "Obinze"],
      "Owerri West": ["Umuguma", "Eziobodo", "Nekede"]
    }
  },
  "Borno": {
    "lgas": {
      "Maiduguri": ["Maiduguri", "Bolori", "Gwange"],
      "Jere": ["Jere", "Mairi", "Addamari"],
      "Konduga": ["Konduga", "Mairamri", "Auno"]
    }
  },
  "Edo": {
    "lgas": {
      "Oredo": ["Benin City", "New Benin", "Ugbowo"],
      "Ikpoba-Okha": ["Idogbo", "Oregbeni", "Ugbor"],
      "Egor": ["Uselu", "Evbotubu", "Egor"]
    }
  },
  "Enugu": {
    "lgas": {
      "Enugu North": ["Ogui New Layout", "Abakpa", "GRA"],
      "Enugu South": ["Trans-Ekulu", "Uwani", "Achara"],
      "Enugu East": ["Emene", "Nike", "Obe"]
    }
  },
  "Sokoto": {
    "lgas": {
      "Sokoto North": ["Sokoto", "Runjin Sambo", "Mabera"],
      "Sokoto South": ["Sokoto South", "Sama", "Arkilla"],
      "Wamako": ["Wamako", "Gidan Madi", "Gawakuke"]
    }
  },
  "Kwara": {
    "lgas": {
      "Ilorin West": ["Ilorin", "Zango", "Adewole"],
      "Ilorin East": ["Sango", "Oke-Oyi", "Agaka"],
      "Ilorin South": ["Fufu", "Oke-Ose", "Ajikobi"]
    }
  },
  "Benue": {
    "lgas": {
      "Makurdi": ["Makurdi", "Wadata", "High Level"],
      "Gboko": ["Gboko", "Yandev", "Mbaketsa"],
      "Otukpo": ["Otukpo", "Adoka", "Ugbokolo"]
    }
  },
  "Niger": {
    "lgas": {
      "Minna": ["Minna", "Bosso", "Chanchaga"],
      "Suleja": ["Suleja", "Madalla", "Sabon Wuse"],
      "Bida": ["Bida", "Gbara", "Nassarawa"]
    }
  },
  "Abia": {
    "lgas": {
      "Aba North": ["Eziama", "St. Eugene", "Umuocham"],
      "Aba South": ["Aba", "Ogbor Hill", "Ngwa Road"],
      "Umuahia North": ["Umuahia", "Afara", "Ibeku"]
    }
  },
  "Akwa Ibom": {
    "lgas": {
      "Uyo": ["Uyo", "Etoi", "Use Offot"],
      "Eket": ["Eket", "Afaha", "Esit Urua"],
      "Ikot Ekpene": ["Ikot Ekpene", "Uruk Uso", "Ikot Udo"]
    }
  },
  "Cross River": {
    "lgas": {
      "Calabar Municipal": ["Calabar", "Henshaw", "Big Qua"],
      "Calabar South": ["Calabar South", "Ediba", "Anantigha"],
      "Ogoja": ["Ogoja", "Ekori", "Ishibori"]
    }
  },
  "Ebonyi": {
    "lgas": {
      "Abakaliki": ["Abakaliki", "Azuinyaba", "Amagu"],
      "Afikpo North": ["Afikpo", "Ozizza", "Amasiri"],
      "Ezza North": ["Ezza", "Oriuzor", "Ekka"]
    }
  },
  "Gombe": {
    "lgas": {
      "Gombe": ["Gombe", "Bajoga", "Nafada"],
      "Akko": ["Akko", "Garko", "Tukulma"],
      "Billiri": ["Billiri", "Kalmai", "Tal"]
    }
  },
  "Jigawa": {
    "lgas": {
      "Dutse": ["Dutse", "Kiyawa", "Limawa"],
      "Hadejia": ["Hadejia", "Majia", "Kafin Hausa"],
      "Gumel": ["Gumel", "Garki", "Maigatari"]
    }
  },
  "Kebbi": {
    "lgas": {
      "Birnin Kebbi": ["Birnin Kebbi", "Gwandu", "Kalgo"],
      "Argungu": ["Argungu", "Augie", "Bagudo"],
      "Yauri": ["Yauri", "Shanga", "Ngaski"]
    }
  },
  "Kogi": {
    "lgas": {
      "Lokoja": ["Lokoja", "Felele", "Adankolo"],
      "Okene": ["Okene", "Obangede", "Upogoro"],
      "Idah": ["Idah", "Ogugu", "Enjema"]
    }
  },
  "Nasarawa": {
    "lgas": {
      "Lafia": ["Lafia", "Assakio", "Shabu"],
      "Keffi": ["Keffi", "Kokona", "Nasarawa"],
      "Akwanga": ["Akwanga", "Wamba", "Nasarawa Eggon"]
    }
  },
  "Ogun": {
    "lgas": {
      "Abeokuta North": ["Abeokuta", "Isale-Igbein", "Ake"],
      "Abeokuta South": ["Ake", "Isabo", "Ijaye"],
      "Ifo": ["Ifo", "Ota", "Sango"],
      "Sagamu": ["Sagamu", "Makun", "Ogijo"]
    }
  },
  "Ondo": {
    "lgas": {
      "Akure South": ["Akure", "Oba-Ile", "Isikan"],
      "Akure North": ["Akure North", "Iju", "Ipinsa"],
      "Ondo West": ["Ondo", "Bolorunduro", "Ile-Oluji"]
    }
  },
  "Osun": {
    "lgas": {
      "Osogbo": ["Osogbo", "Oke-Baale", "Isale-Osun"],
      "Ife Central": ["Ile-Ife", "Moore", "Iremo"],
      "Ilesa East": ["Ilesa", "Ijebu-Jesa", "Erinmo"]
    }
  },
  "Taraba": {
    "lgas": {
      "Jalingo": ["Jalingo", "Kona", "Kachalla"],
      "Wukari": ["Wukari", "Bantaje", "Tsokundi"],
      "Bali": ["Bali", "Gassol", "Mutum-Biyu"]
    }
  },
  "Yobe": {
    "lgas": {
      "Damaturu": ["Damaturu", "Bindigari", "Sasawa"],
      "Potiskum": ["Potiskum", "Nangere", "Fika"],
      "Gashua": ["Gashua", "Bade", "Jakusko"]
    }
  },
  "Zamfara": {
    "lgas": {
      "Gusau": ["Gusau", "Tsafe", "Kaura Namoda"],
      "Talata Mafara": ["Talata Mafara", "Maradun", "Anka"],
      "Bungudu": ["Bungudu", "Maru", "Bukkuyum"]
    }
  },
  "Adamawa": {
    "lgas": {
      "Yola North": ["Yola", "Jimeta", "Doubeli"],
      "Yola South": ["Yola South", "Nassarawo", "Rumde"],
      "Mubi North": ["Mubi", "Gella", "Muchala"]
    }
  },
  "Bayelsa": {
    "lgas": {
      "Yenagoa": ["Yenagoa", "Epie", "Gbarain"],
      "Sagbama": ["Sagbama", "Adagbabiri", "Angalabiri"],
      "Brass": ["Brass", "Twon-Brass", "Okpoama"]
    }
  },
  "Ekiti": {
    "lgas": {
      "Ado-Ekiti": ["Ado", "Ilawe", "Igede"],
      "Ikere": ["Ikere", "Ise", "Emure"],
      "Ijero": ["Ijero", "Ido-Ile", "Ikoro"]
    }
  }
};

const nigerianNames = {
  firstNames: [
    "Chinedu", "Amaka", "Oluwaseun", "Chidinma", "Ibrahim", "Fatima", "Emeka", "Ngozi",
    "Tunde", "Yetunde", "Abdul", "Aisha", "Chukwuma", "Nneka", "Adewale", "Folake",
    "Mohammed", "Halima", "Obinna", "Chiamaka", "Ayo", "Bisi", "Usman", "Zainab",
    "Kelechi", "Ifeanyi", "Oluwatobi", "Temitope", "Musa", "Hauwa", "Chigozie", "Adaobi",
    "Kunle", "Ronke", "Ahmed", "Salamatu", "Chidi", "Oge", "Dele", "Funmi"
  ],
  lastNames: [
    "Okafor", "Adeyemi", "Bello", "Nwosu", "Williams", "Okonkwo", "Adesanya", "Ibrahim",
    "Ezeh", "Oluwole", "Abdullahi", "Eze", "Oladele", "Babangida", "Chikezie", "Adeleke",
    "Musa", "Okoli", "Ogundele", "Usman", "Nnamdi", "Adekunle", "Hassan", "Chukwu",
    "Oyedepo", "Suleiman", "Okeke", "Adebayo", "Yusuf", "Nwankwo", "Oladipo", "Aliyu"
  ]
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateNIN(): string {
  return Math.floor(10000000000 + Math.random() * 90000000000).toString();
}

function generateMemberId(year: number, counter: number): string {
  return `APC-${year}-NG-${String(counter).padStart(5, '0')}`;
}

async function seedDatabase() {
  console.log("Starting comprehensive database seeding...");

  try {
    console.log("\n📍 Step 1: Clearing existing data...");
    
    await db.delete(schema.postEngagement);
    await db.delete(schema.newsPosts);
    await db.delete(schema.campaignComments);
    await db.delete(schema.campaignVotes);
    await db.delete(schema.issueCampaigns);
    await db.delete(schema.quizAttempts);
    await db.delete(schema.quizzes);
    await db.delete(schema.taskCompletions);
    await db.delete(schema.microTasks);
    await db.delete(schema.taskApplications);
    await db.delete(schema.volunteerTasks);
    await db.delete(schema.eventRsvps);
    await db.delete(schema.events);
    await db.delete(schema.votes);
    await db.delete(schema.candidates);
    await db.delete(schema.elections);
    await db.delete(schema.userBadges);
    await db.delete(schema.userPoints);
    await db.delete(schema.badges);
    await db.delete(schema.incidentMedia);
    await db.delete(schema.incidents);
    await db.delete(schema.pollingUnits);
    await db.delete(schema.membershipDues);
    await db.delete(schema.notifications);
    await db.delete(schema.members);
    await db.delete(schema.users);
    await db.delete(schema.wards);
    await db.delete(schema.lgas);
    await db.delete(schema.states);

    console.log("\n📍 Step 2: Seeding States, LGAs, and Wards...");
    
    let stateCount = 0;
    let lgaCount = 0;
    let wardCount = 0;

    const statesMap = new Map();
    const lgasMap = new Map();
    const wardsArray = [];

    for (const [stateName, stateData] of Object.entries(nigerianData)) {
      const [state] = await db.insert(schema.states).values({
        name: stateName,
        code: stateName.substring(0, 3).toUpperCase()
      }).returning();
      
      statesMap.set(stateName, state);
      stateCount++;

      let lgaCounter = 1;
      for (const [lgaName, wards] of Object.entries(stateData.lgas)) {
        const [lga] = await db.insert(schema.lgas).values({
          name: lgaName,
          stateId: state.id,
          code: `${state.code}-LGA${String(lgaCounter).padStart(2, '0')}`
        }).returning();
        
        lgasMap.set(`${stateName}-${lgaName}`, lga);
        lgaCount++;
        lgaCounter++;

        for (let i = 0; i < wards.length; i++) {
          const wardName = wards[i];
          const [ward] = await db.insert(schema.wards).values({
            name: wardName,
            lgaId: lga.id,
            code: `${lga.code}-W${String(i + 1).padStart(2, '0')}`,
            wardNumber: i + 1
          }).returning();
          
          wardsArray.push(ward);
          wardCount++;
        }
      }
    }

    console.log(`✅ Seeded: ${stateCount} states, ${lgaCount} LGAs, ${wardCount} wards`);

    console.log("\n📍 Step 3: Creating Users and Members...");
    
    const hashedPassword = await bcrypt.hash("password123", 10);
    const users = [];
    const members = [];

    const adminUser = await db.insert(schema.users).values({
      email: "agbane6@gmail.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      phone: "+234 801 234 5678",
      role: "admin"
    }).returning();
    users.push(adminUser[0]);

    const adminWard = getRandomElement(wardsArray);
    const adminMember = await db.insert(schema.members).values({
      userId: adminUser[0].id,
      memberId: generateMemberId(2024, 1),
      nin: generateNIN(),
      wardId: adminWard.id,
      status: "active",
      joinDate: new Date("2024-01-15"),
      interests: ["governance", "youth empowerment", "technology"]
    }).returning();
    members.push(adminMember[0]);

    const coordinatorData = [
      { firstName: "Chiamaka", lastName: "Okonkwo", email: "chiamaka.okonkwo@apc.ng", phone: "+234 802 345 6789" },
      { firstName: "Ibrahim", lastName: "Yusuf", email: "ibrahim.yusuf@apc.ng", phone: "+234 803 456 7890" },
      { firstName: "Folake", lastName: "Adeyemi", email: "folake.adeyemi@apc.ng", phone: "+234 804 567 8901" }
    ];

    for (let i = 0; i < coordinatorData.length; i++) {
      const coord = coordinatorData[i];
      const [user] = await db.insert(schema.users).values({
        email: coord.email,
        password: hashedPassword,
        firstName: coord.firstName,
        lastName: coord.lastName,
        phone: coord.phone,
        role: "coordinator"
      }).returning();
      users.push(user);

      const ward = getRandomElement(wardsArray);
      const [member] = await db.insert(schema.members).values({
        userId: user.id,
        memberId: generateMemberId(2024, i + 2),
        nin: generateNIN(),
        wardId: ward.id,
        status: "active",
        joinDate: getRandomDate(new Date("2024-02-01"), new Date("2024-06-01")),
        interests: ["community development", "grassroots mobilization", "policy advocacy"]
      }).returning();
      members.push(member);
    }

    for (let i = 0; i < 17; i++) {
      const firstName = getRandomElement(nigerianNames.firstNames);
      const lastName = getRandomElement(nigerianNames.lastNames);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@apc.ng`;
      
      const [user] = await db.insert(schema.users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: `+234 ${800 + Math.floor(Math.random() * 99)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
        role: "member"
      }).returning();
      users.push(user);

      const ward = getRandomElement(wardsArray);
      const statuses = ["active", "active", "active", "pending", "expired"];
      const [member] = await db.insert(schema.members).values({
        userId: user.id,
        memberId: generateMemberId(2024, i + 5),
        nin: Math.random() > 0.2 ? generateNIN() : null,
        wardId: ward.id,
        status: getRandomElement(statuses),
        joinDate: getRandomDate(new Date("2024-01-01"), new Date("2025-01-01")),
        interests: getRandomElement([
          ["education", "healthcare"],
          ["security", "jobs"],
          ["infrastructure", "economy"],
          ["youth empowerment", "technology"],
          ["agriculture", "rural development"]
        ])
      }).returning();
      members.push(member);
    }

    console.log(`✅ Created ${users.length} users and ${members.length} members`);

    console.log("\n📍 Step 4: Creating News Posts...");
    
    const newsCategories = ["National", "State", "LGA", "Party News", "Policy Updates"];
    const newsPosts = [];

    const newsData = [
      { title: "APC Launches New Youth Empowerment Program", excerpt: "The party announces a comprehensive initiative to support young entrepreneurs across Nigeria", category: "National" },
      { title: "Lagos State Chapter Holds Town Hall Meeting", excerpt: "Members gather to discuss infrastructure development and community projects", category: "State" },
      { title: "Kano Youth Leader Addresses Education Reforms", excerpt: "Focus on improving educational facilities and teacher training programs", category: "State" },
      { title: "New Healthcare Initiative Announced for FCT", excerpt: "Free medical checkups and health awareness campaigns launched in Abuja", category: "LGA" },
      { title: "APC National Convention: Key Highlights", excerpt: "Party leaders outline vision for progressive governance and economic development", category: "Party News" },
      { title: "Infrastructure Development Plan for Southern Nigeria", excerpt: "Major road construction and power projects to commence in Q2", category: "Policy Updates" },
      { title: "Agricultural Support Program Launched", excerpt: "Farmers across northern states to receive subsidized inputs and training", category: "National" },
      { title: "Technology Hub Opens in Lagos", excerpt: "APC partners with tech companies to create digital skills training center", category: "State" },
      { title: "Women Empowerment Summit Scheduled", excerpt: "Female party members to discuss representation and economic opportunities", category: "Party News" },
      { title: "Security Forum Addresses Community Safety", excerpt: "Stakeholders meet to develop grassroots security strategies", category: "Policy Updates" },
      { title: "Education Scholarship Program Expanded", excerpt: "500 more students to benefit from APC education support initiative", category: "National" },
      { title: "Local Government Elections: Candidate Profiles", excerpt: "Meet the candidates vying for positions in upcoming LGA elections", category: "LGA" },
      { title: "Environmental Conservation Campaign Kicks Off", excerpt: "Tree planting and waste management initiatives across major cities", category: "National" }
    ];

    for (let i = 0; i < newsData.length; i++) {
      const news = newsData[i];
      const author = getRandomElement(users.slice(0, 5));
      const [post] = await db.insert(schema.newsPosts).values({
        title: news.title,
        excerpt: news.excerpt,
        content: `${news.excerpt}. This comprehensive initiative demonstrates the party's commitment to development and progress. Stakeholders across all levels have expressed strong support for these measures, which are expected to create lasting positive impact in communities nationwide.`,
        category: news.category,
        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 10000000}`,
        authorId: author.id,
        likes: Math.floor(Math.random() * 200),
        comments: Math.floor(Math.random() * 50),
        publishedAt: getRandomDate(new Date("2024-10-01"), new Date("2025-01-15"))
      }).returning();
      newsPosts.push(post);
    }

    for (let i = 0; i < 30; i++) {
      const post = getRandomElement(newsPosts);
      const member = getRandomElement(members);
      const types = ["like", "comment"];
      const type = getRandomElement(types);
      
      await db.insert(schema.postEngagement).values({
        postId: post.id,
        memberId: member.id,
        type,
        content: type === "comment" ? `This is a great initiative! Looking forward to seeing the impact in our communities.` : null,
        createdAt: getRandomDate(new Date(post.publishedAt), new Date())
      });
    }

    console.log(`✅ Created ${newsPosts.length} news posts with engagement`);

    console.log("\n📍 Step 5: Creating Events...");
    
    const eventsData = [
      { title: "Lagos Youth Rally", description: "Join us for a mega rally celebrating youth participation in governance", category: "Rally", location: "Tafawa Balewa Square, Lagos", maxAttendees: 5000 },
      { title: "Kano Town Hall Meeting", description: "Interactive session with party leaders on local development", category: "Town Hall", location: "Kano Municipal Hall", maxAttendees: 300 },
      { title: "FCT Leadership Summit", description: "Annual gathering of APC leaders and stakeholders", category: "Summit", location: "International Conference Centre, Abuja", maxAttendees: 1000 },
      { title: "Grassroots Mobilization Training", description: "Capacity building workshop for ward coordinators", category: "Training", location: "Lagos State APC Secretariat", maxAttendees: 150 },
      { title: "Community Outreach - Ikeja", description: "Meet and greet with constituents in Ikeja LGA", category: "Canvassing", location: "Ikeja Under Bridge", maxAttendees: 200 },
      { title: "Women in Politics Conference", description: "Empowering female members for greater participation", category: "Meeting", location: "Sheraton Hotel, Abuja", maxAttendees: 500 },
      { title: "Youth Skills Acquisition Program", description: "Free training in digital skills and entrepreneurship", category: "Training", location: "Kano Technology Hub", maxAttendees: 250 },
      { title: "Party Members Forum - Rivers", description: "Quarterly meeting for all party members in Rivers State", category: "Meeting", location: "Port Harcourt City Hall", maxAttendees: 400 },
      { title: "Electoral Strategy Workshop", description: "Planning session for upcoming elections", category: "Training", location: "Lagos Mainland", maxAttendees: 100 },
      { title: "National Unity Rally", description: "Celebrating Nigeria's diversity and APC's inclusive vision", category: "Rally", location: "Eagle Square, Abuja", maxAttendees: 10000 }
    ];

    const events = [];
    const now = new Date();
    
    for (let i = 0; i < eventsData.length; i++) {
      const eventData = eventsData[i];
      const isPast = i < 3;
      const isCurrent = i >= 3 && i < 5;
      
      const eventDate = isPast 
        ? getRandomDate(new Date("2024-09-01"), new Date("2024-12-31"))
        : isCurrent
        ? getRandomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
        : getRandomDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), new Date("2025-06-01"));
      
      const [event] = await db.insert(schema.events).values({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        date: eventDate,
        location: eventData.location,
        maxAttendees: eventData.maxAttendees,
        imageUrl: `https://images.unsplash.com/photo-${1550000000000 + i * 10000000}`,
        createdAt: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      }).returning();
      events.push(event);
    }

    for (let i = 0; i < 40; i++) {
      const event = getRandomElement(events);
      const member = getRandomElement(members);
      
      await db.insert(schema.eventRsvps).values({
        eventId: event.id,
        memberId: member.id,
        status: Math.random() > 0.1 ? "confirmed" : "cancelled",
        rsvpedAt: new Date(event.date.getTime() - Math.random() * 20 * 24 * 60 * 60 * 1000)
      });
    }

    console.log(`✅ Created ${events.length} events with RSVPs`);

    console.log("\n📍 Step 6: Creating Elections with Candidates and Votes...");
    
    const electionsData = [
      { 
        title: "Lagos State Youth Leader Election", 
        position: "State Youth Leader", 
        description: "Election for APC Youth Leader position in Lagos State",
        status: "completed" as const,
        state: "Lagos"
      },
      { 
        title: "Kano LGA Chairman Election", 
        position: "LGA Chairman", 
        description: "Election for party chairman in Kano Municipal LGA",
        status: "ongoing" as const,
        state: "Kano"
      },
      { 
        title: "FCT Women Leader Election", 
        position: "Women Leader", 
        description: "Election for FCT Women Leader position",
        status: "upcoming" as const,
        state: "Abuja FCT"
      },
      { 
        title: "National Organizing Secretary Election", 
        position: "National Organizing Secretary", 
        description: "National level election for organizing secretary",
        status: "upcoming" as const,
        state: null
      }
    ];

    const elections = [];
    const candidates = [];

    for (const electionData of electionsData) {
      const state = electionData.state ? statesMap.get(electionData.state) : null;
      
      let startDate, endDate;
      if (electionData.status === "completed") {
        startDate = new Date("2024-11-01");
        endDate = new Date("2024-11-15");
      } else if (electionData.status === "ongoing") {
        startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      }

      const [election] = await db.insert(schema.elections).values({
        title: electionData.title,
        description: electionData.description,
        position: electionData.position,
        stateId: state?.id || null,
        status: electionData.status,
        startDate,
        endDate,
        totalVotes: 0
      }).returning();
      elections.push(election);

      const numCandidates = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numCandidates; i++) {
        const firstName = getRandomElement(nigerianNames.firstNames);
        const lastName = getRandomElement(nigerianNames.lastNames);
        
        const [candidate] = await db.insert(schema.candidates).values({
          electionId: election.id,
          name: `${firstName} ${lastName}`,
          imageUrl: `https://i.pravatar.cc/300?u=${firstName}${lastName}`,
          manifesto: `I pledge to bring innovative solutions and inclusive leadership to the ${electionData.position} position. My focus will be on youth empowerment, grassroots mobilization, and transparent governance.`,
          experience: `${Math.floor(Math.random() * 10) + 5} years of active party membership and community service. Previous roles include ward coordinator and campaign manager.`,
          votes: 0
        }).returning();
        candidates.push(candidate);
      }
    }

    const completedElections = elections.filter(e => e.status === "completed");
    for (const election of completedElections) {
      const electionCandidates = candidates.filter(c => c.electionId === election.id);
      const numVoters = Math.floor(Math.random() * 30) + 20;
      
      for (let i = 0; i < numVoters; i++) {
        const voter = getRandomElement(members);
        const candidate = getRandomElement(electionCandidates);
        
        await db.insert(schema.votes).values({
          electionId: election.id,
          candidateId: candidate.id,
          voterId: voter.id,
          blockchainHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          castedAt: getRandomDate(election.startDate, election.endDate)
        });

        await db.update(schema.candidates)
          .set({ votes: candidate.votes + 1 })
          .where(eq(schema.candidates.id, candidate.id));
      }

      await db.update(schema.elections)
        .set({ totalVotes: numVoters })
        .where(eq(schema.elections.id, election.id));
    }

    console.log(`✅ Created ${elections.length} elections with ${candidates.length} candidates`);

    console.log("\n📍 Step 7: Creating Issue Campaigns...");
    
    const campaignsData = [
      { title: "Better Roads for Lagos", description: "Campaign for improved road infrastructure across Lagos State", category: "Infrastructure" },
      { title: "Youth Employment Initiative", description: "Push for job creation programs targeting young Nigerians", category: "Employment" },
      { title: "Improved Healthcare Access", description: "Demand for better healthcare facilities in rural areas", category: "Healthcare" },
      { title: "Free Education for All", description: "Campaign for accessible quality education", category: "Education" },
      { title: "Security in Northern States", description: "Call for enhanced security measures", category: "Security" },
      { title: "Power Supply Improvement", description: "Push for stable electricity across the nation", category: "Infrastructure" },
      { title: "Agricultural Subsidies", description: "Support for farmers with better subsidies", category: "Agriculture" }
    ];

    const campaigns = [];
    
    for (const campData of campaignsData) {
      const author = getRandomElement(members);
      const statuses = ["active", "approved", "completed"];
      const status = getRandomElement(statuses);
      
      const [campaign] = await db.insert(schema.issueCampaigns).values({
        title: campData.title,
        description: campData.description,
        category: campData.category,
        authorId: author.id,
        targetVotes: 5000,
        currentVotes: Math.floor(Math.random() * 3000) + 500,
        status: status as any,
        createdAt: getRandomDate(new Date("2024-08-01"), new Date("2024-12-01"))
      }).returning();
      campaigns.push(campaign);
    }

    for (let i = 0; i < 50; i++) {
      const campaign = getRandomElement(campaigns);
      const member = getRandomElement(members);
      
      await db.insert(schema.campaignVotes).values({
        campaignId: campaign.id,
        memberId: member.id,
        votedAt: getRandomDate(new Date(campaign.createdAt), new Date())
      });
    }

    for (let i = 0; i < 25; i++) {
      const campaign = getRandomElement(campaigns);
      const member = getRandomElement(members);
      
      await db.insert(schema.campaignComments).values({
        campaignId: campaign.id,
        memberId: member.id,
        content: "This is a critical issue that needs immediate attention. I fully support this campaign!",
        createdAt: getRandomDate(new Date(campaign.createdAt), new Date())
      });
    }

    console.log(`✅ Created ${campaigns.length} issue campaigns with votes and comments`);

    console.log("\n📍 Step 8: Creating Political Literacy Quizzes...");
    
    const quizzesData = [
      { 
        question: "What is the primary function of the Nigerian Senate?", 
        options: ["Make laws", "Enforce laws", "Interpret laws", "Execute laws"], 
        correctAnswer: 0, 
        category: "Constitution",
        points: 10
      },
      { 
        question: "How many states are in Nigeria?", 
        options: ["35", "36", "37", "38"], 
        correctAnswer: 1, 
        category: "Civics",
        points: 5
      },
      { 
        question: "What does APC stand for?", 
        options: ["All People's Congress", "All Progressives Congress", "African People's Congress", "African Progressives Congress"], 
        correctAnswer: 1, 
        category: "Party History",
        points: 5
      },
      { 
        question: "Who is the current President of Nigeria (as of 2024)?", 
        options: ["Muhammadu Buhari", "Bola Ahmed Tinubu", "Atiku Abubakar", "Peter Obi"], 
        correctAnswer: 1, 
        category: "Current Affairs",
        points: 10
      },
      { 
        question: "What is the minimum voting age in Nigeria?", 
        options: ["16", "17", "18", "21"], 
        correctAnswer: 2, 
        category: "Electoral Law",
        points: 5
      },
      { 
        question: "Which body conducts elections in Nigeria?", 
        options: ["EFCC", "INEC", "NERC", "NPC"], 
        correctAnswer: 1, 
        category: "Electoral Law",
        points: 10
      }
    ];

    const quizzes = [];
    
    for (const quizData of quizzesData) {
      const [quiz] = await db.insert(schema.quizzes).values({
        question: quizData.question,
        options: quizData.options,
        correctAnswer: quizData.correctAnswer,
        category: quizData.category,
        points: quizData.points
      }).returning();
      quizzes.push(quiz);
    }

    for (let i = 0; i < 40; i++) {
      const quiz = getRandomElement(quizzes);
      const member = getRandomElement(members);
      const selectedAnswer = Math.floor(Math.random() * 4);
      const isCorrect = selectedAnswer === quiz.correctAnswer;
      
      await db.insert(schema.quizAttempts).values({
        quizId: quiz.id,
        memberId: member.id,
        selectedAnswer,
        isCorrect,
        pointsEarned: isCorrect ? quiz.points : 0,
        attemptedAt: getRandomDate(new Date("2024-10-01"), new Date())
      });
    }

    console.log(`✅ Created ${quizzes.length} quizzes with attempts`);

    console.log("\n📍 Step 9: Creating Volunteer Tasks and Micro Tasks...");
    
    const volunteerTasksData = [
      { title: "Campaign Poster Distribution", description: "Distribute campaign posters across Lagos Mainland", location: "Lagos Mainland", skills: ["Communication", "Mobility"], points: 50, difficulty: "Easy" as const },
      { title: "Voter Registration Drive", description: "Assist citizens with voter registration", location: "Kano Municipal", skills: ["Communication", "Data Entry"], points: 100, difficulty: "Medium" as const },
      { title: "Town Hall Organization", description: "Help organize and coordinate town hall meeting", location: "Abuja Municipal", skills: ["Event Management", "Coordination"], points: 150, difficulty: "Hard" as const },
      { title: "Social Media Campaign", description: "Create and share social media content", location: "Remote", skills: ["Social Media", "Content Creation"], points: 75, difficulty: "Medium" as const },
      { title: "Community Survey", description: "Conduct door-to-door community needs assessment", location: "Ikeja", skills: ["Communication", "Data Collection"], points: 80, difficulty: "Medium" as const },
      { title: "Youth Mobilization", description: "Organize youth engagement activities", location: "Port Harcourt", skills: ["Leadership", "Communication"], points: 120, difficulty: "Hard" as const },
      { title: "Flyer Distribution", description: "Distribute informational flyers in neighborhood", location: "Surulere, Lagos", skills: ["Mobility"], points: 40, difficulty: "Easy" as const },
      { title: "Phone Banking", description: "Contact voters via phone to share information", location: "Remote", skills: ["Communication", "Persuasion"], points: 60, difficulty: "Easy" as const }
    ];

    const volunteerTasks = [];
    
    for (const taskData of volunteerTasksData) {
      const [task] = await db.insert(schema.volunteerTasks).values({
        title: taskData.title,
        description: taskData.description,
        location: taskData.location,
        skills: taskData.skills,
        points: taskData.points,
        deadline: getRandomDate(new Date(), new Date("2025-03-01")),
        difficulty: taskData.difficulty,
        maxVolunteers: Math.floor(Math.random() * 10) + 5,
        status: getRandomElement(["open", "in-progress", "completed"])
      }).returning();
      volunteerTasks.push(task);
    }

    for (let i = 0; i < 20; i++) {
      const task = getRandomElement(volunteerTasks);
      const member = getRandomElement(members);
      
      await db.insert(schema.taskApplications).values({
        taskId: task.id,
        memberId: member.id,
        status: getRandomElement(["pending", "accepted", "completed"]),
        appliedAt: getRandomDate(new Date("2024-11-01"), new Date())
      });
    }

    console.log(`✅ Created ${volunteerTasks.length} volunteer tasks with applications`);

    const microTasksData = [
      { title: "Share Party Post", description: "Share our latest Facebook post", category: "Social Media", points: 5, timeEstimate: "2 min" },
      { title: "Write Testimonial", description: "Share your APC membership experience", category: "Content", points: 15, timeEstimate: "10 min" },
      { title: "Invite Friends", description: "Invite 3 friends to join APC Connect", category: "Referral", points: 25, timeEstimate: "5 min" },
      { title: "Complete Profile", description: "Fill out all profile information", category: "Profile", points: 20, timeEstimate: "5 min" },
      { title: "Watch Training Video", description: "Watch grassroots mobilization video", category: "Training", points: 10, timeEstimate: "15 min" },
      { title: "Take Political Quiz", description: "Test your political knowledge", category: "Education", points: 15, timeEstimate: "10 min" },
      { title: "Attend Virtual Meeting", description: "Join online strategy session", category: "Engagement", points: 30, timeEstimate: "30 min" },
      { title: "Submit Policy Idea", description: "Share your policy suggestions", category: "Policy", points: 40, timeEstimate: "15 min" },
      { title: "Verify Your NIN", description: "Complete NIN verification", category: "Verification", points: 50, timeEstimate: "10 min" },
      { title: "Rate Recent Event", description: "Provide feedback on last event", category: "Feedback", points: 10, timeEstimate: "5 min" },
      { title: "Update Contact Info", description: "Ensure contact details are current", category: "Profile", points: 5, timeEstimate: "3 min" },
      { title: "Join WhatsApp Group", description: "Join your ward's WhatsApp group", category: "Communication", points: 15, timeEstimate: "2 min" }
    ];

    const microTasks = [];
    
    for (const taskData of microTasksData) {
      const [task] = await db.insert(schema.microTasks).values({
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        points: taskData.points,
        timeEstimate: taskData.timeEstimate
      }).returning();
      microTasks.push(task);
    }

    for (let i = 0; i < 30; i++) {
      const task = getRandomElement(microTasks);
      const member = getRandomElement(members);
      
      await db.insert(schema.taskCompletions).values({
        taskId: task.id,
        memberId: member.id,
        proofUrl: Math.random() > 0.5 ? `https://images.unsplash.com/photo-${Date.now() + i}` : null,
        status: getRandomElement(["pending", "approved", "rejected"]),
        completedAt: getRandomDate(new Date("2024-11-01"), new Date())
      });
    }

    console.log(`✅ Created ${microTasks.length} micro tasks with completions`);

    console.log("\n📍 Step 10: Creating Badges and Gamification...");
    
    const badgesData = [
      { name: "Grassroots Champion", description: "Awarded for exceptional community engagement", icon: "trophy", criteria: { type: "events_attended", value: 5 } },
      { name: "Early Adopter", description: "One of the first members on APC Connect", icon: "star", criteria: { type: "join_date", value: 1 } },
      { name: "Quiz Master", description: "Completed 10 political literacy quizzes", icon: "brain", criteria: { type: "quizzes_completed", value: 10 } },
      { name: "Volunteer Hero", description: "Completed 5 volunteer tasks", icon: "heart", criteria: { type: "tasks_completed", value: 5 } },
      { name: "Campaign Supporter", description: "Voted on 10 issue campaigns", icon: "megaphone", criteria: { type: "campaigns_voted", value: 10 } },
      { name: "Social Connector", description: "Referred 5 new members", icon: "users", criteria: { type: "referrals", value: 5 } },
      { name: "Active Voter", description: "Participated in 3 internal elections", icon: "vote", criteria: { type: "elections_voted", value: 3 } }
    ];

    const badges = [];
    
    for (const badgeData of badgesData) {
      const [badge] = await db.insert(schema.badges).values({
        name: badgeData.name,
        description: badgeData.description,
        icon: badgeData.icon,
        criteria: badgeData.criteria
      }).returning();
      badges.push(badge);
    }

    for (let i = 0; i < 15; i++) {
      const badge = getRandomElement(badges);
      const member = getRandomElement(members);
      
      await db.insert(schema.userBadges).values({
        memberId: member.id,
        badgeId: badge.id,
        earnedAt: getRandomDate(new Date("2024-10-01"), new Date())
      });
    }

    const pointSources = ["quiz", "task", "campaign", "event", "referral", "engagement"];
    for (let i = 0; i < 50; i++) {
      const member = getRandomElement(members);
      const source = getRandomElement(pointSources);
      const amount = Math.floor(Math.random() * 50) + 5;
      
      await db.insert(schema.userPoints).values({
        memberId: member.id,
        points: amount,
        source,
        amount,
        createdAt: getRandomDate(new Date("2024-10-01"), new Date())
      });
    }

    console.log(`✅ Created ${badges.length} badges and gamification points`);

    console.log("\n📍 Step 11: Creating Membership Dues Payments...");
    
    for (let i = 0; i < 15; i++) {
      const member = getRandomElement(members);
      const amounts = ["500.00", "1000.00", "2000.00", "5000.00"];
      const statuses = ["paid", "paid", "paid", "pending"];
      const status = getRandomElement(statuses);
      
      const dueDate = getRandomDate(new Date("2024-01-01"), new Date("2025-01-01"));
      
      await db.insert(schema.membershipDues).values({
        memberId: member.id,
        amount: getRandomElement(amounts),
        paymentMethod: status === "paid" ? "stripe" : "offline",
        stripePaymentId: status === "paid" ? `pi_${Math.random().toString(36).substring(2, 15)}` : null,
        status,
        dueDate,
        paidAt: status === "paid" ? getRandomDate(dueDate, new Date()) : null
      });
    }

    console.log(`✅ Created 15 dues payments`);

    console.log("\n📍 Step 12: Creating Polling Units and Incident Reports...");
    
    const pollingUnits = [];
    const selectedWards = wardsArray.slice(0, 15);
    
    for (let i = 0; i < 15; i++) {
      const ward = selectedWards[i];
      const [pollingUnit] = await db.insert(schema.pollingUnits).values({
        name: `PU ${String(i + 1).padStart(3, '0')} - ${ward.name}`,
        unitCode: `PU-${ward.code}-${String(i + 1).padStart(3, '0')}`,
        wardId: ward.id,
        status: getRandomElement(["active", "delayed", "completed", "incident"]),
        votes: Math.floor(Math.random() * 500) + 100,
        lastUpdate: getRandomDate(new Date("2024-12-01"), new Date())
      }).returning();
      pollingUnits.push(pollingUnit);
    }

    const incidentsData = [
      { severity: "low" as const, description: "Delayed opening of polling unit due to late arrival of materials" },
      { severity: "medium" as const, description: "Minor altercation between party agents, resolved peacefully" },
      { severity: "high" as const, description: "Suspected ballot box snatching attempt, security alerted" },
      { severity: "low" as const, description: "Malfunctioning card reader, replacement requested" },
      { severity: "medium" as const, description: "Overcrowding at polling unit, crowd control measures implemented" },
      { severity: "high" as const, description: "Attempted voter intimidation reported" },
      { severity: "low" as const, description: "Insufficient ballot papers, additional supplies delivered" }
    ];

    for (const incidentData of incidentsData) {
      const pollingUnit = getRandomElement(pollingUnits);
      const reporter = getRandomElement(members);
      
      await db.insert(schema.incidents).values({
        pollingUnitId: pollingUnit.id,
        reporterId: reporter.id,
        severity: incidentData.severity,
        description: incidentData.description,
        location: `${pollingUnit.name} location`,
        coordinates: { lat: 6.5 + Math.random(), lng: 3.3 + Math.random() },
        status: getRandomElement(["reported", "investigating", "resolved"]),
        createdAt: getRandomDate(new Date("2024-12-01"), new Date())
      });
    }

    console.log(`✅ Created ${pollingUnits.length} polling units and ${incidentsData.length} incident reports`);

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - ${stateCount} states`);
    console.log(`   - ${lgaCount} LGAs`);
    console.log(`   - ${wardCount} wards`);
    console.log(`   - ${users.length} users (1 admin, 3 coordinators, 17 members)`);
    console.log(`   - ${members.length} member records`);
    console.log(`   - ${newsPosts.length} news posts`);
    console.log(`   - ${events.length} events`);
    console.log(`   - ${elections.length} elections`);
    console.log(`   - ${campaigns.length} issue campaigns`);
    console.log(`   - ${quizzes.length} quizzes`);
    console.log(`   - ${volunteerTasks.length} volunteer tasks`);
    console.log(`   - ${microTasks.length} micro tasks`);
    console.log(`   - ${badges.length} badges`);
    console.log(`   - ${pollingUnits.length} polling units`);
    console.log(`   - ${incidentsData.length} incident reports`);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
