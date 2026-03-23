"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  targetId?: string; // HTML element id to spotlight
  placement?: "top" | "bottom" | "left" | "right" | "center";
  icon?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "👋 Chào mừng đến với LingoAI!",
    description:
      "Chỉ mất 1 phút để biết cách dùng app. Hãy để mình hướng dẫn bạn qua tất cả tính năng chính nhé!",
    placement: "center",
    icon: <Sparkles className="h-6 w-6 text-yellow-400" />,
  },
  {
    title: "📊 Overview — Trang Tổng Quan",
    description:
      "Màn hình chính của bạn. Xem tiến độ học tập, streak, từ vựng yêu thích và gợi ý học tập ngay tại đây.",
    targetId: "nav-overview",
    placement: "right",
  },
  {
    title: "🎓 All Levels — Tất Cả Cấp Độ",
    description:
      "Khám phá danh sách các cấp độ từ Beginner đến Advanced. Chọn đúng trình độ để học hiệu quả hơn.",
    targetId: "nav-levels",
    placement: "right",
  },
  {
    title: "✨ AI Suggester — Gợi Ý Thông Minh",
    description:
      "AI phân tích trình độ của bạn và gợi ý bài học phù hợp nhất. Chạy Placement Test trước để kết quả chính xác hơn!",
    targetId: "nav-ai-suggester",
    placement: "right",
  },
  {
    title: "📚 My Lessons — Bài Học Của Tôi",
    description:
      "Tạo, chỉnh sửa và học các bài học cá nhân. Bạn hoàn toàn có thể tự thiết kế lộ trình học cho riêng mình.",
    targetId: "nav-my-lessons",
    placement: "right",
  },
  {
    title: "📕 AI Storybook — Truyện AI",
    description:
      "AI tạo ra những câu chuyện ngắn thú vị dựa trên từ vựng bạn đang học. Học tiếng Anh qua ngữ cảnh thực tế và sinh động!",
    targetId: "nav-storybook",
    placement: "right",
  },
  {
    title: "📚 My Library — Thư Viện",
    description:
      "Lưu trữ tài liệu, ghi chú và tất cả nội dung học của bạn tại một nơi. Tra cứu và ôn lại bất cứ lúc nào.",
    targetId: "nav-library",
    placement: "right",
  },
  {
    title: "📝 VTEP Practice — Luyện Thi",
    description:
      "Luyện tập với đề thi VTEP thực tế. Làm quen format thi và theo dõi tiến bộ qua từng lần luyện.",
    targetId: "nav-vtep-student",
    placement: "right",
  },
  {
    title: "📖 Grammar — Ngữ Pháp",
    description:
      "Tra cứu cấu trúc ngữ pháp tiếng Anh quan trọng, được tổ chức theo chủ đề rõ ràng, dễ tìm.",
    targetId: "nav-grammar",
    placement: "right",
  },
  {
    title: "🗂️ My Vocabulary — Từ Điển Cá Nhân",
    description:
      "Kho từ vựng của riêng bạn. Nhấn ❤️ ở bất kỳ từ nào trong quá trình học để lưu vào đây.",
    targetId: "nav-vocabulary",
    placement: "right",
  },
  {
    title: "🎯 Review — Ôn Tập",
    description:
      "Ôn luyện từ vựng yêu thích qua Matching, Fill-in-the-blank và Part of Speech. Luyện mỗi ngày để nhớ lâu hơn!",
    targetId: "nav-review",
    placement: "right",
  },
  {
    title: "🤖 AI Assistant — Trợ Lý AI",
    description:
      "Trợ lý AI sẵn sàng 24/7 — dịch nghĩa, giải thích ngữ pháp, sửa câu văn. Nhấn nút ✨ ở góc dưới màn hình để mở!",
    targetId: "ai-assistant-trigger",
    placement: "left",
  },
  {
    title: "🚀 Sẵn sàng bắt đầu!",
    description:
      "Bạn đã biết tất cả tính năng chính rồi! Hãy bắt đầu bằng Placement Test để AI biết trình độ và gợi ý bài học phù hợp nhé!",
    placement: "center",
    icon: <Zap className="h-6 w-6 text-green-400" />,
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  userId: string;
  onStartPlacementTest?: () => void;
}

const STORAGE_KEY_PREFIX = "lingo_onboarding_done_";
const PADDING = 10;

