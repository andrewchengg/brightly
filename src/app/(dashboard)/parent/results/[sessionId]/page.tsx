"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaTrophy,
  FaCheckCircle,
  FaTimesCircle,
  FaLightbulb,
} from "react-icons/fa";

interface SessionDetails {
  id: string;
  title?: string | null;
  type: string;
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
  answers: Array<{
    id: string;
    submittedAnswer: any;
    isCorrect: boolean | null;
    pointsEarned: number;
    question: {
      id: number;
      text: string;
      questionType: string;
      options: any;
      correctAnswer: any;
      explanation?: string | null;
      hint?: string | null;
      imageUrl?: string | null;
      difficulty: string;
      topic: { name: string };
      subject: { name: string };
    };
  }>;
}

export default function ParentSessionDetailsPage() {
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const fetchSessionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/parent/results/${sessionId}`);
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch session details" }));
        throw new Error(
          errData.error?.message || "Failed to fetch session details"
        );
      }
      const data: SessionDetails = await response.json();
      setSessionDetails(data);
    } catch (err: any) {
      console.error("Error fetching session details:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600 font-medium">
          Loading Session Details...
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
              Error Loading Session
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={fetchSessionDetails} className="w-full">
                <FaSyncAlt className="mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => router.push("/parent/results")}
                variant="outline"
                className="w-full"
              >
                <FaArrowLeft className="mr-2" />
                Back to Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Session not found.</p>
            <Button
              onClick={() => router.push("/parent/results")}
              className="mt-4"
            >
              <FaArrowLeft className="mr-2" />
              Back to Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const correctCount = sessionDetails.answers.filter(
    (answer) => answer.isCorrect
  ).length;
  const incorrectCount = sessionDetails.answers.filter(
    (answer) => !answer.isCorrect
  ).length;
  const scorePercentage = sessionDetails.totalQuestions
    ? Math.round((correctCount / sessionDetails.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/parent/results")}
            variant="ghost"
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="mr-2" />
            Back to Results
          </Button>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <FaUser className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {sessionDetails.title ||
                    `${
                      sessionDetails.subjectName ||
                      sessionDetails.topicName ||
                      "Practice"
                    } Session`}
                </h1>
                <p className="text-white/90 mt-1">
                  {sessionDetails.student.name} •{" "}
                  {sessionDetails.endTime
                    ? new Date(sessionDetails.endTime).toLocaleDateString()
                    : "In Progress"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaBook className="text-blue-600 text-xl" />
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {sessionDetails.totalQuestions || 0}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {correctCount}
              </div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaTrophy className="text-amber-600 text-xl" />
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {sessionDetails.score || 0}
              </div>
              <div className="text-sm text-gray-600">Total Score</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FaClock className="text-purple-600 text-xl" />
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {formatDuration(sessionDetails.durationSeconds)}
              </div>
              <div className="text-sm text-gray-600">Duration</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium">Overall Score</span>
              <span
                className={`text-2xl font-bold ${
                  scorePercentage >= 80
                    ? "text-green-600"
                    : scorePercentage >= 60
                    ? "text-blue-600"
                    : scorePercentage >= 40
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {scorePercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full ${
                  scorePercentage >= 80
                    ? "bg-green-500"
                    : scorePercentage >= 60
                    ? "bg-blue-500"
                    : scorePercentage >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${scorePercentage}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Correct:</span>
                <span className="font-medium text-green-600">
                  {correctCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Incorrect:</span>
                <span className="font-medium text-red-600">
                  {incorrectCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question-by-Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sessionDetails.answers.map((answer, index) => (
                <div
                  key={answer.id}
                  className={`p-4 rounded-lg border-2 ${
                    answer.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">
                        Q{index + 1}
                      </span>
                      <div
                        className={`p-2 rounded-full ${
                          answer.isCorrect
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {answer.isCorrect ? (
                          <FaCheckCircle className="text-sm" />
                        ) : (
                          <FaTimesCircle className="text-sm" />
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {answer.question.subject.name} •{" "}
                        {answer.question.topic.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {answer.pointsEarned} pts
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {answer.question.difficulty}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-gray-800 leading-relaxed">
                      {answer.question.text}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div
                      className={`p-3 rounded-lg ${
                        answer.isCorrect
                          ? "bg-green-100 border border-green-200"
                          : "bg-red-100 border border-red-200"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        Student's Answer
                      </div>
                      <div className="text-sm">
                        {answer.submittedAnswer !== null &&
                        answer.submittedAnswer !== undefined
                          ? String(answer.submittedAnswer)
                          : "Not answered"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100 border border-blue-200">
                      <div className="text-sm font-medium mb-1">
                        Correct Answer
                      </div>
                      <div className="text-sm">
                        {answer.question.correctAnswer !== null &&
                        answer.question.correctAnswer !== undefined
                          ? String(answer.question.correctAnswer)
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {answer.question.explanation && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <FaLightbulb className="text-blue-600" />
                        Explanation
                      </div>
                      <div className="text-sm text-gray-700">
                        {answer.question.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
