// src/app/(dashboard)/student/practice/[topicId]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-manager";
import {
  PracticeSessionStatus,
  PracticeSessionType,
  QuestionType as PrismaQuestionType,
  Topic,
} from "@/generated/prisma";
import safeStorage from "@/lib/safeStorage";
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
import {
  validateUserInput,
  sanitizeUserInput,
  getHelpfulSuggestions,
} from "@/lib/client-validation";
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
  FaBookOpen,
  FaFlag,
} from "react-icons/fa";

// Interfaces (same as RandomPractice)
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

interface LocalStorageTopicalPracticeProgress {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string | Record<string, string>>;
  questionResults: {
    id: number;
    correct: boolean;
    question: string;
    userAnswer: string | Record<string, string>;
    correctAnswer: string | string[] | Record<string, string> | null;
  }[];
  sessionFinalized?: boolean;
  practiceSessionId?: string | null;
  subjectId?: number | null;
  topicId: number; // Topic ID is key here
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
                Description
              </label>
              <textarea
                className="w-full border rounded p-2 min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                required
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
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

export default function TopicalPracticePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const topicIdParam = params.topicId as string;
  const numericTopicId = parseInt(topicIdParam, 10);
  const existingSessionId = searchParams.get("sessionId");

  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<number, string | Record<string, string>>
  >({});
  const [userMessage, setUserMessage] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    LocalStorageTopicalPracticeProgress["questionResults"]
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

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Whiteboard state
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  const localStorageKey = userId
    ? `topicalPracticeProgress_${userId}_${numericTopicId}`
    : null;

  const [showReportModal, setShowReportModal] = useState(false);

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

  // Fetch Topic Details
  useEffect(() => {
    if (!numericTopicId || isNaN(numericTopicId)) {
      setError("Invalid Topic ID.");
      setLoading(false);
      return;
    }
    async function fetchTopicDetails() {
      try {
        const response = await fetch(`/api/topics/${numericTopicId}`);
        if (!response.ok) throw new Error("Failed to fetch topic details");
        const data = await response.json();
        setCurrentTopic(data);
      } catch (err: any) {
        setError(err.message || "Could not load topic details.");
        console.error("Error fetching topic details:", err);
      }
    }
    fetchTopicDetails();
  }, [numericTopicId]);

