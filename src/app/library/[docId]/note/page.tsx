"use client";

import * as React from "react";
import { useEffect, useMemo, useState, type FC } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import type { LibraryContent, LibraryDocument } from "@/services/library";
import {
  getDocument,
  getNotePageForDocument,
  upsertNotePageForDocument,
} from "@/services/library";

const LibraryNotePage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const docId = params.docId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [note, setNote] = useState<LibraryContent | null>(null);
  const [title, setTitle] = useState("Note");
  const [content, setContent] = useState("");

  const preview = useMemo(() => content.trim(), [content]);

  useEffect(() => {
    if (authLoading || !user || !docId) return;

    const run = async () => {
      setIsLoading(true);
      try {
        const [fetchedDoc, fetchedNote] = await Promise.all([
          getDocument(docId),
          getNotePageForDocument(docId),
        ]);

        if (!fetchedDoc) {
          toast({
            variant: "destructive",
            title: "Not Found",
            description:
              "This document does not exist or you don't have permission to view it.",
          });
          router.push("/library");
          return;
        }

        setDoc(fetchedDoc);
        setNote(fetchedNote);
        setTitle(fetchedNote?.fileName || "Note");
        setContent(fetchedNote?.content || "");
      } catch (err) {
        console.error("Failed to load note page:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load the note page.",
        });
        router.push(`/library/${docId}`);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [authLoading, user, docId, toast, router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await upsertNotePageForDocument(docId, {
        fileName: title,
        content,
      });
      setNote(saved);
      toast({ title: "Saved" });
    } catch (err) {
      console.error("Failed to save note page:", err);
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <p>Document not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/library/${docId}`)}
          className="-ml-4"
        >
          <ArrowLeft className="mr-2" /> Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{doc.title} — Note Page</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Content (Markdown)</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes here..."
              className="min-h-[260px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div className="border rounded-md p-4 bg-background">
              {preview ? (
                <article className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </article>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          </div>

          {note?.id ? (
            <p className="text-xs text-muted-foreground">
              Saved as a note page.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              This note page will be created on first save.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryNotePage;
