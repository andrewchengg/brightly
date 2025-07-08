// src/components/MockExam/MockExamComponent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PracticeSessionType,
  QuestionType as PrismaQuestionType,
  PracticeSessionStatus,
} from "@/generated/prisma";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaArrowRight,
  FaFlagCheckered,
  FaSpinner,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { OptionTextFormatter } from "@/components/QuestionTextFormatter";
import { ExitPracticeDialog } from "@/components/ExitPracticeDialog";
import { InteractiveLoadingAnimation } from "@/components/ui/InteractiveLoadingAnimation";

export const dynamic = "force-dynamic";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: number;
  text: string;
  options?: Option[];
  correctAnswer: string | string[] | Record<string, string> | null;
  topicName: string;
  questionType: keyof typeof PrismaQuestionType;
  marks: number;
  imageUrl?: string;
  topic: {
    id: number;
    name: string;
  };
  booklet?: "A" | "B";
}

interface PaperConfig {
  id: string;
  name: string;
  duration: number;
  totalMarks: number;
  description: string;
  requirements: any;
}

interface SubjectConfig {
  id: string;
  name: string;
  papers: PaperConfig[];
}

const subjectsConfig: SubjectConfig[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    papers: [
      {
        id: "paper1",
        name: "Paper 1",
        duration: 60,
        totalMarks: 45,
        description: "Booklet A & B",
        requirements: {
          mcq1Mark: 10,
          mcq2Mark: 5,
          short1Mark: 5,
          short2Mark: 10,
        },
      },
      {
        id: "paper2",
        name: "Paper 2",
        duration: 90,
        totalMarks: 55,
        description: "Short & Long Answer",
        requirements: {
          short2Mark: 5,
          longAnswerTargetCount: 12,
          longAnswerTotalMarks: 45,
        },
      },
    ],
  },
];

interface MockExamComponentProps {
  userId: string;
  examDurationMinutes: number;
  subjectId: string;
  paperId: string;
  isBothPapers: boolean;
}

