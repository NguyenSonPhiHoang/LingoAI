import { getPool } from "../src/db";

async function checkTests() {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        Id,
        Title,
        DocumentId,
        IsActive,
        IsPublic,
        CreatedAt
      FROM dbo.VtepSpeakingTests
      ORDER BY CreatedAt DESC
    `);
    
    console.log(`Total tests: ${result.recordset.length}\n`);
    
    result.recordset.forEach((test: any, index: number) => {
      console.log(`Test ${index + 1}:`);
      console.log(`  Title: ${test.Title}`);
      console.log(`  DocumentId: ${test.DocumentId || '(NULL)'}`);
      console.log(`  IsActive: ${test.IsActive}`);
      console.log(`  IsPublic: ${test.IsPublic}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTests();
