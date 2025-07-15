"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FaUser,
  FaTrophy,
  FaFire,
  FaClock,
  FaCheckCircle,
  FaQuestionCircle,
  FaChartLine,
  FaArrowRight,
  FaEye,
  FaStar,
  FaCalendarDay,
} from "react-icons/fa";

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

interface ChildrenSummaryCardsProps {
  childrenStats: ChildStats[];
  loading?: boolean;
}

const ChildrenSummaryCards: React.FC<ChildrenSummaryCardsProps> = ({
  childrenStats,
  loading = false,
}) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getActivityStatus = (lastActivityDate: string | null) => {
    if (!lastActivityDate) return { status: "Never", color: "text-gray-500" };

    const now = new Date();
    const lastActivity = new Date(lastActivityDate);
    const diffHours = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 24) return { status: "Today", color: "text-green-600" };
    if (diffHours < 48)
      return { status: "Yesterday", color: "text-yellow-600" };
    if (diffHours < 168)
      return {
        status: `${Math.floor(diffHours / 24)} days ago`,
        color: "text-orange-600",
      };
    return { status: "Inactive", color: "text-red-600" };
  };

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600 bg-green-50";
    if (accuracy >= 80) return "text-blue-600 bg-blue-50";
    if (accuracy >= 70) return "text-yellow-600 bg-yellow-50";
    if (accuracy >= 60) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥🔥🔥";
    if (streak >= 3) return "🔥🔥";
    if (streak >= 1) return "🔥";
    return "💤";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-5 bg-gray-200 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (childrenStats.length === 0) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <FaUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Children Found
          </h3>
          <p className="text-gray-500">
            Add children to your account to see their progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {childrenStats.map((child) => {
        const activityStatus = getActivityStatus(child.lastActivityDate);
        const accuracyColor = getPerformanceColor(child.today.accuracy);

        return (
          <Card
            key={child.id}
            className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaUser className="text-purple-800" />
                    {child.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Level {child.level} • {child.xpPoints.toLocaleString()} XP
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-lg">
                      {getStreakEmoji(child.currentStreak)}
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {child.currentStreak}
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${activityStatus.color}`}>
                    {activityStatus.status}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Today's Performance */}
              <div className="bg-purple-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FaCalendarDay className="mr-2 text-purple-800" />
                  Today's Performance
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <FaClock className="w-3 h-3 text-purple-800 mr-1" />
                      <span className="text-xs text-gray-600">Study Time</span>
                    </div>
                    <p className="text-lg font-bold text-purple-800">
                      {formatTime(child.today.timeSpent)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <FaQuestionCircle className="w-3 h-3 text-blue-600 mr-1" />
                      <span className="text-xs text-gray-600">Questions</span>
                    </div>
                    <p className="text-lg font-bold text-blue-700">
                      {child.today.questionsAnswered}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <FaCheckCircle className="w-3 h-3 text-emerald-600 mr-1" />
                      <span className="text-xs text-gray-600">Correct</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">
                      {child.today.correctAnswers}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <FaTrophy className="w-3 h-3 text-amber-600 mr-1" />
                      <span className="text-xs text-gray-600">XP</span>
                    </div>
                    <p className="text-lg font-bold text-amber-700">
                      +{child.today.xpEarned}
                    </p>
                  </div>
                </div>
              </div>

              {/* Accuracy Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Accuracy Today
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-bold ${accuracyColor}`}
                >
                  {child.today.accuracy}%
                </div>
              </div>

              {/* Week Summary */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">This Week:</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center">
                      <FaClock className="w-3 h-3 text-gray-500 mr-1" />
                      {formatTime(child.week.timeSpent)}
                    </span>
                    <span className="flex items-center">
                      <FaQuestionCircle className="w-3 h-3 text-gray-500 mr-1" />
                      {child.week.questionsAnswered}
                    </span>
                    <span className="flex items-center">
                      <FaCheckCircle className="w-3 h-3 text-gray-500 mr-1" />
                      {child.week.accuracy}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Link href="/parent/results" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-indigo-600 hover:bg-indigo-50"
                  >
                    <FaEye className="w-3 h-3 mr-2" />
                    View Results
                  </Button>
                </Link>
                <Link href="/parent/review" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-amber-600 hover:bg-amber-50"
                  >
                    <FaStar className="w-3 h-3 mr-2" />
                    Review
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ChildrenSummaryCards;
