import { useCallback, useEffect, useState } from "react";
import type { FeatureTipData } from "@/components/lingo/feature-tip";

const KEY_PREFIX = "lingo_feature_seen_";

// Content for each feature's first-visit tip
const FEATURE_TIPS: Record<string, FeatureTipData> = {
  "ai-suggester": {
    icon: "✨",
    title: "AI Suggester — Gợi Ý Thông Minh",
    tips: [
      "Mô tả ngắn về trình độ và mục tiêu học của bạn vào ô bên dưới.",
      "AI sẽ phân tích và đề xuất bài học phù hợp nhất với bạn.",
      "Hoặc chạy Placement Test để AI đánh giá trình độ chính xác hơn.",
    ],
    cta: "Thử ngay!",
  },
  "my-lessons": {
    icon: "📚",
    title: "My Lessons — Bài Học Của Tôi",
    tips: [
      "Nhấn nút '+ New Lesson' để tạo bài học mới.",
      "Mỗi bài học có thể chứa vocabulary, grammar notes và nội dung học tùy chỉnh.",
      "Sau khi học xong, AI có thể tạo Review Test cho từng bài.",
    ],
    cta: "Tạo bài học đầu tiên!",
  },
  levels: {
    icon: "🎓",
    title: "All Levels — Các Cấp Độ",
    tips: [
      "Các bài học được phân loại từ Beginner đến Advanced.",
      "Chọn cấp độ phù hợp với trình độ hiện tại của bạn.",
      "Nhấn vào một bài học để xem chi tiết và bắt đầu học.",
    ],
    cta: "Khám phá ngay!",
  },
  vocabulary: {
    icon: "🗂️",
    title: "My Vocabulary — Từ Điển Cá Nhân",
    tips: [
      "Nhấn '+ Add Word' hoặc bôi đen từ bất kỳ đâu trong app để thêm từ mới.",
      "Nhấn ❤️ trên từ để đánh dấu yêu thích — dùng cho ôn tập.",
      "Dùng bộ lọc và tìm kiếm để tra từ nhanh hơn.",
    ],
    cta: "Thêm từ đầu tiên!",
  },
  review: {
    icon: "🎯",
    title: "Review — Ôn Tập Từ Vựng",
    tips: [
      "Matching: Kéo và nối từ với nghĩa tương ứng.",
      "Fill-in-the-blank: Điền từ vào chỗ trống trong câu.",
      "Part of Speech: Phân loại từ loại (noun, verb, adj...).",
    ],
    cta: "Bắt đầu ôn tập!",
  },
  storybook: {
    icon: "📕",
    title: "AI Storybook — Truyện AI",
    tips: [
      "Nhập chủ đề hoặc danh sách từ vựng bạn muốn luyện.",
      "AI sẽ tạo ra một câu chuyện ngắn có sử dụng các từ đó.",
      "Đọc và hiểu từ vựng qua ngữ cảnh thực tế, sinh động hơn.",
    ],
    cta: "Tạo câu chuyện đầu tiên!",
  },
  "vtep-student": {
    icon: "📝",
    title: "VTEP Practice — Luyện Thi",
    tips: [
      "Chọn đề thi và bắt đầu làm bài trong thời gian giới hạn.",
      "Sau khi nộp bài, xem ngay đáp án và giải thích chi tiết.",
      "Theo dõi điểm số qua các lần thi để thấy tiến bộ.",
    ],
    cta: "Làm bài thử ngay!",
  },
  "placement-test": {
    icon: "🧠",
    title: "Placement Test — Kiểm Tra Trình Độ",
    tips: [
      "Bài test gồm các câu hỏi Vocab, Grammar và Reading.",
      "Làm hết sức tự nhiên — không cần học trước.",
      "Kết quả sẽ giúp AI gợi ý bài học phù hợp với trình độ của bạn.",
    ],
    cta: "Bắt đầu test!",
  },
  library: {
    icon: "📚",
    title: "My Library — Thư Viện",
    tips: [
      "Lưu và quản lý các tài liệu, ghi chú học tập của bạn.",
      "Upload file hoặc tạo ghi chú mới bằng nút '+ Add'.",
      "Tìm kiếm tài liệu nhanh bằng thanh tìm kiếm bên trên.",
    ],
    cta: "Khám phá thư viện!",
  },
};

export function useFeatureTip(userId: string | null | undefined) {
  const [activeTip, setActiveTip] = useState<FeatureTipData | null>(null);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);

  const showTipForFeature = useCallback(
    (featureId: string) => {
      if (!userId) return;
      const key = `${KEY_PREFIX}${userId}_${featureId}`;
      const seen = localStorage.getItem(key);
      if (seen) return; // already shown

      const tipData = FEATURE_TIPS[featureId];
      if (!tipData) return;

      setActiveFeatureId(featureId);
      setActiveTip(tipData);
    },
    [userId],
  );

  const dismissTip = useCallback(() => {
    if (!userId || !activeFeatureId) return;
    const key = `${KEY_PREFIX}${userId}_${activeFeatureId}`;
    localStorage.setItem(key, "true");
    setActiveTip(null);
    setActiveFeatureId(null);
  }, [userId, activeFeatureId]);

  return { activeTip, showTipForFeature, dismissTip };
}

// Features that have tips defined
export const FEATURES_WITH_TIPS = Object.keys(FEATURE_TIPS);
