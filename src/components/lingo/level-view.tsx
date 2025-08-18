"use client";

import type { FC } from "react";
import { BookOpen, FilePenLine, Headphones, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const exercises = {
  beginner: [
    { title: "Greetings & Introductions", skill: "Listening", icon: Headphones },
    { title: "Basic Pronunciation Practice", skill: "Speaking", icon: Mic },
    { title: "Reading Simple Sentences", skill: "Reading", icon: BookOpen },
    { title: "Writing Your Name and Age", skill: "Writing", icon: FilePenLine },
  ],
  intermediate: [
    { title: "Podcast on Daily Routines", skill: "Listening", icon: Headphones },
    { title: "Describing a Picture", skill: "Speaking", icon: Mic },
    { title: "Reading a Short News Article", skill: "Reading", icon: BookOpen },
    { title: "Writing a Short Email", skill: "Writing", icon: FilePenLine },
  ],
  advanced: [
    { title: "Understanding a TED Talk", skill: "Listening", icon: Headphones },
    { title: "Debating a Topic", skill: "Speaking", icon: Mic },
    { title: "Analyzing a Piece of Literature", skill: "Reading", icon: BookOpen },
    { title: "Writing a Persuasive Essay", skill: "Writing", icon: FilePenLine },
  ],
};

const levels = ["Beginner", "Intermediate", "Advanced"];

const LevelView: FC = () => {
  return (
    <Tabs defaultValue="Beginner" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {levels.map((level) => (
          <TabsTrigger key={level} value={level}>
            {level}
          </TabsTrigger>
        ))}
      </TabsList>
      {levels.map((level) => (
        <TabsContent key={level} value={level}>
          <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 lg:grid-cols-4">
            {exercises[level.toLowerCase() as keyof typeof exercises].map(
              (exercise) => (
                <Card
                  key={exercise.title}
                  className="flex flex-col transition-shadow duration-300 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="mb-4 flex justify-center">
                      <div className="rounded-full bg-primary/10 p-4">
                        <exercise.icon className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-center">{exercise.title}</CardTitle>
                    <CardDescription className="text-center">
                      {exercise.skill} Practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow" />
                  <CardFooter>
                    <Button className="w-full">Start Lesson</Button>
                  </CardFooter>
                </Card>
              )
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default LevelView;
