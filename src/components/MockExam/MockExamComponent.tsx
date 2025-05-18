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
  pointsAwarded: number;
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

interface PracticeSession {
  id: string;
  studentId: string;
  title: string;
  status: 'NOT_STARTED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  score?: number;
  totalQuestions: number;
  correctAnswers?: number;
  xpEarned: number;
}

export default function MockExamComponent({ userId, examDurationMinutes }: MockExamComponentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(examDurationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  const [totalMarks, setTotalMarks] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Timer effect - only start when exam has started
  useEffect(() => {
    if (!examStarted || timeRemaining <= 0 || examSubmitted) return;

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
  }, [examStarted, timeRemaining, examSubmitted]);

  // Initial data fetching effect - runs immediately
  useEffect(() => {
    initializeExam();
  }, []);

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
      
      await fetchQuestions();
    } catch (error: any) {
      console.error("Error initializing exam:", error);
      setError("Failed to initialize exam: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

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
      
      // Calculate total marks
      const total = randomQuestions.reduce((sum: number, q: Question) => sum + (q.pointsAwarded || 0), 0);
      setTotalMarks(total);
      
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

  const handleStartExam = async () => {
    const examStartTime = new Date();
    setStartTime(examStartTime);
    setExamStarted(true);

    try {
      // Create a new practice session when exam starts
      const response = await fetch('/api/practice-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: userId,
          title: `Mock Exam - ${new Date().toLocaleDateString()}`,
          status: 'STARTED',
          startTime: examStartTime.toISOString(),
          durationSeconds: examDurationMinutes * 60,
          totalQuestions: questions.length,
          xpEarned: 0
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create practice session');
      }

      const session = await response.json();
      setCurrentPracticeSessionId(session.id);
    } catch (error) {
      console.error('Error creating practice session:', error);
      // Continue with exam even if session creation fails
    }
  };

  const handleSubmit = async () => {
    if (examSubmitted || isSubmitting) return;
    
    setIsSubmitting(true);
    const endTime = new Date();
    
    try {
      // Calculate correct answers and score
      let correctAnswersCount = 0;
      let totalScore = 0;
      
      questions.forEach(q => {
        const selectedOptionId = answers[q.id];
        
        if (q.questionType === 'MULTIPLE_CHOICE' && selectedOptionId) {
          if (typeof q.correctAnswer === 'string' && selectedOptionId === q.correctAnswer) {
            correctAnswersCount++;
            totalScore += q.pointsAwarded;
          } else if (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(selectedOptionId)) {
            correctAnswersCount++;
            totalScore += q.pointsAwarded;
          }
        }
      });

      // Calculate XP earned (example: 10 XP per correct answer)
      const xpEarned = correctAnswersCount * 10;

      if (currentPracticeSessionId) {
        try {
          // Update the practice session
          const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'COMPLETED',
              endTime: endTime.toISOString(),
              score: totalScore,
              correctAnswers: correctAnswersCount,
              xpEarned
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update practice session');
          }
        } catch (error) {
          console.error('Error updating practice session:', error);
          // Store results locally as backup
          localStorage.setItem(`mockExamResult_${currentPracticeSessionId}`, JSON.stringify({
            studentId: userId,
            endTime: endTime.toISOString(),
            score: totalScore,
            correctAnswers: correctAnswersCount,
            answers,
            xpEarned
          }));
        }
      }

      // Create student answers records
      try {
        const studentAnswers = Object.entries(answers).map(([questionId, answerId]) => ({
          practiceSessionId: currentPracticeSessionId,
          questionId: parseInt(questionId),
          submittedAnswer: answerId,
          isCorrect: questions.find(q => q.id === parseInt(questionId))?.correctAnswer === answerId,
          pointsEarned: questions.find(q => q.id === parseInt(questionId))?.pointsAwarded || 0,
          attemptedAt: new Date().toISOString()
        }));

        await fetch('/api/student-answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(studentAnswers),
        });
      } catch (error) {
        console.error('Error saving student answers:', error);
      }

      setExamSubmitted(true);
      router.push('/student/results');
    } catch (error: any) {
      console.error('Error submitting exam:', error.message || error);
      setError('Failed to submit exam. Please try again.');
      setExamSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (examSubmitted) return;
    
    try {
      if (currentPracticeSessionId) {
        // Update practice session status to CANCELLED
        await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'PAUSED',
            endTime: new Date().toISOString()
          }),
        });
      }
      
      router.push('/student');
    } catch (error: any) {
      console.error('Error canceling exam:', error);
      router.push('/student');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Preparing Your Mock Exam</h2>
          <p className="text-gray-600 mb-4">Loading questions...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-red-600">{error}</h2>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <p className="text-lg mb-4">No questions available.</p>
          <p className="text-gray-600 mb-4">Please contact your teacher to add some questions to the question bank.</p>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show landing page if exam hasn't started
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-2xl w-full">
          <h1 className="text-3xl font-bold mb-6">Mock Exam</h1>
          <div className="mb-8 text-left">
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-4">Exam Details</h2>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{examDurationMinutes} minutes</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Number of Questions:</span>
                  <span className="font-medium">{questions.length}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600">Total Marks:</span>
                  <span className="font-medium">{totalMarks}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Read each question carefully before answering</li>
                <li>Do not use a calculator when attempting this examination paper.</li>
                <li>The examination will auto-submit when time expires</li>
                <li>Click "Start Exam" when you're ready to begin</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/student')}
              className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartExam}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Exam
            </button>
          </div>
        </div>
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
              Question {currentQuestionIndex + 1} of {questions.length} | Total Marks: {totalMarks}
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
            <div className="mb-6">
              <h3 className="text-xl font-medium mb-4">
                {currentQuestion.question}
              </h3>
              <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-600">
                  Topic: {currentQuestion.topicName || currentQuestion.topic?.name || 'General'}
                </p>
                <p className="text-sm font-medium text-blue-600">
                  [{currentQuestion.pointsAwarded} Marks]
                </p>
              </div>
            </div>

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