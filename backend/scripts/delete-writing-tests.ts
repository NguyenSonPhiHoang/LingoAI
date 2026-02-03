// Use dynamic require to avoid TypeScript declaration issues
const sql: any = require("mssql");
import { config } from "../src/config";

async function deleteWritingTests() {
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
    console.log("🔍 Finding duplicate Writing tests...");
    
    // Count duplicate Writing tests (not completed, title = "VSTEP WRITING TEST 1")
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM Tests
      WHERE type = 'vtep'
      AND completedAt IS NULL
      AND (
        data LIKE '%"title":"VSTEP WRITING TEST 1"%'
        OR data LIKE '%VSTEP WRITING TEST 1%'
      )
    `);
    
    const count = countResult.recordset[0].count;
    console.log(`📊 Found ${count} duplicate Writing tests to delete`);
    
    if (count === 0) {
      console.log("✅ No duplicate Writing tests to delete");
      await pool.close();
      return;
    }

    // Delete TestItems first (foreign key constraint)
    console.log("🗑️  Deleting TestItems...");
    const deleteItems = await pool.request().query(`
      DELETE FROM TestItems
      WHERE testId IN (
        SELECT id FROM Tests 
        WHERE type = 'vtep'
        AND completedAt IS NULL
        AND (
          data LIKE '%"title":"VSTEP WRITING TEST 1"%'
          OR data LIKE '%VSTEP WRITING TEST 1%'
        )
      )
    `);
    console.log(`✅ Deleted ${deleteItems.rowsAffected[0]} TestItems`);

    // Delete Tests
    console.log("🗑️  Deleting duplicate Writing tests...");
    const deleteTests = await pool.request().query(`
      DELETE FROM Tests
      WHERE type = 'vtep'
      AND completedAt IS NULL
      AND (
        data LIKE '%"title":"VSTEP WRITING TEST 1"%'
        OR data LIKE '%VSTEP WRITING TEST 1%'
      )
    `);
    console.log(`✅ Deleted ${deleteTests.rowsAffected[0]} Tests`);

    // Show remaining tests
    console.log("\n📋 Remaining VTEP tests:");
    const remaining = await pool.request().query(`
      SELECT 
        id,
        type,
        userId,
        score,
        createdAt,
        CAST(data AS NVARCHAR(MAX)) as data
      FROM Tests
      WHERE type = 'vtep'
      ORDER BY createdAt DESC
    `);
    
    console.log(`Total remaining: ${remaining.recordset.length}`);
    remaining.recordset.slice(0, 5).forEach((test: any) => {
      console.log(`  - ID: ${test.id}, Score: ${test.score}, Created: ${test.createdAt}`);
    });

    await pool.close();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.close();
    process.exit(1);
  }
}

deleteWritingTests();
