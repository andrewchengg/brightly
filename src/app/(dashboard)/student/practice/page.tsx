"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  FaClock,
  FaRedo,
} from "react-icons/fa";
import { LuCalculator } from "react-icons/lu";
import { useQuestData } from "@/contexts/QuestContext";
import { useSupabaseUser } from "@/lib/hooks/auth";

// Import quest interface from context
interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  icon: string;
  color: string;
  category: string;
  isCompleted: boolean;
  completedAt?: string;
}

// Interface for in-progress practice sessions
interface InProgressSession {
  id: string;
  title: string;
  type: string;
  startTime: string;
  subjectId: number;
  topicId?: number;
  totalQuestions: number;
  correctAnswers: number | null;
  totalMarksEarned: number | null;
}

// Define the subjects we want to display
const subjects = [
  {
    id: 1,
    name: "Math",
    subtitle: "AQA GCSE",
    icon: LuCalculator,
    topicsCount: 12,
    bgColor: "bg-gradient-to-br from-purple-100 to-purple-100",
    textColor: "text-gray-800",
    iconColor: "text-purple-800",
    lockIcon: true,
    disabled: false,
    asset: "📐", // Triangular ruler emoji for math
    assetColor: "text-purple-800",
  },
  {
    id: 4,
    name: "Chinese",
    subtitle: "Mandarin Language",
    icon: FaGlobe,
    topicsCount: 6,
    bgColor: "bg-gradient-to-br from-amber-100 via-orange-50 to-red-100",
    textColor: "text-gray-800",
    iconColor: "text-amber-600",
    lockIcon: true,
    disabled: false,
    asset: "🧧", // Red envelope emoji for Chinese
    assetColor: "text-red-600",
  },
  {
    id: 2,
    name: "Science",
    subtitle: "Physics, Chemistry & Biology",
    icon: FaFlask,
    topicsCount: 8,
    bgColor: "bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100",
    textColor: "text-gray-500",
    iconColor: "text-gray-400",
    lockIcon: false,
    disabled: true,
    comingSoon: true,
    asset: "🧪", // Test tube emoji for science
    assetColor: "text-gray-400",
  },
  {
    id: 3,
    name: "English",
    subtitle: "Language & Literature",
    icon: FaBook,
    topicsCount: 10,
    bgColor: "bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100",
    textColor: "text-gray-500",
    iconColor: "text-gray-400",
    lockIcon: false,
    disabled: true,
    comingSoon: true,
    asset: "📚", // Books emoji for English
    assetColor: "text-gray-400",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const {
    quests: weeklyQuests,
    locked: questsLocked,
    level: studentLevel,
    requiredLevel,
    message: lockMessage,
    loading: questsLoading,
  } = useQuestData();

  // State for in-progress sessions
  const [inProgressSessions, setInProgressSessions] = useState<
    InProgressSession[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

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

  // Fetch in-progress sessions
  const fetchInProgressSessions = async () => {
    if (!user?.id) return;

    try {
      setSessionsLoading(true);
      const response = await fetch(
        `/api/student/practice-sessions/in-progress?studentId=${user.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch in-progress sessions");
      }
      const data = await response.json();
      setInProgressSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching in-progress sessions:", error);
      setInProgressSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load in-progress sessions when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchInProgressSessions();
    }
  }, [user?.id]);

  // Check for in-progress sessions before navigating
  const handleSubjectPractice = async (subjectId: number) => {
    router.push(`/student/practice/subject/${subjectId}`);
  };

  const handleMistakesReview = () => {
    router.push("/student/review");
  };

  // Handle resuming a specific session
  const handleResumeSession = (session: InProgressSession) => {
    // Navigate to the appropriate practice page with session ID
    if (session.type === "TOPIC_QUIZ" && session.topicId) {
      router.push(
        `/student/practice/topic/${session.topicId}?sessionId=${session.id}`
      );
    } else if (session.type === "PRACTICE") {
      router.push(
        `/student/practice/random?sessionId=${session.id}&subjectId=${session.subjectId}`
      );
    } else {
      // Default to random practice
      router.push(
        `/student/practice/random?sessionId=${session.id}&subjectId=${session.subjectId}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header - Containerized with darker colors like the image */}
        <div className="mb-8">
          <div className="bg-purple-800 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <div className="w-16 h-16 border-2 border-white rounded-lg rotate-12"></div>
            </div>
            <div className="absolute bottom-4 right-8 opacity-10">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                This Week's Learning
              </h1>
              <p className="text-indigo-100 text-lg md:text-xl">
                Complete your weekly quests and master new skills!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resume Practice Section */}
            {sessionsLoading ? (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaClock className="text-blue-600" />
                    Resume Practice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg border border-blue-200 p-4 animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : inProgressSessions.length > 0 ? (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaClock className="text-blue-600" />
                    Resume Practice
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Continue where you left off
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inProgressSessions.map((session) => (
                    <ResumeSessionCard
                      key={session.id}
                      session={session}
                      onResume={() => handleResumeSession(session)}
                    />
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Subject Practice Containers */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Start New Practice
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subjects.map((subject) => (
                  <SubjectPracticeCard
                    key={subject.id}
                    subject={subject}
                    onClick={() =>
                      !subject.disabled && handleSubjectPractice(subject.id)
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Weekly Quests - Using 'main' branch's implementation */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Weekly Quests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="p-4 bg-gray-50 rounded-lg animate-pulse"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : questsLocked ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <h3 className="font-semibold text-gray-600 mb-2">
                        Weekly Quests Locked
                      </h3>
                      <p className="text-sm mb-2">{lockMessage}</p>
                      <div className="bg-gray-100 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-center space-x-2">
                          <span>Current Level: {studentLevel}</span>
                          <span>•</span>
                          <span>Required: Level {requiredLevel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : weeklyQuests && weeklyQuests.length > 0 ? (
                  weeklyQuests.map((quest) => (
                    <WeeklyQuestCard key={quest.id} quest={quest} />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No weekly quests available</p>
                    <p className="text-sm">
                      Your weekly quests will be generated automatically on
                      Monday!
                    </p>
                  </div>
                )}
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
  disabled?: boolean;
  comingSoon?: boolean;
  asset: string;
  assetColor: string;
}

interface SubjectPracticeCardProps {
  subject: SubjectProps;
  onClick: () => void;
}

function SubjectPracticeCard({ subject, onClick }: SubjectPracticeCardProps) {
  const IconComponent = subject.icon;

  return (
    <Card
      className={`${
        subject.bgColor
      } border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
        subject.disabled
          ? "cursor-not-allowed opacity-75"
          : "cursor-pointer hover:scale-105"
      } relative rounded-3xl overflow-hidden backdrop-blur-sm`}
      onClick={onClick}
    >
      <CardContent className="p-8 relative">
        {subject.comingSoon && (
          <div className="absolute top-6 right-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
              Coming Soon
            </div>
          </div>
        )}

        {/* Deeply Colored Asset Display - Large */}
        <div
          className={`absolute bottom-6 right-6 text-7xl ${subject.assetColor} select-none transform rotate-12`}
        >
          {subject.asset}
        </div>

        <div className="flex flex-col items-center text-center pt-4 pb-6 relative z-10">
          <div className="mb-8">
            <IconComponent
              className={`text-7xl ${subject.iconColor} drop-shadow-sm`}
            />
          </div>
          <div className="space-y-2">
            <h3
              className={`text-2xl font-bold ${subject.textColor} tracking-tight`}
            >
              {subject.name}
            </h3>
            <p className="text-gray-600 text-base font-medium">
              {subject.subtitle}
            </p>
          </div>
        </div>

        {/* Subtle shine effect for enabled subjects */}
        {!subject.disabled && (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
        )}
      </CardContent>
    </Card>
  );
}

// Using the 'WeeklyQuestCard' component from the 'main' branch
// The old 'QuestCard' is removed as it's no longer needed.
interface WeeklyQuestCardProps {
  quest: WeeklyQuest;
}

function WeeklyQuestCard({ quest }: { quest: WeeklyQuest }) {
  // Map icon names to components
  const iconMap: { [key: string]: any } = {
    FaTrophy,
    FaBullseye,
    FaFire,
    FaBook,
    FaChartLine,
    FaUsers,
    FaCrown,
    FaMedal,
    FaGem,
    FaBookOpen,
    FaPlay,
    FaExclamationTriangle,
    FaArrowRight,
    FaHeadphones,
    FaComments,
    FaMicrophone,
    FaCalculator,
    FaLanguage,
    FaFlask,
    FaGlobe,
  };

  const IconComponent = iconMap[quest.icon] || FaTrophy;
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
    purple: {
      bg: "bg-purple-100",
      icon: "text-purple-800",
      progress: "bg-purple-800",
    },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", progress: "bg-blue-500" },
    indigo: {
      bg: "bg-indigo-50",
      icon: "text-indigo-600",
      progress: "bg-indigo-500",
    },
    teal: { bg: "bg-teal-50", icon: "text-teal-600", progress: "bg-teal-500" },
    yellow: {
      bg: "bg-yellow-50",
      icon: "text-yellow-600",
      progress: "bg-yellow-500",
    },
    pink: { bg: "bg-pink-50", icon: "text-pink-600", progress: "bg-pink-500" },
    red: { bg: "bg-red-50", icon: "text-red-600", progress: "bg-red-500" },
    cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", progress: "bg-cyan-500" },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      progress: "bg-emerald-500",
    },
    violet: {
      bg: "bg-violet-50",
      icon: "text-violet-600",
      progress: "bg-violet-500",
    },
    gold: {
      bg: "bg-yellow-50",
      icon: "text-yellow-700",
      progress: "bg-gradient-to-r from-yellow-400 to-yellow-600",
    },
    slate: {
      bg: "bg-slate-50",
      icon: "text-slate-600",
      progress: "bg-slate-500",
    },
    lime: { bg: "bg-lime-50", icon: "text-lime-600", progress: "bg-lime-500" },
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
          <p className="text-xs text-gray-500 mb-1">{quest.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {quest.progress} / {quest.target}
            </span>
            {isCompleted && (
              <div className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <FaTrophy className="text-xs" />
                COMPLETE
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

// Resume Session Card component
interface ResumeSessionCardProps {
  session: InProgressSession;
  onResume: () => void;
}

function ResumeSessionCard({ session, onResume }: ResumeSessionCardProps) {
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  const getSessionTypeDisplay = (type: string) => {
    switch (type) {
      case "TOPIC_QUIZ":
        return "Topic Practice";
      case "PRACTICE":
        return "Random Practice";
      case "WEEKLY_CHALLENGE":
        return "Weekly Challenge";
      default:
        return type;
    }
  };

  const formatStartTime = (startTime: string) => {
    const date = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const progress = session.correctAnswers || 0;
  const total = session.totalQuestions;
  const progressPercentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">
              {getSubjectName(session.subjectId)}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {getSessionTypeDisplay(session.type)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Started {formatStartTime(session.startTime)}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>
              {progress}/{total} questions
            </span>
            {session.totalMarksEarned !== null && (
              <span>{session.totalMarksEarned} points</span>
            )}
          </div>
          {total > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={onResume}
          size="sm"
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium flex items-center gap-2"
        >
          <FaRedo className="text-xs" />
          Resume
        </Button>
      </div>
    </div>
  );
}
