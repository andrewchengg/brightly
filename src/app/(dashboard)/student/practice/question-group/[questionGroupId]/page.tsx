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
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
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
} from "react-icons/fa";
// ... other imports
import PassageDisplay from "@/components/Practice/PassageDisplay";
import ClozeQuestionOptions from "@/components/Practice/ClozeQuestionOptions";
import { FaRegListAlt } from "react-icons/fa"; // If not already imported
import { DifficultyLevel } from "@/generated/prisma"; // If not already imported

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
      const response = await fetch(
        `/api/practice-sessions/${currentPracticeSessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            endTime: new Date().toISOString(),
            score: calculatedScore,
            correctAnswers: correctCount,
            xpEarned: calculatedScore,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to finalize session");
      }
      setSessionFinalized(true);
      const levelUpInfo = await awardXPAndStreak(calculatedScore);
      if (levelUpInfo) {
        setNewLevel(levelUpInfo.newLevel);
        setShowLevelUp(true);
      }
      safeStorage.removeItem(localStorageKey, "local");
      toast.success("Practice completed and results saved!");
    } catch (err: any) {
      toast.error(`Session finalization error: ${err.message}`);
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
      const points = isCorr ? currentQuestion.pointsAwarded || 10 : 0;
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
    if (questions.length === 0) {
      // If no questions, go directly to summary
      setShowSummary(true);
      await finalizePracticeSessionInDb();
      return;
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      setShowSummary(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const restartPractice = useCallback(async () => {
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setShowSummary(false);
    setShowLevelUp(false);
    await fetchQuestionGroupAndStartSession();
  }, [localStorageKey, fetchQuestionGroupAndStartSession]);

  const exitToSubjectPractice = useCallback(async () => {
    if (currentSubjectId) {
      router.push(`/student/practice/subject/${currentSubjectId}`);
    } else {
      router.push("/student/practice");
    }
  }, [currentSubjectId, router]);

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
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {" "}
                <p className="font-medium">
                  {aiMessage ||
                    (isAnswerCorrect
                      ? "All parts correct!"
                      : "Some parts incorrect.")}
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
    /* ... summary display ... */
    const totalPossibleScore = questions.reduce(
      (acc, q) => acc + (q.pointsAwarded || 10),
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
            <FaBookReader className="text-5xl mx-auto mb-4 opacity-80" />
            <h1 className="text-3xl font-bold mb-2">
              Passage Practice Complete: {passageTitle}
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
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {questionResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`flex items-center justify-between p-3 rounded-md text-sm ${
                      result.correct
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span>
                      Q{index + 1}: {result.question.substring(0, 50)}...
                    </span>
                    {result.correct ? <FaCheck /> : <FaTimes />}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={exitToSubjectPractice}
                variant="outline"
                className="flex-1"
              >
                <FaArrowLeft className="mr-2" /> Back to Subject
              </Button>
              <Button
                onClick={restartPractice}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <FaRocket className="mr-2" /> Practice This Passage Again
              </Button>
            </div>
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

      <div className="flex flex-1 overflow-hidden">
        <div
          className="overflow-auto bg-white custom-scrollbar"
          style={{ width: `${splitPosition}%` }}
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
                  {currentQuestion?.text}
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
                  (isAnswerCorrect === false ||
                    currentQuestion?.explanation) && (
                    <div
                      className={`mt-4 p-3 rounded-md text-sm ${
                        isAnswerCorrect
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      {" "}
                      {isAnswerCorrect === false && (
                        <p className="font-medium text-red-800 mb-1">
                          Incorrect. Correct Answer:{" "}
                          {Array.isArray(currentQuestion?.correctAnswer)
                            ? currentQuestion?.correctAnswer.join(" or ")
                            : typeof currentQuestion?.correctAnswer ===
                                "object" &&
                              currentQuestion?.correctAnswer !== null &&
                              !Array.isArray(currentQuestion?.correctAnswer)
                            ? Object.entries(currentQuestion.correctAnswer)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")
                            : String(currentQuestion?.correctAnswer)}
                        </p>
                      )}{" "}
                      {currentQuestion?.explanation && (
                        <div>
                          <p className="font-semibold text-gray-700 mt-2">
                            Explanation:
                          </p>
                          <p className="text-gray-600 whitespace-pre-wrap">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      )}{" "}
                    </div>
                  )}
                <div className="mt-5 border-t border-gray-200 pt-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <Button
                    onClick={() => setShowHint(true)}
                    disabled={
                      selectedAnswer !== null ||
                      showHint ||
                      !currentQuestion?.hint
                    }
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto text-xs py-1.5 px-3"
                  >
                    <FaLightbulb className="mr-1.5" /> Hint
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={
                      selectedAnswer === null ||
                      (typeof loading === "string" && loading === "submitting")
                    }
                    className={`px-5 py-2 text-xs w-full sm:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all ${
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
          <div className="p-3 border-b border-indigo-200 bg-indigo-100 flex items-center shadow-sm">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-2.5 text-md font-bold">
              <FaCommentDots />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-indigo-800 text-sm">
                AI Learning Assistant
              </div>
              <div className="text-xs text-indigo-600">
                Ask about this passage or question!
              </div>
            </div>
            <div className="text-xs text-indigo-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 border border-indigo-100 shadow-sm"></span>
              Online
            </div>
          </div>
          <div
            ref={aiContentRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-indigo-25 custom-scrollbar"
          >
            {chatHistory.length > 0 ? (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm ${
                      message.role === "user"
                        ? "ml-auto bg-indigo-500 text-white rounded-br-none"
                        : "mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            ) : aiMessage ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                  <p className="whitespace-pre-wrap">{aiMessage}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-3xl text-indigo-500">
                  <FaLightbulb />
                </div>
                <p className="text-sm">
                  Ask me anything about this, or I'll give feedback after you
                  answer.
                </p>
              </div>
            )}
            {isLoadingAI && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                  <div className="flex space-x-1 items-center">
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-2.5 border-t border-indigo-200 bg-indigo-100">
            <div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white shadow-sm">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the passage/question..."
                className="flex-1 py-2 px-3.5 text-sm border-none outline-none bg-transparent rounded-l-full"
                disabled={
                  isLoadingAI ||
                  selectedAnswer !== null ||
                  noQuestionsButPassageExists
                }
              />
              <button
                onClick={handleSendMessage}
                disabled={
                  isLoadingAI ||
                  !userMessage.trim() ||
                  selectedAnswer !== null ||
                  noQuestionsButPassageExists
                }
                className={`w-8 h-8 m-0.5 rounded-full flex items-center justify-center transition-colors ${
                  userMessage.trim() &&
                  !isLoadingAI &&
                  selectedAnswer === null &&
                  !noQuestionsButPassageExists
                    ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                    : "bg-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                <FaPaperPlane className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
