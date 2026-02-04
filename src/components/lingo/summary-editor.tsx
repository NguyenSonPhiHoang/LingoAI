"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import type { FieldValues, UseFormSetValue } from "react-hook-form";

type Props<TFieldValues extends FieldValues> = {
  field: {
    name: keyof TFieldValues & string;
    value: any;
  };
  setValue: UseFormSetValue<TFieldValues>;
};

export default function SummaryEditor<TFieldValues extends FieldValues>({
  field,
  setValue,
}: Props<TFieldValues>) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const insertMarkdown = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) {
      setValue(
        field.name as any,
        ((field.value || "") + prefix + suffix) as any,
      );
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const selected = el.value.slice(start, end);
    const after = el.value.slice(end);
    const newVal = before + prefix + selected + suffix + after;
    setValue(field.name as any, newVal as any);

    requestAnimationFrame(() => {
      const pos =
        before.length + prefix.length + (selected ? selected.length : 0);
      el.focus();
      el.selectionStart = el.selectionEnd = pos;
    });
  };

  return (
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
        value={field.value}
        onChange={(e) => setValue(field.name as any, e.target.value as any)}
        placeholder="A brief summary of the content..."
        className="min-h-[320px]"
      />
    </div>
  );
}
