// @ts-nocheck
import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Data_LingoAI',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function cleanSpeakingPrompts() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to database');

    // First, list all prompts
    console.log('\n📋 Listing all speaking prompts:');
    const listResult = await pool.request().query(`
      SELECT 
        Id,
        PartNumber,
        Title,
        PromptText,
        PreparationTime,
        SpeakingTime,
        CreatedAt,
        CreatedByUserId
      FROM VtepSpeakingPrompts
      ORDER BY CreatedAt DESC
    `);

    console.log(`\n📊 Total prompts found: ${listResult.recordset.length}`);
    
    if (listResult.recordset.length > 0) {
      console.log('\n🎤 Speaking Prompts:');
      listResult.recordset.forEach((prompt: any, index: number) => {
        console.log(`\n${index + 1}. Prompt ID: ${prompt.Id}`);
        console.log(`   Part: ${prompt.PartNumber}`);
        console.log(`   Title: ${prompt.Title}`);
        console.log(`   Text: ${prompt.PromptText ? prompt.PromptText.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`   Created By: ${prompt.CreatedByUserId || 'system (migration sample)'}`);
        console.log(`   Created At: ${prompt.CreatedAt}`);
      });

      // Ask user which prompts to keep (by CreatedByUserId)
      console.log('\n\n⚠️  WARNING: About to delete ALL sample prompts!');
      console.log('📝 Prompts will be deleted based on CreatedByUserId field being NULL (sample data from migration)');
      
      // Delete prompts where CreatedByUserId is NULL (sample data from migration)
      const deleteResult = await pool.request().query(`
        DELETE FROM VtepSpeakingPrompts
        WHERE CreatedByUserId IS NULL
      `);

      console.log(`\n✅ Deleted ${deleteResult.rowsAffected[0]} sample prompts`);

      // Show remaining prompts
      const remainingResult = await pool.request().query(`
        SELECT 
          Id,
          PartNumber,
          Title,
          CreatedByUserId,
          CreatedAt
        FROM VtepSpeakingPrompts
        ORDER BY CreatedAt DESC
      `);

      console.log(`\n📊 Remaining prompts: ${remainingResult.recordset.length}`);
      if (remainingResult.recordset.length > 0) {
        console.log('\n🎤 User-created prompts:');
        remainingResult.recordset.forEach((prompt: any, index: number) => {
          console.log(`${index + 1}. Part ${prompt.PartNumber}: ${prompt.Title} (Created by: ${prompt.CreatedByUserId})`);
        });
      }
    } else {
      console.log('ℹ️  No prompts found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
cleanSpeakingPrompts()
  .then(() => {
    console.log('\n✅ Clean speaking prompts completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Clean speaking prompts failed:', error);
    process.exit(1);
  });
