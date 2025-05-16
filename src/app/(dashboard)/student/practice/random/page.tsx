"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  topic: {
    id: string;
    name: string;
  };
}

interface PracticeProgress {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<string, string>; // Maps question ID to selected answer
}

export default function RandomPractice() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65); // Default split: 65% question, 35% AI
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string>>({});
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved progress on initial render
  useEffect(() => {
    const savedProgress = localStorage.getItem('randomPracticeProgress');
    if (savedProgress) {
      try {
        const progress: PracticeProgress = JSON.parse(savedProgress);
        setQuestions(progress.questions);
        setCurrentQuestionIndex(progress.currentQuestionIndex);
        setScore(progress.score);
        setAnsweredQuestions(progress.answeredQuestions);
        setLoading(false);
      } catch (error) {
        console.error('Error loading saved progress:', error);
        fetchRandomQuestions();
      }
    } else {
      fetchRandomQuestions();
    }
  }, []);

  // Save progress whenever relevant state changes
  useEffect(() => {
    if (questions.length > 0) {
      const progress: PracticeProgress = {
        questions,
        currentQuestionIndex,
        score,
        answeredQuestions
      };
      localStorage.setItem('randomPracticeProgress', JSON.stringify(progress));
    }
  }, [questions, currentQuestionIndex, score, answeredQuestions]);

  // Set the current question's answer if it exists in the saved answers
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestionId = questions[currentQuestionIndex].id;
      const savedAnswer = answeredQuestions[currentQuestionId];
      
      if (savedAnswer) {
        setSelectedAnswer(savedAnswer);
        const isCorrect = savedAnswer === questions[currentQuestionIndex].correctAnswer;
        setIsAnswerCorrect(isCorrect);
        
        if (isCorrect) {
          setAiMessage("Great job! That's correct. Ready for the next question?");
        } else {
          setAiMessage(`Not quite right. The correct answer is "${questions[currentQuestionIndex].correctAnswer}". Don't worry, learning is a process!`);
        }
      } else {
        setSelectedAnswer(null);
        setIsAnswerCorrect(null);
        setAiMessage(null);
      }
    }
  }, [currentQuestionIndex, questions, answeredQuestions]);

  async function fetchRandomQuestions() {
    try {
      setLoading(true);
      
      const response = await fetch("/api/questions/random?limit=10");
      if (!response.ok) {
        throw new Error("Failed to fetch random questions");
      }
      
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching random questions:", error);
      // Use placeholder data if fetch fails
      setQuestions([
        {
          id: "1",
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correctAnswer: "4",
          hint: "It's an even number",
          topic: {
            id: "1",
            name: "Addition"
          }
        },
        {
          id: "2",
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correctAnswer: "Paris",
          hint: "Think of the Eiffel Tower",
          topic: {
            id: "2",
            name: "Geography"
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
    setIsAnswerCorrect(isCorrect);
    
    // Save the answer in the answeredQuestions object
    setAnsweredQuestions(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
    
    if (isCorrect) {
      setScore(score + 1);
      setAiMessage("Great job! That's correct. Ready for the next question?");
    } else {
      setAiMessage(`Not quite right. The correct answer is "${questions[currentQuestionIndex].correctAnswer}". Don't worry, learning is a process!`);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setShowHint(false);
      setAiMessage(null);
    } else {
      // End of practice
      completeSession();
    }
  };

  const completeSession = () => {
    alert(`Practice complete! Your score: ${score}/${questions.length}`);
    // Clear saved progress when session is completed
    localStorage.removeItem('randomPracticeProgress');
    router.push("/student/practice");
  };

  // Add function to explicitly clear progress (for the Exit button)
  const clearProgress = () => {
    if (confirm('Do you want to save your progress? Click Cancel to reset progress.')) {
      // Progress is already being saved automatically
      router.push("/student/practice");
    } else {
      // Clear progress if user doesn't want to save
      localStorage.removeItem('randomPracticeProgress');
      router.push("/student/practice");
    }
  };

  // Handle resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newSplitPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit the split position between 30% and 70%
    if (newSplitPosition >= 30 && newSplitPosition <= 70) {
      setSplitPosition(newSplitPosition);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">No Questions Available</h1>
        <p className="text-gray-600 mb-6">We couldn't find any practice questions right now.</p>
        <Button 
          onClick={() => router.push("/student/practice")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Return to Practice Topics
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="flex flex-col h-screen" ref={containerRef}>
      {/* Header Bar */}
      <div className="flex items-center h-14 border-b px-4">
        <button onClick={clearProgress} className="text-gray-600 hover:text-gray-800 mr-4">
          ← Exit
        </button>
        <div className="flex-1 text-center">
          {currentQuestion.topic.name} • Practice {currentQuestionIndex + 1}/{questions.length}
        </div>
        <div className="text-amber-500 font-semibold">
          {score} points
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Main Content Area with Splitter */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Panel */}
        <div 
          className="overflow-auto" 
          style={{ width: `${splitPosition}%` }}
        >
          <div className="p-10">
            <h1 className="text-2xl font-medium text-gray-800 mb-12">
              {currentQuestion.question}
            </h1>
            
            <div className="space-y-4 mb-20">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                  className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${
                    selectedAnswer === option
                      ? isAnswerCorrect
                        ? "bg-green-50 border-2 border-green-500 text-green-800"
                        : "bg-red-50 border-2 border-red-500 text-red-800"
                      : selectedAnswer !== null && option === currentQuestion.correctAnswer
                        ? "bg-green-50 border-2 border-green-500 text-green-800"
                        : "bg-white hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {showHint && currentQuestion.hint && (
              <div className="my-8 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <p className="font-medium mb-1">Hint:</p>
                <p>{currentQuestion.hint}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex flex-col items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="h-10 w-1 bg-gray-400 rounded-full"></div>
        </div>

        {/* AI Tutor Panel */}
        <div 
          className="bg-green-50 flex flex-col"
          style={{ width: `${100 - splitPosition}%` }}
        >
          {/* AI tutor header */}
          <div className="p-4 border-b bg-white flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-2">
              AI
            </div>
            <div className="flex-1">
              <div className="font-medium">AI Tutor</div>
              <div className="text-xs text-gray-500">Your personal learning assistant</div>
            </div>
            <div className="text-xs text-green-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              Connected
            </div>
          </div>

          {/* AI tutor content area */}
          <div className="flex-1 overflow-auto p-6">
            {aiMessage ? (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p>{aiMessage}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 text-4xl">
                  🤔
                </div>
                <p>I'm here to help! I'll give you feedback after you answer the question.</p>
              </div>
            )}
          </div>

          {/* AI tutor input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center rounded-full border border-gray-300 pr-2 overflow-hidden">
              <input
                type="text"
                placeholder="Ask about this question..."
                className="flex-1 py-2 px-4 text-sm border-none outline-none"
              />
              <button className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls - now fixed at the bottom of the screen */}
      <div className="fixed bottom-0 left-0 right-0 p-6 border-t bg-white flex justify-between z-10">
        <Button
          onClick={() => setShowHint(true)}
          disabled={selectedAnswer !== null || showHint || !currentQuestion.hint}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Get Hint
        </Button>
        
        <Button
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null}
          className={`px-8 py-2 ${
            selectedAnswer !== null 
              ? "bg-blue-500 hover:bg-blue-600 text-white" 
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
        </Button>
      </div>
    </div>
  );
} 