import { getPool } from "../src/db";
import { v4 as uuidv4 } from "uuid";

async function createSamplePrompts() {
  try {
    const pool = await getPool();
    
    console.log("Creating sample VSTEP Speaking prompts...");
    
    // Part 1: Social Interaction (2 topics, each with 3 questions)
    const part1Prompts = [
      {
        title: "Your school",
        promptText: `Let's talk about your school.
- What is your favorite subject at school?
- What do you like about your school?
- What do you dislike about your school?`,
        category: "Education",
        level: "b1",
        preparationTime: 0,
        speakingTime: 60
      },
      {
        title: "Your time management",
        promptText: `Let's talk about your time management.
- Are you good at managing your time?
- How do you manage your time?
- When is it important to manage time?`,
        category: "Personal",
        level: "b1",
        preparationTime: 0,
        speakingTime: 60
      }
    ];
    
    for (const prompt of part1Prompts) {
      await pool.request()
        .input("Id", uuidv4())
        .input("PartNumber", 1)
        .input("Category", prompt.category)
        .input("Level", prompt.level)
        .input("Title", prompt.title)
        .input("PromptText", prompt.promptText)
        .input("PreparationTime", prompt.preparationTime)
        .input("SpeakingTime", prompt.speakingTime)
        .query(`
          INSERT INTO dbo.VtepSpeakingPrompts 
          (Id, PartNumber, Category, Level, Title, PromptText, PreparationTime, SpeakingTime, CreatedAt)
          VALUES (@Id, @PartNumber, @Category, @Level, @Title, @PromptText, @PreparationTime, @SpeakingTime, GETDATE())
        `);
    }
    console.log(`✅ Created ${part1Prompts.length} Part 1 prompts`);
    
    // Part 2: Solution Discussion (1 situation)
    const part2Id = uuidv4();
    await pool.request()
      .input("Id", part2Id)
      .input("PartNumber", 2)
      .input("Category", "Problem Solving")
      .input("Level", "b1")
      .input("Title", "Buying a gift for your mother")
      .input("PromptText", `Situation: You are considering buying a gift for your mother. There are three options: a tree, a perfume bottle, and a kitchen appliance. Which would you choose?`)
      .input("PreparationTime", 60)
      .input("SpeakingTime", 180)
      .query(`
        INSERT INTO dbo.VtepSpeakingPrompts 
        (Id, PartNumber, Category, Level, Title, PromptText, PreparationTime, SpeakingTime, CreatedAt)
        VALUES (@Id, @PartNumber, @Category, @Level, @Title, @PromptText, @PreparationTime, @SpeakingTime, GETDATE())
      `);
    console.log("✅ Created 1 Part 2 prompt");
    
    // Part 3: Topic Development (1 topic with bullets + follow-up)
    const part3Id = uuidv4();
    await pool.request()
      .input("Id", part3Id)
      .input("PartNumber", 3)
      .input("Category", "Animals")
      .input("Level", "b1")
      .input("Title", "Raising pets brings a lot of advantages")
      .input("PromptText", `Topic: Raising pets brings a lot of advantages.

Follow-up questions:
- Do you like raising pets?
- Among a fish, a dog and a cat, which would you like to raise?
- What are some drawbacks of raising pets?`)
      .input("CueCardBullets", `- reduce stress;
- be more responsible;
- make more friends;
- [your own ideas?]`)
      .input("PreparationTime", 60)
      .input("SpeakingTime", 240)
      .query(`
        INSERT INTO dbo.VtepSpeakingPrompts 
        (Id, PartNumber, Category, Level, Title, PromptText, CueCardBullets, PreparationTime, SpeakingTime, CreatedAt)
        VALUES (@Id, @PartNumber, @Category, @Level, @Title, @PromptText, @CueCardBullets, @PreparationTime, @SpeakingTime, GETDATE())
      `);
    console.log("✅ Created 1 Part 3 prompt");
    
    console.log("\n✅ Sample prompts created successfully!");
    console.log("You can now create speaking tests.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating sample prompts:", error);
    process.exit(1);
  }
}

createSamplePrompts();
