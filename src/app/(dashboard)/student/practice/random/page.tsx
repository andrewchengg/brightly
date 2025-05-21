"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "react-toastify";

// Safe storage utility functions for client-side only code
const safeStorage = {
  getItem: (key: string, storageType: 'local' | 'session' = 'local'): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return storageType === 'local' 
        ? localStorage.getItem(key) 
        : sessionStorage.getItem(key);
    } catch (e) {
      console.error(`Error accessing ${storageType} storage:`, e);
      return null;
    }
  },
  
  setItem: (key: string, value: string, storageType: 'local' | 'session' = 'local'): void => {
    try {
      if (typeof window === 'undefined') return;
      storageType === 'local' 
        ? localStorage.setItem(key, value) 
        : sessionStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error setting ${storageType} storage:`, e);
    }
  },
  
  removeItem: (key: string, storageType: 'local' | 'session' = 'local'): void => {
    try {
      if (typeof window === 'undefined') return;
      storageType === 'local' 
        ? localStorage.removeItem(key) 
        : sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing from ${storageType} storage:`, e);
    }
  }
};

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: number;
  text: string;
  question?: string; // For backward compatibility
  options: Option[];
  correctAnswer: string | string[];
  hint?: string;
  topic: {
    id: string | number;
    name: string;
  };
  difficulty?: string;
  pointsAwarded?: number;
  questionType?: string;
  imageUrl?: string;
  topicName?: string; // For backward compatibility
}

