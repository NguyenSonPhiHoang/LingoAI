import { getPool } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrationFile(filename: string) {
  try {
    const pool = await getPool();
    
    const migrationPath = path.join(__dirname, '../db/migrations', filename);
    console.log(`📄 Reading migration file: ${filename}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`🔄 Executing migration...`);
    
    const result = await pool.request().query(sql);
    
    // Show any PRINT messages from SQL
    if (result.recordset && result.recordset.length > 0) {
      console.log('📊 Results:', result.recordset);
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error('❌ Usage: npm run migrate <filename>');
  console.error('   Example: npm run migrate 20260203_fix_writing_submission_fk.sql');
  process.exit(1);
}

runMigrationFile(filename);
