// src/app/(dashboard)/admin/question-review/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import QuestionEditorForm, {
  type QuestionReviewData,
} from "./QuestionEditorForm";
import {
  FaArrowLeft,
  FaArrowRight,
  FaSpinner,
  FaBook,
  FaChartBar,
  FaEye,
} from "react-icons/fa";

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

type ViewMode = "subjects" | "statistics" | "review";

export default function QuestionReviewPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("subjects");
  const [subjects, setSubjects] = useState<SubjectStats[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(
    null
  );
  const [questions, setQuestions] = useState<QuestionReviewData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Fetch questions for review for a specific subject
  const fetchQuestionsForReview = useCallback(
    async (subjectId: number, page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/questions/review?page=${page}&limit=1&subjectId=${subjectId}`
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.error?.message || "Failed to fetch questions"
          );
        }
        const data = await response.json();
        if (data.questions.length > 0) {
          setQuestions(data.questions);
          setCurrentQuestionIndex(0);
          setTotalPages(data.totalPages);
          setCurrentPage(data.currentPage);
        } else {
          setQuestions([]);
          toast.info("No questions to review for this subject!");
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (viewMode === "subjects") {
      fetchSubjects();
    }
  }, [fetchSubjects, viewMode]);

  const handleSubjectSelect = (subject: SubjectStats) => {
    setSelectedSubject(subject);
    setViewMode("statistics");
  };

  const handleStartReview = () => {
    if (selectedSubject) {
      setViewMode("review");
      fetchQuestionsForReview(selectedSubject.id, 1);
    }
  };

  const handleBackToSubjects = () => {
    setViewMode("subjects");
    setSelectedSubject(null);
    setQuestions([]);
  };

  const handleBackToStats = () => {
    setViewMode("statistics");
    setQuestions([]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentPage < totalPages) {
      fetchQuestionsForReview(selectedSubject!.id, currentPage + 1);
    } else {
      toast.info("You've reached the end of the questions for review!");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentPage > 1) {
      toast.info("At the beginning of the current batch.");
    }
  };

  const handleQuestionUpdatedOrAccepted = () => {
    if (questions.length <= 1 && currentPage >= totalPages) {
      setQuestions([]);
      toast.success("All questions in this subject reviewed!");
      // Refresh subject statistics
      fetchSubjects();
      setViewMode("statistics");
    } else if (questions.length <= 1 && currentPage < totalPages) {
      fetchQuestionsForReview(selectedSubject!.id, currentPage + 1);
    } else {
      const updatedQuestions = questions.filter(
        (_, idx) => idx !== currentQuestionIndex
      );
      setQuestions(updatedQuestions);
      if (updatedQuestions.length === 0 && currentPage < totalPages) {
        fetchQuestionsForReview(selectedSubject!.id, currentPage + 1);
      } else if (updatedQuestions.length === 0 && currentPage >= totalPages) {
        toast.success("All questions reviewed!");
        fetchSubjects();
        setViewMode("statistics");
      }
      setCurrentQuestionIndex((prev) =>
        Math.min(prev, Math.max(0, updatedQuestions.length - 1))
      );
    }
  };

  if (
    isLoading &&
    (viewMode === "subjects" ||
      (viewMode === "review" && questions.length === 0))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg">
          {viewMode === "subjects"
            ? "Loading subjects..."
            : "Loading questions for review..."}
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
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Question Review
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Select a subject to review questions
        </p>

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
          <Button
            onClick={handleStartReview}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <FaEye className="mr-2" /> Start Review
          </Button>
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
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <FaChartBar className="text-indigo-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {topic.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Topic ID: {topic.id}
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

  // Question Review View
  if (viewMode === "review" && selectedSubject) {
    if (questions.length === 0 && !isLoading) {
      return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <Button onClick={handleBackToStats} variant="outline">
              <FaArrowLeft className="mr-2" /> Back to Statistics
            </Button>
            <h1 className="text-2xl font-semibold text-gray-800">
              {selectedSubject.name} Review
            </h1>
          </div>

          <div className="p-6 text-center text-gray-700 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">
              All Questions Reviewed!
            </h2>
            <p>
              There are no more questions currently marked for review in{" "}
              {selectedSubject.name}.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={handleBackToStats} variant="outline">
                Back to Statistics
              </Button>
              <Button onClick={handleBackToSubjects}>
                Choose Another Subject
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={handleBackToStats} variant="outline">
            <FaArrowLeft className="mr-2" /> Back to Statistics
          </Button>
          <h1 className="text-2xl font-semibold text-gray-800">
            {selectedSubject.name} Review
          </h1>
        </div>

        {currentQuestion ? (
          <QuestionEditorForm
            key={currentQuestion.id}
            questionData={currentQuestion}
            onQuestionAccepted={handleQuestionUpdatedOrAccepted}
            onQuestionUpdated={handleQuestionUpdatedOrAccepted}
          />
        ) : (
          <p className="text-center text-gray-500">No question loaded.</p>
        )}

        <div className="mt-8 flex justify-between items-center">
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 && currentPage === 1}
            variant="outline"
          >
            <FaArrowLeft className="mr-2" /> Previous
          </Button>
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of (approx) {questions.length}{" "}
            on page {currentPage}/{totalPages}
          </span>
          <Button
            onClick={handleNextQuestion}
            disabled={
              currentQuestionIndex >= questions.length - 1 &&
              currentPage >= totalPages
            }
          >
            Next <FaArrowRight className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
