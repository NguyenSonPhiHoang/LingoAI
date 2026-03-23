"use client";

import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FeatureTipData {
  icon: string;
  title: string;
  tips: string[];
  cta?: string; // call-to-action label on dismiss button
}

interface FeatureTipProps {
  data: FeatureTipData;
  onDismiss: () => void;
}

export function FeatureTip({ data, onDismiss }: FeatureTipProps) {
  return (
    /* Floating card — pinned bottom-right, does NOT block sidebar or other interactions */
    <div
      className="fixed bottom-6 right-6 z-[9998] w-[340px] max-w-[92vw] rounded-2xl border border-white/10 shadow-2xl p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(17,17,34,0.97) 0%, rgba(30,27,75,0.97) 100%)",
        backdropFilter: "blur(12px)",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 rounded-full p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Đóng"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Icon + Title */}
      <div className="mb-3 pr-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.icon}</span>
          <h2 className="text-base font-bold text-white leading-tight">{data.title}</h2>
        </div>
      </div>

      {/* Tips list */}
      <ul className="space-y-2 mb-4">
        {data.tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            >
              {i + 1}
            </span>
            <span className="text-xs text-white/80 leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <Button
        className="w-full font-semibold text-sm h-9"
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
        }}
        onClick={onDismiss}
      >
        {data.cta ?? "Đã hiểu, bắt đầu thôi!"}
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
