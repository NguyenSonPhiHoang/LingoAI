import { getPool } from '../src/db';
import fs from 'fs';
import path from 'path';

async function runWritingMigration() {
  try {
    const pool = await getPool();
    
    console.log('Running VSTEP Writing migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/migrations/20260130_add_vstep_writing.sql');
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by GO statements
    const batches = sqlScript.split(/\n\s*GO\s*\n/gi);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`Executing batch ${i + 1}/${batches.length}...`);
        await pool.request().query(batch);
      }
    }
    
    console.log('✅ VSTEP Writing migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runWritingMigration();
