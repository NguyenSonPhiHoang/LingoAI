import * as React from "react";
import { promises as fs } from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// This is a Server Component, so we can use Node.js APIs.
export default async function GuidePage() {
  let markdownContent = "";
  try {
    // Construct the path to the markdown file relative to the project root
    const filePath = path.join(process.cwd(), "HUONG_DAN_SU_DUNG.md");
    markdownContent = await fs.readFile(filePath, "utf-8");
    if (/[\u00C0-\u1EF9]/.test(markdownContent)) {
      markdownContent = "# User Guide\n\nThe guide is currently available only in Vietnamese. An English version will be added soon.";
    }
  } catch (error) {
    console.error("Error reading guide file:", error);
    markdownContent =
      "# User Guide\n\nError: Unable to load the guide file. Please try again later.";
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="-ml-4">
        <Link href="/">
          <ArrowLeft className="mr-2" /> Back to Dashboard
        </Link>
      </Button>
      <Card className="h-[calc(100vh-10rem)] flex flex-col">
        <CardHeader>
          <CardTitle>LingoAI User Guide</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <article className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:mt-2 [&_h2]:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownContent}
              </ReactMarkdown>
            </article>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
