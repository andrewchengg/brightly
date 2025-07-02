"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FaUsers,
  FaClock,
  FaQuestionCircle,
  FaCheckCircle,
  FaTrophy,
  FaFire,
  FaChartLine,
  FaBook,
} from "react-icons/fa";

interface OverallStats {
  totalChildren: number;
  todayTotalTime: number;
  todayTotalQuestions: number;
  todayTotalCorrect: number;
  weekTotalSessions: number;
}

interface ChildStats {
  id: string;
  name: string;
  level: number;
  xpPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  today: {
    timeSpent: number;
    timeSpentMinutes: number;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    xpEarned: number;
    sessionsCompleted: number;
  };
  week: {
    timeSpent: number;
    timeSpentMinutes: number;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    sessionsCompleted: number;
  };
}

interface OverviewCardsProps {
  overallStats: OverallStats;
  childrenStats: ChildStats[];
  loading?: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({
  overallStats,
  childrenStats,
  loading = false,
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const totalTodayXP = childrenStats.reduce(
    (sum, child) => sum + child.today.xpEarned,
    0
  );
  const avgAccuracy =
    childrenStats.length > 0
      ? Math.round(
          childrenStats.reduce((sum, child) => sum + child.today.accuracy, 0) /
            childrenStats.length
        )
      : 0;

  const cards = [
    {
      title: "Active Children",
      value: overallStats.totalChildren,
      icon: FaUsers,
      color: "from-blue-500 to-blue-600",
      iconColor: "#3b82f6",
      bgColor: "bg-blue-50",
      description: "Total children learning",
    },
    {
      title: "Today's Study Time",
      value: formatTime(overallStats.todayTotalTime),
      icon: FaClock,
      color: "from-green-500 to-green-600",
      iconColor: "#10b981",
      bgColor: "bg-green-50",
      description: "Total time spent studying",
    },
    {
      title: "Questions Answered",
      value: overallStats.todayTotalQuestions,
      icon: FaQuestionCircle,
      color: "from-purple-500 to-purple-600",
      iconColor: "#8b5cf6",
      bgColor: "bg-purple-50",
      description: "Questions completed today",
    },
    {
      title: "XP Earned Today",
      value: totalTodayXP,
      icon: FaTrophy,
      color: "from-amber-500 to-amber-600",
      iconColor: "#f59e0b",
      bgColor: "bg-amber-50",
      description: "Experience points gained",
    },
    {
      title: "Average Accuracy",
      value: `${avgAccuracy}%`,
      icon: FaChartLine,
      color: "from-indigo-500 to-indigo-600",
      iconColor: "#6366f1",
      bgColor: "bg-indigo-50",
      description: "Overall accuracy today",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
                <div
                  className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OverviewCards;
