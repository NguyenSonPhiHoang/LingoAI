import dotenv from "dotenv";

dotenv.config();

import { getPool, closePool } from "../src/db";
import { WordRepository } from "../src/repositories/word.repository";

type BackfillArgs = {
  limit: number;
  delayMs: number;
  dryRun: boolean;
  model: string;
};

function parseArgs(argv: string[]): BackfillArgs {
  const args: BackfillArgs = {
    limit: 100,
    delayMs: 250,
    dryRun: false,
    model: "gemini-2.0-flash",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit")
      args.limit = Math.max(1, parseInt(argv[++i] || "", 10) || 100);
    else if (a === "--delayMs")
      args.delayMs = Math.max(0, parseInt(argv[++i] || "", 10) || 0);
    else if (a === "--dry-run" || a === "--dryRun") args.dryRun = true;
    else if (a === "--model") args.model = String(argv[++i] || args.model);
  }

  return args;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJsonObject(text: string): any | null {
  const s = String(text || "").trim();
  if (!s) return null;

  // Try direct JSON parse first.
  try {
    return JSON.parse(s);
  } catch {
    // ignore
  }

  // Try to find the first {...} block.
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = s.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

async function generatePronunciationIPA(
  term: string,
  model: string
): Promise<string | null> {
  const apiKey = String(process.env.GEMINI_API_KEY || "")
    .trim()
    .replace(/^"|"$/g, "");
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to backend/.env or environment variables."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt =
    `Return ONLY valid JSON (no markdown).\n` +
    `Task: Provide the International Phonetic Alphabet (IPA) pronunciation for the English term.\n` +
    `If the term is a phrase, provide IPA for the phrase.\n` +
    `JSON schema: {"pronunciation":"<IPA>"}\n` +
    `Term: "${term}"`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 64,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Gemini API error ${resp.status}: ${body}`);
  }

  const data: any = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("") ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  const json = extractJsonObject(text);
  const ipa =
    typeof json?.pronunciation === "string" ? json.pronunciation.trim() : "";
  return ipa || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `[backfill] Starting: limit=${args.limit} delayMs=${args.delayMs} dryRun=${args.dryRun} model=${args.model}`
  );

  const pool = await getPool();

  const res = await pool
    .request()
    .input("Limit", args.limit)
    .query(
      `SELECT TOP (@Limit)
        Id, Term, TermNormalized, Pronunciation
       FROM dbo.Words
       WHERE Pronunciation IS NULL OR LTRIM(RTRIM(Pronunciation)) = ''
       ORDER BY TermNormalized ASC;`
    );

  const rows: Array<{
    Id: string;
    Term: string;
    TermNormalized: string;
    Pronunciation: string | null;
  }> = res.recordset || [];

  console.log(`[backfill] Found ${rows.length} words missing pronunciation.`);

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of rows) {
    const term = String(r.Term || "").trim();
    if (!term) {
      skipped++;
      continue;
    }

    try {
      const ipa = await generatePronunciationIPA(term, args.model);
      if (!ipa) {
        console.warn(
          `[backfill] No IPA returned for term="${term}" (id=${r.Id})`
        );
        failed++;
        continue;
      }

      if (!args.dryRun) {
        await WordRepository.update({ id: r.Id, pronunciation: ipa });
      }

      ok++;
      console.log(
        `[backfill] ${args.dryRun ? "(dry) " : ""}Updated id=${
          r.Id
        } term="${term}" pronunciation="${ipa}"`
      );

      if (args.delayMs) await sleep(args.delayMs);
    } catch (e: any) {
      failed++;
      console.error(
        `[backfill] Failed term="${term}" id=${r.Id}: ${e?.message || e}`
      );
      if (args.delayMs) await sleep(args.delayMs);
    }
  }

  console.log(`[backfill] Done. ok=${ok} failed=${failed} skipped=${skipped}`);

  await closePool();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await closePool();
  } catch {
    // ignore
  }
  process.exit(1);
});
