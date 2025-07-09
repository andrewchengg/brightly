// src/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  PracticeSessionStatus,
  PracticeSessionType,
  QuestionType as PrismaQuestionType,
  QuestionGroup,
  DifficultyLevel,
} from "@/generated/prisma";
import safeStorage from "@/lib/safeStorage";
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
import { PracticeCompletionLoader } from "@/components/ui/PracticeCompletionLoader";
import { soundEffects } from "@/lib/soundEffects";
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
  FaBookReader,
  FaRegListAlt,
} from "react-icons/fa";

import PassageDisplay from "@/components/Practice/PassageDisplay";
import ConfettiComponent from "@/components/Confetti";
import ExitPracticeDialog from "@/components/ExitPracticeDialog";
import {
  AIAssistant,
  createPassageContext,
  createSessionContext,
  AIAssistantRef,
} from "@/components/AILearningAssistant";
import { triggerQuestRefresh } from "@/lib/quest-refresh";
import { cleanupPracticeSession } from "@/lib/session-management";

export interface OptionClient {
  id: string;
  text: string;
}
export interface QuestionClient {
  id: number;
  text: string;
  question?: string;
  options: OptionClient[];
  correctAnswer: string | string[] | Record<string, string> | null;
  hint?: string;
  explanation?: string | null;
  topic: { id: number; name: string; subjectId?: number };
  difficulty?: keyof typeof DifficultyLevel;
  pointsAwarded?: number;
  marks?: number;
  questionType?: keyof typeof PrismaQuestionType;
  imageUrl?: string;
  topicName?: string;
  questionNumberOnPage?: string;
}
interface LocalStorageClozePracticeProgress {
  questionGroupId: number;
  passageTitle: string;
  passageContent: string | null;
  audioUrl?: string | null;
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
  totalMarksEarned: number | null;
  totalPossibleMarks: number | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  xpEarned: number | null;
  studentAnswers: StudentAnswerData[];
}

interface ProgressState {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  totalMarksEarned: number;
  totalPossibleMarks: number;
  xpEarned: number;
}

