"use client";

import React from "react";
import { Bold, Italic, Hash, Code, List, Quote, Link } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange?: (v: string) => void;
}

function insertAround(
  ref: React.RefObject<HTMLTextAreaElement>,
  before: string,
  after?: string,
  placeholder = "",
  onChange?: (v: string) => void,
) {
  const ta = ref.current;
  if (!ta) return;
  const start = ta.selectionStart ?? 0;
  const end = ta.selectionEnd ?? 0;
  const value = ta.value || "";
  const selected = value.substring(start, end) || placeholder;
  const newValue =
    value.substring(0, start) +
    before +
    selected +
    (after ?? before) +
    value.substring(end);
  // update React state via onChange if provided (controlled component)
  if (onChange) onChange(newValue);
  // schedule caret update after React updates the value
  setTimeout(() => {
    const t = ref.current;
    if (!t) return;
    const pos =
      start +
      before.length +
      selected.length +
      (after ? after.length : before.length);
    t.selectionStart = t.selectionEnd = pos;
    t.focus();
  }, 0);
}

export default function MarkdownToolbar({ textareaRef, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          insertAround(textareaRef, "**", "**", "bold text", onChange)
        }
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => insertAround(textareaRef, "*", "*", "italic", onChange)}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => insertAround(textareaRef, "# ", "", "Heading", onChange)}
      >
        <Hash className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          insertAround(textareaRef, "\n```\n", "\n```\n", "code", onChange)
        }
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          insertAround(textareaRef, "- ", "", "list item", onChange)
        }
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => insertAround(textareaRef, "> ", "", "", onChange)}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const ta = textareaRef.current;
          if (!ta) return;
          const start = ta.selectionStart ?? 0;
          const end = ta.selectionEnd ?? 0;
          const value = ta.value || "";
          const selected = value.substring(start, end) || "link text";
          const url = "https://";
          const newValue =
            value.substring(0, start) +
            `[${selected}](${url})` +
            value.substring(end);
          if (onChange) onChange(newValue);
          setTimeout(() => {
            const t = textareaRef.current;
            if (!t) return;
            const pos = start + selected.length + 3 + url.length;
            t.selectionStart = t.selectionEnd = pos;
            t.focus();
          }, 0);
        }}
      >
        <Link className="h-4 w-4" />
      </Button>
    </div>
  );
}
