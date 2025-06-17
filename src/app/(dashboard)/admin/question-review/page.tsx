// src/app/(dashboard)/admin/question-review/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import QuestionEditorForm, {
  type QuestionReviewData,
} from "./QuestionEditorForm";
import QuestionFilters from "@/components/QuestionFilters";
import {
  FaArrowLeft,
  FaArrowRight,
  FaSpinner,
  FaBook,
  FaChartBar,
  FaEye,
  FaList,
  FaCircle,
  FaImage,
  FaFilter,
  FaLightbulb,
} from "react-icons/fa";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import { QuestionType as PrismaQuestionType } from "@/generated/prisma";
import QuestionTextFormatter, { OptionTextFormatter } from "@/components/QuestionTextFormatter";
import ExplanationFormatter from "@/components/ExplanationFormatter";

interface TopicStats {
  id: number;
  name: string;
  questionsForReview: number;
}

interface SubjectStats {
  id: number;
  name: string;
  totalQuestionsForReview: number;
  topics: TopicStats[];
}

interface TopicQuestionData {
  id: number;
  text: string;
  productionReady: boolean;
  isRefactored: boolean;
  questionType: string;
  difficulty: string;
  subject: { id: number; name: string };
  topic: { id: number; name: string; subjectId: number };
  questionGroup: { id: number; name: string } | null;
  options?: any;
  correctAnswer?: any;
  explanation?: string;
  imageUrl?: string;
  fullPageImageUrl?: string;
  sourceSchool?: string | null;
  sourceYear?: number | null;
  sourceLevel?: string | null;
  sourceAssessmentType?: string | null;
}

interface TopicInfo {
  id: number;
  name: string;
  subject: { id: number; name: string };
}

type ViewMode =
  | "subjects"
  | "statistics"
  | "topicQuestions"
  | "questionDetail"
  | "filteredQuestions"
  | "productionReview";

// Function to get status color based on productionReady and isRefactored
const getStatusColor = (productionReady: boolean, isRefactored: boolean) => {
  if (productionReady && isRefactored) {
    return {
      bg: "bg-green-100",
      border: "border-green-300",
      text: "text-green-800",
      dot: "text-green-500",
    };
  } else if (productionReady && !isRefactored) {
    return {
      bg: "bg-orange-100",
      border: "border-orange-300",
      text: "text-orange-800",
      dot: "text-orange-500",
    };
  } else {
    return {
      bg: "bg-red-100",
      border: "border-red-300",
      text: "text-red-800",
      dot: "text-red-500",
    };
  }
};

// Function to get status text
const getStatusText = (productionReady: boolean, isRefactored: boolean) => {
  if (productionReady && isRefactored) {
    return "Ready";
  } else if (productionReady && !isRefactored) {
    return "Production (Needs Refactor)";
  } else {
    return "Needs Review";
  }
};

// Function to check if any source information contains PSLE
const isPSLEQuestion = (question: { sourceSchool?: string | null; sourceAssessmentType?: string | null; sourceLevel?: string | null }) => {
  const hasPSLEInSchool = question.sourceSchool?.toLowerCase().includes('psle') || false;
  const hasPSLEInAssessment = question.sourceAssessmentType?.toLowerCase().includes('psle') || false;
  const hasPSLEInLevel = question.sourceLevel?.toLowerCase().includes('psle') || false;
  
  return hasPSLEInSchool || hasPSLEInAssessment || hasPSLEInLevel;
};

