"use client";

import * as React from "react";
import { useState, type FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import vtepService from "@/services/vtep";

const AddVtepDocumentDialog: FC<{
  onCreated?: () => void;
  disabled?: boolean;
}> = ({ onCreated, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState<
    "Listening" | "Reading" | "Writing" | "Speaking"
  >("Listening");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const preview = description.trim();

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      await vtepService.createVtepDocument(
        title || undefined,
        description || undefined,
        { skill },
      );
      toast({
        title: "Created",
        description: title ? `\"${title}\" created.` : "Document created.",
      });
      setTitle("");
      setDescription("");
      setSkill("Listening");
      setIsOpen(false);
      onCreated?.();
    } catch (err: any) {
      console.error("Failed to create vtep document:", err);
      toast({
        variant: "destructive",
        title: "Create failed",
        description: err?.message || "Could not create document",
      });
    } finally {
      setLoading(false);
    }
  };

  // Insert markdown at cursor position in the textarea
  const insertMarkdown = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) {
      // fallback: append
      setDescription((d) => d + prefix + suffix);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const selected = el.value.slice(start, end);
    const after = el.value.slice(end);
    const newVal = before + prefix + selected + suffix + after;
    setDescription(newVal);

    // Restore focus and move caret inside inserted area
    requestAnimationFrame(() => {
      const pos =
        before.length + prefix.length + (selected ? selected.length : 0);
      el.focus();
      el.selectionStart = el.selectionEnd = pos;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Create Document</Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create VTEP Document</DialogTitle>
          <DialogDescription>
            Enter a title and a description (supports Markdown).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex-1 flex flex-col">
          <div className="overflow-auto space-y-4 pb-4 px-1">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Skill</label>
              <div className="mt-1 max-w-xs">
                <Select
                  value={skill}
                  onValueChange={(v) => setSkill(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Listening">Listening</SelectItem>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Speaking">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Choose the document skill. (Listening/Reading are supported; Writing/Speaking will be added later.)
              </div>
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
                    onClick={() => insertMarkdown("**", "**")}
                  >
                    <span className="font-semibold">B</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Italic"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("*", "*")}
                  >
                    <span className="italic">I</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Heading"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("# ", "")}
                  >
                    <span className="font-semibold">#</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Code"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("``\n", "\n``")}
                  >
                    <span className="text-sm">&lt;&gt;</span>
                  </button>

                  <button
                    type="button"
                    aria-label="List"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("- ", "")}
                  >
                    <span className="text-lg">≡</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Quote"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("> ", "")}
                  >
                    <span className="text-lg">“</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Link"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background"
                    onClick={() => insertMarkdown("[", "](url)")}
                  >
                    <span className="text-sm">🔗</span>
                  </button>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description (supports Markdown)"
                  className="min-h-[320px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preview</label>
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={() => setShowPreview((s) => !s)}
                >
                  {showPreview ? "Hide preview" : "Show preview"}
                </button>
              </div>
              {showPreview ? (
                <div className="mt-2 border rounded-md p-3 bg-background min-h-[120px]">
                  {preview ? (
                    <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:mt-2 [&_h2]:mb-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {description}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nothing to preview.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-shrink-0">
            <DialogFooter className="sticky bottom-0 bg-background border-t py-3 px-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVtepDocumentDialog;
