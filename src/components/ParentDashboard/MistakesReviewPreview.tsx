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
  FaChevronDown,
  FaChevronRight,
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
      Mathematics: "bg-purple-100 text-purple-800",
      Science: "bg-green-100 text-green-600",
      English: "bg-purple-100 text-purple-800",
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

  // Group mistakes by child
  const groupedMistakes = wrongAnswers.reduce((groups, mistake) => {
    const childId = mistake.student.id;
    if (!groups[childId]) {
      groups[childId] = {
        child: mistake.student,
        mistakes: [],
      };
    }
    groups[childId].mistakes.push(mistake);
    return groups;
  }, {} as Record<string, { child: any; mistakes: WrongAnswer[] }>);

  // Group mistakes by subject within each child
  const getSubjectGroups = (mistakes: WrongAnswer[]) => {
    return mistakes.reduce((groups, mistake) => {
      const subjectName = mistake.practiceSession.subject?.name || 
                         mistake.question.subject?.name || 
                         "Unknown";
      if (!groups[subjectName]) {
        groups[subjectName] = [];
      }
      groups[subjectName].push(mistake);
      return groups;
    }, {} as Record<string, WrongAnswer[]>);
  };

  const toggleGroup = (childId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(childId)) {
      newExpanded.delete(childId);
    } else {
      newExpanded.add(childId);
    }
    setExpandedGroups(newExpanded);
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
            <FaExclamationTriangle className="mr-2 text-purple-800" />
            Recent Mistakes to Review
          </CardTitle>
          <Link href="/parent/review">
            <Button
              variant="outline"
              size="sm"
              className="text-purple-800 hover:bg-purple-100"
            >
              View All Mistakes
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
          <div className="space-y-3">
            {Object.entries(groupedMistakes).map(([childId, { child, mistakes }]) => {
              const subjectGroups = getSubjectGroups(mistakes);
              const isExpanded = expandedGroups.has(childId);
              
              return (
                <div
                  key={childId}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Child Header - Always Visible */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroup(childId)}
                  >
                    <div className="flex items-center gap-3">
                      <FaUser className="w-4 h-4 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {child.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} to review
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {Object.keys(subjectGroups).length} subject{Object.keys(subjectGroups).length !== 1 ? 's' : ''}
                      </span>
                      {isExpanded ? (
                        <FaChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <FaChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {Object.entries(subjectGroups).map(([subjectName, subjectMistakes]) => (
                        <div key={subjectName} className="p-4 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getSubjectColor(subjectName)}`}
                              >
                                {subjectName}
                              </span>
                              <span className="text-sm text-gray-600">
                                {subjectMistakes.length} mistake{subjectMistakes.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <Link href="/parent/review">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:bg-amber-50"
                              >
                                <FaEye className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                            </Link>
                          </div>
                          
                          {/* Sample mistake preview */}
                          {subjectMistakes.slice(0, 1).map((mistake, index) => (
                            <div key={index} className="bg-white rounded border border-gray-100 p-3">
                              <div className="flex items-start gap-2">
                                <span className="text-sm mt-0.5">
                                  {getDifficultyIcon(mistake.question.questionType)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    {mistake.question.text.length > 100
                                      ? `${mistake.question.text.substring(0, 100)}...`
                                      : mistake.question.text}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span>{mistake.question.topic?.name || "General"}</span>
                                    <span>
                                      {new Date(mistake.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {subjectMistakes.length > 1 && (
                            <p className="text-xs text-gray-500 mt-2">
                              +{subjectMistakes.length - 1} more mistake{subjectMistakes.length - 1 !== 1 ? 's' : ''} in {subjectName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

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