// Function to render source school with PSLE highlighting
const renderSourceSchool = (question: { sourceSchool?: string | null; sourceYear?: number | null; sourceLevel?: string | null; sourceAssessmentType?: string | null }) => {
  if (!question.sourceSchool) return null;
  
  const isPSLE = isPSLEQuestion(question);
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isPSLE 
        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg border-2 border-red-300 animate-pulse' 
        : 'bg-blue-100 text-blue-800 border border-blue-200'
    }`}>
      {isPSLE && <span className="mr-1">🏆</span>}
      <span className="font-bold">{question.sourceSchool}</span>
      {question.sourceYear && <span className="ml-1 opacity-90">({question.sourceYear})</span>}
      {isPSLE && <span className="ml-1">🏆</span>}
    </div>
  );
};

export default function QuestionReviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("subjects");
  const [subjects, setSubjects] = useState<SubjectStats[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(
    null
  );
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<TopicQuestionData[]>([]);
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtered questions state
  const [filteredQuestions, setFilteredQuestions] = useState<
    TopicQuestionData[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  // Production review state
  const [productionReviewQuestions, setProductionReviewQuestions] = useState<TopicQuestionData[]>([]);
  const [currentProductionReviewIndex, setCurrentProductionReviewIndex] = useState(0);
  const [totalProductionReviewQuestions, setTotalProductionReviewQuestions] = useState(0);
  const [showPSLEQuestions, setShowPSLEQuestions] = useState(false);

  // Question preview state - for showing edited preview
  const [previewQuestion, setPreviewQuestion] = useState<QuestionReviewData | null>(null);
  const [usePreviewData, setUsePreviewData] = useState(false);

  // Fetch subjects with statistics
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/subjects/statistics");
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Failed to fetch subjects");
      }
      const data = await response.json();
      setSubjects(data.subjects);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch questions for a specific topic
  const fetchTopicQuestions = useCallback(async (topicId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/topic/${topicId}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.error?.message || "Failed to fetch topic questions"
        );
      }
      const data = await response.json();
      setSelectedTopic(data.topic);
      setTopicQuestions(data.questions);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to format options for client - copied from other API endpoints
  const formatOptionsForClient = (options: any): any[] => {
    if (!options) return [];

    console.log("DEBUG: formatOptionsForClient received:", typeof options, options);

    try {
      let parsedOptions = options;
      
      // If it's a string, try to parse it
      if (typeof options === "string") {
        try {
          parsedOptions = JSON.parse(options);
          console.log("DEBUG: Parsed from string:", parsedOptions);
        } catch (e) {
          console.warn("Could not parse options string as JSON:", options);
          return [];
        }
      }

      // If it's already an array with proper format
      if (Array.isArray(parsedOptions)) {
        console.log("DEBUG: Processing array options:", parsedOptions);
        return parsedOptions.map((opt, index) => {
          if (typeof opt === "object" && opt !== null) {
            // Handle different object formats
            if (opt.id && opt.text) {
              return { id: String(opt.id), text: String(opt.text) };
            }
            // Handle case where it's just an object with key-value pairs
            const entries = Object.entries(opt);
            if (entries.length > 0) {
              const [key, value] = entries[0];
              return { id: String(key), text: String(value) };
            }
          }
          // If it's a string, use index as ID
          if (typeof opt === "string") {
            return { id: String.fromCharCode(65 + index), text: opt };
          }
          // Fallback for any other type
          return { id: String.fromCharCode(65 + index), text: String(opt) };
        });
      }

      // If it's an object (like {"A": "Option A", "B": "Option B"})
      if (typeof parsedOptions === "object" && parsedOptions !== null) {
        console.log("DEBUG: Processing object options:", parsedOptions);
        return Object.entries(parsedOptions).map(([key, value]) => ({
          id: String(key),
          text: String(value),
        }));
      }

      console.warn("Unknown options format:", typeof parsedOptions, parsedOptions);
      return [];
    } catch (error) {
      console.error("Error formatting options:", error, "Original options:", options);
      return [];
    }
  };

  // Fetch a single question for detailed review
  const fetchQuestionDetail = useCallback(
    async (questionId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/questions/review?subjectId=${selectedSubject?.id}&limit=1000`
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.error?.message || "Failed to fetch question details"
          );
        }
        const data = await response.json();
        const question = data.questions.find((q: any) => q.id === questionId);
        if (question) {
          // Format options for the question tester
          const formattedQuestion = {
            ...question,
            options: question.options ? formatOptionsForClient(question.options) : [],
          };
          setSelectedQuestion(formattedQuestion);
        } else {
          throw new Error("Question not found");
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedSubject]
  );

  // Fetch filtered questions
  const fetchFilteredQuestions = useCallback(
    async (filters: any, page: number = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "100", // Increased from 20 to 100 to show more questions per page
          ...filters,
        });

        const response = await fetch(`/api/questions/review?${params}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.error?.message || "Failed to fetch questions"
          );
        }

        const data = await response.json();
        setFilteredQuestions(data.questions);
        setTotalPages(Math.ceil(data.totalQuestions / 100)); // Fixed to use totalQuestions and updated limit
        setCurrentPage(page);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch all non-production-ready questions for review
  const fetchProductionReviewQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/review?productionReady=false&limit=10000`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.error?.message || "Failed to fetch production review questions"
        );
      }
      const data = await response.json();
      
      // Filter questions based on PSLE toggle
      const filteredQuestions = showPSLEQuestions 
        ? data.questions 
        : data.questions.filter((question: TopicQuestionData) => {
            // Use the centralized PSLE checking function
            return !isPSLEQuestion(question);
          });
      
      setProductionReviewQuestions(filteredQuestions);
      setTotalProductionReviewQuestions(filteredQuestions.length);
      setCurrentProductionReviewIndex(0);
      
      if (filteredQuestions.length > 0) {
        // Format options for the first question and set it as selected
        const firstQuestion = filteredQuestions[0];
        const formattedQuestion = {
          ...firstQuestion,
          options: firstQuestion.options ? formatOptionsForClient(firstQuestion.options) : [],
        };
        setSelectedQuestion(formattedQuestion as any);
        setViewMode("productionReview");
      } else {
        toast.info(`No questions need production review${!showPSLEQuestions ? ' (PSLE questions filtered out)' : ''}!`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [showPSLEQuestions]);

  // Go to next question in production review
  const goToNextProductionReviewQuestion = useCallback(() => {
    if (currentProductionReviewIndex < productionReviewQuestions.length - 1) {
      const nextIndex = currentProductionReviewIndex + 1;
      setCurrentProductionReviewIndex(nextIndex);
      
      const nextQuestion = productionReviewQuestions[nextIndex];
      const formattedQuestion = {
        ...nextQuestion,
        options: nextQuestion.options ? formatOptionsForClient(nextQuestion.options) : [],
      };
      setSelectedQuestion(formattedQuestion as any);
      
      // Reset answer state for new question
      setSelectedAnswer(null);
      setTextAnswer("");
      setMultiPartAnswers({});
      setMultiPartResults({});
      setIsAnswerCorrect(false);
      setShowHint(false);
    } else {
      // No more questions
      toast.success("All production review questions completed!");
      setViewMode("subjects");
      setSelectedQuestion(null);
      setProductionReviewQuestions([]);
      setCurrentProductionReviewIndex(0);
      setTotalProductionReviewQuestions(0);
    }
  }, [currentProductionReviewIndex, productionReviewQuestions, formatOptionsForClient]);

  // Remove current question from production review list (when marked as production ready or deleted)
  const removeCurrentProductionReviewQuestion = useCallback(() => {
    const updatedQuestions = productionReviewQuestions.filter((_, index) => index !== currentProductionReviewIndex);
    setProductionReviewQuestions(updatedQuestions);
    setTotalProductionReviewQuestions(updatedQuestions.length);
    
    if (updatedQuestions.length === 0) {
      // No more questions
      toast.success("All production review questions completed!");
      setViewMode("subjects");
      setSelectedQuestion(null);
      setCurrentProductionReviewIndex(0);
      setTotalProductionReviewQuestions(0);
    } else {
      // Stay at same index, or go to previous if we were at the end
      let newIndex = currentProductionReviewIndex;
      if (newIndex >= updatedQuestions.length) {
        newIndex = updatedQuestions.length - 1;
      }
      
      setCurrentProductionReviewIndex(newIndex);
      const nextQuestion = updatedQuestions[newIndex];
      const formattedQuestion = {
        ...nextQuestion,
        options: nextQuestion.options ? formatOptionsForClient(nextQuestion.options) : [],
      };
      setSelectedQuestion(formattedQuestion as any);
      
      // Reset answer state for new question
      setSelectedAnswer(null);
      setTextAnswer("");
      setMultiPartAnswers({});
      setMultiPartResults({});
      setIsAnswerCorrect(false);
      setShowHint(false);
      
      // Scroll to top to show the new question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentProductionReviewIndex, productionReviewQuestions, formatOptionsForClient]);

  useEffect(() => {
    if (viewMode === "subjects") {
      fetchSubjects();
    }
  }, [fetchSubjects, viewMode]);

  const handleSubjectSelect = (subject: SubjectStats) => {
    setSelectedSubject(subject);
    setViewMode("statistics");
  };

  const handleTopicSelect = (topic: TopicStats) => {
    setViewMode("topicQuestions");
    fetchTopicQuestions(topic.id);
  };

  const handleQuestionSelect = (question: TopicQuestionData) => {
    setViewMode("questionDetail");
    fetchQuestionDetail(question.id);
  };

  const handleBackToSubjects = () => {
    setViewMode("subjects");
    setSelectedSubject(null);
    setSelectedTopic(null);
    setTopicQuestions([]);
    setSelectedQuestion(null);
  };

  const handleBackToStats = () => {
    setViewMode("statistics");
    setSelectedTopic(null);
    setTopicQuestions([]);
    setSelectedQuestion(null);
  };

  const handleBackToTopicQuestions = () => {
    setViewMode("topicQuestions");
    setSelectedQuestion(null);
  };

  const handleShowAllQuestions = () => {
    setViewMode("filteredQuestions");
    setCurrentFilters({});
    fetchFilteredQuestions({}, 1);
  };

  const handleBackToFiltered = () => {
    setViewMode("filteredQuestions");
    setSelectedQuestion(null);
  };

  const handleFilterChange = useCallback(
    (filters: any) => {
      setCurrentFilters(filters);
      setCurrentPage(1);
      fetchFilteredQuestions(filters, 1);
    },
    [fetchFilteredQuestions]
  );

  const handlePageChange = (page: number) => {
    fetchFilteredQuestions(currentFilters, page);
  };

  const handleQuestionUpdated = async (shouldNavigateAway: boolean = false) => {
    // Refresh the current question data to get the latest saved version
    if (selectedQuestion) {
      try {
        const response = await fetch(
          `/api/questions/review?subjectId=${selectedQuestion.subject?.id}&limit=1000`
        );
        if (response.ok) {
          const data = await response.json();
          const updatedQuestion = data.questions.find((q: any) => q.id === selectedQuestion.id);
          if (updatedQuestion) {
            const formattedQuestion = {
              ...updatedQuestion,
              options: updatedQuestion.options ? formatOptionsForClient(updatedQuestion.options) : [],
            };
            setSelectedQuestion(formattedQuestion as any);
            // Reset preview to use the fresh data
            setUsePreviewData(false);
            setPreviewQuestion(null);
            toast.success("Question updated successfully!");
          }
        }
      } catch (error) {
        console.error('Error refreshing question data:', error);
        toast.success("Question updated successfully!");
      }
    }
    
    // Only navigate away if explicitly requested
    if (shouldNavigateAway) {
      // Handle production review workflow
      if (viewMode === "productionReview") {
        removeCurrentProductionReviewQuestion();
        return;
      }
      
      // If we came from topic questions, refresh that list too
      if (selectedTopic && viewMode !== "questionDetail" && viewMode !== "productionReview") {
        fetchTopicQuestions(selectedTopic.id);
        setViewMode("topicQuestions");
        setSelectedQuestion(null);
      }
    }
  };

  const handleQuestionAccepted = async () => {
    // For production review, move to next question after accepting
    if (viewMode === "productionReview") {
      removeCurrentProductionReviewQuestion();
      return;
    }
    
    // For other modes, just refresh the question data and stay
    await handleQuestionUpdated(false);
    
    // Scroll to top to show the updated question
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuestionDeleted = () => {
    // Handle production review workflow
    if (viewMode === "productionReview") {
      removeCurrentProductionReviewQuestion();
      return;
    }
    
    // Go back to the appropriate list view after deletion
    if (selectedTopic) {
      fetchTopicQuestions(selectedTopic.id);
      setViewMode("topicQuestions");
    } else {
      // If we came from filtered questions, refresh the filtered list
      fetchFilteredQuestions(currentFilters, currentPage);
      setViewMode("filteredQuestions");
    }
    setSelectedQuestion(null);
  };

  // Student answer state - matching practice page exactly
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [multiPartAnswers, setMultiPartAnswers] = useState<
    Record<string, string>
  >({});
  const [multiPartResults, setMultiPartResults] = useState<
    Record<string, boolean>
  >({});
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Reset answer state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setTextAnswer("");
    setMultiPartAnswers({});
    setMultiPartResults({});
    setIsAnswerCorrect(false);
    setShowHint(false);
    // Reset preview when question changes
    setUsePreviewData(false);
    setPreviewQuestion(null);
  }, [selectedQuestion?.id]);

  // Function to refresh preview with current form data or latest saved data
  const refreshPreview = useCallback(async (formData?: any) => {
    if (!selectedQuestion) return;
    
    try {
      let questionToUse = selectedQuestion;
      
      // If no form data provided, fetch latest from database
      if (!formData) {
        try {
          const response = await fetch(
            `/api/questions/review?subjectId=${selectedQuestion.subject?.id}&limit=1000`
          );
          if (response.ok) {
            const data = await response.json();
            const latestQuestion = data.questions.find((q: any) => q.id === selectedQuestion.id);
            if (latestQuestion) {
              questionToUse = {
                ...latestQuestion,
                options: latestQuestion.options ? formatOptionsForClient(latestQuestion.options) : [],
              };
            }
          }
        } catch (error) {
          console.warn('Could not fetch latest question data, using form data:', error);
        }
      }
      
      if (formData) {
        // Parse options if they're a string
        let parsedOptions = formData.options;
        if (typeof formData.options === 'string' && formData.options.trim()) {
          try {
            parsedOptions = JSON.parse(formData.options);
          } catch (e) {
            console.warn('Could not parse options JSON:', e);
            parsedOptions = formData.options; // Keep as string if parsing fails
          }
        }

        // Create updated question data for preview using form data
        const updatedQuestion = {
          ...questionToUse,
          text: formData.text || questionToUse.text,
          questionType: formData.questionType || questionToUse.questionType,
          options: parsedOptions ? formatOptionsForClient(parsedOptions) : questionToUse.options,
          correctAnswer: formData.correctAnswer || questionToUse.correctAnswer,
          hint: formData.hint || questionToUse.hint,
          explanation: formData.explanation || questionToUse.explanation,
          difficulty: formData.difficulty || questionToUse.difficulty,
        };
        
        setPreviewQuestion(updatedQuestion as any);
        setUsePreviewData(true);
        toast.success("Preview updated with current form data!");
      } else {
        // Use latest saved data
        setPreviewQuestion(questionToUse as any);
        setUsePreviewData(true);
        toast.success("Preview refreshed with latest saved data!");
      }
      
      // Reset answer state when preview updates
      setSelectedAnswer(null);
      setTextAnswer("");
      setMultiPartAnswers({});
      setMultiPartResults({});
      setIsAnswerCorrect(false);
      setShowHint(false);
      
    } catch (error) {
      console.error('Error updating preview:', error);
      toast.error("Failed to update preview. Check your form data.");
    }
  }, [selectedQuestion, formatOptionsForClient]);

  // Answer handlers copied exactly from practice page
  const handleAnswerMCQ = useCallback(
    (optionId: string, optionText: string) => {
      if (!selectedQuestion || selectedAnswer !== null) return;
      setSelectedAnswer(optionId);
      const correctAnswerId = String(
        selectedQuestion.correctAnswer || ""
      ).toLowerCase();
      const isCorrect = optionId.toLowerCase() === correctAnswerId;
      const correctOption = selectedQuestion.options?.find(
        (opt: any) => opt.id?.toLowerCase() === correctAnswerId
      );
      const correctAnswerDisplayText = correctOption
        ? correctOption.text
        : `ID: ${selectedQuestion.correctAnswer}`;

      setIsAnswerCorrect(isCorrect);

      if (isCorrect) {
        toast.success("Great job! That's correct.");
      } else {
        toast.error(
          `Not quite right. The correct answer is "${correctAnswerDisplayText}".`
        );
      }
    },
    [selectedQuestion, selectedAnswer]
  );

  const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !selectedQuestion || selectedAnswer !== null)
      return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer);
    const cAns = selectedQuestion.correctAnswer;
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
    setIsAnswerCorrect(isCorrect);

    const feedback = isCorrect
      ? "Great job!"
      : `Incorrect. Correct: "${cAnsArr.join(" or ")}".`;

    if (isCorrect) {
      toast.success(feedback);
    } else {
      toast.error(feedback);
    }
  }, [textAnswer, selectedQuestion, selectedAnswer]);

  const handleMultiPartSubmit = useCallback(() => {
    if (
      !selectedQuestion ||
      typeof selectedQuestion.correctAnswer !== "object" ||
      selectedQuestion.correctAnswer === null ||
      Array.isArray(selectedQuestion.correctAnswer) ||
      selectedAnswer !== null
    )
      return;
    const correctAnswersMap = selectedQuestion.correctAnswer as Record<
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
    setIsAnswerCorrect(allPartsCorrect);

    const feedback = allPartsCorrect
      ? "All parts correct!"
      : "Some parts incorrect.";

    if (allPartsCorrect) {
      toast.success(feedback);
    } else {
      toast.error(feedback);
    }
  }, [selectedQuestion, selectedAnswer, multiPartAnswers]);

  const isMultiPartComplete = () => {
    if (
      !selectedQuestion ||
      typeof selectedQuestion.correctAnswer !== "object" ||
      selectedQuestion.correctAnswer === null ||
      Array.isArray(selectedQuestion.correctAnswer)
    )
      return false;
    const parts = Object.keys(selectedQuestion.correctAnswer);
    return parts.length > 0 && parts.every((p) => multiPartAnswers[p]?.trim());
  };

  // Question content renderer copied exactly from practice page
  const renderQuestionContent = () => {
    const questionToRender = usePreviewData && previewQuestion ? previewQuestion : selectedQuestion;
    
    if (!questionToRender)
      return <p className="text-center text-gray-500">Loading question...</p>;

    const questionTypeString = String(questionToRender.questionType) as
      | keyof typeof PrismaQuestionType
      | "UNKNOWN";

    switch (questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
            {questionToRender.options &&
            Array.isArray(questionToRender.options) &&
            questionToRender.options.length > 0 ? (
              questionToRender.options.map((option: any, index: number) => {
                const optionId = option.id;
                let optionText = option.text;
                
                // Debug log and fix if optionText is an object
                if (typeof optionText === 'object' && optionText !== null) {
                  console.log("DEBUG: optionText is object:", optionText);
                  // Try to extract text from object
                  if (optionText.text) {
                    optionText = optionText.text;
                  } else {
                    // Convert object to string as fallback
                    optionText = JSON.stringify(optionText);
                  }
                }
                
                const optionLetter = String.fromCharCode(65 + index);
                const isThisSelected = selectedAnswer === optionId;
                const isThisCorrectDB =
                  String(questionToRender.correctAnswer || "").toLowerCase() ===
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
                    <span className="font-bold mr-2">{optionLetter}.</span>{" "}
                    <OptionTextFormatter text={optionText} />
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
          typeof selectedQuestion.correctAnswer !== "object" ||
          selectedQuestion.correctAnswer === null ||
          Array.isArray(selectedQuestion.correctAnswer)
        ) {
          return (
            <p className="text-red-500">
              Error: Correct answer format for multi-part question is invalid.
            </p>
          );
        }
        const parts = Object.keys(selectedQuestion.correctAnswer);
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
                          selectedQuestion.correctAnswer as Record<
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
                {selectedQuestion.explanation && (
                  <div className="border-t pt-2">
                    <p className="font-semibold mb-2">Explanation:</p>
                    <ExplanationFormatter
                      explanation={selectedQuestion.explanation}
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
              {selectedQuestion.questionType || "Not specified"}
            </p>
          </div>
        );
    }
  };

  // Render question in "taking" format with student answer functionality - exact copy from practice
  const renderQuestionPreview = (question: QuestionReviewData) => {
    const questionToDisplay = usePreviewData && previewQuestion ? previewQuestion : question;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Question Preview (Interactive) {usePreviewData && <span className="text-sm text-green-600">(Updated)</span>}
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={() => refreshPreview()}
              variant="outline"
              size="sm"
              className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
            >
              🔄 Refresh with Latest Saved
            </Button>
            {usePreviewData && (
              <Button
                onClick={() => {
                  setUsePreviewData(false);
                  setPreviewQuestion(null);
                  setSelectedAnswer(null);
                  setTextAnswer("");
                  setMultiPartAnswers({});
                  setMultiPartResults({});
                  setIsAnswerCorrect(false);
                  setShowHint(false);
                }}
                variant="outline"
                size="sm"
              >
                Reset to Original
              </Button>
            )}
          </div>
        </div>

        {/* Question badges */}
        <div className="mb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              Topic: {questionToDisplay.topic?.name || "General"}
            </span>
            {/* Source School Display */}
                                  {renderSourceSchool(questionToDisplay)}
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              questionToDisplay.difficulty === "HARD" ||
              questionToDisplay.difficulty === "VERY_HARD"
                ? "bg-red-100 text-red-700"
                : questionToDisplay.difficulty === "MEDIUM"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {questionToDisplay.difficulty || "MEDIUM"}
          </span>
        </div>

        {/* Question Text with proper formatting */}
        <h1 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 leading-snug">
          <QuestionTextFormatter text={questionToDisplay.text} />
        </h1>

        {/* Question Image */}
        {questionToDisplay.imageUrl && (
          <div className="mb-4 flex justify-center border border-gray-200 rounded-lg p-2 bg-gray-50 shadow-sm">
            <img
              src={questionToDisplay.imageUrl}
              alt="Question diagram"
              className="max-w-full h-auto max-h-80 rounded-md object-contain"
            />
          </div>
        )}

        {/* Question Content */}
        {renderQuestionContent()}

        {/* Explanation display after answer - copied from practice */}
        {selectedAnswer !== null &&
          question.explanation &&
          question.questionType !== "MULTI_PART" && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                isAnswerCorrect
                  ? "bg-green-50 border-l-4 border-green-400"
                  : "bg-blue-50 border-l-4 border-blue-400"
              }`}
            >
              <div>
                <p className="font-semibold text-gray-700 mb-3">Explanation:</p>
                <ExplanationFormatter
                  explanation={question.explanation}
                  className="text-gray-700"
                />
              </div>
            </div>
          )}

        {/* Reset button */}
        {selectedAnswer !== null && (
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                setSelectedAnswer(null);
                setTextAnswer("");
                setMultiPartAnswers({});
                setMultiPartResults({});
                setIsAnswerCorrect(false);
                setShowHint(false);
              }}
              variant="outline"
              className="border-gray-300"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Hint button */}
        <div className="mt-6 border-t border-gray-200 pt-5 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <Button
            onClick={() => setShowHint(true)}
            disabled={selectedAnswer !== null || showHint || !question.hint}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto text-sm py-2"
          >
            <FaLightbulb className="mr-1.5" /> Get Hint
          </Button>
        </div>

        {/* Hint display */}
        {showHint && question.hint && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 shadow text-sm">
            <div className="flex items-start">
              <FaLightbulb className="text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-0.5 text-yellow-900">Hint:</p>
                <p>{question.hint}</p>
              </div>
            </div>
          </div>
        )}

        {/* Question Info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t pt-4 mt-4">
          <span className="flex items-center gap-1">
            <FaBook />
            {question.subject?.name}
          </span>
          <span>{question.topic?.name}</span>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              question.difficulty === "EASY"
                ? "bg-green-100 text-green-700"
                : question.difficulty === "MEDIUM"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {question.difficulty?.toLowerCase()}
          </span>
        </div>
      </div>
    );
  };

  if (
    isLoading &&
    (viewMode === "subjects" ||
      (viewMode === "questionDetail" && !selectedQuestion))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg">
          {viewMode === "subjects"
            ? "Loading subjects..."
            : "Loading question..."}
        </p>
      </div>
    );
  }

  if (error && viewMode === "subjects") {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error: {error}</p>
        <Button onClick={fetchSubjects} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Subject Selection View
  if (viewMode === "subjects") {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* PSLE Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center gap-3 bg-white rounded-lg shadow-md p-3 border">
            <span className={`text-sm font-medium ${showPSLEQuestions ? 'text-gray-500' : 'text-green-600'}`}>
              PSLE Questions OFF
            </span>
            <button
              onClick={() => setShowPSLEQuestions(!showPSLEQuestions)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                showPSLEQuestions ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPSLEQuestions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${showPSLEQuestions ? 'text-indigo-600' : 'text-gray-500'}`}>
              PSLE Questions ON
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <Button 
            onClick={fetchProductionReviewQuestions} 
            className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
          >
            <FaEye className="mr-2" /> Review Non-Production Questions
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Question Review
            </h1>
            <p className="text-gray-600 mt-2">
              Select a subject to review questions
            </p>
          </div>
          <Button onClick={handleShowAllQuestions} variant="outline">
            <FaFilter className="mr-2" /> Advanced Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer border-2 hover:border-indigo-300"
              onClick={() => handleSubjectSelect(subject)}
            >
              <div className="flex items-center justify-between mb-4">
                <FaBook className="text-2xl text-indigo-600" />
                <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {subject.totalQuestionsForReview} questions
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {subject.name}
              </h3>
              <p className="text-sm text-gray-600">
                {subject.topics.length} topics •{" "}
                {subject.totalQuestionsForReview} questions for review
              </p>
            </div>
          ))}
        </div>

        {subjects.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 mt-8">
            <p>No subjects found or no questions need review.</p>
          </div>
        )}
      </div>
    );
  }

  // Statistics View
  if (viewMode === "statistics" && selectedSubject) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToSubjects} variant="outline">
            <FaArrowLeft className="mr-2" /> Back to Subjects
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">
            {selectedSubject.name} Statistics
          </h1>
          <div></div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Overall Statistics
              </h2>
              <p className="text-gray-600">
                Questions requiring review in {selectedSubject.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">
                {selectedSubject.totalQuestionsForReview}
              </div>
              <div className="text-sm text-gray-500">total questions</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Questions by Topic
          </h2>

          {selectedSubject.topics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No topics found for this subject.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedSubject.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleTopicSelect(topic)}
                >
                  <div className="flex items-center">
                    <FaList className="text-indigo-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {topic.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Click to view all questions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-800">
                      {topic.questionsForReview}
                    </div>
                    <div className="text-sm text-gray-500">questions</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Topic Questions List View
  if (viewMode === "topicQuestions" && selectedTopic) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToStats} variant="outline">
            <FaArrowLeft className="mr-2" /> Back to Statistics
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              {selectedTopic.name}
            </h1>
            <p className="text-gray-600">{selectedTopic.subject.name}</p>
          </div>
          <div></div>
        </div>

        {/* Color Legend */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Status Legend:</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <FaCircle className="text-red-500" />
              <span className="text-sm text-gray-700">Needs Review</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCircle className="text-orange-500" />
              <span className="text-sm text-gray-700">
                Production (Needs Refactor)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FaCircle className="text-green-500" />
              <span className="text-sm text-gray-700">Ready</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {topicQuestions.map((question) => {
            const statusColor = getStatusColor(
              question.productionReady,
              question.isRefactored
            );
            const statusText = getStatusText(
              question.productionReady,
              question.isRefactored
            );

            return (
              <div
                key={question.id}
                className={`${statusColor.bg} ${statusColor.border} border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handleQuestionSelect(question)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaCircle className={`text-sm ${statusColor.dot}`} />
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${statusColor.bg} ${statusColor.text}`}
                      >
                        {statusText}
                      </span>
                      <span className="text-sm text-gray-600">
                        ID: {question.id}
                      </span>
                      {/* Source School Display */}
                      {renderSourceSchool(question)}
                    </div>
                    <p className="text-gray-800 font-medium line-clamp-2 mb-2">
                      {question.text.substring(0, 150)}
                      {question.text.length > 150 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          question.difficulty === "EASY"
                            ? "bg-green-100 text-green-700"
                            : question.difficulty === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {question.difficulty?.toLowerCase()}
                      </span>
                      <span>{question.questionType}</span>
                      {question.imageUrl && (
                        <FaImage className="text-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>
                      Production: {question.productionReady ? "✓" : "✗"}
                    </div>
                    <div>Refactored: {question.isRefactored ? "✓" : "✗"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {topicQuestions.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 mt-8">
            <p>No questions found for this topic.</p>
          </div>
        )}
      </div>
    );
  }

  // Production Review View
  if (viewMode === "productionReview" && selectedQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* PSLE Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center gap-3 bg-white rounded-lg shadow-md p-3 border">
            <span className={`text-sm font-medium ${showPSLEQuestions ? 'text-gray-500' : 'text-green-600'}`}>
              PSLE Questions OFF
            </span>
            <button
              onClick={() => setShowPSLEQuestions(!showPSLEQuestions)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                showPSLEQuestions ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPSLEQuestions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${showPSLEQuestions ? 'text-indigo-600' : 'text-gray-500'}`}>
              PSLE Questions ON
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToSubjects} variant="outline">
            <FaArrowLeft className="mr-2" /> Back to Subjects
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-800">
              Production Review
            </h1>
            <p className="text-gray-600">
              Question {currentProductionReviewIndex + 1} of {totalProductionReviewQuestions}
            </p>
          </div>
          <Button 
            onClick={goToNextProductionReviewQuestion}
            variant="outline"
            disabled={currentProductionReviewIndex >= productionReviewQuestions.length - 1}
          >
            Skip Question <FaArrowRight className="ml-2" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-600">
              {currentProductionReviewIndex + 1} / {totalProductionReviewQuestions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-orange-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((currentProductionReviewIndex + 1) / totalProductionReviewQuestions) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Preview */}
        {renderQuestionPreview(selectedQuestion)}

        {/* Question Editor */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Edit Question Details
          </h3>
          <QuestionEditorForm
            key={selectedQuestion.id}
            questionData={selectedQuestion}
            onQuestionAccepted={handleQuestionAccepted}
            onQuestionUpdated={handleQuestionUpdated}
            onQuestionDeleted={handleQuestionDeleted}
            onRefreshPreview={refreshPreview}
          />
        </div>
      </div>
    );
  }

  // Question Detail View
  if (viewMode === "questionDetail" && selectedQuestion) {
    const backHandler = selectedTopic
      ? handleBackToTopicQuestions
      : handleBackToFiltered;
    const backLabel = selectedTopic
      ? "Back to Topic Questions"
      : "Back to All Questions";

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={backHandler} variant="outline">
            <FaArrowLeft className="mr-2" /> {backLabel}
          </Button>
          <h1 className="text-2xl font-semibold text-gray-800">
            Question Review
          </h1>
          <div></div>
        </div>

        {/* Question Preview */}
        {renderQuestionPreview(selectedQuestion)}

        {/* Question Editor */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Edit Question Details
          </h3>
          <QuestionEditorForm
            key={selectedQuestion.id}
            questionData={selectedQuestion}
            onQuestionAccepted={handleQuestionAccepted}
            onQuestionUpdated={handleQuestionUpdated}
            onQuestionDeleted={handleQuestionDeleted}
            onRefreshPreview={refreshPreview}
          />
        </div>
      </div>
    );
  }

  // Filtered Questions View
  if (viewMode === "filteredQuestions") {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToSubjects} variant="outline">
            <FaArrowLeft className="mr-2" /> Back to Subjects
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">
            All Questions with Filters
          </h1>
          <div></div>
        </div>

        {/* Filters */}
        <QuestionFilters
          onFilterChange={handleFilterChange}
          initialFilters={currentFilters}
        />

        {/* Color Legend */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Status Legend:</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <FaCircle className="text-red-500" />
              <span className="text-sm text-gray-700">Needs Review</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCircle className="text-orange-500" />
              <span className="text-sm text-gray-700">
                Production (Needs Refactor)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FaCircle className="text-green-500" />
              <span className="text-sm text-gray-700">Ready</span>
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {filteredQuestions.map((question) => {
            const statusColor = getStatusColor(
              question.productionReady,
              question.isRefactored
            );
            const statusText = getStatusText(
              question.productionReady,
              question.isRefactored
            );

            return (
              <div
                key={question.id}
                className={`${statusColor.bg} ${statusColor.border} border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handleQuestionSelect(question)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaCircle className={`text-sm ${statusColor.dot}`} />
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${statusColor.bg} ${statusColor.text}`}
                      >
                        {statusText}
                      </span>
                      <span className="text-sm text-gray-600">
                        ID: {question.id}
                      </span>
                      {/* Source School Display */}
                      {renderSourceSchool(question)}
                    </div>
                    <p className="text-gray-800 font-medium line-clamp-2 mb-2">
                      {question.text.substring(0, 120)}
                      {question.text.length > 120 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          question.difficulty === "EASY"
                            ? "bg-green-100 text-green-700"
                            : question.difficulty === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {question.difficulty?.toLowerCase()}
                      </span>
                      <span>{question.questionType}</span>
                      {question.imageUrl && (
                        <FaImage className="text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {question.subject.name}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {question.topic.name}
                      </span>
                      {question.questionGroup && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {question.questionGroup.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 ml-4">
                    <div>
                      Production: {question.productionReady ? "✓" : "✗"}
                    </div>
                    <div>Refactored: {question.isRefactored ? "✓" : "✗"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination page={currentPage} count={filteredQuestions.length} />
          </div>
        )}

        {filteredQuestions.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 mt-8">
            <p>No questions found matching the current filters.</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