export function OnboardingTour({
  userId,
  onStartPlacementTest,
}: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    transformX: string;
    transformY: string;
  } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;

  useEffect(() => {
    if (!userId) return;
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Small delay so the sidebar finishes rendering
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [userId, storageKey]);

  const computePositions = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step.targetId) {
      setSpotlight(null);
      setTooltipPos(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    if (!el) {
      setSpotlight(null);
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const sl: SpotlightRect = {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    };
    setSpotlight(sl);

    // Calculate tooltip position based on placement
    const placement = step.placement || "right";
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const tooltipW = 320;
    const tooltipH = 200;
    const gap = 16;

    let top = 0;
    let left = 0;
    let transformX = "0";
    let transformY = "0";

    if (placement === "right") {
      top = sl.top + sl.height / 2;
      left = sl.left + sl.width + gap;
      transformY = "-50%";
      if (left + tooltipW > vpW - 16) {
        left = sl.left - tooltipW - gap;
      }
    } else if (placement === "left") {
      top = sl.top + sl.height / 2;
      left = sl.left - tooltipW - gap;
      transformY = "-50%";
    } else if (placement === "bottom") {
      top = sl.top + sl.height + gap;
      left = sl.left + sl.width / 2;
      transformX = "-50%";
    } else if (placement === "top") {
      top = sl.top - tooltipH - gap;
      left = sl.left + sl.width / 2;
      transformX = "-50%";
    }

    // Clamp within viewport
    top = Math.min(Math.max(top, 16), vpH - tooltipH - 16);
    left = Math.min(Math.max(left, 16), vpW - tooltipW - 16);

    setTooltipPos({ top, left, transformX, transformY });
  }, [currentStep]);

  useEffect(() => {
    if (!visible) return;
    // Use rAF to ensure DOM is painted before measuring
    animFrameRef.current = requestAnimationFrame(() => {
      computePositions();
    });
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [visible, currentStep, computePositions]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("resize", computePositions);
    return () => window.removeEventListener("resize", computePositions);
  }, [visible, computePositions]);

  const finish = useCallback(
    (runPlacementTest = false) => {
      localStorage.setItem(storageKey, "true");
      setVisible(false);
      if (runPlacementTest && onStartPlacementTest) {
        onStartPlacementTest();
      }
    },
    [storageKey, onStartPlacementTest],
  );

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish(true);
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isCenter = !step.targetId && step.placement === "center";
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn sử dụng"
    >
      {/* SVG overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: isCenter ? "auto" : "none" }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={10}
                ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: isCenter ? "auto" : "none" }}
          onClick={() => finish()}
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlight && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 4px rgba(99,102,241,0.8), 0 0 24px rgba(99,102,241,0.5)",
            transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}

      {/* Tooltip card */}
      {isCenter ? (
        /* Centered modal card */
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <TourCard
            step={step}
            currentStep={currentStep}
            totalSteps={TOUR_STEPS.length}
            isLast={isLast}
            onNext={next}
            onPrev={prev}
            onSkip={() => finish()}
          />
        </div>
      ) : (
        tooltipPos && (
          <div
            className="absolute pointer-events-auto"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: `translateX(${tooltipPos.transformX}) translateY(${tooltipPos.transformY})`,
              transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <TourCard
              step={step}
              currentStep={currentStep}
              totalSteps={TOUR_STEPS.length}
              isLast={isLast}
              onNext={next}
              onPrev={prev}
              onSkip={() => finish()}
            />
          </div>
        )
      )}
    </div>
  );
}

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TourCard({
  step,
  currentStep,
  totalSteps,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: TourCardProps) {
  return (
    <div
      className="pointer-events-auto w-[320px] rounded-2xl border border-white/10 shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(17,17,34,0.97) 0%, rgba(30,27,75,0.97) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          {step.icon}
          <h3 className="text-sm font-bold text-white leading-snug">
            {step.title}
          </h3>
        </div>
        <button
          onClick={onSkip}
          className="ml-2 shrink-0 rounded-full p-1 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          aria-label="Bỏ qua hướng dẫn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        <p className="text-xs text-white/70 leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 20 : 6,
                height: 6,
                background:
                  i === currentStep
                    ? "rgb(99,102,241)"
                    : i < currentStep
                      ? "rgba(99,102,241,0.5)"
                      : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={currentStep === 0}
            className="text-white/50 hover:text-white hover:bg-white/10 text-xs px-2 h-8 disabled:opacity-0"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Quay lại
          </Button>

          <div className="flex gap-2">
            {!isLast && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-white/40 hover:text-white/70 hover:bg-white/10 text-xs px-2 h-8"
              >
                Bỏ qua
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="text-xs h-8 px-4 font-semibold"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
              }}
            >
              {isLast ? (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Làm Placement Test!
                </>
              ) : (
                <>
                  Tiếp theo
                  <ArrowRight className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to reopen the tour (call from "User Guide" button)
export function reopenOnboardingTour(userId: string) {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.removeItem(key);
  window.location.reload();
}