  const loadExistingSession = useCallback(
    async (sessionId: string) => {
      if (!userId || !sessionId) {
        setError("Missing user or session information.");
        return null;
      }

      try {
        // First get the session details
        const response = await fetch(
          `/api/student/practice-sessions/${sessionId}`
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({
            error: { message: "Failed to load session" },
          }));
          throw new Error(errData.error?.message || "Failed to load session");
        }

        const sessionData = await response.json();

        // Update the existing session to IN_PROGRESS if it's NOT_STARTED
        if (sessionData.status === PracticeSessionStatus.NOT_STARTED) {
          const updateResponse = await fetch(
            `/api/practice-sessions/${sessionId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: PracticeSessionStatus.IN_PROGRESS,
              }),
            }
          );
          if (!updateResponse.ok) {
            console.warn("Failed to update session status to IN_PROGRESS");
          }
        }

        setCurrentPracticeSessionId(sessionId);

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
        return sessionId;
      } catch (err: any) {
        setError(`Could not load existing session: ${err.message}`);
        return null;
      }
    },
    [userId]
  );

  const createNewTopicalPracticeSession = useCallback(
    async (fetchedQuestions: QuestionClient[]) => {
      if (!userId || !currentTopic) {
        setError("User or Topic information is missing. Cannot start session.");
        return null;
      }
      if (fetchedQuestions.length === 0) {
        setError("No questions available to start a session for this topic.");
        return null;
      }

      const subjectIdForSession = currentTopic.subjectId;

      try {
        const response = await fetch("/api/practice-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: userId,
            title: `Practice: ${currentTopic.name}`,
            type: PracticeSessionType.TOPIC_QUIZ,
            status: PracticeSessionStatus.IN_PROGRESS,
            totalQuestions: fetchedQuestions.length,
            subjectId: subjectIdForSession,
            topicId: numericTopicId,
            questions: fetchedQuestions, // Pass the questions to store with session
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({
            error: { message: "Failed to parse session creation error" },
          }));
          throw new Error(
            errData.error?.message ||
              errData.error ||
              "Failed to create practice session"
          );
        }
        const sessionData = await response.json();
        setCurrentPracticeSessionId(sessionData.id);
        return sessionData.id;
      } catch (err: any) {
        setError(`Could not start a new practice session: ${err.message}`);
        return null;
      }
    },
    [userId, currentTopic, numericTopicId]
  );

  const fetchTopicalQuestionsAndStartSession = useCallback(async () => {
    if (!userId || !numericTopicId || isNaN(numericTopicId) || !currentTopic)
      return;

    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setLoading(true);
    setError(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnsweredQuestions({});
    setQuestionResults([]);
    setSessionFinalized(false);
    setAiMessage(null);
    setChatHistory([]);
    setCurrentPracticeSessionId(null);

    try {
      // Fetch questions specifically for this topic
      const response = await fetch(
        `/api/questions/random?topicId=${numericTopicId}&limit=10`
      ); // Adjust limit as needed
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { message: `API error: ${response.status}` },
        }));
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }
      const data: QuestionClient[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(
          "No questions were returned for this topic from the API."
        );
      }

      const newSessionId = await createNewTopicalPracticeSession(data);
      if (newSessionId) {
        setQuestions(data);
      } else {
        setError(
          "Fetched questions but failed to start a new practice session in the database."
        );
        setQuestions([]);
      }
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to load questions for this topic. Please try again."
      );
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    numericTopicId,
    currentTopic,
    createNewTopicalPracticeSession,
    localStorageKey,
  ]);

  useEffect(() => {
    if (!userId || !numericTopicId || isNaN(numericTopicId) || !currentTopic) {
      // Wait for currentTopic to be loaded
      if (userId && numericTopicId && !isNaN(numericTopicId)) {
        // Only set loading if IDs are valid but topic isn't fetched
        setLoading(true);
      }
      return;
    }
    if (!localStorageKey) return;

    setLoading(true);

    // If there's an existing session ID from URL, load that instead of localStorage
    if (existingSessionId) {
      loadExistingSession(existingSessionId).then((success) => {
        if (success) {
          // Clear any old localStorage for this topic since we're using an existing session
          safeStorage.removeItem(localStorageKey, "local");
        }
        setLoading(false);
      });
      return;
    }

    // Otherwise, check localStorage for resumable session
    const savedProgressString = safeStorage.getItem(localStorageKey, "local");
    let resumableSessionFound = false;
    if (savedProgressString) {
      try {
        const progress: LocalStorageTopicalPracticeProgress =
          JSON.parse(savedProgressString);
        // Ensure the saved progress is for the current topic
        if (
          progress.topicId === numericTopicId &&
          progress.questions?.length > 0 &&
          !progress.sessionFinalized &&
          progress.practiceSessionId
        ) {
          setQuestions(progress.questions);
          setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
          setScore(progress.score || 0);
          setAnsweredQuestions(
            (progress.answeredQuestions as Record<
              number,
              string | Record<string, string>
            >) || {}
          );
          setQuestionResults(progress.questionResults || []);
          setCurrentPracticeSessionId(progress.practiceSessionId);
          // subjectId is part of currentTopic now
          setSessionFinalized(false);
          if (progress.currentQuestionIndex >= progress.questions.length) {
            setShowSummary(true);
            setSessionFinalized(true);
          }
          resumableSessionFound = true;
        } else {
          safeStorage.removeItem(localStorageKey, "local");
        }
      } catch (error) {
        safeStorage.removeItem(localStorageKey, "local");
      }
    }

    if (!resumableSessionFound) {
      fetchTopicalQuestionsAndStartSession();
    } else {
      setLoading(false);
    }
  }, [
    userId,
    numericTopicId,
    fetchTopicalQuestionsAndStartSession,
    localStorageKey,
    currentTopic,
    existingSessionId,
    loadExistingSession,
  ]);

  useEffect(() => {
    if (
      !localStorageKey ||
      typeof loading === "string" ||
      loading ||
      !userId ||
      questions.length === 0 ||
      !currentPracticeSessionId ||
      showSummary ||
      !currentTopic
    )
      return;
    const progress: LocalStorageTopicalPracticeProgress = {
      questions,
      currentQuestionIndex,
      score,
      answeredQuestions: answeredQuestions as Record<
        number,
        string | Record<string, string>
      >,
      questionResults,
      sessionFinalized,
      practiceSessionId: currentPracticeSessionId,
      subjectId: currentTopic.subjectId,
      topicId: numericTopicId,
    };
    safeStorage.setItem(localStorageKey, JSON.stringify(progress), "local");
  }, [
    questions,
    currentQuestionIndex,
    score,
    answeredQuestions,
    questionResults,
    sessionFinalized,
    loading,
    userId,
    currentPracticeSessionId,
    showSummary,
    numericTopicId,
    currentTopic,
    localStorageKey,
  ]);

  // --- All other useEffects and handler functions (handleSubmitAnswer, handleNextQuestion, awardXP, etc.)
  // can be largely copied from RandomPractice page.
  // Key changes:
  // - `finalizePracticeSessionInDb`: Make sure to update the correct local storage key for topic.
  // - `completeSessionAndStartNew`: Should probably navigate back to the topic list or restart this topic.
  // - `clearProgressAndExit`: Should also use the topical local storage key.

  // Copied from RandomPractice and adapted:
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
      } else {
        setAiMessage(null);
      }
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion]);

  const awardXPAndStreak = useCallback(
    async (xpToAdd: number) => {
      if (!userId || sessionFinalized || xpToAdd < 0) return null;
      let levelUpDetails = null;
      try {
        if (xpToAdd > 0) {
          const xpResponse = await fetch("/api/user/award-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              xpAmount: xpToAdd,
              activityType: "topic_quiz_completion",
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
        await fetch("/api/user/update-streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType: "topic_quiz_completion" }),
        });
      } catch (error) {
        console.error("Error awarding XP/Streak", error);
        toast.error("An error occurred while updating your progress.");
      }
      return levelUpDetails;
    },
    [userId, sessionFinalized]
  );

  const saveStudentAnswerToDb = useCallback(
    async (
      question: QuestionClient,
      userAnswer: string | Record<string, string>,
      isCorrect: boolean,
      points: number
    ) => {
      if (!currentPracticeSessionId) {
        toast.error("Error saving: No active session.");
        return;
      }
      try {
        const response = await fetch("/api/student-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practiceSessionId: currentPracticeSessionId,
            questionId: question.id,
            submittedAnswer: userAnswer,
            isCorrect,
            pointsEarned: points,
            attemptedAt: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to save answer");
        }
      } catch (err: any) {
        toast.error(`Answer save failed: ${err.message}`);
      }
    },
    [currentPracticeSessionId]
  );

  const finalizePracticeSessionInDb = useCallback(async () => {
    if (
      !currentPracticeSessionId ||
      !userId ||
      sessionFinalized ||
      !localStorageKey
    )
      return;
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
      safeStorage.removeItem(localStorageKey, "local");
      toast.success("Topical practice completed and results saved!");

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
    localStorageKey,
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
      const points = isCorr ? (currentQuestion.marks || currentQuestion.pointsAwarded || 1) : 0;
      setQuestionResults((prevResults) => {
        const newResult = {
          id: currentQuestion.id,
          correct: isCorr,
          question: currentQuestion.text || "",
          userAnswer: userAns,
          correctAnswer: currentQuestion.correctAnswer,
        };
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
      setSelectedAnswer(optionId);
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

      // Trigger confetti for correct answers
      if (isCorrect) {
        setShowConfetti(true);
      }

      const correctOption = currentQuestion.options.find(
        (opt) => opt.id.toLowerCase() === correctAnswerId
      );
      const correctAnswerDisplayText = correctOption
        ? correctOption.text
        : `ID: ${currentQuestion.correctAnswer}`;
      setAiMessage(
        isCorrect
          ? "Great job!"
          : `Incorrect. Correct: "${correctAnswerDisplayText}".`
      );
      setChatHistory((prev) => [
        {
          role: "assistant",
          content: isCorrect
            ? "Great job! That's correct."
            : `Not quite right. The correct answer is "${correctAnswerDisplayText}".`,
        },
      ]);
      handleSubmitAnswer(optionId, isCorrect);
    },
    [currentQuestion, selectedAnswer, handleSubmitAnswer]
  );

  const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null)
      return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer);
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

    // Trigger confetti for correct answers
    if (isCorrect) {
      setShowConfetti(true);
    }

    const feedback = isCorrect
      ? "Great job!"
      : `Incorrect. Correct: "${cAnsArr.join(" or ")}".`;
    setAiMessage(feedback);
    setChatHistory((prev) => [{ role: "assistant", content: feedback }]);
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
    setMultiPartResults(currentPartResults);
    setSelectedAnswer(JSON.stringify(multiPartAnswers));

    // Trigger confetti and sound for correct answers
    if (allPartsCorrect) {
      setShowConfetti(true);
      soundEffects.playSuccessSound();
    }

    const feedback = allPartsCorrect
      ? "All parts correct!"
      : "Some parts incorrect.";
    setAiMessage(feedback);
    setChatHistory((prev) => [{ role: "assistant", content: feedback }]);
    handleSubmitAnswer(multiPartAnswers, allPartsCorrect);
  }, [currentQuestion, selectedAnswer, multiPartAnswers, handleSubmitAnswer]);

  const handleNextQuestion = useCallback(async () => {
    setShowHint(false);
    setAiMessage(null);
    setSelectedAnswer(null);
    setTextAnswer("");
    setMultiPartAnswers({});
    setMultiPartResults({});
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      setShowSummary(true);
      // Trigger confetti when showing results (session completion)
      setShowConfetti(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const restartTopicalPractice = useCallback(async () => {
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setShowSummary(false);
    setShowLevelUp(false);
    await fetchTopicalQuestionsAndStartSession();
  }, [localStorageKey, fetchTopicalQuestionsAndStartSession]);

  const handleExitConfirm = useCallback(() => {
    // Exit immediately without waiting for API call
    if (userId && currentTopic?.subjectId) {
      router.push(`/student/practice/subject/${currentTopic.subjectId}`);
    } else {
      router.push("/student/practice");
    }

    // Clean up session in background if needed
    if (currentPracticeSessionId && localStorageKey) {
      safeStorage.removeItem(localStorageKey, "local");
    }
  }, [userId, currentTopic, router, currentPracticeSessionId, localStorageKey]);

  const exitToTopicList = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || !currentQuestion) return;

    // Client-side validation
    const validation = validateUserInput(userMessage);
    if (!validation.isValid) {
      toast.error(validation.reason || "Please enter a valid question.");
      if (validation.suggestedMessage) {
        setUserMessage(validation.suggestedMessage);
      }
      return;
    }

    const sanitizedMessage = sanitizeUserInput(userMessage);
    const currentUserMessage = sanitizedMessage;
    setUserMessage("");
    setIsLoadingAI(true);
    const currentChatHistory = [
      ...chatHistory,
      { role: "user", content: currentUserMessage },
    ];
    setChatHistory(currentChatHistory);
    if (aiContentRef.current)
      setTimeout(() => {
        if (aiContentRef.current)
          aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight;
      }, 100);
    try {
      const optionsText =
        currentQuestion.options
          ?.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`)
          .join("\n") || "N/A";
      let cAnsDisp = "Not available";
      if (currentQuestion.correctAnswer) {
        if (
          typeof currentQuestion.correctAnswer === "string" &&
          currentQuestion.questionType === PrismaQuestionType.MULTIPLE_CHOICE
        ) {
          const correctAnswerStr = currentQuestion.correctAnswer as string;
          const opt = currentQuestion.options.find(
            (o) => o.id.toLowerCase() === correctAnswerStr.toLowerCase()
          );
          cAnsDisp = opt ? opt.text : String(currentQuestion.correctAnswer);
        } else {
          cAnsDisp = JSON.stringify(currentQuestion.correctAnswer);
        }
      }

      // Create proper context structure for the AI tutor API
      const questionContext = {
        id: currentQuestion.id,
        text: currentQuestion.text,
        questionType: currentQuestion.questionType || "MULTIPLE_CHOICE",
        options: currentQuestion.options || [],
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        hint: currentQuestion.hint,
        userAnswer: selectedAnswer,
        isCorrect: selectedAnswer !== null ? isAnswerCorrect : undefined,
      };

      const sessionContext = {
        sessionId: currentPracticeSessionId,
        sessionType: "topic_practice" as const,
        isCompleted: showSummary,
        totalQuestions: questions.length,
        answeredQuestions: Object.keys(answeredQuestions).length,
        correctAnswers: Math.round(score / 10), // Assuming 10 points per correct answer
        studentLevel: "Primary School",
      };

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentChatHistory,
          context: {
            question: questionContext,
            session: sessionContext,
          },
        }),
      });
      if (!response.ok) throw new Error("AI tutor request failed");
      const data = await response.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      if (aiContentRef.current)
        setTimeout(() => {
          if (aiContentRef.current)
            aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight;
        }, 100);
    } catch (error) {
      console.error("AI tutor error:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble." },
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  }, [
    userMessage,
    currentQuestion,
    chatHistory,
    selectedAnswer,
    isAnswerCorrect,
    currentPracticeSessionId,
    showSummary,
    questions.length,
    answeredQuestions,
    score,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
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
    /* Same as RandomPractice */
    if (!currentQuestion)
      return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as
      | keyof typeof PrismaQuestionType
      | "UNKNOWN";

    switch (questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
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
                      "bg-green-100 border-green-500 text-green-800";
                  }
                }
                return (
                  <button
                    key={option.id || index}
                    onClick={() => handleAnswerMCQ(optionId, optionText)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-md transition-all duration-150 text-md ${buttonClass}`}
                  >
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
            <div className="mb-3">
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
                />
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
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-md">
              <p className="text-amber-800 font-medium text-sm">
                Multi-part question. Enter answers for each part:
              </p>
            </div>
            {parts.map((part) => (
              <div key={part} className="mb-4">
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
                  />
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
                  {aiMessage ||
                    (isAnswerCorrect
                      ? "All parts correct!"
                      : "Some parts incorrect.")}
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
        sessionType={`Topic Practice: ${currentTopic?.name || "Practice"}`}
      />
    );
  }

  // General Loading state
  if (
    typeof loading === "string" ||
    (loading === true && !currentQuestion && !error && !currentTopic)
  ) {
    return (
      <InteractiveLoadingAnimation
        title="Preparing Your Topic Practice"
        subtitle="Loading topic details and questions..."
        theme="study"
      />
    );
  }
  if (error) {
    /* Same as RandomPractice */
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
              onClick={fetchTopicalQuestionsAndStartSession}
            >
              <FaRedo className="mr-2" /> Try Again
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
              onClick={() =>
                router.push(
                  `/student/practice/subject/${currentTopic?.subjectId || ""}`
                )
              }
            >
              <FaArrowLeft className="mr-2" /> Back to Topics
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Summary View
  if (showSummary) {
    /* Same as RandomPractice, but "Start New Practice" button logic changes */
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
        <ConfettiComponent
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
            <FaBookOpen className="text-5xl mx-auto mb-4 opacity-80" />
            <h1 className="text-3xl font-bold mb-2">
              Topic Practice Complete: {currentTopic?.name}
            </h1>
            <p className="text-indigo-200">
              Well done! Here's your performance:
            </p>
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
                onClick={exitToTopicList}
                variant="outline"
                className="flex-1"
              >
                <FaArrowLeft className="mr-2" /> Back to Topics
              </Button>
              <Button
                onClick={restartTopicalPractice}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <FaRocket className="mr-2" /> Practice This Topic Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Practice UI
  if (
    !currentQuestion &&
    !loading &&
    !error &&
    questions.length === 0 &&
    currentTopic
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            No Questions Available for {currentTopic.name}
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any practice questions for this specific topic
            right now.
          </p>
          <Button
            onClick={() =>
              router.push(`/student/practice/subject/${currentTopic.subjectId}`)
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
          >
            <FaArrowLeft className="mr-2" /> Back to Topics
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-4xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Loading Questions...
          </h2>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  const progressPercentageDisplay =
    questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;

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
        title="Exit Topic Practice?"
        subtitle="You're practicing topic questions"
        currentProgress={{
          currentQuestion: currentQuestionIndex + 1,
          totalQuestions: questions.length,
          score: score,
          correctAnswers: questionResults.filter((r) => r.correct).length,
        }}
      />
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button
          onClick={exitToTopicList}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          {" "}
          <FaArrowLeft className="mr-1.5" /> Exit to Topics
        </button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          Practice: {currentTopic?.name || "Loading Topic..."} • Q{" "}
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
          {/* Main Question Display Area - Identical to RandomPractice */}
          <div className="p-4 md:p-8">
            <div className="mb-3 flex justify-between items-center">
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                Topic:{" "}
                {currentQuestion?.topic?.name ||
                  currentTopic?.name ||
                  "General"}
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
              "topic_practice",
              questions.length,
              currentQuestionIndex + (selectedAnswer ? 1 : 0),
              questionResults.filter((r) => r.correct).length,
              sessionFinalized,
              currentPracticeSessionId || undefined,
              "Primary School",
              currentTopic?.subjectId,
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