export default function ClozePassagePracticePage() {
  const router = useRouter();
  const params = useParams();
  const questionGroupIdParam = params.questionGroupId as string;
  const numericQuestionGroupId = parseInt(questionGroupIdParam, 10);

  // State variables
  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [splitPosition, setSplitPosition] = useState(65);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<number, string | Record<string, string>>
  >({});
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    LocalStorageClozePracticeProgress["questionResults"]
  >([]);

  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<
    string | null
  >(null);
  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiAssistantRef = useRef<AIAssistantRef>(null);

  const localStorageKey = userId
    ? `clozeInlinePracticeProgress_${userId}_${numericQuestionGroupId}`
    : null;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [progress, setProgress] = useState<ProgressState>({
    currentQuestion: 0,
    totalQuestions: 0,
    score: 0,
    correctAnswers: 0,
    totalMarksEarned: 0,
    totalPossibleMarks: 0,
    xpEarned: 0,
  });

  // Function to pass text to the AI assistant
  const addTextToAI = (text: string) => {
    aiAssistantRef.current?.addTextToInput(text);
  };

  useEffect(() => {
    if (authUserIsLoaded) {
      setUserId(authUser?.id || null);
    }
  }, [authUser, authUserIsLoaded]);

  // Delete session when user closes window or navigates away (only if not completed)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPracticeSessionId && !sessionFinalized) {
        console.log(
          "🗑️ DEBUG: Window closing - deleting incomplete session:",
          currentPracticeSessionId
        );
        // Use sendBeacon for reliable cleanup during page unload
        navigator.sendBeacon(
          `/api/practice-sessions/${currentPracticeSessionId}`,
          JSON.stringify({ method: "DELETE" })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && currentPracticeSessionId && !sessionFinalized) {
        console.log(
          "🗑️ DEBUG: Page hidden - deleting incomplete session:",
          currentPracticeSessionId
        );
        // User switched tabs or minimized - clean up session
        fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
          method: "DELETE",
        }).catch((err) => {
          console.warn("Failed to delete session on visibility change:", err);
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Final cleanup on component unmount - only delete if not completed
      if (currentPracticeSessionId && !sessionFinalized) {
        console.log(
          "🗑️ DEBUG: Component unmount - deleting incomplete session:",
          currentPracticeSessionId
        );
        fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
          method: "DELETE",
        }).catch(() => {});
      } else if (currentPracticeSessionId && sessionFinalized) {
        console.log(
          "✅ DEBUG: Component unmount - keeping completed session:",
          currentPracticeSessionId
        );
      }
    };
  }, [currentPracticeSessionId, sessionFinalized]);

  const createNewSession = useCallback(
    async (fetchedQuestions: QuestionClient[], groupData: QuestionGroup) => {
      if (!userId) {
        setError("User info missing.");
        return null;
      }
      const firstQSubjectId = fetchedQuestions[0]?.topic?.subjectId;
      setCurrentSubjectId(firstQSubjectId || null);
      try {
        const response = await fetch("/api/practice-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: userId,
            title: `Cloze: ${groupData.name}`,
            type: PracticeSessionType.QUESTION_GROUP_PRACTICE,
            status: PracticeSessionStatus.IN_PROGRESS,
            totalQuestions: fetchedQuestions.length,
            subjectId: firstQSubjectId,
            basedOnQuestionGroupId: numericQuestionGroupId,
          }),
        });
        if (!response.ok) {
          const d = await response
            .json()
            .catch(() => ({ error: { message: "Session creation failed" } }));
          throw new Error(
            d.error?.message || d.error || "Session creation failed"
          );
        }
        const sD = await response.json();
        setCurrentPracticeSessionId(sD.id);
        return sD.id;
      } catch (e: any) {
        setError(`Session start error: ${e.message}`);
        return null;
      }
    },
    [userId, numericQuestionGroupId]
  );

  const fetchContentAndStart = useCallback(async () => {
    if (!userId || !numericQuestionGroupId || isNaN(numericQuestionGroupId))
      return;
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setLoading("fetching-group");
    setError(null);
    setPassageTitle("");
    setPassageContent(null);
    setQuestions([]);
    setScore(0);
    setAnsweredQuestions({});
    setQuestionResults([]);
    setSessionFinalized(false);
    setCurrentPracticeSessionId(null);
    setCurrentSubjectId(null);
    try {
      const response = await fetch(
        `/api/questions/question-group/${numericQuestionGroupId}`
      );
      if (!response.ok) {
        const d = await response.json().catch(() => ({
          error: { message: `API error ${response.status}` },
        }));
        throw new Error(
          d.error?.message || d.error || `API error ${response.status}`
        );
      }
      const data: {
        questionGroup: QuestionGroup;
        questions: QuestionClient[];
      } = await response.json();
      if (!data.questionGroup) throw new Error("No group data from API.");
      setPassageContent(data.questionGroup.description || "");
      setPassageTitle(data.questionGroup.name || "Cloze Passage");
      const fQ = data.questions || [];
      if (fQ.length === 0 && !data.questionGroup.description?.trim())
        throw new Error("No passage or questions found.");
      setQuestions(fQ);
      if (fQ.length > 0 && fQ[0].topic?.subjectId)
        setCurrentSubjectId(fQ[0].topic.subjectId);
      const sId = await createNewSession(fQ, data.questionGroup);
      if (!sId) setError("Failed to start new session in DB.");
    } catch (e: any) {
      setError(e.message || "Failed to load content.");
      setPassageTitle("Error");
      setPassageContent("Load error.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, numericQuestionGroupId, createNewSession, localStorageKey]);

  useEffect(() => {
    if (
      !userId ||
      !numericQuestionGroupId ||
      isNaN(numericQuestionGroupId) ||
      !localStorageKey
    ) {
      return;
    }
    const attemptLoadOrFetch = async () => {
      setLoading(true);
      setError(null);
      const savedProgressString = safeStorage.getItem(localStorageKey, "local");
      let resumableSessionFound = false;
      if (savedProgressString) {
        setLoading("resuming-session");
        try {
          const progress: LocalStorageClozePracticeProgress =
            JSON.parse(savedProgressString);
          if (
            progress.questionGroupId === numericQuestionGroupId &&
            !progress.sessionFinalized &&
            progress.practiceSessionId
          ) {
            setPassageTitle(progress.passageTitle);
            setPassageContent(progress.passageContent);
            setQuestions(progress.questions || []);
            setScore(progress.score || 0);
            setAnsweredQuestions(
              (progress.answeredQuestions as Record<
                number,
                string | Record<string, string>
              >) || {}
            );
            setQuestionResults(progress.questionResults || []);
            setCurrentPracticeSessionId(progress.practiceSessionId);
            setCurrentSubjectId(progress.subjectId || null);
            setSessionFinalized(false);
            resumableSessionFound = true;
          } else {
            safeStorage.removeItem(localStorageKey, "local");
          }
        } catch (error) {
          console.error("Error parsing saved progress:", error);
          safeStorage.removeItem(localStorageKey, "local");
        }
      }
      if (!resumableSessionFound) {
        await fetchContentAndStart();
      } else {
        setLoading(false);
      }
      setInitialLoadComplete(true);
    };
    if (!initialLoadComplete) {
      attemptLoadOrFetch();
    }
  }, [
    userId,
    numericQuestionGroupId,
    localStorageKey,
    fetchContentAndStart,
    initialLoadComplete,
  ]);

  useEffect(() => {
    if (
      !localStorageKey ||
      typeof loading === "string" ||
      loading ||
      !userId ||
      !currentPracticeSessionId ||
      showSummary ||
      !initialLoadComplete
    )
      return;
    const contentToSave = passageContent === null ? "" : passageContent;
    const progress: LocalStorageClozePracticeProgress = {
      questionGroupId: numericQuestionGroupId,
      passageTitle,
      passageContent: contentToSave,
      questions,
      score,
      questionResults,
      sessionFinalized,
      practiceSessionId: currentPracticeSessionId,
      subjectId: currentSubjectId,
      answeredQuestions: answeredQuestions as Record<
        number,
        string | Record<string, string>
      >,
      currentQuestionIndex: 0,
    };
    safeStorage.setItem(localStorageKey, JSON.stringify(progress), "local");
  }, [
    questions,
    score,
    questionResults,
    sessionFinalized,
    loading,
    userId,
    currentPracticeSessionId,
    showSummary,
    numericQuestionGroupId,
    passageTitle,
    passageContent,
    currentSubjectId,
    localStorageKey,
    initialLoadComplete,
    answeredQuestions,
  ]);

  const awardXPAndStreak = useCallback(
    async (xpToAdd: number) => {
      if (!userId || sessionFinalized || xpToAdd < 0) return null;
      console.log(
        `Attempting to award ${xpToAdd} XP and update streak for user: ${userId}`
      );
      let levelUpDetails = null;
      try {
        if (xpToAdd > 0) {
          const xpResponse = await fetch("/api/user/award-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              xpAmount: xpToAdd,
              activityType: "cloze_practice_completion",
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

        const streakResponse = await fetch("/api/user/update-streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType: "cloze_practice_completion" }),
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
  const saveStudentAnswerToDb = useCallback(
    async (
      question: QuestionClient,
      userAnswer: string,
      isCorrect: boolean,
      points: number
    ) => {
      /* ... same logic ... */
    },
    [currentPracticeSessionId]
  );
  const finalizePracticeSessionInDb = useCallback(async () => {
    if (
      !currentPracticeSessionId ||
      !userId ||
      !localStorageKey ||
      !sessionFinalized
    )
      return;
    setLoading("submitting");
    try {
      const finalScore = questionResults.reduce(
        (sum, r) =>
          sum +
          (r.correct
            ? questions.find((q) => q.id === r.id)?.pointsAwarded || 2
            : 0),
        0
      );
      const finalCorrectCount = questionResults.filter((r) => r.correct).length;
      const response = await fetch(`/api/practice-session/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentPracticeSessionId,
          score: finalScore,
          correctAnswers: finalCorrectCount,
          xpEarned: finalScore,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to finalize session");
      }
      const levelUpInfo = await awardXPAndStreak(finalScore);
      if (levelUpInfo) {
        setNewLevel(levelUpInfo.newLevel);
        setShowLevelUp(true);
      }
      if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
      toast.success("Cloze passage practice completed!");

      // Refresh quest progress after completion
      triggerQuestRefresh();
    } catch (err: any) {
      toast.error(`Session finalization error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    currentPracticeSessionId,
    userId,
    localStorageKey,
    sessionFinalized,
    awardXPAndStreak,
    questions,
    questionResults,
    setNewLevel,
    setShowLevelUp,
  ]);

  const handleInlineAnswerSelect = (
    questionId: number,
    selectedOptionId: string
  ) => {
    if (sessionFinalized) return;
    setAnsweredQuestions((prev) => ({
      ...prev,
      [questionId]: selectedOptionId,
    }));
  };

  const handleSubmitAllAnswers = useCallback(async () => {
    if (sessionFinalized) return;
    let calculatedScore = 0;
    const results: LocalStorageClozePracticeProgress["questionResults"] = [];
    questions.forEach((q) => {
      const userAnswerId = answeredQuestions[q.id] as string | undefined;
      let isCorrect = false;
      let points = 0;
      if (userAnswerId !== undefined) {
        isCorrect =
          String(q.correctAnswer ?? "").toLowerCase() ===
          userAnswerId.toLowerCase();
        if (isCorrect) {
          points = q.marks || 0;
          calculatedScore += points;
        }
      }
      results.push({
        id: q.id,
        correct: isCorrect,
        question: q.text || `Blank ${q.questionNumberOnPage}`,
        userAnswer: userAnswerId === undefined ? "Not Answered" : userAnswerId,
        correctAnswer: q.correctAnswer,
      });
      if (userAnswerId !== undefined)
        saveStudentAnswerToDb(q, userAnswerId, isCorrect, points);
    });
    setScore(calculatedScore);
    setQuestionResults(results);
    setSessionFinalized(true);
    await finalizePracticeSessionInDb();
    // Do not automatically show summary - stay on passage page with feedback
  }, [
    questions,
    answeredQuestions,
    sessionFinalized,
    saveStudentAnswerToDb,
    finalizePracticeSessionInDb,
  ]);

  const restartPractice = useCallback(async () => {
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setShowSummary(false);
    setShowLevelUp(false);
    setSessionFinalized(false);
    setInitialLoadComplete(false); /* Re-trigger initial load */
  }, [
    localStorageKey /* fetchContentAndStart is implicitly re-run due to initialLoadComplete change */,
  ]);
  const handleExitConfirm = useCallback(() => {
    console.log(
      "🚪 DEBUG: User confirmed exit - deleting session and navigating"
    );

    // Delete session immediately
    if (currentPracticeSessionId) {
      fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: "DELETE",
      }).catch((err) => {
        console.warn("Failed to delete practice session:", err);
      });
    }

    // Clear localStorage
    if (localStorageKey) {
      safeStorage.removeItem(localStorageKey, "local");
    }

    // Navigate away
    if (currentSubjectId) {
      router.push(`/student/practice/subject/${currentSubjectId}`);
    } else {
      router.push("/student/practice/subject/4");
    }
  }, [currentSubjectId, router, currentPracticeSessionId, localStorageKey]);

  const exitToSubjectPractice = useCallback(() => {
    setShowExitDialog(true);
  }, []);

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

  // Practice Completion Loading (when submitting results)
  if (typeof loading === "string" && loading === "submitting") {
    return (
      <PracticeCompletionLoader
        studentName={authUser?.user_metadata?.name || "Student"}
        sessionType={`Chinese Cloze: ${passageTitle || "Passage Practice"}`}
      />
    );
  }

  const isPageLoading =
    !initialLoadComplete && (loading === true || typeof loading === "string");

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Preparing Cloze Passage
          </h2>
          <p className="text-gray-600 mb-4">Loading passage and questions...</p>
        </div>
      </div>
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
              onClick={fetchContentAndStart}
            >
              <FaRedo className="mr-2" /> Try Again
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
              onClick={exitToSubjectPractice}
            >
              <FaArrowLeft className="mr-2" /> Back to Subject Practice
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (showSummary) {
    const totalPossibleScore = questions.reduce(
      (acc, q) => acc + (q.marks || 0),
      0
    );
    const percentageCorrect =
      totalPossibleScore > 0 && questions.length > 0
        ? Math.round((score / totalPossibleScore) * 100)
        : 0;
    const correctCount = questionResults.filter((r) => r.correct).length;
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {" "}
        {showLevelUp && (
          <LevelUpNotification
            level={newLevel}
            onClose={() => setShowLevelUp(false)}
          />
        )}{" "}
        <ConfettiComponent
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {" "}
          <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
            {" "}
            <FaBookReader className="text-5xl mx-auto mb-4 opacity-80" />{" "}
            <h1 className="text-3xl font-bold mb-2">
              Cloze Passage Complete: {passageTitle}
            </h1>{" "}
            <p className="text-indigo-200">
              Well done! Here is your performance:
            </p>{" "}
          </div>{" "}
          <div className="p-6 md:p-8">
            {" "}
            <div className="text-center mb-8">
              {" "}
              <p className="text-6xl font-bold text-indigo-600">
                {questions.length > 0 ? `${percentageCorrect}%` : "N/A"}
              </p>{" "}
              <p className="text-gray-600 mt-1">
                Your Score: {score} / {totalPossibleScore}
              </p>{" "}
              <p className="text-amber-500 font-semibold mt-1">
                XP Earned: +{score}
              </p>{" "}
            </div>{" "}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {" "}
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 uppercase">
                  Total Questions
                </p>
                <p className="text-2xl font-semibold text-gray-700">
                  {questions.length}
                </p>
              </div>{" "}
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 uppercase">
                  Correct Answers
                </p>
                <p className="text-2xl font-semibold text-green-600">
                  {correctCount} / {questions.length}
                </p>
              </div>{" "}
            </div>{" "}
            {questions.length > 0 && (
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
                          {result.question.startsWith("Blank")
                            ? result.question.substring(0, 15)
                            : `Blank ${
                                questions.find((q) => q.id === result.id)
                                  ?.questionNumberOnPage || index + 1
                              }`}
                        </h4>
                        <div className="flex items-center">
                          {result.correct ? (
                            <div className="flex items-center text-green-600">
                              <FaCheck className="mr-1" />
                              <span className="text-xs font-medium">
                                Correct
                              </span>
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
            )}{" "}
            <div className="flex flex-col sm:flex-row gap-3">
              {" "}
              <Button
                onClick={exitToSubjectPractice}
                variant="outline"
                className="flex-1"
              >
                <FaArrowLeft className="mr-2" /> Back to Subject
              </Button>{" "}
              <Button
                onClick={restartPractice}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <FaRocket className="mr-2" /> Practice This Passage Again
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
  if (passageContent === null && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Content Not Available
          </h2>
          <p className="text-gray-600 mb-6">
            The passage content for this practice section could not be loaded.
          </p>
          <Button
            onClick={exitToSubjectPractice}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
          >
            <FaArrowLeft className="mr-2" /> Back to Subject
          </Button>
        </div>
      </div>
    );
  }

  const noQuestionsAndNoPassage =
    (passageContent === null || passageContent.trim() === "") &&
    questions.length === 0 &&
    !loading;

  return (
    <div
      className="flex flex-col h-screen bg-gray-100 overflow-hidden"
      ref={containerRef}
    >
      {showLevelUp && (
        <LevelUpNotification
          level={newLevel}
          onClose={() => setShowLevelUp(false)}
        />
      )}
      <ExitPracticeDialog
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onExit={handleExitConfirm}
        title="Exit Cloze Practice?"
        subtitle="You're working on a Chinese cloze passage"
        currentProgress={{
          currentQuestion: 1,
          totalQuestions: questions.length,
          score: score,
          correctAnswers: questionResults.filter((r) => r.correct).length,
        }}
      />
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm sticky top-0 z-10">
        <button
          onClick={exitToSubjectPractice}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          <FaArrowLeft className="mr-1.5" /> Exit
        </button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          {passageTitle || "Cloze Passage Practice"}
          {questions.length > 0 && ` (${questions.length} blanks)`}
        </div>
        <div className="text-amber-600 font-semibold text-sm md:text-base">
          {score} XP
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="overflow-auto bg-white custom-scrollbar p-4 md:p-6"
          style={{
            width: `${sessionFinalized && showSummary ? 100 : splitPosition}%`,
          }}
        >
          <PassageDisplay
            passageTitle={passageTitle}
            passageContent={passageContent}
            questions={questions}
            answeredQuestions={answeredQuestions}
            onAnswerSelect={handleInlineAnswerSelect}
            submitted={sessionFinalized}
            questionResults={questionResults}
            onAddTextToAIContext={addTextToAI}
          />
          {noQuestionsAndNoPassage && (
            <p className="text-center text-gray-500 py-10">
              No content loaded.
            </p>
          )}

          {questions.length > 0 && !sessionFinalized && (
            <div className="mt-8 pt-6 border-t">
              <Button
                onClick={handleSubmitAllAnswers}
                disabled={
                  typeof loading === "string" && loading === "submitting"
                }
                className="w-full md:w-auto mx-auto flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-3 px-8 text-lg"
              >
                {" "}
                {typeof loading === "string" && loading === "submitting" ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : (
                  <FaCheck className="mr-2" />
                )}{" "}
                Check Answers{" "}
              </Button>
            </div>
          )}
          {sessionFinalized && questions.length > 0 && !showSummary && (
            <div className="mt-8 pt-6 border-t bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
              <div className="text-center mb-4">
                <FaCheck className="text-green-600 text-3xl mx-auto mb-2" />
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  Great job! Your answers have been submitted.
                </p>
                <p className="text-gray-600 mb-3">
                  Review your performance above - correct answers are
                  highlighted in green, incorrect ones in red.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="flex items-center text-green-700">
                    <FaCheck className="mr-1" />
                    {questionResults.filter((r) => r.correct).length} Correct
                  </span>
                  <span className="flex items-center text-red-600">
                    <FaTimes className="mr-1" />
                    {questionResults.filter((r) => !r.correct).length} Incorrect
                  </span>
                  <span className="flex items-center text-amber-600">
                    <FaTrophy className="mr-1" />
                    {score} XP Earned
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    setShowSummary(true);
                    setShowConfetti(true);
                    // Play level up sound for session completion
                    soundEffects.playLevelUpSound();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <FaChartBar className="mr-2" />
                  View Detailed Summary
                </Button>
                <Button
                  onClick={restartPractice}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <FaRedo className="mr-2" />
                  Practice Again
                </Button>
              </div>
            </div>
          )}
          {passageContent &&
            passageContent.trim() !== "" &&
            questions.length === 0 &&
            !sessionFinalized && (
              <div className="mt-8 pt-6 border-t text-center">
                <p className="text-gray-600">
                  You have reviewed the passage. No questions to answer for this
                  item.
                </p>
                <Button
                  onClick={handleSubmitAllAnswers}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  Mark as Complete & View Summary
                </Button>
              </div>
            )}
        </div>

        {!(sessionFinalized && showSummary) && (
          <>
            <div
              className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150"
              onMouseDown={handleMouseDown}
            >
              <div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div>
            </div>
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: `${100 - splitPosition - 0.5}%` }}
            >
              <AIAssistant
                ref={aiAssistantRef}
                passageContext={
                  passageContent
                    ? createPassageContext(passageContent, passageTitle)
                    : undefined
                }
                sessionContext={createSessionContext(
                  "cloze_passage",
                  questions.length,
                  Object.keys(answeredQuestions).length,
                  questionResults.filter((r) => r.correct).length,
                  sessionFinalized,
                  currentPracticeSessionId || undefined,
                  "Primary School"
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
