// src/app/(dashboard)/student/practice/random/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-manager";
import {
  PracticeSessionStatus,
  PracticeSessionType,
  QuestionType as PrismaQuestionType,
} from "@/generated/prisma";
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
import ExplanationFormatter from "@/components/ExplanationFormatter";
import { soundEffects } from "@/lib/soundEffects";
import QuestionTextFormatter from "@/components/QuestionTextFormatter";
import {
  AIAssistant,
  createSessionContext,
  createQuestionContext,
} from "@/components/AILearningAssistant";
import { InteractiveLoadingAnimation } from "@/components/ui/InteractiveLoadingAnimation";
import { PracticeCompletionLoader } from "@/components/ui/PracticeCompletionLoader";
import ConfettiComponent from "@/components/Confetti";
import ExitPracticeDialog from "@/components/ExitPracticeDialog";
import { triggerQuestRefresh } from "@/lib/quest-refresh";
import WhiteboardModal from "@/components/ui/WhiteboardModal";
import WhiteboardButton from "@/components/ui/WhiteboardButton";
import {
  FaLightbulb,
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
  FaCheck,
  FaTimes,
  FaCommentDots,
  FaPaperPlane,
  FaTrophy,
  FaMedal,
  FaChartBar,
  FaArrowRight,
  FaRocket,
  FaFlag,
} from "react-icons/fa";

// Interfaces
interface OptionClient {
  id: string;
  text: string;
}

interface QuestionClient {
  id: number;
  text: string;
  question?: string;
  options: OptionClient[];
  correctAnswer: string | string[] | Record<string, string> | null;
  hint?: string;
  explanation?: string | null;
  topic: {
    id: number;
    name: string;
    subjectId?: number;
  };
  difficulty?: string;
  pointsAwarded?: number;
  marks?: number;
  questionType?: keyof typeof PrismaQuestionType;
  imageUrl?: string;
  topicName?: string;
}

interface StudentAnswerData {
  questionId: number;
  submittedAnswer: string | Record<string, string>;
  isCorrect: boolean;
  pointsEarned: number;
}

interface SessionData {
  id: string;
  studentId: string;
  status: PracticeSessionStatus;
  subjectId: number | null;
  topicId: number | null;
  score: number | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  studentAnswers: StudentAnswerData[];
}

const QUESTION_REPORT_TYPES = [
  { value: "INCORRECT_ANSWER", label: "Incorrect Answer" },
  { value: "WRONG_EXPLANATION", label: "Wrong Explanation" },
  { value: "POOR_FORMATTING", label: "Poor Formatting" },
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate Content" },
  { value: "OTHER", label: "Other" },
];

