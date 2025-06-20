// src/app/(dashboard)/student/practice/chinese/reading-comprehension/[questionGroupId]/page.tsx
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

// Import our new reading comprehension components
import ReadingComprehensionPassage from "@/components/Practice/ReadingComprehensionPassage";
import ReadingComprehensionQuestions from "@/components/Practice/ReadingComprehensionQuestions";
import {
  AIAssistant,
  createPassageContext,
  createQuestionContext,
  createSessionContext,
  AIAssistantRef,
} from "@/components/AILearningAssistant";

// Interfaces (Consider moving to a shared types file: src/types/practice.ts)
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
interface LocalStorageReadingComprehensionProgress {
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

export default function ReadingComprehensionPassagePracticePage() {
  const router = useRouter();
  const params = useParams();
  const questionGroupIdParam = params.questionGroupId as string;
  const numericQuestionGroupId = parseInt(questionGroupIdParam, 10);

  // State variables (most are the same as the generic QuestionGroupPracticePage)
  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string | null>(null);
  // const [passageAudioUrl, setPassageAudioUrl] = useState<string | null>(null); // Keep if cloze might have audio

  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [splitPosition, setSplitPosition] = useState(50); // Adjust for 3 panels
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Record<number, string | Record<string, string>>
  >({});
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    LocalStorageReadingComprehensionProgress["questionResults"]
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

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiAssistantRef = useRef<AIAssistantRef>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  const localStorageKey = userId
    ? `readingComprehensionPracticeProgress_${userId}_${numericQuestionGroupId}` // Specific key
    : null;

  // --- useEffect for Auth ---
  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else {
        toast.error("User session not found.");
        router.push("/sign-in");
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  const addTextToAI = (text: string) => {
    aiAssistantRef.current?.addTextToInput(text);
  };

  // --- createNewSession (can be a shared hook/util later) ---
  const createNewSession = useCallback(
    async (fetchedQuestions: QuestionClient[], groupData: QuestionGroup) => {
      // ... (same logic as createNewQuestionGroupPracticeSession, ensure type is correct)
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
            title: `Reading Comprehension: ${groupData.name}`,
            type: PracticeSessionType.QUESTION_GROUP_PRACTICE,
            status: PracticeSessionStatus.IN_PROGRESS,
            totalQuestions: fetchedQuestions.length,
            subjectId: firstQSubjectId,
            basedOnQuestionGroupId: numericQuestionGroupId,
          }),
        });
        if (!response.ok) {
          const d = await response.json();
          throw new Error(d.error?.message || "Session creation failed");
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

  // --- fetchContentAndStart (can be a shared hook/util later, parameterized by API endpoint) ---
  const fetchContentAndStart = useCallback(async () => {
    // ... (same logic as fetchQuestionGroupAndStartSession, but uses createNewSession)
    if (!userId || !numericQuestionGroupId || isNaN(numericQuestionGroupId))
      return;
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setLoading("fetching-group");
    setError(null); /* Reset all states */
    setPassageTitle("");
    setPassageContent(null);
    /* setPassageAudioUrl(null); */ setQuestions([]);
    setCurrentQuestionIndex(0);
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
        const d = await response.json();
        throw new Error(d.error?.message || `API error ${response.status}`);
      }
      const data: {
        questionGroup: QuestionGroup;
        questions: QuestionClient[];
      } = await response.json();
      if (!data.questionGroup) throw new Error("No group data from API.");
      setPassageContent(data.questionGroup.description || "");
      setPassageTitle(data.questionGroup.name || "Reading Passage");
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

  // --- useEffect for Loading/Resuming Session (can be a shared hook/util) ---
  useEffect(() => {
    // ... (similar logic, ensuring it uses LocalStorageClozePracticeProgress type)
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
      )
        setLoading(true);
      return;
    }
    if (loading === true) {
      setLoading("resuming-session");
      const savedProgressString = safeStorage.getItem(localStorageKey, "local");
      let resumableSessionFound = false;
      if (savedProgressString) {
        try {
          const progress: LocalStorageReadingComprehensionProgress =
            JSON.parse(savedProgressString);
          if (
            progress.questionGroupId === numericQuestionGroupId &&
            !progress.sessionFinalized &&
            progress.practiceSessionId
          ) {
            setPassageTitle(progress.passageTitle);
            setPassageContent(progress.passageContent);
            /* setPassageAudioUrl(progress.audioUrl); */ setQuestions(
              progress.questions || []
            );
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
      if (!resumableSessionFound) fetchContentAndStart();
      else setLoading(false);
    }
  }, [userId, numericQuestionGroupId, fetchContentAndStart, localStorageKey]);

  // --- useEffect for Saving Progress (can be a shared hook/util) ---
  useEffect(() => {
    // ... (similar logic, using LocalStorageClozePracticeProgress type)
    if (
      !localStorageKey ||
      typeof loading === "string" ||
      loading ||
      !userId ||
      !currentPracticeSessionId ||
      showSummary
    )
      return;
    const contentToSave = passageContent === null ? "" : passageContent;
    const progress: LocalStorageReadingComprehensionProgress = {
      questionGroupId: numericQuestionGroupId,
      passageTitle,
      passageContent: contentToSave,
      /* audioUrl: passageAudioUrl, */ questions,
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
    /*passageAudioUrl,*/ currentSubjectId,
    localStorageKey,
  ]);

  // --- useEffect for Current Question UI State --- (Simplified for MCQ)
  useEffect(() => {
    if (currentQuestion) {
      const savedUserAnswerContent = answeredQuestions[currentQuestion.id];
      setIsAnswerCorrect(null);
      setSelectedAnswer(null);
      if (
        savedUserAnswerContent !== undefined &&
        typeof savedUserAnswerContent === "string"
      ) {
        setSelectedAnswer(savedUserAnswerContent);
        setIsAnswerCorrect(
          String(currentQuestion.correctAnswer ?? "").toLowerCase() ===
            savedUserAnswerContent.toLowerCase()
        );
      }
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, answeredQuestions]);

  // --- Core Logic Callbacks (awardXPAndStreak, saveStudentAnswerToDb, finalizePracticeSessionInDb) ---
  // These can be largely shared or put into a custom hook `usePracticeSessionManagement`
  const awardXPAndStreak = useCallback(
    async (xpToAdd: number) => {
      /* ... same general logic ... */ return null;
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
      /* ... same ... */
    },
    [currentPracticeSessionId]
  );
  const finalizePracticeSessionInDb = useCallback(async () => {
    /* ... same ... */
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

  // --- Answer Submission for Cloze (MCQ) ---
  const handleSubmitAnswerForCloze = useCallback(
    (userAns: string, isCorr: boolean) => {
      if (!currentQuestion) return;
      setAnsweredQuestions((prev) => ({
        ...prev,
        [currentQuestion.id]: userAns,
      }));
      setIsAnswerCorrect(isCorr);
      const points = isCorr ? currentQuestion.pointsAwarded || 2 : 0; // Cloze often 2 marks
      setQuestionResults((prevResults) => {
        /* ... same logic to update results ... */
        const newResult = {
          id: currentQuestion.id,
          correct: isCorr,
          question:
            currentQuestion.text ||
            `Blank ${currentQuestion.questionNumberOnPage}`,
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

  const onClozeOptionSelect = useCallback(
    (optionId: string) => {
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

      handleSubmitAnswerForCloze(optionId, isCorrect);
    },
    [currentQuestion, selectedAnswer, handleSubmitAnswerForCloze]
  );

  // --- Navigation Callbacks ---
  const handleNextQuestion = useCallback(async () => {
    setShowHint(false);
    setSelectedAnswer(null);
    if (questions.length === 0) {
      setShowSummary(true);
      await finalizePracticeSessionInDb();
      return;
    }
    if (currentQuestionIndex < questions.length - 1)
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    else {
      setShowSummary(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);
  const restartPractice = useCallback(async () => {
    /* ... same ... */ if (localStorageKey)
      safeStorage.removeItem(localStorageKey, "local");
    setShowSummary(false);
    setShowLevelUp(false);
    await fetchContentAndStart();
  }, [localStorageKey, fetchContentAndStart]);
  const exitToSubjectPractice = useCallback(async () => {
    /* ... same ... */ if (currentSubjectId)
      router.push(`/student/practice/subject/${currentSubjectId}`);
    else router.push("/student/practice");
  }, [currentSubjectId, router]);

  const handleMouseDown = (e: React.MouseEvent) => {
    /* ... same ... */ e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    /* ... same ... */ if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newPos = Math.max(
      30,
      Math.min(70, ((e.clientX - rect.left) / rect.width) * 100)
    );
    setSplitPosition(newPos);
  };
  const handleMouseUp = () => {
    /* ... same ... */ isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // --- Loading, Error, Summary Views ---
  // These can also be extracted into separate components if they become complex.
  const isInitialLoading =
    typeof loading === "string" ||
    (loading === true && passageContent === null && !error);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Preparing Reading Passage
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
      (acc, q) => acc + (q.pointsAwarded || 10),
      0
    );
    const percentageCorrect =
      totalPossibleScore > 0 && questions.length > 0
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
              Reading Comprehension Complete: {passageTitle}
            </h1>
            <p className="text-indigo-200">
              Well done! Here's your performance:
            </p>
          </div>
          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <p className="text-6xl font-bold text-indigo-600">
                {questions.length > 0 ? `${percentageCorrect}%` : "N/A"}
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
                          Question {index + 1}
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
            )}
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
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm sticky top-0 z-10">
        <button
          onClick={exitToSubjectPractice}
          className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"
        >
          <FaArrowLeft className="mr-1.5" /> Exit
        </button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          {passageTitle || "Reading Comprehension"}{" "}
          {questions.length > 0
            ? `• Question ${currentQuestionIndex + 1} of ${questions.length}`
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
        {/* Left side - Passage & Questions */}
        <div
          className="overflow-auto bg-gray-50 custom-scrollbar flex flex-col"
          style={{ width: `${splitPosition}%` }}
        >
          <div className="flex-shrink-0">
            <ReadingComprehensionPassage
              passageTitle={passageTitle}
              passageContent={passageContent}
              onAddTextToAIContext={addTextToAI}
            />
          </div>
          {currentQuestion && (
            <div className="p-4 md:p-6 bg-white border-t flex-1">
              <ReadingComprehensionQuestions
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                currentQuestion={currentQuestion}
                selectedAnswer={selectedAnswer}
                isAnswerCorrect={isAnswerCorrect}
                showHint={showHint}
                onAnswerSelect={(optionId: string) =>
                  onClozeOptionSelect(optionId)
                }
                onShowHint={() => setShowHint(true)}
                onNextQuestion={handleNextQuestion}
                loading={loading}
              />
            </div>
          )}
        </div>

        <div
          className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150"
          onMouseDown={handleMouseDown}
        >
          <div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div>
        </div>

        {/* Right side - AI Assistant */}
        <div
          className="bg-gray-50 flex flex-col overflow-hidden"
          style={{ width: `${100 - splitPosition - 0.5}%` }}
        >
          <AIAssistant
            ref={aiAssistantRef}
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
              4, // Chinese subject ID
              "Chinese" // Explicitly set for Chinese reading comprehension
            )}
          />
        </div>
      </div>
    </div>
  );
}
