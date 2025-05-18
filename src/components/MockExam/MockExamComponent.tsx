'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: number;
  text: string;
  options: Option[];
  correctAnswer: string | string[];
  topicName: string;
  questionType: string;
  topic: {
    id: string;
    name: string;
  };
}

interface MockExamComponentProps {
  userId: string;
  examDurationMinutes: number;
}

interface DatabaseQuestion {
  id: number;
  text: string;
  options: string | Option[];
  correctAnswer: string;
  questionType: string;
  topic: {
    id: string;
    name: string;
  };
}

interface ApiQuestion {
  id: number;
  text: string;
  options: Option[];
  correctAnswer: string | string[];
  questionType: string;
  hint?: string;
  topic: {
    id: string;
    name: string;
  };
}

interface Result {
  score: number;
  studentId: string;
  type: string;
  answers: Record<number, string>;
  submittedAt: string;
}

export default function MockExamComponent({ userId, examDurationMinutes }: MockExamComponentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(examDurationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  useEffect(() => {
    if (timeRemaining <= 0 || examSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, examSubmitted]);

  // Initial data fetching effect
  useEffect(() => {
    const initializeExam = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Initializing mock exam for user:", userId);
        
        if (!userId) {
          setError("User ID is missing. Please try logging in again.");
          setIsLoading(false);
          return;
        }
        
        // Fetch questions
        try {
          await fetchQuestions();
        } catch (questionError: any) {
          console.error("Error fetching questions:", questionError);
          setError("Failed to load questions: " + (questionError.message || "Unknown error"));
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error("Error initializing exam:", error);
        setError("Failed to initialize exam: " + (error.message || "Unknown error"));
        setIsLoading(false);
      }
    };

    initializeExam();
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchQuestions = async () => {
    try {
      console.log('Fetching questions for user:', userId);
      
      if (!userId) {
        console.error('No user ID provided');
        setError('User ID is missing. Please try logging in again.');
        setIsLoading(false);
        return;
      }
      
      // Use existing practice session if available, or create a new one
      let practiceSessionId = currentPracticeSessionId;
      
      if (!currentPracticeSessionId) {
        try {
          // Create a practice session - fix the API path
          const newSession = await fetch('/api/practice-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId: userId,
              title: `Mock Exam - ${new Date().toLocaleDateString()}`,
              type: 'MOCK_EXAM',
              status: 'STARTED',
              examDurationMinutes: examDurationMinutes
            }),
          });

          if (!newSession.ok) {
            console.error('Error creating practice session: ' + await newSession.text());
            // Continue without session, using a mock ID
            practiceSessionId = 'mock-session-' + Date.now();
            setCurrentPracticeSessionId(practiceSessionId);
            console.log('Using mock practice session ID:', practiceSessionId);
          } else {
            const sessionData = await newSession.json();
            practiceSessionId = sessionData.id;
            setCurrentPracticeSessionId(sessionData.id);
            console.log('Practice session created with ID:', sessionData.id);
          }
        } catch (sessionError) {
          console.error('Error in practice session creation:', sessionError);
          // Continue with a mock session ID
          practiceSessionId = 'mock-session-' + Date.now();
          setCurrentPracticeSessionId(practiceSessionId);
          console.log('Using mock practice session ID after error:', practiceSessionId);
        }
      }
      
      // Fetch questions from the API
      const response = await fetch('/api/questions/random?limit=10');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const randomQuestions = await response.json();
      
      if (!randomQuestions || randomQuestions.length === 0) {
        throw new Error('No questions returned from API');
      }
      
      console.log(`Loaded ${randomQuestions.length} questions`);
      setQuestions(randomQuestions);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      setError('Failed to fetch questions: ' + (error.message || 'Unknown error'));
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, optionId: string) => {
    if (timeRemaining <= 0 || examSubmitted) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (examSubmitted || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate correct answers
      let correctAnswersCount = 0;
      questions.forEach(q => {
        const selectedOptionId = answers[q.id]; // q.id is number
        
        // Handle different question types for scoring
        if (q.questionType === 'MULTIPLE_CHOICE' && selectedOptionId) {
          if (typeof q.correctAnswer === 'string' && selectedOptionId === q.correctAnswer) {
            correctAnswersCount++;
          } else if (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(selectedOptionId)) {
            correctAnswersCount++;
          }
        }
        // Add logic for other question types if needed
      });

      const calculatedScore = correctAnswersCount;
      
      console.log('Submitting exam results:', {
        studentId: userId,
        practiceSessionId: currentPracticeSessionId,
        score: calculatedScore,
        answers
      });
      
      try {
        // Create a result record using Prisma API instead of direct Supabase access
        const response = await fetch('/api/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: userId,
            practiceSessionId: currentPracticeSessionId,
            score: calculatedScore,
            answers,
            submittedAt: new Date().toISOString(),
          }),
        });
        
        if (!response.ok) {
          // If API fails, store results locally
          console.warn('Error saving results to database, storing locally');
          localStorage.setItem(`mockExamResult_${userId}_${Date.now()}`, JSON.stringify({
            studentId: userId,
            score: calculatedScore,
            answers,
            submittedAt: new Date().toISOString(),
          }));
        }
      } catch (resultError) {
        console.error('Error creating result record:', resultError);
        // Store results locally if API fails
        localStorage.setItem(`mockExamResult_${userId}_${Date.now()}`, JSON.stringify({
          studentId: userId,
          score: calculatedScore,
          answers,
          submittedAt: new Date().toISOString(),
        }));
      }

      console.log('Exam submitted successfully, redirecting to results page');
      setExamSubmitted(true);
      router.push('/(dashboard)/student/results');
    } catch (error: any) {
      console.error('Error submitting exam:', error.message || error);
      setError('Failed to submit exam. Please try again. Error: ' + (error.message || 'Unknown error'));
      setExamSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (examSubmitted) return;
    
    try {
      console.log('Cancelling exam...');
      
      // Don't try to update the session with an API call
      // Just store the cancellation locally
      if (currentPracticeSessionId) {
        localStorage.setItem(`cancelledExam_${currentPracticeSessionId}`, JSON.stringify({
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString()
        }));
        console.log('Exam cancellation stored locally');
      } else {
        console.warn('No practice session ID found when cancelling');
      }
      
      router.push('/(dashboard)/student');
    } catch (error: any) {
      console.error('Error canceling exam:', error.message || error);
      // Even if there's an error, navigate back
      router.push('/(dashboard)/student');
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading questions...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-lg mb-4">No questions available.</p>
        <p className="text-gray-600">Please contact your teacher to add some questions to the question bank.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Check if the current question is open-ended
  const isOpenEndedQuestion = 
    currentQuestion?.questionType === 'OPEN_ENDED' || 
    !currentQuestion?.options ||
    !Array.isArray(currentQuestion?.options) || 
    currentQuestion?.options.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Mock Exam</h2>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="animate-spin-counterclockwise">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={`text-lg font-mono ${timeRemaining <= 60 ? 'text-red-600 animate-pulse' : 'text-gray-600'}`}>
              Time Remaining: {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg mb-6 flex-1">
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">
              {currentQuestion.text}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Topic: {currentQuestion.topicName || currentQuestion.topic?.name || 'General'}
            </p>

            {isOpenEndedQuestion ? (
              // Open-ended question input
              <div className="mb-6">
                <label htmlFor="open-answer" className="block text-gray-700 text-sm font-medium mb-2">
                  Your Answer:
                </label>
                <textarea 
                  id="open-answer"
                  rows={4}
                  className="w-full p-4 text-lg rounded-lg border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Type your answer here..."
                  disabled={timeRemaining <= 0 || examSubmitted}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                ></textarea>
              </div>
            ) : (
              // Multiple choice options
              <div className="grid grid-cols-2 gap-6">
                {currentQuestion.options.map((option) => (
                  <button 
                    key={option.id}
                    onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                    disabled={timeRemaining <= 0 || examSubmitted}
                    className={`
                      relative p-6 text-left rounded-lg transition-all duration-200
                      ${answers[currentQuestion.id] === option.id 
                        ? 'bg-blue-600 text-white shadow-inner transform translate-y-0.5' 
                        : 'bg-white hover:bg-blue-600 hover:text-white hover:transform hover:translate-y-0.5 shadow-lg hover:shadow-md'}
                      ${timeRemaining <= 0 || examSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      border border-gray-200 hover:border-transparent
                      min-h-[100px] flex items-center
                    `}
                  >
                    <span className="text-lg">{option.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pb-6">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion || timeRemaining <= 0}
            className={`px-8 py-3 rounded-lg transition-all duration-200 ${
              isFirstQuestion || timeRemaining <= 0
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-white hover:text-blue-600 hover:border-blue-600 border-2 border-transparent'
            }`}
          >
            Previous
          </button>

          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={examSubmitted}
              className="px-8 py-3 rounded-lg transition-all duration-200 bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-transparent"
            >
              Cancel Exam
            </button>
            
            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={examSubmitted || timeRemaining <= 0 || isSubmitting}
                className={`px-8 py-3 rounded-lg transition-all duration-200 ${
                  isSubmitting || examSubmitted || timeRemaining <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-white hover:text-green-600 hover:border-green-600 border-2 border-transparent'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={timeRemaining <= 0}
                className={`px-8 py-3 rounded-lg transition-all duration-200 ${
                  timeRemaining <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-white hover:text-blue-600 hover:border-blue-600 border-2 border-transparent'
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>

        {examSubmitted && (
          <div className="mt-4 text-center text-green-600 bg-green-50 p-4 rounded-lg">
            Exam submitted successfully. Redirecting to results...
          </div>
        )}

        {timeRemaining <= 0 && !examSubmitted && (
          <div className="mt-4 text-center text-red-600 bg-red-50 p-4 rounded-lg">
            Time's up! Your exam is being submitted...
          </div>
        )}

        {error && (
          <div className="mt-4 text-center text-red-600 bg-red-50 p-4 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 