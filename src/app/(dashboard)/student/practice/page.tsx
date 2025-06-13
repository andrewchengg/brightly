"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import {
  FaBook,
  FaCalculator,
  FaLanguage,
  FaFlask,
  FaGlobe,
  FaArrowRight,
  FaHeadphones,
  FaComments,
  FaMicrophone,
  FaExclamationTriangle,
  FaTrophy,
  FaFire,
  FaUsers,
  FaChartLine,
  FaCrown,
  FaMedal,
  FaGem,
  FaBullseye,
  FaBookOpen,
  FaPlay,
  FaLaptop,
} from "react-icons/fa";
import { LuCalculator } from "react-icons/lu";

// Define the subjects we want to display
const subjects = [
  {
    id: 1,
    name: "Math",
    subtitle: "AQA GCSE",
    icon: LuCalculator,
    topicsCount: 12,
    bgColor: "bg-purple-100",
    textColor: "text-gray-800",
    iconColor: "text-purple-600",
    lockIcon: true,
  },
  {
    id: 2,
    name: "Science",
    subtitle: "Physics, Chemistry & Biology",
    icon: FaFlask,
    topicsCount: 8,
    bgColor: "bg-green-50",
    textColor: "text-gray-800",
    iconColor: "text-green-600",
    lockIcon: true,
  },
  {
    id: 3,
    name: "English",
    subtitle: "Language & Literature",
    icon: FaBook,
    topicsCount: 10,
    bgColor: "bg-rose-50",
    textColor: "text-gray-800",
    iconColor: "text-rose-600",
    lockIcon: true,
  },
  {
    id: 4,
    name: "Chinese",
    subtitle: "Mandarin Language",
    icon: FaGlobe,
    topicsCount: 6,
    bgColor: "bg-amber-50",
    textColor: "text-gray-800",
    iconColor: "text-amber-600",
    lockIcon: true,
  },
];

const dailyQuests = [
  {
    id: 1,
    title: "Earn 50 XP",
    description: "Complete practice sessions to gain experience",
    progress: 50,
    target: 50,
    xpReward: 10,
    icon: FaTrophy,
    color: "amber",
  },
  {
    id: 2,
    title: "Score 90% or higher in 3 lessons",
    description: "Achieve high accuracy in your practice sessions",
    progress: 3,
    target: 3,
    xpReward: 15,
    icon: FaBullseye,
    color: "green",
  },
  {
    id: 3,
    title: "Earn 20 Combo Bonus XP",
    description: "Answer questions correctly in a row",
    progress: 20,
    target: 20,
    xpReward: 20,
    icon: FaFire,
    color: "orange",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Mock mistakes count - replace with actual data source
  const mistakesCount = 0; // This would come from your data source

  // Function to format mistakes count display
  const formatMistakesCount = (count: number): string => {
    if (count <= 10) {
      return count.toString();
    } else {
      const base = Math.floor(count / 10) * 10;
      return `${base}+`;
    }
  };

  const handleSubjectPractice = (subjectId: number) => {
    router.push(`/student/practice/subject/${subjectId}`);
  };

  const handleMistakesReview = () => {
    router.push("/student/review");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Today's Review
          </h1>
          <p className="text-gray-600">
            Keep up your learning streak and master new skills!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subject Practice Containers */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subjects.map((subject) => (
                  <SubjectPracticeCard
                    key={subject.id}
                    subject={subject}
                    onClick={() => handleSubjectPractice(subject.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Your Collections */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Your collections
              </h3>
              <Card
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md"
                onClick={handleMistakesReview}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <FaExclamationTriangle className="text-2xl text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          Mistakes
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Review your incorrect answers
                        </p>
                      </div>
                    </div>
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                      {formatMistakesCount(mistakesCount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* League Info */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <CardContent className="p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Pearl League</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    VIEW LEAGUE
                  </Button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaCrown className="text-xl text-yellow-300" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">You're ranked #1</p>
                    <p className="text-purple-100 text-sm">
                      Keep it up to stay in the top 3!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Quests */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Daily Quests
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-indigo-600"
                  >
                    VIEW ALL
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SubjectProps {
  id: number;
  name: string;
  subtitle: string;
  icon: any;
  topicsCount: number;
  bgColor: string;
  textColor: string;
  iconColor: string;
  lockIcon: boolean;
}

interface SubjectPracticeCardProps {
  subject: SubjectProps;
  onClick: () => void;
}

function SubjectPracticeCard({ subject, onClick }: SubjectPracticeCardProps) {
  const IconComponent = subject.icon;

  return (
    <Card
      className={`${subject.bgColor} border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative rounded-2xl`}
      onClick={onClick}
    >
      <CardContent className="p-6 relative">
        {/* Lock icon in top right if needed */}
        {subject.lockIcon && (
          <div className="absolute top-4 right-4">
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-white"
              >
                <path
                  d="M3 5V3.5C3 2.11929 4.11929 1 5.5 1H6.5C7.88071 1 9 2.11929 9 3.5V5M2 5H10C10.5523 5 11 5.44772 11 6V9.5C11 10.0523 10.5523 10.5 10 10.5H2C1.44772 10.5 1 10.0523 1 9.5V6C1 5.44772 1.44772 5 2 5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center text-center pt-8 pb-4">
          {/* Icon */}
          <div className="mb-6">
            <IconComponent className={`text-6xl ${subject.iconColor}`} />
          </div>

          {/* Title and Subtitle */}
          <div className="space-y-1">
            <h3 className={`text-xl font-bold ${subject.textColor}`}>
              {subject.name}
            </h3>
            <p className="text-gray-500 text-sm">{subject.subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Quest {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  icon: any;
  color: string;
}

interface QuestCardProps {
  quest: Quest;
}

function QuestCard({ quest }: QuestCardProps) {
  const IconComponent = quest.icon;
  const isCompleted = quest.progress >= quest.target;
  const progressPercentage = Math.min(
    (quest.progress / quest.target) * 100,
    100
  );

  const colorConfig = {
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      progress: "bg-amber-500",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      progress: "bg-green-500",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      progress: "bg-orange-500",
    },
  };

  const config =
    colorConfig[quest.color as keyof typeof colorConfig] || colorConfig.amber;

  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center`}
        >
          <IconComponent className={`text-sm ${config.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 text-sm">{quest.title}</h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {quest.progress} / {quest.target}
            </span>
            {isCompleted && (
              <div className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <FaGem className="text-xs" />
                {quest.xpReward}
              </div>
            )}
          </div>
        </div>
      </div>
      <ProgressBar
        value={quest.progress}
        max={quest.target}
        className="h-2 bg-gray-200"
        progressClassName={`${config.progress} transition-all duration-500 ease-out`}
      />
    </div>
  );
}
