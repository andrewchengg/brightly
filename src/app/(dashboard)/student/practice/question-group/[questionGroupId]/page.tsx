// src/app/(dashboard)/student/practice/question-group/[questionGroupId]/page.tsx
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
} from "@/generated/prisma";
import safeStorage from "@/lib/safeStorage";
import { soundEffects } from "@/lib/soundEffects";
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
import ExplanationFormatter from "@/components/ExplanationFormatter";
import QuestionTextFormatter from "@/components/QuestionTextFormatter";
import {
  AIAssistant,
  createSessionContext,
  createQuestionContext,
  createPassageContext,
} from "@/components/AILearningAssistant";
import MobileFloatingButtons from "@/components/MobileFloatingButtons";
import {
  validateUserInput,
  sanitizeUserInput,
  getHelpfulSuggestions,
} from "@/lib/client-validation";
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
import ConfettiComponent from "@/components/Confetti";
import { PracticeCompletionLoader } from "@/components/ui/PracticeCompletionLoader";
import PassageDisplay from "@/components/Practice/PassageDisplay";
import ExitPracticeDialog from "@/components/ExitPracticeDialog";
import ClozeQuestionOptions from "@/components/Practice/ClozeQuestionOptions";
import { triggerQuestRefresh } from "@/lib/quest-refresh";
import { DifficultyLevel } from "@/generated/prisma";

// Interfaces (similar to TopicalPracticePage)
interface OptionClient {
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
  topic: {
    id: number;
    name: string;
    subjectId?: number;
  };
  difficulty?: keyof typeof DifficultyLevel; // Or string if you prefer to map later
  pointsAwarded?: number;
  marks?: number;
  questionType?: keyof typeof PrismaQuestionType;
  imageUrl?: string;
  topicName?: string;
  questionNumberOnPage?: string;
}

