"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Question {
  id: string;
  question: string;
  options: string[] | any; // Add support for object options
  correctAnswer: string | any; // Add support for object correctAnswer
  hint?: string;
  topic: {
    id: string;
    name: string;
  };
  difficulty?: string;
  pointsAwarded?: number;
  questionType?: string;
  imageUrl?: string;
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
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false); // New state for summary page
  const [questionResults, setQuestionResults] = useState<{id: string, correct: boolean, question: string, userAnswer: string, correctAnswer: string}[]>([]);
  const [textAnswer, setTextAnswer] = useState(''); // New state for text answer input
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  // Load saved progress on initial render
  useEffect(() => {
    // Get current user ID from localStorage or session
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      fetchRandomQuestions();
      return;
    }
    
    // Use user-specific key for practice progress
    const savedProgress = localStorage.getItem(`randomPracticeProgress_${currentUserId}`);
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
    // Get current user ID from localStorage or session
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      return;
    }
    
    if (questions.length > 0) {
      const progress: PracticeProgress = {
        questions,
        currentQuestionIndex,
        score,
        answeredQuestions
      };
      // Use user-specific key for practice progress
      localStorage.setItem(`randomPracticeProgress_${currentUserId}`, JSON.stringify(progress));
    }
  }, [questions, currentQuestionIndex, score, answeredQuestions]);

  // Set the current question's answer if it exists in the saved answers
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestionId = questions[currentQuestionIndex].id;
      const savedAnswer = answeredQuestions[currentQuestionId];
      const currentQuestion = questions[currentQuestionIndex];
      
      // Reset states
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setTextAnswer('');
      setAiMessage(null);
      
      if (savedAnswer) {
        setSelectedAnswer(savedAnswer);
        
        // Handle different question types differently
        if (currentQuestion.questionType === "OPEN_ENDED") {
          // For open-ended questions, set the text answer
          setTextAnswer(savedAnswer);
          
          // Get the correct answer text
          let correctAnswer = currentQuestion.correctAnswer;
          if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
            correctAnswer = correctAnswer[0];
          }
          const correctAnswerText = String(correctAnswer || '').trim().toLowerCase();
          
          // Check if the saved answer was correct
          const isCorrect = savedAnswer.trim().toLowerCase() === correctAnswerText;
          setIsAnswerCorrect(isCorrect);
          
          // Set the AI message feedback
          if (isCorrect) {
            setAiMessage("Great job! That's correct. Ready for the next question?");
          } else {
            setAiMessage(`Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`);
          }
        } else {
          // For multiple choice questions
          // Get the correct answer in the right format
          const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
          
          // Find the matching option
          const optionIndex = currentQuestion.options.findIndex((opt: any) => {
            // Check if the saved answer matches the option text
            const optionText = typeof opt === 'object' && opt.text ? opt.text : String(opt);
            return optionText === savedAnswer;
          });
          
          if (optionIndex >= 0) {
            // Get the option ID from the matched option
            const matchedOption = currentQuestion.options[optionIndex];
            const optionId = typeof matchedOption === 'object' && matchedOption.id 
              ? matchedOption.id.toLowerCase() 
              : String.fromCharCode(97 + optionIndex);
              
            const isCorrect = optionId === correctAnswerId;
            setIsAnswerCorrect(isCorrect);
            
            // Find correct option for display
            const correctOptionIndex = currentQuestion.options.findIndex((opt: any, idx: number) => 
              (typeof opt === 'object' && opt.id 
                ? opt.id.toLowerCase() 
                : String.fromCharCode(97 + idx)
              ) === correctAnswerId
            );
            
            const correctLetter = correctOptionIndex >= 0 
              ? String.fromCharCode(65 + correctOptionIndex) 
              : '?';
            
            const correctOption = correctOptionIndex >= 0 
              ? currentQuestion.options[correctOptionIndex] 
              : null;
            
            const correctText = correctOption 
              ? (typeof correctOption === 'object' && correctOption.text ? correctOption.text : String(correctOption))
              : correctAnswerId;
            
            if (isCorrect) {
              setAiMessage("Great job! That's correct. Ready for the next question?");
            } else {
              setAiMessage(`Not quite right. The correct answer is "${correctLetter}. ${correctText}". Don't worry, learning is a process!`);
            }
          } else {
            // If we can't find the option, reset the state
            setSelectedAnswer(null);
            setIsAnswerCorrect(null);
            setAiMessage(null);
          }
        }
      }
      
      // Reset chat history for new question
      setChatHistory([]);
    }
  }, [currentQuestionIndex, questions, answeredQuestions]);

  // Set the current question and ensure options are properly formatted
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex];
      
      // Additional check to handle string options that need parsing
      if (question && question.options && typeof question.options === 'string') {
        try {
          console.log("Attempting to parse string options:", question.options);
          const parsedOptions = JSON.parse(question.options);
          
          // Update the question with parsed options
          const updatedQuestions = [...questions];
          updatedQuestions[currentQuestionIndex] = {
            ...question,
            options: parsedOptions
          };
          
          setQuestions(updatedQuestions);
          console.log("Successfully parsed options:", parsedOptions);
        } catch (error) {
          console.error("Failed to parse options string:", error);
        }
      }
    }
  }, [currentQuestionIndex, questions]);

  async function fetchRandomQuestions() {
    try {
      setLoading(true);
      
      const response = await fetch("/api/questions/random?limit=10");
      if (!response.ok) {
        throw new Error("Failed to fetch random questions");
      }
      
      const data = await response.json();
      
      // Log the response from the API for debugging
      console.log("API Response:", data);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("No questions returned from API");
      }
      
      setQuestions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching random questions:", error);
      // Don't use hardcoded questions; instead, show an error message to the user
      setLoading(false);
      
      // Use router to navigate back with an error message
      router.push("/student/practice?error=failed-to-load-questions");
    }
  }

  const handleAnswer = (answer: string, optionIndex: number) => {
    // Ensure currentQuestion and options exist
    if (!currentQuestion || !currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.error("Current question or options are not available");
      return;
    }
    
    // Get the current option and extract its ID
    const currentOption = currentQuestion.options[optionIndex];
    const optionId = typeof currentOption === 'object' && currentOption.id 
      ? currentOption.id  // If option has an id property
      : String.fromCharCode(97 + optionIndex).toLowerCase(); // Fallback to a, b, c, d
    
    // Get text for display
    const optionText = typeof currentOption === 'object' && currentOption.text 
      ? currentOption.text 
      : String(currentOption);
    
    setSelectedAnswer(optionText);
    
    // Get the correct answer ID
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    
    // Simple comparison of IDs
    const isCorrect = correctAnswerId === optionId;
    
    setIsAnswerCorrect(isCorrect);
    
    // Save the answer in the answeredQuestions object
    setAnsweredQuestions(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: optionText
    }));
    
    // Find the correct answer option for display
    let correctOption: any = null;
    let correctLetter = "?";
    
    // First try to find the option with matching ID
    const correctOptionIndex = currentQuestion.options.findIndex((opt: any, index: number) => 
      (typeof opt === 'object' && opt.id 
        ? opt.id.toLowerCase() 
        : String.fromCharCode(97 + index)
      ) === correctAnswerId
    );
    
    if (correctOptionIndex >= 0) {
      correctOption = currentQuestion.options[correctOptionIndex];
      correctLetter = String.fromCharCode(65 + correctOptionIndex); // A, B, C, D for display
    }
    
    // Get the correct answer text for display
    const correctAnswerText = correctOption 
      ? (typeof correctOption === 'object' && correctOption.text ? correctOption.text : String(correctOption))
      : correctAnswerId;
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct. Ready for the next question?" 
      : `Not quite right. The correct answer is "${correctLetter}". Don't worry, learning is a process!`;
    
    setAiMessage(feedbackMessage);
    
    // Update chat history with system feedback
    setChatHistory(prev => [
      ...prev,
      { role: "assistant", content: feedbackMessage }
    ]);
    
    // Record this question result for the summary
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: currentQuestion.question,
        userAnswer: `${String.fromCharCode(65 + optionIndex)}. ${optionText}`,
        correctAnswer: `${correctLetter}. ${correctAnswerText}`
      }
    ]);
    
    if (isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setShowHint(false);
      setAiMessage(null);
      setTextAnswer(''); // Reset text answer input when moving to next question
    } else {
      // Show summary instead of immediately ending
      setShowSummary(true);
    }
  };

  const completeSession = async () => {
    // Get current user ID for clearing the correct storage item
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    // Clear saved progress when session is completed using the user-specific key
    if (currentUserId) {
      localStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    } else {
      localStorage.removeItem('randomPracticeProgress'); // Fallback
    }
    
    // Award XP to the user
    try {
      const response = await fetch('/api/user/award-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xpAmount: 100,
          activityType: 'practice_completed'
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to award XP');
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
    
    // Now navigate back to practice page
    router.push("/student/practice");
  };

  // Add function to explicitly clear progress (for the Exit button)
  const clearProgress = () => {
    // Get current user ID
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (confirm('Do you want to save your progress? Click Cancel to reset progress.')) {
      // Progress is already being saved automatically
      router.push("/student/practice");
    } else {
      // Clear progress if user doesn't want to save, using the user-specific key
      if (currentUserId) {
        localStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
      } else {
        localStorage.removeItem('randomPracticeProgress'); // Fallback
      }
      router.push("/student/practice");
    }
  };
  
  // Handle AI tutor chat functionality
  const handleSendMessage = async () => {
    if (!userMessage.trim() || !currentQuestion) return;
    
    const currentUserMessage = userMessage.trim();
    setUserMessage('');
    setIsLoadingAI(true);
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, { role: "user", content: currentUserMessage }]);
    
    // Scroll to bottom of chat
    if (aiContentRef.current) {
      setTimeout(() => {
        if (aiContentRef.current) {
          aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight;
        }
      }, 100);
    }
    
    try {
      // Create context from the current question with safety checks
      const optionsText = currentQuestion.options && Array.isArray(currentQuestion.options) 
        ? currentQuestion.options.map((option: string | any, index: number) => {
            const letter = String.fromCharCode(65 + index);
            const text = typeof option === 'object' && option.text 
              ? option.text 
              : String(option);
            return `${letter}. ${text}`;
          }).join(', ')
        : 'No options available';
        
      // Safely determine correct answer letter
      let correctAnswerLetter = 'Not available';
      if (currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.correctAnswer) {
        // Get the correct answer ID
        const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
        
        // Find the index of the correct option
        const correctOptionIndex = currentQuestion.options.findIndex((opt: any, idx: number) => 
          (typeof opt === 'object' && opt.id 
            ? opt.id.toLowerCase() 
            : String.fromCharCode(97 + idx)
          ) === correctAnswerId
        );
        
        if (correctOptionIndex >= 0) {
          correctAnswerLetter = String.fromCharCode(65 + correctOptionIndex);
        }
      }
      
      const context = `
        Question: ${currentQuestion.question || 'Not available'}
        Options: ${optionsText}
        Correct Answer: ${correctAnswerLetter}
        ${currentQuestion.hint ? `Hint: ${currentQuestion.hint}` : ''}
      `;
      
      // Build conversation history for the API
      const messages = [
        { role: "system", content: `You are a helpful AI tutor assisting a student with practice questions. Here's the current question: ${context}. Provide helpful explanations but don't immediately reveal the answer unless the student has already answered or is really struggling.` },
        ...chatHistory,
        { role: "user", content: currentUserMessage }
      ];
      
      // Call the AI tutor API
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      if (!response.ok) {
        throw new Error('AI tutor request failed');
      }
      
      const data = await response.json();
      const aiResponse = data.message;
      
      // Add AI response to chat history
      setChatHistory(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
      // Scroll to bottom again after response
      if (aiContentRef.current) {
        setTimeout(() => {
          if (aiContentRef.current) {
            aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight;
          }
        }, 100);
      }
      
    } catch (error) {
      console.error('Error getting AI tutor response:', error);
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle user pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const handleTextAnswerSubmit = () => {
    if (!textAnswer.trim() || !currentQuestion) return;
    
    // Get the correct answer text
    let correctAnswer = currentQuestion.correctAnswer;
    
    // If correctAnswer is an array, try to use the first element
    if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
      correctAnswer = correctAnswer[0];
    }
    
    // Convert to string for comparison
    const correctAnswerText = String(correctAnswer || '').trim().toLowerCase();
    
    // Check if the answer is correct (case-insensitive and trimmed)
    const isCorrect = textAnswer.trim().toLowerCase() === correctAnswerText;
    
    setSelectedAnswer(textAnswer);
    setIsAnswerCorrect(isCorrect);
    
    // Save the answer in the answeredQuestions object
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: textAnswer
    }));
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct. Ready for the next question?" 
      : `Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`;
    
    setAiMessage(feedbackMessage);
    
    // Update chat history
    setChatHistory(prev => [
      ...prev,
      { role: "assistant", content: feedbackMessage }
    ]);
    
    // Record this question result for the summary
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: currentQuestion.question,
        userAnswer: textAnswer,
        correctAnswer: String(correctAnswer || '')
      }
    ]);
    
    if (isCorrect) {
      setScore(score + 1);
    }
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

  // Show the summary page if we've completed all questions
  if (showSummary) {
    const percentageCorrect = Math.round((score / questions.length) * 100);
    
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex items-center h-14 border-b px-4 bg-white">
          <h1 className="text-xl font-semibold text-center flex-1">Practice Session Results</h1>
        </div>
        
        <div className="container mx-auto p-6 max-w-4xl">
          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center">
              {/* Score Circle */}
              <div className="w-48 h-48 relative mb-6 md:mb-0 md:mr-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                  />
                  {/* Progress circle - calculate the circumference and then offset */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={percentageCorrect >= 70 ? "#10b981" : percentageCorrect >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray="282.7"
                    strokeDashoffset={282.7 - (282.7 * percentageCorrect) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-bold text-3xl"
                    fill="#374151"
                  >
                    {percentageCorrect}%
                  </text>
                </svg>
              </div>
              
              {/* Stats */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Total Questions</p>
                    <p className="text-2xl font-semibold">{questions.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Correct Answers</p>
                    <p className="text-2xl font-semibold text-green-600">{score}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Incorrect Answers</p>
                    <p className="text-2xl font-semibold text-red-500">{questions.length - score}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">XP Earned</p>
                    <p className="text-2xl font-semibold text-amber-500">100</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Question Review */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">Question Review</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="divide-y">
              {questionResults.map((result, index) => (
                <div key={index} className={`p-4 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-start">
                    <div className={`mt-1 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      result.correct ? 'bg-green-500' : 'bg-red-500'
                    } text-white`}>
                      {result.correct ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Q{index + 1}: {result.question}</p>
                      <div className="mt-2 text-sm">
                        <p className={`${result.correct ? 'text-green-800' : 'text-gray-600'}`}>
                          Your answer: {result.userAnswer}
                        </p>
                        {!result.correct && (
                          <p className="text-green-800 mt-1">
                            Correct answer: {result.correctAnswer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Buttons */}
          <div className="mt-8 flex justify-between">
            <Button 
              onClick={() => router.push("/student/practice")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Return to Practice
            </Button>
            <Button 
              onClick={completeSession}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Complete Session
            </Button>
          </div>
        </div>
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
          {currentQuestion?.topic?.name || 'Practice'} • Question {currentQuestionIndex + 1}/{questions.length}
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
            <h1 className="text-2xl font-medium text-gray-800 mb-6">
              {currentQuestion?.question || 'Loading question...'}
            </h1>
            
            {/* Display question image if available */}
            {currentQuestion?.imageUrl && (
              <div className="mb-6 flex justify-center">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="Question diagram" 
                  className="max-w-full h-auto max-h-64 rounded-md border border-gray-200"
                />
              </div>
            )}
            
            <div className="space-y-4 mb-20">
              {currentQuestion?.questionType === "OPEN_ENDED" ? (
                <div className="mt-8">
                  <div className="mb-4">
                    <label htmlFor="text-answer" className="block text-gray-700 text-sm font-medium mb-2">
                      Your Answer:
                    </label>
                    <div className="flex">
                      <input
                        id="text-answer"
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && textAnswer.trim() && selectedAnswer === null) {
                            e.preventDefault();
                            handleTextAnswerSubmit();
                          }
                        }}
                        placeholder="Type your answer here..."
                        disabled={selectedAnswer !== null}
                        className={`w-full p-4 text-lg rounded-l-md border ${
                          selectedAnswer === null 
                            ? "border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                            : isAnswerCorrect
                              ? "border-green-500 bg-green-50 text-green-800"
                              : "border-red-500 bg-red-50 text-red-800"
                        }`}
                      />
                      <button
                        onClick={handleTextAnswerSubmit}
                        disabled={selectedAnswer !== null || !textAnswer.trim()}
                        className={`px-6 rounded-r-md ${
                          selectedAnswer === null && textAnswer.trim()
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Submit
                      </button>
                    </div>
                    {selectedAnswer !== null && (
                      <div className={`mt-4 p-4 rounded-md ${
                        isAnswerCorrect
                          ? "bg-green-50 border border-green-200 text-green-800"
                          : "bg-red-50 border border-red-200 text-red-800"
                      }`}>
                        <p className="font-medium">
                          {isAnswerCorrect 
                            ? "Correct! Well done." 
                            : `Incorrect. The correct answer is "${
                                Array.isArray(currentQuestion.correctAnswer) 
                                  ? currentQuestion.correctAnswer[0] 
                                  : currentQuestion.correctAnswer
                              }".`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentQuestion?.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((option: string | any, index: number) => {
                  try {
                    // Get option ID and text
                    const optionId = typeof option === 'object' && option.id 
                      ? option.id 
                      : String.fromCharCode(97 + index).toLowerCase(); // a, b, c, d
                      
                    const optionText = typeof option === 'object' && option.text 
                      ? option.text 
                      : typeof option === 'string' ? option : JSON.stringify(option);
                      
                    const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                    
                    // Get the correct answer ID
                    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
                    
                    // Find index of correct answer option
                    const correctOptionIndex = currentQuestion.options.findIndex((opt: any, idx: number) => 
                      (typeof opt === 'object' && opt.id 
                        ? opt.id.toLowerCase() 
                        : String.fromCharCode(97 + idx)
                      ) === correctAnswerId
                    );
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswer(optionText, index)}
                        disabled={selectedAnswer !== null}
                        className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${
                          selectedAnswer === optionText
                            ? isAnswerCorrect
                              ? "bg-green-50 border-2 border-green-500 text-green-800"
                              : "bg-red-50 border-2 border-red-500 text-red-800"
                            : selectedAnswer !== null && index === correctOptionIndex
                              ? "bg-green-50 border-2 border-green-500 text-green-800"
                              : "bg-white hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        <span className="font-bold mr-2">{optionLetter}.</span> {optionText}
                      </button>
                    );
                  } catch (error) {
                    console.error("Error rendering option:", option, error);
                    return (
                      <button
                        key={index}
                        disabled={true}
                        className="w-full text-left p-5 rounded-md bg-red-50 border border-red-300 text-red-800"
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> Error displaying option
                      </button>
                    );
                  }
                }) 
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center">
                  <p>No answer options available for this question.</p>
                  <p className="text-sm mt-2">This may be due to an API error or missing data.</p>
                  <pre className="text-xs mt-2 p-2 bg-yellow-100 rounded overflow-auto max-h-20">
                    {JSON.stringify(currentQuestion?.options || null, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {showHint && currentQuestion?.hint && (
              <div className="my-8 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <p className="font-medium mb-1">Hint:</p>
                <p>{currentQuestion.hint}</p>
              </div>
            )}
            
            {/* Bottom controls - moved inside the question panel */}
            <div className="mt-8 border-t pt-6 flex justify-between">
              <Button
                onClick={() => setShowHint(true)}
                disabled={selectedAnswer !== null || showHint || !currentQuestion?.hint}
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
                {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'}
              </Button>
            </div>
          </div>
        </div>

        {/* Resize Handle - moved inside the flex container */}
        <div 
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex flex-col items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="h-10 w-1 bg-gray-400 rounded-full"></div>
        </div>

        {/* AI Tutor Panel */}
        <div 
          className="bg-green-50 flex flex-col"
          style={{ width: `${100 - splitPosition - 0.25}%` }}
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
          <div ref={aiContentRef} className="flex-1 overflow-auto p-4">
            {chatHistory.length > 0 ? (
              <div className="space-y-4">
                {chatHistory.map((message, index) => (
                  <div 
                    key={index} 
                    className={`${
                      message.role === 'user' 
                        ? 'ml-auto bg-blue-500 text-white' 
                        : 'mr-auto bg-white text-gray-800'
                    } max-w-[80%] rounded-lg p-3 shadow-sm`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {isLoadingAI && (
                  <div className="mr-auto bg-white text-gray-800 max-w-[80%] rounded-lg p-3 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
              </div>
            ) : aiMessage ? (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p>{aiMessage}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 text-4xl">
                  🤔
                </div>
                <p>I'm here to help! Ask me anything about this question or I'll give you feedback after you answer.</p>
              </div>
            )}
          </div>

          {/* AI tutor input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center rounded-full border border-gray-300 pr-2 overflow-hidden">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this question..."
                className="flex-1 py-2 px-4 text-sm border-none outline-none"
                disabled={isLoadingAI}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoadingAI || !userMessage.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  userMessage.trim() && !isLoadingAI
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 