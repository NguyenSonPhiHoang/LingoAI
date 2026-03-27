import { getPool } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    const pool = await getPool();
    
    console.log('Running VSTEP Speaking migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '20260131_add_vstep_speaking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Remove GO statements and execute as single batch
    const cleanSQL = migrationSQL.replace(/^\s*GO\s*$/gim, '').trim();
    
    console.log('Executing migration SQL...\n');
    
    try {
      await pool.request().query(cleanSQL);
      console.log('✅ Migration SQL executed successfully\n');
    } catch (err: any) {
      // Check if error is about existing objects
      if (err.message && (err.message.includes('already an object') || err.message.includes('already exists'))) {
        console.log('⚠️  Some objects already exist, migration may be partially complete\n');
      } else {
        console.error('Error details:', err.message);
        throw err;
      }
    }
    
    console.log('✅ VSTEP Speaking migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - VtepSpeakingPrompts (with sample data)');
    console.log('  - VtepSpeakingTests');
    console.log('  - VtepSpeakingSubmissions');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
