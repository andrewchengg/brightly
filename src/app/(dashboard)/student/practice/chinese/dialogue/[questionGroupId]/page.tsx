// src/app/(dashboard)/student/practice/chinese/dialogue/[questionGroupId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
  FaQuestionCircle,
} from "react-icons/fa";

// Interfaces
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

interface DialogueOption {
  id: number;
  text: string;
  used: boolean;
}

interface DialogueBlank {
  id: string;
  correctAnswer: number;
  userAnswer: number | null;
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

interface LocalStorageDialoguePracticeProgress {
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
  dialogueMode?: boolean;
  dialogueOptions?: DialogueOption[];
  dialogueBlanks?: DialogueBlank[];
}

export default function DialoguePassagePracticePage() {
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
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    LocalStorageDialoguePracticeProgress["questionResults"]
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
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);

  // Dialogue specific state
  const [dialogueMode, setDialogueMode] = useState(false);
  const [dialogueOptions, setDialogueOptions] = useState<DialogueOption[]>([]);
  const [dialogueBlanks, setDialogueBlanks] = useState<DialogueBlank[]>([]);
  const [dialogueContent, setDialogueContent] = useState<string>("");
  const [instructionsText, setInstructionsText] = useState<string>("");

  const localStorageKey = userId
    ? `dialoguePracticeProgress_${userId}_${numericQuestionGroupId}`
    : null;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string | Record<string, string>>>({});
  const [progress, setProgress] = useState<ProgressState>({
    currentQuestion: 0,
    totalQuestions: 0,
    score: 0,
    correctAnswers: 0,
    totalMarksEarned: 0,
    totalPossibleMarks: 0,
    xpEarned: 0,
  });