interface PracticeProgress {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string>; // Maps question ID (number) to selected option ID (string)
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
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string>>({});
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false); // New state for summary page
  const [questionResults, setQuestionResults] = useState<{id: number, correct: boolean, question: string, userAnswer: string, correctAnswer: string}[]>([]);
  const [textAnswer, setTextAnswer] = useState(''); // New state for text answer input
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({});
  const [multiPartResults, setMultiPartResults] = useState<Record<string, boolean>>({});

  // Load saved progress on initial render
  useEffect(() => {
    // Get current user ID from localStorage or session
    const currentUserId = safeStorage.getItem('userId');
    
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      fetchRandomQuestions();
      return;
    }
    
    // Use user-specific key for practice progress
    const savedProgress = safeStorage.getItem(`randomPracticeProgress_${currentUserId}`);
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
    const currentUserId = safeStorage.getItem('userId');
    
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
      safeStorage.setItem(`randomPracticeProgress_${currentUserId}`, JSON.stringify(progress));
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
          
          // Simple comparison of IDs
          const isCorrect = savedAnswer.toLowerCase() === correctAnswerId;
          setIsAnswerCorrect(isCorrect);
          
          // Find the correct option with the correct ID
          const correctOption = currentQuestion.options.find(option => 
            option.id.toLowerCase() === correctAnswerId
          );
          
          const correctText = correctOption ? correctOption.text : correctAnswerId;
          
          if (isCorrect) {
            setAiMessage("Great job! That's correct. Ready for the next question?");
          } else {
            setAiMessage(`Not quite right. The correct answer is "${correctText}". Don't worry, learning is a process!`);
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
      
      console.log('Fetching random questions for practice...');
      
      const response = await fetch('/api/questions/random?limit=10');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we got an error response
      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }
      
      // Ensure we have an array of questions
      const randomQuestions = Array.isArray(data) ? data : [];
      
      if (randomQuestions.length === 0) {
        throw new Error('No questions returned from API');
      }
      
      console.log(`Loaded ${randomQuestions.length} questions`);
      
      // Process questions to ensure they have a consistent format
      const processedQuestions = randomQuestions.map(q => {
        // Ensure we have the expected fields, normalize the data structure
        return {
          id: typeof q.id === 'string' ? parseInt(q.id, 10) : q.id,
          text: q.text || q.question || '',
          question: q.text || q.question || '', // For backward compatibility
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer || '',
          hint: q.hint || q.explanation || '',
          topic: {
            id: q.topic?.id || '',
            name: q.topic?.name || ''
          },
          difficulty: q.difficulty || 'MEDIUM',
          pointsAwarded: q.pointsAwarded || 10,
          questionType: q.questionType || 'MULTIPLE_CHOICE',
          imageUrl: q.imageUrl || null
        };
      });
      
      setQuestions(processedQuestions);
      setLoading(false);
    } catch (error: any) {
      console.error("Error setting up practice questions:", error);
      setLoading(false);
      setError(error.message || "Failed to load questions");
    }
  }

  const handleAnswer = (optionId: string, optionIndex: number) => {
    // Ensure currentQuestion and options exist
    if (!currentQuestion || !currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.error("Current question or options are not available");
      return;
    }
    
    // Get the current option
    const currentOption = currentQuestion.options[optionIndex];
    
    // Get text for display
    const optionText = currentOption.text;
    
    setSelectedAnswer(optionText);
    
    // Get the correct answer ID
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    
    // Simple comparison of IDs
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    
    setIsAnswerCorrect(isCorrect);
    
    // Save the answer in the answeredQuestions object using the question ID (number)
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));
    
    // Find the correct option with the correct ID
    const correctOption = currentQuestion.options.find(option => 
      option.id.toLowerCase() === correctAnswerId
    );
    
    // Get the correct answer text for display
    const correctAnswerText = correctOption ? correctOption.text : '';
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct. Ready for the next question?" 
      : `Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`;
    
    setAiMessage(feedbackMessage);
    
    // Update chat history with system feedback
    setChatHistory(prev => [
      ...prev,
      { role: "assistant", content: feedbackMessage }
    ]);
    
    // Record this question result for the summary
    // Ensure the question property is a string
    const questionText = currentQuestion.question || currentQuestion.text || '';
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: questionText,
        userAnswer: optionText,
        correctAnswer: correctAnswerText
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
      setChatHistory([]);
      setTextAnswer(''); // Reset text answer input when moving to next question
    } else {
      // Show summary and update streak automatically
      setShowSummary(true);
      
      // When reaching the end, automatically run the XP and streak updates
      // but don't navigate away
      const updateProgressAndStreak = async () => {
        // Get current user ID
        const currentUserId = safeStorage.getItem('userId');
        
        // Clear saved progress
        if (currentUserId) {
          safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
        }
        
        // Award XP to the user and update streak
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
          
          const responseData = await response.json().catch(() => null);
          
          if (!response.ok) {
            console.error('Failed to award XP', responseData || response.statusText);
            toast.error("There was an issue awarding XP, but your progress was saved.");
          } else {
            console.log('Successfully awarded XP:', responseData);
            toast.success(`You earned 100 XP!`);
          }
          
          // Then, try to update streak - even if XP award failed
          try {
            const streakResponse = await fetch('/api/user/update-streak', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                activityType: 'practice_completed'
              }),
            });
            
            const streakData = await streakResponse.json().catch(() => null);
            
            if (!streakResponse.ok) {
              console.error('Failed to update streak', streakData || streakResponse.statusText);
              toast.error("There was an issue updating your streak.");
            } else {
              console.log('Successfully updated streak:', streakData);
              if (streakData?.currentStreak > 1) {
                toast.success(`You're on a ${streakData.currentStreak} day streak! Keep it up!`);
              }
            }
          } catch (streakError) {
            console.error('Error updating streak:', streakError);
            toast.error("There was an issue updating your streak.");
          }
          
          // DO NOT navigate away - stay on the summary page
        } catch (error) {
          console.error('Error in complete session:', error);
          toast.error("There was an issue saving your results.");
        }
      };
      
      // Run the streak and XP updates
      updateProgressAndStreak();
    }
  };

  const completeSession = async () => {
    // Get current user ID for clearing the correct storage item
    const currentUserId = safeStorage.getItem('userId');
    
    // Clear saved progress when session is completed using the user-specific key
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    
    // Award XP to the user and update streak
    try {
      // First, try to award XP
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
      
      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        console.error('Failed to award XP', responseData || response.statusText);
        toast.error("There was an issue awarding XP, but your progress has been recorded.");
      } else {
        console.log('Successfully awarded XP:', responseData);
        toast.success("XP awarded! Great job completing the practice session.");
      }
      
      // Then, try to update streak - even if XP award failed
      try {
        const streakResponse = await fetch('/api/user/update-streak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activityType: 'practice_completed'
          }),
        });
        
        const streakData = await streakResponse.json().catch(() => null);
        
        if (!streakResponse.ok) {
          console.error('Failed to update streak', streakData || streakResponse.statusText);
          toast.error("There was an issue updating your streak, but your progress has been recorded.");
        } else {
          console.log('Successfully updated streak:', streakData);
          if (streakData?.currentStreak > 1) {
            toast.success(`You're on a ${streakData.currentStreak} day streak! Keep it up!`);
          }
        }
      } catch (streakError) {
        console.error('Error updating streak:', streakError);
        toast.error("There was an issue updating your streak, but your progress has been recorded.");
      }
      
      // Do NOT navigate away automatically
      toast.success("Session completed! Your progress has been saved.");
      
    } catch (error) {
      console.error('Error in complete session:', error);
      toast.error("There was an issue saving your results, but your progress has been recorded.");
    }
  };

  // Add function to explicitly clear progress (for the Exit button)
  const clearProgress = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setShowHint(false);
    setAnsweredQuestions({});
    setChatHistory([]);
    
    // Clear saved progress in localStorage
    const currentUserId = safeStorage.getItem('userId');
    
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    
    // Fetch new questions
    fetchRandomQuestions();
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
    // Ensure the question property is a string
    const questionText = currentQuestion.question || currentQuestion.text || '';
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: questionText,
        userAnswer: textAnswer,
        correctAnswer: String(correctAnswer || '')
      }
    ]);
    
    if (isCorrect) {
      setScore(score + 1);
    }
  };

  const renderQuestionContent = () => {
    if (!currentQuestion) return null;

    const questionTypeString = String(currentQuestion.questionType);

    switch(questionTypeString) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-4 mb-20">
            {currentQuestion?.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index: number) => {
                // Get option ID and text
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                
                // Get the correct answer ID
                const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
                
                // Check if this is the correct option
                const isCorrectOption = optionId.toLowerCase() === correctAnswerId;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(optionId, index)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${
                      answeredQuestions[currentQuestion.id] === optionId
                        ? isAnswerCorrect
                          ? "bg-green-50 border-2 border-green-500 text-green-800"
                          : "bg-red-50 border-2 border-red-500 text-red-800"
                        : selectedAnswer !== null && isCorrectOption
                          ? "bg-green-50 border-2 border-green-500 text-green-800"
                          : "bg-white hover:bg-gray-50 border border-gray-300"
                    }`}
                  >
                    <span className="font-bold mr-2">{optionLetter}.</span> {optionText}
                  </button>
                );
              })
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center">
                <p>No answer options available for this question.</p>
                <p className="text-sm mt-2">This may be due to an API error or missing data.</p>
              </div>
            )}
          </div>
        );
      
      case 'FILL_IN_THE_BLANK':
      case 'OPEN_ENDED':
        return (
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
        );
      
      case 'MULTI_PART':
        // For multi-part questions, we'll need to handle part A, B, etc.
        // This is a simplified version - you might want to expand this based on your requirements
        return (
          <div className="mt-8">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 font-medium">This is a multi-part question. Enter your answers for each part:</p>
            </div>
            
            {Object.keys(currentQuestion.correctAnswer || {}).map((part, index) => (
              <div key={part} className="mb-6">
                <div className="mb-2 font-medium text-gray-700">Part {part.toUpperCase()}:</div>
                <div className="flex">
                  <input
                    type="text"
                    value={multiPartAnswers[part] || ''}
                    onChange={(e) => {
                      const newAnswers = {...multiPartAnswers};
                      newAnswers[part] = e.target.value;
                      setMultiPartAnswers(newAnswers);
                    }}
                    placeholder={`Enter answer for part ${part.toUpperCase()}`}
                    disabled={selectedAnswer !== null}
                    className="w-full p-4 text-lg rounded-l-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={handleMultiPartSubmit}
              disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`px-6 py-3 rounded-md ${
                selectedAnswer === null && isMultiPartComplete()
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Submit All Answers
            </button>
            
            {selectedAnswer !== null && (
              <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200">
                <p className="font-medium text-blue-800 mb-2">Results:</p>
                {Object.keys(currentQuestion.correctAnswer || {}).map(part => (
                  <div key={part} className={`mb-2 p-2 rounded ${
                    multiPartResults[part] 
                      ? "bg-green-50 text-green-800" 
                      : "bg-red-50 text-red-800"
                  }`}>
                    <p>
                      <span className="font-medium">Part {part.toUpperCase()}: </span>
                      {multiPartResults[part] 
                        ? "Correct!" 
                        : `Incorrect. The correct answer is "${currentQuestion.correctAnswer[part]}".`
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center">
            <p>Unknown question type: {currentQuestion.questionType}</p>
            <p className="text-sm mt-2">Please contact support if you see this message.</p>
          </div>
        );
    }
  };

  // Add this function to determine if multi-part answers are complete
  const isMultiPartComplete = () => {
    if (!currentQuestion || !currentQuestion.correctAnswer) return false;
    
    const requiredParts = Object.keys(currentQuestion.correctAnswer);
    for (const part of requiredParts) {
      if (!multiPartAnswers[part] || !multiPartAnswers[part].trim()) {
        return false;
      }
    }
    return true;
  };

  // Add handler for multi-part questions
  const handleMultiPartSubmit = () => {
    if (!currentQuestion || !currentQuestion.correctAnswer) return;
    
    const correctAnswers = currentQuestion.correctAnswer;
    let results = {};
    let correctCount = 0;
    
    // Check each part's answer
    for (const part in correctAnswers) {
      const userAnswer = (multiPartAnswers[part] || '').trim().toLowerCase();
      const correctAnswer = String(correctAnswers[part]).trim().toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      
      results[part] = isCorrect;
      if (isCorrect) correctCount++;
    }
    
    setMultiPartResults(results);
    
    // Consider the question correct if all parts are correct
    const totalCorrect = Object.keys(correctAnswers).length === correctCount;
    setIsAnswerCorrect(totalCorrect);
    
    // Score is based on how many parts are correct
    if (totalCorrect) {
      setScore(score + 1);
    }
    
    // Save the answers to reference later
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: JSON.stringify(multiPartAnswers)
    }));
    
    setSelectedAnswer(JSON.stringify(multiPartAnswers));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Questions</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-gray-600 mb-6">We encountered a problem while loading practice questions.</p>
        <div className="flex space-x-4">
          <Button 
            onClick={() => fetchRandomQuestions()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => router.push("/student/practice")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Return to Practice Topics
          </Button>
        </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                
                {/* Buttons - moved here from the header */}
                <div className="flex justify-end space-x-4">
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
            
            {renderQuestionContent()}

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