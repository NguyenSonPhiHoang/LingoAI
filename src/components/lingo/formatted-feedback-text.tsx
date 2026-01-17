"use client";

import * as React from "react";
import type { FC, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ChoiceSummary = {
  chosen?: string;
  correct?: string;
};

type SvcParts = {
  sentence: string;
  subject: string;
  verb: string;
  complement: string;
};

const extractChoiceSummary = (text: string): ChoiceSummary => {
  const s = typeof text === "string" ? text : "";
  if (!s) return {};

  // Common patterns from the AI feedback.
  // Example:
  // "Your choice, \"idiom,\" is incorrect ... The correct word, \"vocabulary,\" ..."
  const chosenMatch =
    s.match(/Your choice,?\s*["“]([^"”]+)["”]/i) ||
    s.match(/Your answer,?\s*["“]([^"”]+)["”]/i);
  const correctMatch =
    s.match(/The correct (?:word|answer),?\s*["“]([^"”]+)["”]/i) ||
    s.match(/Correct (?:word|answer),?\s*["“]([^"”]+)["”]/i);

  const chosen = chosenMatch?.[1]?.trim();
  const correct = correctMatch?.[1]?.trim();

  return {
    chosen: chosen || undefined,
    correct: correct || undefined,
  };
};

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

const extractQuotedTerms = (text: string): string[] => {
  const s = typeof text === "string" ? text : "";
  const re = /["“]([^"”]+)["”]/g;
  const terms: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(s))) {
    const t = match[1]?.trim();
    if (t) terms.push(t);
  }
  // de-dupe while preserving order
  return Array.from(new Set(terms));
};

const splitSentences = (text: string): string[] => {
  const s = normalizeSpaces(text);
  if (!s) return [];
  // Simple sentence split; good enough for feedback-style prose.
  return s
    .split(/(?<=[.!?])\s+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const pickSentenceForSVC = (text: string): string | null => {
  const sentences = splitSentences(text);
  const preferred = ["refers to", "means", " is ", " are "];
  for (const key of preferred) {
    const found = sentences.find((s) => s.toLowerCase().includes(key.trim()));
    if (found) return found;
  }
  return sentences[0] || null;
};

const splitSVC = (sentence: string): SvcParts | null => {
  const s = sentence.trim();
  if (!s) return null;

  const lower = ` ${s.toLowerCase()} `;

  const trySplit = (needle: string, verbLabel: string): SvcParts | null => {
    const idx = lower.indexOf(needle);
    if (idx === -1) return null;
    const before = s
      .slice(0, idx)
      .trim()
      .replace(/[,:;\-\s]+$/, "");
    const after = s
      .slice(idx + needle.length)
      .trim()
      .replace(/^[,:;\-\s]+/, "")
      .replace(/[.\s]+$/, "");
    if (!before || !after) return null;
    return {
      sentence: s,
      subject: before,
      verb: verbLabel,
      complement: after,
    };
  };

  return (
    trySplit(" refers to ", "refers to") ||
    trySplit(" means ", "means") ||
    trySplit(" is ", "is") ||
    trySplit(" are ", "are")
  );
};

const findDefinitionSentence = (text: string, term: string): string | null => {
  const sentences = splitSentences(text);
  const t = term.toLowerCase();
  const candidates = sentences.filter((s) => s.toLowerCase().includes(t));
  const preferred = candidates.find((s) =>
    /\b(refers to|means|is|are)\b/i.test(s)
  );
  return preferred || candidates[0] || null;
};

const extractExample = (text: string): string | null => {
  const s = typeof text === "string" ? text : "";
  const m = s.match(/\(e\.g\.,\s*([^\)]+)\)/i);
  return m?.[1]?.trim() || null;
};

const renderInlineEmphasis = (value: string): ReactNode[] => {
  // Emphasize quoted terms: "..."
  const nodes: ReactNode[] = [];
  const re = /(["“][^"”]+["”])/g;

  const parts = value.split(re);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (re.test(part)) {
      nodes.push(
        <span key={`q-${i}`} className="font-semibold">
          {part}
        </span>
      );
      continue;
    }

    // Light emphasis for keywords without adding new colors.
    const kw = /(\bincorrect\b|\bcorrect\b|\bappropriate\b)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = kw.exec(part))) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        nodes.push(part.slice(lastIndex, start));
      }
      nodes.push(
        <span key={`k-${i}-${start}`} className="font-semibold">
          {part.slice(start, end)}
        </span>
      );
      lastIndex = end;
    }
    if (lastIndex < part.length) nodes.push(part.slice(lastIndex));
  }

  return nodes;
};

export const FormattedFeedbackText: FC<{
  text: string;
  className?: string;
  showChoiceSummary?: boolean;
}> = ({ text, className, showChoiceSummary }) => {
  const safeText = typeof text === "string" ? text : "";
  const summary = showChoiceSummary ? extractChoiceSummary(safeText) : {};

  const quotedTerms = extractQuotedTerms(safeText);
  const concepts = quotedTerms.slice(0, 8).map((term) => {
    const def = findDefinitionSentence(safeText, term);
    return { term, def };
  });

  const example = extractExample(safeText);
  const sentenceForSvc = pickSentenceForSVC(safeText);
  const svc = sentenceForSvc ? splitSVC(sentenceForSvc) : null;

  const takeawayParts: string[] = [];
  if (summary.chosen) {
    const def = findDefinitionSentence(safeText, summary.chosen);
    if (def) takeawayParts.push(`${summary.chosen}: ${normalizeSpaces(def)}`);
  }
  if (summary.correct) {
    const def = findDefinitionSentence(safeText, summary.correct);
    if (def) takeawayParts.push(`${summary.correct}: ${normalizeSpaces(def)}`);
  }
  const keyTakeawayText = takeawayParts.length
    ? takeawayParts.join("\n")
    : "Use the context to choose the meaning that fits.";

  // Split into paragraphs but keep single newlines inside paragraphs.
  const paragraphs = safeText
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={cn("space-y-3", className)}>
      {showChoiceSummary && (summary.chosen || summary.correct) ? (
        <div className="flex flex-wrap gap-2">
          {summary.chosen ? (
            <Badge variant="destructive">Your choice: {summary.chosen}</Badge>
          ) : null}
          {summary.correct ? (
            <Badge variant="secondary">Correct: {summary.correct}</Badge>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Key concepts
          </div>
          {concepts.length ? (
            <div className="space-y-2">
              {concepts.map((c) => (
                <div key={c.term} className="space-y-1">
                  <div className="font-semibold text-sm">{c.term}</div>
                  {c.def ? (
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {renderInlineEmphasis(c.def)}
                    </div>
                  ) : null}
                </div>
              ))}
              {example ? (
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold">Example:</span> {example}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No key terms detected.
            </div>
          )}
        </div>

        <div className="rounded-md border bg-background/50 p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Explanation & examples
          </div>
          <div className="space-y-2 text-sm whitespace-pre-wrap leading-relaxed">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, idx) => (
                <p key={idx}>{renderInlineEmphasis(p)}</p>
              ))
            ) : (
              <p>{renderInlineEmphasis(safeText)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-background/50 p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">
          Sentence structure (Subject / Verb / Complement)
        </div>
        {svc ? (
          <>
            <div className="text-sm">
              <span className="text-muted-foreground">Sentence:</span>{" "}
              <span className="font-medium">{svc.sentence}</span>
            </div>
            <Table>
              <TableCaption>Structure breakdown (S/V/C)</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Verb</TableHead>
                  <TableHead>Complement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top">{svc.subject}</TableCell>
                  <TableCell className="align-top">{svc.verb}</TableCell>
                  <TableCell className="align-top">{svc.complement}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Not enough information to derive an S/V/C breakdown.
          </div>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Key Takeaway</div>
          {summary.chosen && summary.correct ? (
            <Badge variant="outline">
              {summary.chosen} vs {summary.correct}
            </Badge>
          ) : null}
        </div>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {renderInlineEmphasis(keyTakeawayText)}
        </div>
      </div>
    </div>
  );
};

export default FormattedFeedbackText;
