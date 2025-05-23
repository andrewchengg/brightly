// src/app/(dashboard)/admin/question-review/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import QuestionEditorForm, { type QuestionReviewData } from "./QuestionEditorForm"; // We'll create this next
import { FaArrowLeft, FaArrowRight, FaSpinner } from "react-icons/fa";

export default function QuestionReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionReviewData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchQuestionsForReview = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/review?page=${page}&limit=1`); // Fetch one at a time for now
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Failed to fetch questions");
      }
      const data = await response.json();
      if (data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentQuestionIndex(0); // Reset to first question of the new page
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      } else {
        setQuestions([]); // No more questions to review
        toast.info("No more questions to review in this batch!");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestionsForReview(1);
  }, [fetchQuestionsForReview]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentPage < totalPages) {
      fetchQuestionsForReview(currentPage + 1);
    } else {
      toast.info("You've reached the end of the questions for review in this batch!");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentPage > 1) {
        // To go to the previous page and show its last question, we'd need to adjust the logic
        // For now, let's just allow going back within the current fetched set.
        // Or fetch previous page and set index to last item.
        // Simpler: fetchQuestionsForReview(currentPage -1 ) and then set index to items.length -1.
        // For simplicity, this example only handles within current page's items
        toast.info("At the beginning of the current batch.");
    }
  };
  
  const handleQuestionUpdatedOrAccepted = () => {
    // Refetch the current page to see if this question is gone or if there's a new first one
    // Or, more simply, just advance to the "next" logical question
    if (questions.length <= 1 && currentPage >= totalPages) {
        setQuestions([]); // No more questions
        toast.success("All questions in this batch reviewed!");
    } else if (questions.length <= 1 && currentPage < totalPages) {
        fetchQuestionsForReview(currentPage + 1); // Fetch next page
    } else {
        // Remove the processed question from the local list and advance
        const updatedQuestions = questions.filter((_,idx) => idx !== currentQuestionIndex);
        setQuestions(updatedQuestions);
        if(updatedQuestions.length === 0 && currentPage < totalPages){
             fetchQuestionsForReview(currentPage + 1);
        } else if (updatedQuestions.length === 0 && currentPage >= totalPages) {
             toast.success("All questions reviewed!");
        }
        // Adjust index if needed (e.g., if it was the last in the array)
        setCurrentQuestionIndex(prev => Math.min(prev, Math.max(0, updatedQuestions.length - 1)));
    }
  };


  if (isLoading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg">Loading questions for review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error: {error}</p>
        <Button onClick={() => fetchQuestionsForReview(currentPage)} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }
  
  if (questions.length === 0 && !isLoading) {
    return (
        <div className="p-6 text-center text-gray-700">
            <h2 className="text-2xl font-semibold mb-4">All Questions Reviewed!</h2>
            <p>There are no more questions currently marked for review.</p>
            <Button onClick={() => router.push('/admin')} className="mt-6">
                Back to Admin Dashboard
            </Button>
        </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Question Review Tool</h1>
      
      {currentQuestion ? (
        <QuestionEditorForm
          key={currentQuestion.id} // Important for re-rendering the form with new defaults
          questionData={currentQuestion}
          onQuestionAccepted={handleQuestionUpdatedOrAccepted}
          onQuestionUpdated={handleQuestionUpdatedOrAccepted} // Or a more specific handler
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
          Question {currentQuestionIndex + 1} of (approx) {questions.length} on page {currentPage}/{totalPages}
        </span>
        <Button 
          onClick={handleNextQuestion} 
          disabled={currentQuestionIndex >= questions.length -1 && currentPage >= totalPages}
        >
          Next <FaArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
}