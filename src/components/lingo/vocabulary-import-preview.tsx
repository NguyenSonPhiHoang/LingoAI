
"use client";

import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { VocabularyEntry } from '@/ai/flows/schemas';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface VocabularyImportPreviewProps {
  words: VocabularyEntry[];
  onSave: (selectedWords: VocabularyEntry[]) => void;
  isSaving: boolean;
}

const VocabularyImportPreview: FC<VocabularyImportPreviewProps> = ({ words, onSave, isSaving }) => {
  const [selectedWords, setSelectedWords] = useState<Record<string, boolean>>(() => {
    // Initially, all words are selected
    const initialState: Record<string, boolean> = {};
    words.forEach(word => {
      initialState[word.term] = true;
    });
    return initialState;
  });

  const handleSelectWord = (term: string, isSelected: boolean) => {
    setSelectedWords(prev => ({ ...prev, [term]: isSelected }));
  };
  
  const handleSelectAll = (isSelected: boolean) => {
      const newState: Record<string, boolean> = {};
      words.forEach(word => {
          newState[word.term] = isSelected;
      });
      setSelectedWords(newState);
  };

  const wordsToSave = useMemo(() => {
    return words.filter(word => selectedWords[word.term]);
  }, [words, selectedWords]);
  
  const allSelected = words.length > 0 && words.every(word => selectedWords[word.term]);

  return (
    <div className="space-y-4">
        <CardHeader className="p-0">
             <CardTitle>Vocabulary Preview</CardTitle>
            <CardDescription>
                Select the words you want to import into your vocabulary list, then click Save.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96 w-full rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                        <TableHead className="w-[50px]">
                             <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Select all"
                             />
                        </TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Definition</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {words.map((word, index) => (
                        <TableRow key={`${word.term}-${index}`} data-state={selectedWords[word.term] && "selected"}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedWords[word.term] || false}
                                    onCheckedChange={(checked) => handleSelectWord(word.term, !!checked)}
                                    aria-label={`Select ${word.term}`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">{word.term}</TableCell>
                            <TableCell>{word.definition}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-0 pt-4">
            <Button onClick={() => onSave(wordsToSave)} disabled={isSaving || wordsToSave.length === 0} className="w-full">
                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                Save {wordsToSave.length} Word(s)
            </Button>
        </CardFooter>
    </div>
  );
};

export default VocabularyImportPreview;
