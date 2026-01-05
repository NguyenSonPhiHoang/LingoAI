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
  return pool;
}

export async function closePool() {
  if (pool) await pool.close();
}
