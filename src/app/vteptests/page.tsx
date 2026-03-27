"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";
import vtepService from "@/services/vtep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import SavedTestsList from "@/components/lingo/SavedTestsList";

export default function VtepTestsAdminPage() {
  const { isAdmin, isTeacher } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  // create-dialog specific: available documents and items to include
  const [createDocs, setCreateDocs] = useState<any[]>([]);
  const [createSelectedDocId, setCreateSelectedDocId] = useState("");
  const [createItems, setCreateItems] = useState<any[]>([]);
  const { toast } = useToast();

  const canManage = isAdmin() || isTeacher();

  // UI state: search, filters, sort, pagination
  const [searchQ, setSearchQ] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterPublic, setFilterPublic] = useState<
    "all" | "public" | "private"
  >("all");
  const [sortBy, setSortBy] = useState<"title" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [layoutMode, setLayoutMode] = useState<"list" | "card">("list");

  useEffect(() => {
    if (!canManage) return;
    load();
  }, [canManage]);

  async function load() {
    try {
      setLoading(true);
      const rows = await apiGet<any[]>("/api/vteptests");
      setTests(rows || []);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to load vtep tests" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setTitle("");
    setDescription("");
    setIsActive(false);
    setIsPublic(true);
    setCreateItems([]);
    setCreateSelectedDocId("");
    setCreateOpen(true);
    // load available documents for quick import
    (async () => {
      try {
        const res = await vtepService.listVtepDocuments();
        setCreateDocs(res.documents || []);
      } catch (err) {
        console.error("Failed to load vtep documents", err);
        setCreateDocs([]);
      }
    })();
  }

  // Import items from a selected VTEP document into the create buffer
  async function importFromDocument() {
    if (!createSelectedDocId) return;
    try {
      setLoading(true);
      const res = await vtepService.listVtepDocumentItems(createSelectedDocId);
      const incoming = res.items || [];
      // normalize and push minimal item shape
      const mapped = incoming.map((it: any) => ({
        prompt: it.prompt || null,
        optionsJson: it.optionsJson || null,
        answerJson: it.answerJson || null,
        sectionKey: it.sectionKey || null,
        sourceDocumentId: createSelectedDocId,
        difficulty: typeof it.difficulty === "number" ? it.difficulty : null,
      }));
      setCreateItems((c) => [...c, ...mapped]);
      toast({ title: `Imported ${mapped.length} items` });
    } catch (err) {
      console.error("Failed to import items", err);
      toast({ variant: "destructive", title: "Import failed" });
    } finally {
      setLoading(false);
    }
  }

  function addCreateItem(payload: any) {
    setCreateItems((c) => [
      ...c,
      Object.assign(
        {
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        payload,
      ),
    ]);
  }

  function removeCreateItem(idx: number) {
    setCreateItems((c) => {
      const a = c.slice();
      a.splice(idx, 1);
      return a;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await apiPost("/api/vteptests", {
        title,
        description,
        isActive,
        isPublic,
        items: createItems,
      });
      setCreateOpen(false);
      await load();
      toast({ title: "Created" });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Create failed",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  function openEdit(t: any) {
    // Open the items management dialog and prefill metadata so user can
    // edit both metadata and items in the same view.
    setCurrent(t);
    setTitle(t.title || "");
    setDescription(t.description || "");
    setIsActive(!!t.isActive);
    setIsPublic(!!t.isPublic);
    openManageItems(t);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    try {
      setLoading(true);
      await apiPut(`/api/vteptests/${current.id}`, {
        title,
        description,
        isActive,
        isPublic,
      });
      setEditOpen(false);
      await load();
      toast({ title: "Updated" });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t: any) {
    if (!confirm("Delete this VTEP test?")) return;
    try {
      setLoading(true);
      await apiDelete(`/api/vteptests/${t.id}`);
      await load();
      toast({ title: "Deleted" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Delete failed" });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(t: any) {
    try {
      setLoading(true);
      await apiPut(`/api/vteptests/${t.id}`, { isActive: !t.isActive });
      await load();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Toggle failed" });
    } finally {
      setLoading(false);
    }
  }

  // Items management
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [managingTest, setManagingTest] = useState<any | null>(null);

  async function loadItems(testId: string) {
    try {
      setItemsLoading(true);
      const res = await apiGet<{ items: any[] }>(
        `/api/vteptests/${testId}/items`,
      );
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to load items" });
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }

  function openManageItems(t: any) {
    setManagingTest(t);
    setItemsOpen(true);
    loadItems(t.id);
  }

  const [itemPrompt, setItemPrompt] = useState("");
  const [itemOptionsJson, setItemOptionsJson] = useState("[]");
  const [itemAnswerJson, setItemAnswerJson] = useState("{}");
  const [itemSectionKey, setItemSectionKey] = useState("");
  const [itemSourceDocumentId, setItemSourceDocumentId] = useState("");
  const [itemDifficultyState, setItemDifficultyState] = useState<number | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<any | null>(null);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!managingTest) return;
    try {
      setLoading(true);
      const payload: any = {
        prompt: itemPrompt || null,
        optionsJson: tryParseJson(itemOptionsJson, null),
        answerJson: tryParseJson(itemAnswerJson, null),
        sectionKey: itemSectionKey || null,
        sourceDocumentId: itemSourceDocumentId || null,
        difficulty: itemDifficultyState ?? null,
      };
      await apiPost(`/api/vteptests/${managingTest.id}/items`, {
        items: [payload],
      });
      setItemPrompt("");
      setItemOptionsJson("[]");
      setItemAnswerJson("{}");
      setItemSectionKey("");
      setItemSourceDocumentId("");
      setItemDifficultyState(null);
      await loadItems(managingTest.id);
      toast({ title: "Item added" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Add item failed" });
    } finally {
      setLoading(false);
    }
  }

  function tryParseJson(s: string, fallback: any) {
    try {
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  }

  async function startEditItem(it: any) {
    setEditingItem(it);
    setItemPrompt(it.prompt || "");
    setItemOptionsJson(it.optionsJson ? JSON.stringify(it.optionsJson) : "[]");
    setItemAnswerJson(it.answerJson ? JSON.stringify(it.answerJson) : "{}");
    setItemSectionKey(it.sectionKey || "");
    setItemSourceDocumentId(it.sourceDocumentId || "");
    setItemDifficultyState(
      typeof it.difficulty === "number" ? it.difficulty : null,
    );
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!managingTest || !editingItem) return;
    try {
      setLoading(true);
      const payload: any = {
        prompt: itemPrompt || null,
        optionsJson: tryParseJson(itemOptionsJson, null),
        answerJson: tryParseJson(itemAnswerJson, null),
        sectionKey: itemSectionKey || null,
        sourceDocumentId: itemSourceDocumentId || null,
        difficulty: itemDifficultyState ?? null,
      };
      console.debug("Updating item", {
        testId: managingTest.id,
        itemId: editingItem.id,
        payload,
      });
      await apiPut(
        `/api/vteptests/${managingTest.id}/items/${editingItem.id}`,
        payload,
      );
      setEditingItem(null);
      await loadItems(managingTest.id);
      toast({ title: "Item updated" });
    } catch (err) {
      console.error("Update item error:", err);
      const msg = (err as any)?.message || "Update item failed";
      toast({
        variant: "destructive",
        title: "Update item failed",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMetadata(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!current) return;
    try {
      setLoading(true);
      await apiPut(`/api/vteptests/${current.id}`, {
        title,
        description,
        isActive,
        isPublic,
      });
      // refresh list and managingTest data
      await load();
      if (managingTest && managingTest.id === current.id) {
        setManagingTest({
          ...managingTest,
          title,
          description,
          isActive,
          isPublic,
        });
      }
      toast({ title: "Metadata saved" });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem(it: any) {
    if (!managingTest) return;
    if (!confirm("Delete this item?")) return;
    try {
      setLoading(true);
      await apiDelete(`/api/vteptests/${managingTest.id}/items/${it.id}`);
      await loadItems(managingTest.id);
      toast({ title: "Item deleted" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Delete item failed" });
    } finally {
      setLoading(false);
    }
  }

  if (!canManage) return <div>Access denied</div>;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-4 bg-white rounded p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">VTEP Tests</h1>
        <div>
          <Button aria-label="Create VTEP Test" onClick={openCreate}>
            <PlusCircle />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search tests..."
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="input"
              value={filterActive}
              onChange={(e) => {
                setFilterActive(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="input"
              value={filterPublic}
              onChange={(e) => {
                setFilterPublic(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Sort:</label>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="createdAt">Created</option>
              <option value="title">Title</option>
            </select>
            <select
              className="input"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <label className="text-sm">Per page:</label>
            <select
              className="input w-20"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                aria-label="List view"
                variant={layoutMode === "list" ? undefined : "outline"}
                onClick={() => setLayoutMode("list")}
              >
                <List />
              </Button>
              <Button
                size="sm"
                aria-label="Card view"
                variant={layoutMode === "card" ? undefined : "outline"}
                onClick={() => setLayoutMode("card")}
              >
                <Grid />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : tests.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tests</div>
        ) : (
          (() => {
            const q = searchQ.trim().toLowerCase();
            let filtered = tests.filter((t) => {
              if (filterActive === "active" && !t.isActive) return false;
              if (filterActive === "inactive" && t.isActive) return false;
              if (filterPublic === "public" && !t.isPublic) return false;
              if (filterPublic === "private" && t.isPublic) return false;
              if (!q) return true;
              const combined =
                `${t.title || ""} ${t.description || ""}`.toLowerCase();
              return combined.includes(q);
            });

            filtered.sort((a: any, b: any) => {
              if (sortBy === "title") {
                const av = (a.title || "").toString();
                const bv = (b.title || "").toString();
                return sortDir === "asc"
                  ? av.localeCompare(bv)
                  : bv.localeCompare(av);
              }
              const at = a.createdAt
                ? new Date(a.createdAt).getTime()
                : a.id || 0;
              const bt = b.createdAt
                ? new Date(b.createdAt).getTime()
                : b.id || 0;
              return sortDir === "asc" ? at - bt : bt - at;
            });

            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const currentPage = Math.min(Math.max(1, page), totalPages);
            const start = (currentPage - 1) * pageSize;
            const pageItems = filtered.slice(start, start + pageSize);

            return (
              <>
                <SavedTestsList
                  items={pageItems}
                  itemsOnly
                  layout={layoutMode}
                  onOpen={(id: string) => {
                    const t = pageItems.find((x: any) => x.id === id);
                    if (t) openManageItems(t);
                  }}
                  renderActions={(t: any) => (
                    <>
                      <Switch
                        checked={!!t.isActive}
                        onCheckedChange={() => toggleActive(t)}
                        aria-label={
                          t.isActive ? "Deactivate test" : "Activate test"
                        }
                      />
                      <Button
                        size="sm"
                        aria-label="Edit"
                        onClick={() => openEdit(t)}
                      >
                        <Edit3 />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        aria-label="Delete"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-muted-foreground">
                    Showing {start + 1}–
                    {Math.min(start + pageItems.length, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      aria-label="Previous page"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft />
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      size="sm"
                      aria-label="Next page"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create VTEP Test</DialogTitle>
            <DialogDescription>
              Create a test bundle from selected documents/items
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <label className="text-sm">Active</label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label className="text-sm">Public</label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            </div>
            <div className="mt-3 border-t pt-3">
              <h4 className="font-medium">Items to include</h4>
              <div className="text-sm text-muted-foreground mb-2">
                You can import items from existing VTEP documents or add custom
                items.
              </div>

              <div className="flex gap-2 items-center mb-2">
                <select
                  value={createSelectedDocId}
                  onChange={(e) => setCreateSelectedDocId(e.target.value)}
                  className="border rounded p-1"
                >
                  <option value="">Select document to import</option>
                  {createDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.id}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={importFromDocument}
                  disabled={!createSelectedDocId}
                >
                  Import items
                </Button>
              </div>

              <div className="space-y-2 mb-3">
                {createItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No items added
                  </div>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-auto">
                    {createItems.map((it, idx) => (
                      <li
                        key={it.id ?? idx}
                        className="p-2 border rounded flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {it.prompt || "(no prompt)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {it.sectionKey || ""}{" "}
                            {it.sourceDocumentId
                              ? `• ${it.sourceDocumentId}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCreateItem(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mb-2">
                <div className="text-sm font-medium mb-1">Add custom item</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Prompt"
                    id="create-item-prompt"
                    onChange={(e: any) =>
                      ((window as any).__create_prompt = e.target.value)
                    }
                  />
                  <Input
                    placeholder="Section Key"
                    id="create-item-section"
                    onChange={(e: any) =>
                      ((window as any).__create_section = e.target.value)
                    }
                  />
                  <select
                    className="border rounded p-1"
                    id="create-item-source"
                    onChange={(e: any) =>
                      ((window as any).__create_source = e.target.value)
                    }
                  >
                    <option value="">Source document (optional)</option>
                    {createDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title || d.id}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Difficulty"
                    id="create-item-difficulty"
                    onChange={(e: any) =>
                      ((window as any).__create_diff = e.target.value)
                    }
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const p = (window as any).__create_prompt || "";
                      const s = (window as any).__create_section || "";
                      const src = (window as any).__create_source || "";
                      const diff = (window as any).__create_diff
                        ? Number((window as any).__create_diff)
                        : null;
                      if (!p) {
                        toast({
                          variant: "destructive",
                          title: "Prompt required",
                        });
                        return;
                      }
                      addCreateItem({
                        prompt: p,
                        sectionKey: s || null,
                        sourceDocumentId: src || null,
                        difficulty: diff,
                        optionsJson: null,
                        answerJson: null,
                      });
                      // reset
                      (window as any).__create_prompt = "";
                      (window as any).__create_section = "";
                      (window as any).__create_source = "";
                      (window as any).__create_diff = "";
                      const el = document.getElementById(
                        "create-item-prompt",
                      ) as HTMLInputElement | null;
                      if (el) el.value = "";
                      const el2 = document.getElementById(
                        "create-item-section",
                      ) as HTMLInputElement | null;
                      if (el2) el2.value = "";
                      const el3 = document.getElementById(
                        "create-item-source",
                      ) as HTMLSelectElement | null;
                      if (el3) el3.value = "";
                      const el4 = document.getElementById(
                        "create-item-difficulty",
                      ) as HTMLInputElement | null;
                      if (el4) el4.value = "";
                    }}
                  >
                    Add custom item
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit VTEP Test</DialogTitle>
            <DialogDescription>Edit test metadata</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <label className="text-sm">Active</label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label className="text-sm">Public</label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Items management dialog */}
      <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Items for {managingTest?.title || "VTEP Test"}
            </DialogTitle>
            <DialogDescription>
              List, add, edit and delete items for this VTEP test.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="border-b pb-3 mb-3">
              <h4 className="font-medium">Test Metadata</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm">Active</label>
                  <Switch
                    checked={!!isActive}
                    onCheckedChange={(v) => setIsActive(!!v)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Public</label>
                  <Switch
                    checked={!!isPublic}
                    onCheckedChange={(v) => setIsPublic(!!v)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button onClick={handleSaveMetadata}>Save metadata</Button>
              </div>
            </div>
            <div>
              <h4 className="font-medium">Items</h4>
              {itemsLoading ? (
                <div>Loading items...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">No items</div>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="p-2 border rounded flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{it.prompt}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.sectionKey || ""}{" "}
                          {it.sourceDocumentId
                            ? `• ${it.sourceDocumentId}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex gap-2">
                        <Button size="sm" onClick={() => startEditItem(it)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(it)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="font-medium">
                {editingItem ? "Edit Item" : "Add Item"}
              </h4>
              <form
                onSubmit={editingItem ? handleSaveEdit : handleAddItem}
                className="space-y-2"
              >
                <div>
                  <label className="text-sm">Prompt</label>
                  <Input
                    value={itemPrompt}
                    onChange={(e) => setItemPrompt(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm">Section Key</label>
                  <Input
                    value={itemSectionKey}
                    onChange={(e) => setItemSectionKey(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm">Source Document Id</label>
                  <Input
                    value={itemSourceDocumentId}
                    onChange={(e) => setItemSourceDocumentId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm">Difficulty</label>
                  <Input
                    type="number"
                    value={itemDifficultyState ?? ""}
                    onChange={(e) =>
                      setItemDifficultyState(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="text-sm">Options</label>
                  <div className="space-y-2 mt-2">
                    {(tryParseJson(itemOptionsJson, []) || []).map(
                      (opt: any, idx: number) => (
                        <div
                          key={opt.id ?? idx}
                          className="flex items-center gap-2"
                        >
                          <input
                            type={
                              (tryParseJson(itemOptionsJson, []).filter(
                                (o: any) => o.selected,
                              ).length || 0) <= 1
                                ? "radio"
                                : "checkbox"
                            }
                            checked={!!opt.selected}
                            onChange={() => {
                              const arr = tryParseJson(
                                itemOptionsJson,
                                [],
                              ).slice();
                              if (
                                (arr.filter((o: any) => o.selected).length ||
                                  0) <= 1
                              ) {
                                // radio behavior: unset others
                                for (const a of arr) a.selected = false;
                                arr[idx].selected = true;
                              } else {
                                arr[idx].selected = !arr[idx].selected;
                              }
                              setItemOptionsJson(JSON.stringify(arr));
                            }}
                          />
                          <Input
                            value={opt.label || ""}
                            onChange={(e) => {
                              const arr = tryParseJson(
                                itemOptionsJson,
                                [],
                              ).slice();
                              arr[idx].label = e.target.value;
                              setItemOptionsJson(JSON.stringify(arr));
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              const arr = tryParseJson(
                                itemOptionsJson,
                                [],
                              ).slice();
                              arr.splice(idx, 1);
                              setItemOptionsJson(JSON.stringify(arr));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ),
                    )}
                    <div>
                      <Button
                        type="button"
                        onClick={() => {
                          const arr = tryParseJson(itemOptionsJson, []).slice();
                          arr.push({
                            id:
                              String(Date.now()) +
                              Math.random().toString(36).slice(2, 6),
                            label: "",
                            selected: false,
                          });
                          setItemOptionsJson(JSON.stringify(arr));
                        }}
                      >
                        Add option
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm">
                    Answer (select from options or enter accepted answers)
                  </label>
                  {(tryParseJson(itemOptionsJson, []) || []).length ? (
                    <div className="space-y-2 mt-2">
                      {(tryParseJson(itemOptionsJson, []) || []).map(
                        (opt: any, idx: number) => (
                          <label
                            key={opt.id ?? idx}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={!!opt.selected}
                              onChange={() => {
                                const arr = tryParseJson(
                                  itemOptionsJson,
                                  [],
                                ).slice();
                                arr[idx].selected = !arr[idx].selected;
                                setItemOptionsJson(JSON.stringify(arr));
                                const selectedIds = arr
                                  .filter((o: any) => o.selected)
                                  .map((o: any) => o.id);
                                if (selectedIds.length === 1) {
                                  setItemAnswerJson(
                                    JSON.stringify({
                                      correctOptionId: selectedIds[0],
                                    }),
                                  );
                                } else {
                                  setItemAnswerJson(
                                    JSON.stringify({
                                      correctOptionIds: selectedIds,
                                    }),
                                  );
                                }
                              }}
                            />
                            <span className="text-sm">
                              {opt.label || "(no label)"}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="text-sm">
                        Accepted answers (comma separated)
                      </label>
                      <Input
                        value={(() => {
                          const a = tryParseJson(
                            itemAnswerJson,
                            {} as any,
                          ) as any;
                          return Array.isArray(a?.accepted)
                            ? a.accepted.join(", ")
                            : "";
                        })()}
                        onChange={(e) => {
                          const list = (e.target.value || "")
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setItemAnswerJson(JSON.stringify({ accepted: list }));
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(null);
                      setItemPrompt("");
                      setItemOptionsJson("[]");
                      setItemAnswerJson("{}");
                      setItemSectionKey("");
                      setItemSourceDocumentId("");
                      setItemDifficultyState(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button type="submit">{editingItem ? "Save" : "Add"}</Button>
                </div>
              </form>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
