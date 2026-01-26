const optionsA = `[{"id":"opt-1769171960856-njw8re","label":"a"},{"id":"opt-1769171963180-4euejp","label":"b"},{"id":"opt-1769171965372-flapxf","label":"c"},{"id":"opt-1769171967365-f0fq4r","label":"d"}]`;

const answerA = `{"correctOptionId":"opt-1769171963180-4euejp"}`;

function safeParseOptions(optionsJson) {
  if (!optionsJson) return [];
  try {
    let parsed = typeof optionsJson === "string" ? JSON.parse(optionsJson) : optionsJson;
    let attempts = 0;
    while (typeof parsed === "string" && attempts < 5) {
      try { parsed = JSON.parse(parsed); } catch { break; }
      attempts++;
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => typeof item === 'string' ? { id: item, label: item } : { id: item.id || item.label || JSON.stringify(item), label: item.label || item.title || item.text || item.value || item.name });
  } catch { return []; }
}

function parseAnswer(ansStr) {
  try {
    let parsed = typeof ansStr === 'string' ? JSON.parse(ansStr) : ansStr;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 5) {
      try { parsed = JSON.parse(parsed); } catch { break; }
      attempts++;
    }
    return parsed;
  } catch { return null; }
}

console.log('safeParseOptions(optionsA):', safeParseOptions(optionsA));
console.log('parseAnswer(answerA):', parseAnswer(answerA));

// double-encoded
const doubleEncoded = JSON.stringify(optionsA);
console.log('safeParseOptions(doubleEncoded):', safeParseOptions(doubleEncoded));
console.log('parseAnswer(doubleEncoded answer):', parseAnswer(JSON.stringify(answerA)));

console.log('done');
const optionsA = `[{"id":"opt-1769171960856-njw8re","label":"a"},{"id":"opt-1769171963180-4euejp","label":"b"},{"id":"opt-1769171965372-flapxf","label":"c"},{"id":"opt-1769171967365-f0fq4r","label":"d"}]`;

const optionsB = `[{"id":"opt-1769171936154-up8d5a","label":"a"},{"id":"opt-1769171938503-sh0tq6","label":"b"},{"id":"opt-1769171940442-b9r5su","label":"c"},{"id":"opt-1769171942491-6xgr2q","label":"d"}]`;

const answerA = `{"correctOptionId":"opt-1769171963180-4euejp"}`;
const answerB = `{"correctOptionId":"opt-1769171940442-b9r5su"}`;

function safeParseOptions(optionsJson) {
  if (!optionsJson) return [];
  try {
    let parsed = typeof optionsJson === "string" ? JSON.parse(optionsJson) : optionsJson;
    let attempts = 0;
    while (typeof parsed === "string" && attempts < 5) {
      const trimmed = parsed.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{") || trimmed.startsWith('\"[')) {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          break;
        }
      } else break;
      attempts++;
    }

    if (!Array.isArray(parsed)) {
      if (typeof parsed === "string") {
        const sep = parsed.includes("|") ? "|" : parsed.includes(",") ? "," : "\n";
        const parts = parsed.split(sep).map(s => s.trim()).filter(Boolean);
        return parts.map(p => ({ id: p, label: p }));
      }
      return [];
    }

    const out = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        out.push({ id: item, label: item });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const label = item.label || item.title || item.text || item.value || item.name;
      const id = item.id || label || String(item.value) || JSON.stringify(item);
      if (typeof label === "string") out.push({ id: String(id), label });
    }
    return out;
  } catch (e) {
    return [];
  }
}

function parseAnswer(ansStr) {
  try {
    let parsed = typeof ansStr === 'string' ? JSON.parse(ansStr) : ansStr;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 5) {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        break;
      }
      attempts++;
    }
    return parsed;
  } catch (e) { return null; }
}

console.log('optionsA raw:', optionsA);
console.log('safeParseOptions(optionsA):', safeParseOptions(optionsA));
console.log('optionsB raw:', optionsB);
console.log('safeParseOptions(optionsB):', safeParseOptions(optionsB));
console.log('answerA raw:', answerA);
console.log('parseAnswer(answerA):', parseAnswer(answerA));
console.log('answerB raw:', answerB);
console.log('parseAnswer(answerB):', parseAnswer(answerB));

// Simulate toEditorExercises parsing (single-parse approach)
function toEditorSingleParse(eOptionsJson, eAnswerJson) {
  let options;
  try {
    if (eOptionsJson) {
      const parsed = typeof eOptionsJson === 'string' ? JSON.parse(eOptionsJson) : eOptionsJson;
      if (Array.isArray(parsed)) {
        options = parsed.map(item => typeof item === 'string' ? { id: item, label: item } : { id: (item.id || item.label || JSON.stringify(item)), label: item.label || item.title || item.text || item.value || item.name });
      }
    }
  } catch { options = undefined; }

  let correct = null;
  try {
    const ans = typeof eAnswerJson === 'string' ? JSON.parse(eAnswerJson) : eAnswerJson;
    correct = ans?.correctOptionId ? String(ans.correctOptionId) : null;
  } catch { }

  return { options, correct };
}

