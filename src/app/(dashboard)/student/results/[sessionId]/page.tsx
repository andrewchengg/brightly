// src/app/(dashboard)/student/results/[sessionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PracticeSessionType as PrismaPracticeSessionType,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";
import { toast } from "react-toastify";
import Image from "next/image";
import ExplanationFormatter from "@/components/ExplanationFormatter";

const MOCK_EXAM_PAPER_CONFIG = {
  mathematics: {
    paper1: { totalMarks: 45, expectedQuestionCount: 30 },
    paper2: { totalMarks: 55, expectedQuestionCount: 17 }, // 5 SA (2m) + 12 LA (avg 3.75) = 10 + 45 = 55
    both: { totalMarks: 100, expectedQuestionCount: 47 },
  },
  // Add other subjects if they have mock exams
};

interface OptionClient {
  id: string;
  text: string;
}

interface QuestionForReview {
  id: number;
  text: string;
  questionType: keyof typeof PrismaQuestionType;
  options: OptionClient[];
  correctAnswer: any;
  explanation?: string | null;
  marks?: number;
  pointsAwarded?: number;
  topicName?: string;
  imageUrl?: string | null;
  hint?: string | null;
}

interface StudentAnswerForReview {
  id: string;
  submittedAnswer: any;
  isCorrect: boolean | null;
  pointsEarned: number;
  question: QuestionForReview;
}

interface SessionDetails {
  id: string;
  title?: string | null;
  type: keyof typeof PrismaPracticeSessionType;
  endTime?: string | null;
  totalMarksEarned?: number | null;
  totalPossibleMarks?: number | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  xpEarned: number;
  subjectName?: string | null;
  topicName?: string | null;
  questionGroupName?: string | null;
  studentAnswers: StudentAnswerForReview[];
}

