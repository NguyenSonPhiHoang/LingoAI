"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import vtepService from "@/services/vtep";
import { apiGet } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddVtepDocumentDialog from "@/components/lingo/add-vtep-document-dialog";
import VtepWritingManager from "@/components/lingo/vtep-writing-manager";
import VtepSpeakingManager from "@/components/lingo/vtep-speaking-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, PlusCircle, Plus, Edit3, Trash2, FileText, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAudioPlayback } from "@/hooks/use-audio-playback";

export default function VtepAdminPage() {
  const { user, loading: authLoading, isAdmin, isTeacher } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const addItemRef = useRef<HTMLDivElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const [itemPrompt, setItemPrompt] = useState("");
  const [itemType, setItemType] = useState<"mcq" | "multichoice" | "text">(
    "mcq",
  );
  const [itemOptionsArr, setItemOptionsArr] = useState<
    { id: string; label: string }[]
  >([]);
  const [itemPoints, setItemPoints] = useState<number | string>(1);
  const [importText, setImportText] = useState<string>("");
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [itemAcceptedAnswers, setItemAcceptedAnswers] = useState<string>("");
  const [itemSkill, setItemSkill] = useState("Listening");
  const [itemPart, setItemPart] = useState("");
  const [itemDifficulty, setItemDifficulty] = useState<number | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [activeDocSkill, setActiveDocSkill] = useState<
    "Listening" | "Reading" | "Writing" | "Speaking"
  >("Listening");
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("list");
  const [docSort, setDocSort] = useState<
    "created_desc" | "created_asc" | "title_asc" | "title_desc"
  >("created_desc");
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<any[] | null>(null);
  const [detailWritingPrompts, setDetailWritingPrompts] = useState<any[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [promptTaskTypeFilter, setPromptTaskTypeFilter] = useState<"all" | "task1" | "task2">("all");
  const [promptLevelFilter, setPromptLevelFilter] = useState("");
  const [promptCategoryFilter, setPromptCategoryFilter] = useState("");
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editItemPrompt, setEditItemPrompt] = useState("");
  const [editItemOptionsArr, setEditItemOptionsArr] = useState<
    { id: string; label: string; selected?: boolean }[]
  >([]);
  const [editItemAcceptedAnswers, setEditItemAcceptedAnswers] = useState("");
  const [editItemSkill, setEditItemSkill] = useState("");
  const [editItemPart, setEditItemPart] = useState("");
  const [editItemDifficulty, setEditItemDifficulty] = useState<number | null>(
    null,
  );
  const [editItemPoints, setEditItemPoints] = useState<number | string>(1);
  const editTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [practiceSelections, setPracticeSelections] = useState<
    { docId: string; title?: string; count: number; audioPath?: string }[]
  >([]);
  const [practiceSet, setPracticeSet] = useState<any[] | null>(null);
  const [practicePreviewOpen, setPracticePreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalDocs, setTotalDocs] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const canManage = isAdmin() || isTeacher();
  const { toast } = useToast();
  const [, setDummyWords] = useState<any[]>([]);
  const { audioRef, isLoadingAudio, playAudio, stopAudio } = useAudioPlayback({
    setWords: setDummyWords,
  });

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const getDocSkill = (doc: any): string => {
    const s = doc?.tocJson?.skill || doc?.tocJson?.defaultSkill || null;
    const v = typeof s === "string" ? s.trim() : "";
    return v || "Listening";
  };

  const [parsedReadingMeta, setParsedReadingMeta] = useState<any | null>(null);
  const [pendingReadingMeta, setPendingReadingMeta] = useState<any | null>(null);
  const [readingPassageInput, setReadingPassageInput] = useState<string>("");
  const [readingQuestionsInput, setReadingQuestionsInput] = useState<string>("");
  const [readingReplaceExisting, setReadingReplaceExisting] = useState(true);
  const [docItemCounts, setDocItemCounts] = useState<{ [docId: string]: number }>({});
  const [writingDialogOpen, setWritingDialogOpen] = useState(false);
  const [writingDialogMode, setWritingDialogMode] = useState<'create' | 'manage'>('manage');
  const [speakingDialogOpen, setSpeakingDialogOpen] = useState(false);
  const [speakingDialogMode, setSpeakingDialogMode] = useState<'create' | 'manage'>('manage');
  const [detailSpeakingPrompts, setDetailSpeakingPrompts] = useState<any[] | null>(null);
  const [speakingPartFilter, setSpeakingPartFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [speakingLevelFilter, setSpeakingLevelFilter] = useState("");
  const [speakingCategoryFilter, setSpeakingCategoryFilter] = useState("");
  const [speakingSearchQuery, setSpeakingSearchQuery] = useState("");

  const parsePassageIndexFromPart = (part: any): number | null => {
    const s = String(part || "");
    const m = s.match(/\bpassage\s*(\d)\b/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 1 && n <= 4 ? n : null;
  };

  const sortedDocs = useMemo(() => {
    const safeString = (v: any) => (v == null ? "" : String(v));
    const getTitleKey = (d: any) =>
      safeString(d?.title || d?.fileName).trim().toLowerCase();
    const getCreatedKey = (d: any) => {
      const raw =
        d?.createdAt ?? d?.created_at ?? d?.createdOn ?? d?.created_on ?? null;
      if (!raw) return null;
      const t = Date.parse(String(raw));
      return Number.isFinite(t) ? t : null;
    };

    const next = [...(docs || [])];
    next.sort((a, b) => {
      if (docSort === "title_asc" || docSort === "title_desc") {
        const ta = getTitleKey(a);
        const tb = getTitleKey(b);
        const cmp = ta.localeCompare(tb);
        return docSort === "title_desc" ? -cmp : cmp;
      }

      const ca = getCreatedKey(a);
      const cb = getCreatedKey(b);
      if (ca != null && cb != null) {
        return docSort === "created_asc" ? ca - cb : cb - ca;
      }

      // Fallback: stable-ish sort by title if created time not present.
      const ta = getTitleKey(a);
      const tb = getTitleKey(b);
      const cmp = ta.localeCompare(tb);
      return docSort === "created_asc" ? cmp : -cmp;
    });
    return next;
  }, [docs, docSort]);

  // Insert markdown helper for edit dialog
  const insertEditMarkdown = (prefix: string, suffix: string) => {
    const el = editTextareaRef.current;
    if (!el) {
      setEditDescription((d) => d + prefix + suffix);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const selected = el.value.slice(start, end);
    const after = el.value.slice(end);
    const newVal = before + prefix + selected + suffix + after;
    setEditDescription(newVal);

    requestAnimationFrame(() => {
      const pos =
        before.length + prefix.length + (selected ? selected.length : 0);
      el.focus();
      el.selectionStart = el.selectionEnd = pos;
    });
  };

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!authLoading) {
      setCurrentPage(1);
      load();
    }
  }, [debouncedSearch, skillFilter, pageSize]);

  useEffect(() => {
    if (!authLoading) load();
  }, [currentPage]);

  async function load() {
    try {
      setLoading(true);
      const res = await vtepService.listVtepDocuments({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        skill: skillFilter || undefined,
      });
      setDocs(res.documents || []);
      setTotalDocs(res.total || 0);
      
      // Load item counts for each document
      const counts: { [docId: string]: number } = {};
      
      // Get total prompts count for Writing documents (prompts are shared across all Writing docs)
      let totalWritingPrompts = 0;
      try {
        const prompts = await apiGet<any[]>('/api/vtep-writing/prompts');
        totalWritingPrompts = Array.isArray(prompts) ? prompts.length : 0;
      } catch (err) {
        console.error("Failed to load writing prompts count:", err);
      }
      
      // Get total prompts count for Speaking documents (prompts are shared across all Speaking docs)
      let totalSpeakingPrompts = 0;
      try {
        console.log('🎤 Fetching speaking prompts from API...');
        const response = await apiGet<{ data: any[] }>('/api/vtep-speaking/prompts');
        console.log('🎤 Speaking API response:', response);
        const prompts = response.data || response;
        totalSpeakingPrompts = Array.isArray(prompts) ? prompts.length : 0;
        console.log('🎤 Total speaking prompts:', totalSpeakingPrompts);
      } catch (err) {
        console.error("Failed to load speaking prompts count:", err);
      }
      
      await Promise.all(
        (res.documents || []).map(async (doc) => {
          try {
            const skill = getDocSkill(doc);
            if (skill === "Writing") {
              // All Writing documents share the same prompts pool
              counts[doc.id] = totalWritingPrompts;
            } else if (skill === "Speaking") {
              // All Speaking documents share the same prompts pool
              counts[doc.id] = totalSpeakingPrompts;
            } else {
              // For other skills, count from VtepTestItems linked to this document
              const itemsRes = await vtepService.listVtepDocumentItems(doc.id);
              counts[doc.id] = itemsRes.items?.length || 0;
            }
          } catch {
            counts[doc.id] = 0;
          }
        })
      );
      setDocItemCounts(counts);
    } catch (err) {
      console.error("Failed to load VTEP documents", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast({ title: "Select a PDF file", duration: 3000 });
      return;
    }
    try {
      setLoading(true);
      const res = await vtepService.uploadVtepPdf(
        file,
        title || undefined,
        uploadDescription || undefined,
      );
      toast({ title: "Uploaded", description: "PDF uploaded", duration: 3000 });
      setFile(null);
      setTitle("");
      setUploadDescription("");
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.message || "Upload failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function showDoc(id: string) {
    try {
      setLoading(true);
      const res = await vtepService.getVtepDocument(id);
      setPreview(res.document || null);
      setSelectedDocId(id);
    } catch (err) {
      console.error("Failed to load document", err);
      toast({
        variant: "destructive",
        title: "Failed to load document",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await vtepService.createVtepDocument(
        newDocTitle || undefined,
        newDocDescription || undefined,
      );
      toast({ title: "Created document", duration: 3000 });
      setNewDocTitle("");
      setNewDocDescription("");
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Create failed",
        description: err?.message || "Create failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  function buildCurrentItem() {
    let optionsJson: any = null;
    let answerJson: any = null;
    // copy options so we can set a default selected without mutating UI state
    const optionsCopy = itemOptionsArr.length
      ? itemOptionsArr.map((o) => ({ ...o }))
      : null;
    // If MCQ and no option is selected, default the first option as correct
    if (
      itemType === "mcq" &&
      optionsCopy &&
      !optionsCopy.some((o) => (o as any).selected)
    ) {
      optionsCopy[0].selected = true;
    }
    optionsJson = optionsCopy ? optionsCopy : null;
    if (itemType === "mcq") {
      const correctOptionId =
        (optionsCopy && optionsCopy.find((o) => (o as any).selected)?.id) ??
        (optionsCopy && optionsCopy[0]?.id) ??
        null;
      answerJson = { correctOptionId };
    } else if (itemType === "multichoice") {
      const correctOptionIds = (optionsCopy || [])
        .filter((o) => (o as any).selected)
        .map((o) => o.id);
      answerJson = { correctOptionIds };
    } else {
      const accepted = itemAcceptedAnswers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      answerJson = { accepted };
    }

    return {
      prompt: itemPrompt,
      optionsJson: optionsJson ?? null,
      answerJson: answerJson ?? null,
      skill: activeDocSkill,
      part: itemPart || null,
      difficulty: itemDifficulty ?? null,
      points: Number(itemPoints) || 1,
    };
  }

  function resetItemForm() {
    setItemPrompt("");
    setItemOptionsArr([]);
    setItemAcceptedAnswers("");
    setItemType("mcq");
    setItemSkill("Listening");
    setItemPart("");
    setItemDifficulty(null);
    setItemPoints(1);
    promptInputRef.current?.focus();
  }

  function formatReadingPassageHtml(raw: string): string {
    // Preserve [A][B][C][D] markers.
    // We treat input as Markdown-like text and render a safe subset:
    // - Escapes HTML to avoid injection
    // - Supports **bold**, _italic_ / *italic*, `inline highlight`, <<highlight>>
    // - Preserves line breaks
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    let out = escapeHtml(String(raw ?? ""));

    // Basic emphasis/highlights.
    out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    out = out.replace(/_([^_]+)_/g, '<span class="vstep-em">$1</span>');
    out = out.replace(/\*([^*]+)\*/g, '<span class="vstep-em">$1</span>');
    out = out.replace(/`([^`]+)`/g, '<span class="vstep-hl">$1</span>');
    out = out.replace(/&lt;&lt;([^&]+)&gt;&gt;/g, '<span class="vstep-hl">$1</span>');

    // Preserve line breaks.
    out = out.replace(/\r?\n/g, "<br />");
    return out;
  }

  function toReadingPassageMarkdown(raw: string): string {
    // Make saved passages render as proper Markdown while preserving line breaks.
    // Also supports the legacy highlight marker: <<text>> -> `text`.
    const normalized = String(raw ?? "").replace(/\r\n/g, "\n");
    const withHighlight = normalized.replace(/<<([^>\n]+)>>/g, "`$1`");
    // Force hard line breaks to behave similar to the previous <br/> rendering.
    return withHighlight.split("\n").join("  \n");
  }

  function buildReadingMetaFromInputs(): any | null {
    const raw = String(readingPassageInput || "").trim();
    if (!raw) return null;
    return {
      passages: [{
        index: 1,
        raw: raw,
        html: formatReadingPassageHtml(raw),
      }],
      totalQuestions: pendingItems.length,
    };
  }

  function mergeReadingMeta(existing: any | null | undefined, incoming: any | null | undefined) {
    const existingPassages: any[] = Array.isArray(existing?.passages) ? existing.passages : [];
    const incomingPassages: any[] = Array.isArray(incoming?.passages) ? incoming.passages : [];

    const byIndex = new Map<number, any>();
    for (const p of existingPassages) {
      const idx = Number(p?.index);
      if (Number.isFinite(idx)) byIndex.set(idx, p);
    }
    for (const p of incomingPassages) {
      const idx = Number(p?.index);
      if (Number.isFinite(idx)) byIndex.set(idx, p);
    }

    return {
      ...(existing && typeof existing === "object" ? existing : {}),
      ...(incoming && typeof incoming === "object" ? incoming : {}),
      passages: Array.from(byIndex.values()).sort((a, b) => Number(a.index) - Number(b.index)),
    };
  }

  function parseReadingQuestionBlockV2(
    block: string,
    passageIndex: number,
    qIndexForIds: number,
  ): { item: any | null; errors: string[] } {
    const errors: string[] = [];
    const lines = String(block || "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 3) {
      return { item: null, errors: [`Passage ${passageIndex}: invalid question block`] };
    }

    let prompt = lines[0];
    const optionLines = lines.slice(1, -1);
    const answerLine = lines[lines.length - 1];

    const options: Array<{ letter: string; text: string }> = [];
    const promptExtra: string[] = [];
    for (const line of optionLines) {
      // Accept: A. text | A) text | A: text | A - text | A text | [A] text | (A) text
      const opt =
        /^\s*(?:\(|\[)?\s*([A-D])\s*(?:\)|\])?\s*(?:[\.)\:\-]\s*)?(.+)$/.exec(
          line,
        );
      if (!opt) {
        promptExtra.push(line);
        continue;
      }
      const letter = opt[1]?.toUpperCase?.() || null;
      const text = String(opt[2] || "").trim();
      if (letter && text) {
        options.push({ letter, text });
      } else {
        promptExtra.push(line);
      }
    }
    if (promptExtra.length) {
      prompt = [prompt, ...promptExtra].join("\n");
    }

    let answerLetter: string | null = null;
    const ans1 =
      /^(?:Answer|Đáp\s*án|Correct(?:\s*answer)?)\s*[:\-]?\s*(?:\(|\[)?\s*([A-D])\s*(?:\)|\])?\b/i.exec(
        answerLine,
      );
    if (ans1) answerLetter = ans1[1].toUpperCase();
    if (!answerLetter) {
      const ans2 = /^(?:\(|\[)?\s*([A-D])\s*(?:\)|\])?\b/i.exec(answerLine);
      if (ans2) answerLetter = ans2[1].toUpperCase();
    }
    if (!answerLetter) {
      errors.push(`Passage ${passageIndex}: missing answer (last line)`);
    }
    if (options.length !== 4) {
      errors.push(`Passage ${passageIndex}: expected 4 options, got ${options.length}`);
    }

    const optionsJson = options.map((o, idx) => ({
      id: `${Date.now()}_${passageIndex}_${qIndexForIds}_${idx}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      label: `${o.letter}. ${o.text}`,
    }));
    const correct = answerLetter
      ? optionsJson.find((o) => o.label.startsWith(`${answerLetter}.`))
      : null;

    return {
      item: {
        prompt,
        optionsJson,
        answerJson: answerLetter ? { correctOptionId: correct?.id ?? null } : null,
        skill: "Reading",
        part: `Passage ${passageIndex}`,
        difficulty: null,
      },
      errors,
    };
  }

  function parseReadingQuestionsTextV2(
    text: string,
    passageIndex: number,
  ): { items: any[]; errors: string[] } {
    const errors: string[] = [];
    const items: any[] = [];
    const src = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!src) return { items, errors: [`Passage ${passageIndex}: empty questions`] };

    const isLikelyQuestionBlock = (b: string) => {
      // Must contain at least one A-D option line and an answer line.
      const hasOption =
        /\n\s*(?:\(|\[)?\s*[A-D]\s*(?:\)|\])?\s*(?:[\.)\:\-]\s*)?.+/m.test(b);
      const hasAnswer =
        /\b(?:Answer|Đáp\s*án|Correct(?:\s*answer)?)\b\s*[:\-]?\s*(?:\(|\[)?\s*[A-D]\s*(?:\)|\])?\b/i.test(
          b,
        ) ||
        /^\s*(?:\(|\[)?\s*[A-D]\s*(?:\)|\])?\b/m.test(b);
      return hasOption && hasAnswer;
    };

    // Preferred format: blocks separated by 1 blank line.
    const blocksAll = src
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    // Some users paste "passage text + blank line + questions" into the questions box.
    // In that case, ignore leading non-question blocks.
    const firstQ = blocksAll.findIndex(isLikelyQuestionBlock);
    const blocks = firstQ >= 0 ? blocksAll.slice(firstQ) : blocksAll;

    // If blocks look like numbered questions, fall back to legacy parser.
    const looksNumbered = /^\s*\d{1,2}\s*[\.)]\s+/m.test(src);
    const looksBlocky = blocks.some((b) => /\n\s*[A-D][\]\)\.:\-]?\s*/.test(b));
    if (!looksBlocky && looksNumbered) {
      // Legacy numbered parsing (kept for backward compatibility)
      const legacyErrors: string[] = [];
      const legacyItems: any[] = [];
      const qRe = /^\s*(\d{1,2})\s*[\.)]\s*(.+?)\s*$/gm;
      const starts: Array<{ n: number; idx: number; header: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = qRe.exec(src))) {
        starts.push({ n: Number(m[1]), idx: m.index, header: m[2] || "" });
      }
      if (starts.length === 0) {
        legacyErrors.push(`Passage ${passageIndex}: no questions detected`);
        return { items: legacyItems, errors: legacyErrors };
      }

      for (let i = 0; i < starts.length; i++) {
        const start = starts[i];
        const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
        const chunk = src.slice(start.idx, end).trim();
        const lines = chunk.split(/\n+/).map((l) => l.trim());
        const promptLines: string[] = [];
        const options: Array<{ letter: string; text: string }> = [];
        let answerLetter: string | null = null;
        for (const line of lines) {
          const opt = /^([A-D])\s*[\.)\:]\s*(.+)$/.exec(line);
          if (opt) {
            options.push({ letter: opt[1], text: opt[2].trim() });
            continue;
          }
          const ans = /^(?:Answer|Đáp\s*án|Correct)\s*[:\-]?\s*([A-D])\b/i.exec(line);
          if (ans) {
            answerLetter = ans[1].toUpperCase();
            continue;
          }
          if (!/^\d{1,2}\s*[\.)]\s*/.test(line)) promptLines.push(line);
        }
        if (options.length !== 4) {
          legacyErrors.push(
            `Passage ${passageIndex} Q${start.n}: expected 4 options, got ${options.length}`,
          );
        }
        if (!answerLetter) legacyErrors.push(`Passage ${passageIndex} Q${start.n}: missing answer`);

        const optionsJson = options.map((o, idx) => ({
          id: `${Date.now()}_${passageIndex}_${start.n}_${idx}_${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          label: `${o.letter}. ${o.text}`,
        }));
        const correct = answerLetter
          ? optionsJson.find((o) => o.label.startsWith(`${answerLetter}.`))
          : null;
        legacyItems.push({
          prompt: promptLines.join("\n").trim() || start.header.trim(),
          optionsJson,
          answerJson: answerLetter ? { correctOptionId: correct?.id ?? null } : null,
          skill: "Reading",
          part: `Passage ${passageIndex}`,
          difficulty: null,
        });
      }

      return { items: legacyItems, errors: legacyErrors };
    }

    let qIdx = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!isLikelyQuestionBlock(b)) {
        // Ignore passage paragraphs or stray text blocks.
        continue;
      }
      qIdx++;
      const { item, errors: e } = parseReadingQuestionBlockV2(b, passageIndex, qIdx);
      errors.push(...e);
      if (item) items.push(item);
    }

    return { items, errors };
  }

  function parseReadingQuestionsByPassageInputs(input: string): {
    items: any[];
    errors: string[];
  } {
    const errors: string[] = [];
    const items: any[] = [];
    const raw = String(input || "").trim();
    
    if (!raw) {
      errors.push("No questions input provided");
      return { items, errors };
    }

    const res = parseReadingQuestionsTextV2(raw, 1);
    errors.push(...res.errors);

    // Require exactly 10 questions per passage
    if (res.items.length !== 10) {
      errors.push(`Expected 10 questions, got ${res.items.length}`);
    }
    items.push(...res.items);

    if (items.length === 0) {
      errors.push("No questions detected in the input");
    }

    return { items, errors };
  }

  function parseVstepReadingQuestionsOnlyImport(text: string): {
    items: any[];
    errors: string[];
  } {
    const errors: string[] = [];
    const src = String(text || "").replace(/\r\n/g, "\n");
    const items: any[] = [];
    if (!src.trim()) return { items, errors: ["Empty input"] };

    // Parse questions 1..40 from a single block.
    const qRe = /^\s*(\d{1,2})\s*[\.)]\s*(.+?)\s*$/gm;
    const starts: Array<{ n: number; idx: number; header: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = qRe.exec(src))) {
      starts.push({ n: Number(m[1]), idx: m.index, header: m[2] || "" });
    }
    if (starts.length === 0) {
      return { items, errors: ["No questions detected"] };
    }

    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
      const chunk = src.slice(start.idx, end).trim();

      const lines = chunk.split(/\n+/).map((l) => l.trim());
      const promptLines: string[] = [];
      const options: Array<{ letter: string; text: string }> = [];
      let answerLetter: string | null = null;

      for (const line of lines) {
        const opt = /^([A-D])\s*[\.)]\s*(.+)$/.exec(line);
        if (opt) {
          options.push({ letter: opt[1], text: opt[2].trim() });
          continue;
        }
        const ans = /^(?:Answer|Đáp\s*án|Correct)\s*[:\-]?\s*([A-D])\b/i.exec(
          line,
        );
        if (ans) {
          answerLetter = ans[1].toUpperCase();
          continue;
        }
        if (!/^\d{1,2}\s*[\.)]\s*/.test(line)) promptLines.push(line);
      }

      if (options.length !== 4) {
        errors.push(`Q${start.n}: expected 4 options, got ${options.length}`);
      }
      if (!answerLetter) errors.push(`Q${start.n}: missing answer`);

      const passageIndex = Math.min(4, Math.max(1, Math.ceil(start.n / 10)));
      const optionsJson = options.map((o, idx) => ({
        id: `${Date.now()}_${passageIndex}_${start.n}_${idx}_${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        label: `${o.letter}. ${o.text}`,
      }));
      const correct = answerLetter
        ? optionsJson.find((o) => o.label.startsWith(`${answerLetter}.`))
        : null;

      items.push({
        prompt: promptLines.join("\n").trim() || start.header.trim(),
        optionsJson,
        answerJson: answerLetter ? { correctOptionId: correct?.id ?? null } : null,
        skill: "Reading",
        part: `Passage ${passageIndex}`,
        difficulty: null,
      });
    }

    // No strict count enforcement here; documents can be built passage-by-passage.

    return { items, errors };
  }

  function parseVstepReadingImport(text: string): {
    items: any[];
    meta: any | null;
    errors: string[];
  } {
    const errors: string[] = [];
    const src = String(text || "").replace(/\r\n/g, "\n");
    if (!src.trim()) return { items: [], meta: null, errors: ["Empty input"] };

    const passages: Array<{ index: number; raw: string; html: string }> = [];
    const allItems: any[] = [];

    const hasHeadings = /^\s*PASSAGE\s*\d\b/im.test(src);
    if (hasHeadings) {
      // Find PASSAGE headings.
      const headingRe = /^\s*PASSAGE\s*(\d)\b.*$/gim;
      const headings: Array<{ idx: number; n: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = headingRe.exec(src))) {
        headings.push({ idx: m.index, n: Number(m[1]) });
      }
      if (headings.length === 0) {
        errors.push("No PASSAGE sections found");
      }

      const unique = new Map<number, number>();
      for (const h of headings) if (!unique.has(h.n)) unique.set(h.n, h.idx);
      const ordered = Array.from(unique.entries())
        .map(([n, idx]) => ({ n, idx }))
        .sort((a, b) => a.idx - b.idx);

      for (let i = 0; i < ordered.length; i++) {
        const { n: passageIndex, idx } = ordered[i];
        const end = i + 1 < ordered.length ? ordered[i + 1].idx : src.length;
        const chunk = src.slice(idx, end).trim();

        // Remove the heading line.
        const chunkLines = chunk.split("\n");
        const body = chunkLines.slice(1).join("\n").trim();

        // New preferred format: passage text + 1 blank line + question blocks.
        const parts = body.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
        // Heuristic: find first block that looks like a question block.
        let firstQuestionIdx = -1;
        for (let bi = 0; bi < parts.length; bi++) {
          const b = parts[bi];
          if (/\n\s*(?:\[)?[A-D](?:\])?\s*[\.)\:]/.test(b) && /\b(?:Answer|Đáp\s*án|Correct)\b|^\s*[A-D]\b/m.test(b)) {
            firstQuestionIdx = bi;
            break;
          }
        }

        const passageText = firstQuestionIdx === -1 ? body : parts.slice(0, firstQuestionIdx).join("\n\n");
        const questionsBlocks = firstQuestionIdx === -1 ? [] : parts.slice(firstQuestionIdx);

        passages.push({
          index: passageIndex,
          raw: passageText.trim(),
          html: formatReadingPassageHtml(passageText.trim()),
        });

        if (questionsBlocks.length === 0) {
          errors.push(`PASSAGE ${passageIndex}: could not find questions blocks`);
          continue;
        }

        const qText = questionsBlocks.join("\n\n");
        const { items, errors: qErrors } = parseReadingQuestionsTextV2(qText, passageIndex);
        errors.push(...qErrors);
        allItems.push(...items);
      }
    } else {
      // No PASSAGE headings: expect 1-4 passage chunks separated by 2 blank lines.
      const chunks = src
        .split(/\n\s*\n\s*\n+/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (chunks.length > 4) {
        errors.push(`Expected at most 4 passages separated by 2 blank lines, found ${chunks.length}`);
      }

      for (let i = 0; i < Math.min(4, chunks.length); i++) {
        const passageIndex = i + 1;
        const chunk = chunks[i];
        const blocks = chunk.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
        // Determine where questions start.
        let firstQuestionIdx = -1;
        for (let bi = 0; bi < blocks.length; bi++) {
          const b = blocks[bi];
          if (/\n\s*(?:\[)?[A-D](?:\])?\s*[\.)\:]/.test(b) && /\b(?:Answer|Đáp\s*án|Correct)\b|^\s*[A-D]\b/m.test(b)) {
            firstQuestionIdx = bi;
            break;
          }
        }
        const passageText = firstQuestionIdx === -1 ? chunk : blocks.slice(0, firstQuestionIdx).join("\n\n");
        const questionBlocks = firstQuestionIdx === -1 ? [] : blocks.slice(firstQuestionIdx);
        passages.push({
          index: passageIndex,
          raw: passageText.trim(),
          html: formatReadingPassageHtml(passageText.trim()),
        });
        if (questionBlocks.length === 0) {
          errors.push(`Passage ${passageIndex}: missing questions blocks`);
          continue;
        }
        const qText = questionBlocks.join("\n\n");
        const { items, errors: qErrors } = parseReadingQuestionsTextV2(qText, passageIndex);
        errors.push(...qErrors);
        allItems.push(...items);
      }
    }

    if (passages.length === 0) {
      errors.push("No passages detected");
    }

    const meta = {
      passages: passages
        .sort((a, b) => a.index - b.index)
        .map((p) => ({ index: p.index, html: p.html, raw: p.raw })),
      totalQuestions: allItems.length,
    };

    return { items: allItems, meta, errors };
  }

  function parseImportText(text: string) {
    if (!text) return [];
    const blocks = text
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
    const items: any[] = [];
    for (const blk of blocks) {
      const lines = blk
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      // Heuristic: first line is prompt, remaining are options
      const prompt = lines[0];
      const opts = lines.slice(1);
      if (opts.length === 0) {
        // If only one line, treat as text item where accepted answer equals prompt
        items.push({
          prompt,
          optionsJson: null,
          answerJson: { accepted: [prompt] },
          skill: "Listening",
          part: null,
          difficulty: null,
        });
        continue;
      }

      const optionsJson = opts.map((o, idx) => ({
        id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        label: o,
      }));

      // Detect marked correct answers (prefix '*' or contains '(correct)' or '[x]')
      let correctFound = false;
      for (const o of optionsJson) {
        if (
          /^\*\s*/.test(o.label) ||
          /\(correct\)/i.test(o.label) ||
          /\[x\]/i.test(o.label)
        ) {
          correctFound = true;
          o.label = o.label
            .replace(/^\*\s*/, "")
            .replace(/\(correct\)/i, "")
            .replace(/\[x\]/i, "")
            .trim();
          (o as any).selected = true;
        }
      }

      const answerJson = { correctOptionId: null };
      if (correctFound) {
        const sel = optionsJson.find((o: any) => o.selected);
        answerJson.correctOptionId = sel?.id ?? null;
      }

      items.push({
        prompt,
        optionsJson,
        answerJson: correctFound ? answerJson : null,
        skill: "Listening",
        part: null,
        difficulty: null,
      });
    }
    return items;
  }

  function addToBatch() {
    if (!selectedDocId) {
      toast({ title: "Select or preview a document first", duration: 3000 });
      return;
    }
    const built = buildCurrentItem();
    if (!built.prompt || built.prompt.trim() === "") {
      toast({ title: "Prompt is required", duration: 3000 });
      return;
    }
    setPendingItems((s) => [...s, built]);
    resetItemForm();
  }

  function addParsedItemsToPending() {
    if (parsedImportItems.length === 0) {
      toast({
        title: "No parsed items to add",
        duration: 3000,
      });
      return;
    }

    if (activeDocSkill === "Reading") {
      const meta = parsedReadingMeta || buildReadingMetaFromInputs();
      // Allow adding questions even if passages aren't filled yet.
      if (meta) setPendingReadingMeta(meta);
    }

    setPendingItems((s) => [...s, ...parsedImportItems]);
    setParsedImportItems([]);
    setImportText("");
    toast({
      title: "Added parsed items to pending list",
      duration: 3000,
    });
  }

  async function saveBatch() {
    if (!selectedDocId) {
      toast({ title: "Select or preview a document first", duration: 3000 });
      return;
    }
    if (pendingItems.length === 0) {
      toast({ title: "No items to save", duration: 3000 });
      return;
    }
    try {
      setLoading(true);

      let existingItemsForValidation: any[] | null = null;

      if (activeDocSkill === "Reading") {
        const existing = await vtepService.listVtepDocumentItems(selectedDocId);
        existingItemsForValidation = existing?.items || [];

        const pendingPassageCounts = new Map<number, number>();
        const existingPassageCounts = new Map<number, number>();
        const passagesToReplace = new Set<number>();
        const pendingMissingPassage: number[] = [];

        for (const it of pendingItems) {
          const idx = parsePassageIndexFromPart(it?.part);
          if (!idx) {
            pendingMissingPassage.push(1);
            continue;
          }
          pendingPassageCounts.set(idx, (pendingPassageCounts.get(idx) || 0) + 1);
          if (readingReplaceExisting) passagesToReplace.add(idx);
        }

        for (const ex of existingItemsForValidation) {
          const idx = parsePassageIndexFromPart(ex?.part);
          if (!idx) continue;
          existingPassageCounts.set(idx, (existingPassageCounts.get(idx) || 0) + 1);
        }

        if (pendingMissingPassage.length > 0) {
          toast({
            variant: "destructive",
            title: "Reading validation failed",
            description: "All Reading questions must have part = Passage 1..4.",
            duration: 5000,
          });
          return;
        }

        const violations: string[] = [];
        let totalAfter = 0;
        for (let p = 1; p <= 4; p++) {
          const existingCount = existingPassageCounts.get(p) || 0;
          const baseCount = readingReplaceExisting && passagesToReplace.has(p) ? 0 : existingCount;
          const addCount = pendingPassageCounts.get(p) || 0;
          const nextCount = baseCount + addCount;
          totalAfter += nextCount;
          if (nextCount > 10) {
            violations.push(`Passage ${p}: would have ${nextCount} questions (max 10)`);
          }
        }

        if (totalAfter > 40) {
          violations.push(`Total: would have ${totalAfter} questions (max 40)`);
        }

        if (violations.length > 0) {
          toast({
            variant: "destructive",
            title: "Reading validation failed",
            description: violations.slice(0, 3).join(" | "),
            duration: 7000,
          });
          return;
        }
      }

      if (activeDocSkill === "Reading" && readingReplaceExisting) {
        const passageSet = new Set<number>();
        for (const it of pendingItems) {
          const idx = parsePassageIndexFromPart(it?.part);
          if (idx) passageSet.add(idx);
        }

        if (passageSet.size > 0 && selectedDocId) {
          const passageList = Array.from(passageSet.values()).sort((a, b) => a - b);
          toast({
            title: `Replacing existing questions for ${passageList.map((p) => `Passage ${p}`).join(", ")}`,
            duration: 2500,
          });
          const existingItems: any[] = existingItemsForValidation || [];
          const toDelete = existingItems.filter((ex) => {
            const idx = parsePassageIndexFromPart(ex?.part);
            return !!idx && passageSet.has(idx);
          });

          for (const ex of toDelete) {
            if (!ex?.id) continue;
            await vtepService.deleteVtepItem(selectedDocId, ex.id);
          }
        }
      }

      if (activeDocSkill === "Reading") {
        const latest = await vtepService.getVtepDocument(selectedDocId);
        const currentToc = latest?.document?.tocJson || null;
        const existingMeta =
          currentToc && typeof currentToc === "object" ? (currentToc as any).reading : null;
        const metaFromInputs = buildReadingMetaFromInputs();
        const metaRaw = pendingReadingMeta || metaFromInputs || existingMeta;
        const meta = mergeReadingMeta(existingMeta, metaRaw);
        if (!meta || !Array.isArray(meta.passages) || meta.passages.length === 0) {
          toast({
            variant: "destructive",
            title: "Missing Reading passages",
            description: "Provide at least 1 passage before saving.",
            duration: 4000,
          });
          return;
        }

        const nextToc = {
          ...(currentToc && typeof currentToc === "object" ? currentToc : {}),
          skill: "Reading",
          reading: meta,
        };
        await vtepService.updateVtepDocument(
          selectedDocId,
          undefined,
          undefined,
          nextToc,
        );
      }

      await vtepService.addVtepItems(selectedDocId, pendingItems);
      toast({ title: "Items saved", duration: 3000 });
      setPendingItems([]);
      setPendingReadingMeta(null);
      setParsedReadingMeta(null);
      setIsAddItemOpen(false);
      setReadingReplaceExisting(true);
      await load();
      if (selectedDocId) await showDoc(selectedDocId);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Save items failed",
        description: err?.message || "Save items failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  function truncateText(t: string | null | undefined, n = 240) {
    if (!t) return "";
    if (t.length <= n) return t;
    return t.slice(0, n) + "...";
  }

  function toggleExpand(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function openEdit(doc: any) {
    setEditDocId(doc.id);
    setEditTitle(doc.title || "");
    setEditDescription(doc.description || "");
    setEditOpen(true);
  }

  function openDetails(doc: any, autoLoad = false) {
    // Open the details modal. By default we do NOT auto-fetch items to
    // avoid accidental heavy loads; pass `autoLoad=true` to load items.
    setDetailDoc(doc);
    setDetailItems(null);
    setDetailOpen(true);
    // Refresh full document details (tocJson can be truncated in list responses).
    if (doc?.id) {
      setTimeout(async () => {
        try {
          let res;
          if (canManage) {
            res = await vtepService.getVtepDocument(doc.id);
          } else {
            res = await vtepService.getVtepDocumentPublic(doc.id);
          }
          if (res?.document) setDetailDoc(res.document);
        } catch {
          // ignore
        }
      }, 0);
    }
    if (autoLoad) setTimeout(() => void fetchDetailItems(doc?.id), 0);
  }

  async function fetchDetailItems(docId?: string) {
    const id = typeof docId === "string" ? docId : detailDoc?.id;
    if (!id) {
      console.warn("No document ID provided for fetchDetailItems");
      return;
    }
    
    console.log("🔍 Fetching detail items for document:", id, "skill:", getDocSkill(detailDoc));
    console.log("👤 User role check - isAdmin:", isAdmin(), "isTeacher:", isTeacher(), "canManage:", canManage);
    
    try {
      setDetailLoading(true);
      // Ensure we have the latest tocJson for passage display.
      try {
        let docRes;
        if (canManage) {
          docRes = await vtepService.getVtepDocument(id);
        } else {
          docRes = await vtepService.getVtepDocumentPublic(id);
        }
        if (docRes?.document) setDetailDoc(docRes.document);
      } catch (docError) {
        console.warn("Failed to refresh document details:", docError);
      }

      console.log("📋 Calling listVtepDocumentItems for document:", id);
      let res;
      if (canManage) {
        console.log("👤 Using admin endpoint (user has manage permissions)");
        res = await vtepService.listVtepDocumentItems(id);
      } else {
        console.log("👤 Using public endpoint (user is student)");
        res = await vtepService.listVtepDocumentItemsPublic(id);
      }
      console.log("📋 Received items response:", res);
      
      // Log document metadata for debugging
      if (detailDoc) {
        console.log("📄 Document metadata:", {
          title: detailDoc.title,
          skill: getDocSkill(detailDoc),
          hasTocJson: !!detailDoc.tocJson,
          tocJsonKeys: detailDoc.tocJson ? Object.keys(detailDoc.tocJson) : [],
          descriptionLength: detailDoc.description?.length || 0
        });
        
        if (detailDoc.tocJson?.writing) {
          console.log("✍️  Writing metadata found in tocJson:", detailDoc.tocJson.writing);
        }
      }
      
      const items = res.items || [];
      console.log("📋 Total items found:", items.length);
      
      // Debug prompt content
      items.forEach((item, index) => {
        console.log(`📝 Item ${index + 1}:`, {
          id: item.id,
          promptLength: item.prompt?.length || 0,
          promptPreview: item.prompt?.substring(0, 100) || '(no prompt)',
          hasOptions: !!item.optionsJson,
          hasAnswer: !!item.answerJson
        });
      });
      
      setDetailItems(items);
      
      // For Writing documents, also fetch writing prompts from VtepWritingPrompts table
      const docSkill = getDocSkill(detailDoc);
      if (docSkill === "Writing") {
        console.log("✍️  Fetching writing prompts from VtepWritingPrompts table...");
        try {
          const filters: any = {};
          if (promptTaskTypeFilter && promptTaskTypeFilter !== "all") filters.taskType = promptTaskTypeFilter;
          if (promptLevelFilter) filters.level = promptLevelFilter;
          if (promptCategoryFilter) filters.category = promptCategoryFilter;
          if (promptSearchQuery) filters.search = promptSearchQuery;
          
          const promptsRes = await vtepService.listWritingPrompts(filters);
          console.log("✍️  Writing prompts response:", promptsRes);
          const prompts = Array.isArray(promptsRes) ? promptsRes : [];
          console.log(`✍️  Total writing prompts found: ${prompts.length}`);
          setDetailWritingPrompts(prompts);
          
        } catch (err) {
          console.error("❌ Failed to load writing prompts:", err);
          setDetailWritingPrompts([]);
        }
      } else if (docSkill === "Speaking") {
        console.log("🎤  Fetching speaking prompts from VtepSpeakingPrompts table...");
        try {
          const filters: any = {};
          if (speakingPartFilter && speakingPartFilter !== "all") filters.partNumber = parseInt(speakingPartFilter);
          if (speakingLevelFilter) filters.level = speakingLevelFilter;
          if (speakingCategoryFilter) filters.category = speakingCategoryFilter;
          if (speakingSearchQuery) filters.search = speakingSearchQuery;
          
          console.log("🎤  Calling listSpeakingPrompts with filters:", filters);
          const speakingService = await import("@/services/vtep-speaking");
          const promptsRes = await speakingService.listSpeakingPrompts(filters);
          console.log("🎤  Speaking prompts response:", promptsRes);
          console.log("🎤  Response type:", typeof promptsRes);
          console.log("🎤  Is array?", Array.isArray(promptsRes));
          const prompts = Array.isArray(promptsRes) ? promptsRes : [];
          console.log(`🎤  Total speaking prompts found: ${prompts.length}`);
          setDetailSpeakingPrompts(prompts);
          
        } catch (err) {
          console.error("❌ Failed to load speaking prompts:", err);
          console.error("❌ Error details:", err);
          setDetailSpeakingPrompts([]);
        }
      } else {
        setDetailWritingPrompts(null);
        setDetailSpeakingPrompts(null);
      }
      
      // Only show toast for non-writing/speaking documents or when no items found
      if (items.length === 0) {
        const skill = getDocSkill(detailDoc);
        if (skill !== "Writing" && skill !== "Speaking") {
          toast({
            title: "No Items Found",
            description: `This ${skill} document doesn't have any test items yet.`,
            duration: 4000,
          });
        }
        // For writing/speaking documents, we'll check prompts first before showing any toast
      }
    } catch (err) {
      console.error("❌ Failed to load items for document:", id, err);
      setDetailItems([]);
      
      const errorMessage = (err as any)?.message || "Failed to list items";
      console.error("Error details:", errorMessage);
      
      // Check for common error types
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "You may not have permission to view items for this document. Check your role permissions.",
          duration: 6000,
        });
      } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        toast({
          variant: "destructive", 
          title: "Permission Denied",
          description: "You don't have permission to access items for this document. Admin or Teacher role required.",
          duration: 6000,
        });
      } else if (errorMessage.includes("404")) {
        toast({
          variant: "destructive",
          title: "Document Not Found",
          description: "This document may have been deleted or moved.",
          duration: 6000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to load items",
          description: `${errorMessage}. Check console for details.`,
          duration: 6000,
        });
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveReadingPassagesOnly() {
    if (!selectedDocId) {
      toast({ title: "Select or preview a document first", duration: 3000 });
      return;
    }
    if (activeDocSkill !== "Reading") return;
    try {
      setLoading(true);
      const latest = await vtepService.getVtepDocument(selectedDocId);
      const currentToc = latest?.document?.tocJson || null;
      const existingMeta =
        currentToc && typeof currentToc === "object" ? (currentToc as any).reading : null;
      const metaFromInputs = buildReadingMetaFromInputs();
      if (!metaFromInputs) {
        toast({
          variant: "destructive",
          title: "Missing Reading passages",
          description: "Provide at least 1 passage before saving.",
          duration: 4000,
        });
        return;
      }
      const merged = mergeReadingMeta(existingMeta, metaFromInputs);
      const nextToc = {
        ...(currentToc && typeof currentToc === "object" ? currentToc : {}),
        skill: "Reading",
        reading: merged,
      };
      await vtepService.updateVtepDocument(selectedDocId, undefined, undefined, nextToc);
      toast({ title: "Passages saved", duration: 2500 });
      await load();
      if (selectedDocId) await showDoc(selectedDocId);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Save passages failed",
        description: err?.message || "Save passages failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChooseAudio() {
    audioInputRef.current?.click();
  }

  async function handleAudioSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedAudioFile(f);
  }

  async function handleUploadAudio() {
    if (!detailDoc) return;
    if (!selectedAudioFile) {
      toast({ title: "Select an audio file first", duration: 3000 });
      return;
    }
    try {
      setUploadingAudio(true);
      await vtepService.uploadVtepAudio(detailDoc.id, selectedAudioFile);
      toast({ title: "Audio uploaded", duration: 3000 });
      setSelectedAudioFile(null);
      if (audioInputRef.current) audioInputRef.current.value = "";
      await load();
      const res = await vtepService.getVtepDocument(detailDoc.id);
      setDetailDoc(res.document || null);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.message || "Upload failed",
        duration: 3000,
      });
    } finally {
      setUploadingAudio(false);
    }
  }

  function openEditItem(item: any) {
    setEditItem(item);
    setEditItemPrompt(item.prompt || "");
    setEditItemSkill(item.skill || "");
    setEditItemPart(item.part || "");
    setEditItemDifficulty(
      typeof item.difficulty === "number" ? item.difficulty : null,
    );
    setEditItemPoints(item.points ?? item.data?.points ?? 1);

    if (item.optionsJson && Array.isArray(item.optionsJson)) {
      // determine selected flags from answerJson
      const ans = item.answerJson || {};
      const selectedMap: { [k: string]: boolean } = {};
      if (
        ans &&
        typeof ans.correctOptionId !== "undefined" &&
        ans.correctOptionId !== null
      ) {
        selectedMap[String(ans.correctOptionId)] = true;
      }
      if (ans && Array.isArray(ans.correctOptionIds)) {
        for (const id of ans.correctOptionIds) selectedMap[String(id)] = true;
      }
      const opts = item.optionsJson.map((o: any) => ({
        id: o.id ?? String(Math.random()),
        label: o.label ?? "",
        selected: !!selectedMap[String(o.id)],
      }));
      setEditItemOptionsArr(opts);
    } else if (item.answerJson && Array.isArray(item.answerJson.accepted)) {
      setEditItemOptionsArr([]);
      setEditItemAcceptedAnswers((item.answerJson.accepted || []).join(", "));
    } else {
      setEditItemOptionsArr([]);
      setEditItemAcceptedAnswers("");
    }

    setEditItemOpen(true);
  }

  async function handleEditItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detailDoc || !editItem) return;
    try {
      setLoading(true);
      // build payload
      let optionsJson: any = null;
      let answerJson: any = null;
      if (editItemOptionsArr && editItemOptionsArr.length > 0) {
        const optsCopy = editItemOptionsArr.map((o) => ({
          id: o.id,
          label: o.label,
        }));
        optionsJson = optsCopy;
        const selected = editItemOptionsArr
          .filter((o) => o.selected)
          .map((o) => o.id);
        if (selected.length === 1) {
          answerJson = { correctOptionId: selected[0] };
        } else {
          answerJson = { correctOptionIds: selected };
        }
      } else {
        const accepted = (editItemAcceptedAnswers || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        answerJson = { accepted };
      }

      const payload = {
        sectionKey: editItem.sectionKey ?? null,
        skill: editItemSkill || null,
        part: editItemPart || null,
        prompt: editItemPrompt || null,
        optionsJson: optionsJson ?? null,
        answerJson: answerJson ?? null,
        mediaUrl: editItem.mediaUrl ?? null,
        difficulty: editItemDifficulty ?? null,
        points: Number(editItemPoints) || 1,
      };

      await vtepService.updateVtepItem(detailDoc.id, editItem.id, payload);
      setEditItemOpen(false);
      await fetchDetailItems();
      toast({ title: "Item updated", duration: 3000 });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update item failed",
        description: err?.message || "Update item failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!detailDoc) return;
    if (!confirm("Delete this item?")) return;
    try {
      setLoading(true);
      await vtepService.deleteVtepItem(detailDoc.id, itemId);
      await fetchDetailItems();
      toast({ title: "Item deleted", duration: 3000 });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message || "Delete failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  function shuffleArray<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function addDetailToPractice(count: number) {
    if (!detailDoc) {
      toast({ title: "No document selected", duration: 3000 });
      return;
    }
    if (!count || count <= 0) {
      toast({ title: "Enter a positive number of questions", duration: 3000 });
      return;
    }
    setPracticeSelections((s) => {
      const exists = s.find((x) => x.docId === detailDoc.id);
      if (exists)
        return s.map((x) => (x.docId === detailDoc.id ? { ...x, count } : x));
      return [
        ...s,
        {
          docId: detailDoc.id,
          title: detailDoc.title || detailDoc.fileName,
          count,
          audioPath: detailDoc.audioPath || undefined,
        },
      ];
    });
    toast({ title: "Added to practice selections", duration: 3000 });
  }

  function removePracticeSelection(docId: string) {
    setPracticeSelections((s) => s.filter((x) => x.docId !== docId));
  }

  async function generatePracticeSet() {
    if (practiceSelections.length === 0) {
      toast({
        title: "No documents selected for practice set",
        duration: 3000,
      });
      return;
    }
    try {
      setLoading(true);
      const allItems: any[] = [];
      
      // Sort practiceSelections by passage number to ensure correct order
      const sortedSelections = [...practiceSelections].sort((a, b) => {
        const docA = sortedDocs.find(d => d.id === a.docId);
        const docB = sortedDocs.find(d => d.id === b.docId);
        
        // Extract passage numbers from titles
        const getPassageNum = (title: string) => {
          const match = title?.match(/passage\s*(\d+)/i);
          return match ? parseInt(match[1], 10) : 999;
        };
        
        const numA = getPassageNum(docA?.title || '');
        const numB = getPassageNum(docB?.title || '');
        
        return numA - numB;
      });
      
      for (const sel of sortedSelections) {
        const res = await vtepService.listVtepDocumentItems(sel.docId);
        const items = res.items || [];
        
        // Check if this is a reading document with passages
        const doc = sortedDocs.find(d => d.id === sel.docId);
        const isReading = doc?.tocJson?.skill === 'Reading' || 
                         items.some(it => String(it.part || '').toLowerCase().includes('passage'));
        
        let sampled: any[];
        if (isReading) {
          // Extract passage number from document title (e.g., "VSTEP READING PRACTICE TEST 1 - Passage 2")
          let basePassageNum = 1;
          if (doc?.title) {
            const match = doc.title.match(/passage\s*(\d+)/i);
            if (match) {
              basePassageNum = parseInt(match[1], 10);
            }
          }
          
          // For reading documents, assign part based on document title or TOC
          // If document has multiple passages, assign sequentially
          const itemsWithPart = items.map((it, idx) => {
            // If document only has this passage, all items belong to this passage
            const passageNum = basePassageNum;
            return {
              ...it,
              part: `Passage ${passageNum}`,
              skill: 'Reading'
            };
          });
          
          // Group by passage
          const passageGroups = new Map<string, any[]>();
          itemsWithPart.forEach(it => {
            const passageKey = it.part.toLowerCase();
            if (!passageGroups.has(passageKey)) {
              passageGroups.set(passageKey, []);
            }
            passageGroups.get(passageKey)!.push(it);
          });
          
          // Take complete passages only (all 10 questions per passage)
          // Never split a passage - always take full passages
          sampled = [];
          const passageKeys = Array.from(passageGroups.keys()).sort(); // Sort to maintain consistent order
          const passagesToTake = Math.ceil(sel.count / 10); // Calculate how many passages needed
          
          for (let i = 0; i < Math.min(passagesToTake, passageKeys.length); i++) {
            const passageItems = passageGroups.get(passageKeys[i]) || [];
            // Add all questions from this passage without shuffling
            sampled.push(...passageItems);
          }
          
          // DO NOT shuffle or slice reading items - keep complete passages intact
        } else {
          // For non-reading, random sample
          sampled = shuffleArray(items).slice(0, sel.count);
        }
        
        allItems.push(
          ...sampled.map((it) => ({ ...it, sourceDocId: sel.docId, sourceDocumentId: sel.docId })),
        );
      }
      
      // Don't shuffle reading items to keep passage order
      const hasReading = allItems.some(it => 
        String(it.part || '').toLowerCase().includes('passage')
      );
      const final = hasReading ? allItems : shuffleArray(allItems);
      
      setPracticeSet(final);
      setPracticePreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to generate practice set",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePracticeAsPublicTest() {
    if (!practiceSet || practiceSet.length === 0) {
      toast({ title: "No practice set to save", duration: 3000 });
      return;
    }
    try {
      setLoading(true);
      // Build items for backend
      const itemsForTest = (practiceSet || []).map((it: any, idx: number) => ({
        itemKey: it.id || `q-${idx}`,
        kind: "vtep",
        skill: it.skill || null,
        data: it,
      }));
      const { apiPost } = await import("@/services/api");
      const payload = {
        type: "practice",
        data: { source: "vtep", docs: practiceSelections.map((s) => s.docId) },
        items: itemsForTest,
        totalQuestions: itemsForTest.length,
        isPublic: true,
      };
      await apiPost("/api/tests", payload);
      toast({ title: "Public test created", duration: 3000 });
      setPracticePreviewOpen(false);
    } catch (err: any) {
      console.error("Failed to save public test", err);
      toast({
        variant: "destructive",
        title: "Failed to save test",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePracticeAsVtepTest() {
    if (!practiceSet || practiceSet.length === 0) {
      toast({ title: "No practice set to save", duration: 3000 });
      return;
    }
    try {
      setLoading(true);
      
      // Collect unique document IDs that have audio
      const docIdsWithAudio = new Set<string>();
      const audioPathMap = new Map<string, string>();
      
      // Get audio paths from documents in practiceSelections
      console.log('🎵 Practice selections:', practiceSelections);
      for (const sel of practiceSelections) {
        if (sel.audioPath) {
          console.log('🎵 Found audio:', sel.audioPath, 'for doc:', sel.docId);
          docIdsWithAudio.add(sel.docId);
          audioPathMap.set(sel.docId, sel.audioPath);
        }
      }
      console.log('🎵 Audio path map:', Object.fromEntries(audioPathMap));
      
      const itemsForVtep = (practiceSet || []).map((it: any) => {
        const sourceDocId = it.sourceDocumentId || it.sourceDocId || it.documentId || null;
        return {
          prompt: it.prompt || null,
          optionsJson: it.optionsJson ?? null,
          answerJson: it.answerJson ?? null,
          sourceDocumentId: sourceDocId,
          difficulty: it.difficulty ?? null,
          sectionKey: it.sectionKey ?? null,
          skill: it.skill || null,
          part: it.part || null,
          // Include audio as mediaUrl if this item's source document has audio
          mediaUrl: sourceDocId && audioPathMap.has(sourceDocId) ? audioPathMap.get(sourceDocId) : null,
        };
      });
      
      const { apiPost } = await import("@/services/api");
      const title = `VTEP test: ${practiceSelections.map((s) => s.title).join(", ")}`;
      const payload = {
        title,
        description: `Generated from documents: ${practiceSelections.map((s) => s.title).join(", ")}`,
        items: itemsForVtep,
        isActive: false,
        isPublic: true,
      };
      await apiPost("/api/vteptests", payload);
      toast({ title: "VTEP test created", duration: 3000 });
      setPracticePreviewOpen(false);
    } catch (err: any) {
      console.error("Failed to save VTEP test", err);
      toast({
        variant: "destructive",
        title: "Failed to save test",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editDocId) return;
    try {
      setLoading(true);
      await vtepService.updateVtepDocument(
        editDocId,
        editTitle || undefined,
        editDescription || undefined,
      );
      setEditOpen(false);
      await load();
      toast({ title: "Updated", duration: 3000 });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message || "Update failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document and its items?")) return;
    try {
      setLoading(true);
      await vtepService.deleteVtepDocument(docId);
      await load();
      toast({ title: "Deleted", duration: 3000 });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message || "Delete failed",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div>Loading...</div>;
  if (!canManage) return <div>Access denied.</div>;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 bg-white rounded-md p-6 overflow-x-hidden">
      <h1 className="text-2xl font-bold">VTEP Document Manager</h1>

      <form onSubmit={handleUpload} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Optional title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Optional description"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>
      </form>

      <div className="border rounded p-3">
        <h2 className="font-medium">Create Document Manually</h2>
        <div className="mt-2 flex gap-2">
          <AddVtepDocumentDialog onCreated={load} disabled={!canManage} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Documents</h2>
          <div className="flex items-center gap-2">
            <Select value={docSort} onValueChange={(v) => setDocSort(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest</SelectItem>
                <SelectItem value="created_asc">Oldest</SelectItem>
                <SelectItem value="title_asc">Title A → Z</SelectItem>
                <SelectItem value="title_desc">Title Z → A</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={layoutMode === "list" ? "default" : "ghost"}
              onClick={() => setLayoutMode("list")}
            >
              List
            </Button>
            <Button
              size="sm"
              variant={layoutMode === "grid" ? "default" : "ghost"}
              onClick={() => setLayoutMode("grid")}
            >
              Grid
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={skillFilter || "all"} onValueChange={(v) => setSkillFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="Listening">Listening</SelectItem>
              <SelectItem value="Reading">Reading</SelectItem>
              <SelectItem value="Writing">Writing</SelectItem>
              <SelectItem value="Speaking">Speaking</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(v) => setPageSize(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground mb-2">
          Showing {docs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(currentPage * pageSize, totalDocs)} of {totalDocs} documents
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No documents</div>
        ) : (
          <div>
            {layoutMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {sortedDocs.map((d) => (
                  <div
                    key={d.id}
                    className={`border rounded p-4 ${selectedDocId === d.id ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{d.title || d.fileName}</div>
                      <div className="text-xs px-2 py-0.5 rounded border bg-background whitespace-nowrap">
                        {getDocSkill(d)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 max-h-10 overflow-hidden">
                      {d.description ? (
                        <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_h1]:mt-1 [&_h1]:mb-1 [&_h2]:mt-1 [&_h2]:mb-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {d.description}
                          </ReactMarkdown>
                        </article>
                      ) : (
                        "(no description)"
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
                      <span>Pages: {d.pageCount || "-"}</span>
                      <span className="font-medium text-primary">
                        {docItemCounts[d.id] !== undefined 
                          ? (getDocSkill(d) === "Writing" || getDocSkill(d) === "Speaking")
                            ? `${docItemCounts[d.id]} prompts`
                            : `${docItemCounts[d.id]} items`
                          : "..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        title="Preview"
                        onClick={() => openDetails(d)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        title="Add Item"
                        onClick={() => {
                          const skill = getDocSkill(d);
                          // Open Writing dialog if skill is Writing
                          if (skill === "Writing") {
                            setWritingDialogOpen(true);
                            return;
                          }
                          // Open Speaking dialog if skill is Speaking
                          if (skill === "Speaking") {
                            setSelectedDocId(d.id);
                            setPreview(d);
                            setSpeakingDialogMode('create');
                            setSpeakingDialogOpen(true);
                            return;
                          }
                          if (skill !== "Listening" && skill !== "Reading") {
                            toast({
                              title: "Skill not supported yet",
                              description:
                                "Only Listening, Reading, Writing, and Speaking items are supported right now.",
                              duration: 4000,
                            });
                            return;
                          }
                          setSelectedDocId(d.id);
                          setPreview(d);
                          setActiveDocSkill(skill as any);
                          setItemSkill(skill as any);
                          if (skill === "Reading") {
                            setReadingPassageInput("");
                            setReadingQuestionsInput("");
                            setParsedReadingMeta(null);
                            setPendingReadingMeta(null);
                          }
                          setIsAddItemOpen(true);
                        }}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Select"
                        onClick={() => {
                          setSelectedDocId(d.id);
                          setPreview(d);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedDocs.map((d) => (
                  <li
                    key={d.id}
                    className={`border rounded p-3 ${selectedDocId === d.id ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{d.title || d.fileName}</div>
                          <div className="text-xs px-2 py-0.5 rounded border bg-background">
                            {getDocSkill(d)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 max-h-12 overflow-hidden">
                          {d.description ? (
                            <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_h1]:mt-1 [&_h1]:mb-1 [&_h2]:mt-1 [&_h2]:mb-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {d.description}
                              </ReactMarkdown>
                            </article>
                          ) : (
                            "(no description)"
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between gap-4">
                          <span>Pages: {d.pageCount || "-"}</span>
                          <span className="font-medium text-primary">
                            {docItemCounts[d.id] !== undefined 
                              ? (getDocSkill(d) === "Writing" || getDocSkill(d) === "Speaking")
                                ? `${docItemCounts[d.id]} prompts`
                                : `${docItemCounts[d.id]} items`
                              : "..."}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-3 sm:mt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            title="Preview"
                            onClick={() => openDetails(d)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title="Add Item"
                            onClick={() => {
                              const skill = getDocSkill(d);
                              // Open Writing dialog if skill is Writing
                              if (skill === "Writing") {
                                setSelectedDocId(d.id);
                                setPreview(d);
                                setWritingDialogMode('create');
                                setWritingDialogOpen(true);
                                return;
                              }
                              // Open Speaking dialog if skill is Speaking
                              if (skill === "Speaking") {
                                setSelectedDocId(d.id);
                                setPreview(d);
                                setSpeakingDialogMode('create');
                                setSpeakingDialogOpen(true);
                                return;
                              }
                              if (skill !== "Listening" && skill !== "Reading") {
                                toast({
                                  title: "Skill not supported yet",
                                  description:
                                    "Only Listening, Reading, Writing, and Speaking items are supported right now.",
                                  duration: 4000,
                                });
                                return;
                              }
                              setSelectedDocId(d.id);
                              setPreview(d);
                              setActiveDocSkill(skill as any);
                              setItemSkill(skill as any);
                              if (skill === "Reading") {
                                setReadingPassageInput("");
                                setReadingQuestionsInput("");
                                setParsedReadingMeta(null);
                                setPendingReadingMeta(null);
                              }
                              setIsAddItemOpen(true);
                            }}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title="Edit"
                            onClick={() => openEdit(d)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            title="Delete"
                            onClick={() => handleDelete(d.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title="Details"
                            onClick={() => openDetails(d)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title={getDocSkill(d) === "Writing" || getDocSkill(d) === "Speaking" ? "Prompts" : "Items"}
                            onClick={() => {
                              const skill = getDocSkill(d);
                              if (skill === "Writing") {
                                setPreview(d);
                                setSelectedDocId(d.id);
                                setWritingDialogMode('manage');
                                setWritingDialogOpen(true);
                              } else if (skill === "Speaking") {
                                setPreview(d);
                                setSelectedDocId(d.id);
                                setSpeakingDialogMode('manage');
                                setSpeakingDialogOpen(true);
                              } else {
                                openDetails(d, true);
                              }
                            }}
                          >
                            {getDocSkill(d) === "Writing" || getDocSkill(d) === "Speaking" ? "Prompts" : "Items"}
                          </Button>
                          <a href={d.filePath} target="_blank" rel="noreferrer">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Open file"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {totalDocs > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.ceil(totalDocs / pageSize)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(1)}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm px-3">
                {currentPage} / {Math.ceil(totalDocs / pageSize)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= Math.ceil(totalDocs / pageSize) || loading}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= Math.ceil(totalDocs / pageSize) || loading}
                onClick={() => setCurrentPage(Math.ceil(totalDocs / pageSize))}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {preview && preview.textPreview && preview.textPreview.trim() ? (
        <div className="border rounded p-4">
          <h3 className="font-medium">
            Preview: {preview.title || preview.fileName}
          </h3>
          {preview.description ? (
            <div className="text-sm text-muted-foreground max-h-36 overflow-auto whitespace-pre-wrap">
              {preview.description}
            </div>
          ) : null}
          <div className="text-sm text-muted-foreground">
            Pages: {preview.pageCount || "-"}
          </div>
          <div className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap">
            {preview.textPreview}
          </div>
        </div>
      ) : null}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {detailDoc?.title || detailDoc?.fileName || "Document"}
            </DialogTitle>
            <DialogDescription>
              Document details (click "Load details" to fetch items)
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3 flex-1 min-h-0 overflow-y-auto">
            {detailDoc ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Skill: {getDocSkill(detailDoc)}
                </div>
                <div className="text-sm font-medium text-primary">
                  {getDocSkill(detailDoc) === "Writing" 
                    ? (detailWritingPrompts !== null ? `${detailWritingPrompts.length} prompts` : "Prompts not loaded")
                    : getDocSkill(detailDoc) === "Speaking"
                    ? (detailSpeakingPrompts !== null ? `${detailSpeakingPrompts.length} prompts` : "Prompts not loaded")
                    : (detailItems !== null ? `${detailItems.length} items` : "Items not loaded")}
                </div>
              </div>
            ) : null}
            <div className="text-sm text-muted-foreground flex-shrink-0">
              Pages: {detailDoc?.pageCount ?? "-"}
            </div>
            <div className="border rounded p-3 bg-background whitespace-pre-wrap max-h-[20vh] overflow-auto flex-shrink-0">
              {detailDoc?.description ? (
                <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:mt-2 [&_h2]:mb-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {detailDoc.description}
                  </ReactMarkdown>
                </article>
              ) : (
                "(no description)"
              )}
            </div>

            <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-shrink-0 mb-2">
                <h4 className="font-medium">
                  {getDocSkill(detailDoc) === "Writing" ? "Writing Prompts" : getDocSkill(detailDoc) === "Speaking" ? "Speaking Prompts" : "Items"}
                </h4>
                {(getDocSkill(detailDoc) === "Writing" || getDocSkill(detailDoc) === "Speaking") && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (getDocSkill(detailDoc) === "Writing") {
                        setPromptTaskTypeFilter("all");
                        setPromptLevelFilter("");
                        setPromptCategoryFilter("");
                        setPromptSearchQuery("");
                      } else if (getDocSkill(detailDoc) === "Speaking") {
                        setSpeakingPartFilter("all");
                        setSpeakingLevelFilter("");
                        setSpeakingCategoryFilter("");
                        setSpeakingSearchQuery("");
                      }
                      fetchDetailItems();
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Filter controls for writing prompts */}
              {getDocSkill(detailDoc) === "Writing" && detailWritingPrompts !== null && (
                <div className="flex-shrink-0 mb-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Task Type</label>
                      <Select value={promptTaskTypeFilter} onValueChange={(val: any) => { setPromptTaskTypeFilter(val); }}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All tasks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All tasks</SelectItem>
                          <SelectItem value="task1">Task 1</SelectItem>
                          <SelectItem value="task2">Task 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Level</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. B1, B2"
                        value={promptLevelFilter}
                        onChange={(e) => setPromptLevelFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Category"
                        value={promptCategoryFilter}
                        onChange={(e) => setPromptCategoryFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Search</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Search prompts..."
                        value={promptSearchQuery}
                        onChange={(e) => setPromptSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => fetchDetailItems()} className="h-7 text-xs">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Filter controls for speaking prompts */}
              {getDocSkill(detailDoc) === "Speaking" && detailSpeakingPrompts !== null && (
                <div className="flex-shrink-0 mb-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Part</label>
                      <Select value={speakingPartFilter} onValueChange={(val: any) => { setSpeakingPartFilter(val); }}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All parts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All parts</SelectItem>
                          <SelectItem value="1">Part 1</SelectItem>
                          <SelectItem value="2">Part 2</SelectItem>
                          <SelectItem value="3">Part 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Level</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. B1, B2"
                        value={speakingLevelFilter}
                        onChange={(e) => setSpeakingLevelFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Category"
                        value={speakingCategoryFilter}
                        onChange={(e) => setSpeakingCategoryFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Search</label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Search prompts..."
                        value={speakingSearchQuery}
                        onChange={(e) => setSpeakingSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => fetchDetailItems()} className="h-7 text-xs">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {detailItems === null ? (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {getDocSkill(detailDoc) === "Writing" ? "Prompts not loaded." : "Details not loaded."}
                      </div>
                      <Button onClick={() => fetchDetailItems()}>Load {getDocSkill(detailDoc) === "Writing" ? "prompts" : "details"}</Button>
                    </div>
                  ) : detailLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span>Loading {getDocSkill(detailDoc) === "Writing" ? "writing prompts" : "items and prompts"}...</span>
                    </div>
                  ) : getDocSkill(detailDoc) === "Writing" && detailWritingPrompts !== null && detailWritingPrompts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-3">
                        Writing Prompts ({detailWritingPrompts.length} {detailWritingPrompts.length === 1 ? 'prompt' : 'prompts'})
                      </div>
                      {detailWritingPrompts.map((prompt, index) => (
                        <div key={prompt.id} className="border rounded-lg p-4 bg-white/50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {prompt.taskType === "task1" ? "Task 1" : "Task 2"}
                                </span>
                                {prompt.level && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    Level: {prompt.level}
                                  </span>
                                )}
                                {prompt.category && (
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {prompt.category}
                                  </span>
                                )}
                                {prompt.timeLimit && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                    {prompt.timeLimit} mins
                                  </span>
                                )}
                              </div>
                              
                              <h5 className="font-semibold text-gray-900 mb-2">{prompt.title}</h5>
                              
                              <div className="mb-3">
                                <details className="group" open>
                                  <summary className="cursor-pointer select-none group-open:mb-2">
                                    <span className="text-blue-600 font-medium">Prompt Text (click to collapse)</span>
                                  </summary>
                                  <div className="whitespace-pre-wrap border-l-2 border-blue-300 pl-3 mt-2 text-gray-700">
                                    {prompt.promptText}
                                  </div>
                                </details>
                              </div>
                              
                              {prompt.minWords && (
                                <div className="text-sm text-gray-600 mb-2">
                                  <strong>Minimum Words:</strong> {prompt.minWords}
                                </div>
                              )}
                              
                              {prompt.sampleAnswer && (
                                <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                  <div className="text-sm font-medium text-green-800 mb-1">Sample Answer:</div>
                                  <div className="text-sm text-green-700 whitespace-pre-wrap">
                                    {prompt.sampleAnswer}
                                  </div>
                                </div>
                              )}
                              
                              {prompt.keyPoints && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <div className="text-sm font-medium text-blue-800 mb-1">Key Points:</div>
                                  <div className="text-sm text-blue-700">
                                    {typeof prompt.keyPoints === 'string' 
                                      ? prompt.keyPoints 
                                      : JSON.stringify(JSON.parse(prompt.keyPoints), null, 2)}
                                  </div>
                                </div>
                              )}
                              
                              {prompt.suggestedVocab && (
                                <div className="mt-3 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                                  <div className="text-sm font-medium text-yellow-800 mb-1">Suggested Vocabulary:</div>
                                  <div className="text-sm text-yellow-700">
                                    {typeof prompt.suggestedVocab === 'string' 
                                      ? prompt.suggestedVocab 
                                      : JSON.stringify(JSON.parse(prompt.suggestedVocab), null, 2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : getDocSkill(detailDoc) === "Speaking" && detailSpeakingPrompts !== null && detailSpeakingPrompts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-3">
                        Speaking Prompts ({detailSpeakingPrompts.length} {detailSpeakingPrompts.length === 1 ? 'prompt' : 'prompts'})
                      </div>
                      {detailSpeakingPrompts.map((prompt, index) => {
                        const partLabel = prompt.partNumber === 1 ? "Part 1: Social Interaction" : prompt.partNumber === 2 ? "Part 2: Solution Discussion" : "Part 3: Topic Development";
                        
                        // Parse cue card bullets - handle both JSON array and plain text
                        let cueCardBullets = null;
                        if (prompt.cueCardBullets) {
                          try {
                            // Try parsing as JSON first
                            cueCardBullets = JSON.parse(prompt.cueCardBullets);
                          } catch {
                            // If not JSON, split by newlines and clean up
                            cueCardBullets = prompt.cueCardBullets
                              .split('\n')
                              .map((line: string) => line.trim())
                              .filter((line: string) => line.length > 0);
                          }
                        }
                        
                        return (
                          <div key={prompt.id} className="border rounded-lg p-4 bg-white/50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {partLabel}
                                  </span>
                                  {prompt.level && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                      Level: {prompt.level}
                                    </span>
                                  )}
                                  {prompt.category && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {prompt.category}
                                    </span>
                                  )}
                                </div>
                                
                                <h4 className="font-medium text-base mb-2">{prompt.title}</h4>
                                
                                <div className="prose prose-sm max-w-none mb-3">
                                  <div className="font-medium text-sm mb-1">Prompt:</div>
                                  <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border">
                                    {prompt.promptText}
                                  </div>
                                </div>
                                
                                {cueCardBullets && cueCardBullets.length > 0 && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                    <div className="text-sm font-medium text-blue-800 mb-2">Cue Card Points:</div>
                                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                                      {cueCardBullets.map((bullet: string, i: number) => (
                                        <li key={i}>{bullet}</li>
                                      ))}
                                    </ul>
                                    {prompt.preparationTime && prompt.speakingTime && (
                                      <div className="text-xs text-blue-600 mt-2">
                                        ⏱️ Preparation: {prompt.preparationTime}s | Speaking: {prompt.speakingTime}s
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {prompt.sampleAnswer && (
                                  <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                    <div className="text-sm font-medium text-green-800 mb-1">Sample Answer:</div>
                                    <div className="text-sm text-green-700 whitespace-pre-wrap">
                                      {prompt.sampleAnswer}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : detailItems.length === 0 ? (
                    <div className="space-y-4">
                      {/* Show writing-specific info from tocJson if available */}
                      {getDocSkill(detailDoc) === "Writing" && detailDoc?.tocJson?.writing && (
                        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Writing Document Info</h4>
                          <div className="text-sm space-y-2">
                            {detailDoc.tocJson.writing.prompt && (
                              <div>
                                <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">General Prompt:</div>
                                <div className="whitespace-pre-wrap text-blue-700 dark:text-blue-300 border-l-2 border-blue-400 pl-3">
                                  {detailDoc.tocJson.writing.prompt}
                                </div>
                              </div>
                            )}
                            {detailDoc.tocJson.writing.tasks && Array.isArray(detailDoc.tocJson.writing.tasks) && detailDoc.tocJson.writing.tasks.length > 0 && (
                              <div>
                                <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">Tasks Overview:</div>
                                <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-1">
                                  {detailDoc.tocJson.writing.tasks.map((task: any, idx: number) => (
                                    <li key={idx}>{typeof task === 'string' ? task : task.title || task.name || `Task ${idx + 1}`}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {detailDoc.tocJson.writing.guidelines && (
                              <div>
                                <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">Guidelines:</div>
                                <div className="whitespace-pre-wrap text-blue-700 dark:text-blue-300">
                                  {detailDoc.tocJson.writing.guidelines}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <div className="text-muted-foreground mb-3">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No items yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getDocSkill(detailDoc) === "Writing" 
                            ? "This writing document has no specific prompts added yet. Close this dialog and click 'Add Item' to create writing tasks."
                            : "No test items have been added to this document yet."}
                        </p>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                            Close and Add Items
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {getDocSkill(detailDoc) === "Reading" ? (() => {
                        const parsePassageIndex = (part: any): number | null => {
                          const s = String(part || "");
                          const m = s.match(/\bpassage\s*(\d)\b/i);
                          if (!m) return null;
                          const n = Number(m[1]);
                          return Number.isFinite(n) && n >= 1 && n <= 4 ? n : null;
                        };

                        const passagesArr: any[] =
                          Array.isArray((detailDoc as any)?.tocJson?.reading?.passages)
                            ? (detailDoc as any).tocJson.reading.passages
                            : [];
                        const passagesByIndex = new Map<number, any>();
                        for (const p of passagesArr) {
                          const idx = Number(p?.index);
                          if (Number.isFinite(idx)) passagesByIndex.set(idx, p);
                        }

                        const groups = new Map<string, { label: string; index: number | null; items: any[] }>();

                        // Ensure passages show up even if they currently have 0 questions.
                        for (let pi = 1; pi <= 4; pi++) {
                          if (passagesByIndex.has(pi)) {
                            const key = `p${pi}`;
                            if (!groups.has(key)) {
                              groups.set(key, { label: `Passage ${pi}`, index: pi, items: [] });
                            }
                          }
                        }

                        for (const it of detailItems) {
                          const idx = parsePassageIndex(it.part);
                          const key = idx ? `p${idx}` : "other";
                          const label = idx ? `Passage ${idx}` : "Other";
                          const existing = groups.get(key);
                          if (existing) existing.items.push(it);
                          else groups.set(key, { label, index: idx, items: [it] });
                        }

                        const ordered = Array.from(groups.values()).sort((a, b) => {
                          if (a.index === null && b.index === null) return a.label.localeCompare(b.label);
                          if (a.index === null) return 1;
                          if (b.index === null) return -1;
                          return a.index - b.index;
                        });

                        return (
                          <div className="space-y-4">
                            {ordered.map((g) => {
                              const p = g.index ? passagesByIndex.get(g.index) : null;
                              return (
                                <div key={g.label} className="border rounded bg-white">
                                  <div className="px-3 py-2 border-b flex items-center justify-between">
                                    <div className="font-medium">
                                      {g.label} <span className="text-xs text-muted-foreground">({g.items.length} questions)</span>
                                    </div>
                                    {g.index ? (
                                      <div className="text-xs text-muted-foreground">part: {`Passage ${g.index}`}</div>
                                    ) : null}
                                  </div>

                                  {g.index ? (
                                    <div className="px-3 py-2">
                                      {p && (p.html || p.raw) ? (
                                        <details>
                                          <summary className="cursor-pointer text-sm text-muted-foreground select-none">
                                            Show passage text
                                          </summary>
                                          <div className="mt-2 border rounded p-3 bg-background">
                                            {String(p?.raw || "").trim() ? (
                                              <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
                                                <ReactMarkdown
                                                  remarkPlugins={[remarkGfm]}
                                                  components={{
                                                    code({ inline, children, ...props }) {
                                                      if (inline) {
                                                        return (
                                                          <span className="vstep-hl" {...props}>
                                                            {children}
                                                          </span>
                                                        );
                                                      }
                                                      return (
                                                        <code {...props}>
                                                          {children}
                                                        </code>
                                                      );
                                                    },
                                                  }}
                                                >
                                                  {toReadingPassageMarkdown(String(p.raw || ""))}
                                                </ReactMarkdown>
                                              </article>
                                            ) : p.html ? (
                                              <article
                                                className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1"
                                                dangerouslySetInnerHTML={{ __html: String(p.html) }}
                                              />
                                            ) : (
                                              <div className="text-xs text-muted-foreground">(empty passage)</div>
                                            )}
                                          </div>
                                        </details>
                                      ) : (
                                        <div className="text-xs text-muted-foreground">
                                          No saved passage text for this section yet.
                                        </div>
                                      )}
                                    </div>
                                  ) : null}

                                  <div className="p-3 space-y-3">
                                    {g.items.map((it, itemIndex) => (
                                      <div key={it.id} className="border rounded p-3 bg-white">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                          <div className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            Q{itemIndex + 1}
                                          </div>
                                          {it.difficulty && (
                                            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                              Level: {it.difficulty}/10
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="mb-3">
                                          {it.prompt && it.prompt.length > 150 ? (
                                            <details className="group">
                                              <summary className="cursor-pointer font-medium text-gray-900 select-none group-open:mb-2">
                                                {it.prompt.substring(0, 150)}...
                                                <span className="text-blue-600 ml-1">Show more</span>
                                              </summary>
                                              <div className="font-medium text-gray-900">
                                                {it.prompt}
                                              </div>
                                            </details>
                                          ) : (
                                            <div className="font-medium text-gray-900">
                                              {it.prompt || '(No prompt text)'}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {it.optionsJson ? (
                                          <div className="mt-2 max-h-40 overflow-auto">
                                            <div className="text-sm font-medium text-gray-700 mb-2">Options:</div>
                                            {(it.optionsJson || []).map((opt: any, idx: number) => (
                                              <div key={opt.id || idx} className="flex items-center gap-2 py-1">
                                                <span className="text-blue-600 font-medium">{String.fromCharCode(65 + idx)}.</span>
                                                <div className="text-sm">{opt.label}</div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : null}
                                        
                                        {it.answerJson && (
                                          <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                                            <div className="text-sm font-medium text-green-800 mb-1">Answer:</div>
                                            <div className="text-sm text-green-700">
                                              {(() => {
                                                try {
                                                  const answer = typeof it.answerJson === 'string' 
                                                    ? JSON.parse(it.answerJson) 
                                                    : it.answerJson;
                                                  
                                                  if (answer?.correctOptionId && it.optionsJson) {
                                                    const options = Array.isArray(it.optionsJson) ? it.optionsJson : [];
                                                    const correctIndex = options.findIndex((opt: any) => opt.id === answer.correctOptionId);
                                                    
                                                    if (correctIndex !== -1) {
                                                      const letter = String.fromCharCode(65 + correctIndex);
                                                      let optionText = options[correctIndex].label || '';
                                                      
                                                      // Remove leading letter if exists (e.g., "B. text" -> "text")
                                                      optionText = optionText.replace(/^[A-Z]\.\s*/, '');
                                                      
                                                      return `${letter}. ${optionText}`;
                                                    }
                                                  }
                                                  
                                                  return typeof it.answerJson === 'string' ? it.answerJson : JSON.stringify(it.answerJson);
                                                } catch (e) {
                                                  return typeof it.answerJson === 'string' ? it.answerJson : JSON.stringify(it.answerJson);
                                                }
                                              })()}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="mt-3 flex gap-2">
                                          <Button size="sm" onClick={() => openEditItem(it)}>
                                            Edit
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteItem(it.id)}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })() : getDocSkill(detailDoc) === "Writing" ? (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground mb-3">
                            Writing Tasks ({detailItems.length} {detailItems.length === 1 ? 'task' : 'tasks'})
                          </div>
                          {detailItems.map((it, index) => (
                            <div key={it.id} className="border rounded-lg p-4 bg-white/50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Task {index + 1}
                                    </span>
                                    {it.part && (
                                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        {it.part}
                                      </span>
                                    )}
                                    {it.prompt && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                        {it.prompt.length} characters
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-medium mb-2 text-gray-900">
                                    {it.prompt && it.prompt.length > 200 ? (
                                      <details className="group" open>
                                        <summary className="cursor-pointer select-none group-open:mb-2">
                                          <span className="text-blue-600 font-medium">Writing Prompt (click to collapse)</span>
                                        </summary>
                                        <div className="whitespace-pre-wrap border-l-2 border-blue-300 pl-3 mt-2">
                                          {it.prompt}
                                        </div>
                                      </details>
                                    ) : (
                                      <div className="whitespace-pre-wrap">
                                        {it.prompt || '(No prompt text available)'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {it.optionsJson && Array.isArray(it.optionsJson) && it.optionsJson.length > 0 && (
                                    <div className="mt-3">
                                      <div className="text-sm font-medium text-gray-700 mb-2">Instructions:</div>
                                      <div className="space-y-1">
                                        {it.optionsJson.map((opt: any, idx: number) => (
                                          <div key={opt.id || idx} className="text-sm text-gray-600 flex items-start gap-2">
                                            <span className="text-blue-600 font-medium">•</span>
                                            <span>{opt.label || opt.text || opt.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {it.answerJson && (
                                    <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                      <div className="text-sm font-medium text-green-800 mb-1">Sample Answer/Guidelines:</div>
                                      <div className="text-sm text-green-700">
                                        {typeof it.answerJson === 'string' 
                                          ? it.answerJson 
                                          : JSON.stringify(it.answerJson, null, 2)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {it.difficulty && (
                                    <div className="mt-2">
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                        Difficulty: {it.difficulty}/10
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <Button size="sm" variant="outline" onClick={() => openEditItem(it)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteItem(it.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        detailItems.map((it) => (
                          <li key={it.id} className="border rounded p-3 bg-white">
                            <div className="font-medium">{it.prompt}</div>
                            {it.optionsJson ? (
                              <div className="mt-2 max-h-40 overflow-auto">
                                {(it.optionsJson || []).map(
                                  (opt: any, idx: number) => (
                                    <div
                                      key={opt.id || idx}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="text-sm">{opt.label}</div>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" onClick={() => openEditItem(it)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteItem(it.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Audio</h4>
              <div className="mt-2 flex items-center gap-2">
                {detailDoc?.audioPath ? (
                  <>
                    <Button
                      size="sm"
                      variant={isLoadingAudio[detailDoc.id] ? "destructive" : "default"}
                      onClick={() => {
                        if (isLoadingAudio[detailDoc.id]) {
                          // Stop audio using hook function
                          stopAudio(detailDoc.id);
                        } else {
                          // Play audio
                          const fullAudioUrl = detailDoc.audioPath.startsWith('http') 
                            ? detailDoc.audioPath 
                            : `${window.location.protocol}//${window.location.hostname}:4000${detailDoc.audioPath}`;
                          playAudio(
                            detailDoc.id,
                            detailDoc.title || detailDoc.fileName || "Document",
                            fullAudioUrl,
                          );
                        }
                      }}
                    >
                      {isLoadingAudio[detailDoc.id]
                        ? "⏸ Stop"
                        : "▶ Play Audio"}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Attached audio:{" "}
                      <a
                        href={detailDoc.audioPath.startsWith('http') 
                          ? detailDoc.audioPath 
                          : `${window.location.protocol}//${window.location.hostname}:4000${detailDoc.audioPath}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No audio attached.
                  </div>
                )}

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioSelected}
                />

                <Button size="sm" onClick={handleChooseAudio}>
                  Choose File
                </Button>
                <Button
                  size="sm"
                  onClick={handleUploadAudio}
                  disabled={uploadingAudio || !selectedAudioFile}
                >
                  {uploadingAudio ? "Uploading..." : "Upload Audio"}
                </Button>

                {selectedAudioFile ? (
                  <div className="text-sm text-muted-foreground">
                    {selectedAudioFile.name}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Practice Set Actions */}
            {detailItems !== null && detailItems.length > 0 && (
              <div className="border rounded p-3 bg-muted/30">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-medium">Add to Practice Set</div>
                    <div className="text-xs text-muted-foreground">
                      Total {detailItems.length} items available
                      {detailDoc?.tocJson?.skill === 'Reading' && ' (Reading: includes passages)'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Questions:</label>
                    <input
                      type="number"
                      min={1}
                      max={detailItems.length}
                      defaultValue={detailItems.length}
                      id="practice-count-input"
                      className="w-20 p-1 border rounded"
                    />
                    <Button
                      onClick={() => {
                        const el = document.getElementById(
                          "practice-count-input",
                        ) as HTMLInputElement | null;
                        const val = el ? Number(el.value) : 0;
                        addDetailToPractice(val);
                      }}
                    >
                      Add to set
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Actions:</span>
              <div className="flex items-center gap-2">
                <Button
                  title="Add Item"
                  onClick={() => {
                    if (detailDoc) {
                      setSelectedDocId(detailDoc.id);
                      setIsAddItemOpen(true);
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
                <Button onClick={() => detailDoc && openEdit(detailDoc)}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => detailDoc && handleDelete(detailDoc.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <a href={detailDoc?.filePath} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-1" />
                    View File
                  </Button>
                </a>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Edit prompt, options and answers
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEditItemSubmit}
            className="flex flex-col h-[70vh]"
          >
            <div className="overflow-auto flex-1 space-y-4 pb-4">
              <div>
                <label className="text-sm font-medium">Prompt</label>
                <Input
                  value={editItemPrompt}
                  onChange={(e) => setEditItemPrompt(e.target.value)}
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm">Points</label>
                <Input
                  type="number"
                  className="w-24"
                  value={String(editItemPoints)}
                  onChange={(e) =>
                    setEditItemPoints(Number(e.target.value) || 0)
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Options (leave empty for text answers)
                </label>
                <div className="space-y-2 mt-2">
                  {editItemOptionsArr.map((o, idx) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        type={
                          editItemOptionsArr.length > 0
                            ? editItemOptionsArr.filter((x) => x.selected)
                                .length <= 1
                              ? "radio"
                              : "checkbox"
                            : "checkbox"
                        }
                        checked={!!o.selected}
                        onChange={() =>
                          setEditItemOptionsArr((s) =>
                            s.map((x) =>
                              x.id === o.id
                                ? { ...x, selected: !x.selected }
                                : x,
                            ),
                          )
                        }
                      />
                      <Input
                        value={o.label}
                        onChange={(e) =>
                          setEditItemOptionsArr((s) =>
                            s.map((x) =>
                              x.id === o.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setEditItemOptionsArr((s) =>
                            s.filter((x) => x.id !== o.id),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      onClick={() =>
                        setEditItemOptionsArr((s) => [
                          ...s,
                          {
                            id: String(Date.now()),
                            label: "",
                            selected: false,
                          },
                        ])
                      }
                    >
                      Add option
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Accepted answers (comma-separated, for text items)
                </label>
                <textarea
                  className="w-full p-2 border rounded"
                  rows={3}
                  value={editItemAcceptedAnswers}
                  onChange={(e) => setEditItemAcceptedAnswers(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Skill"
                  value={editItemSkill}
                  onChange={(e) => setEditItemSkill(e.target.value)}
                />
                <Input
                  placeholder="Part"
                  value={editItemPart}
                  onChange={(e) => setEditItemPart(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Difficulty"
                  value={editItemDifficulty ?? ""}
                  onChange={(e) =>
                    setEditItemDifficulty(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Practice Set panel */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-medium">Practice Set Builder</h2>
        <div className="mt-2 text-sm text-muted-foreground">
          Selected documents:
        </div>
        {practiceSelections.length === 0 ? (
          <div className="text-sm text-muted-foreground mt-2">
            No documents selected. Open a document details and click "Add to
            set".
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {practiceSelections.map((s) => (
              <li
                key={s.docId}
                className="flex items-center justify-between gap-2 p-2 border rounded"
              >
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.count} questions
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePracticeSelection(s.docId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={generatePracticeSet}
            disabled={practiceSelections.length === 0 || loading}
          >
            {loading ? "Generating..." : "Generate Practice Set"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPracticeSelections([]);
              setPracticeSet(null);
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Add Item modal */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items</DialogTitle>
            <DialogDescription>
              Add items to document: {selectedDocId || "(none)"} · Skill: {activeDocSkill}
            </DialogDescription>
          </DialogHeader>

          <div ref={addItemRef} className="mt-2 space-y-4">
            {activeDocSkill === "Reading" ? (
              <>
                <div className="border rounded p-3 bg-background space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">Reading Passage</div>
                      <div className="text-xs text-muted-foreground">
                        Paste 1 passage. Do not remove the [A][B][C][D] markers.
                        Markdown supported: **bold**, _italic_ / *italic*, `inline highlight`, and &lt;&lt;highlight&gt;&gt;.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        type="button"
                        disabled={loading || !selectedDocId}
                        onClick={saveReadingPassagesOnly}
                      >
                        Save passage
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const meta = buildReadingMetaFromInputs();
                          if (!meta) {
                            toast({
                              variant: "destructive",
                              title: "Missing passage",
                              description: "Please fill in the passage first.",
                              duration: 4000,
                            });
                            return;
                          }
                          setPendingReadingMeta(meta);
                          toast({ title: "Passage ready", duration: 2000 });
                        }}
                      >
                        Use passage
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <textarea
                      className="w-full p-2 border rounded min-h-[200px] font-mono text-sm"
                      value={readingPassageInput}
                      onChange={(e) => setReadingPassageInput(e.target.value)}
                      placeholder="Paste passage text here (keep [A][B][C][D] markers)"
                    />
                  </div>
                </div>

                <div className="border rounded p-3 bg-background space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">Reading Questions (10 questions)</div>
                      <div className="text-xs text-muted-foreground">
                        Paste exactly 10 questions. Each question is one block separated by 1 blank line:
                        first line = question, next lines = options A-D, last line = Answer.
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        const res = parseReadingQuestionsByPassageInputs(readingQuestionsInput);
                        if (res.errors.length) {
                          toast({
                            variant: "destructive",
                            title: "Reading parse issues",
                            description: res.errors.slice(0, 3).join(" | "),
                            duration: 7000,
                          });
                          return;
                        }
                        setParsedReadingMeta(null);
                        setParsedImportItems(res.items);
                        toast({
                          title: `Parsed ${res.items.length} Reading questions`,
                          duration: 3000,
                        });
                      }}
                    >
                      Parse questions
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-sm text-muted-foreground">10 questions for this passage</div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={async () => {
                            try {
                              const txt = await navigator.clipboard.readText();
                              setReadingQuestionsInput(txt || "");
                            } catch (e) {
                              toast({
                                variant: "destructive",
                                title: "Clipboard read failed",
                                duration: 3000,
                              });
                            }
                          }}
                        >
                          Paste
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setReadingQuestionsInput("")}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <textarea
                      className="w-full p-2 border rounded min-h-[300px] font-mono text-sm"
                      value={readingQuestionsInput}
                      onChange={(e) => setReadingQuestionsInput(e.target.value)}
                      placeholder={`Example format:\n\n1. What is the main idea?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nAnswer: A\n\n2. According to the passage...\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: B`}
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Input
                ref={promptInputRef}
                placeholder="Prompt"
                value={itemPrompt}
                onChange={(e) => setItemPrompt(e.target.value)}
              />

              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm">Points</label>
                <Input
                  type="number"
                  className="w-24"
                  value={String(itemPoints)}
                  onChange={(e) => setItemPoints(Number(e.target.value) || 0)}
                />
              </div>

              <div className="mt-3">
                <label className="text-sm font-medium">
                  Import from text / clipboard
                </label>
                {activeDocSkill === "Reading" ? (
                  <>
                    <div className="text-xs text-muted-foreground mt-1">
                      (Optional) If you already have the full input in PASSAGE 1..4 format, paste it here to parse both passages + questions.
                    </div>
                    <textarea
                      className="w-full p-2 border rounded mt-1"
                      rows={5}
                      placeholder={"PASSAGE 1\n...\n1. ...\nA. ...\nAnswer: A\n\nPASSAGE 2\n..."}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText();
                            setImportText(txt || "");
                          } catch (e) {
                            toast({
                              variant: "destructive",
                              title: "Clipboard read failed",
                              duration: 3000,
                            });
                          }
                        }}
                      >
                        Paste clipboard
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const hasPassages = /^\s*PASSAGE\s*\d\b/im.test(importText);
                          if (!hasPassages) {
                            toast({
                              variant: "destructive",
                              title: "Missing PASSAGE blocks",
                              description: "This input is only for PASSAGE 1..4 format.",
                              duration: 5000,
                            });
                            return;
                          }
                          const res = parseVstepReadingImport(importText);
                          setParsedReadingMeta(res.meta);
                          if (res.errors.length) {
                            toast({
                              variant: "destructive",
                              title: "Reading parse issues",
                              description: res.errors.slice(0, 3).join(" | "),
                              duration: 7000,
                            });
                            return;
                          }
                          setParsedImportItems(res.items);
                          toast({
                            title: `Parsed ${res.items.length} Reading items`,
                            duration: 3000,
                          });
                        }}
                      >
                        Parse full PASSAGE
                      </Button>
                      <Button size="sm" type="button" onClick={addParsedItemsToPending}>
                        Add parsed to pending
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      className="w-full p-2 border rounded mt-1"
                      rows={5}
                      placeholder={
                        "Paste blocks separated by blank line.\nEach block: first line = prompt, following lines = options"
                      }
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText();
                            setImportText(txt || "");
                          } catch (e) {
                            toast({
                              variant: "destructive",
                              title: "Clipboard read failed",
                              duration: 3000,
                            });
                          }
                        }}
                      >
                        Paste clipboard
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const parsed = parseImportText(importText);
                          if (!parsed.length) {
                            toast({ title: "No items parsed", duration: 3000 });
                            return;
                          }
                          setParsedImportItems(parsed);
                          toast({
                            title: `Parsed ${parsed.length} items`,
                            duration: 3000,
                          });
                        }}
                      >
                        Parse import
                      </Button>
                      <Button size="sm" type="button" onClick={addParsedItemsToPending}>
                        Add parsed to pending
                      </Button>
                    </div>
                  </>
                )}

                {activeDocSkill === "Reading" && parsedReadingMeta?.passages?.length ? (
                  <div className="mt-2 p-2 border rounded bg-background">
                    <div className="text-xs text-muted-foreground">
                      Detected passages: {parsedReadingMeta.passages.length} · Total questions: {parsedReadingMeta.totalQuestions}
                    </div>
                  </div>
                ) : null}

                {parsedImportItems.length > 0 ? (
                  <div className="mt-2 p-2 border rounded bg-background max-h-40 overflow-auto">
                    <div className="text-xs text-muted-foreground">
                      Preview parsed items:
                    </div>
                    <ol className="mt-1 list-decimal list-inside space-y-1">
                      {parsedImportItems.map((it, i) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium">{it.prompt}</div>
                          {it.optionsJson ? (
                            <div className="text-xs text-muted-foreground">
                              {(it.optionsJson || [])
                                .map((o: any) => o.label)
                                .join(" | ")}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">Type:</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="p-1 border rounded"
                >
                  <option value="mcq">MCQ (single)</option>
                  <option value="multichoice">Multi-choice (multiple)</option>
                  <option value="text">Text (accepted answers)</option>
                </select>
                <Button
                  type="button"
                  onClick={() =>
                    setItemOptionsArr((s) => [
                      ...s,
                      { id: String(Date.now()), label: "" },
                    ])
                  }
                >
                  Add option
                </Button>
              </div>

              <div className="space-y-2">
                {itemType !== "text" ? (
                  itemOptionsArr.map((o, idx) => (
                    <div key={o.id} className="flex items-center gap-2">
                      {itemType === "mcq" ? (
                        <input
                          type="radio"
                          name="vtep-correct"
                          checked={!!(o as any).selected}
                          onChange={() =>
                            setItemOptionsArr((s) =>
                              s.map((x) => ({
                                ...x,
                                selected: x.id === o.id,
                              })),
                            )
                          }
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!(o as any).selected}
                          onChange={() =>
                            setItemOptionsArr((s) =>
                              s.map((x) =>
                                x.id === o.id
                                  ? { ...x, selected: !(x as any).selected }
                                  : x,
                              ),
                            )
                          }
                        />
                      )}
                      <Input
                        value={o.label}
                        onChange={(e) =>
                          setItemOptionsArr((s) =>
                            s.map((x) =>
                              x.id === o.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setItemOptionsArr((s) =>
                            s.filter((x) => x.id !== o.id),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <div>
                    <textarea
                      className="w-full p-2 border rounded"
                      rows={3}
                      value={itemAcceptedAnswers}
                      onChange={(e) => setItemAcceptedAnswers(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      Comma-separated accepted answers (e.g. answer1, answer2)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Part"
                  value={itemPart}
                  onChange={(e) => setItemPart(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Difficulty"
                  value={itemDifficulty ?? ""}
                  onChange={(e) =>
                    setItemDifficulty(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium">Pending items</h4>
              {pendingItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending items
                </div>
              ) : (
                <ul className="space-y-2 mt-2 max-h-[30vh] overflow-auto">
                  {pendingItems.map((pi, idx) => (
                    <li
                      key={idx}
                      className="p-2 border rounded flex items-start justify-between gap-2"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{pi.prompt}</div>
                        <div className="text-xs text-muted-foreground">
                          {pi.skill || ""} {pi.part ? `· ${pi.part}` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          setPendingItems((s) => s.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddItemOpen(false);
                setPendingItems([]);
                setReadingPassageInput("");
                setReadingQuestionsInput("");
                setImportText("");
                resetItemForm();
              }}
            >
              Close
            </Button>
            <Button type="button" onClick={addToBatch}>
              Add to batch
            </Button>
            {activeDocSkill === "Reading" ? (
              <div className="mr-auto flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={readingReplaceExisting}
                    onChange={(e) => setReadingReplaceExisting(e.target.checked)}
                  />
                  Replace existing questions for passages in this save
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || !selectedDocId}
                  onClick={saveReadingPassagesOnly}
                >
                  Save passages only
                </Button>
              </div>
            ) : null}
            <Button
              type="button"
              onClick={saveBatch}
              disabled={loading || !selectedDocId || pendingItems.length === 0}
            >
              {loading ? "Saving..." : `Save all (${pendingItems.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update title and description (Markdown supported).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col">
            <div className="overflow-auto flex-1 space-y-4 pb-4 px-1">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Description (Markdown)
                </label>
                <div className="flex flex-col space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Bold"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("**", "**")}
                    >
                      <span className="font-semibold">B</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Italic"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("*", "*")}
                    >
                      <span className="italic">I</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Heading"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("# ", "")}
                    >
                      <span className="font-semibold">#</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Code"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("``\n", "\n``")}
                    >
                      <span className="text-sm">&lt;&gt;</span>
                    </button>

                    <button
                      type="button"
                      aria-label="List"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("- ", "")}
                    >
                      <span className="text-lg">≡</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Quote"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("> ", "")}
                    >
                      <span className="text-lg">“</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Link"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                      onClick={() => insertEditMarkdown("[", "](url)")}
                    >
                      <span className="text-sm">🔗</span>
                    </button>
                  </div>

                  <textarea
                    ref={editTextareaRef}
                    className="w-full p-2 border rounded min-h-[320px]"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <DialogFooter className="sticky bottom-0 bg-background border-t py-3 px-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={practicePreviewOpen} onOpenChange={setPracticePreviewOpen}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Practice Set Preview</DialogTitle>
            <DialogDescription>
              Preview of generated practice set
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 max-h-[65vh] overflow-auto space-y-3">
            {practiceSet && practiceSet.length > 0 ? (
              <ol className="space-y-4">
                {practiceSet.map((it, idx) => {
                  // Get passage for this item
                  const doc = it.sourceDocumentId ? docs.find(d => d.id === it.sourceDocumentId) : null;
                  let passage = null;
                  if (doc && doc.tocJson?.reading?.passages) {
                    const partStr = String(it.part || "").toLowerCase();
                    const match = partStr.match(/passage\s*(\d+)/);
                    if (match) {
                      const passageIndex = parseInt(match[1], 10);
                      passage = doc.tocJson.reading.passages.find(
                        (p: any) => p.index === passageIndex
                      );
                    }
                  }
                  
                  return (
                    <li key={idx} className="border rounded p-3 bg-white">
                      {passage && (
                        <div className="mb-3 p-3 bg-blue-50 rounded border">
                          <div className="text-xs font-medium mb-2">Reading Passage</div>
                          <div 
                            className="prose prose-xs max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: passage.html || '' }}
                          />
                        </div>
                      )}
                      <div className="font-medium">
                        {idx + 1}. {it.prompt}
                      </div>
                      {it.optionsJson ? (
                        <>
                          <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                            {(it.optionsJson || []).map((opt: any) => (
                              <div key={opt.id || opt.label} className="text-sm">
                                - {opt.label}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" onClick={() => openEditItem(it)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteItem(it.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground">
                No items in practice set.
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => savePracticeAsPublicTest()}
              disabled={loading || !(practiceSet && practiceSet.length > 0)}
            >
              Save as public test
            </Button>
            <Button
              variant="secondary"
              onClick={() => savePracticeAsVtepTest()}
              disabled={loading || !(practiceSet && practiceSet.length > 0)}
            >
              Save as VTEP test
            </Button>
            <Button
              variant="outline"
              onClick={() => setPracticePreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Writing Management Dialog */}
      <Dialog 
        open={writingDialogOpen} 
        onOpenChange={(open) => {
          setWritingDialogOpen(open);
          if (!open) {
            setWritingDialogMode('manage');
          }
        }}
      >
        <DialogContent className="max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>VSTEP Writing {writingDialogMode === 'create' ? 'Create' : 'Management'}</DialogTitle>
            <DialogDescription>
              {writingDialogMode === 'create' ? 'Create new writing prompts' : 'Create and manage prompts and tests for Writing section'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <VtepWritingManager 
              mode={writingDialogMode} 
              documentId={selectedDocId} 
              onPromptChange={load} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaking Management Dialog */}
      <Dialog 
        open={speakingDialogOpen} 
        onOpenChange={(open) => {
          setSpeakingDialogOpen(open);
          // Reset mode về 'manage' khi đóng dialog
          if (!open) {
            setSpeakingDialogMode('manage');
          }
        }}
      >
        <DialogContent className="max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>VSTEP Speaking {speakingDialogMode === 'create' ? 'Create' : 'Management'}</DialogTitle>
            <DialogDescription>
              {speakingDialogMode === 'create' ? 'Create new speaking prompts' : 'View and manage speaking prompts'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <VtepSpeakingManager 
              mode={speakingDialogMode} 
              documentId={selectedDocId} 
              onPromptChange={load} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
