
"use client";

import type { FC } from "react";
import { BookOpen, FilePenLine, Headphones, Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const levelsData = [
  {
    level: "Bậc 1",
    cefr: "A1 – Beginner",
    skills: [
      {
        name: "Nghe",
        icon: Headphones,
        description: "Hiểu được từ, cụm từ quen thuộc, thông tin cơ bản về cá nhân, gia đình, môi trường gần gũi.",
      },
      {
        name: "Nói",
        icon: Mic,
        description: "Giao tiếp tối thiểu trong các tình huống đơn giản (giới thiệu bản thân, hỏi – đáp cơ bản).",
      },
      {
        name: "Đọc",
        icon: BookOpen,
        description: "Hiểu được văn bản rất ngắn, đơn giản (biển báo, hướng dẫn, thực đơn, tờ rơi).",
      },
      {
        name: "Viết",
        icon: FilePenLine,
        description: "Viết câu đơn giản về bản thân, điền thông tin cơ bản vào mẫu biểu.",
      },
    ],
  },
  {
    level: "Bậc 2",
    cefr: "A2 – Elementary",
    skills: [
      {
        name: "Nghe",
        icon: Headphones,
        description: "Hiểu ý chính trong hội thoại đơn giản về công việc, gia đình, mua sắm, du lịch.",
      },
      {
        name: "Nói",
        icon: Mic,
        description: "Giao tiếp trực tiếp, ngắn gọn trong tình huống quen thuộc; mô tả ngắn về cuộc sống thường ngày.",
      },
      {
        name: "Đọc",
        icon: BookOpen,
        description: "Hiểu văn bản đơn giản (thư tín, thông báo, hướng dẫn ngắn).",
      },
      {
        name: "Viết",
        icon: FilePenLine,
        description: "Viết đoạn văn ngắn, thư tín không trang trọng, mô tả sự kiện hoặc nhu cầu cá nhân.",
      },
    ],
  },
  {
    level: "Bậc 3",
    cefr: "B1 – Intermediate",
    skills: [
        {
            name: "Nghe",
            icon: Headphones,
            description: "Hiểu nội dung chính trong hội thoại chuẩn, rõ ràng về chủ đề quen thuộc trong học tập, công việc.",
        },
        {
            name: "Nói",
            icon: Mic,
            description: "Giao tiếp tự tin trong hầu hết tình huống du lịch; mô tả trải nghiệm, sự kiện, ước mơ, kế hoạch.",
        },
        {
            name: "Đọc",
            icon: BookOpen,
            description: "Hiểu được ý chính của văn bản trung bình (báo, tạp chí phổ thông).",
        },
        {
            name: "Viết",
            icon: FilePenLine,
            description: "Viết đoạn văn, bài luận ngắn, trình bày ý kiến, quan điểm cơ bản.",
        },
    ],
  },
  {
    level: "Bậc 4",
    cefr: "B2 – Upper Intermediate",
    skills: [
        {
            name: "Nghe",
            icon: Headphones,
            description: "Hiểu ý chính của nội dung phức tạp, kể cả bài giảng, thảo luận, tin tức.",
        },
        {
            name: "Nói",
            icon: Mic,
            description: "Giao tiếp lưu loát, tự nhiên với người bản ngữ; trình bày, tranh luận về các chủ đề quen thuộc và chuyên môn.",
        },
        {
            name: "Đọc",
            icon: BookOpen,
            description: "Hiểu được văn bản học thuật, báo chí, tài liệu chuyên ngành ở mức trung bình – cao.",
        },
        {
            name: "Viết",
            icon: FilePenLine,
            description: "Viết bài luận, báo cáo, thư từ với lập luận rõ ràng, có cấu trúc chặt chẽ.",
        },
    ],
  },
    {
    level: "Bậc 5",
    cefr: "C1 – Advanced",
    skills: [
        {
            name: "Nghe",
            icon: Headphones,
            description: "Hiểu chi tiết các bài giảng, thảo luận phức tạp, kể cả khi ngôn ngữ không rõ ràng.",
        },
        {
            name: "Nói",
            icon: Mic,
            description: "Trình bày mạch lạc, lưu loát về các vấn đề phức tạp; sử dụng ngôn ngữ linh hoạt trong học thuật, nghề nghiệp.",
        },
        {
            name: "Đọc",
            icon: BookOpen,
            description: "Hiểu các văn bản dài, học thuật hoặc chuyên môn; phân tích, đánh giá ý nghĩa ngầm ẩn.",
        },
        {
            name: "Viết",
            icon: FilePenLine,
            description: "Viết luận văn, báo cáo nghiên cứu, phân tích lập luận phức tạp với độ chính xác cao.",
        },
    ],
  },
  {
    level: "Bậc 6",
    cefr: "C2 – Proficiency",
    skills: [
        {
            name: "Nghe",
            icon: Headphones,
            description: "Hiểu hoàn toàn mọi dạng ngôn ngữ nói, kể cả hội thoại tốc độ nhanh, nhiều phương ngữ.",
        },
        {
            name: "Nói",
            icon: Mic,
            description: "Giao tiếp trôi chảy, chính xác trong mọi tình huống xã hội, học thuật, nghề nghiệp; sử dụng hàm ý, sắc thái tinh tế.",
        },
        {
            name: "Đọc",
            icon: BookOpen,
            description: "Hiểu, phân tích sâu mọi loại văn bản, kể cả tài liệu nghiên cứu học thuật chuyên sâu.",
        },
        {
            name: "Viết",
            icon: FilePenLine,
            description: "Viết văn bản dài, phức tạp, giàu lập luận, phù hợp bối cảnh học thuật hoặc chuyên môn cao cấp.",
        },
    ],
  },
];


const LevelView: FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {levelsData.map((level) => (
        <Card key={level.level} className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-lg text-2xl font-bold w-16 h-16 flex items-center justify-center">
                        {level.cefr.split(' ')[0]}
                    </div>
                    <div>
                        <CardTitle className="text-2xl">{level.level}</CardTitle>
                        <CardDescription className="text-md">{level.cefr.substring(level.cefr.indexOf(' ')+1)}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 flex-grow">
                {level.skills.map(skill => {
                    const Icon = skill.icon;
                    return (
                        <div key={skill.name} className="flex items-start gap-3">
                            <div className="bg-muted p-2 rounded-full mt-1">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{skill.name}</h4>
                                <p className="text-muted-foreground text-sm">{skill.description}</p>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LevelView;
