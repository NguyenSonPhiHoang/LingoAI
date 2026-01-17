"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
const config_1 = require("./config");
// Use dynamic require to avoid TypeScript declaration issues in ts-node
const mssql = require("mssql");
let pool = null;
async function getPool() {
    if (pool && pool.connected)
        return pool;
    // Build options object and only set `serverName` when it's a hostname
    // (not an IP). Passing an IP as TLS ServerName triggers a Node deprecation
    // warning per RFC 6066. If you must connect to an IP, omit serverName and
    // use `trustServerCertificate=true` instead.
    const options = {
        enableArithAbort: true,
        encrypt: !!config_1.config.db.encrypt,
        trustServerCertificate: !!config_1.config.db.trustServerCertificate,
    };
    const serverName = config_1.config.db.serverName?.toString().trim();
    // Simple check: if serverName exists and is NOT an IPv4 or IPv6 literal,
    // set it. This avoids passing IP addresses to TLS SNI.
    const isIP = (s) => {
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
        user: config_1.config.db.user,
        password: config_1.config.db.password,
        server: config_1.config.db.server,
        port: config_1.config.db.port,
        database: config_1.config.db.database,
        options,
    });
    return pool;
}
async function closePool() {
    if (pool)
        await pool.close();
}
