// src/app/(dashboard)/student/weekly-challenge/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  PracticeSessionStatus,
  QuestionType,
  PracticeSessionType,
} from "@/generated/prisma";
import safeStorage from "@/lib/safeStorage";
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
import {
  FaPlay,
  FaRedo,
  FaHistory,
  FaHourglassHalf,
  FaArrowLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaTrophy,
  FaFire,
  FaClock,
  FaLightbulb,
  FaStar,
  FaChartLine,
  FaBullseye,
  FaMedal,
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
  topic: { id: number; name: string; subjectId?: number };
  difficulty?: string;
  pointsAwarded?: number;
  questionType?: keyof typeof QuestionType;
  imageUrl?: string;
}
interface AttemptHistoryItem {
  id: string;
  status: keyof typeof PracticeSessionStatus;
  score?: number | null;
  totalQuestions?: number | null;
  startTime: string;
  endTime?: string | null;
  examDurationMinutes?: number | null;
}
interface LocalStorageWeeklyChallengeProgress {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string | Record<string, string>>;
  questionResults: {
    id: number; // question ID
    correct: boolean;
    question: string; // question text
    userAnswer: string | Record<string, string>;
    correctAnswer: string | string[] | Record<string, string> | null;
    // Add options and questionType if needed for rendering in summary
    options?: OptionClient[];
    questionType?: keyof typeof QuestionType;
  }[];
  sessionFinalized?: boolean;
  practiceSessionId: string;
  challengeWeekIdentifier: string;
  sessionStartTime: string;
  timeLeftAtSave: number;
}

const CHALLENGE_DURATION_MINUTES_DEFAULT = 20;
const CHALLENGE_POINTS_PER_QUESTION = 20;
const CHALLENGE_QUESTION_COUNT = 5;

