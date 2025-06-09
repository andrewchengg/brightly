"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  FaChartLine,
  FaCalendarAlt,
  FaTrophy,
  FaBook,
  FaSpinner,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUser,
  FaArrowLeft,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
} from "react-icons/fa";
import {
  PracticeSessionType as PrismaPracticeSessionType,
  PracticeSessionStatus as PrismaPracticeSessionStatus,
} from "@/generated/prisma";

interface CompletedSession {
  id: string;
  title?: string | null;
  type: keyof typeof PrismaPracticeSessionType;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  score?: number | null;
  xpEarned?: number | null;
  subjectName?: string | null;
  topicName?: string | null;
  questionGroupName?: string | null;
  student: {
    id: string;
    name: string;
    username: string;
  };
}

interface Child {
  id: string;
  name: string;
  username: string;
  level: number;
  xpPoints: number;
  class?: { name: string };
  grade?: { level: number; name?: string };
}

export default function ParentResultsPage() {
  const [completedSessions, setCompletedSessions] = useState<
    CompletedSession[]
  >([]);
  const [filteredSessions, setFilteredSessions] = useState<CompletedSession[]>(
    []
  );
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const router = useRouter();

  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/parent/children");
      if (!response.ok) {
        throw new Error("Failed to fetch children data");
      }
      const data = await response.json();
      // The API returns { children: Child[] }, so we need to extract the children array
      setChildren(Array.isArray(data.children) ? data.children : []);
    } catch (err: any) {
      console.error("Error fetching children:", err);
      toast.error("Failed to load children data");
      setChildren([]); // Set empty array on error
    }
  };

  const fetchCompletedSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/parent/results");
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch results data" }));
        throw new Error(
          errData.error?.message || "Failed to fetch results data"
        );
      }
      const data: CompletedSession[] = await response.json();
      setCompletedSessions(data);
    } catch (err: any) {
      console.error("Error fetching completed sessions:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    fetchCompletedSessions();
  }, []);

  useEffect(() => {
    let filtered = completedSessions;

    if (selectedChild) {
      filtered = filtered.filter(
        (session) => session.student.id === selectedChild
      );
    }

    setFilteredSessions(filtered);
  }, [selectedChild, completedSessions]);

  const viewSessionDetails = (sessionId: string) => {
    router.push(`/parent/results/${sessionId}`);
  };

  // Function to get emoji and color based on performance
  const getPerformanceDetails = (session: CompletedSession) => {
    const totalPossible =
      (session.totalQuestions || 1) * (session.type === "MOCK_EXAM" ? 1 : 10);
    const scorePercentage = ((session.score || 0) / totalPossible) * 100;

    if (scorePercentage >= 80) {
      return {
        emoji: "🏆",
        color: "from-green-400 to-emerald-500",
        textColor: "text-emerald-600",
        label: "Excellent",
      };
    } else if (scorePercentage >= 60) {
      return {
        emoji: "🌟",
        color: "from-blue-400 to-indigo-500",
        textColor: "text-indigo-600",
        label: "Good",
      };
    } else if (scorePercentage >= 40) {
      return {
        emoji: "👍",
        color: "from-yellow-300 to-amber-500",
        textColor: "text-amber-600",
        label: "Fair",
      };
    } else {
      return {
        emoji: "📚",
        color: "from-orange-300 to-red-400",
        textColor: "text-red-500",
        label: "Needs Practice",
      };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600 font-medium">
          Loading Children's Results...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Error Loading Results
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchCompletedSessions} className="w-full">
              <FaSyncAlt className="mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no children message if no children exist
  if (!Array.isArray(children) || children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <FaUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Children Found
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have any children associated with your account yet.
            </p>
            <Button onClick={fetchChildren}>
              <FaSyncAlt className="mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show child selection if no child is selected
  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl mb-6 shadow-xl">
              <FaChartLine className="text-3xl text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Children's Results
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              View your children's practice session results and track their
              progress.
            </p>
          </div>

          {/* Child Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.isArray(children) &&
              children.map((child) => {
                const childSessions = completedSessions.filter(
                  (session) => session.student.id === child.id
                );
                const totalXP = childSessions.reduce(
                  (sum, session) => sum + (session.xpEarned || 0),
                  0
                );
                const avgScore =
                  childSessions.length > 0
                    ? childSessions.reduce(
                        (sum, session) => sum + (session.score || 0),
                        0
                      ) / childSessions.length
                    : 0;

                return (
                  <Card
                    key={child.id}
                    className="group cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-0 bg-white"
                    onClick={() => setSelectedChild(child.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaUser className="text-2xl text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {child.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        @{child.username}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <FaCheckCircle className="text-green-500" />
                          <span>{childSessions.length} sessions completed</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <FaTrophy className="text-amber-500" />
                          <span>{totalXP} XP earned</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <FaChartLine className="text-blue-500" />
                          <span>{avgScore.toFixed(1)} avg score</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Overall Stats */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center mb-3">
                    <FaCheckCircle className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {completedSessions.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center mb-3">
                    <FaTrophy className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {completedSessions.reduce(
                      (sum, session) => sum + (session.xpEarned || 0),
                      0
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total XP Earned</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mb-3">
                    <FaUsers className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {Array.isArray(children) ? children.length : 0}
                  </div>
                  <div className="text-sm text-gray-600">Children</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show child results screen
  const selectedChildData = Array.isArray(children)
    ? children.find((c) => c.id === selectedChild)
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => setSelectedChild(null)}
            variant="ghost"
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="mr-2" />
            Back to Children
          </Button>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <FaChartLine className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {selectedChildData?.name}'s Results
                </h1>
                <p className="text-white/90 mt-1">
                  {filteredSessions.length} completed sessions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredSessions.length === 0 ? (
          <Card className="text-center py-16 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent>
              <FaBook className="w-20 h-20 text-blue-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                No Completed Sessions Yet
              </h3>
              <p className="text-gray-600 text-lg">
                {selectedChildData?.name} hasn't completed any practice sessions
                yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredSessions.map((session) => {
              const performanceDetails = getPerformanceDetails(session);
              const totalPossible =
                (session.totalQuestions || 1) *
                (session.type === "MOCK_EXAM" ? 1 : 10);
              const scorePercentage =
                ((session.score || 0) / totalPossible) * 100;

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="relative overflow-hidden">
                    {/* Top gradient banner based on performance */}
                    <div
                      className={`h-3 w-full bg-gradient-to-r ${performanceDetails.color}`}
                    ></div>

                    <div className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div className="flex items-center mb-3 md:mb-0">
                          <span className="text-2xl mr-3">
                            {performanceDetails.emoji}
                          </span>
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">
                              {session.title ||
                                `${
                                  session.subjectName ||
                                  session.topicName ||
                                  session.questionGroupName ||
                                  "Practice"
                                } Session`}
                            </h2>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <FaCalendarAlt className="mr-1 text-gray-400" />
                              <span>
                                {session.endTime
                                  ? new Date(
                                      session.endTime
                                    ).toLocaleDateString(undefined, {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                              <span className="mx-2">•</span>
                              <FaUser className="mr-1 text-gray-400" />
                              <span>{session.student.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
                          <span
                            className={`text-sm font-medium ${performanceDetails.textColor}`}
                          >
                            {performanceDetails.label}
                          </span>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full bg-gradient-to-r ${performanceDetails.color}`}
                              style={{
                                width: `${Math.min(100, scorePercentage)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Session stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-indigo-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-indigo-500 uppercase tracking-wider font-semibold">
                            Score
                          </p>
                          <p
                            className={`text-2xl font-bold mt-1 ${performanceDetails.textColor}`}
                          >
                            {session.score ?? 0}/{totalPossible}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-green-500 uppercase tracking-wider font-semibold">
                            Correct Answers
                          </p>
                          <p className="text-2xl font-bold mt-1 text-green-600">
                            {session.correctAnswers ?? 0}/
                            {session.totalQuestions ?? 0}
                          </p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-amber-500 uppercase tracking-wider font-semibold">
                            XP Earned
                          </p>
                          <div className="flex items-center justify-center mt-1">
                            <FaTrophy className="text-amber-500 mr-1" />
                            <p className="text-2xl font-bold text-amber-600">
                              {session.xpEarned || 0}
                            </p>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold">
                            Session Type
                          </p>
                          <p className="text-sm font-semibold mt-2 text-blue-700 capitalize">
                            {session.type?.replace(/_/g, " ").toLowerCase() ||
                              "Practice"}
                          </p>
                        </div>
                      </div>

                      {/* Subject/Topic section */}
                      {(session.subjectName ||
                        session.topicName ||
                        session.questionGroupName) && (
                        <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4 border-t border-gray-100 pt-4">
                          {session.subjectName && (
                            <div className="flex items-center mr-4 mb-2">
                              <FaBook className="text-gray-400 mr-1" />
                              <span>{session.subjectName}</span>
                            </div>
                          )}
                          {session.topicName && (
                            <div className="flex items-center mr-4 mb-2">
                              <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                              <span>{session.topicName}</span>
                            </div>
                          )}
                          {session.questionGroupName && (
                            <div className="flex items-center mb-2">
                              <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                              <span>{session.questionGroupName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => viewSessionDetails(session.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all duration-300 transform hover:translate-x-1"
                        >
                          View Details
                        </Button>
                      </div>
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
