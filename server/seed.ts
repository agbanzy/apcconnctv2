import { db } from "./db.js";
import * as schema from "@shared/schema";

// Nigerian States, LGAs, and sample Wards data
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

async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // Clear existing data in reverse order of dependencies
    console.log("Clearing existing location data...");
    await db.delete(schema.wards);
    await db.delete(schema.lgas);
    await db.delete(schema.states);

    let stateCount = 0;
    let lgaCount = 0;
    let wardCount = 0;

    // Insert states, LGAs, and wards
    for (const [stateName, stateData] of Object.entries(nigerianData)) {
      console.log(`Seeding ${stateName}...`);
      
      // Insert state
      const [state] = await db.insert(schema.states).values({
        name: stateName,
        code: stateName.substring(0, 3).toUpperCase()
      }).returning();
      
      stateCount++;

      // Insert LGAs and wards
      let lgaCounter = 1;
      for (const [lgaName, wards] of Object.entries(stateData.lgas)) {
        const [lga] = await db.insert(schema.lgas).values({
          name: lgaName,
          stateId: state.id,
          code: `${state.code}-LGA${String(lgaCounter).padStart(2, '0')}`
        }).returning();
        
        lgaCount++;
        lgaCounter++;

        // Insert wards with numbered codes to ensure uniqueness
        for (let i = 0; i < wards.length; i++) {
          const wardName = wards[i];
          await db.insert(schema.wards).values({
            name: wardName,
            lgaId: lga.id,
            code: `${lga.code}-W${String(i + 1).padStart(2, '0')}`,
            wardNumber: i + 1
          });
          wardCount++;
        }
      }
    }

    console.log("\n✅ Database seeding completed successfully!");
    console.log(`📊 Seeded: ${stateCount} states, ${lgaCount} LGAs, ${wardCount} wards`);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