interface LocalStorageQuestionGroupPracticeProgress {
  questionGroupId: number;
  passageTitle?: string;
  passageContent: string | null; // Keep as string | null to represent actual fetched state
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

interface QuestionResult {
  id: number;
  correct: boolean;
  question: string;
  userAnswer: string | Record<string, string>;
  correctAnswer: string | Record<string, string> | string[] | null;
}

interface PracticeProgress {
  questionResults: QuestionResult[];
  totalMarksEarned: number;
  totalPossibleMarks: number;
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
}

export default function QuestionGroupPracticePage() {
  const router = useRouter();
  const params = useParams();
  const questionGroupIdParam = params.questionGroupId as string;
  const numericQuestionGroupId = parseInt(questionGroupIdParam, 10);

  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string | null>(null); // Initialize as null
  const [passageAudioUrl, setPassageAudioUrl] = useState<string | null>(null);

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
    LocalStorageQuestionGroupPracticeProgress["questionResults"]
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

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  const localStorageKey = userId
    ? `qgPracticeProgress_${userId}_${numericQuestionGroupId}`
    : null;

  const [totalMarksEarned, setTotalMarksEarned] = useState(0);
  const [totalPossibleMarks, setTotalPossibleMarks] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else {
        toast.error("User session not found.");
        router.push("/sign-in");
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  const createNewQuestionGroupPracticeSession = useCallback(
    async (fetchedQuestions: QuestionClient[], groupData: QuestionGroup) => {
      if (!userId) {
        setError("User information is missing. Cannot start session.");
        return null;
      }
      // Allow session creation even if fetchedQuestions is empty, if groupData itself is valid (e.g., has a passage)
      // if (fetchedQuestions.length === 0) {
      //   setError("No questions available to start a session for this passage.");
      //   return null;
      // }

      const firstQuestionSubjectId = fetchedQuestions[0]?.topic?.subjectId;
      setCurrentSubjectId(firstQuestionSubjectId || null);

      try {
        const response = await fetch("/api/practice-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: userId,
            title: `Practice: ${groupData.name}`,
            type: PracticeSessionType.QUESTION_GROUP_PRACTICE,
            status: PracticeSessionStatus.IN_PROGRESS,
            totalQuestions: fetchedQuestions.length, // Can be 0
            subjectId: firstQuestionSubjectId,
            basedOnQuestionGroupId: numericQuestionGroupId,
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
    [userId, numericQuestionGroupId]
  );

  const fetchQuestionGroupAndStartSession = useCallback(async () => {
    if (!userId || !numericQuestionGroupId || isNaN(numericQuestionGroupId))
      return;

    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setLoading("fetching-group");
    setError(null);
    setPassageTitle("");
    setPassageContent(null); // Reset to null initially
    setPassageAudioUrl(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnsweredQuestions({});
    setQuestionResults([]);
    setSessionFinalized(false);
    setAiMessage(null);
    setChatHistory([]);
    setCurrentPracticeSessionId(null);
    setCurrentSubjectId(null);

    try {
      const response = await fetch(
        `/api/questions/question-group/${numericQuestionGroupId}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { message: `API error: ${response.status}` },
        }));
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }
      const data: {
        questionGroup: QuestionGroup;
        questions: QuestionClient[];
      } = await response.json();

      console.log(
        "CLIENT: Fetched Question Group Data from API:",
        JSON.stringify(data, null, 2)
      );

      if (!data.questionGroup) {
        throw new Error("API did not return questionGroup object.");
      }
      if (
        data.questionGroup.description === null ||
        data.questionGroup.description === undefined
      ) {
        console.warn(
          "CLIENT: Passage content (description) is NULL or UNDEFINED in API response for group ID:",
          numericQuestionGroupId
        );
        // Set to empty string to indicate it was fetched but empty, vs. null for not fetched yet
        setPassageContent("");
      } else {
        setPassageContent(data.questionGroup.description);
        console.log(
          "CLIENT: Passage content (description) IS PRESENT:",
          data.questionGroup.description.substring(0, 100) + "..."
        );
      }

      setPassageTitle(data.questionGroup.name || "Passage Practice");
      setPassageAudioUrl(data.questionGroup.audioUrl);

      const fetchedQuestions = data.questions || [];
      if (fetchedQuestions.length === 0) {
        console.warn(
          "CLIENT: No questions returned for this group from the API. Passage might still be displayed."
        );
      }
      setQuestions(fetchedQuestions);

      if (fetchedQuestions.length > 0 && fetchedQuestions[0].topic?.subjectId) {
        setCurrentSubjectId(fetchedQuestions[0].topic.subjectId);
      }

      const newSessionId = await createNewQuestionGroupPracticeSession(
        fetchedQuestions,
        data.questionGroup
      );
      if (!newSessionId) {
        setError(
          "Fetched content but failed to start a new practice session in the database."
        );
      }
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to load passage and questions. Please try again."
      );
      setPassageTitle("Error Loading");
      setPassageContent("Could not load passage content."); // Indicate error in content
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    numericQuestionGroupId,
    createNewQuestionGroupPracticeSession,
    localStorageKey,
  ]);

  useEffect(() => {
    if (
      !userId ||
      !numericQuestionGroupId ||
      isNaN(numericQuestionGroupId) ||
      !localStorageKey
    ) {
      if (
        userId &&
        numericQuestionGroupId &&
        !isNaN(numericQuestionGroupId) &&
        loading !== "fetching-group"
      ) {
        setLoading(true);
      }
      return;
    }

    if (loading === true) {
      // Ensure fetch is not already in progress from initial call or retry
      setLoading("resuming-session");
      const savedProgressString = safeStorage.getItem(localStorageKey, "local");
      let resumableSessionFound = false;
      if (savedProgressString) {
        try {
          const progress: LocalStorageQuestionGroupPracticeProgress =
            JSON.parse(savedProgressString);
          if (
            progress.questionGroupId === numericQuestionGroupId &&
            !progress.sessionFinalized &&
            progress.practiceSessionId
          ) {
            setPassageTitle(progress.passageTitle || "");
            setPassageContent(progress.passageContent);
            setPassageAudioUrl(progress.audioUrl || null);
            setQuestions(progress.questions || []);
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
            setCurrentSubjectId(progress.subjectId || null);
            setSessionFinalized(false);
            if (
              (progress.currentQuestionIndex || 0) >=
                (progress.questions?.length || 0) &&
              (progress.questions?.length || 0) > 0
            ) {
              setShowSummary(true);
              setSessionFinalized(true);
            }
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
        fetchQuestionGroupAndStartSession();
      } else {
        setLoading(false);
      }
    }
  }, [
    userId,
    numericQuestionGroupId,
    fetchQuestionGroupAndStartSession,
    localStorageKey,
  ]);

  useEffect(() => {
    if (
      !localStorageKey ||
      typeof loading === "string" ||
      loading ||
      !userId ||
      !currentPracticeSessionId ||
      showSummary
    )
      return;

    const contentToSave = passageContent === null ? "" : passageContent; // Ensure string for storage

    const progress: LocalStorageQuestionGroupPracticeProgress = {
      questionGroupId: numericQuestionGroupId,
      passageTitle,
      passageContent: contentToSave,
      audioUrl: passageAudioUrl,
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
      subjectId: currentSubjectId,
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
    numericQuestionGroupId,
    passageTitle,
    passageContent,
    passageAudioUrl,
    currentSubjectId,
    localStorageKey,
  ]);

  useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedUserAnswerContent = answeredQuestions[currentQuestionId];

      // Reset UI state for the current question
      setIsAnswerCorrect(null);
      setSelectedAnswer(null);
      // No need to reset textAnswer or multiPartAnswers if this page only handles MCQ-style cloze

      if (savedUserAnswerContent !== undefined) {
        // For Cloze (MCQ), currentQuestion.questionType should be MULTIPLE_CHOICE
        // We directly set selectedAnswer for UI and evaluate correctness.
        if (typeof savedUserAnswerContent === "string") {
          setSelectedAnswer(savedUserAnswerContent);
          const isCorrectForSaved =
            String(currentQuestion.correctAnswer ?? "").toLowerCase() ===
            savedUserAnswerContent.toLowerCase();
          setIsAnswerCorrect(isCorrectForSaved);
        } else {
          // Handle cases where savedUserAnswerContent might not be a string, though for MCQ it should be.
          // This might happen if there was an issue with how it was saved previously.
          console.warn(
            "Saved answer content for MCQ was not a string:",
            savedUserAnswerContent
          );
          setAiMessage(null); // Clear AI message as we can't process this saved answer
        }
      } else {
        setAiMessage(null); // Clear AI message if no saved answer for this question
      }
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, answeredQuestions]); // currentQuestion removed to avoid potential loops with highlighting

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
              activityType: "question_group_completion",
            }),
          });
          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            toast.success(`+${xpData.awarded || xpToAdd} XP earned!`);
            if (xpData.leveledUp)
              levelUpDetails = {
                newLevel: xpData.level,
                previousLevel: xpData.previousLevel,
              };
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
          body: JSON.stringify({ activityType: "question_group_completion" }),
        });
      } catch (error) {
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
      const totalMarksEarned = questionResults.reduce((acc, result) => {
        const question = questions.find(q => q.id === result.id);
        return acc + (result.correct ? (question?.marks || 1) : 0);
      }, 0);
      const totalPossibleMarks = questions.reduce(
        (acc, q) => acc + (q.marks || 1),
        0
      );

      const response = await fetch(`/api/practice-session/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentPracticeSessionId,
          score: calculatedScore,
          correctAnswers: correctCount,
          xpEarned: calculatedScore,
          totalMarksEarned,
          totalPossibleMarks
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to finalize session");
      }

      const data = await response.json();
      const { session } = data;

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
      toast.success("Practice completed and results saved!");

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
    questions,
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
        if (!alreadyCountedCorrect) setScore((prevScore) => prevScore + points);
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
      const isCorrect = optionId.toLowerCase() === correctAnswerId;
      const correctOption = currentQuestion.options.find(
        (opt) => opt.id.toLowerCase() === correctAnswerId
      );
      const correctAnswerDisplayText = correctOption
        ? correctOption.text
        : `ID: ${currentQuestion.correctAnswer}`;

      // Trigger confetti and sound for correct answers
      if (isCorrect) {
        setShowConfetti(true);
        soundEffects.playSuccessSound();
      }

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

    // Trigger confetti and sound for correct answers
    if (isCorrect) {
      setShowConfetti(true);
      soundEffects.playSuccessSound();
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
      Array.isArray(currentQuestion.correctAnswer) ||
      selectedAnswer !== null
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
    if (questions.length === 0) {
      // If no questions, go directly to summary
      setShowSummary(true);
      // Trigger confetti when showing results (session completion)
      setShowConfetti(true);
      await finalizePracticeSessionInDb();
      return;
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      setShowSummary(true);
      // Trigger confetti when showing results (session completion)
      setShowConfetti(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const restartPractice = useCallback(async () => {
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setShowSummary(false);
    setShowLevelUp(false);
    await fetchQuestionGroupAndStartSession();
  }, [localStorageKey, fetchQuestionGroupAndStartSession]);

  const handleExitConfirm = useCallback(() => {
    // Exit immediately without waiting for API call
    if (currentSubjectId) {
      router.push(`/student/practice/subject/${currentSubjectId}`);
    } else {
      router.push("/student/practice");
    }

    // Clean up session in background if needed
    if (localStorageKey) {
      safeStorage.removeItem(localStorageKey, "local");
    }
  }, [currentSubjectId, router, localStorageKey]);

  const exitToSubjectPractice = useCallback(() => {
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

      const passageContext = passageContent
        ? {
            title: passageTitle || "Untitled",
            content: passageContent,
          }
        : undefined;

      const sessionContext = {
        sessionId: currentPracticeSessionId,
        sessionType: "question_group" as const,
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
            passage: passageContext,
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
    passageContent,
    passageTitle,
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
            {currentQuestion.options &&
            Array.isArray(currentQuestion.options) &&
            currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const isThisSelected = selectedAnswer === optionId;
                const isThisCorrectDB =
                  String(currentQuestion.correctAnswer || "").toLowerCase() ===
                  optionId.toLowerCase();
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
                    {" "}
                    <span className="font-bold mr-2">{optionLetter}.</span>{" "}
                    {optionText}{" "}
                  </button>
                );
              })
            ) : (
              <div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center">
                <p>No options available for this MCQ.</p>
              </div>
            )}{" "}
          </div>
        );
      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        return (
          <div className="mt-6">
            {" "}
            <div className="mb-3">
              {" "}
              <label
                htmlFor="text-answer"
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Your Answer:
              </label>{" "}
              <div className="flex">
                {" "}
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
                </button>{" "}
              </div>{" "}
            </div>{" "}
            {selectedAnswer !== null && (
              <div
                className={`mt-3 p-3 rounded-md text-sm ${
                  isAnswerCorrect
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {" "}
                <p className="font-medium">
                  {isAnswerCorrect
                    ? "Correct!"
                    : `Incorrect. Correct answer(s): "${
                        Array.isArray(currentQuestion.correctAnswer)
                          ? currentQuestion.correctAnswer.join(" or ")
                          : currentQuestion.correctAnswer
                      }".`}
                </p>{" "}
                {!isAnswerCorrect && currentQuestion.explanation && (
                  <p className="mt-1">
                    Explanation: {currentQuestion.explanation}
                  </p>
                )}{" "}
              </div>
            )}{" "}
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
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-md">
              <p className="text-amber-800 font-medium text-sm">
                Multi-part question. Enter answers for each part:
              </p>
            </div>{" "}
            {parts.map((part) => (
              <div key={part} className="mb-4">
                {" "}
                <label
                  htmlFor={`multipart-${part}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Part {part.toUpperCase()}:
                </label>{" "}
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
                </div>{" "}
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
                  )}{" "}
              </div>
            ))}{" "}
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
            </Button>{" "}
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
                    <p className="font-semibold mb-1">Explanation:</p>
                    <p className="text-sm">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            )}{" "}
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
        sessionType="Reading Comprehension Practice"
      />
    );
  }

  const isInitialLoading =
    typeof loading === "string" ||
    (loading === true && passageContent === null && !error); // passageContent starts as null

  if (isInitialLoading) {
    /* ... loading spinner ... */
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Preparing Your Practice
          </h2>
          <p className="text-gray-600 mb-4">Loading passage and questions...</p>
        </div>
      </div>
    );
  }
  if (error) {
    /* ... error display ... */
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
              onClick={fetchQuestionGroupAndStartSession}
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
    const percentageCorrect =
      totalPossibleMarks > 0
        ? Math.round((totalMarksEarned / totalPossibleMarks) * 100)
        : 0;
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
          <div className="p-6 text-center">
            <h2 className="text-3xl font-bold mb-2">
                {percentageCorrect}%
            </h2>
            <p className="text-gray-600 mb-4">
              Your Marks: {totalMarksEarned} / {totalPossibleMarks}
              </p>
            <p className="text-gray-600 mb-4">
              XP Earned: +{totalMarksEarned}
            </p>
            <p className="text-gray-600">
              Total Questions: {totalQuestions}
                </p>
            <p className="text-gray-600">
              Correct Answers: {correctAnswers} / {totalQuestions}
                </p>
              </div>
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Review Your Answers:</h3>
                {questionResults.map((result, index) => (
                  <div
                    key={result.id}
                className={`mb-4 p-4 rounded-lg ${
                      result.correct
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                    }`}
                  >
                <div className="flex items-center justify-between">
                  <span>Question {index + 1}</span>
                  <span>
                        {result.correct ? (
                      <FaCheck className="w-5 h-5" />
                        ) : (
                      <FaTimes className="w-5 h-5" />
                    )}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
          <div className="border-t border-gray-200 p-6 flex justify-center">
              <Button
              onClick={() => {
                router.push("/student/practice");
              }}
            >
              Continue Practice
              </Button>
          </div>
        </div>
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

  const noQuestionsButPassageExists =
    passageContent !== null && questions.length === 0 && !showSummary;
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
        title="Exit Practice Session?"
        subtitle="You're practicing a question group"
        currentProgress={{
          currentQuestion: currentQuestionIndex + 1,
          totalQuestions: questions.length,
          score: score,
          correctAnswers: questionResults.filter((r) => r.correct).length,
          totalMarksEarned: questionResults.reduce((acc, result) => {
            const question = questions.find(q => q.id === result.id);
            return acc + (result.correct ? (question?.marks || 1) : 0);
          }, 0),
          totalPossibleMarks: questions.reduce(
            (acc, q) => acc + (q.marks || 1),
            0
          ),
          xpEarned: score
        }}
      />
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button
          onClick={exitToSubjectPractice}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          {" "}
          <FaArrowLeft className="mr-1.5" /> Exit
        </button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          {passageTitle || "Practice Session"}{" "}
          {questions.length > 0
            ? `• Q ${currentQuestionIndex + 1} / ${questions.length}`
            : noQuestionsButPassageExists
            ? "• Passage Review"
            : ""}
        </div>
        <div className="text-amber-600 font-semibold text-sm md:text-base">
          {score} XP
        </div>
      </div>
      {questions.length > 0 && (
        <div className="w-full h-1.5 bg-gray-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentageDisplay}%` }}
          />
        </div>
      )}

      <div className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
        <div
          className={`overflow-auto bg-white custom-scrollbar ${
            isMobile ? 'w-full' : ''
          }`}
          style={isMobile ? {} : { width: `${splitPosition}%` }}
        >
          <div className="p-4 md:p-6">
            {passageContent !== null && passageContent.trim() !== "" && (
              <div className="mb-6 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-md shadow">
                <h2 className="text-lg font-semibold text-indigo-800 mb-2">
                  {passageTitle}
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2">
                  {passageContent}
                </div>
              </div>
            )}

            {currentQuestion && (
              <>
                <h1 className="text-md md:text-lg font-semibold text-gray-800 mb-3 leading-snug">
                  <QuestionTextFormatter text={currentQuestion?.text} />
                </h1>
                {currentQuestion?.imageUrl && (
                  <div className="mb-3 flex justify-center border border-gray-200 rounded-lg p-1 bg-gray-50 shadow-sm">
                    {" "}
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question diagram"
                      className="max-w-full h-auto max-h-60 rounded object-contain"
                    />{" "}
                  </div>
                )}
                {renderQuestionContent()}
                {selectedAnswer !== null &&
                  currentQuestion?.explanation &&
                  currentQuestion?.questionType !== "MULTI_PART" && (
                                    <div
                  className={`mt-4 p-4 lg:p-3 rounded-md text-base lg:text-sm ${
                    isAnswerCorrect
                      ? "bg-green-50 border-l-4 border-green-400"
                      : "bg-blue-50 border-l-4 border-blue-400"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-700 mb-3 text-lg lg:text-base">
                      Explanation:
                    </p>
                    <ExplanationFormatter
                      explanation={currentQuestion.explanation}
                      className="text-gray-700 leading-relaxed"
                    />
                  </div>
                </div>
                  )}
                {/* Desktop buttons - normal flow */}
                <div className="hidden lg:flex mt-5 border-t border-gray-200 pt-4 flex-row justify-between items-center">
                  <Button
                    onClick={() => setShowHint(true)}
                    disabled={
                      selectedAnswer !== null ||
                      showHint ||
                      !currentQuestion?.hint
                    }
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-auto text-xs py-1.5 px-3"
                  >
                    <FaLightbulb className="mr-1.5" /> Hint
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={
                      selectedAnswer === null ||
                      (typeof loading === "string" && loading === "submitting")
                    }
                    className={`px-5 py-2 text-xs w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all ${
                      selectedAnswer !== null
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {" "}
                    {typeof loading === "string" && loading === "submitting" ? (
                      <FaSpinner className="animate-spin mr-2" />
                    ) : null}{" "}
                    {currentQuestionIndex < questions.length - 1
                      ? "Next Question →"
                      : "🏁 Show Results"}{" "}
                  </Button>
                </div>

                {/* Mobile spacing to prevent content from being hidden behind fixed buttons */}
                <div className="lg:hidden h-24"></div>
                {showHint && currentQuestion?.hint && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 shadow text-xs">
                    <div className="flex items-start">
                      <FaLightbulb className="text-yellow-500 mt-0.5 mr-1.5 flex-shrink-0" />
                      <p>
                        <span className="font-semibold text-yellow-900">
                          Hint:
                        </span>{" "}
                        {currentQuestion.hint}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            {noQuestionsButPassageExists && (
              <p className="mt-6 text-center text-gray-600">
                No questions associated with this passage currently. You can
                review the passage content.
              </p>
            )}
            {(passageContent === null ||
              (passageContent !== null && passageContent.trim() === "")) &&
              questions.length === 0 && (
                <p className="text-center text-gray-500 py-10">
                  No content loaded for this practice group.
                </p>
              )}
          </div>
        </div>

        {/* Resize divider - Only show on desktop */}
        {!isMobile && (
          <div
            className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150"
            onMouseDown={handleMouseDown}
          >
            <div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div>
          </div>
        )}
        
        {/* AI Assistant Panel - Only show on desktop */}
        {!isMobile && (
          <div
            className="bg-indigo-50 flex flex-col overflow-hidden custom-scrollbar"
            style={{ width: `${100 - splitPosition - 0.5}%` }}
          >
            <AIAssistant
            passageContext={
              passageContent
                ? createPassageContext(passageContent, passageTitle)
                : undefined
            }
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
              "question_group",
              questions.length,
              currentQuestionIndex + (selectedAnswer ? 1 : 0),
              questionResults.filter((r) => r.correct).length,
              sessionFinalized,
              currentPracticeSessionId || undefined,
              "Primary School",
              currentSubjectId || undefined,
              undefined // Subject name will be determined from subjectId in the helper function
            )}
            disabled={false}
            className="h-full"
          />
          </div>
        )}
      </div>

      {/* Mobile fixed bottom buttons */}
      {currentQuestion && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setShowHint(true)}
              disabled={
                selectedAnswer !== null ||
                showHint ||
                !currentQuestion?.hint
              }
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full text-base py-3 min-h-[48px]"
            >
              <FaLightbulb className="mr-2" /> Get Hint
            </Button>
            <Button
              onClick={handleNextQuestion}
              disabled={
                selectedAnswer === null ||
                (typeof loading === "string" && loading === "submitting")
              }
              className={`px-6 py-3 text-base w-full font-semibold rounded-lg shadow-sm hover:shadow-md transition-all min-h-[48px] ${
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
        </div>
      )}

      {/* Mobile Floating Buttons */}
      <MobileFloatingButtons
        aiAssistantProps={{
          passageContext: passageContent 
            ? createPassageContext(
                questionGroupIdParam,
                passageTitle,
                passageContent,
                passageAudioUrl || undefined
              )
            : undefined,
          questionContext: currentQuestion
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
            : undefined,
          sessionContext: createSessionContext(
            "question_group",
            questions.length,
            currentQuestionIndex + (selectedAnswer ? 1 : 0),
            questionResults.filter((r) => r.correct).length,
            sessionFinalized,
            currentPracticeSessionId || undefined,
            "Primary School",
            currentSubjectId || undefined
          ),
          disabled: false,
        }}
      />
    </div>
  );
}