console.log('\nSimulate single-parse toEditor approach:');
console.log('toEditorSingleParse optionsA:', toEditorSingleParse(optionsA, answerA));
console.log('toEditorSingleParse optionsB:', toEditorSingleParse(optionsB, answerB));

// Now test double-encoded case
const doubleEncoded = JSON.stringify(optionsA);
console.log('\nDouble-encoded sample:', doubleEncoded);
console.log('safeParseOptions(doubleEncoded):', safeParseOptions(doubleEncoded));
console.log('toEditorSingleParse(doubleEncoded):', toEditorSingleParse(doubleEncoded, JSON.stringify(answerA)));

console.log('\nDone');
const optionsA = `[{"id":"opt-1769171960856-njw8re","label":"a"},{"id":"opt-1769171963180-4euejp","label":"b"},{"id":"opt-1769171965372-flapxf","label":"c"},{"id":"opt-1769171967365-f0fq4r","label":"d"}]`;

const optionsB = `[{"id":"opt-1769171936154-up8d5a","label":"a"},{"id":"opt-1769171938503-sh0tq6","label":"b"},{"id":"opt-1769171940442-b9r5su","label":"c"},{"id":"opt-1769171942491-6xgr2q","label":"d"}]`;

const answerA = `{"correctOptionId":"opt-1769171963180-4euejp"}`;
const answerB = `{"correctOptionId":"opt-1769171940442-b9r5su"}`;

function safeParseOptions(optionsJson) {
  if (!optionsJson) return [];
  try {
    let parsed = typeof optionsJson === "string" ? JSON.parse(optionsJson) : optionsJson;
    let attempts = 0;
    while (typeof parsed === "string" && attempts < 5) {
      const trimmed = parsed.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{") || trimmed.startsWith('\"[')) {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          break;
        }
      } else break;
      attempts++;
    }

    if (!Array.isArray(parsed)) {
      if (typeof parsed === "string") {
        const sep = parsed.includes("|") ? "|" : parsed.includes(",") ? "," : "\n";
        const parts = parsed.split(sep).map(s => s.trim()).filter(Boolean);
        return parts.map(p => ({ id: p, label: p }));
      }
      return [];
    }

    const out = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        out.push({ id: item, label: item });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const label = item.label || item.title || item.text || item.value || item.name;
      const id = item.id || label || String(item.value) || JSON.stringify(item);
      if (typeof label === "string") out.push({ id: String(id), label });
    }
    return out;
  } catch (e) {
    return [];
  }
}

function parseAnswer(ansStr) {
  try {
    let parsed = typeof ansStr === 'string' ? JSON.parse(ansStr) : ansStr;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 5) {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        break;
      }
      attempts++;
    }
    return parsed;
  } catch (e) { return null; }
}

console.log('optionsA raw:', optionsA);
console.log('safeParseOptions(optionsA):', safeParseOptions(optionsA));
console.log('optionsB raw:', optionsB);
console.log('safeParseOptions(optionsB):', safeParseOptions(optionsB));
console.log('answerA raw:', answerA);
console.log('parseAnswer(answerA):', parseAnswer(answerA));
console.log('answerB raw:', answerB);
console.log('parseAnswer(answerB):', parseAnswer(answerB));

// Simulate toEditorExercises parsing (single-parse approach)
function toEditorSingleParse(eOptionsJson, eAnswerJson) {
  let options;
  try {
    if (eOptionsJson) {
      const parsed = typeof eOptionsJson === 'string' ? JSON.parse(eOptionsJson) : eOptionsJson;
      if (Array.isArray(parsed)) {
        options = parsed.map(item => typeof item === 'string' ? { id: item, label: item } : { id: (item.id || item.label || JSON.stringify(item)), label: item.label || item.title || item.text || item.value || item.name });
      }
    }
  } catch { options = undefined; }

  let correct = null;
  try {
    const ans = typeof eAnswerJson === 'string' ? JSON.parse(eAnswerJson) : eAnswerJson;
    correct = ans?.correctOptionId ? String(ans.correctOptionId) : null;
  } catch { }

  return { options, correct };
}

console.log('\nSimulate single-parse toEditor approach:');
console.log('toEditorSingleParse optionsA:', toEditorSingleParse(optionsA, answerA));
console.log('toEditorSingleParse optionsB:', toEditorSingleParse(optionsB, answerB));

// Now test double-encoded case
const doubleEncoded = JSON.stringify(optionsA);
console.log('\nDouble-encoded sample:', doubleEncoded);
console.log('safeParseOptions(doubleEncoded):', safeParseOptions(doubleEncoded));
console.log('toEditorSingleParse(doubleEncoded):', toEditorSingleParse(doubleEncoded, JSON.stringify(answerA)));

console.log('\nDone');
const optionsA = "[{\