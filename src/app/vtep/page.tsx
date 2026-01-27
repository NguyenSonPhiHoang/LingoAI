"use client";

import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import vtepService from "@/services/vtep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddVtepDocumentDialog from "@/components/lingo/add-vtep-document-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, PlusCircle, Edit3, Trash2, FileText, Info } from "lucide-react";
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
  const [itemSkill, setItemSkill] = useState("");
  const [itemPart, setItemPart] = useState("");
  const [itemDifficulty, setItemDifficulty] = useState<number | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("list");
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<any[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
    { docId: string; title?: string; count: number }[]
  >([]);
  const [practiceSet, setPracticeSet] = useState<any[] | null>(null);
  const [practicePreviewOpen, setPracticePreviewOpen] = useState(false);

  const canManage = isAdmin() || isTeacher();
  const { toast } = useToast();
  const [, setDummyWords] = useState<any[]>([]);
  const { audioRef, isLoadingAudio, playAudio } = useAudioPlayback({
    setWords: setDummyWords,
  });

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

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

  async function load() {
    try {
      setLoading(true);
      const res = await vtepService.listVtepDocuments();
      setDocs(res.documents || []);
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
      skill: itemSkill || null,
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
    setItemSkill("");
    setItemPart("");
    setItemDifficulty(null);
    setItemPoints(1);
    promptInputRef.current?.focus();
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
          skill: null,
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
        skill: null,
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
      await vtepService.addVtepItems(selectedDocId, pendingItems);
      toast({ title: "Items saved", duration: 3000 });
      setPendingItems([]);
      setIsAddItemOpen(false);
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
    if (autoLoad) setTimeout(() => fetchDetailItems(), 0);
  }

  async function fetchDetailItems() {
    if (!detailDoc) return;
    try {
      setDetailLoading(true);
      const res = await vtepService.listVtepDocumentItems(detailDoc.id);
      setDetailItems(res.items || []);
    } catch (err) {
      console.error("Failed to load items", err);
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
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
      for (const sel of practiceSelections) {
        const res = await vtepService.listVtepDocumentItems(sel.docId);
        const items = res.items || [];
        const sampled = shuffleArray(items).slice(0, sel.count);
        allItems.push(
          ...sampled.map((it) => ({ ...it, sourceDocId: sel.docId })),
        );
      }
      const final = shuffleArray(allItems);
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
      const itemsForVtep = (practiceSet || []).map((it: any) => ({
        prompt: it.prompt || null,
        optionsJson: it.optionsJson ?? null,
        answerJson: it.answerJson ?? null,
        sourceDocumentId:
          it.sourceDocId || it.sourceDocId || it.sourceDocumentId || null,
        difficulty: it.difficulty ?? null,
        sectionKey: it.sectionKey ?? null,
        skill: it.skill || null,
        part: it.part || null,
      }));
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
    <div className="max-w-6xl mx-auto space-y-6 bg-white rounded-md p-6">
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
        <div className="mt-2">
          <AddVtepDocumentDialog onCreated={load} disabled={!canManage} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Documents</h2>
          <div className="flex items-center gap-2">
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
        {loading ? (
          <div>Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No documents</div>
        ) : (
          <div>
            {layoutMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className={`border rounded p-4 ${selectedDocId === d.id ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <div className="font-medium">{d.title || d.fileName}</div>
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
                    <div className="text-xs text-muted-foreground mt-2">
                      Pages: {d.pageCount || "-"}
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
                          setSelectedDocId(d.id);
                          setPreview(d);
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
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className={`border rounded p-3 ${selectedDocId === d.id ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {d.title || d.fileName}
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
                        <div className="text-xs text-muted-foreground mt-2">
                          Pages: {d.pageCount || "-"}
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
                              setSelectedDocId(d.id);
                              setPreview(d);
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
                            title="Items"
                            onClick={() => openDetails(d, true)}
                          >
                            Items
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
        <DialogContent className="w-[95vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {detailDoc?.title || detailDoc?.fileName || "Document"}
            </DialogTitle>
            <DialogDescription>
              Document details (click "Load details" to fetch items)
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div className="text-sm text-muted-foreground">
              Pages: {detailDoc?.pageCount ?? "-"}
            </div>
            <div className="border rounded p-3 bg-background whitespace-pre-wrap max-h-[30vh] overflow-auto">
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

            <div className="mt-4">
              <h4 className="font-medium">Items</h4>
              <div className="mt-2 max-h-[26vh] overflow-auto">
                <div className="space-y-3">
                  {detailItems === null ? (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        Details not loaded.
                      </div>
                      <Button onClick={fetchDetailItems}>Load details</Button>
                    </div>
                  ) : detailLoading ? (
                    <div>Loading items...</div>
                  ) : detailItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No items
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {detailItems.map((it) => (
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
                      ))}
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
                      onClick={() =>
                        playAudio(
                          detailDoc.id,
                          detailDoc.title || detailDoc.fileName || "Document",
                          detailDoc.audioPath,
                        )
                      }
                    >
                      {isLoadingAudio[detailDoc.id]
                        ? "Playing..."
                        : "Play Audio"}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Attached audio:{" "}
                      <a
                        href={detailDoc.audioPath}
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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm">Questions:</label>
                <input
                  type="number"
                  min={1}
                  defaultValue={5}
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

              <div className="flex gap-2">
                <Button
                  title="Add Item"
                  onClick={() => {
                    if (detailDoc) {
                      setSelectedDocId(detailDoc.id);
                      setIsAddItemOpen(true);
                    }
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
                <Button onClick={() => detailDoc && openEdit(detailDoc)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => detailDoc && handleDelete(detailDoc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <a href={detailDoc?.filePath} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <FileText className="h-4 w-4" />
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
        <DialogContent className="w-[95vw] max-w-4xl">
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
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Items</DialogTitle>
            <DialogDescription>
              Add one or more items to document: {selectedDocId || "(none)"}
            </DialogDescription>
          </DialogHeader>

          <div ref={addItemRef} className="mt-2 space-y-4">
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
                  <Button
                    size="sm"
                    onClick={() => {
                      if (parsedImportItems.length === 0) {
                        toast({
                          title: "No parsed items to add",
                          duration: 3000,
                        });
                        return;
                      }
                      setPendingItems((s) => [...s, ...parsedImportItems]);
                      setParsedImportItems([]);
                      setImportText("");
                      toast({
                        title: "Added parsed items to pending list",
                        duration: 3000,
                      });
                    }}
                  >
                    Add parsed to pending
                  </Button>
                </div>

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
                  placeholder="Skill"
                  value={itemSkill}
                  onChange={(e) => setItemSkill(e.target.value)}
                />
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
                resetItemForm();
              }}
            >
              Close
            </Button>
            <Button type="button" onClick={addToBatch}>
              Add to batch
            </Button>
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
        <DialogContent className="w-[95vw] max-w-4xl h-[80vh] flex flex-col">
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
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Practice Set Preview</DialogTitle>
            <DialogDescription>
              Preview of generated practice set
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 max-h-[65vh] overflow-auto space-y-3">
            {practiceSet && practiceSet.length > 0 ? (
              <ol className="space-y-4">
                {practiceSet.map((it, idx) => (
                  <li key={idx} className="border rounded p-3 bg-white">
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
                ))}
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
    </div>
  );
}
