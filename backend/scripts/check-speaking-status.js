// Script để kiểm tra speaking test status
import { getPool } from "../src/db";
import { config } from "../src/config";

async function checkSpeakingTestStatus() {
  const pool = await getPool();

  console.log("🔍 Checking Speaking Test Status...\n");

  // 1. Check templates
  console.log("📋 Step 1: Speaking Test Templates (VtepSpeakingTests)");
  const templates = await pool.request().query(`
    SELECT TOP 5 
      Id, 
      Title, 
      Level, 
      IsActive, 
      IsPublic,
      CreatedAt
    FROM dbo.VtepSpeakingTests
    ORDER BY CreatedAt DESC
  `);
  console.log(`Found ${templates.recordset.length} templates:`);
  templates.recordset.forEach(t => {
    console.log(`  - ${t.Title} (${t.Level}) - Active: ${t.IsActive}, Public: ${t.IsPublic}`);
  });

  // 2. Check instantiated tests
  console.log("\n📝 Step 2: Instantiated Tests (Tests table with type='vtep' and skill='Speaking')");
  const tests = await pool.request().query(`
    SELECT TOP 5
      Id,
      UserId,
      Type,
      Skill,
      Score,
      TotalQuestions,
      CompletedAt,
      CreatedAt
    FROM dbo.Tests
    WHERE Type = 'vtep' AND Skill = 'Speaking'
    ORDER BY CreatedAt DESC
  `);
  console.log(`Found ${tests.recordset.length} instantiated speaking tests:`);
  tests.recordset.forEach(t => {
    const status = t.CompletedAt ? '✅ Completed' : '⏳ In Progress';
    console.log(`  - Test ${t.Id.substring(0, 8)}... - User: ${t.UserId?.substring(0, 8) || 'N/A'} - ${status}`);
  });

  // 3. Check test items
  console.log("\n📊 Step 3: Test Items (TestItems with Skill='Speaking')");
  const items = await pool.request().query(`
    SELECT COUNT(*) as ItemCount, TestId
    FROM dbo.TestItems
    WHERE Skill = 'Speaking'
    GROUP BY TestId
  `);
  console.log(`Found ${items.recordset.length} tests with speaking items:`);
  items.recordset.forEach(i => {
    console.log(`  - Test ${i.TestId.substring(0, 8)}... has ${i.ItemCount} items`);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 SUMMARY:");
  console.log(`  Templates created: ${templates.recordset.length > 0 ? '✅' : '❌'}`);
  console.log(`  Tests instantiated: ${tests.recordset.length > 0 ? '✅' : '❌'}`);
  console.log(`  Tests submitted: ${tests.recordset.filter(t => t.CompletedAt).length > 0 ? '✅' : '❌'}`);
  console.log(`  Test items created: ${items.recordset.length > 0 ? '✅' : '❌'}`);
  
  if (templates.recordset.length > 0 && tests.recordset.length === 0) {
    console.log("\n⚠️  ISSUE DETECTED:");
    console.log("   You have templates but no instantiated tests.");
    console.log("   👉 Students need to START a test first!");
  }

  await pool.close();
}

checkSpeakingTestStatus().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
