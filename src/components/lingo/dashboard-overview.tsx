"use client";

import type { Dispatch, FC, SetStateAction } from "react";
import {
  ArrowRight,
  BookOpen,
  FilePenLine,
  Headphones,
  Mic,
} from "lucide-react";
import type { View } from "@/app/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DashboardOverviewProps {
  setActiveView: Dispatch<SetStateAction<View>>;
}

const skillData = [
  {
    name: "Listening",
    progress: 75,
    icon: Headphones,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
  },
  {
    name: "Speaking",
    progress: 40,
    icon: Mic,
    color: "text-green-500",
    bgColor: "bg-green-100",
  },
  {
    name: "Reading",
    progress: 85,
    icon: BookOpen,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
  },
  {
    name: "Writing",
    progress: 60,
    icon: FilePenLine,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
  },
];

const DashboardOverview: FC<DashboardOverviewProps> = ({ setActiveView }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back!</h2>
        <p className="text-muted-foreground">
          Here's a summary of your learning journey. Keep up the great work!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              You've completed 65% of your learning goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={65} className="h-3" />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Your next milestone is just around the corner!
            </p>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between bg-primary/10 transition-transform hover:scale-[1.02] hover:shadow-lg">
          <CardHeader>
            <CardTitle>Explore Lessons</CardTitle>
            <CardDescription>
              Dive into exercises for all skill levels.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => setActiveView("levels")}
              variant="outline"
            >
              Start Learning <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between bg-accent/10 transition-transform hover:scale-[1.02] hover:shadow-lg">
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Get personalized lesson recommendations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => setActiveView("ai-suggester")}
              variant="outline"
            >
              Get Suggestions <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight">Skill Progress</h3>
        <p className="text-muted-foreground">
          Track your improvement in each core skill.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {skillData.map((skill) => (
          <Card
            key={skill.name}
            className="transition-transform hover:-translate-y-1 hover:shadow-xl"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">
                {skill.name}
              </CardTitle>
              <div className={`rounded-lg p-2 ${skill.bgColor}`}>
                <skill.icon className={`h-6 w-6 ${skill.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{skill.progress}%</div>
              <p className="text-xs text-muted-foreground">
                Proficiency Level
              </p>
            </CardContent>
            <CardFooter>
              <Progress value={skill.progress} className="h-2" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
