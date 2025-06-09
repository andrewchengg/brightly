"use client";

import { useState, useEffect } from "react";
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
  FaLightbulb,
  FaBook,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaEye,
  FaCalculator,
  FaFlask,
  FaGlobe,
  FaLanguage,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaGraduationCap,
  FaUser,
  FaChartLine,
  FaUsers,
  FaTrophy,
} from "react-icons/fa";
import {
  QuestionType as PrismaQuestionType,
  PracticeSessionType as PrismaPracticeSessionType,
  DifficultyLevel as PrismaDifficultyLevel,
} from "@/generated/prisma";
import Image from "next/image";

interface OptionClient {
  id: string;
  text: string;
}

interface QuestionForDisplay {
  id: number;
  text: string;
  questionType: keyof typeof PrismaQuestionType;
  options: OptionClient[];
  correctAnswer: any;
  explanation?: string | null;
  hint?: string | null;
  imageUrl?: string | null;
  difficulty: keyof typeof PrismaDifficultyLevel;
  topic: { name: string; id: number };
  subject: { name: string; id: number };
  questionGroup?: { name: string; id: number } | null;
}

interface WrongAnswerReviewItem {
  studentAnswerId: string;
  submittedAnswer: any;
  attemptedAt: Date;
  question: QuestionForDisplay;
  practiceSession: {
    id: string;
    title?: string | null;
    type: keyof typeof PrismaPracticeSessionType;
  };
  student: {
    id: string;
    name: string;
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

// Subject configuration with icons and colors
const subjectConfig = {
  Math: {
    icon: FaCalculator,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  Science: {
    icon: FaFlask,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  English: {
    icon: FaGlobe,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  Chinese: {
    icon: FaLanguage,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
};

export default function ParentReviewPage() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerReviewItem[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<
    WrongAnswerReviewItem[]
  >([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

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

  const fetchWrongAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/parent/review/wrong-answers");
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch review data" }));
        throw new Error(
          errData.error?.message || "Failed to fetch review data"
        );
      }
      const data: WrongAnswerReviewItem[] = await response.json();
      setWrongAnswers(data);
    } catch (err: any) {
      console.error("Error fetching wrong answers:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    fetchWrongAnswers();
  }, []);

  useEffect(() => {
    let filtered = wrongAnswers;

    if (selectedChild) {
      filtered = filtered.filter((item) => item.student.id === selectedChild);
    }

    if (selectedSubject) {
      filtered = filtered.filter(
        (item) => item.question.subject.name === selectedSubject
      );
    }

    setFilteredAnswers(filtered);
  }, [selectedChild, selectedSubject, wrongAnswers]);

  const uniqueSubjects = [
    ...new Set(wrongAnswers.map((item) => item.question.subject.name)),
  ];

  const getChildStats = (childId?: string) => {
    const childQuestions = childId
      ? wrongAnswers.filter((item) => item.student.id === childId)
      : wrongAnswers;

    return {
      total: childQuestions.length,
      topics: [
        ...new Set(childQuestions.map((item) => item.question.topic.name)),
      ].length,
    };
  };

  const getOptionText = (
    options: OptionClient[],
    optionId: string | number
  ): string => {
    if (!Array.isArray(options)) {
      return String(optionId);
    }
    const opt = options.find(
      (o) => String(o.id).toLowerCase() === String(optionId).toLowerCase()
    );
    return opt?.text || String(optionId);
  };

  const renderSubmittedAnswer = (item: WrongAnswerReviewItem) => {
    if (item.submittedAnswer === null || item.submittedAnswer === undefined)
      return <span className="italic text-gray-500">Not answered</span>;

    const qType = item.question.questionType;
    switch (qType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return Array.isArray(item.question.options)
          ? getOptionText(item.question.options, String(item.submittedAnswer))
          : String(item.submittedAnswer);
      case PrismaQuestionType.MULTI_PART:
        if (
          typeof item.submittedAnswer === "object" &&
          item.submittedAnswer !== null
        ) {
          return (
            <ul className="list-disc list-inside pl-4 text-sm">
              {Object.entries(item.submittedAnswer).map(([part, ans]) => (
                <li key={part}>
                  <strong>{part}:</strong> {String(ans)}
                </li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(item.submittedAnswer);
      default:
        return String(item.submittedAnswer);
    }
  };

  const renderCorrectAnswer = (question: QuestionForDisplay) => {
    if (question.correctAnswer === null || question.correctAnswer === undefined)
      return (
        <span className="italic text-gray-500">No correct answer set</span>
      );

    switch (question.questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        const correctAnswerId = String(question.correctAnswer);
        const correctOption = Array.isArray(question.options)
          ? question.options.find(
              (opt) =>
                String(opt.id).toLowerCase() === correctAnswerId.toLowerCase()
            )
          : null;
        return correctOption
          ? `${correctOption.id}. ${correctOption.text}`
          : correctAnswerId;

      case PrismaQuestionType.MULTI_PART:
        if (
          typeof question.correctAnswer === "object" &&
          question.correctAnswer !== null &&
          !Array.isArray(question.correctAnswer)
        ) {
          return (
            <ul className="list-disc list-inside pl-4 text-sm">
              {Object.entries(question.correctAnswer).map(([part, ans]) => (
                <li key={part}>
                  <strong>{part}:</strong> {String(ans)}
                </li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(question.correctAnswer);

      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        return Array.isArray(question.correctAnswer)
          ? question.correctAnswer.join(" or ")
          : String(question.correctAnswer);

      default:
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.join(" or ");
        }
        return String(question.correctAnswer);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-6xl text-indigo-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600 font-medium">
            Loading Children's Review...
          </p>
        </div>
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
              Error Loading Review
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchWrongAnswers} className="w-full">
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl mb-6 shadow-xl">
              <FaLightbulb className="text-3xl text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Children's Learning Review
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select a child to review their mistakes and help them improve
              their learning.
            </p>
          </div>

          {/* Child Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.isArray(children) &&
              children.map((child) => {
                const childStats = getChildStats(child.id);
                const subjectConfig_child = subjectConfig["Math"] || {
                  icon: FaUser,
                  color: "from-gray-500 to-gray-600",
                  bgColor: "bg-gray-50",
                  textColor: "text-gray-700",
                };
                const IconComponent = subjectConfig_child.icon;

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
                          <FaTimesCircle className="text-red-500" />
                          <span>{childStats.total} mistakes to review</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <FaBook className="text-blue-500" />
                          <span>{childStats.topics} topics</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <FaTrophy className="text-amber-500" />
                          <span>Level {child.level}</span>
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
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center mb-3">
                    <FaTimesCircle className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {wrongAnswers.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Mistakes</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mb-3">
                    <FaBook className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {uniqueSubjects.length}
                  </div>
                  <div className="text-sm text-gray-600">Subjects</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center mb-3">
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

  // Show child review screen
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

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <FaUser className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {selectedChildData?.name}'s Review
                </h1>
                <p className="text-white/90 mt-1">
                  {filteredAnswers.length} mistakes to review and learn from
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Filter
                </label>
                <select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All Subjects</option>
                  {uniqueSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                Showing {filteredAnswers.length} of{" "}
                {
                  wrongAnswers.filter(
                    (item) => item.student.id === selectedChild
                  ).length
                }{" "}
                mistakes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Items */}
        {filteredAnswers.length === 0 ? (
          <Card className="text-center py-16 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent>
              <FaCheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {selectedSubject
                  ? `No ${selectedSubject} mistakes found!`
                  : "Perfect Score!"}
              </h3>
              <p className="text-gray-600 text-lg">
                {selectedSubject
                  ? `${selectedChildData?.name} hasn't made any mistakes in ${selectedSubject}.`
                  : `${selectedChildData?.name} is doing great! No mistakes to review.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredAnswers.map((item) => (
              <Card
                key={item.studentAnswerId}
                className="overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-red-700 font-semibold">
                        {item.question.topic.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FaBook className="text-xs" />
                          {item.practiceSession.title ||
                            item.practiceSession.type.replace(/_/g, " ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock className="text-xs" />
                          {new Date(item.attemptedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaUser className="text-xs" />
                          {item.student.name}
                        </span>
                      </CardDescription>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.question.difficulty === PrismaDifficultyLevel.EASY
                          ? "bg-green-100 text-green-700"
                          : item.question.difficulty ===
                            PrismaDifficultyLevel.MEDIUM
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.question.difficulty.toLowerCase()}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Question */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Question:
                    </h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {item.question.text}
                    </p>
                    {item.question.imageUrl &&
                      (item.question.imageUrl.startsWith("http://") ||
                        item.question.imageUrl.startsWith("https://")) && (
                        <div className="mt-4 flex justify-center">
                          <Image
                            src={item.question.imageUrl}
                            alt="Question visual"
                            width={400}
                            height={300}
                            className="max-w-md max-h-64 rounded-lg border object-contain shadow-md"
                          />
                        </div>
                      )}
                  </div>

                  {/* Answers Comparison */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-semibold text-red-800 mb-2 flex items-center">
                        <FaTimesCircle className="mr-2" />
                        Child's Answer
                      </h5>
                      <div className="text-red-700">
                        {renderSubmittedAnswer(item)}
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                        <FaCheckCircle className="mr-2" />
                        Correct Answer
                      </h5>
                      <div className="text-green-700">
                        {renderCorrectAnswer(item.question)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  {item.question.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <FaLightbulb className="mr-2" />
                        Explanation
                      </h5>
                      <p className="text-blue-700 leading-relaxed">
                        {item.question.explanation}
                      </p>
                    </div>
                  )}

                  {/* Hint */}
                  {item.question.hint && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h5 className="font-semibold text-amber-800 mb-2">
                        💡 Hint for next time:
                      </h5>
                      <p className="text-amber-700 leading-relaxed">
                        {item.question.hint}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
