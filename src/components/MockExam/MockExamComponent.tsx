'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Option {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  options: Option[];
  topicName: string;
}

interface MockExamComponentProps {
  userId: string;
  examDurationMinutes: number;
}

interface DatabaseQuestion {
  id: number;
  text: string;
  options: string | Option[];
  topic: {
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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(examDurationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Timer effect
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchQuestions = async () => {
    try {
      console.log('Fetching questions...');
      
      const { data: rawData, error } = await supabase
        .from('Question')
        .select(`
          id,
          text,
          options,
          topic:Topic (
            name
          )
        `)
        .eq('questionType', 'MULTIPLE_CHOICE')
        .limit(10);

      if (error) {
        console.error('Supabase error:', error);
        setError(error.message);
        setIsLoading(false);
        return;
      }
      
      console.log('Raw data from Supabase:', rawData);
      
      if (!rawData || rawData.length === 0) {
        setError('No questions available. Please try again.');
        setIsLoading(false);
        return;
      }

      // Transform the data to ensure proper structure
      const formattedQuestions: Question[] = (rawData as unknown as DatabaseQuestion[]).map(q => {
        // Parse options if they're a string
        let parsedOptions: Option[];
        try {
          if (typeof q.options === 'string') {
            parsedOptions = JSON.parse(q.options);
          } else {
            parsedOptions = q.options;
          }
        } catch (e) {
          console.error('Error parsing options:', e);
          parsedOptions = [];
        }

        return {
          id: q.id,
          text: q.text || '',
          options: parsedOptions,
          topicName: q.topic?.name || 'Unknown Topic'
        };
      });

      console.log('Formatted questions:', formattedQuestions);
      setQuestions(formattedQuestions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to fetch questions. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    if (timeRemaining <= 0 || examSubmitted) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
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
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(answers).length;
    
    try {
      console.log('Submitting exam results:', {
        studentId: userId,
        score: answeredQuestions,
        type: 'MOCK_EXAM',
        answers
      });

      // First check if there's an existing result
      const { data: existingResult } = await supabase
        .from('Result')
        .select()
        .eq('studentId', userId)
        .eq('type', 'MOCK_EXAM')
        .single();

      if (existingResult) {
        const { error: updateError } = await supabase
          .from('Result')
          .update({
            score: answeredQuestions,
            answers: answers
          })
          .eq('studentId', userId)
          .eq('type', 'MOCK_EXAM');

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('Result')
          .insert({
            studentId: userId,
            score: answeredQuestions,
            type: 'MOCK_EXAM',
            answers: answers
          });

        if (insertError) throw insertError;
      }

      setExamSubmitted(true);
      router.push('/(dashboard)/student/results');
    } catch (error: any) {
      console.error('Error submitting exam:', error.message || error);
      setError('Failed to submit exam. Please try again.');
      setExamSubmitted(false);
    } finally {
      setIsSubmitting(false);
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
              Topic: {currentQuestion.topicName}
            </p>
            <div className="grid grid-cols-2 gap-6">
              {currentQuestion.options.map((option, optionIndex) => (
                <button 
                  key={optionIndex}
                  onClick={() => handleAnswerChange(currentQuestion.id, option.text)}
                  disabled={timeRemaining <= 0 || examSubmitted}
                  className={`
                    relative p-6 text-left rounded-lg transition-all duration-200
                    ${answers[currentQuestion.id] === option.text 
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