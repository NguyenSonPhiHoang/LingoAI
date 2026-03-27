"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import type { FC } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  FileText,
  ExternalLink,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Edit,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import type { LibraryDocument, LibraryContent } from "@/services/library";
import {
  getDocument,
  getContentForDocument,
  deleteContent,
} from "@/services/library";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import AddNoteDialog from "@/components/lingo/add-note-dialog";
import EditNoteDialog from "@/components/lingo/edit-note-dialog";
import type { CombinedVocabulary } from "@/services/vocabulary";
import { getVocabulary } from "@/services/vocabulary";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import InteractiveText from "@/components/lingo/interactive-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const NOTE_BG_COLORS = [
  "bg-yellow-50/70",
  "bg-blue-50/70",
  "bg-green-50/70",
  "bg-purple-50/70",
  "bg-red-50/70",
  "bg-indigo-50/70",
];

const NoteActions: FC<{
  note: LibraryContent;
  onNoteUpdated: (note: LibraryContent) => void;
  onDeleteContent: (id: string) => void;
  viewMode: "grid" | "list";
}> = ({ note, onNoteUpdated, onDeleteContent, viewMode }) => (
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <EditNoteDialog note={note} onNoteUpdated={onNoteUpdated}>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Edit className="h-4 w-4" />
        <span className="sr-only">Edit Note</span>
      </Button>
    </EditNoteDialog>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDeleteContent(note.id)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

const ViewNoteDialog: FC<{
  note: LibraryContent;
  children: React.ReactNode;
  vocabulary: CombinedVocabulary[];
  playbackHook: ReturnType<typeof useAudioPlayback>;
}> = ({ note, children, vocabulary, playbackHook }) => (
  <Dialog>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{note.fileName}</DialogTitle>
        <DialogDescription>
          Added on {format(new Date(note.createdAt), "PP")}
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 relative">
        <ScrollArea className="absolute inset-0 pr-6">
          {note.type === "image" ? (
            <Image
              src={note.content}
              alt={note.fileName}
              width={800}
              height={600}
              className="w-full h-auto object-contain rounded-md border"
            />
          ) : (
            <article className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </article>
          )}
        </ScrollArea>
      </div>
    </DialogContent>
  </Dialog>
);

const LibraryDocPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const docId = params.docId as string;

  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [contents, setContents] = useState<LibraryContent[]>([]);
  const [vocabulary, setVocabulary] = useState<CombinedVocabulary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const playbackHook = useAudioPlayback({ setWords: setVocabulary });

  useEffect(() => {
    if (authLoading || !user || !docId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedDoc, fetchedContent, fetchedVocab] = await Promise.all([
          getDocument(docId),
          getContentForDocument(docId),
          getVocabulary(user.uid),
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
        setContents(fetchedContent);
        setVocabulary(fetchedVocab);
      } catch (error) {
        console.error("Failed to fetch document data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch the document.",
        });
        router.push("/library");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, docId, toast, router]);

  const handleNoteAdded = (newNote: LibraryContent) => {
    setContents((prev) => [newNote, ...prev]);
  };

  const handleNoteUpdated = (updatedNote: LibraryContent) => {
    setContents((prev) =>
      prev.map((c) => (c.id === updatedNote.id ? updatedNote : c))
    );
  };

  const handleDeleteContent = async (contentId: string) => {
    const originalContents = [...contents];
    setContents((prev) => prev.filter((c) => c.id !== contentId));
    try {
      await deleteContent(contentId);
      toast({ title: "Note Deleted" });
    } catch (error) {
      console.error("Failed to delete content:", error);
      toast({ variant: "destructive", title: "Deletion Failed" });
      setContents(originalContents);
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
      <audio ref={playbackHook.audioRef} className="hidden" />
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => router.push("/library")}
          className="-ml-4"
        >
          <ArrowLeft className="mr-2" /> Back to Library
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/library/${docId}/note`)}
          >
            Note Page
          </Button>
          <AddNoteDialog docId={docId} onNoteAdded={handleNoteAdded} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{doc.title}</span>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </CardTitle>
        </CardHeader>
        {doc.summary && (
          <Collapsible
            open={isSummaryOpen}
            onOpenChange={setIsSummaryOpen}
            className="border-t"
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50">
                <span className="text-sm font-medium">View Summary</span>
                <ChevronsUpDown className="h-4 w-4" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-0">
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {doc.summary}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">My Notes &amp; Content</h3>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-5 w-5" />
              <span className="sr-only">Grid View</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-5 w-5" />
              <span className="sr-only">List View</span>
            </Button>
          </div>
        </div>

        {contents.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contents.map((content, index) => (
                <Card
                  key={content.id}
                  className={cn(
                    "group flex flex-col",
                    NOTE_BG_COLORS[index % NOTE_BG_COLORS.length]
                  )}
                >
                  <CardHeader className="flex-grow">
                    <CardTitle className="text-base flex items-start gap-2">
                      <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="line-clamp-2">{content.fileName}</span>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          {format(new Date(content.createdAt), "PP")}
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="prose prose-sm dark:prose-invert max-w-none bg-background/50 p-3 rounded-md h-24 overflow-hidden relative">
                      {content.type === "image" ? (
                        <Image
                          src={content.content}
                          alt={content.fileName}
                          layout="fill"
                          objectFit="contain"
                          className="rounded-md"
                        />
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {content.content || "No content preview."}
                        </ReactMarkdown>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between items-center">
                    <ViewNoteDialog
                      note={content}
                      vocabulary={vocabulary}
                      playbackHook={playbackHook}
                    >
                      <Button variant="outline" className="w-auto flex-grow">
                        View Details
                      </Button>
                    </ViewNoteDialog>
                    <div className="flex-shrink-0">
                      <NoteActions
                        note={content}
                        onNoteUpdated={handleNoteUpdated}
                        onDeleteContent={handleDeleteContent}
                        viewMode="grid"
                      />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note Title</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contents.map((content) => (
                    <TableRow key={content.id} className="group">
                      <TableCell className="font-medium">
                        <ViewNoteDialog
                          note={content}
                          vocabulary={vocabulary}
                          playbackHook={playbackHook}
                        >
                          <span className="cursor-pointer hover:underline">
                            {content.fileName}
                          </span>
                        </ViewNoteDialog>
                      </TableCell>
                      <TableCell>
                        {format(new Date(content.createdAt), "PP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <NoteActions
                            note={content}
                            onNoteUpdated={handleNoteUpdated}
                            onDeleteContent={handleDeleteContent}
                            viewMode="list"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No notes added yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first note to this document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryDocPage;
