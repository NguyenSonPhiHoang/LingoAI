import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { UserRepository } from "../repositories/user.repository";

async function main() {
  const saPath = config.firebaseServiceAccount;
  if (!saPath || !fs.existsSync(saPath)) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT not set or file not found. Set path in .env"
    );
    process.exit(1);
  }

  const serviceAccount = require(path.resolve(saPath));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const pool = await getPool();
  console.log("Applying schema...");
  try {
    await runSchema(pool);
  } catch (err) {
    const e: any = err;
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
    await UserRepository.upsert(user);
    i++;
    if (i % 100 === 0) console.log(`Migrated ${i} users...`);
  }
  console.log(`Finished migrating ${i} users`);

  // TODO: Add migrations for other collections: lessons, vocabulary, storybooks, tests, etc.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
import { getPool } from "../../src/db";

function toISO(val: any) {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function runSchema(pool: any) {
  const schemaPath = path.resolve(__dirname, "..", "..", "db", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.warn("schema.sql not found, skipping schema execution");
    return;
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  // execute schema (multiple IF NOT EXISTS blocks)
  (await pool.request().batch)
    ? pool.request().batch(sql)
    : pool.request().query(sql);
}

async function migrateCollection(
  db: FirebaseFirestore.Firestore,
  name: string
) {
  const exists = await db
    .collection(name)
    .limit(1)
    .get()
    .then((s) => s.size > 0)
    .catch(() => false);
  return exists;
}
