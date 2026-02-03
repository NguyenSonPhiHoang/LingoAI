import { getPool } from '../src/db';

async function runMigration() {
  try {
    const pool = await getPool();
    
    console.log('Running migration: Add Part and Skill columns to VtepTestItems...');
    
    // Check if Part column exists
    const checkPart = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.VtepTestItems') 
      AND name = 'Part'
    `);
    
    if (checkPart.recordset[0].count === 0) {
      await pool.request().query(`ALTER TABLE dbo.VtepTestItems ADD Part NVARCHAR(200) NULL`);
      console.log('✅ Added Part column');
    } else {
      console.log('✓ Part column already exists');
    }
    
    // Check if Skill column exists
    const checkSkill = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.VtepTestItems') 
      AND name = 'Skill'
    `);
    
    if (checkSkill.recordset[0].count === 0) {
      await pool.request().query(`ALTER TABLE dbo.VtepTestItems ADD Skill NVARCHAR(50) NULL`);
      console.log('✅ Added Skill column');
    } else {
      console.log('✓ Skill column already exists');
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
