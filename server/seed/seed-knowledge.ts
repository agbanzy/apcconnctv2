import { db } from "../db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

interface FactItem {
  id: number;
  type: "fact";
  content: string;
  source: string;
  year: number;
  category: string;
}

interface QuoteItem {
  id: number;
  type: "quote";
  content: string;
  speaker: string;
  position: string;
  context: string;
  year: number;
  category: string;
}

type KnowledgeItem = FactItem | QuoteItem;

interface Category {
  name: string;
  totalItems: number;
  items: KnowledgeItem[];
}

interface KnowledgeData {
  factsAndQuotes: {
    title: string;
    description: string;
    totalItems: number;
    categories: Record<string, Category>;
  };
}

export async function seedKnowledge(): Promise<number> {
  console.log("📚 Starting Political Facts & Quotes Knowledge Base Seeding...");
  console.log("-".repeat(60));

  try {
    const jsonPath = join(process.cwd(), "attached_assets", "apc_political_facts_quotes_1762977722190.json");
    
    console.log(`📖 Reading knowledge base from: ${jsonPath}`);
    const rawData = readFileSync(jsonPath, "utf-8");
    const data: KnowledgeData = JSON.parse(rawData);

    console.log(`✅ Loaded JSON successfully`);
    console.log(`   Total items to process: ${data.factsAndQuotes.totalItems}`);
    console.log(`   Categories: ${Object.keys(data.factsAndQuotes.categories).length}`);

    console.log("\n🗑️  Clearing existing data...");
    await db.execute(sql`TRUNCATE TABLE ${schema.politicalFacts} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${schema.politicalQuotes} RESTART IDENTITY CASCADE`);
    console.log("✅ Existing data cleared");

    const facts: schema.InsertPoliticalFact[] = [];
    const quotes: schema.InsertPoliticalQuote[] = [];

    console.log("\n📊 Processing categories...");
    for (const [categoryKey, categoryData] of Object.entries(data.factsAndQuotes.categories)) {
      console.log(`\n  Processing: ${categoryData.name} (${categoryData.totalItems} items)`);
      
      for (const item of categoryData.items) {
        if (item.type === "fact") {
          const factItem = item as FactItem;
          facts.push({
            externalId: factItem.id,
            content: factItem.content,
            source: factItem.source,
            year: factItem.year,
            category: categoryKey,
            subcategory: factItem.category,
          });
        } else if (item.type === "quote") {
          const quoteItem = item as QuoteItem;
          quotes.push({
            externalId: quoteItem.id,
            content: quoteItem.content,
            speaker: quoteItem.speaker,
            position: quoteItem.position,
            context: quoteItem.context,
            year: quoteItem.year,
            category: categoryKey,
          });
        }
      }
      
      console.log(`  ✅ Processed ${categoryData.items.length} items from ${categoryData.name}`);
    }

    console.log("\n💾 Inserting data into database...");
    console.log(`   Facts to insert: ${facts.length}`);
    console.log(`   Quotes to insert: ${quotes.length}`);

    if (facts.length > 0) {
      const batchSize = 100;
      let factCount = 0;
      
      for (let i = 0; i < facts.length; i += batchSize) {
        const batch = facts.slice(i, i + batchSize);
        await db.insert(schema.politicalFacts).values(batch);
        factCount += batch.length;
        process.stdout.write(`\r   Facts inserted: ${factCount}/${facts.length}`);
      }
      console.log("\n   ✅ All facts inserted successfully");
    }

    if (quotes.length > 0) {
      const batchSize = 100;
      let quoteCount = 0;
      
      for (let i = 0; i < quotes.length; i += batchSize) {
        const batch = quotes.slice(i, i + batchSize);
        await db.insert(schema.politicalQuotes).values(batch);
        quoteCount += batch.length;
        process.stdout.write(`\r   Quotes inserted: ${quoteCount}/${quotes.length}`);
      }
      console.log("\n   ✅ All quotes inserted successfully");
    }

    const totalInserted = facts.length + quotes.length;
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Knowledge Base Seeding Completed Successfully!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Political Facts: ${facts.length}`);
    console.log(`   • Political Quotes: ${quotes.length}`);
    console.log(`   • Total Items: ${totalInserted}`);
    console.log(`   • Categories: ${Object.keys(data.factsAndQuotes.categories).length}`);
    console.log("=".repeat(60) + "\n");

    return totalInserted;
  } catch (error) {
    console.error("\n❌ Knowledge Base Seeding Failed!");
    console.error("Error details:", error);
    throw error;
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  seedKnowledge()
    .then((count) => {
      console.log(`\n✨ Seeding completed: ${count} items inserted`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Seeding failed:", error);
      process.exit(1);
    });
}