export default function WeeklyChallengePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerForUI, setSelectedAnswerForUI] = useState<string | null>(
    null
  );
  const [textAnswer, setTextAnswer] = useState("");
  const [multiPartAnswers, setMultiPartAnswers] = useState<
    Record<string, string>
  >({});

  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<
    "initial" | "status" | "session" | "submitting" | false
  >("initial");
  const [error, setError] = useState<string | null>(null);

  const [viewState, setViewState] = useState<
    "landing" | "challenge" | "summary"
  >("landing");
  const [attemptHistory, setAttemptHistory] = useState<AttemptHistoryItem[]>(
    []
  );
  const [resumableSessionId, setResumableSessionId] = useState<string | null>(
    null
  );

  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(
    null
  );
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<number, string | Record<string, string>>
  >({});
  const [questionResults, setQuestionResults] = useState<
    LocalStorageWeeklyChallengeProgress["questionResults"]
  >([]);
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [currentChallengeWeekId, setCurrentChallengeWeekId] = useState<
    string | undefined
  >();
  const [sessionDetailsForSummary, setSessionDetailsForSummary] = useState<
    AttemptHistoryItem | any | null
  >(null);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  const [timeLeft, setTimeLeft] = useState(
    CHALLENGE_DURATION_MINUTES_DEFAULT * 60
  );
  const [sessionStartTimeISO, setSessionStartTimeISO] = useState<string | null>(
    null
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  // ... (useEffect for authUser, fetchChallengeStatus, loadSession - no changes) ...
  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else {
        toast.error("User session not found.");
        router.push("/sign-in");
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  const fetchChallengeStatus = useCallback(async () => {
    if (!userId) return;
    setLoading("status");
    setError(null);
    try {
      const response = await fetch("/api/student/weekly-challenge/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_STATUS" }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to fetch challenge status.");
      setAttemptHistory(data.attempts || []);
      setResumableSessionId(data.resumableSessionId || null);
      setCurrentChallengeWeekId(data.challengeWeekId);
      setViewState("landing");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && viewState === "landing" && loading === "initial") {
      fetchChallengeStatus();
    }
  }, [userId, viewState, fetchChallengeStatus, loading]);

  const loadSession = useCallback(
    async (actionType: "START_NEW_ATTEMPT" | "RESUME_SESSION") => {
      if (!userId) return;
      setLoading("session");
      setError(null);

      const body =
        actionType === "RESUME_SESSION" && resumableSessionId
          ? { action: "RESUME_SESSION", sessionId: resumableSessionId }
          : { action: "START_NEW_ATTEMPT" };

      try {
        const response = await fetch("/api/student/weekly-challenge/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error ||
              `Failed to ${
                actionType === "START_NEW_ATTEMPT" ? "start new" : "resume"
              } challenge.`
          );

        setPracticeSessionId(data.practiceSessionId);
        const fetchedQuestions = data.questions || [];
        setQuestions(fetchedQuestions);
        setSessionStartTimeISO(data.sessionDetails.startTime);
        const durationFromApi =
          data.sessionDetails.examDurationMinutes ||
          CHALLENGE_DURATION_MINUTES_DEFAULT;

        const progressKey = `wc_attempt_${data.practiceSessionId}`;
        const savedProgressString = safeStorage.getItem(progressKey, "local");

        if (
          actionType === "RESUME_SESSION" &&
          savedProgressString &&
          data.sessionDetails
        ) {
          try {
            const progress: LocalStorageWeeklyChallengeProgress =
              JSON.parse(savedProgressString);
            if (!progress.sessionFinalized) {
              setQuestions(
                progress.questions &&
                  progress.questions.length === fetchedQuestions.length
                  ? progress.questions
                  : fetchedQuestions
              );
              setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
              setScore(progress.score || 0);
              setAnsweredQuestions(progress.answeredQuestions || {});
              setQuestionResults(progress.questionResults || []);
              setSessionFinalized(false);
              setTimeLeft(
                progress.timeLeftAtSave !== undefined
                  ? progress.timeLeftAtSave
                  : durationFromApi * 60
              );
            } else {
              safeStorage.removeItem(progressKey, "local");
              setTimeLeft(durationFromApi * 60);
            }
          } catch (e) {
            console.error(
              "Error parsing saved progress, starting fresh for session.",
              e
            );
            safeStorage.removeItem(progressKey, "local");
            setTimeLeft(durationFromApi * 60);
          }
        } else {
          setCurrentQuestionIndex(0);
          setScore(0);
          setAnsweredQuestions({});
          setQuestionResults([]);
          setSessionFinalized(false);
          setTimeLeft(durationFromApi * 60);
          safeStorage.removeItem(progressKey, "local");
        }
        setCurrentChallengeWeekId(data.sessionDetails.challengeWeekIdentifier);
        setViewState("challenge");
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
        setViewState("landing");
      } finally {
        setLoading(false);
      }
    },
    [userId, resumableSessionId]
  );

  const awardXPAndStreak = useCallback(
    async (xpAmount: number) => {
      // ... (same)
      if (!userId || xpAmount < 0) return null;
      let levelUpDetails = null;
      try {
        if (xpAmount > 0) {
          const xpResponse = await fetch("/api/user/award-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              xpAmount,
              activityType: "weekly_challenge_completion",
            }),
          });
          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            toast.success(`+${xpData.awarded || xpAmount} XP earned!`);
            if (xpData.leveledUp) {
              levelUpDetails = { newLevel: xpData.level };
            }
          } else {
            toast.warn("Could not award XP.");
          }
        }
        await fetch("/api/user/update-streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType: "weekly_challenge_completion" }),
        });
      } catch (error) {
        console.error("Error awarding XP/Streak", error);
      }
      return levelUpDetails;
    },
    [userId]
  );

  const saveStudentAnswerToDb = useCallback(
    async (
      question: QuestionClient,
      userAnswer: string | Record<string, string>,
      isCorrect: boolean,
      points: number
    ) => {
      // ... (same)
      if (!practiceSessionId) {
        return;
      }
      try {
        await fetch("/api/student-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practiceSessionId: practiceSessionId,
            questionId: question.id,
            submittedAnswer: userAnswer,
            isCorrect,
            pointsEarned: points,
            attemptedAt: new Date().toISOString(),
          }),
        });
      } catch (err: any) {
        console.error(
          `Answer save failed for QID ${question.id}: ${err.message}`
        );
      }
    },
    [practiceSessionId]
  );

  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!practiceSessionId || !userId || sessionFinalized) return;
    setLoading("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    let finalCalculatedScore = 0; // Use a different variable name to avoid confusion with 'score' state
    const finalCalculatedQuestionResults: LocalStorageWeeklyChallengeProgress["questionResults"] =
      [];

    questions.forEach((q) => {
      const userAnswerContent = answeredQuestions[q.id];
      let isCorrect = false;
      let pointsEarnedThisQuestion = 0;

      if (userAnswerContent !== undefined) {
        if (
          q.questionType === QuestionType.OPEN_ENDED ||
          q.questionType === QuestionType.FILL_IN_THE_BLANK
        ) {
          const cAns = q.correctAnswer;
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
          isCorrect = cAnsArr.includes(
            String(userAnswerContent).trim().toLowerCase()
          );
        } else if (
          q.questionType === QuestionType.MULTI_PART &&
          typeof q.correctAnswer === "object" &&
          q.correctAnswer &&
          !Array.isArray(q.correctAnswer)
        ) {
          const correctAnswersMap = q.correctAnswer as Record<string, string>;
          isCorrect = true;
          for (const part in correctAnswersMap) {
            if (
              ((userAnswerContent as Record<string, string>)[part] || "")
                .trim()
                .toLowerCase() !==
              String(correctAnswersMap[part]).trim().toLowerCase()
            ) {
              isCorrect = false;
              break;
            }
          }
        } else {
          // MCQ
          isCorrect =
            String(q.correctAnswer || "").toLowerCase() ===
            String(userAnswerContent).toLowerCase();
        }
        if (isCorrect) {
          pointsEarnedThisQuestion = CHALLENGE_POINTS_PER_QUESTION;
          finalCalculatedScore += pointsEarnedThisQuestion;
        }
      }
      // Store original question details along with user's answer for detailed summary
      finalCalculatedQuestionResults.push({
        id: q.id,
        correct: isCorrect,
        question: q.text || "",
        userAnswer:
          userAnswerContent === undefined ? "Not Answered" : userAnswerContent,
        correctAnswer: q.correctAnswer,
        options: q.options, // Include options for rendering summary
        questionType: q.questionType, // Include questionType
      });
      saveStudentAnswerToDb(
        q,
        userAnswerContent === undefined ? "Not Answered" : userAnswerContent,
        isCorrect,
        pointsEarnedThisQuestion
      );
    });

    setQuestionResults(finalCalculatedQuestionResults);
    setScore(finalCalculatedScore);

    try {
      const response = await fetch(
        `/api/practice-session/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: practiceSessionId,
            score: finalCalculatedScore,
            correctAnswers: finalCalculatedQuestionResults.filter(
              (r) => r.correct
            ).length,
            xpEarned: finalCalculatedScore,
            durationSeconds: CHALLENGE_DURATION_MINUTES_DEFAULT * 60 - timeLeft,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to finalize session");
      }

      const updatedSessionDetails = await response.json();
      setSessionDetailsForSummary(updatedSessionDetails);
      setSessionFinalized(true);
      setViewState("summary");

      const levelUpDetails = await awardXPAndStreak(finalCalculatedScore);
      if (levelUpDetails) {
        setNewLevel(levelUpDetails.newLevel);
        setShowLevelUp(true);
      }

      const progressKey = `wc_attempt_${practiceSessionId}`;
      safeStorage.removeItem(progressKey, "local");

      toast.success("Weekly Challenge completed and results saved!");
      setAttemptHistory((prev) => {
        const newAttempt: AttemptHistoryItem = {
          id: practiceSessionId!,
          status: PracticeSessionStatus.COMPLETED,
          score: finalCalculatedScore,
          totalQuestions: questions.length,
          startTime: sessionStartTimeISO || new Date().toISOString(),
          endTime: new Date().toISOString(),
          examDurationMinutes: CHALLENGE_DURATION_MINUTES_DEFAULT,
        };
        const existingAttemptIndex = prev.findIndex(
          (att) => att.id === practiceSessionId
        );
        if (existingAttemptIndex > -1) {
          const newHistory = [...prev];
          newHistory[existingAttemptIndex] = newAttempt;
          return newHistory.sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          ); // Re-sort
        }
        return [newAttempt, ...prev].sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      });
    } catch (err: any) {
      toast.error(`Session finalization error: ${err.message}`);
      console.error("Finalization error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    practiceSessionId,
    userId,
    sessionFinalized,
    questions,
    answeredQuestions,
    awardXPAndStreak,
    timeLeft,
    saveStudentAnswerToDb,
    sessionStartTimeISO,
    setNewLevel,
    setShowLevelUp,
  ]);

  const handleNextQuestion = useCallback(
    async (forceSubmitDueToTimeUp = false) => {
      setSelectedAnswerForUI(null);
      setTextAnswer("");
      setMultiPartAnswers({});

      if (
        forceSubmitDueToTimeUp ||
        currentQuestionIndex >= questions.length - 1
      ) {
        await finalizePracticeSessionInDb();
      } else {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      }
    },
    [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]
  );

  // ... (Timer effect, localStorage saving, currentQuestion answer state loading - no changes needed here) ...
  useEffect(() => {
    if (viewState !== "challenge" || sessionFinalized || timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast.warn("Time's up! Submitting your challenge.");
          handleNextQuestion(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState, sessionFinalized, timeLeft, handleNextQuestion]);

  useEffect(() => {
    if (
      viewState !== "challenge" ||
      !userId ||
      loading ||
      questions.length === 0 ||
      !practiceSessionId ||
      !currentChallengeWeekId ||
      sessionFinalized
    )
      return;

    const progressKey = `wc_attempt_${practiceSessionId}`;
    const durationForCalc =
      practiceSessionId &&
      attemptHistory.find((att) => att.id === practiceSessionId)
        ?.examDurationMinutes
        ? attemptHistory.find((att) => att.id === practiceSessionId)!
            .examDurationMinutes!
        : CHALLENGE_DURATION_MINUTES_DEFAULT;
    const timeSpentSeconds = durationForCalc * 60 - timeLeft;

    const progress: LocalStorageWeeklyChallengeProgress = {
      questions,
      currentQuestionIndex,
      score,
      answeredQuestions,
      questionResults,
      sessionFinalized,
      practiceSessionId,
      challengeWeekIdentifier: currentChallengeWeekId,
      sessionStartTime: sessionStartTimeISO!,
      timeLeftAtSave: timeLeft,
    };
    safeStorage.setItem(progressKey, JSON.stringify(progress), "local");
  }, [
    questions,
    currentQuestionIndex,
    score,
    answeredQuestions,
    questionResults,
    sessionFinalized,
    loading,
    userId,
    practiceSessionId,
    currentChallengeWeekId,
    timeLeft,
    sessionStartTimeISO,
    viewState,
    attemptHistory,
  ]);

  useEffect(() => {
    if (currentQuestion && viewState === "challenge") {
      const savedUserAnswerContent = answeredQuestions[currentQuestion.id];

      setTextAnswer("");
      setMultiPartAnswers({});
      setSelectedAnswerForUI(null);

      if (savedUserAnswerContent !== undefined) {
        setSelectedAnswerForUI(
          typeof savedUserAnswerContent === "string"
            ? savedUserAnswerContent
            : JSON.stringify(savedUserAnswerContent)
        );
        const questionType = currentQuestion.questionType;
        if (
          questionType === QuestionType.OPEN_ENDED ||
          questionType === QuestionType.FILL_IN_THE_BLANK
        ) {
          if (typeof savedUserAnswerContent === "string")
            setTextAnswer(savedUserAnswerContent);
        } else if (questionType === QuestionType.MULTI_PART) {
          if (
            typeof savedUserAnswerContent === "object" &&
            savedUserAnswerContent !== null
          )
            setMultiPartAnswers(
              savedUserAnswerContent as Record<string, string>
            );
        }
      }
    }
  }, [
    currentQuestionIndex,
    questions,
    answeredQuestions,
    viewState,
    currentQuestion,
  ]);

  const handleSubmitAnswer = useCallback(
    (userAns: string | Record<string, string>) => {
      if (!currentQuestion) return;
      setAnsweredQuestions((prev) => ({
        ...prev,
        [currentQuestion.id]: userAns,
      }));
      setSelectedAnswerForUI(
        typeof userAns === "string" ? userAns : JSON.stringify(userAns)
      );
    },
    [currentQuestion]
  );

  const handleAnswerMCQ = useCallback(
    (optionId: string) => {
      if (
        !currentQuestion ||
        answeredQuestions[currentQuestion.id] !== undefined
      )
        return;
      handleSubmitAnswer(optionId);
    },
    [currentQuestion, answeredQuestions, handleSubmitAnswer]
  );

  const handleTextAnswerSubmit = useCallback(() => {
    if (
      !textAnswer.trim() ||
      !currentQuestion ||
      answeredQuestions[currentQuestion.id] !== undefined
    )
      return;
    const userAnswer = textAnswer.trim();
    handleSubmitAnswer(userAnswer);
  }, [textAnswer, currentQuestion, answeredQuestions, handleSubmitAnswer]);

  const isMultiPartComplete = useCallback(() => {
    if (
      !currentQuestion ||
      currentQuestion.questionType !== QuestionType.MULTI_PART ||
      typeof currentQuestion.correctAnswer !== "object" ||
      currentQuestion.correctAnswer === null ||
      Array.isArray(currentQuestion.correctAnswer)
    )
      return false;
    const parts = Object.keys(currentQuestion.correctAnswer);
    return parts.length > 0 && parts.every((p) => multiPartAnswers[p]?.trim());
  }, [currentQuestion, multiPartAnswers]);

  const handleMultiPartSubmit = useCallback(() => {
    if (
      !currentQuestion ||
      typeof currentQuestion.correctAnswer !== "object" ||
      currentQuestion.correctAnswer === null ||
      Array.isArray(currentQuestion.correctAnswer) ||
      answeredQuestions[currentQuestion.id] !== undefined
    )
      return;
    if (!isMultiPartComplete()) {
      toast.info("Please fill all parts of the question.");
      return;
    }
    handleSubmitAnswer(multiPartAnswers);
  }, [
    currentQuestion,
    answeredQuestions,
    multiPartAnswers,
    handleSubmitAnswer,
    isMultiPartComplete,
  ]);

  const renderQuestionContent = () => {
    // ... (renderQuestionContent remains the same as the previous version, without immediate feedback styling)
    if (!currentQuestion)
      return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as
      | keyof typeof QuestionType
      | "UNKNOWN";
    const isQuestionAnswered =
      answeredQuestions[currentQuestion.id] !== undefined;

    switch (questionTypeString) {
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
            {currentQuestion.options &&
            Array.isArray(currentQuestion.options) &&
            currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const buttonClass =
                  selectedAnswerForUI === optionId
                    ? "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500"
                    : "bg-white hover:bg-gray-50 border border-gray-300";
                return (
                  <button
                    key={option.id || index}
                    onClick={() => handleAnswerMCQ(optionId)}
                    disabled={isQuestionAnswered}
                    className={`w-full text-left p-4 rounded-md transition-all duration-150 text-md ${buttonClass} ${
                      isQuestionAnswered ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="font-bold mr-2">{optionLetter}.</span>{" "}
                    {optionText}
                  </button>
                );
              })
            ) : (
              <p>No options for this MCQ.</p>
            )}
          </div>
        );
      case QuestionType.FILL_IN_THE_BLANK:
      case QuestionType.OPEN_ENDED:
        return (
          <div className="mt-6">
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
                    !isQuestionAnswered
                  ) {
                    e.preventDefault();
                    handleTextAnswerSubmit();
                  }
                }}
                placeholder="Type your answer..."
                disabled={isQuestionAnswered}
                className={`w-full p-3 text-md rounded-l-md border ${
                  isQuestionAnswered
                    ? "border-gray-300 bg-gray-100 text-gray-500"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                }`}
              />
              <button
                onClick={handleTextAnswerSubmit}
                disabled={isQuestionAnswered || !textAnswer.trim()}
                className={`px-5 rounded-r-md ${
                  !isQuestionAnswered && textAnswer.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isQuestionAnswered ? "Locked" : "Lock Answer"}
              </button>
            </div>
            {isQuestionAnswered && (
              <p className="text-xs text-gray-500 mt-1 italic">
                Answer locked. Click Next or Finish Challenge.
              </p>
            )}
          </div>
        );
      case QuestionType.MULTI_PART:
        if (
          typeof currentQuestion.correctAnswer !== "object" ||
          currentQuestion.correctAnswer === null ||
          Array.isArray(currentQuestion.correctAnswer)
        ) {
          return (
            <p className="text-red-500">
              Error: Multi-part question format invalid.
            </p>
          );
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-6 space-y-4">
            {parts.map((part) => (
              <div key={part}>
                <label
                  htmlFor={`multipart-${part}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Part {part.toUpperCase()}:
                </label>
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
                  disabled={isQuestionAnswered}
                  className={`w-full p-3 text-md rounded-md border ${
                    isQuestionAnswered
                      ? "border-gray-300 bg-gray-100 text-gray-500"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  }`}
                />
              </div>
            ))}
            <Button
              onClick={handleMultiPartSubmit}
              disabled={isQuestionAnswered || !isMultiPartComplete()}
              className={`w-full py-3 ${
                !isQuestionAnswered && isMultiPartComplete()
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isQuestionAnswered ? "Locked" : "Lock Answers"}
            </Button>
            {isQuestionAnswered && (
              <p className="text-xs text-gray-500 mt-1 italic">
                Answers locked. Click Next or Finish Challenge.
              </p>
            )}
          </div>
        );
      default:
        return <p>Unsupported question type: {currentQuestion.questionType}</p>;
    }
  };

  const renderAnswerForSummary = (
    questionType?: keyof typeof QuestionType, // Make it optional as it might not be in old summary data
    answer?: any,
    options?: OptionClient[]
  ) => {
    if (answer === null || answer === undefined || answer === "Not Answered")
      return <span className="italic text-gray-500">Not answered</span>;

    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return options && options.length > 0
          ? options.find(
              (o) => String(o.id).toLowerCase() === String(answer).toLowerCase()
            )?.text || String(answer)
          : String(answer);
      case QuestionType.MULTI_PART:
        if (typeof answer === "object" && answer !== null) {
          return (
            <ul className="list-disc list-inside pl-1 text-xs">
              {Object.entries(answer).map(([part, ans]) => (
                <li key={part}>
                  <strong>{part}:</strong> {String(ans)}
                </li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(answer); // Fallback
      default: // FILL_IN_THE_BLANK, OPEN_ENDED
        return String(answer);
    }
  };

  // --- Main Return JSX ---
  // ... (Loading, Error, Landing views remain the same) ...
  if (loading === "initial" || loading === "status") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Loading Challenge Status...</p>
      </div>
    );
  }
  if (error && viewState === "landing") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl">
          <p className="text-red-700">{error}</p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            fetchChallengeStatus();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (viewState === "landing") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mb-6 shadow-lg">
              <FaTrophy className="text-3xl text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
              Weekly Challenge
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Test your skills with {CHALLENGE_QUESTION_COUNT} challenging
              questions!
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <FaClock className="mr-2 text-blue-500" />
                <span>{CHALLENGE_DURATION_MINUTES_DEFAULT} minutes</span>
              </div>
              <div className="flex items-center">
                <FaBullseye className="mr-2 text-green-500" />
                <span>{CHALLENGE_POINTS_PER_QUESTION} points per question</span>
              </div>
              <div className="flex items-center">
                <FaFire className="mr-2 text-orange-500" />
                <span>Hard & Very Hard questions</span>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full mb-4">
                  <FaPlay className="text-2xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Start Fresh
                </h3>
                <p className="text-gray-600 mb-4">
                  Begin a new challenge attempt with a fresh set of questions
                </p>
                <Button
                  onClick={() => loadSession("START_NEW_ATTEMPT")}
                  className="w-full py-3 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <FaPlay className="mr-2" /> Start New Attempt
                </Button>
              </div>
            </div>

            {resumableSessionId && (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mb-4">
                    <FaRedo className="text-2xl text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Continue
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Resume your current challenge where you left off
                  </p>
                  <Button
                    onClick={() => loadSession("RESUME_SESSION")}
                    className="w-full py-3 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <FaRedo className="mr-2" /> Resume Current Attempt
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Attempt History */}
          {attemptHistory.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FaHistory className="mr-3 text-indigo-500" />
                Your Weekly Progress
              </h2>
              <div className="grid gap-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {attemptHistory.map((att, index) => (
                  <div
                    key={att.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      att.status === PracticeSessionStatus.COMPLETED
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            att.status === PracticeSessionStatus.COMPLETED
                              ? "bg-green-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}
                        >
                          {att.status === PracticeSessionStatus.COMPLETED ? (
                            <FaCheck />
                          ) : (
                            <FaClock />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            Attempt #{index + 1}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(att.startTime).toLocaleDateString()} at{" "}
                            {new Date(att.startTime).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status:{" "}
                            <span className="font-medium">
                              {att.status.replace(/_/g, " ")}
                            </span>
                          </p>
                        </div>
                      </div>
                      {att.status === PracticeSessionStatus.COMPLETED && (
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-2">
                            <FaStar className="text-yellow-500" />
                            <span className="text-2xl font-bold text-indigo-600">
                              {att.score ?? 0}
                            </span>
                            <span className="text-gray-500">
                              /{" "}
                              {(att.totalQuestions ??
                                CHALLENGE_QUESTION_COUNT) *
                                CHALLENGE_POINTS_PER_QUESTION}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            onClick={() => {
                              setSessionDetailsForSummary(att);
                              const progressKey = `wc_attempt_${att.id}`;
                              const savedProgressString = safeStorage.getItem(
                                progressKey,
                                "local"
                              );
                              if (savedProgressString) {
                                try {
                                  const oldProgress: LocalStorageWeeklyChallengeProgress =
                                    JSON.parse(savedProgressString);
                                  setQuestionResults(
                                    oldProgress.questionResults || []
                                  );
                                } catch (e) {
                                  setQuestionResults([]);
                                }
                              } else {
                                setQuestionResults([]);
                              }
                              setViewState("summary");
                            }}
                          >
                            <FaChartLine className="mr-1" /> View Results
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attemptHistory.length === 0 && !resumableSessionId && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FaLightbulb className="text-2xl text-gray-400" />
              </div>
              <p className="text-xl text-gray-500 mb-2">
                Ready for your first challenge?
              </p>
              <p className="text-gray-400">
                No attempts made this week yet. You've got this! 🚀
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewState === "summary") {
    const summaryData = sessionDetailsForSummary || {};
    const finalMarks = summaryData.totalMarksEarned ?? score;
    const finalTotalQuestions = summaryData.totalQuestions ?? questions.length;
    const finalCorrectAnswers = summaryData.correctAnswers ?? questionResults.filter((r) => r.correct).length;

    const totalPossibleScore =
      finalTotalQuestions * CHALLENGE_POINTS_PER_QUESTION;
    const percentageCorrect =
      totalPossibleScore > 0
        ? Math.round((finalMarks / totalPossibleScore) * 100)
        : 0;

    // Use `questionResults` if it's populated (meaning this summary is for the session just finished)
    // Otherwise, it's a summary of an older attempt, and we might not have granular results loaded.
    const resultsForDisplay =
      practiceSessionId === summaryData.id && questionResults.length > 0
        ? questionResults
        : [];

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          {showLevelUp && (
            <LevelUpNotification
              level={newLevel}
              onClose={() => setShowLevelUp(false)}
            />
          )}

          {/* Results Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mb-6 shadow-lg">
              <FaMedal className="text-3xl text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
              Challenge Complete!
            </h1>
            <p className="text-xl text-gray-600">Here's how you performed</p>
          </div>

          {/* Score Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="text-center mb-8">
              <div
                className={`inline-block p-8 rounded-full mb-6 ${
                  percentageCorrect >= 80
                    ? "bg-gradient-to-r from-green-100 to-emerald-100"
                    : percentageCorrect >= 60
                    ? "bg-gradient-to-r from-yellow-100 to-orange-100"
                    : "bg-gradient-to-r from-red-100 to-pink-100"
                }`}
              >
                <p
                  className={`text-6xl md:text-7xl font-bold ${
                    percentageCorrect >= 80
                      ? "text-green-600"
                      : percentageCorrect >= 60
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                >
                  {percentageCorrect}%
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-center mb-2">
                    <FaStar className="text-indigo-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Score
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">
                    {finalMarks} / {totalPossibleScore}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center justify-center mb-2">
                    <FaCheck className="text-green-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Correct
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {finalCorrectAnswers} / {finalTotalQuestions}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-center mb-2">
                    <FaFire className="text-amber-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      XP Earned
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    +{finalMarks}
                  </p>
                </div>
              </div>

              {/* Performance Badge */}
              <div className="flex justify-center">
                {percentageCorrect >= 80 ? (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full flex items-center shadow-lg">
                    <FaTrophy className="mr-2" />
                    <span className="font-bold">Excellent Performance!</span>
                  </div>
                ) : percentageCorrect >= 60 ? (
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-full flex items-center shadow-lg">
                    <FaStar className="mr-2" />
                    <span className="font-bold">Good Job!</span>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full flex items-center shadow-lg">
                    <FaLightbulb className="mr-2" />
                    <span className="font-bold">Keep Practicing!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Detailed Review */}
          {resultsForDisplay.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FaChartLine className="mr-3 text-indigo-500" />
                Detailed Review
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {resultsForDisplay.map((result, index) => (
                  <div
                    key={result.id}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                      result.correct
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:border-green-400"
                        : "bg-gradient-to-r from-red-50 to-pink-50 border-red-300 hover:border-red-400"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-gray-800 text-lg">
                        Question {index + 1}
                      </h4>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          result.correct
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {result.correct ? <FaCheck /> : <FaTimes />}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4 font-medium">
                      {result.question}
                    </p>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Your Answer:
                        </span>
                        <div
                          className={`mt-1 p-3 rounded-lg ${
                            result.correct
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {renderAnswerForSummary(
                            result.questionType,
                            result.userAnswer,
                            result.options
                          )}
                        </div>
                      </div>

                      {!result.correct && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Correct Answer:
                          </span>
                          <div className="mt-1 p-3 rounded-lg bg-blue-100 text-blue-800">
                            {renderAnswerForSummary(
                              result.questionType,
                              result.correctAnswer,
                              result.options
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            summaryData.status === PracticeSessionStatus.COMPLETED && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 text-center">
                <p className="text-lg text-gray-500">
                  Detailed answers for this past attempt are not available.
                </p>
                <p className="text-gray-600 mt-2">
                  You achieved a score of{" "}
                  <span className="font-bold text-indigo-600">
                    {finalMarks}
                  </span>{" "}
                  points.
                </p>
              </div>
            )
          )}

          {/* Action Buttons */}
          <div className="text-center">
            <Button
              onClick={() => {
                setViewState("landing");
                fetchChallengeStatus();
              }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <FaArrowLeft className="mr-2" />
              Back to Challenge Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ... (rest of challenge view and loading/error states - no changes needed there from last version) ...
  if (viewState === "challenge" && loading === "session") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Loading Session...</p>
      </div>
    );
  }

  if (viewState === "challenge" && !currentQuestion) {
    return (
      <div className="p-6 text-center text-gray-500">
        Preparing questions... If this persists, please refresh.
      </div>
    );
  }

  if (viewState === "challenge" && currentQuestion) {
    const progressPercentageDisplay =
      questions.length > 0
        ? (currentQuestionIndex / questions.length) * 100
        : 0;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
          {showLevelUp && (
            <LevelUpNotification
              level={newLevel}
              onClose={() => setShowLevelUp(false)}
            />
          )}

          {/* Header with Timer and Progress */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <FaTrophy className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                    Weekly Challenge
                  </h1>
                  <p className="text-sm text-gray-500">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center space-x-2 text-lg font-bold px-4 py-2 rounded-xl shadow-md ${
                  timeLeft <= 300
                    ? "text-red-600 bg-gradient-to-r from-red-100 to-red-200 animate-pulse"
                    : timeLeft <= 600
                    ? "text-orange-600 bg-gradient-to-r from-orange-100 to-orange-200"
                    : "text-green-600 bg-gradient-to-r from-green-100 to-green-200"
                }`}
              >
                <FaClock className="text-xl" />
                <span className="text-2xl font-mono">
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg"
                  style={{ width: `${progressPercentageDisplay}%` }}
                >
                  <div className="h-full w-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                </div>
              </div>
              <div className="absolute top-0 right-0 -mt-8">
                <span className="text-xs font-semibold text-indigo-600 bg-white px-2 py-1 rounded-full shadow-sm">
                  {Math.round(progressPercentageDisplay)}%
                </span>
              </div>
            </div>
          </div>

          {/* Main Question Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 flex-grow flex flex-col border border-gray-100">
            {/* Question Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {currentQuestionIndex + 1}
                  </div>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {currentQuestion.difficulty || "Hard"} Level
                  </span>
                </div>
                {currentQuestion.topic && (
                  <span className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                    {currentQuestion.topic.name}
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-4">
                {currentQuestion.text}
              </h2>

              {currentQuestion.imageUrl && (
                <div className="mt-6 flex justify-center">
                  <div className="relative">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question Visual"
                      className="max-w-full h-auto max-h-80 rounded-xl border shadow-lg"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-black/5"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Section */}
            <div className="mb-auto">
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-6 border border-gray-200">
                {renderQuestionContent()}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-6">
              <Button
                onClick={() => handleNextQuestion()}
                disabled={
                  selectedAnswerForUI === null || loading === "submitting"
                }
                className="w-full py-4 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 transform hover:scale-105 disabled:transform-none"
              >
                {loading === "submitting" ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : (
                  <div className="flex items-center justify-center">
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>
                        <span>Next Question</span>
                        <FaArrowLeft className="ml-2 rotate-180" />
                      </>
                    ) : (
                      <>
                        <FaTrophy className="mr-2" />
                        <span>Finish Challenge</span>
                      </>
                    )}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-center text-gray-500">
      Something went wrong with the view state.
    </div>
  );
}