export default function MockExamComponent({
  userId,
  examDurationMinutes,
  subjectId,
  paperId,
  isBothPapers,
}: MockExamComponentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<
    string | null
  >(null);

  const [currentPaper, setCurrentPaper] = useState<"paper1" | "paper2">(
    paperId as "paper1" | "paper2"
  );
  const [showPaperTransition, setShowPaperTransition] = useState(false);
  const [paper1Answers, setPaper1Answers] = useState<
    Record<number, string | null>
  >({});
  const [paper1Score, setPaper1Score] = useState(0);
  const [paper1QuestionCount, setPaper1QuestionCount] = useState(0);
  const [paper1CorrectAnswers, setPaper1CorrectAnswers] = useState(0);

  const [textAnswer, setTextAnswer] = useState("");
  const [multiPartAnswers, setMultiPartAnswers] = useState<
    Record<string, string>
  >({});

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const router = useRouter();

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Core function to update the answers state
  const handleAnswerChange = (
    questionId: number,
    answer: string | Record<string, string> | null
  ) => {
    if (timeRemaining <= 0 || examSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]:
        typeof answer === "string"
          ? answer
          : answer === null
          ? null
          : JSON.stringify(answer),
    }));
  };

  // Calculate XP based on performance
  const calculateXP = (score: number, totalPossibleMarks: number) => {
    const percentage = (score / totalPossibleMarks) * 100;
    // Base XP is the score
    let xp = score;
    
    // Bonus XP for good performance
    if (percentage >= 90) xp += 20; // Excellence bonus
    else if (percentage >= 80) xp += 15;
    else if (percentage >= 70) xp += 10;
    else if (percentage >= 60) xp += 5;
    
    return Math.round(xp);
  };

  const handleSubmit = useCallback(async () => {
    if (examSubmitted || isSubmitting) return;
    if (!currentPracticeSessionId) {
      toast.error("Invalid session. Please restart the exam.");
      return;
    }

    const unansweredQuestionCount = questions.filter(
      (q) => answers[q.id] === null || answers[q.id] === undefined
    ).length;
    
    if (unansweredQuestionCount > 0 && !isSubmitting) {
      setShowSubmitDialog(true);
      return;
    }

    setIsSubmitting(true);
    toast.info("Submitting your exam...");

    let currentPaperScore = 0;
    let correctAnswersForThisPaperCount = 0;

    // First, save all student answers
    const studentAnswersPayload = questions.map((q) => {
      const submittedAnswerRaw = answers[q.id] ?? null;
      let isCorrect = false;
      let pointsEarnedThisQuestion = 0;

      if (submittedAnswerRaw !== null) {
        if (q.questionType === PrismaQuestionType.MULTIPLE_CHOICE) {
          isCorrect =
            String(q.correctAnswer).toLowerCase() ===
            String(submittedAnswerRaw).toLowerCase();
        } else if (
          q.questionType === PrismaQuestionType.OPEN_ENDED ||
          q.questionType === PrismaQuestionType.FILL_IN_THE_BLANK
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
            String(submittedAnswerRaw).trim().toLowerCase()
          );
        } else if (
          q.questionType === PrismaQuestionType.MULTI_PART &&
          typeof q.correctAnswer === "object" &&
          q.correctAnswer &&
          !Array.isArray(q.correctAnswer)
        ) {
          try {
            const userAnswersMap = JSON.parse(submittedAnswerRaw);
            const correctAnswersMap = q.correctAnswer as Record<string, string>;
            isCorrect = true;
            for (const part in correctAnswersMap) {
              if (
                (userAnswersMap[part] || "").trim().toLowerCase() !==
                String(correctAnswersMap[part]).trim().toLowerCase()
              ) {
                isCorrect = false;
                break;
              }
            }
          } catch (e) {
            isCorrect = false;
          }
        }
      }

      if (isCorrect) {
        pointsEarnedThisQuestion = q.marks;
        currentPaperScore += q.marks;
        correctAnswersForThisPaperCount++;
      }

      return {
        practiceSessionId: currentPracticeSessionId,
        questionId: q.id,
        submittedAnswer: submittedAnswerRaw,
        isCorrect,
        pointsEarned: pointsEarnedThisQuestion,
        attemptedAt: new Date().toISOString(),
      };
    });

    if (isBothPapers && currentPaper === "paper1") {
      setPaper1Answers(answers);
      setPaper1Score(currentPaperScore);
      setPaper1QuestionCount(questions.length);
      setPaper1CorrectAnswers(correctAnswersForThisPaperCount);
      console.log(
        "Paper 1 submitted. Score:",
        currentPaperScore,
        "Questions in P1:",
        questions.length,
        "Correct in P1:",
        correctAnswersForThisPaperCount
      );

      setShowPaperTransition(true);
      setTimeout(async () => {
        setShowPaperTransition(false);
        setCurrentPaper("paper2");
        const paper2Config = subjectsConfig
          .find((s) => s.id === subjectId)
          ?.papers.find((p) => p.id === "paper2");
        setTimeRemaining((paper2Config?.duration || 90) * 60);
        await fetchQuestionsForPaper("paper2");
        setIsSubmitting(false);
      }, 3000);
    } else {
      let finalScore = currentPaperScore;
      let finalCorrectAnswersCount = correctAnswersForThisPaperCount;
      let finalTotalQuestions = questions.length;

      if (isBothPapers && currentPaper === "paper2") {
        finalScore += paper1Score;
        finalTotalQuestions += paper1QuestionCount;
        finalCorrectAnswersCount += paper1CorrectAnswers;
        console.log(
          "Paper 2 submitted. P2 Score:",
          currentPaperScore,
          "Total Score for Both:",
          finalScore,
          "Total Questions for Both:",
          finalTotalQuestions,
          "Total Correct for Both:",
          finalCorrectAnswersCount
        );
      } else {
        console.log(
          "Single paper submitted. Score:",
          finalScore,
          "Total Questions:",
          finalTotalQuestions,
          "Total Correct:",
          finalCorrectAnswersCount
        );
      }

      if (currentPracticeSessionId) {
        try {
          // Calculate total possible marks correctly
          const totalPossibleMarks = isBothPapers && currentPaper === "paper2" 
            ? questions.reduce((acc, q) => acc + (q.marks || 1), 0) + paper1QuestionCount // Add marks from both papers
            : questions.reduce((acc, q) => acc + (q.marks || 1), 0);

          // Save student answers first
          if (studentAnswersPayload.length > 0) {
            try {
              await fetch("/api/student-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(studentAnswersPayload),
              }).then(async (res) => {
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({}));
                  throw new Error(`Failed to save answers: ${errorData.error || res.statusText}`);
                }
                return res.json();
              });
            } catch (error) {
              throw new Error(`Failed to save answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          const earnedXP = calculateXP(finalScore, totalPossibleMarks);

          // Then update session status
          const updateSessionResponse = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: PracticeSessionStatus.COMPLETED,
              endTime: new Date().toISOString(),
              score: finalScore,
              correctAnswers: finalCorrectAnswersCount,
              totalQuestions: finalTotalQuestions,
              xpEarned: earnedXP,
              totalMarksEarned: finalScore,
              totalPossibleMarks: totalPossibleMarks
            }),
          });

          if (!updateSessionResponse.ok) {
            const errorData = await updateSessionResponse.json().catch(() => ({}));
            throw new Error(`Failed to update session: ${errorData.error || updateSessionResponse.statusText}`);
          }

          // Update streak after completing the exam
          try {
            const streakResponse = await fetch("/api/user/update-streak", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ activityType: "mock_exam_completion" }),
            });

            if (!streakResponse.ok) {
              console.warn("Could not update streak after mock exam completion");
            } else {
              console.log("Streak updated after mock exam completion");
            }
          } catch (streakError) {
            console.error("Error updating streak after mock exam:", streakError);
          }

          setExamSubmitted(true);
          toast.success(`Exam Submitted! Your Score: ${finalScore}`);
          router.push(`/student/results/${currentPracticeSessionId}`);
        } catch (error) {
          console.error("Error submitting exam:", error);
          toast.error(error instanceof Error ? error.message : "Could not submit exam. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }
    }
  }, [
    examSubmitted,
    isSubmitting,
    questions,
    answers,
    currentPracticeSessionId,
    router,
    isBothPapers,
    currentPaper,
    paper1Score,
    subjectId,
    paper1QuestionCount,
    paper1CorrectAnswers,
    showSubmitDialog,
  ]);

  const submitExam = async () => {
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      let currentPaperScore = 0;
      let correctAnswersForThisPaperCount = 0;

      // Calculate scores and prepare answers payload
      const studentAnswersPayload = questions.map((q) => {
        const submittedAnswerRaw = answers[q.id] ?? null;
        let isCorrect = false;
        let pointsEarnedThisQuestion = 0;

        if (submittedAnswerRaw !== null) {
          if (q.questionType === PrismaQuestionType.MULTIPLE_CHOICE) {
            isCorrect = String(q.correctAnswer).toLowerCase() === String(submittedAnswerRaw).toLowerCase();
          } else if (q.questionType === PrismaQuestionType.OPEN_ENDED || q.questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
            const cAns = q.correctAnswer;
            const cAnsArr = Array.isArray(cAns)
              ? cAns.map((cv) => String(cv ?? "").trim().toLowerCase())
              : [String(cAns ?? "").trim().toLowerCase()];
            isCorrect = cAnsArr.includes(String(submittedAnswerRaw).trim().toLowerCase());
          } else if (q.questionType === PrismaQuestionType.MULTI_PART && typeof q.correctAnswer === "object" && q.correctAnswer && !Array.isArray(q.correctAnswer)) {
            try {
              const userAnswersMap = JSON.parse(submittedAnswerRaw);
              const correctAnswersMap = q.correctAnswer as Record<string, string>;
              isCorrect = true;
              for (const part in correctAnswersMap) {
                if ((userAnswersMap[part] || "").trim().toLowerCase() !== String(correctAnswersMap[part]).trim().toLowerCase()) {
                  isCorrect = false;
                  break;
                }
              }
            } catch (e) {
              isCorrect = false;
            }
          }
        }

        if (isCorrect) {
          pointsEarnedThisQuestion = q.marks;
          currentPaperScore += q.marks;
          correctAnswersForThisPaperCount++;
        }

        return {
          practiceSessionId: currentPracticeSessionId,
          questionId: q.id,
          submittedAnswer: submittedAnswerRaw,
          isCorrect,
          pointsEarned: pointsEarnedThisQuestion,
          attemptedAt: new Date().toISOString(),
        };
      });

      // First, save all student answers
      if (studentAnswersPayload.length > 0) {
        try {
          await fetch("/api/student-answers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentAnswersPayload),
          }).then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(`Failed to save answers: ${errorData.error || res.statusText}`);
            }
            return res.json();
          });
        } catch (error) {
          throw new Error(`Failed to save answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Calculate final scores
      let finalScore = currentPaperScore;
      let finalCorrectAnswersCount = correctAnswersForThisPaperCount;
      let finalTotalQuestions = questions.length;

      if (isBothPapers && currentPaper === "paper2") {
        finalScore += paper1Score;
        finalTotalQuestions += paper1QuestionCount;
        finalCorrectAnswersCount += paper1CorrectAnswers;
      }

      // Calculate total possible marks correctly
      const totalPossibleMarks = isBothPapers && currentPaper === "paper2" 
        ? questions.reduce((acc, q) => acc + (q.marks || 1), 0) + paper1QuestionCount // Add marks from both papers
        : questions.reduce((acc, q) => acc + (q.marks || 1), 0);

      const earnedXP = calculateXP(finalScore, totalPossibleMarks);

      // Then update session status
      const updateSessionResponse = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: PracticeSessionStatus.COMPLETED,
          endTime: new Date().toISOString(),
          score: finalScore,
          correctAnswers: finalCorrectAnswersCount,
          totalQuestions: finalTotalQuestions,
          xpEarned: earnedXP,
          totalMarksEarned: finalScore,
          totalPossibleMarks: totalPossibleMarks
        }),
      });

      if (!updateSessionResponse.ok) {
        const errorData = await updateSessionResponse.json().catch(() => ({}));
        throw new Error(`Failed to update session: ${errorData.error || updateSessionResponse.statusText}`);
      }

      // Update streak after completing the exam
      try {
        const streakResponse = await fetch("/api/user/update-streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType: "mock_exam_completion" }),
        });

        if (!streakResponse.ok) {
          console.warn("Could not update streak after mock exam completion");
        } else {
          console.log("Streak updated after mock exam completion");
        }
      } catch (streakError) {
        console.error("Error updating streak after mock exam:", streakError);
      }

      setExamSubmitted(true);
      toast.success(`Exam Submitted! Your Score: ${finalScore}`);
      router.push(`/student/results/${currentPracticeSessionId}`);
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error(error instanceof Error ? error.message : "Could not submit exam. Please try again.");
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!examStarted || timeRemaining <= 0 || examSubmitted) {
      if (
        timeRemaining <= 0 &&
        examStarted &&
        !examSubmitted &&
        !isSubmitting
      ) {
        handleSubmit();
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, timeRemaining, examSubmitted, isSubmitting, handleSubmit]);

  const fetchQuestionsForPaper = async (paperToFetch: string) => {
    setIsLoading(true);
    try {
      const subjectConfigFound = subjectsConfig.find((s) => s.id === subjectId);
      const paperConfig = subjectConfigFound?.papers.find(
        (p) => p.id === paperToFetch
      );
      if (!subjectConfigFound || !paperConfig)
        throw new Error(
          `Configuration for ${subjectId} - ${paperToFetch} not found.`
        );

      const response = await fetch(
        `/api/questions/${subjectId}/${paperToFetch}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paper: paperToFetch,
            requirements: paperConfig.requirements,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }
      const fetchedQuestions: Question[] = await response.json();

      if (!fetchedQuestions || fetchedQuestions.length === 0)
        throw new Error("No questions returned from API for this paper.");

      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0);
      if (!isBothPapers || (isBothPapers && paperToFetch === "paper1")) {
        setAnswers({});
      }
      setTextAnswer("");
      setMultiPartAnswers({});

      if (currentPracticeSessionId) {
        let sessionTotalQuestions = fetchedQuestions.length;
        if (isBothPapers && paperToFetch === "paper1") {
          setPaper1QuestionCount(fetchedQuestions.length);
          try {
            await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ totalQuestions: fetchedQuestions.length }),
            });
          } catch (e) {
            console.error(
              "Error initially setting totalQuestions for P1 of Both:",
              e
            );
          }
        } else if (isBothPapers && paperToFetch === "paper2") {
          sessionTotalQuestions += paper1QuestionCount;
          try {
            await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ totalQuestions: sessionTotalQuestions }),
            });
            console.log(
              `MockExam: BothPapers - Updated totalQuestions for session ${currentPracticeSessionId} to ${sessionTotalQuestions} after P2 load.`
            );
          } catch (e) {
            console.error("Error updating totalQuestions for P2 of Both:", e);
          }
        } else if (!isBothPapers) {
          try {
            const updateTotalQuestionsResponse = await fetch(
              `/api/practice-sessions/${currentPracticeSessionId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ totalQuestions: sessionTotalQuestions }),
              }
            );
            if (!updateTotalQuestionsResponse.ok) {
              console.error(
                "Failed to update totalQuestions for session:",
                await updateTotalQuestionsResponse.text()
              );
            } else {
              console.log(
                `MockExam: Updated totalQuestions for session ${currentPracticeSessionId} to ${sessionTotalQuestions}`
              );
            }
          } catch (e) {
            console.error("Error updating totalQuestions for session:", e);
          }
        }
      }
    } catch (error: any) {
      setError(
        "Failed to fetch questions: " + (error.message || "Unknown error")
      );
      toast.error(
        "Failed to load questions: " + (error.message || "Unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initializeExam = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const initialPaperConfig = subjectsConfig
        .find((s) => s.id === subjectId)
        ?.papers.find((p) => p.id === paperId);
      if (!initialPaperConfig)
        throw new Error("Initial paper configuration not found for mock exam.");
      setTimeRemaining(initialPaperConfig.duration * 60);

      let sessionTitle = `${
        subjectId.charAt(0).toUpperCase() + subjectId.slice(1)
      } - ${isBothPapers ? "Full Mock Exam" : initialPaperConfig.name}`;

      const newSessionResponse = await fetch("/api/practice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: userId,
          title: `${sessionTitle} - Mock Exam - ${new Date().toLocaleDateString()}`,
          type: PracticeSessionType.MOCK_EXAM,
          status: PracticeSessionStatus.IN_PROGRESS,
          examDurationMinutes: examDurationMinutes,
          totalQuestions: 0,
          questions: []
        }),
      });

      if (!newSessionResponse.ok) {
        const errorData = await newSessionResponse.json();
        throw new Error(
          errorData.error?.message || "Failed to create practice session"
        );
      }
      const sessionData = await newSessionResponse.json();
      setCurrentPracticeSessionId(sessionData.id);

      await fetchQuestionsForPaper(paperId);
      setExamStarted(true);
    } catch (error: any) {
      setError("Failed to start exam: " + (error.message || "Unknown error"));
      toast.error(
        "Failed to start exam: " + (error.message || "Unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to load current question's answer into local state for text/multipart inputs
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQ = questions[currentQuestionIndex];
      const savedAnswerString = answers[currentQ.id];

      setTextAnswer("");
      setMultiPartAnswers({});

      if (savedAnswerString !== null && savedAnswerString !== undefined) {
        if (
          currentQ.questionType === PrismaQuestionType.OPEN_ENDED ||
          currentQ.questionType === PrismaQuestionType.FILL_IN_THE_BLANK
        ) {
          setTextAnswer(savedAnswerString);
        } else if (currentQ.questionType === PrismaQuestionType.MULTI_PART) {
          try {
            setMultiPartAnswers(JSON.parse(savedAnswerString));
          } catch {
            setMultiPartAnswers({});
          }
        }
      }
    }
  }, [currentQuestionIndex, questions, answers]);

  const currentQuestionData = questions[currentQuestionIndex]; // Define here for use in input handlers

  // Specific handler for MCQ selection
  const handleOptionSelect = (questionId: number, optionId: string) => {
    handleAnswerChange(questionId, optionId);
  };

  // Handler for text-based inputs (OPEN_ENDED, FILL_IN_THE_BLANK)
  const handleTextAnswerInput = (value: string) => {
    setTextAnswer(value); // Update local state for the input field
    if (currentQuestionData) {
      handleAnswerChange(currentQuestionData.id, value); // Update the main answers state
    }
  };

  // Handler for multi-part inputs
  const handleMultiPartAnswerInput = (partKey: string, value: string) => {
    const newMultiPartAns = { ...multiPartAnswers, [partKey]: value };
    setMultiPartAnswers(newMultiPartAns); // Update local state for multi-part inputs
    if (currentQuestionData) {
      handleAnswerChange(currentQuestionData.id, newMultiPartAns); // Update the main answers state
    }
  };

  const handleNavigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleCancel = async () => {
    setShowExitDialog(true);
  };

  const handleExitWithoutSaving = async () => {
    if (!currentPracticeSessionId) {
      // If there's no session ID, just redirect
      window.location.href = '/student/mock-exam';
      return;
    }
    
    try {
      // Delete the practice session
      const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // If the session is not found, that's fine - just redirect
        if (response.status === 404) {
          window.location.href = '/student/mock-exam';
          return;
        }
        throw new Error('Failed to delete practice session');
      }

      // Redirect to the mock exam landing page
      window.location.href = '/student/mock-exam';
    } catch (error) {
      console.error('Error exiting exam:', error);
      toast.error('Failed to exit exam. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 0 || seconds < 0) return "00:00";
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Render logic
  if (isLoading && !examStarted)
    return (
      <InteractiveLoadingAnimation 
        title="Preparing Your Mock Exam"
        subtitle="Setting up your exam environment..."
        theme="study"
      />
    );
  if (isLoading && examStarted && questions.length === 0 && !error)
    return (
      <InteractiveLoadingAnimation 
        title="Loading Your Questions"
        subtitle="Almost ready to begin your exam..."
        theme="study"
      />
    );
  if (error)
    return (
      <div className="text-center p-8 text-red-500">
        Error: {error} <Button onClick={initializeExam}>Try Again</Button>
      </div>
    );

  if (showPaperTransition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Paper 1 Completed</h2>
          <p className="text-gray-600 mb-4">Preparing Paper 2...</p>
          <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (questions.length === 0 && examStarted && !isLoading)
    return (
      <div className="text-center p-8">
        No questions available for this paper. Please contact support.
      </div>
    );
  // const currentQuestionData = questions[currentQuestionIndex]; // Already defined
  if (!currentQuestionData)
    return <div className="text-center p-8">Loading question data...</div>;

  const questionType = currentQuestionData.questionType as
    | keyof typeof PrismaQuestionType
    | undefined;

  return (
    <div className="flex h-screen w-full">
      {showExitDialog && (
        <ExitPracticeDialog
          isOpen={showExitDialog}
          onClose={() => setShowExitDialog(false)}
          onExit={handleExitWithoutSaving}
          currentProgress={{
            currentQuestion: currentQuestionIndex + 1,
            totalQuestions: questions.length,
            score: 0,
            correctAnswers: Object.values(answers).filter(answer => answer !== null).length,
            totalMarksEarned: 0,
            totalPossibleMarks: questions.reduce((acc, q) => acc + q.marks, 0),
            xpEarned: 0
          }}
        />
      )}
      {/* Main content area */}
      <div className="flex-1 flex flex-col relative bg-gray-50">
        {/* Timer and Progress Bar */}
        <div className="sticky top-0 bg-white shadow-md z-10 p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              <FaArrowLeft className="mr-2" /> Exit Exam
            </Button>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaFlagCheckered className="mr-2" />
              )}
              Submit Exam
            </Button>
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full bg-gray-200 mt-4">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
              <div className="mb-3 sm:mb-0">
                <h1 className="text-xl md:text-2xl font-bold text-indigo-700">
                  {subjectId.charAt(0).toUpperCase() + subjectId.slice(1)} Mock Exam
                  - {currentPaper === "paper1" ? "Paper 1" : "Paper 2"}
                </h1>
                <p className="text-xs md:text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length} | Marks:{" "}
                  {currentQuestionData.marks}
                </p>
              </div>
            </div>

            {/* Question Navigation Bubbles */}
            <div className="mb-6 flex flex-wrap gap-1.5 justify-center max-w-full overflow-x-auto pb-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => handleNavigateToQuestion(index)}
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-medium flex items-center justify-center border-2 transition-all shrink-0
                            ${
                              index === currentQuestionIndex
                                ? "bg-indigo-600 text-white border-indigo-700 scale-110 ring-2 ring-indigo-300"
                                : answers[q.id] !== null &&
                                  answers[q.id] !== undefined
                                ? "bg-green-500 text-white border-green-600"
                                : "bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300"
                            }`}
                  title={`Go to Question ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {/* Current Question Display */}
            <div className="mb-8 p-4 border rounded-md bg-indigo-50 min-h-[150px]">
              <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-3 leading-relaxed whitespace-pre-wrap">
                {currentQuestionData.text}
              </h3>
              {currentQuestionData.imageUrl && (
                <img
                  src={currentQuestionData.imageUrl}
                  alt="Question Visual"
                  className="my-3 rounded-md border max-h-60 mx-auto object-contain"
                />
              )}
              <p className="text-xs text-gray-600 mt-1">
                Topic: {currentQuestionData.topicName}
              </p>
            </div>

            {/* Answer Input Area */}
            <div className="min-h-[150px] mb-20">
              {questionType === PrismaQuestionType.MULTIPLE_CHOICE &&
                currentQuestionData.options && (
                  <div className="space-y-2">
                    {currentQuestionData.options.map((option, index) => {
                      const optionId = option.id;
                      const optionText = option.text;
                      const optionLetter = String.fromCharCode(65 + index);
                      const isSelected =
                        answers[currentQuestionData.id] === optionId;
                      return (
                        <button
                          key={option.id || index}
                          onClick={() =>
                            handleOptionSelect(currentQuestionData.id, optionId)
                          }
                          disabled={timeRemaining <= 0 || examSubmitted}
                          className={`w-full text-left p-3 rounded-md transition-all duration-150 text-sm border
                                    ${
                                      isSelected
                                        ? "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500"
                                        : "bg-white hover:bg-gray-100 border-gray-300"
                                    }
                                    ${
                                      timeRemaining <= 0 || examSubmitted
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                    }`}
                        >
                          <span className="font-semibold mr-2">
                            {optionLetter}.
                          </span>{" "}
                          <OptionTextFormatter text={optionText} />
                        </button>
                      );
                    })}
                  </div>
                )}

              {(questionType === PrismaQuestionType.OPEN_ENDED ||
                questionType === PrismaQuestionType.FILL_IN_THE_BLANK) && (
                <div className="mt-2">
                  <label
                    htmlFor={`text-answer-${currentQuestionData.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Your Answer:
                  </label>
                  <textarea
                    id={`text-answer-${currentQuestionData.id}`}
                    value={textAnswer}
                    onChange={(e) => handleTextAnswerInput(e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={timeRemaining <= 0 || examSubmitted}
                    rows={questionType === PrismaQuestionType.OPEN_ENDED ? 5 : 3}
                    className={`w-full p-3 text-sm rounded-md border ${
                      timeRemaining <= 0 || examSubmitted
                        ? "border-gray-300 bg-gray-100"
                        : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    }`}
                  />
                </div>
              )}

              {questionType === PrismaQuestionType.MULTI_PART &&
                typeof currentQuestionData.correctAnswer === "object" &&
                currentQuestionData.correctAnswer &&
                !Array.isArray(currentQuestionData.correctAnswer) && (
                  <div className="mt-2 space-y-3">
                    {Object.keys(currentQuestionData.correctAnswer).map(
                      (partKey) => (
                        <div key={partKey}>
                          <label
                            htmlFor={`mp-${currentQuestionData.id}-${partKey}`}
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Part {partKey.toUpperCase()}:
                          </label>
                          <input
                            type="text"
                            id={`mp-${currentQuestionData.id}-${partKey}`}
                            value={multiPartAnswers[partKey] || ""}
                            onChange={(e) =>
                              handleMultiPartAnswerInput(partKey, e.target.value)
                            }
                            placeholder={`Answer for part ${partKey.toUpperCase()}`}
                            disabled={timeRemaining <= 0 || examSubmitted}
                            className={`w-full p-3 text-sm rounded-md border ${
                              timeRemaining <= 0 || examSubmitted
                                ? "border-gray-300 bg-gray-100"
                                : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            }`}
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Navigation buttons - now inside the main content area */}
        <div className="sticky bottom-0 bg-white shadow-lg p-4 border-t">
          <div className="max-w-4xl mx-auto flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstQuestion}
              className="w-32"
            >
              <FaArrowLeft className="mr-2" /> Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLastQuestion}
              className="w-32 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Next <FaArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      {/* This dialog is now handled by the showExitDialog state */}

      {/* Submit Dialog */}
      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <div className="relative p-6 border-b border-gray-100">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <FaTimes size={16} />
              </button>

              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                  <FaExclamationTriangle className="text-amber-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Submit Exam with Unanswered Questions?
                  </h3>
                  <p className="text-sm text-gray-600">
                    You have {questions.filter(q => !answers[q.id]).length} unanswered questions. These will be marked as incorrect.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6">
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(false)}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Review Questions
              </Button>
              <Button
                onClick={() => {
                  setShowSubmitDialog(false);
                  submitExam();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Submit Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
