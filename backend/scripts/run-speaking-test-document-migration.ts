import { getPool } from "../src/db";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  try {
    const pool = await getPool();
    
    const migrationPath = path.join(__dirname, "../db/migrations/20260131_add_speaking_test_document_id.sql");
    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    
    console.log("Running migration: 20260131_add_speaking_test_document_id.sql");
    
    // Split by GO and execute each batch
    const batches = sqlContent
      .split(/\bGO\b/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    for (const batch of batches) {
      console.log(`Executing batch...`);
      await pool.request().query(batch);
    }
    
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