export default function SessionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/student/practice-sessions/${sessionId}`
        );
        if (!response.ok) {
          const errData = await response
            .json()
            .catch(() => ({ error: "Failed to fetch session details" }));
          throw new Error(
            errData.error?.message ||
              errData.error ||
              "Failed to fetch session details"
          );
        }
        const data: SessionDetails = await response.json();

        let calculatedTotalPossibleMarksFromAnswers = 0;
        if (data.studentAnswers && data.studentAnswers.length > 0) {
          data.studentAnswers.forEach((sa) => {
            if (sa.question && typeof sa.question.marks === "number") {
              calculatedTotalPossibleMarksFromAnswers += sa.question.marks;
            } else {
              // If marks is not available, use pointsAwarded as fallback
              calculatedTotalPossibleMarksFromAnswers +=
                sa.question?.pointsAwarded || 0;
              console.warn(
                `SessionReviewPage: Question ID ${sa.question?.id} is missing marks field. Using pointsAwarded (${sa.question?.pointsAwarded}) as fallback.`
              );
            }
          });
        }
        console.log(
          "SessionReviewPage: Calculated totalPossibleMarks from studentAnswers:",
          calculatedTotalPossibleMarksFromAnswers
        );

        setSessionDetails({
          ...data,
          totalPossibleMarksCalculated: calculatedTotalPossibleMarksFromAnswers,
        });
      } catch (err: any) {
        console.error("Error fetching session details:", err);
        setError(err.message || "Failed to load session review.");
        toast.error(err.message || "Failed to load session review.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  const getOptionText = (
    options: OptionClient[],
    optionId: string | number
  ): string => {
    const opt = options.find(
      (o) => String(o.id).toLowerCase() === String(optionId).toLowerCase()
    );
    return opt?.text || String(optionId);
  };

  const renderAnswer = (
    questionType: keyof typeof PrismaQuestionType,
    answer: any,
    options?: OptionClient[]
  ) => {
    if (answer === null || answer === undefined)
      return <span className="italic text-gray-500">Not answered</span>;
    switch (questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return options
          ? getOptionText(options, String(answer))
          : String(answer);
      case PrismaQuestionType.MULTI_PART:
        if (typeof answer === "object" && answer !== null) {
          return (
            <ul className="list-disc list-inside pl-4 text-sm">
              {" "}
              {Object.entries(answer).map(([part, ans]) => (
                <li key={part}>
                  <strong>Part {part}:</strong> {String(ans)}
                </li>
              ))}{" "}
            </ul>
          );
        }
        if (typeof answer === "string") {
          try {
            const parsed = JSON.parse(answer);
            if (typeof parsed === "object" && parsed !== null) {
              return (
                <ul className="list-disc list-inside pl-4 text-sm">
                  {" "}
                  {Object.entries(parsed).map(([part, ans]) => (
                    <li key={part}>
                      <strong>Part {part}:</strong> {String(ans)}
                    </li>
                  ))}{" "}
                </ul>
              );
            }
          } catch (e) {
            /* Fall through */
          }
        }
        return String(answer);
      default:
        return String(answer);
    }
  };

  const renderCorrectAnswerForDisplay = (
    question: QuestionForReview
  ): string | JSX.Element => {
    if (question.correctAnswer === null || question.correctAnswer === undefined)
      return "N/A";
    switch (question.questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        if (
          typeof question.correctAnswer === "object" &&
          !Array.isArray(question.correctAnswer) &&
          (question.correctAnswer as any).id &&
          (question.correctAnswer as any).text
        ) {
          return `${(question.correctAnswer as any).id}. ${
            (question.correctAnswer as any).text
          }`;
        }
        const correctAnswerId = String(question.correctAnswer);
        const correctOption = question.options.find(
          (opt) =>
            String(opt.id).toLowerCase() === correctAnswerId.toLowerCase()
        );
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
              {" "}
              {Object.entries(question.correctAnswer).map(([part, ans]) => (
                <li key={part}>
                  <strong>Part {part}:</strong> {String(ans)}
                </li>
              ))}{" "}
            </ul>
          );
        }
        return JSON.stringify(question.correctAnswer);
      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        if (Array.isArray(question.correctAnswer))
          return question.correctAnswer.join(" or ");
        return String(question.correctAnswer);
      default:
        return String(question.correctAnswer);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Session Review...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
        {" "}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-md">
          {" "}
          <h3 className="text-sm font-medium text-red-800">
            Error Loading Review
          </h3>{" "}
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>{" "}
        </div>{" "}
        <Button
          onClick={() => router.push("/student/results")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {" "}
          Back to Results{" "}
        </Button>{" "}
      </div>
    );
  }
  if (!sessionDetails) {
    return (
      <div className="p-6 text-center text-gray-500">
        Session details not found.
      </div>
    );
  }

  let displayDenominatorMarks: number | string = "N/A";
  let scorePercentage: number | null = null;

  const totalPossibleMarksFromAnswers =
    sessionDetails.totalPossibleMarksCalculated;

  if (sessionDetails) {
    if (
      sessionDetails.type === PrismaPracticeSessionType.MOCK_EXAM &&
      sessionDetails.subjectName?.toLowerCase() === "mathematics"
    ) {
      const subjectMath = MOCK_EXAM_PAPER_CONFIG.mathematics;
      if (sessionDetails.title?.toLowerCase().includes("paper 1")) {
        displayDenominatorMarks = subjectMath.paper1.totalMarks;
      } else if (sessionDetails.title?.toLowerCase().includes("paper 2")) {
        displayDenominatorMarks = subjectMath.paper2.totalMarks;
      } else if (
        sessionDetails.title?.toLowerCase().includes("full mock exam")
      ) {
        displayDenominatorMarks = subjectMath.both.totalMarks;
      } else if (
        sessionDetails.totalPossibleMarks &&
        sessionDetails.totalPossibleMarks > 0
      ) {
        displayDenominatorMarks = sessionDetails.totalPossibleMarks;
      } else if (
        sessionDetails.totalPossibleMarksCalculated !== undefined &&
        sessionDetails.totalPossibleMarksCalculated > 0
      ) {
        displayDenominatorMarks = sessionDetails.totalPossibleMarksCalculated;
      } else if (
        sessionDetails.totalQuestions &&
        sessionDetails.totalQuestions > 0
      ) {
        // Fallback for mock exam if title doesn't help and no student answers to sum marks
        // Infer based on expected question count if possible
        if (
          sessionDetails.totalQuestions ===
          subjectMath.paper1.expectedQuestionCount
        )
          displayDenominatorMarks = subjectMath.paper1.totalMarks;
        else if (
          sessionDetails.totalQuestions ===
          subjectMath.paper2.expectedQuestionCount
        )
          displayDenominatorMarks = subjectMath.paper2.totalMarks;
        else if (
          sessionDetails.totalQuestions ===
          subjectMath.both.expectedQuestionCount
        )
          displayDenominatorMarks = subjectMath.both.totalMarks;
        else {
          displayDenominatorMarks = sessionDetails.totalQuestions * 2; // Very rough estimate
          console.warn(
            "SessionReviewPage: Estimating total possible marks for MOCK_EXAM. This may be inaccurate."
          );
        }
      }
    } else if (
      sessionDetails.totalPossibleMarks &&
      sessionDetails.totalPossibleMarks > 0
    ) {
      displayDenominatorMarks = sessionDetails.totalPossibleMarks;
    } else if (
      sessionDetails.totalPossibleMarksCalculated !== undefined &&
      sessionDetails.totalPossibleMarksCalculated > 0
    ) {
      displayDenominatorMarks = sessionDetails.totalPossibleMarksCalculated;
    } else if (
      sessionDetails.totalQuestions &&
      sessionDetails.totalQuestions > 0
    ) {
      displayDenominatorMarks = sessionDetails.totalQuestions;
    }

    if (
      typeof displayDenominatorMarks === "number" &&
      displayDenominatorMarks > 0 &&
      sessionDetails.totalMarksEarned !== null &&
      sessionDetails.totalMarksEarned !== undefined
    ) {
      scorePercentage = Math.round(
        (sessionDetails.totalMarksEarned / displayDenominatorMarks) * 100
      );
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button
        onClick={() => router.push("/student/results")}
        variant="outline"
        className="mb-6"
      >
        ← Back to All Results
      </Button>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            {sessionDetails.title ||
              `${sessionDetails.type.replace(/_/g, " ")} Review`}
          </CardTitle>
          <CardDescription>
            Completed on:{" "}
            {sessionDetails.endTime
              ? new Date(sessionDetails.endTime).toLocaleString()
              : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase">Score (Marks)</p>
            <p className="text-2xl font-bold text-indigo-600">
              {sessionDetails.totalMarksEarned ?? 0} / {displayDenominatorMarks}
              {scorePercentage !== null && ` (${scorePercentage}%)`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">
              Correct (Questions)
            </p>
            <p className="text-2xl font-bold text-green-600">
              {sessionDetails.correctAnswers ?? 0} /{" "}
              {sessionDetails.totalQuestions ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">XP Earned</p>
            <p className="text-2xl font-bold text-amber-500">
              {sessionDetails.xpEarned ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Type</p>
            <p className="text-sm font-medium text-gray-700 capitalize pt-1.5">
              {sessionDetails.type?.replace(/_/g, " ").toLowerCase() ||
                "Practice"}
            </p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">
        Questions Review
      </h2>
      <div className="space-y-6">
        {sessionDetails.studentAnswers.map((sa, index) => (
          <Card
            key={sa.id}
            className={`overflow-hidden ${
              sa.isCorrect ? "border-green-300" : "border-red-300"
            }`}
          >
            <CardHeader
              className={`p-4 ${sa.isCorrect ? "bg-green-50" : "bg-red-50"}`}
            >
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Question {index + 1} ({sa.question.marks}{" "}
                  {sa.question.marks === 1 ? "mark" : "marks"})
                </CardTitle>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    sa.isCorrect
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {sa.isCorrect ? "Correct" : "Incorrect"} (+{sa.pointsEarned}{" "}
                  XP)
                </span>
              </div>
              <CardDescription className="text-sm pt-1 text-gray-600">
                Topic: {sa.question.topicName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-gray-800 whitespace-pre-wrap">
                {sa.question.text}
              </p>
              {sa.question.imageUrl && (
                <div className="my-2 flex justify-center">
                  <Image
                    src={sa.question.imageUrl}
                    alt="Question visual aid"
                    width={300}
                    height={200}
                    className="max-w-xs max-h-64 rounded-md border object-contain"
                  />
                </div>
              )}

              {sa.question.questionType ===
                PrismaQuestionType.MULTIPLE_CHOICE &&
                sa.question.options.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">
                      Options:
                    </p>
                    {sa.question.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`pl-4 py-1 text-sm rounded 
                        ${
                          String(sa.submittedAnswer).toLowerCase() ===
                          String(opt.id).toLowerCase()
                            ? sa.isCorrect
                              ? "bg-green-100 font-semibold"
                              : "bg-red-100 font-semibold"
                            : ""
                        }
                        ${
                          String(renderCorrectAnswerForDisplay(sa.question))
                            .toLowerCase()
                            .includes(` ${String(opt.id).toLowerCase()}. `) &&
                          !sa.isCorrect
                            ? "border border-green-500 bg-green-50"
                            : ""
                        }
                        ${
                          String(
                            renderCorrectAnswerForDisplay(sa.question)
                          ).toLowerCase() === String(opt.id).toLowerCase() &&
                          !sa.isCorrect
                            ? "border border-green-500 bg-green-50"
                            : ""
                        } 
                      `}
                      >
                        <strong>{opt.id}.</strong> {opt.text}
                        {String(sa.submittedAnswer).toLowerCase() ===
                          String(opt.id).toLowerCase() && (
                          <span className="text-xs font-semibold ml-2">
                            {" "}
                            (Your Answer)
                          </span>
                        )}
                        {String(sa.question.correctAnswer).toLowerCase() ===
                          String(opt.id).toLowerCase() && (
                          <span className="text-xs font-semibold ml-2 text-green-700">
                            {" "}
                            (Correct)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              <div>
                <p className="text-base font-bold text-gray-800 mb-2">
                  Your Answer:
                </p>
                <div
                  className={`p-2 rounded ${
                    sa.isCorrect
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {renderAnswer(
                    sa.question.questionType,
                    sa.submittedAnswer,
                    sa.question.options
                  )}
                </div>
              </div>

              {!sa.isCorrect && (
                <div>
                  <p className="text-base font-bold text-gray-800 mb-2">
                    Correct Answer:
                  </p>
                  <div className="p-2 rounded bg-green-50 text-green-700">
                    {renderCorrectAnswerForDisplay(sa.question)}
                  </div>
                </div>
              )}

              {sa.question.explanation && (
                <div>
                  <p className="text-base font-bold text-gray-800 mb-2">
                    Explanation:
                  </p>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <ExplanationFormatter
                      explanation={sa.question.explanation}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