  // Function to parse dialogue data from QuestionGroup description
  const parseDialogueData = useCallback((description: string) => {
    const lines = description
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    let options: DialogueOption[] = [];
    let blanks: DialogueBlank[] = [];
    let dialogue = "";
    let instructions = "";

    let currentSection = "instructions";
    let dialogueLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect sections
      if (line.includes("选择适当的短语") || line.includes("选择适当的")) {
        currentSection = "options";
        continue;
      } else if (line.includes("对话：")) {
        currentSection = "dialogue";
        continue;
      } else if (line.includes("答案：")) {
        currentSection = "answers";
        continue;
      }

      if (currentSection === "instructions") {
        instructions += line + "\n";
      } else if (currentSection === "options") {
        // Parse options like "1. 这个周末你有什么计划吗？"
        const optionMatch = line.match(/^(\d+)\.\s*(.+)$/);
        if (optionMatch) {
          options.push({
            id: parseInt(optionMatch[1]),
            text: optionMatch[2],
            used: false,
          });
        }
      } else if (currentSection === "dialogue") {
        if (line && !line.includes("答案：")) {
          dialogueLines.push(line);
        }
      } else if (currentSection === "answers") {
        // Parse answers like "Q1: 1"
        const answerMatch = line.match(/^(Q\d+):\s*(\d+)$/);
        if (answerMatch) {
          blanks.push({
            id: answerMatch[1],
            correctAnswer: parseInt(answerMatch[2]),
            userAnswer: null,
          });
        }
      }
    }

    dialogue = dialogueLines.join("\n");

    return {
      options,
      blanks,
      dialogue,
      instructions: instructions.trim(),
    };
  }, []);

  // Auth effect
  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else {
        toast.error("User session not found.");
        router.push("/sign-in");
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  // Create new session
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
            title: `Dialogue: ${groupData.name}`,
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

  // Fetch content and start
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

      // Check if this is a dialogue completion exercise
      const isDialogueCompletion =
        (data.questionGroup.name?.includes("完成对话") ?? false) ||
        (data.questionGroup.description?.includes("完成对话") ?? false);

      setDialogueMode(isDialogueCompletion);

      // For dialogue completion exercises, parse the real data
      if (isDialogueCompletion && data.questionGroup.description) {
        const parsedData = parseDialogueData(data.questionGroup.description);
        setDialogueOptions(parsedData.options);
        setDialogueBlanks(parsedData.blanks);
        setDialogueContent(parsedData.dialogue);
        setInstructionsText(parsedData.instructions);
        setPassageContent(parsedData.dialogue);
        setPassageTitle(data.questionGroup.name || "完成对话");
      } else {
        setPassageContent(data.questionGroup.description || "");
        setPassageTitle(data.questionGroup.name || "Dialogue Practice");
      }

      const fQ = data.questions || [];
      setQuestions(fQ);

      if (fQ.length > 0 && fQ[0].topic?.subjectId)
        setCurrentSubjectId(fQ[0].topic.subjectId);

      // For dialogue completion, we don't need questions from the API
      if (isDialogueCompletion) {
        // Mock session creation for dialogue completion
        setCurrentPracticeSessionId("dialogue_214_session");
      } else {
        const sId = await createNewSession(fQ, data.questionGroup);
        if (!sId) setError("Failed to start new session in DB.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load content.");
      setPassageTitle("Error");
      setPassageContent("Load error.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, numericQuestionGroupId, createNewSession, localStorageKey]);

  // Load/resume session effect
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
          const progress: LocalStorageDialoguePracticeProgress =
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
            setQuestionResults(progress.questionResults || []);
            setCurrentPracticeSessionId(progress.practiceSessionId);
            setCurrentSubjectId(progress.subjectId || null);
            setSessionFinalized(false);
            if (progress.dialogueMode) {
              setDialogueMode(true);
              if (progress.dialogueOptions)
                setDialogueOptions(progress.dialogueOptions);
              if (progress.dialogueBlanks)
                setDialogueBlanks(progress.dialogueBlanks);
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

  // Save progress effect
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
    const contentToSave = passageContent === null ? "" : passageContent;
    const progress: LocalStorageDialoguePracticeProgress = {
      questionGroupId: numericQuestionGroupId,
      passageTitle,
      passageContent: contentToSave,
      questions,
      score,
      questionResults,
      sessionFinalized,
      practiceSessionId: currentPracticeSessionId,
      subjectId: currentSubjectId,
      dialogueMode,
      dialogueOptions,
      dialogueBlanks,
      currentQuestionIndex: 0,
      answeredQuestions: {},
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
    dialogueMode,
    dialogueOptions,
    dialogueBlanks,
  ]);

  // Dialogue-specific handlers
  const handleDialogueOptionClick = useCallback(
    (optionId: number, blankId: string) => {
      if (showSummary) return;

      const option = dialogueOptions.find((opt) => opt.id === optionId);
      if (option?.used) return;

      setDialogueBlanks((prev) =>
        prev.map((blank) => {
          if (blank.id === blankId) {
            if (blank.userAnswer !== null) {
              setDialogueOptions((opts) =>
                opts.map((opt) =>
                  opt.id === blank.userAnswer ? { ...opt, used: false } : opt
                )
              );
            }
            return { ...blank, userAnswer: optionId };
          }
          return blank;
        })
      );

      setDialogueOptions((prev) =>
        prev.map((opt) => (opt.id === optionId ? { ...opt, used: true } : opt))
      );
    },
    [dialogueOptions, showSummary]
  );

  const handleDialogueSubmit = useCallback(() => {
    let correctCount = 0;
    const results: any[] = [];

    dialogueBlanks.forEach((blank) => {
      const isCorrect = blank.userAnswer === blank.correctAnswer;
      if (isCorrect) correctCount++;

      const userOption = dialogueOptions.find(
        (opt) => opt.id === blank.userAnswer
      );
      const correctOption = dialogueOptions.find(
        (opt) => opt.id === blank.correctAnswer
      );

      results.push({
        id: parseInt(blank.id.substring(1)), // Remove 'Q' prefix
        correct: isCorrect,
        question: `${blank.id}: Dialogue completion`,
        userAnswer: userOption
          ? `${userOption.id}. ${userOption.text}`
          : "No selection",
        correctAnswer: correctOption
          ? `${correctOption.id}. ${correctOption.text}`
          : "Unknown",
      });
    });

    setScore(correctCount * 2); // 2 points per correct answer
    setQuestionResults(results);
    setShowResults(true);
    setSessionFinalized(true);
  }, [dialogueBlanks, dialogueOptions]);

  const handleReset = useCallback(() => {
    setDialogueBlanks((prev) =>
      prev.map((blank) => ({ ...blank, userAnswer: null }))
    );
    setDialogueOptions((prev) => prev.map((opt) => ({ ...opt, used: false })));
    setShowResults(false);
    setScore(0);
    setQuestionResults([]);
    setSessionFinalized(false);
  }, []);

  // Function to render dialogue with blanks
  const renderDialogueContent = useCallback(() => {
    if (!dialogueContent) return null;

    const lines = dialogueContent.split("\n");
    return lines
      .map((line, lineIndex) => {
        if (!line.trim()) return null;

        // Split line by Q placeholders and render
        const parts = line.split(/(__Q\d+__|Q\d+)/);

        return (
          <div key={lineIndex} className="flex flex-wrap items-center mb-4">
            {parts.map((part, partIndex) => {
              // Check if this part is a question placeholder
              const qMatch = part.match(/(?:__)?Q(\d+)(?:__)?/);
              if (qMatch) {
                const qId = `Q${qMatch[1]}`;
                const blank = dialogueBlanks.find((b) => b.id === qId);
                if (blank) {
                  return (
                    <DialogueBlank
                      key={`${lineIndex}-${partIndex}`}
                      blank={blank}
                      options={dialogueOptions}
                      onOptionClick={handleDialogueOptionClick}
                      showResults={showResults}
                      questions={questions}
                    />
                  );
                }
              }

              // Regular text part
              if (part.trim()) {
                return (
                  <span key={`${lineIndex}-${partIndex}`} className="text-xl">
                    {part}
                  </span>
                );
              }

              return null;
            })}
          </div>
        );
      })
      .filter(Boolean);
  }, [
    dialogueContent,
    dialogueBlanks,
    dialogueOptions,
    handleDialogueOptionClick,
    showResults,
  ]);

  const exitToSubjectPractice = useCallback(async () => {
    if (currentSubjectId)
      router.push(`/student/practice/subject/${currentSubjectId}`);
    else router.push("/student/practice");
  }, [currentSubjectId, router]);

  // Loading states
  const isInitialLoading =
    typeof loading === "string" ||
    (loading === true && passageContent === null && !error);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <FaSpinner className="animate-spin text-indigo-600 text-5xl mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Preparing Dialogue Practice
          </h2>
          <p className="text-gray-600 mb-4">Loading dialogue content...</p>
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
    const totalPossibleScore = dialogueMode
      ? dialogueBlanks.length * 2
      : questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);
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
              Dialogue Complete: {passageTitle}
            </h1>
            <p className="text-indigo-200">
              Well done! Here is your performance:
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
                  {dialogueMode ? dialogueBlanks.length : questions.length}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 uppercase">
                  Correct Answers
                </p>
                <p className="text-2xl font-semibold text-green-600">
                  {correctCount} /{" "}
                  {dialogueMode ? dialogueBlanks.length : questions.length}
                </p>
              </div>
            </div>
            {questionResults.length > 0 && (
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
                      <span>{result.question}</span>
                      {result.correct ? <FaCheck /> : <FaTimes />}
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
                onClick={handleReset}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                <FaRocket className="mr-2" /> Practice Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dialogue interface
  if (dialogueMode) {
    const isComplete =
      dialogueBlanks.length > 0 &&
      dialogueBlanks.every((blank) => blank.userAnswer !== null);

    return (
      <div className="min-h-screen bg-gray-50">
        {showLevelUp && (
          <LevelUpNotification
            level={newLevel}
            onClose={() => setShowLevelUp(false)}
          />
        )}

        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-md">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <button
              onClick={exitToSubjectPractice}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors text-lg"
            >
              <FaArrowLeft className="mr-3 text-xl" />
              返回练习
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{passageTitle}</h1>
            <div className="text-lg text-gray-600 font-medium">
              完成度:{" "}
              {dialogueBlanks.filter((b) => b.userAnswer !== null).length}/
              {dialogueBlanks.length}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-lg border p-10 mb-8">
            <div className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
              {instructionsText ||
                "四 完成对话（4题8分）\n\n根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。"}
            </div>
          </div>

          {/* Dialogue and Options Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Dialogue - Left Side (2/3 width) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border p-10">
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                  对话：
                </h3>
                <div className="space-y-2 text-lg text-gray-800 leading-relaxed">
                  {renderDialogueContent()}
                </div>
              </div>
            </div>

            {/* Options - Right Side (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md border p-4 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  选择适当的短语：
                </h3>
                <div className="space-y-2">
                  {dialogueOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-start p-3 rounded-lg border transition-all ${
                        option.used
                          ? "bg-gray-100 border-gray-300 text-gray-500"
                          : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <span className="font-semibold text-gray-700 mr-3 min-w-[24px] flex-shrink-0">
                        {option.id}
                      </span>
                      <span
                        className={`${
                          option.used ? "line-through" : ""
                        } text-sm leading-relaxed`}
                      >
                        {option.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Score Display */}
          {showResults && (
            <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  你的成绩
                </h3>
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {score}
                    </div>
                    <div className="text-gray-600">得分</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {questionResults.filter((r) => r.correct).length}
                    </div>
                    <div className="text-gray-600">正确</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-600">
                      {dialogueBlanks.length}
                    </div>
                    <div className="text-gray-600">总题数</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit/Reset Button */}
          <div className="flex gap-4 justify-center">
            {!showResults ? (
              <Button
                onClick={handleDialogueSubmit}
                disabled={!isComplete}
                className={`px-12 py-4 text-xl text-white font-semibold rounded-xl transition-all ${
                  isComplete
                    ? "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                提交答案
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  onClick={handleReset}
                  className="px-12 py-4 text-xl text-white font-semibold rounded-xl bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <FaRocket className="mr-2" /> 再试一次
                </Button>
                <Button
                  onClick={exitToSubjectPractice}
                  variant="outline"
                  className="px-12 py-4 text-xl font-semibold rounded-xl border-2 hover:bg-gray-50 transition-all"
                >
                  <FaArrowLeft className="mr-2" /> 返回练习
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for non-dialogue content
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
        <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Content Not Available
        </h2>
        <p className="text-gray-600 mb-6">
          This practice section could not be loaded or is not configured for
          dialogue completion.
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

// Component for dialogue blanks
function DialogueBlank({
  blank,
  options,
  onOptionClick,
  showResults,
  questions,
}: {
  blank: DialogueBlank;
  options: DialogueOption[];
  onOptionClick: (optionId: number, blankId: string) => void;
  showResults: boolean;
  questions: QuestionClient[];
}) {
  const userOption = options.find((opt) => opt.id === blank.userAnswer);
  const correctOption = options.find((opt) => opt.id === blank.correctAnswer);
  const isCorrect = blank.userAnswer === blank.correctAnswer;
  const [showExplanationPopup, setShowExplanationPopup] = useState(false);

  // Get explanation from questions data
  const getExplanation = (questionId: string) => {
    const question = questions.find(
      (q) =>
        q.questionNumberOnPage === questionId || q.text?.includes(questionId)
    );
    return question?.explanation || "请参考对话上下文选择最合适的答案。";
  };

  if (showResults) {
    return (
      <div className="inline-flex items-center mx-1 relative">
        <span
          className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-medium ${
            isCorrect
              ? "bg-green-100 text-green-800 border-2 border-green-300"
              : "bg-red-100 text-red-800 border-2 border-red-300"
          }`}
        >
          <span className="font-bold mr-2">{blank.id}:</span>
          {userOption ? `${userOption.id}. ${userOption.text}` : "未选择"}
          {isCorrect ? (
            <FaCheck className="ml-2 text-green-600" />
          ) : (
            <FaTimes className="ml-2 text-red-600" />
          )}
        </span>

        {/* Explanation Icon */}
        <button
          onClick={() => setShowExplanationPopup(!showExplanationPopup)}
          className="ml-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
          title="查看解释"
        >
          <FaQuestionCircle className="text-lg" />
        </button>

        {/* Explanation Popup */}
        {showExplanationPopup && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-white border-2 border-blue-200 rounded-lg shadow-lg p-4 w-80">
            <div className="text-sm">
              <div className="font-semibold text-gray-800 mb-2">解释：</div>
              <div className="text-gray-700 mb-3">
                {getExplanation(blank.id)}
              </div>
              {!isCorrect && correctOption && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="font-semibold text-green-800">正确答案：</div>
                  <div className="text-green-700">
                    {correctOption.id}. {correctOption.text}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowExplanationPopup(false)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="inline-block mx-1">
      <div className="relative">
        <select
          value={blank.userAnswer || ""}
          onChange={(e) => {
            const optionId = parseInt(e.target.value);
            if (optionId) {
              onOptionClick(optionId, blank.id);
            }
          }}
          className="appearance-none bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-2 text-lg font-semibold text-blue-800 focus:outline-none focus:border-blue-500 min-w-[150px]"
        >
          <option value="">{blank.id}</option>
          {options
            .filter((opt) => !opt.used || opt.id === blank.userAnswer)
            .map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.id}. {opt.text}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
