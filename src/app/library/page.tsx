
"use client";

import * as React from 'react';
import { useState, useMemo, useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookOpen, FilePenLine, Headphones, Mic, AudioWaveform, Trash2, ExternalLink, Library, Edit, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { LibraryDocument, LibrarySkill } from '@/services/library';
import { getDocumentsGroupedBySkill, deleteDocument } from '@/services/library';
import EditDocumentDialog from '@/components/lingo/edit-document-dialog';
import AddDocumentDialog from '@/components/lingo/add-document-dialog';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const SKILLS: LibrarySkill[] = ["Reading", "Writing", "Listening", "Speaking", "Pronunciation"];
const skillIcons: Record<LibrarySkill, React.ElementType> = {
  Reading: BookOpen,
  Writing: FilePenLine,
  Listening: Headphones,
  Speaking: Mic,
  Pronunciation: AudioWaveform,
};

const DocumentActions: FC<{
    doc: LibraryDocument;
    onDocumentUpdated: (doc: LibraryDocument) => void;
    onDocumentDeleted: (doc: LibraryDocument) => void;
    router: ReturnType<typeof useRouter>;
}> = ({ doc, onDocumentUpdated, onDocumentDeleted, router }) => (
    <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => router.push(`/library/${doc.id}`)}>
            View Notes
        </Button>
        <EditDocumentDialog doc={doc} onDocumentUpdated={onDocumentUpdated} />
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete the document and all its associated notes. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDocumentDeleted(doc)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
);


const LibraryPage: FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [documents, setDocuments] = useState<Record<LibrarySkill, LibraryDocument[]>>({
        Reading: [], Writing: [], Listening: [], Speaking: [], Pronunciation: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        getDocumentsGroupedBySkill(user.uid)
            .then(setDocuments)
            .catch(err => {
                console.error("Failed to fetch documents", err);
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch your library." });
            })
            .finally(() => setIsLoading(false));
    }, [user, toast]);

    const handleDocumentAdded = (newDoc: LibraryDocument) => {
        setDocuments(prev => ({
            ...prev,
            [newDoc.skill]: [newDoc, ...prev[newDoc.skill]],
        }));
    };
    
    const handleDocumentUpdated = (updatedDoc: LibraryDocument) => {
        setDocuments(prev => {
            const allDocs = Object.values(prev).flat();
            const oldDoc = allDocs.find(d => d.id === updatedDoc.id);
            if (!oldDoc) return prev;

            const newGroupedDocs = { ...prev };

            // If skill changed, move doc between arrays
            if (oldDoc.skill !== updatedDoc.skill) {
                newGroupedDocs[oldDoc.skill] = newGroupedDocs[oldDoc.skill].filter(d => d.id !== updatedDoc.id);
                newGroupedDocs[updatedDoc.skill] = [updatedDoc, ...newGroupedDocs[updatedDoc.skill]];
            } else {
                 newGroupedDocs[updatedDoc.skill] = newGroupedDocs[updatedDoc.skill].map(d => d.id === updatedDoc.id ? updatedDoc : d);
            }
           
            return newGroupedDocs;
        });
    };
    
    const handleDocumentDeleted = (deletedDoc: LibraryDocument) => {
         deleteDocument(deletedDoc.id)
            .then(() => {
                 setDocuments(prev => ({
                    ...prev,
                    [deletedDoc.skill]: prev[deletedDoc.skill].filter(d => d.id !== deletedDoc.id),
                }));
                toast({ title: "Document Deleted" });
            })
            .catch(err => {
                console.error("Failed to delete document", err);
                toast({ variant: 'destructive', title: "Deletion Failed" });
            });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const totalDocs = Object.values(documents).reduce((sum, list) => sum + list.length, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Library /> My Library</CardTitle>
                            <CardDescription>Organize your learning resources by skill. Add links and attach notes.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                             <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                                <LayoutGrid className="h-5 w-5" />
                                <span className="sr-only">Grid View</span>
                            </Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                                <List className="h-5 w-5" />
                                <span className="sr-only">List View</span>
                            </Button>
                            <AddDocumentDialog onDocumentAdded={handleDocumentAdded} />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {totalDocs === 0 ? (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your Library is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Add your first document to start building your personal learning space.
                    </p>
                </div>
            ) : (
                SKILLS.map(skill => {
                    const Icon = skillIcons[skill];
                    const skillDocs = documents[skill];

                    if (skillDocs.length === 0) return null;

                    return (
                        <Card key={skill}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-primary" />
                                    <span>{skill}</span>
                                    <Badge variant="secondary">{skillDocs.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {skillDocs.map(doc => (
                                            <Card key={doc.id} className="flex flex-col hover:bg-muted/50 transition-colors">
                                                <CardHeader className="flex-grow">
                                                     <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline block flex items-start gap-1.5 group">
                                                        <ExternalLink className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                                                        <span className="flex-1">{doc.title}</span>
                                                     </a>
                                                      {doc.summary && (
                                                        <CardDescription className="mt-2 line-clamp-3">
                                                            {doc.summary}
                                                        </CardDescription>
                                                      )}
                                                </CardHeader>
                                                <CardFooter>
                                                    <DocumentActions doc={doc} onDocumentUpdated={handleDocumentUpdated} onDocumentDeleted={handleDocumentDeleted} router={router} />
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Added</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {skillDocs.map(doc => (
                                                <TableRow key={doc.id}>
                                                    <TableCell>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline flex items-center gap-2 group">
                                                            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                                                            <div>
                                                                {doc.title}
                                                                {doc.summary && <p className="text-xs text-muted-foreground font-normal line-clamp-1">{doc.summary}</p>}
                                                            </div>
                                                        </a>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <DocumentActions doc={doc} onDocumentUpdated={handleDocumentUpdated} onDocumentDeleted={handleDocumentDeleted} router={router} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
};

export default LibraryPage;
