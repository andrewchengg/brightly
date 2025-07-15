"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FaChartLine,
  FaTrophy,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
  FaSpinner,
  FaBook,
  FaEye,
  FaCalendarDay,
} from "react-icons/fa";
import { format } from "date-fns";

interface CompletedSession {
  id: string;
  title: string | null;
  startTime: Date;
  endTime: Date | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  totalMarksEarned: number | null;
  totalPossibleMarks: number | null;
  durationSeconds: number | null;
  completedAt: Date | null;
  subject?: {
    name: string | null;
  } | null;
  student?: {
    name: string | null;
  } | null;
}

interface RecentResultsPreviewProps {
  limit?: number;
}

const RecentResultsPreview: React.FC<RecentResultsPreviewProps> = ({
  limit = 5,
}) => {
  const [recentSessions, setRecentSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentResults = async () => {
      try {
        const response = await fetch("/api/parent/results");
        if (response.ok) {
          const data = await response.json();
          // The API returns a direct array, not wrapped in completedSessions
          const sortedSessions = Array.isArray(data)
            ? data
                .sort(
                  (a: any, b: any) =>
                    new Date(b.endTime).getTime() -
                    new Date(a.endTime).getTime()
                )
                .slice(0, limit)
                .map((session: any) => ({
                  ...session,
                  completedAt: session.endTime, // Map endTime to completedAt for consistency
                  title:
                    session.title ||
                    session.topicName ||
                    session.questionGroupName ||
                    "Practice Session",
                  subject: session.subjectName
                    ? { name: session.subjectName }
                    : null,
                  questionGroup: session.questionGroupName
                    ? { name: session.questionGroupName }
                    : null,
                }))
            : [];
          setRecentSessions(sortedSessions);
        }
      } catch (error) {
        console.error("Error fetching recent results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentResults();
  }, [limit]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const getScoreColor = (session: CompletedSession) => {
    const totalPossible = session.totalPossibleMarks ?? session.totalQuestions ?? 1;
    const achieved = session.totalMarksEarned ?? session.correctAnswers ?? 0;
    const scorePercentage = (achieved / totalPossible) * 100;

    if (scorePercentage >= 80) return "text-green-600 bg-green-50";
    if (scorePercentage >= 60) return "text-blue-600 bg-blue-50";
    if (scorePercentage >= 40) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreEmoji = (session: CompletedSession) => {
    const totalPossible = session.totalPossibleMarks ?? session.totalQuestions ?? 1;
    const achieved = session.totalMarksEarned ?? session.correctAnswers ?? 0;
    const scorePercentage = (achieved / totalPossible) * 100;

    if (scorePercentage >= 80) return "🏆";
    if (scorePercentage >= 60) return "🌟";
    if (scorePercentage >= 40) return "👍";
    return "💪";
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FaChartLine className="mr-2 text-indigo-600" />
              Recent Results
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="w-12 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FaChartLine className="mr-2 text-purple-800" />
            Recent Results
          </CardTitle>
          <Link href="/parent/results">
            <Button
              variant="outline"
              size="sm"
              className="text-purple-800 hover:bg-purple-100"
            >
              View All Results
              <FaArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <FaBook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No completed sessions yet
            </p>
            <p className="text-gray-400 text-sm">
              Results will appear here when children complete practice sessions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentSessions.map((session) => {
              const totalPossible = session.totalPossibleMarks ?? session.totalQuestions ?? 1;
              const achieved = session.totalMarksEarned ?? session.correctAnswers ?? 0;
              const scorePercentage = (achieved / totalPossible) * 100;
              const completedDate = session.completedAt || session.endTime;

              return (
                <div
                  key={session.id}
                  className="group border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-purple-300 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">
                          {getScoreEmoji(session)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {session.student?.name || "Unknown Student"}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {session.title || "Practice Session"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <FaCalendarDay className="mr-1" />
                          {formatDate(completedDate)}
                        </span>
                        <span className="flex items-center">
                          <FaClock className="mr-1" />
                          {formatTime(session.durationSeconds || 0)}
                        </span>
                        <span className="flex items-center">
                          <FaCheckCircle className="mr-1" />
                          {achieved}/{totalPossible} marks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                          session
                        )}`}
                      >
                        {Math.round(scorePercentage)}%
                      </div>
                      <Link href={`/parent/results/${session.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FaEye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {recentSessions.length >= limit && (
              <div className="pt-4 border-t border-gray-200">
                <Link href="/parent/results">
                  <Button
                    variant="outline"
                    className="w-full text-indigo-600 hover:bg-indigo-50"
                  >
                    View All{" "}
                    {recentSessions.length > limit
                      ? `${recentSessions.length - limit}+ More`
                      : ""}{" "}
                    Results
                    <FaArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentResultsPreview;
