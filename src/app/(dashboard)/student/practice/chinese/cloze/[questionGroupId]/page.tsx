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
  currentQuestionIndex: number; // Still keep for potential future use or if AI needs context of "current" blank
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

export default function ClozePassagePracticePage() {
  const router = useRouter();
  const params = useParams();
  const questionGroupIdParam = params.questionGroupId as string;
  const numericQuestionGroupId = parseInt(questionGroupIdParam, 10);

  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string | null>(null);
  const [passageAudioUrl, setPassageAudioUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true); // Can be boolean or string for specific states
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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

  const [userMessage, setUserMessage] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [splitPosition, setSplitPosition] = useState(65);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  const localStorageKey = userId
    ? `clozeInlinePracticeProgress_${userId}_${numericQuestionGroupId}`
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
      setPassageAudioUrl(data.questionGroup.audioUrl);
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
      setLoading(
        false
      ); /* setInitialLoadComplete(true); // Handled by the calling useEffect now */
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
            progress.practiceSessionId
          ) {
            setPassageTitle(progress.passageTitle);
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
            if (progress.sessionFinalized) {
              setSessionFinalized(true);
              setShowSummary(true);
            } else {
              setSessionFinalized(false);
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
    initialLoadComplete,
  ]);

  const awardXPAndStreak = useCallback(
    async (xpToAdd: number) => {
      /* ... same logic ... */ return null;
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
      const response = await fetch(
        `/api/practice-sessions/${currentPracticeSessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            endTime: new Date().toISOString(),
            score: finalScore,
            correctAnswers: finalCorrectCount,
            xpEarned: finalScore,
          }),
        }
      );
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
          points = q.pointsAwarded || 2;
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
    setShowSummary(true);
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
  const exitToSubjectPractice = useCallback(async () => {
    if (currentSubjectId)
      router.push(`/student/practice/subject/${currentSubjectId}`);
    else router.push("/student/practice/subject/4");
  }, [currentSubjectId, router]);

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim()) return;
    const currentUserMessage = userMessage.trim();
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
      let context = `Passage (Cloze Test context): "${passageContent?.substring(
        0,
        300
      )}..."\n`;
      // For inline cloze, currentQuestion might not be the best focus for AI.
      // AI can be asked about the passage generally, or user can specify a blank.
      context +=
        "The student is working on an inline cloze passage and may ask about specific blanks (e.g., 'What about Q21?') or the passage in general. Provide guidance or clarification but avoid giving direct answers to the blanks.";
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Tutor for Primary School (Chinese Cloze Passage context). Context: ${context}. Guide, don't just give answers unless asked repeatedly. Keep concise and encouraging.`,
            },
            ...currentChatHistory,
          ],
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
      console.error("AI Tutor Error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting to the AI assistant right now.",
        },
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  }, [userMessage, chatHistory, passageContent]);

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
      (acc, q) => acc + (q.pointsAwarded || 2),
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
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {" "}
          <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
            {" "}
            <FaBookReader className="text-5xl mx-auto mb-4 opacity-80" />{" "}
            <h1 className="text-3xl font-bold mb-2">
              Cloze Passage Complete: {passageTitle}
            </h1>{" "}
            <p className="text-indigo-200">
              Well done! Here's your performance:
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
                        {result.question.startsWith("Blank")
                          ? result.question
                          : `Blank ${
                              questions.find((q) => q.id === result.id)
                                ?.questionNumberOnPage || index + 1
                            }`}
                      </span>
                      {result.correct ? <FaCheck /> : <FaTimes />}
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
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      {showLevelUp && (
        <LevelUpNotification
          level={newLevel}
          onClose={() => setShowLevelUp(false)}
        />
      )}
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm sticky top-0 z-10">
        <button
          onClick={exitToSubjectPractice}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          {" "}
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
            currentQuestion={null}
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
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-lg font-semibold text-indigo-700">
                Passage submitted! View your summary.
              </p>
              <Button
                onClick={() => setShowSummary(true)}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700"
              >
                View Summary
              </Button>
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
                    Ask about this passage!
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
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
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
                      Ask me anything about this passage.
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
                    placeholder="Ask about the passage..."
                    className="flex-1 py-2 px-3.5 text-sm border-none outline-none bg-transparent rounded-l-full"
                    disabled={isLoadingAI || sessionFinalized}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={
                      isLoadingAI || !userMessage.trim() || sessionFinalized
                    }
                    className={`w-8 h-8 m-0.5 rounded-full flex items-center justify-center transition-colors ${
                      userMessage.trim() && !isLoadingAI && !sessionFinalized
                        ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                        : "bg-gray-300 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <FaPaperPlane className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
