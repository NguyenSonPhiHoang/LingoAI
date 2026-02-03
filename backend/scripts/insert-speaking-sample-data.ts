import { getPool } from '../src/db';

async function insertSampleData() {
  try {
    const pool = await getPool();
    
    console.log('Inserting additional sample data...\n');
    
    // Check existing data
    const existingCount = await pool.request().query(`
      SELECT PartNumber, COUNT(*) as count 
      FROM dbo.VtepSpeakingPrompts 
      GROUP BY PartNumber
    `);
    console.log('Current data:');
    existingCount.recordset.forEach((row: any) => {
      console.log(`   Part ${row.PartNumber}: ${row.count} prompts`);
    });
    
    // Insert Part 2 prompts
    console.log('\nInserting Part 2 prompts...');
    const part2Prompts = [
      {
        id: 'p2-person-01',
        title: 'A Person You Admire',
        promptText: 'Describe a person you admire.',
        category: 'description',
        bullets: JSON.stringify(['Who this person is', 'How you know them', 'What they have achieved', 'Why you admire them'])
      },
      {
        id: 'p2-place-01',
        title: 'A Memorable Place',
        promptText: 'Describe a place you visited that was memorable.',
        category: 'description',
        bullets: JSON.stringify(['Where this place is', 'When you visited it', 'What you did there', 'Why it was memorable'])
      },
      {
        id: 'p2-event-01',
        title: 'A Special Event',
        promptText: 'Describe a special event or celebration you attended.',
        category: 'description',
        bullets: JSON.stringify(['What the event was', 'When and where it took place', 'Who was there', 'Why it was special to you'])
      },
      {
        id: 'p2-skill-01',
        title: 'A Skill You Learned',
        promptText: 'Describe a skill you learned recently.',
        category: 'description',
        bullets: JSON.stringify(['What the skill is', 'How you learned it', 'How long it took', 'Why you wanted to learn it'])
      },
      {
        id: 'p2-experience-01',
        title: 'A Memorable Trip',
        promptText: 'Describe a memorable trip you have taken.',
        category: 'description',
        bullets: JSON.stringify(['Where you went', 'Who you went with', 'What you did there', 'Why it was memorable'])
      }
    ];
    
    for (const prompt of part2Prompts) {
      await pool.request()
        .input('Id', prompt.id)
        .input('PartNumber', 2)
        .input('Category', prompt.category)
        .input('Level', 'b2')
        .input('Title', prompt.title)
        .input('PromptText', prompt.promptText)
        .input('CueCardBullets', prompt.bullets)
        .input('PreparationTime', 60)
        .input('SpeakingTime', 120)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.VtepSpeakingPrompts WHERE Id = @Id)
          BEGIN
            INSERT INTO dbo.VtepSpeakingPrompts 
            (Id, PartNumber, Category, Level, Title, PromptText, CueCardBullets, PreparationTime, SpeakingTime)
            VALUES 
            (@Id, @PartNumber, @Category, @Level, @Title, @PromptText, @CueCardBullets, @PreparationTime, @SpeakingTime)
          END
        `);
    }
    console.log(`✅ Inserted ${part2Prompts.length} Part 2 prompts`);
    
    // Insert Part 3 prompts
    console.log('\nInserting Part 3 prompts...');
    const part3Prompts = [
      { id: 'p3-society-01', title: 'Social Changes', promptText: 'How has society changed in your country over the past 20 years?', category: 'society' },
      { id: 'p3-tech-01', title: 'Technology Impact', promptText: 'What are the advantages and disadvantages of modern technology?', category: 'technology' },
      { id: 'p3-education-01', title: 'Education Future', promptText: 'How do you think education will change in the future?', category: 'education' },
      { id: 'p3-environment-01', title: 'Environmental Issues', promptText: 'What can individuals do to protect the environment?', category: 'environment' },
      { id: 'p3-work-01', title: 'Work-Life Balance', promptText: 'Is it important to have a good work-life balance? Why?', category: 'work' },
      { id: 'p3-travel-01', title: 'Travel Benefits', promptText: 'What are the benefits of traveling to different countries?', category: 'travel' }
    ];
    
    for (const prompt of part3Prompts) {
      await pool.request()
        .input('Id', prompt.id)
        .input('PartNumber', 3)
        .input('Category', prompt.category)
        .input('Level', 'b2')
        .input('Title', prompt.title)
        .input('PromptText', prompt.promptText)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.VtepSpeakingPrompts WHERE Id = @Id)
          BEGIN
            INSERT INTO dbo.VtepSpeakingPrompts 
            (Id, PartNumber, Category, Level, Title, PromptText)
            VALUES 
            (@Id, @PartNumber, @Category, @Level, @Title, @PromptText)
          END
        `);
    }
    console.log(`✅ Inserted ${part3Prompts.length} Part 3 prompts`);
    
    // Verify final count
    console.log('\nFinal data:');
    const finalCount = await pool.request().query(`
      SELECT PartNumber, COUNT(*) as count 
      FROM dbo.VtepSpeakingPrompts 
      GROUP BY PartNumber
      ORDER BY PartNumber
    `);
    finalCount.recordset.forEach((row: any) => {
      console.log(`   Part ${row.PartNumber}: ${row.count} prompts`);
    });
    
    console.log('\n✅ Sample data insertion completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to insert sample data:', err);
    process.exit(1);
  }
}

insertSampleData();
