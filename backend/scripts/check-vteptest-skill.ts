// Quick check for VtepTests skill tagging
const sql: any = require("mssql");
import { config } from "../src/config";

async function run() {
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
    const res = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN vw.Id IS NOT NULL THEN 1 ELSE 0 END) AS writingCount
      FROM dbo.VtepTests vt
      LEFT JOIN dbo.VtepWritingTests vw ON vw.Id = vt.Id;
    `);

    const counts = res.recordset?.[0] || {};
    console.log("Total VtepTests:", counts.total);
    console.log("Writing-linked VtepTests:", counts.writingCount);

    const sample = await pool.request().query(`
      SELECT TOP 5
        vt.Id,
        vt.Title,
        CASE WHEN vw.Id IS NOT NULL THEN 'Writing' ELSE 'Listening/Reading' END AS skill
      FROM dbo.VtepTests vt
      LEFT JOIN dbo.VtepWritingTests vw ON vw.Id = vt.Id
      ORDER BY vt.CreatedAt DESC;
    `);
    console.log("Sample:");
    (sample.recordset || []).forEach((r: any) => {
      console.log(`- ${r.Id} | ${r.Title} | ${r.skill}`);
    });
  } finally {
    await pool.close();
  }
}

run().catch((err: any) => {
  console.error(err);
  process.exit(1);
});
