import { config } from "./config";
// Use dynamic require to avoid TypeScript declaration issues in ts-node
const mssql: any = require("mssql");

let pool: any = null;

export async function getPool(): Promise<any> {
  if (pool && pool.connected) return pool;
  // Build options object and only set `serverName` when it's a hostname
  // (not an IP). Passing an IP as TLS ServerName triggers a Node deprecation
  // warning per RFC 6066. If you must connect to an IP, omit serverName and
  // use `trustServerCertificate=true` instead.
  const options: any = {
    enableArithAbort: true,
    encrypt: !!config.db.encrypt,
    trustServerCertificate: !!config.db.trustServerCertificate,
  };

  const serverName = config.db.serverName?.toString().trim();
  // Simple check: if serverName exists and is NOT an IPv4 or IPv6 literal,
  // set it. This avoids passing IP addresses to TLS SNI.
  const isIP = (s: string) => {
    // IPv4
    const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    // IPv6 (basic check for presence of colon)
    const ipv6 = /:/;
    return ipv4.test(s) || ipv6.test(s);
  };

  if (serverName && !isIP(serverName)) {
    options.serverName = serverName;
  }

  pool = await mssql.connect({
    user: config.db.user,
    password: config.db.password,
    server: config.db.server,
    port: config.db.port,
    database: config.db.database,
    options,
  });
  // In non-production, verify which database we connected to for easier debugging
  if (process.env.NODE_ENV !== "production") {
    try {
      const res = await pool.request().query("SELECT DB_NAME() AS currentDb");
      console.debug(
        "DB connected to:",
        res.recordset && res.recordset[0]?.currentDb,
      );
    } catch (err) {
      console.debug("Failed to query current DB:", err);
    }
  }
  return pool;
}

export async function closePool() {
  if (pool) await pool.close();
}

/**
 * Auto-creates the EmailOtps table if it doesn't exist.
 * Called once on server startup — no manual migration needed.
 */
export async function ensureEmailOtpsTable() {
  try {
    const p = await getPool();
    await p.request().query(`
      IF OBJECT_ID('dbo.EmailOtps', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.EmailOtps (
          Id          INT           NOT NULL IDENTITY(1,1) CONSTRAINT PK_EmailOtps PRIMARY KEY,
          Email       NVARCHAR(256) NOT NULL,
          Otp         NVARCHAR(10)  NOT NULL,
          PendingData NVARCHAR(MAX) NOT NULL,
          ExpiresAt   DATETIME2     NOT NULL,
          CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
          IsUsed      BIT           NOT NULL DEFAULT(0)
        );
        CREATE INDEX IX_EmailOtps_Email ON dbo.EmailOtps(Email);
        CREATE INDEX IX_EmailOtps_ExpiresAt ON dbo.EmailOtps(ExpiresAt);
      END
    `);

  } catch (err: any) {
    console.error("Failed to ensure EmailOtps table:", err?.message || err);
  }
}

