"use client";

import React, { useEffect, useState, useRef } from "react";
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
  const [practiceSelections, setPracticeSelections] = useState<
    { docId: string; title?: string; count: number }[]
  >([]);
  const [practiceSet, setPracticeSet] = useState<any[] | null>(null);
  const [practicePreviewOpen, setPracticePreviewOpen] = useState(false);

  const canManage = isAdmin() || isTeacher();

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
    if (!file) return alert("Select a PDF file");
    try {
      setLoading(true);
      const res = await vtepService.uploadVtepPdf(
        file,
        title || undefined,
        uploadDescription || undefined,
      );
      alert("Uploaded");
      setFile(null);
      setTitle("");
      setUploadDescription("");
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed");
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
      alert("Failed to load document");
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
      alert("Created document");
      setNewDocTitle("");
      setNewDocDescription("");
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Create failed");
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
    promptInputRef.current?.focus();
  }

  function addToBatch() {
    if (!selectedDocId) return alert("Select or preview a document first");
    const built = buildCurrentItem();
    if (!built.prompt || built.prompt.trim() === "")
      return alert("Prompt is required");
    setPendingItems((s) => [...s, built]);
    resetItemForm();
  }

  async function saveBatch() {
    if (!selectedDocId) return alert("Select or preview a document first");
    if (pendingItems.length === 0) return alert("No items to save");
    try {
      setLoading(true);
      await vtepService.addVtepItems(selectedDocId, pendingItems);
      alert("Items saved");
      setPendingItems([]);
      setIsAddItemOpen(false);
      await load();
      if (selectedDocId) await showDoc(selectedDocId);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Save items failed");
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

  function openDetails(doc: any) {
    // Open the details modal but do NOT auto-fetch items.
    // User must explicitly load details to avoid accidental heavy loads
    // and to prevent nested-dialog auto-open behavior.
    setDetailDoc(doc);
    setDetailItems(null);
    setDetailOpen(true);
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

  function shuffleArray<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function addDetailToPractice(count: number) {
    if (!detailDoc) return alert("No document selected");
    if (!count || count <= 0)
      return alert("Enter a positive number of questions");
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
    alert("Added to practice selections");
  }

  function removePracticeSelection(docId: string) {
    setPracticeSelections((s) => s.filter((x) => x.docId !== docId));
  }

  async function generatePracticeSet() {
    if (practiceSelections.length === 0)
      return alert("No documents selected for practice set");
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
      alert("Failed to generate practice set");
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
      alert("Updated");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Update failed");
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
      alert("Deleted");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Delete failed");
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
                    <div className="text-sm text-muted-foreground mt-2 overflow-hidden whitespace-nowrap truncate">
                      {d.description || "(no description)"}
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
                        <div className="text-sm text-muted-foreground mt-2 overflow-hidden whitespace-nowrap truncate">
                          {d.description || "(no description)"}
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
            <div className="text-sm text-muted-foreground">
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
            <div className="border rounded p-3 bg-background whitespace-pre-wrap">
              {detailDoc?.description ? (
                <article className="prose dark:prose-invert max-w-none">
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
              <div className="mt-2 max-h-[50vh] overflow-auto">
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
                            <div className="mt-2">
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
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update title and description (Markdown supported).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col h-[70vh]">
            <div className="overflow-auto flex-1 space-y-4 pb-4">
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
                <textarea
                  className="w-full p-2 border rounded min-h-[160px]"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <DialogFooter>
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
                      <div className="mt-2 space-y-1">
                        {(it.optionsJson || []).map((opt: any) => (
                          <div key={opt.id || opt.label} className="text-sm">
                            - {opt.label}
                          </div>
                        ))}
                      </div>
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
          <DialogFooter>
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
