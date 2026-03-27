import { getPool } from "../src/db";

async function checkPrompts() {
  try {
    const pool = await getPool();
    
    // Count Part 1 prompts
    const part1Result = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingPrompts WHERE PartNumber = 1
    `);
    console.log(`Part 1 prompts: ${part1Result.recordset[0].count}`);
    
    // Count Part 2 prompts
    const part2Result = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingPrompts WHERE PartNumber = 2
    `);
    console.log(`Part 2 prompts: ${part2Result.recordset[0].count}`);
    
    // Count Part 3 prompts
    const part3Result = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingPrompts WHERE PartNumber = 3
    `);
    console.log(`Part 3 prompts: ${part3Result.recordset[0].count}`);
    
    // Count total tests
    const testsResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM dbo.VtepSpeakingTests
    `);
    console.log(`Total tests: ${testsResult.recordset[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking prompts:", error);
    process.exit(1);
  }
}

checkPrompts();
