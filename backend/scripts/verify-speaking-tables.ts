import { getPool } from '../src/db';

async function verifyTables() {
  try {
    const pool = await getPool();
    
    console.log('Verifying VSTEP Speaking tables...\n');
    
    // Check VtepSpeakingPrompts
    const promptsCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingPrompts
    `);
    console.log(`✅ VtepSpeakingPrompts: ${promptsCount.recordset[0].count} prompts`);
    
    // Count by part
    const partCounts = await pool.request().query(`
      SELECT PartNumber, COUNT(*) as count 
      FROM dbo.VtepSpeakingPrompts 
      GROUP BY PartNumber 
      ORDER BY PartNumber
    `);
    partCounts.recordset.forEach((row: any) => {
      console.log(`   Part ${row.PartNumber}: ${row.count} prompts`);
    });
    
    // Check VtepSpeakingTests
    const testsCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingTests
    `);
    console.log(`\n✅ VtepSpeakingTests: ${testsCount.recordset[0].count} tests`);
    
    // Check VtepSpeakingSubmissions
    const submissionsCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingSubmissions
    `);
    console.log(`✅ VtepSpeakingSubmissions: ${submissionsCount.recordset[0].count} submissions`);
    
    // Sample prompts
    console.log('\nSample prompts:');
    const samplePrompts = await pool.request().query(`
      SELECT TOP 3 PartNumber, Title, Level 
      FROM dbo.VtepSpeakingPrompts 
      ORDER BY PartNumber, CreatedAt
    `);
    samplePrompts.recordset.forEach((row: any) => {
      console.log(`   Part ${row.PartNumber} [${row.Level || 'N/A'}]: ${row.Title}`);
    });
    
    console.log('\n✅ All tables verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

verifyTables();
