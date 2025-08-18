"use client";

import { useRef, useState } from "react";
import type { FC } from "react";
import { PlusCircle, Trash2, Upload, Loader2, Volume2 } from "lucide-react";
import mammoth from "mammoth";
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
import { useToast } from "@/hooks/use-toast";
import { extractVocabularyFromFile } from "@/ai/flows/extract-vocabulary";
import { generateAudio } from "@/ai/flows/generate-audio";
import type { VocabularyEntry } from "@/ai/flows/schemas";

interface Word extends VocabularyEntry {
  id: number;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

const initialWords: Word[] = [
  {
    id: 1,
    term: "Ubiquitous",
    pronunciation: "/juːˈbɪkwɪtəs/",
    definition: "Present, appearing, or found everywhere.",
    sentence: "Smartphones have become ubiquitous in modern society.",
  },
  {
    id: 2,
    term: "Ephemeral",
    pronunciation: "/ɪˈfemərəl/",
    definition: "Lasting for a very short time.",
    sentence: "The beauty of the cherry blossoms is ephemeral.",
  },
  {
    id: 3,
    term: "Mellifluous",
    pronunciation: "/məˈlɪfluəs/",
    definition: "(of a voice or words) Sweet or musical; pleasant to hear.",
    sentence: "Her mellifluous voice captivated the audience.",
  },
];

const VocabularyList: FC = () => {
  const [words, setWords] = useState<Word[]>(initialWords);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();


  const handleAddWord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newWord: Word = {
      id: Date.now(),
      term: formData.get("term") as string,
      pronunciation: formData.get("pronunciation") as string,
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
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chỉ tải lên các tệp .docx.",
      });
      return;
    }

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      
      const result = await extractVocabularyFromFile({ documentContent: text });
      
      const newWords: Word[] = result.vocabulary.map(v => ({...v, id: Date.now() + Math.random()}));
      
      setWords(prevWords => [...newWords, ...prevWords]);
      toast({
        title: "Thành công",
        description: `${newWords.length} từ đã được nhập thành công.`,
      });
    } catch (error) {
      console.error("Lỗi khi nhập tệp:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể nhập từ tệp. Vui lòng thử lại.",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }
  
  const handlePlayAudio = async (wordId: number) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    if (word.audioUrl && audioRef.current) {
      audioRef.current.src = word.audioUrl;
      audioRef.current.play();
      return;
    }

    if (word.isGeneratingAudio) return;

    try {
      setWords(prev => prev.map(w => w.id === wordId ? { ...w, isGeneratingAudio: true } : w));
      const result = await generateAudio(word.term);
      
      setWords(prev => prev.map(w => w.id === wordId ? { ...w, audioUrl: result.audioUrl, isGeneratingAudio: false } : w));

      if (audioRef.current) {
        audioRef.current.src = result.audioUrl;
        audioRef.current.play();
      }

    } catch (error) {
       console.error("Error generating audio:", error);
       toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tạo âm thanh. Vui lòng thử lại.",
      });
      setWords(prev => prev.map(w => w.id === wordId ? { ...w, isGeneratingAudio: false } : w));
    }
  }


  return (
    <Card>
      <audio ref={audioRef} className="hidden" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Từ vựng của tôi</CardTitle>
          <CardDescription>
            Một danh sách cá nhân hóa các từ bạn đang học.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".docx"
          />
           <Button onClick={triggerFileSelect} disabled={isImporting} variant="outline">
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Nhập từ tệp
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Thêm từ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Thêm từ mới</DialogTitle>
                <DialogDescription>
                  Lưu một từ mới vào danh sách từ vựng cá nhân của bạn.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddWord}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="term" className="text-right">
                      Từ
                    </Label>
                    <Input id="term" name="term" className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="pronunciation" className="text-right">
                      Phiên âm
                    </Label>
                    <Input id="pronunciation" name="pronunciation" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="definition" className="text-right">
                      Định nghĩa
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
                      Câu
                    </Label>
                    <Input
                      id="sentence"
                      name="sentence"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Lưu từ</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Từ & Âm thanh</TableHead>
              <TableHead className="w-2/4">Định nghĩa & Ví dụ</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.length > 0 ? (
              words.map((word) => (
                <TableRow key={word.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePlayAudio(word.id)}
                        disabled={word.isGeneratingAudio}
                        className="h-8 w-8"
                      >
                        {word.isGeneratingAudio ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Phát âm</span>
                      </Button>
                      <div>
                        <p>{word.term}</p>
                        <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
                      </div>
                    </div>
                  </TableCell>
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
                      <span className="sr-only">Xóa</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Danh sách từ vựng của bạn trống. Thêm một từ mới để bắt đầu!
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