function ReportQuestionModal({
  open,
  onClose,
  questionId,
  studentId,
}: {
  open: boolean;
  onClose: () => void;
  questionId: number | undefined;
  studentId: string | null;
}) {
  const [reportType, setReportType] = useState(QUESTION_REPORT_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId || !studentId) {
      setError("Missing question or user info.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/questions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          studentId,
          reportType,
          description,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setReportType(QUESTION_REPORT_TYPES[0].value);
      setDescription("");
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <FaFlag className="mr-2 text-red-500" /> Report Question
        </h2>
        {success ? (
          <div className="text-green-600 font-semibold text-center py-4">
            Thank you! Your report has been submitted.
            <button
              className="block mt-4 mx-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type of Problem
              </label>
              <select
                className="w-full border rounded p-2"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                {QUESTION_REPORT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <textarea
                className="w-full border rounded p-2 h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue..."
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RandomPractice() {
  const router = useRouter();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const existingSessionId = searchParams.get("sessionId");
  const urlSubjectId = searchParams.get("subjectId");

  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [splitPosition, setSplitPosition] = useState(65);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<number, string | Record<string, string>>
  >({});
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    {
      id: number;
      correct: boolean;
      question: string;
      userAnswer: string | Record<string, string>;
      correctAnswer: string | string[] | Record<string, string> | null;
    }[]
  >([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [multiPartAnswers, setMultiPartAnswers] = useState<
    Record<string, string>
  >({});
  const [multiPartResults, setMultiPartResults] = useState<
    Record<string, boolean>
  >({});
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<
    string | null
  >(null);
  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);

  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null);
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);

  // Set subjectId from URL after component mounts (fixes hydration issue)
  useEffect(() => {
    if (urlSubjectId) {
      const numericSubjectId = parseInt(urlSubjectId, 10);
      if (!isNaN(numericSubjectId)) {
        setCurrentSubjectId(numericSubjectId);
      }
    }
  }, [urlSubjectId]);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Whiteboard state
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) {
        setUserId(authUser.id);
      } else {
        toast.error("User session not found. Please sign in.");
        router.push("/sign-in");
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  // Load existing session from database
  const loadExistingSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!userId || !sessionId) {
        setError("Missing user or session information.");
        return false;
      }

      try {
        const response = await fetch(
          `/api/student/practice-sessions/${sessionId}`
        );
        if (!response.ok) {
          throw new Error("Failed to load session");
        }

        const sessionData: SessionData = await response.json();

        // Verify session belongs to current user
        if (sessionData.studentId !== userId) {
          throw new Error("Session does not belong to current user");
        }

        // Update session to IN_PROGRESS if it's NOT_STARTED
        if (sessionData.status === PracticeSessionStatus.NOT_STARTED) {
          await fetch(`/api/practice-sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: PracticeSessionStatus.IN_PROGRESS,
            }),
          });
        }

        setCurrentPracticeSessionId(sessionId);
        setCurrentSubjectId(sessionData.subjectId);
        setCurrentTopicId(sessionData.topicId);
        setScore(sessionData.score || 0);

        // Fetch the original questions for this session
        const questionsResponse = await fetch(
          `/api/practice-session?sessionId=${sessionId}`
        );
        if (!questionsResponse.ok) {
          throw new Error("Failed to load questions for this session");
        }
        const { questions } = await questionsResponse.json();

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("No questions available for this session.");
        }

        setQuestions(questions);

        // Build answered questions map from StudentAnswer records
        const answeredQuestionsMap: Record<
          number,
          string | Record<string, string>
        > = {};
        const results: typeof questionResults = [];

        questions.forEach((question) => {
          if (question.submittedAnswer) {
            answeredQuestionsMap[question.id] = question.submittedAnswer;
            results.push({
              id: question.id,
              correct: question.isCorrect || false,
              question: question.text,
              userAnswer: question.submittedAnswer,
              correctAnswer: question.correctAnswer,
            });
          }
        });

        setAnsweredQuestions(answeredQuestionsMap);
        setQuestionResults(results);

        // Find current question index (first unanswered question)
        const firstUnansweredIndex = questions.findIndex(
          (q) => !answeredQuestionsMap.hasOwnProperty(q.id)
        );

        if (firstUnansweredIndex === -1) {
          // All questions answered, show summary
          setCurrentQuestionIndex(questions.length);
          setShowSummary(true);
          setSessionFinalized(true);
        } else {
          setCurrentQuestionIndex(firstUnansweredIndex);
        }

        return true;
      } catch (err: any) {
        setError(`Could not load existing session: ${err.message}`);
        return false;
      }
    },
    [userId]
  );

  // Create new practice session in database
  const createNewPracticeSession = useCallback(async () => {
    if (!userId) {
      setError("User information is missing. Cannot start session.");
      return null;
    }

    try {
      // Fetch questions first
      let questionsUrl = "/api/questions/random?limit=10";
      if (currentSubjectId) {
        questionsUrl += `&subjectId=${currentSubjectId}`;
      }
      if (currentTopicId) {
        questionsUrl += `&topicId=${currentTopicId}`;
      }

      const questionsResponse = await fetch(questionsUrl);
      if (!questionsResponse.ok) {
        throw new Error("Failed to load questions");
      }
      const fetchedQuestions: QuestionClient[] = await questionsResponse.json();

      if (!Array.isArray(fetchedQuestions) || fetchedQuestions.length === 0) {
        throw new Error("No questions available.");
      }

      // Create session with questions
      const response = await fetch("/api/practice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: userId,
          title: `Random Practice${currentSubjectId ? ` - Subject ${currentSubjectId}` : ""}`,
          type: PracticeSessionType.PRACTICE,
          status: PracticeSessionStatus.IN_PROGRESS,
          totalQuestions: fetchedQuestions.length,
          subjectId: currentSubjectId,
          topicId: currentTopicId,
          questions: fetchedQuestions, // Pass the questions to store with session
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create practice session");
      }

      const sessionData = await response.json();
      setQuestions(fetchedQuestions);
      return sessionData.id;
    } catch (err: any) {
      setError(`Could not start a new practice session: ${err.message}`);
      return null;
    }
  }, [userId, currentSubjectId, currentTopicId]);

  // Find or create session and load questions
  const initializePracticeSession = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      let sessionId: string | null = null;

      // If there's an existing session ID from URL, use that
      if (existingSessionId) {
        const success = await loadExistingSession(existingSessionId);
        if (success) {
          setLoading(false);
          return;
        }
      }

      // Look for existing IN_PROGRESS session for this user and subject
      if (currentSubjectId) {
        const existingSessionResponse = await fetch(
          `/api/student/${userId}/practice-sessions?status=IN_PROGRESS&subjectId=${currentSubjectId}&limit=1`
        );

        if (existingSessionResponse.ok) {
          const sessions = await existingSessionResponse.json();
          if (sessions.length > 0) {
            const success = await loadExistingSession(sessions[0].id);
            if (success) {
              setLoading(false);
              return;
            }
          }
        }
      }

      // Create new session
      sessionId = await createNewPracticeSession();
      if (!sessionId) {
        setError("Failed to create practice session");
        setLoading(false);
        return;
      }

      // Fetch questions
      let questionsUrl = "/api/questions/random?limit=10";
      if (currentSubjectId) {
        questionsUrl += `&subjectId=${currentSubjectId}`;
      }

      const questionsResponse = await fetch(questionsUrl);
      if (!questionsResponse.ok) {
        throw new Error("Failed to load questions");
      }

      const fetchedQuestions: QuestionClient[] = await questionsResponse.json();
      if (!Array.isArray(fetchedQuestions) || fetchedQuestions.length === 0) {
        throw new Error("No questions were returned from the API.");
      }

      setQuestions(fetchedQuestions);

      // Update session with actual question count
      await fetch(`/api/practice-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalQuestions: fetchedQuestions.length,
        }),
      });

      // Reset state for new session
      setCurrentQuestionIndex(0);
      setScore(0);
      setAnsweredQuestions({});
      setQuestionResults([]);
      setSessionFinalized(false);
    } catch (error: any) {
      setError(error.message || "Failed to initialize practice session.");
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    currentSubjectId,
    existingSessionId,
    loadExistingSession,
    createNewPracticeSession,
  ]);

  // Save student answer to database immediately
  const saveStudentAnswerToDb = useCallback(
    async (
      question: QuestionClient,
      submittedAnswer: string | Record<string, string>,
      isCorrect: boolean,
      pointsEarned: number
    ) => {
      if (!currentPracticeSessionId) return;

      try {
        const response = await fetch("/api/student-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practiceSessionId: currentPracticeSessionId,
            questionId: question.id,
            submittedAnswer,
            isCorrect,
            pointsEarned,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save answer");
        }
      } catch (err: any) {
        toast.error(`Answer save failed: ${err.message}`);
      }
    },
    [currentPracticeSessionId]
  );

  // Initialize session when user and subjectId are ready
  useEffect(() => {
    if (!userId) {
      setLoading(true);
      return;
    }
    initializePracticeSession();
  }, [userId, initializePracticeSession]);

  // Load current question state from answers
  useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedUserAnswerContent = answeredQuestions[currentQuestionId];

      setIsAnswerCorrect(null);
      setTextAnswer("");
      setMultiPartAnswers({});
      setMultiPartResults({});
      setSelectedAnswer(null);

      if (savedUserAnswerContent !== undefined) {
        const questionType = currentQuestion.questionType;
        let isCorrectForSaved = false;

        if (
          questionType === PrismaQuestionType.OPEN_ENDED ||
          questionType === PrismaQuestionType.FILL_IN_THE_BLANK
        ) {
          if (typeof savedUserAnswerContent === "string")
            setTextAnswer(savedUserAnswerContent);
          const cAns = currentQuestion.correctAnswer;
          const cAnsArr = Array.isArray(cAns)
            ? cAns.map((cv) =>
                String(cv ?? "")
                  .trim()
                  .toLowerCase()
              )
            : [
                String(cAns ?? "")
                  .trim()
                  .toLowerCase(),
              ];
          isCorrectForSaved = cAnsArr.includes(
            String(savedUserAnswerContent).trim().toLowerCase()
          );
          setSelectedAnswer(String(savedUserAnswerContent));
        } else if (
          questionType === PrismaQuestionType.MULTI_PART &&
          typeof currentQuestion.correctAnswer === "object" &&
          currentQuestion.correctAnswer &&
          !Array.isArray(currentQuestion.correctAnswer)
        ) {
          const userAnswers =
            typeof savedUserAnswerContent === "object" &&
            savedUserAnswerContent !== null
              ? (savedUserAnswerContent as Record<string, string>)
              : {};
          setMultiPartAnswers(userAnswers);
          const correctAnswersMap = currentQuestion.correctAnswer as Record<
            string,
            string
          >;
          isCorrectForSaved = true;
          const currentPartResults: Record<string, boolean> = {};
          for (const part in correctAnswersMap) {
            const isPartCorrect =
              (userAnswers[part] || "").trim().toLowerCase() ===
              String(correctAnswersMap[part]).trim().toLowerCase();
            currentPartResults[part] = isPartCorrect;
            if (!isPartCorrect) isCorrectForSaved = false;
          }
          setMultiPartResults(currentPartResults);
          setSelectedAnswer(JSON.stringify(savedUserAnswerContent));
        } else {
          // MCQ
          if (typeof savedUserAnswerContent === "string")
            setSelectedAnswer(savedUserAnswerContent);
          isCorrectForSaved =
            String(currentQuestion.correctAnswer ?? "").toLowerCase() ===
            String(savedUserAnswerContent).toLowerCase();
        }
        setIsAnswerCorrect(isCorrectForSaved);
      }
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion]);

  const awardXPAndStreak = useCallback(
    async (xpToAdd: number) => {
      if (!userId || sessionFinalized || xpToAdd < 0) return null; // Allow 0 XP for streak update
      console.log(
        `Attempting to award ${xpToAdd} XP and update streak for user: ${userId}`
      );
      let levelUpDetails = null;
      try {
        if (xpToAdd > 0) {
          // Only call award-xp if there's XP to award
          const xpResponse = await fetch("/api/user/award-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              xpAmount: xpToAdd,
              activityType: "random_practice_completion",
            }),
          });

          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            toast.success(`+${xpData.awarded || xpToAdd} XP earned!`);
            if (xpData.leveledUp) {
              levelUpDetails = {
                newLevel: xpData.level,
                previousLevel: xpData.previousLevel,
              };
            }
          } else {
            const errorData = await xpResponse
              .json()
              .catch(() => ({ error: "Failed to award XP" }));
            toast.warn(
              `Could not award XP: ${errorData.error || xpResponse.statusText}`
            );
          }
        }

        // Always attempt to update streak
        const streakResponse = await fetch("/api/user/update-streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType: "random_practice_completion" }),
        });

        if (streakResponse.ok) {
          const streakData = await streakResponse.json();
          console.log("Streak updated:", streakData);
        } else {
          const errorData = await streakResponse
            .json()
            .catch(() => ({ error: "Failed to update streak" }));
          toast.warn(
            `Could not update streak: ${
              errorData.error || streakResponse.statusText
            }`
          );
        }
      } catch (error) {
        console.error("Error awarding XP/Streak", error);
        toast.error("An error occurred while updating your progress.");
      }
      return levelUpDetails;
    },
    [userId, sessionFinalized]
  );

  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!currentPracticeSessionId || !userId || sessionFinalized) return;
    setLoading("submitting");
    try {
      const calculatedScore = score;
      const correctCount = questionResults.filter((r) => r.correct).length;

      const response = await fetch(`/api/practice-session/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentPracticeSessionId,
          score: calculatedScore,
          correctAnswers: correctCount,
          xpEarned: calculatedScore,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to finalize session");
      }

      setSessionFinalized(true);

      // Trigger confetti for session completion
      setShowConfetti(true);

      const levelUpInfo = await awardXPAndStreak(calculatedScore);
      if (levelUpInfo) {
        setNewLevel(levelUpInfo.newLevel);
        setShowLevelUp(true);
        soundEffects.playLevelUpSound();
      }

      // Session completed - data is stored in database
      toast.success("Practice session completed and results saved!");

      // Refresh quest progress after completion
      triggerQuestRefresh();
    } catch (err: any) {
      toast.error(`Session finalization error: ${err.message}`);
      console.error("Session finalization error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    currentPracticeSessionId,
    userId,
    score,
    questionResults,
    awardXPAndStreak,
    sessionFinalized,
    setNewLevel,
    setShowLevelUp,
  ]);

  const handleSubmitAnswer = useCallback(
    (userAns: string | Record<string, string>, isCorr: boolean) => {
      if (!currentQuestion) return;
      setAnsweredQuestions((prev) => ({
        ...prev,
        [currentQuestion.id]: userAns,
      }));
      setIsAnswerCorrect(isCorr);

      const points = isCorr ? (currentQuestion.marks || currentQuestion.pointsAwarded || 1) : 0; // Use marks field first

      // Update questionResults - ensure it's a new object for reactivity
      setQuestionResults((prevResults) => {
        const newResult = {
          id: currentQuestion.id,
          correct: isCorr,
          question: currentQuestion.text || "",
          userAnswer: userAns,
          correctAnswer: currentQuestion.correctAnswer,
        };
        // Avoid duplicate results for the same question if user somehow re-submits (though UI should prevent)
        const existingResultIndex = prevResults.findIndex(
          (r) => r.id === currentQuestion.id
        );
        if (existingResultIndex > -1) {
          const updatedResults = [...prevResults];
          updatedResults[existingResultIndex] = newResult;
          return updatedResults;
        }
        return [...prevResults, newResult];
      });

      if (isCorr) {
        // Only add points if it's a new correct answer for this question
        const alreadyCountedCorrect = questionResults.find(
          (qr) => qr.id === currentQuestion.id && qr.correct
        );
        if (!alreadyCountedCorrect) {
          setScore((prevScore) => prevScore + points);
        }
      }
      saveStudentAnswerToDb(currentQuestion, userAns, isCorr, points);
    },
    [currentQuestion, saveStudentAnswerToDb, questionResults]
  );

  const handleAnswerMCQ = useCallback(
    (optionId: string, optionText: string) => {
      if (!currentQuestion || selectedAnswer !== null) return;
      setSelectedAnswer(optionId); // Mark as answered for UI disabling
      const correctAnswerId = String(
        currentQuestion.correctAnswer || ""
      ).toLowerCase();

      // Find the selected option index
      const selectedOptionIndex = currentQuestion.options.findIndex(
        (opt) => opt.id === optionId
      );
      const selectedOptionLetter = String.fromCharCode(
        65 + selectedOptionIndex
      ).toLowerCase();

      // Check correctness using multiple methods to handle different formats
      const isCorrect =
        optionId.toLowerCase() === correctAnswerId || // Direct ID match
        selectedOptionLetter === correctAnswerId || // Letter-based match (c for option C)
        String.fromCharCode(65 + selectedOptionIndex) ===
          String(currentQuestion.correctAnswer) || // Uppercase letter match
        (selectedOptionIndex + 1).toString() ===
          String(currentQuestion.correctAnswer); // 1-based index match

      const correctOption = currentQuestion.options.find(
        (opt) => opt.id.toLowerCase() === correctAnswerId
      );
      const correctAnswerDisplayText = correctOption
        ? correctOption.text
        : `ID: ${currentQuestion.correctAnswer}`;

      // Trigger confetti for correct answers
      if (isCorrect) {
        setShowConfetti(true);
      }

      // AI feedback will be handled by the new AI assistant component

      handleSubmitAnswer(optionId, isCorrect);
    },
    [currentQuestion, selectedAnswer, handleSubmitAnswer]
  );

  const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null)
      return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer); // Mark as answered for UI disabling

    const cAns = currentQuestion.correctAnswer;
    const cAnsArr = Array.isArray(cAns)
      ? cAns.map((cv) =>
          String(cv ?? "")
            .trim()
            .toLowerCase()
        )
      : [
          String(cAns ?? "")
            .trim()
            .toLowerCase(),
        ];
    const isCorrect = cAnsArr.includes(userAnswer.toLowerCase());

    // Trigger confetti and sound for correct answers
    if (isCorrect) {
      setShowConfetti(true);
      soundEffects.playSuccessSound();
    }

    // AI feedback will be handled by the new AI assistant component

    handleSubmitAnswer(userAnswer, isCorrect);
  }, [textAnswer, currentQuestion, selectedAnswer, handleSubmitAnswer]);

  const handleMultiPartSubmit = useCallback(() => {
    if (
      !currentQuestion ||
      typeof currentQuestion.correctAnswer !== "object" ||
      currentQuestion.correctAnswer === null ||
      Array.isArray(currentQuestion.correctAnswer)
    )
      return;

    const correctAnswersMap = currentQuestion.correctAnswer as Record<
      string,
      string
    >;
    let allPartsCorrect = true;
    const currentPartResults: Record<string, boolean> = {};

    for (const part in correctAnswersMap) {
      const userAnswerPart = (multiPartAnswers[part] || "")
        .trim()
        .toLowerCase();
      const correctAnswerTextPart = String(correctAnswersMap[part])
        .trim()
        .toLowerCase();
      const isPartCorrect = userAnswerPart === correctAnswerTextPart;
      currentPartResults[part] = isPartCorrect;
      if (!isPartCorrect) allPartsCorrect = false;
    }
    setMultiPartResults(currentPartResults); // For UI feedback on individual parts
    setSelectedAnswer(JSON.stringify(multiPartAnswers)); // Mark as answered for UI disabling

    // Trigger confetti and sound for correct answers
    if (allPartsCorrect) {
      setShowConfetti(true);
      soundEffects.playSuccessSound();
    }

    // AI feedback will be handled by the new AI assistant component

    handleSubmitAnswer(multiPartAnswers, allPartsCorrect);
  }, [currentQuestion, selectedAnswer, multiPartAnswers, handleSubmitAnswer]);

  const handleNextQuestion = useCallback(async () => {
    setShowHint(false);
    setSelectedAnswer(null); // Reset selected answer to prevent flashing
    setTextAnswer(""); // Reset text answer too
    setMultiPartAnswers({}); // Reset multi-part answers
    setMultiPartResults({}); // Reset multi-part results
    // AI feedback will be handled by the new AI assistant component
    // Chat history can persist if user wants to refer back, or clear it:
    // setChatHistory([]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      setShowSummary(true);
      // Trigger confetti when showing results (session completion)
      setShowConfetti(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const completeSessionAndStartNew = useCallback(async () => {
    // Starting new session - no need to clear localStorage as we're using database
    setShowSummary(false);
    setShowLevelUp(false); // Reset level up notification state
    await initializePracticeSession();
  }, [initializePracticeSession]);

  const handleExitConfirm = useCallback(() => {
    // Exit immediately without waiting for API call
    router.push("/student/practice");

    // Delete session in background (fire and forget)
    if (currentPracticeSessionId) {
      fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: "DELETE",
      }).catch((err) => {
        console.warn("Failed to delete practice session:", err);
        // Don't show toast error since user has already left the page
      });
    }
  }, [currentPracticeSessionId, router]);

  const clearProgressAndExit = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  // Old AI chat functions removed - now handled by new AI assistant component
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPos = Math.max(
      30,
      Math.min(70, ((e.clientX - rect.left) / rect.width) * 100)
    );
    setSplitPosition(newPos);
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
  const isMultiPartComplete = () => {
    if (
      !currentQuestion ||
      currentQuestion.questionType !== PrismaQuestionType.MULTI_PART ||
      typeof currentQuestion.correctAnswer !== "object" ||
      currentQuestion.correctAnswer === null ||
      Array.isArray(currentQuestion.correctAnswer)
    )
      return false;
    const parts = Object.keys(currentQuestion.correctAnswer);
    return parts.length > 0 && parts.every((p) => multiPartAnswers[p]?.trim());
  };

  const renderQuestionContent = () => {
    if (!currentQuestion)
      return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as
      | keyof typeof PrismaQuestionType
      | "UNKNOWN";

    switch (questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
            {" "}
            {/* Reduced space for tighter look */}
            {currentQuestion.options &&
            Array.isArray(currentQuestion.options) &&
            currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const isThisSelected = selectedAnswer === optionId;
                // Use the same robust checking logic as handleAnswerMCQ
                const correctAnswerId = String(
                  currentQuestion.correctAnswer || ""
                ).toLowerCase();
                const thisOptionLetter = String.fromCharCode(
                  65 + index
                ).toLowerCase();
                const isThisCorrectDB =
                  optionId.toLowerCase() === correctAnswerId || // Direct ID match
                  thisOptionLetter === correctAnswerId || // Letter-based match (c for option C)
                  String.fromCharCode(65 + index) ===
                    String(currentQuestion.correctAnswer) || // Uppercase letter match
                  (index + 1).toString() ===
                    String(currentQuestion.correctAnswer); // 1-based index match

                let buttonClass =
                  "bg-white hover:bg-gray-50 border border-gray-300";
                if (selectedAnswer !== null) {
                  if (isThisSelected) {
                    buttonClass = isAnswerCorrect
                      ? "bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500"
                      : "bg-red-100 border-red-500 text-red-800 ring-2 ring-red-500";
                  } else if (isThisCorrectDB) {
                    buttonClass =
                      "bg-green-100 border-green-500 text-green-800"; // Show correct if user picked wrong
                  }
                }
                return (
                  <button
                    key={option.id || index}
                    onClick={() => handleAnswerMCQ(optionId, optionText)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-md transition-all duration-150 text-md ${buttonClass}`}
                  >
                    {" "}
                    {/* Reduced padding */}
                    <span className="font-bold mr-2">{optionLetter}.</span>{" "}
                    {optionText}
                  </button>
                );
              })
            ) : (
              <div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center">
                <p>No options available for this MCQ.</p>
              </div>
            )}
          </div>
        );
      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        return (
          <div className="mt-6">
            {" "}
            {/* Reduced margin */}
            <div className="mb-3">
              {" "}
              {/* Reduced margin */}
              <label
                htmlFor="text-answer"
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Your Answer:
              </label>
              <div className="flex">
                <input
                  id="text-answer"
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      textAnswer.trim() &&
                      selectedAnswer === null
                    ) {
                      e.preventDefault();
                      handleTextAnswerSubmit();
                    }
                  }}
                  placeholder="Type your answer..."
                  disabled={selectedAnswer !== null}
                  className={`w-full p-3 text-md rounded-l-md border ${
                    selectedAnswer === null
                      ? "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      : isAnswerCorrect
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-red-500 bg-red-50 text-red-800"
                  }`}
                />{" "}
                {/* Reduced padding */}
                <button
                  onClick={handleTextAnswerSubmit}
                  disabled={selectedAnswer !== null || !textAnswer.trim()}
                  className={`px-5 rounded-r-md ${
                    selectedAnswer === null && textAnswer.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Submit
                </button>
              </div>
            </div>
            {selectedAnswer !== null && (
              <div
                className={`mt-3 p-3 rounded-md text-sm ${
                  isAnswerCorrect
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <p className="font-medium">
                  {isAnswerCorrect
                    ? "Correct!"
                    : `Incorrect. Correct answer(s): "${
                        Array.isArray(currentQuestion.correctAnswer)
                          ? currentQuestion.correctAnswer.join(" or ")
                          : currentQuestion.correctAnswer
                      }".`}
                </p>
                {!isAnswerCorrect && currentQuestion.explanation && (
                  <p className="mt-1">
                    Explanation: {currentQuestion.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      case PrismaQuestionType.MULTI_PART:
        if (
          typeof currentQuestion.correctAnswer !== "object" ||
          currentQuestion.correctAnswer === null ||
          Array.isArray(currentQuestion.correctAnswer)
        ) {
          return (
            <p className="text-red-500">
              Error: Correct answer format for multi-part question is invalid.
            </p>
          );
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-6 space-y-4">
            {" "}
            {/* Reduced margin */}
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-md">
              <p className="text-amber-800 font-medium text-sm">
                Multi-part question. Enter answers for each part:
              </p>
            </div>
            {parts.map((part) => (
              <div key={part} className="mb-4">
                {" "}
                {/* Reduced margin */}
                <label
                  htmlFor={`multipart-${part}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Part {part.toUpperCase()}:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id={`multipart-${part}`}
                    value={multiPartAnswers[part] || ""}
                    onChange={(e) =>
                      setMultiPartAnswers({
                        ...multiPartAnswers,
                        [part]: e.target.value,
                      })
                    }
                    placeholder={`Answer for part ${part.toUpperCase()}`}
                    disabled={selectedAnswer !== null}
                    className={`w-full p-3 text-md rounded-md border ${
                      selectedAnswer !== null &&
                      multiPartResults[part] !== undefined
                        ? multiPartResults[part]
                          ? "border-green-500 bg-green-50"
                          : "border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    }`}
                  />{" "}
                  {/* Reduced padding */}
                </div>
                {selectedAnswer !== null &&
                  multiPartResults[part] !== undefined &&
                  !multiPartResults[part] && (
                    <p className="text-xs text-red-600 mt-1">
                      Correct: "
                      {
                        (
                          currentQuestion.correctAnswer as Record<
                            string,
                            string
                          >
                        )[part]
                      }
                      "
                    </p>
                  )}
              </div>
            ))}
            <Button
              onClick={handleMultiPartSubmit}
              disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`w-full py-3 ${
                selectedAnswer === null && isMultiPartComplete()
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Submit All Parts
            </Button>
            {selectedAnswer !== null && (
              <div
                className={`mt-3 p-3 rounded-md text-sm ${
                  isAnswerCorrect
                    ? "bg-green-50 border-l-4 border-green-400 text-green-800"
                    : "bg-red-50 border-l-4 border-red-400 text-red-800"
                }`}
              >
                <p className="font-medium mb-2">
                  {isAnswerCorrect
                    ? "All parts correct!"
                    : "Some parts incorrect."}
                </p>
                {currentQuestion.explanation && (
                  <div className="border-t pt-2">
                    <p className="font-semibold mb-2">Explanation:</p>
                    <ExplanationFormatter
                      explanation={currentQuestion.explanation}
                      className="text-gray-700"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center">
            <p>
              Unsupported question type:{" "}
              {currentQuestion.questionType || "Not specified"}
            </p>
          </div>
        );
    }
  };

  // Practice Completion Loading (when submitting results)
  if (typeof loading === "string" && loading === "submitting") {
    return (
      <PracticeCompletionLoader
        studentName={authUser?.user_metadata?.name || "Student"}
        sessionType="Random Practice Session"
      />
    );
  }

  // General Loading state
  if (
    typeof loading === "string" ||
    (loading === true && !currentQuestion && !error)
  ) {
    // More specific loading check
    return (
      <InteractiveLoadingAnimation
        title="Preparing Your Practice Session"
        subtitle="Loading questions and personalizing your experience..."
        theme="practice"
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
            <FaExclamationTriangle className="text-red-600 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full"
              onClick={initializePracticeSession}
            >
              <FaRedo className="mr-2" /> Try Again
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
              onClick={() => router.push("/student/practice")}
            >
              <FaArrowLeft className="mr-2" /> Back to Subjects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const totalPossibleScore = questions.reduce(
      (acc, q) => acc + (q.marks || q.pointsAwarded || 1),
      0
    );
    const percentageCorrect =
      totalPossibleScore > 0
        ? Math.round((score / totalPossibleScore) * 100)
        : 0;
    const correctCount = questionResults.filter((r) => r.correct).length;
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {showLevelUp && (
          <LevelUpNotification
            level={newLevel}
            onClose={() => setShowLevelUp(false)}
          />
        )}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
            <FaTrophy className="text-5xl mx-auto mb-4 opacity-80" />
            <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
            <p className="text-indigo-200">Great effort! Here's how you did:</p>
          </div>

          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <p className="text-6xl font-bold text-indigo-600">
                {percentageCorrect}%
              </p>
              <p className="text-gray-600 mt-1">
                Your Score: {score} / {totalPossibleScore}
              </p>
              <p className="text-amber-500 font-semibold mt-1">
                XP Earned: +{score}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 uppercase">
                  Total Questions
                </p>
                <p className="text-2xl font-semibold text-gray-700">
                  {questions.length}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 uppercase">
                  Correct Answers
                </p>
                <p className="text-2xl font-semibold text-green-600">
                  {correctCount} / {questions.length}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Review Your Answers:
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {questionResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.correct
                        ? "bg-green-50 border-green-400 text-green-800"
                        : "bg-red-50 border-red-400 text-red-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">
                        Question {index + 1}
                      </h4>
                      <div className="flex items-center">
                        {result.correct ? (
                          <div className="flex items-center text-green-600">
                            <FaCheck className="mr-1" />
                            <span className="text-xs font-medium">Correct</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <FaTimes className="mr-1" />
                            <span className="text-xs font-medium">
                              Incorrect
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm mb-3 text-gray-700 leading-relaxed">
                      {result.question}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap">
                        <span className="font-medium text-gray-600 mr-2">
                          Your Answer:
                        </span>
                        <span
                          className={`${
                            result.correct ? "text-green-700" : "text-red-700"
                          } font-medium`}
                        >
                          {typeof result.userAnswer === "object"
                            ? Object.entries(result.userAnswer)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")
                            : result.userAnswer || "No answer"}
                        </span>
                      </div>

                      {!result.correct && (
                        <div className="flex flex-wrap">
                          <span className="font-medium text-gray-600 mr-2">
                            Correct Answer:
                          </span>
                          <span className="text-green-700 font-medium">
                            {typeof result.correctAnswer === "object" &&
                            result.correctAnswer !== null
                              ? Array.isArray(result.correctAnswer)
                                ? result.correctAnswer.join(", ")
                                : Object.entries(result.correctAnswer)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(", ")
                              : result.correctAnswer || "N/A"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/student/practice")}
                variant="outline"
                className="flex-1"
              >
                <FaArrowLeft className="mr-2" /> Practice Menu
              </Button>
              <Button
                onClick={completeSessionAndStartNew}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <FaRocket className="mr-2" /> Start New Random Practice
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !loading && !error && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            No Questions Loaded
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any practice questions right now. Please try again
            or select a different topic.
          </p>
          <Button
            onClick={() => router.push("/student/practice")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
          >
            <FaArrowLeft className="mr-2" /> Return to Practice Menu
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    // Fallback if currentQuestion is null after loading and no error
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-4xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Loading Next Question...
          </h2>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  const progressPercentageDisplay =
    questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0; // Only count answered questions

  return (
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      {showLevelUp && (
        <LevelUpNotification
          level={newLevel}
          onClose={() => setShowLevelUp(false)}
        />
      )}
      <ConfettiComponent
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <ExitPracticeDialog
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onExit={handleExitConfirm}
        title="Exit Random Practice?"
        subtitle="You're in the middle of a practice session"
        currentProgress={{
          currentQuestion: currentQuestionIndex + 1,
          totalQuestions: questions.length,
          score: score,
          correctAnswers: questionResults.filter((r) => r.correct).length,
        }}
      />
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button
          onClick={clearProgressAndExit}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          {" "}
          <FaArrowLeft className="mr-1.5" /> Exit
        </button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          {currentQuestion?.topic?.name || "Random Practice"} • Q{" "}
          {currentQuestionIndex + 1} / {questions.length}
        </div>
        <div className="text-amber-600 font-semibold text-sm md:text-base">
          {score} XP
        </div>
      </div>
      <div className="w-full h-1.5 bg-gray-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentageDisplay}%` }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="overflow-auto bg-white custom-scrollbar"
          style={{ width: `${splitPosition}%` }}
        >
          <div className="p-4 md:p-8">
            {" "}
            {/* Reduced padding */}
            <div className="mb-3 flex justify-between items-center">
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                Topic: {currentQuestion?.topic?.name || "General"}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  currentQuestion?.difficulty === "HARD" ||
                  currentQuestion?.difficulty === "VERY_HARD"
                    ? "bg-red-100 text-red-700"
                    : currentQuestion?.difficulty === "MEDIUM"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {currentQuestion?.difficulty || "MEDIUM"}
              </span>
              {/* Whiteboard Button */}
              <WhiteboardButton
                onClick={() => setShowWhiteboard(true)}
                className="ml-2"
                size="sm"
              />
              {/* Report Button */}
              <button
                className="ml-2 flex items-center text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-2 py-1 rounded transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportModal(true);
                }}
              >
                <FaFlag className="mr-1" /> Report
              </button>
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 leading-snug">
              <QuestionTextFormatter text={currentQuestion?.text} />
            </h1>
            {currentQuestion?.imageUrl && (
              <div className="mb-4 flex justify-center border border-gray-200 rounded-lg p-2 bg-gray-50 shadow-sm">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question diagram"
                  className="max-w-full h-auto max-h-80 rounded-md object-contain"
                />
              </div>
            )}
            {renderQuestionContent()}
            {/* Feedback and Explanation Area */}
            {selectedAnswer !== null &&
              currentQuestion.explanation &&
              currentQuestion.questionType !== "MULTI_PART" && (
                <div
                  className={`mt-4 p-3 rounded-md text-sm ${
                    isAnswerCorrect
                      ? "bg-green-50 border-l-4 border-green-400"
                      : "bg-blue-50 border-l-4 border-blue-400"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-700 mb-3">
                      Explanation:
                    </p>
                    <ExplanationFormatter
                      explanation={currentQuestion.explanation}
                      className="text-gray-700"
                    />
                  </div>
                </div>
              )}
            <div className="mt-6 border-t border-gray-200 pt-5 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <Button
                onClick={() => setShowHint(true)}
                disabled={
                  selectedAnswer !== null || showHint || !currentQuestion?.hint
                }
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto text-sm py-2"
              >
                <FaLightbulb className="mr-1.5" /> Get Hint
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={
                  selectedAnswer === null ||
                  (typeof loading === "string" && loading === "submitting")
                }
                className={`px-6 py-2.5 text-sm w-full sm:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all ${
                  selectedAnswer !== null
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {typeof loading === "string" && loading === "submitting" ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : null}
                {currentQuestionIndex < questions.length - 1
                  ? "Next Question →"
                  : "🏁 Show Results"}
              </Button>
            </div>
            {showHint && currentQuestion?.hint && (
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 shadow text-sm">
                <div className="flex items-start">
                  <FaLightbulb className="text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-0.5 text-yellow-900">
                      Hint:
                    </p>
                    <p>{currentQuestion.hint}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150"
          onMouseDown={handleMouseDown}
        >
          <div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div>
        </div>

        <div
          className="bg-indigo-50 flex flex-col overflow-hidden custom-scrollbar"
          style={{ width: `${100 - splitPosition - 0.5}%` }}
        >
          <AIAssistant
            questionContext={
              currentQuestion
                ? createQuestionContext(
                    currentQuestion.id,
                    currentQuestion.text,
                    currentQuestion.questionType || "MULTIPLE_CHOICE",
                    currentQuestion.options,
                    currentQuestion.correctAnswer || undefined,
                    currentQuestion.explanation || undefined,
                    currentQuestion.hint,
                    selectedAnswer || undefined,
                    selectedAnswer !== null
                      ? isAnswerCorrect || false
                      : undefined
                  )
                : undefined
            }
            sessionContext={createSessionContext(
              "random_practice",
              questions.length,
              currentQuestionIndex + (selectedAnswer ? 1 : 0),
              questionResults.filter((r) => r.correct).length,
              sessionFinalized,
              currentPracticeSessionId || undefined,
              "Primary School",
              currentQuestion?.topic?.subjectId,
              undefined // Subject name will be determined from subjectId in the helper function
            )}
            disabled={false}
            className="h-full"
          />
        </div>
      </div>
      <ReportQuestionModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        questionId={currentQuestion?.id}
        studentId={userId}
      />
      <WhiteboardModal
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        onSave={(imageDataURL) => {
          // Optional: Save whiteboard content to session or local storage
          console.log('Whiteboard saved:', imageDataURL);
          setShowWhiteboard(false);
        }}
      />
    </div>
  );
}
