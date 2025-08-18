"use client";

import { useState } from "react";
import type { FC } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Word {
  id: number;
  term: string;
  definition: string;
  sentence: string;
}

const initialWords: Word[] = [
  {
    id: 1,
    term: "Ubiquitous",
    definition: "Present, appearing, or found everywhere.",
    sentence: "Smartphones have become ubiquitous in modern society.",
  },
  {
    id: 2,
    term: "Ephemeral",
    definition: "Lasting for a very short time.",
    sentence: "The beauty of the cherry blossoms is ephemeral.",
  },
  {
    id: 3,
    term: "Mellifluous",
    definition: "(of a voice or words) Sweet or musical; pleasant to hear.",
    sentence: "Her mellifluous voice captivated the audience.",
  },
];

const VocabularyList: FC = () => {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddWord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newWord: Word = {
      id: Date.now(),
      term: formData.get("term") as string,
      definition: formData.get("definition") as string,
      sentence: formData.get("sentence") as string,
    };
    if (newWord.term && newWord.definition) {
      setWords([newWord, ...words]);
      setIsDialogOpen(false);
    }
  };

  const handleDeleteWord = (id: number) => {
    setWords(words.filter((word) => word.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>My Vocabulary</CardTitle>
          <CardDescription>
            A personalized list of words you are learning.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Word
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Word</DialogTitle>
              <DialogDescription>
                Save a new word to your personal vocabulary list.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWord}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="term" className="text-right">
                    Term
                  </Label>
                  <Input id="term" name="term" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="definition" className="text-right">
                    Definition
                  </Label>
                  <Input
                    id="definition"
                    name="definition"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sentence" className="text-right">
                    Sentence
                  </Label>
                  <Input
                    id="sentence"
                    name="sentence"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Word</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Term</TableHead>
              <TableHead className="w-2/4">Definition & Example</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.length > 0 ? (
              words.map((word) => (
                <TableRow key={word.id}>
                  <TableCell className="font-medium">{word.term}</TableCell>
                  <TableCell>
                    <p>{word.definition}</p>
                    <p className="text-sm text-muted-foreground italic">
                      "{word.sentence}"
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWord(word.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Your vocabulary list is empty. Add a new word to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VocabularyList;
