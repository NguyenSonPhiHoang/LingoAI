"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const user_repository_1 = require("../repositories/user.repository");
async function main() {
    const saPath = config_1.config.firebaseServiceAccount;
    if (!saPath || !fs_1.default.existsSync(saPath)) {
        console.error("FIREBASE_SERVICE_ACCOUNT not set or file not found. Set path in .env");
        process.exit(1);
    }
    const serviceAccount = require(path_1.default.resolve(saPath));
    firebase_admin_1.default.initializeApp({ credential: firebase_admin_1.default.credential.cert(serviceAccount) });
    const db = firebase_admin_1.default.firestore();
    const pool = await (0, db_1.getPool)();
    console.log("Applying schema...");
    try {
        await runSchema(pool);
    }
    catch (err) {
        const e = err;
        console.warn("Schema execution warning:", e?.message || e);
    }
    // Migrate users collection
    const usersSnapshot = await db.collection("users").get();
    console.log(`Found ${usersSnapshot.size} users in Firestore`);
    let i = 0;
    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        const user = {
            id: doc.id,
            email: data.email || data.emailAddress || null,
            displayName: data.displayName || data.name || null,
            createdAt: data.createdAt
                ? data.createdAt.toDate
                    ? data.createdAt.toDate().toISOString()
                    : new Date(data.createdAt).toISOString()
                : new Date().toISOString(),
        };
        await user_repository_1.UserRepository.upsert(user);
        i++;
        if (i % 100 === 0)
            console.log(`Migrated ${i} users...`);
    }
    console.log(`Finished migrating ${i} users`);
    // TODO: Add migrations for other collections: lessons, vocabulary, storybooks, tests, etc.
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
const db_1 = require("../../src/db");
function toISO(val) {
    if (!val)
        return null;
    if (val.toDate)
        return val.toDate().toISOString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
async function runSchema(pool) {
    const schemaPath = path_1.default.resolve(__dirname, "..", "..", "db", "schema.sql");
    if (!fs_1.default.existsSync(schemaPath)) {
        console.warn("schema.sql not found, skipping schema execution");
        return;
    }
    const sql = fs_1.default.readFileSync(schemaPath, "utf8");
    // execute schema (multiple IF NOT EXISTS blocks)
    (await pool.request().batch)
        ? pool.request().batch(sql)
        : pool.request().query(sql);
}
async function migrateCollection(db, name) {
    const exists = await db
        .collection(name)
        .limit(1)
        .get()
        .then((s) => s.size > 0)
        .catch(() => false);
    return exists;
}
