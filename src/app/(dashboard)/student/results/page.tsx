// src/app/(dashboard)/student/results/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { PracticeSessionType, PracticeSessionStatus } from "@/generated/prisma";
import { toast } from "react-toastify";
import {
  FaClipboardCheck,
  FaCalendarAlt,
  FaBook,
  FaPlay,
  FaChartBar,
  FaCheckCircle,
  FaAward,
  FaClock,
} from "react-icons/fa";

interface CompletedSession {
  id: string;
  title?: string | null;
  type: keyof typeof PracticeSessionType;
  endTime?: Date | string | null;
  score?: number | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  xpEarned: number;
  subjectName?: string | null;
  topicName?: string | null;
  questionGroupName?: string | null;
}

export default function StudentResultsPage() {
  const [completedSessions, setCompletedSessions] = useState<
    CompletedSession[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchCompletedSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view results.");
          router.push("/sign-in");
          return;
        }

        const response = await fetch(
          "/api/student/practice-sessions/completed"
        );
        if (!response.ok) {
          const errData = await response
            .json()
            .catch(() => ({ error: "Failed to fetch results" }));
          throw new Error(
            errData.error?.message || errData.error || "Failed to fetch results"
          );
        }
        const data: CompletedSession[] = await response.json();
        setCompletedSessions(data);
      } catch (err: any) {
        console.error("Error fetching completed sessions:", err);
        setError(err.message || "Failed to load your practice history.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedSessions();
  }, [router, supabase]);

  const viewSessionDetails = (sessionId: string) => {
    router.push(`/student/results/${sessionId}`);
  };

  // Function to get performance level and styling
  const getPerformanceDetails = (session: CompletedSession) => {
    const totalPossible =
      (session.totalQuestions || 1) * (session.type === "MOCK_EXAM" ? 1 : 10);
    const scorePercentage = ((session.score || 0) / totalPossible) * 100;

    if (scorePercentage >= 80) {
      return {
        icon: FaCheckCircle,
        level: "Excellent",
        score: "A",
        barColor: "bg-gradient-to-r from-purple-600 to-indigo-600",
        badgeColor:
          "bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100",
        iconColor: "text-purple-600",
        textColor: "text-purple-700",
        cardBorder: "border-purple-200",
        buttonStyle: "border-purple-300 text-purple-700 hover:bg-purple-50",
      };
    } else if (scorePercentage >= 60) {
      return {
        icon: FaAward,
        level: "Good",
        score: "B",
        barColor: "bg-gradient-to-r from-indigo-500 to-purple-500",
        badgeColor:
          "bg-gradient-to-br from-indigo-100 via-indigo-50 to-purple-100",
        iconColor: "text-indigo-600",
        textColor: "text-indigo-700",
        cardBorder: "border-indigo-200",
        buttonStyle: "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
      };
    } else if (scorePercentage >= 40) {
      return {
        icon: FaClipboardCheck,
        level: "Satisfactory",
        score: "C",
        barColor: "bg-gradient-to-r from-amber-400 to-orange-400",
        badgeColor:
          "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100",
        iconColor: "text-amber-600",
        textColor: "text-amber-700",
        cardBorder: "border-amber-200",
        buttonStyle: "border-amber-300 text-amber-700 hover:bg-amber-50",
      };
    } else {
      return {
        icon: FaChartBar,
        level: "Needs Improvement",
        score: "",
        barColor: "bg-gradient-to-r from-gray-400 to-slate-400",
        badgeColor: "bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100",
        iconColor: "text-gray-500",
        textColor: "text-gray-600",
        cardBorder: "border-gray-200",
        buttonStyle: "border-gray-300 text-gray-700 hover:bg-gray-50",
      };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-purple-600 border-gray-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600 font-medium">
          Loading Your Results...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
        <div className="bg-gray-50 border border-gray-200 p-6 mb-6 max-w-md rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">
            Unable to Load Results
          </h3>
          <div className="mt-2 text-sm text-gray-600">
            <p>{error}</p>
          </div>
        </div>
        <Button
          onClick={() => router.push("/student/practice")}
          className="bg-purple-700 hover:bg-purple-800 text-white"
        >
          Go to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header Section - Matching practice page style */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <div className="w-16 h-16 border-2 border-white rounded-lg rotate-12"></div>
            </div>
            <div className="absolute bottom-4 right-8 opacity-10">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
            <div className="absolute top-8 left-8 opacity-10">
              <FaChartBar className="w-12 h-12 text-white" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="mb-4 md:mb-0">
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    Your Progress Journey
                  </h1>
                  <p className="text-indigo-100 text-lg md:text-xl">
                    Review your achievements and track your learning progress
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/student/practice")}
                  className="bg-white/20 text-white hover:bg-white/30 font-bold text-lg px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  <FaPlay className="mr-2 h-5 w-5" /> Start New Practice
                </Button>
              </div>
            </div>
          </div>
        </div>

        {completedSessions.length === 0 ? (
          <div className="text-center py-16 bg-white border-0 rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaChartBar className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-gray-800">
              No Completed Sessions
            </h2>
            <p className="mt-3 text-gray-600 max-w-md mx-auto">
              Complete some practice sessions to see your results and track your
              progress over time.
            </p>
            <div className="mt-8">
              <Button
                onClick={() => router.push("/student/practice")}
                className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                Start Practicing
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {completedSessions.map((session) => {
              const performanceDetails = getPerformanceDetails(session);
              const totalPossible =
                (session.totalQuestions || 1) *
                (session.type === "MOCK_EXAM" ? 1 : 10);
              const scorePercentage =
                ((session.score || 0) / totalPossible) * 100;
              const PerformanceIcon = performanceDetails.icon;

              return (
                <div
                  key={session.id}
                  className={`bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] overflow-hidden backdrop-blur-sm ${performanceDetails.cardBorder}`}
                >
                  <div className="p-6">
                    {/* Session Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                      <div className="flex items-start mb-3 md:mb-0">
                        <div
                          className={`p-3 rounded-lg mr-4 flex-shrink-0 ${performanceDetails.badgeColor}`}
                        >
                          <PerformanceIcon
                            className={`h-6 w-6 ${performanceDetails.iconColor}`}
                          />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            {session.title ||
                              `${
                                session.subjectName ||
                                session.topicName ||
                                session.questionGroupName ||
                                "Practice"
                              } Session`}
                          </h2>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <FaCalendarAlt className="mr-2 h-4 w-4" />
                            <span>
                              {session.endTime
                                ? new Date(session.endTime).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Badge */}
                      <div
                        className={`flex items-center px-4 py-2 rounded-xl ${performanceDetails.badgeColor} backdrop-blur-sm border border-white/20`}
                      >
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${performanceDetails.textColor}`}
                          >
                            {performanceDetails.score}
                          </div>
                          <div
                            className={`text-xs uppercase tracking-wider ${performanceDetails.textColor} opacity-80`}
                          >
                            {performanceDetails.level}
                          </div>
                        </div>
                        <div className="ml-4 w-16">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${performanceDetails.barColor}`}
                              style={{
                                width: `${Math.min(100, scorePercentage)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(scorePercentage)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 p-4 rounded-xl text-center shadow-sm">
                        <p className="text-xs text-blue-600 uppercase tracking-wider font-medium mb-1">
                          Total Score
                        </p>
                        <p className="text-2xl font-bold text-blue-800">
                          {session.score ?? 0}
                          <span className="text-lg text-blue-600">
                            /{totalPossible}
                          </span>
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 p-4 rounded-xl text-center shadow-sm">
                        <p className="text-xs text-green-600 uppercase tracking-wider font-medium mb-1">
                          Correct
                        </p>
                        <p className="text-2xl font-bold text-green-800">
                          {session.correctAnswers ?? 0}
                          <span className="text-lg text-green-600">
                            /{session.totalQuestions ?? 0}
                          </span>
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 p-4 rounded-xl text-center shadow-sm">
                        <p className="text-xs text-amber-600 uppercase tracking-wider font-medium mb-1">
                          XP Earned
                        </p>
                        <div className="flex items-center justify-center">
                          <FaAward className="text-amber-500 mr-1" />
                          <p className="text-2xl font-bold text-amber-800">
                            {session.xpEarned || 0}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border border-purple-200 p-4 rounded-xl text-center shadow-sm">
                        <p className="text-xs text-purple-600 uppercase tracking-wider font-medium mb-1">
                          Session Type
                        </p>
                        <p className="text-sm font-semibold text-purple-700 capitalize">
                          {session.type?.replace(/_/g, " ").toLowerCase() ||
                            "Practice"}
                        </p>
                      </div>
                    </div>

                    {/* Subject/Topic Information */}
                    {(session.subjectName ||
                      session.topicName ||
                      session.questionGroupName) && (
                      <div className="flex flex-wrap items-center text-sm text-gray-600 mb-6 pt-4 border-t border-gray-100">
                        {session.subjectName && (
                          <div className="flex items-center mr-6 mb-2">
                            <FaBook className="text-gray-400 mr-2 h-4 w-4" />
                            <span className="font-medium">Subject:</span>
                            <span className="ml-1">{session.subjectName}</span>
                          </div>
                        )}
                        {session.topicName && (
                          <div className="flex items-center mr-6 mb-2">
                            <span className="font-medium">Topic:</span>
                            <span className="ml-1">{session.topicName}</span>
                          </div>
                        )}
                        {session.questionGroupName && (
                          <div className="flex items-center mb-2">
                            <span className="font-medium">Question Group:</span>
                            <span className="ml-1">
                              {session.questionGroupName}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => viewSessionDetails(session.id)}
                        variant="outline"
                        className={`${performanceDetails.buttonStyle} rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
