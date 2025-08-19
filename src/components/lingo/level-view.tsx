
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
    level: "Level 1",
    cefr: "A1 – Beginner",
    skills: [
      {
        name: "Listening",
        icon: Headphones,
        description: "Understand familiar words, phrases, and basic information about self, family, and immediate surroundings.",
      },
      {
        name: "Speaking",
        icon: Mic,
        description: "Manage minimal communication in simple situations (introducing self, basic questions and answers).",
      },
      {
        name: "Reading",
        icon: BookOpen,
        description: "Understand very short, simple texts (signs, instructions, menus, flyers).",
      },
      {
        name: "Writing",
        icon: FilePenLine,
        description: "Write simple sentences about oneself and fill in basic information on forms.",
      },
    ],
  },
  {
    level: "Level 2",
    cefr: "A2 – Elementary",
    skills: [
      {
        name: "Listening",
        icon: Headphones,
        description: "Understand the main points in simple conversations about work, family, shopping, and travel.",
      },
      {
        name: "Speaking",
        icon: Mic,
        description: "Communicate directly and briefly in familiar situations; briefly describe daily life.",
      },
      {
        name: "Reading",
        icon: BookOpen,
        description: "Understand simple texts (letters, announcements, short instructions).",
      },
      {
        name: "Writing",
        icon: FilePenLine,
        description: "Write short paragraphs, informal letters, and describe personal events or needs.",
      },
    ],
  },
  {
    level: "Level 3",
    cefr: "B1 – Intermediate",
    skills: [
        {
            name: "Listening",
            icon: Headphones,
            description: "Understand the main points of clear, standard speech on familiar topics in study and work.",
        },
        {
            name: "Speaking",
            icon: Mic,
            description: "Communicate confidently in most travel situations; describe experiences, events, dreams, and plans.",
        },
        {
            name: "Reading",
            icon: BookOpen,
            description: "Understand the main ideas of average-length texts (newspapers, general magazines).",
        },
        {
            name: "Writing",
            icon: FilePenLine,
            description: "Write short paragraphs and essays, presenting basic opinions and viewpoints.",
        },
    ],
  },
  {
    level: "Level 4",
    cefr: "B2 – Upper Intermediate",
    skills: [
        {
            name: "Listening",
            icon: Headphones,
            description: "Understand the main ideas of complex content, including lectures, discussions, and news reports.",
        },
        {
            name: "Speaking",
            icon: Mic,
            description: "Interact fluently and spontaneously with native speakers; present and debate on familiar and professional topics.",
        },
        {
            name: "Reading",
            icon: BookOpen,
            description: "Understand academic texts, journalism, and mid-to-high level professional documents.",
        },
        {
            name: "Writing",
            icon: FilePenLine,
            description: "Write well-structured essays, reports, and letters with clear arguments.",
        },
    ],
  },
    {
    level: "Level 5",
    cefr: "C1 – Advanced",
    skills: [
        {
            name: "Listening",
            icon: Headphones,
            description: "Understand detailed lectures and complex discussions, even when the language is not clearly structured.",
        },
        {
            name: "Speaking",
            icon: Mic,
            description: "Present coherently and fluently on complex issues; use language flexibly for academic and professional purposes.",
        },
        {
            name: "Reading",
            icon: BookOpen,
            description: "Understand long, academic, or professional texts; analyze and evaluate implicit meanings.",
        },
        {
            name: "Writing",
            icon: FilePenLine,
            description: "Write theses, research reports, and analyze complex arguments with high precision.",
        },
    ],
  },
  {
    level: "Level 6",
    cefr: "C2 – Proficiency",
    skills: [
        {
            name: "Listening",
            icon: Headphones,
            description: "Understand all forms of spoken language, including fast-paced conversations and various dialects.",
        },
        {
            name: "Speaking",
            icon: Mic,
            description: "Communicate fluently and precisely in all social, academic, and professional situations; use subtle nuances.",
        },
        {
            name: "Reading",
            icon: BookOpen,
            description: "Understand and deeply analyze all types of texts, including in-depth academic research documents.",
        },
        {
            name: "Writing",
            icon: FilePenLine,
            description: "Write long, complex, well-argued texts suitable for high-level academic or professional contexts.",
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
