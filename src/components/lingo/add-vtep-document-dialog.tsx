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
import { useToast } from "@/hooks/use-toast";
import vtepService from "@/services/vtep";

const AddVtepDocumentDialog: FC<{
  onCreated?: () => void;
  disabled?: boolean;
}> = ({ onCreated, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [showPreview, setShowPreview] = useState(false);

  const preview = description.trim();

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      await vtepService.createVtepDocument(
        title || undefined,
        description || undefined,
      );
      toast({
        title: "Created",
        description: title ? `\"${title}\" created.` : "Document created.",
      });
      setTitle("");
      setDescription("");
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Create Document</Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create VTEP Document</DialogTitle>
          <DialogDescription>
            Enter a title and a description (supports Markdown).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col h-[60vh]">
          <div className="overflow-auto space-y-4 pb-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Description (Markdown)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description (supports Markdown)"
                className="min-h-[120px]"
              />
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
                <div className="mt-2 border rounded-md p-3 bg-background min-h-[80px]">
                  {preview ? (
                    <article className="prose dark:prose-invert max-w-none">
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
            <DialogFooter>
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
