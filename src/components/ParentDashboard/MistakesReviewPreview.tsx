"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FaExclamationTriangle,
  FaEye,
  FaArrowRight,
  FaCheckCircle,
  FaBook,
  FaUser,
  FaGraduationCap,
} from "react-icons/fa";

interface WrongAnswer {
  id?: string;
  studentAnswerId?: string;
  submittedAnswer: any;
  isCorrect?: boolean;
  attemptedAt?: string;
  question: {
    id: number;
    text: string;
    questionType: string;
    correctAnswer: any;
    options?: Array<{
      id: string;
      text: string;
    }>;
    explanation?: string;
    hint?: string;
    topic?: {
      name: string;
    };
    subject?: {
      id: string;
      name: string;
    };
  };
  student: {
    id: string;
    name: string;
  };
  practiceSession: {
    title: string;
    subject?: {
      name: string;
    };
  };
  createdAt: string;
}

interface MistakesReviewPreviewProps {
  limit?: number;
}

const MistakesReviewPreview: React.FC<MistakesReviewPreviewProps> = ({
  limit = 5,
}) => {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWrongAnswers = async () => {
      try {
        const response = await fetch("/api/parent/review/wrong-answers");
        if (response.ok) {
          const data = await response.json();
          // The API returns a direct array, not wrapped in wrongAnswers
          const sortedAnswers = Array.isArray(data)
            ? data
                .sort(
                  (a: any, b: any) =>
                    new Date(b.attemptedAt).getTime() -
                    new Date(a.attemptedAt).getTime()
                )
                .slice(0, limit)
                .map((item: any) => ({
                  ...item,
                  createdAt: item.attemptedAt, // Map attemptedAt to createdAt for consistency
                  practiceSession: {
                    ...item.practiceSession,
                    subject: item.question.subject,
                  },
                }))
            : [];
          setWrongAnswers(sortedAnswers);
        }
      } catch (error) {
        console.error("Error fetching wrong answers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWrongAnswers();
  }, [limit]);

  const getSubjectColor = (subject?: string) => {
    if (!subject) return "bg-gray-100 text-gray-600";

    const colors: { [key: string]: string } = {
      Chinese: "bg-red-100 text-red-600",
      Mathematics: "bg-blue-100 text-blue-600",
      Science: "bg-green-100 text-green-600",
      English: "bg-purple-100 text-purple-600",
      History: "bg-amber-100 text-amber-600",
      Geography: "bg-teal-100 text-teal-600",
    };

    return colors[subject] || "bg-gray-100 text-gray-600";
  };

  const getDifficultyIcon = (questionType: string) => {
    switch (questionType) {
      case "MULTIPLE_CHOICE":
        return "🔤";
      case "SHORT_ANSWER":
        return "✏️";
      case "MULTI_PART":
        return "🧩";
      case "CLOZE":
        return "📝";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FaExclamationTriangle className="mr-2 text-amber-600" />
              Recent Mistakes to Review
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
            <FaExclamationTriangle className="mr-2 text-amber-600" />
            Recent Mistakes to Review
          </CardTitle>
          <Link href="/parent/review">
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600 hover:bg-amber-50"
            >
              Review All
              <FaArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {wrongAnswers.length === 0 ? (
          <div className="text-center py-8">
            <FaCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-green-600 text-lg font-medium">All Clear!</p>
            <p className="text-gray-400 text-sm">
              No recent mistakes to review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {wrongAnswers.map((item, index) => (
              <div
                key={item.studentAnswerId || item.id || index}
                className="group border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">
                        {getDifficultyIcon(item.question.questionType)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FaUser className="w-3 h-3 text-gray-400" />
                          <span className="font-semibold text-gray-900 text-sm">
                            {item.student.name}
                          </span>
                          {(item.practiceSession.subject ||
                            item.question.subject) && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getSubjectColor(
                                item.practiceSession.subject?.name ||
                                  item.question.subject?.name
                              )}`}
                            >
                              {item.practiceSession.subject?.name ||
                                item.question.subject?.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {item.question.text.length > 80
                            ? `${item.question.text.substring(0, 80)}...`
                            : item.question.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{item.question.topic?.name || "General"}</span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <FaGraduationCap className="mr-1" />
                        {item.practiceSession.title || "Practice Session"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Link href="/parent/review">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaEye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {wrongAnswers.length >= limit && (
              <div className="pt-4 border-t border-gray-200">
                <Link href="/parent/review">
                  <Button
                    variant="outline"
                    className="w-full text-amber-600 hover:bg-amber-50"
                  >
                    Review All Mistakes
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

export default MistakesReviewPreview;
