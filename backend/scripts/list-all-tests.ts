// Use dynamic require to avoid TypeScript declaration issues
const sql: any = require("mssql");
import { config } from "../src/config";

async function listAllTests() {
  const pool = await sql.connect({
    user: config.db.user,
    password: config.db.password,
    server: config.db.server,
    port: config.db.port,
    database: config.db.database,
    options: {
      encrypt: config.db.encrypt,
      trustServerCertificate: config.db.trustServerCertificate,
    },
  });

  try {
    console.log("🔍 Listing all VTEP tests...\n");
    
    const result = await pool.request().query(`
      SELECT 
        id,
        type,
        userId,
        score,
        createdAt,
        completedAt,
        CAST(data AS NVARCHAR(MAX)) as data
      FROM Tests
      WHERE type = 'vtep'
      ORDER BY createdAt DESC
    `);
    
    console.log(`📊 Total VTEP tests: ${result.recordset.length}\n`);
    
    result.recordset.forEach((test: any, index: number) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(test.data);
      } catch (e) {
        // ignore
      }
      
      console.log(`${index + 1}. Test ID: ${test.id}`);
      console.log(`   User: ${test.userId || 'PUBLIC'}`);
      console.log(`   Score: ${test.score !== null ? test.score : 'Not scored'}`);
      console.log(`   Skill: ${parsed.skill || 'Unknown'}`);
      console.log(`   Title: ${parsed.title || 'No title'}`);
      console.log(`   Created: ${test.createdAt}`);
      console.log(`   Completed: ${test.completedAt || 'Not completed'}`);
      console.log('');
    });

    await pool.close();
    console.log("✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.close();
    process.exit(1);
  }
}

listAllTests();
