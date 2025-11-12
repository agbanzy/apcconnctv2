import { db } from "../db";
import * as schema from "../../shared/schema";
import fs from "fs/promises";
import path from "path";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}

interface QuizData {
  quiz: {
    categories: {
      [key: string]: {
        name: string;
        questions: QuizQuestion[];
      };
    };
  };
}

const difficultyToPoints = {
  easy: 10,
  medium: 20,
  hard: 30,
};

export async function seedQuiz(filePath?: string) {
  const quizFilePath = filePath || process.env.QUIZ_FILE || path.join(process.cwd(), "attached_assets/apc_political_quiz_1762977072553.json");
  
  console.log(`📚 Loading quiz data from ${quizFilePath}...`);
  
  const fileContent = await fs.readFile(quizFilePath, "utf-8");
  const quizData: QuizData = JSON.parse(fileContent);
  
  const allQuestions: schema.InsertQuiz[] = [];
  
  for (const [categoryKey, categoryData] of Object.entries(quizData.quiz.categories)) {
    console.log(`  Processing category: ${categoryData.name} (${categoryData.questions.length} questions)`);
    
    for (const question of categoryData.questions) {
      allQuestions.push({
        question: question.question,
        options: [...question.options],
        correctAnswer: question.correct,
        category: categoryData.name,
        difficulty: question.difficulty,
        explanation: question.explanation,
        points: difficultyToPoints[question.difficulty],
      } as schema.InsertQuiz);
    }
  }
  
  console.log(`📝 Inserting ${allQuestions.length} quiz questions in batches...`);
  
  const batchSize = 200;
  let inserted = 0;
  
  for (let i = 0; i < allQuestions.length; i += batchSize) {
    const batch = allQuestions.slice(i, i + batchSize);
    await db.insert(schema.quizzes).values(batch as any);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${allQuestions.length} questions`);
  }
  
  console.log(`✅ Successfully seeded ${allQuestions.length} quiz questions!`);
  
  return allQuestions.length;
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-quiz');

if (isMainModule) {
  seedQuiz()
    .then((count) => {
      console.log(`\n🎉 Quiz seeding completed! Total questions: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Quiz seeding failed:", error);
      process.exit(1);
    });
}
