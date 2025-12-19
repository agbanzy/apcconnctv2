import { db } from "./db";
import { users, members, states, lgas, wards, events, elections, newsPosts, donations } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

async function exportTableToCSV(tableName: string, data: any[], outputDir: string) {
  if (!data || data.length === 0) {
    console.log(`No data found for ${tableName}`);
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const filePath = path.join(outputDir, `${tableName}.csv`);
  fs.writeFileSync(filePath, csvContent);
  console.log(`Exported ${data.length} rows to ${filePath}`);
}

async function main() {
  const outputDir = "./exports";
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Starting database export...\n");

  try {
    console.log("Exporting users...");
    const usersData = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    await exportTableToCSV("users", usersData, outputDir);

    console.log("Exporting members...");
    const membersData = await db.select().from(members);
    await exportTableToCSV("members", membersData, outputDir);

    console.log("Exporting states...");
    const statesData = await db.select().from(states);
    await exportTableToCSV("states", statesData, outputDir);

    console.log("Exporting LGAs...");
    const lgasData = await db.select().from(lgas);
    await exportTableToCSV("lgas", lgasData, outputDir);

    console.log("Exporting wards...");
    const wardsData = await db.select().from(wards);
    await exportTableToCSV("wards", wardsData, outputDir);

    console.log("Exporting events...");
    const eventsData = await db.select().from(events);
    await exportTableToCSV("events", eventsData, outputDir);

    console.log("Exporting elections...");
    const electionsData = await db.select().from(elections);
    await exportTableToCSV("elections", electionsData, outputDir);

    console.log("Exporting news posts...");
    const newsData = await db.select().from(newsPosts);
    await exportTableToCSV("news_posts", newsData, outputDir);

    console.log("Exporting donations...");
    const donationsData = await db.select().from(donations);
    await exportTableToCSV("donations", donationsData, outputDir);

    console.log("\n✅ Export complete! Files saved to ./exports/");
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
