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
  correctAnswer: string | string[] | Record<string, string>; // Updated for multi-part
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
  questionResults: {id: number, correct: boolean, question: string, userAnswer: string, correctAnswer: string}[];
  sessionFinalized?: boolean;
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
  const [sessionFinalized, setSessionFinalized] = useState(false);

  // Derive currentQuestion here so it's available to all functions in this component's scope
  const currentQuestion: Question | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

  // Load saved progress on initial render
  useEffect(() => {
    const currentUserId = safeStorage.getItem('userId');
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      fetchRandomQuestions();
      return;
    }
    
    const savedProgress = safeStorage.getItem(`randomPracticeProgress_${currentUserId}`);
    if (savedProgress) {
      try {
        const progress: PracticeProgress = JSON.parse(savedProgress);
        setQuestions(progress.questions);
        setCurrentQuestionIndex(progress.currentQuestionIndex);
        setScore(progress.score);
        setAnsweredQuestions(progress.answeredQuestions);
        setQuestionResults(progress.questionResults || []);
        setSessionFinalized(progress.sessionFinalized || false);
        setLoading(false);
        // If already at summary (e.g. reloaded on summary page)
        if(progress.questions.length > 0 && progress.currentQuestionIndex >= progress.questions.length) {
          setShowSummary(true);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
        fetchRandomQuestions(); // Fetch new questions if saved progress is corrupted
      }
    } else {
      fetchRandomQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: run once on mount

  // Save progress whenever relevant state changes
  useEffect(() => {
    const currentUserId = safeStorage.getItem('userId');
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      return;
    }
    
    // Only save if not initially loading and questions are present
    if (!loading && questions.length > 0) {
      const progress: PracticeProgress = {
        questions,
        currentQuestionIndex,
        score,
        answeredQuestions,
        questionResults,
        sessionFinalized
      };
      safeStorage.setItem(`randomPracticeProgress_${currentUserId}`, JSON.stringify(progress));
    }
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading]);

  // Set the current question's answer if it exists in the saved answers
  useEffect(() => {
    if (currentQuestion) { // Use the derived currentQuestion
      const currentQuestionId = currentQuestion.id;
      const savedAnswer = answeredQuestions[currentQuestionId];
      
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setTextAnswer('');
      setMultiPartAnswers({});
      setMultiPartResults({});
      setAiMessage(null);
      
      if (savedAnswer) {
        setSelectedAnswer(savedAnswer);
        
        if (currentQuestion.questionType === "OPEN_ENDED" || currentQuestion.questionType === "FILL_IN_THE_BLANK") {
          setTextAnswer(savedAnswer);
          let correctAnswerVal = currentQuestion.correctAnswer;
          if (Array.isArray(correctAnswerVal) && correctAnswerVal.length > 0) {
            correctAnswerVal = correctAnswerVal[0];
          }
          const correctAnswerText = String(correctAnswerVal || '').trim().toLowerCase();
          const isCorrect = savedAnswer.trim().toLowerCase() === correctAnswerText;
          setIsAnswerCorrect(isCorrect);
          setAiMessage(isCorrect ? "Great job! That's correct. Ready for the next question?" : `Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`);
        } else if (currentQuestion.questionType === "MULTI_PART" && typeof currentQuestion.correctAnswer === 'object' && !Array.isArray(currentQuestion.correctAnswer)) {
          try {
            const userAnswers = JSON.parse(savedAnswer);
            setMultiPartAnswers(userAnswers);
            const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
            let allCorrect = true;
            const results: Record<string, boolean> = {};
            for (const part in correctAnswersMap) {
              const isPartCorrect = (userAnswers[part] || '').trim().toLowerCase() === String(correctAnswersMap[part]).trim().toLowerCase();
              results[part] = isPartCorrect;
              if (!isPartCorrect) allCorrect = false;
            }
            setMultiPartResults(results);
            setIsAnswerCorrect(allCorrect);
            setAiMessage("Results shown for multi-part question.");
          } catch(e) { console.error("Error parsing multi-part saved answer", e)}
        } else { // MULTIPLE_CHOICE
          const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
          const isCorrect = savedAnswer.toLowerCase() === correctAnswerId;
          setIsAnswerCorrect(isCorrect);
          const correctOption = currentQuestion.options.find(option => 
            option.id.toLowerCase() === correctAnswerId
          );
          const correctText = correctOption ? correctOption.text : correctAnswerId;
          setAiMessage(isCorrect ? "Great job! That's correct. Ready for the next question?" : `Not quite right. The correct answer is "${correctText}". Don't worry, learning is a process!`);
        }
      }
      setChatHistory([]);
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion]); // Add currentQuestion as dependency

  // Parse string options
  useEffect(() => {
    if (currentQuestion && currentQuestion.options && typeof currentQuestion.options === 'string') {
      try {
        const parsedOptions = JSON.parse(currentQuestion.options);
        const updatedQuestions = [...questions];
        updatedQuestions[currentQuestionIndex] = { ...currentQuestion, options: parsedOptions };
        setQuestions(updatedQuestions);
      } catch (error) {
        console.error("Failed to parse options string:", error);
      }
    }
  }, [currentQuestion, questions, currentQuestionIndex]);


  async function fetchRandomQuestions() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/questions/random?limit=10');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'API error');
      const randomQuestions = Array.isArray(data) ? data : [];
      if (randomQuestions.length === 0) {
        // setError('No questions returned from API. Try again later.');
        // setQuestions([]); // Ensure questions is empty
        // setLoading(false);
        // return;
         throw new Error('No questions returned from API');
      }
      
      const processedQuestions = randomQuestions.map(q => ({
        id: typeof q.id === 'string' ? parseInt(q.id, 10) : q.id,
        text: q.text || q.question || '',
        question: q.text || q.question || '',
        options: Array.isArray(q.options) ? q.options : (typeof q.options === 'object' && q.options !== null ? Object.entries(q.options).map(([key, value])=> ({id: key, text: String(value)})) : []),
        correctAnswer: q.correctAnswer || '',
        hint: q.hint || q.explanation || '',
        topic: { id: q.topic?.id || '', name: q.topic?.name || '' },
        difficulty: q.difficulty || 'MEDIUM',
        pointsAwarded: q.pointsAwarded || 10,
        questionType: q.questionType || 'MULTIPLE_CHOICE',
        imageUrl: q.imageUrl || null
      }));
      setQuestions(processedQuestions);
    } catch (error: any) {
      console.error("Error setting up practice questions:", error);
      setError(error.message || "Failed to load questions");
      setQuestions([]); // Clear questions on error
    } finally {
      setLoading(false);
    }
  }

  const awardXPAndStreak = async () => {
    if (sessionFinalized) return; 

    try {
      const xpResponse = await fetch('/api/user/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAmount: 100, activityType: 'practice_completed' }),
      });
      const xpData = await xpResponse.json().catch(() => null);
      if (!xpResponse.ok) {
        console.error('Failed to award XP', xpData || xpResponse.statusText);
        toast.error("There was an issue awarding XP.");
      } else {
        console.log('Successfully awarded XP:', xpData);
        toast.success(`You earned 100 XP!`);
      }

      const streakResponse = await fetch('/api/user/update-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType: 'practice_completed' }),
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
      setSessionFinalized(true); 
    } catch (error) {
      console.error('Error in awardXPAndStreak:', error);
      toast.error("There was an issue saving your results.");
    }
  };

  const handleAnswer = (optionId: string, optionIndex: number) => {
    if (!currentQuestion || !currentQuestion.options || !Array.isArray(currentQuestion.options)) {
      console.error("Current question or options are not available");
      return;
    }
    
    const currentOption = currentQuestion.options[optionIndex];
    const optionText = currentOption.text;
    
    setSelectedAnswer(optionId);
    
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    
    setIsAnswerCorrect(isCorrect);
    
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));
    
    const correctOption = currentQuestion.options.find(option => 
      option.id.toLowerCase() === correctAnswerId
    );
    
    const correctAnswerText = correctOption ? correctOption.text : correctAnswerId; // Use ID as fallback if text isn't found
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct. Ready for the next question?" 
      : `Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`;
    
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
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
      setScore(score + (currentQuestion.pointsAwarded || 10)); // Use pointsAwarded or default
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowSummary(true);
      if (!sessionFinalized) {
        awardXPAndStreak();
      }
    }
  };

  const completeSession = () => {
    const currentUserId = safeStorage.getItem('userId');
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    toast.info("Returning to practice topics.");
    router.push("/student/practice");
  };

  const clearProgressAndExit = () => {
    const currentUserId = safeStorage.getItem('userId');
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    router.push('/student/practice');
  };
  
  const handleSendMessage = async () => {
    if (!userMessage.trim() || !currentQuestion) return;
    const currentUserMessage = userMessage.trim();
    setUserMessage('');
    setIsLoadingAI(true);
    setChatHistory(prev => [...prev, { role: "user", content: currentUserMessage }]);
    
    if (aiContentRef.current) {
      setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
    }
    
    try {
      const optionsText = currentQuestion.options && Array.isArray(currentQuestion.options) 
        ? currentQuestion.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${typeof option === 'object' && option.text ? option.text : String(option)}`).join(', ')
        : 'No options available';
        
      let correctAnswerDisplay = 'Not available';
      if (currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.correctAnswer && typeof currentQuestion.correctAnswer === 'string') {
        const correctAnswerId = String(currentQuestion.correctAnswer).toLowerCase();
        const correctOptionIndex = currentQuestion.options.findIndex(opt => opt.id.toLowerCase() === correctAnswerId);
        if (correctOptionIndex >= 0) correctAnswerDisplay = String.fromCharCode(65 + correctOptionIndex);
      }
      
      const context = `Question: ${currentQuestion.question || currentQuestion.text || 'Not available'}\nOptions: ${optionsText}\nCorrect Answer (letter): ${correctAnswerDisplay}${currentQuestion.hint ? `\nHint: ${currentQuestion.hint}` : ''}`;
      
      const messages = [
        { role: "system", content: `You are a helpful AI tutor. Current question context: ${context}. Provide helpful explanations but don't immediately reveal the answer unless the student has already answered or is really struggling.` },
        ...chatHistory,
        { role: "user", content: currentUserMessage }
      ];
      
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      
      if (!response.ok) throw new Error('AI tutor request failed');
      const data = await response.json();
      setChatHistory(prev => [...prev, { role: "assistant", content: data.message }]);
      
      if (aiContentRef.current) {
        setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
      }
      
    } catch (error) {
      console.error('Error getting AI tutor response:', error);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble. Try again." }]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
    if (newSplitPosition >= 30 && newSplitPosition <= 70) setSplitPosition(newSplitPosition);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTextAnswerSubmit = () => {
    if (!textAnswer.trim() || !currentQuestion) return;
    
    let correctAnswerVal = currentQuestion.correctAnswer;
    if (Array.isArray(correctAnswerVal) && correctAnswerVal.length > 0) {
      correctAnswerVal = correctAnswerVal[0];
    }
    const correctAnswerText = String(correctAnswerVal || '').trim().toLowerCase();
    const isCorrect = textAnswer.trim().toLowerCase() === correctAnswerText;
    
    setSelectedAnswer(textAnswer);
    setIsAnswerCorrect(isCorrect);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: textAnswer }));
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct. Ready for the next question?" 
      : `Not quite right. The correct answer is "${correctAnswerText}". Don't worry, learning is a process!`;
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
    const questionText = currentQuestion.question || currentQuestion.text || '';
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: questionText,
        userAnswer: textAnswer,
        correctAnswer: String(correctAnswerVal || '')
      }
    ]);
    
    if (isCorrect) {
        setScore(score + (currentQuestion.pointsAwarded || 10));
    }
  };

  const isMultiPartComplete = () => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || Array.isArray(currentQuestion.correctAnswer)) return false;
    const requiredParts = Object.keys(currentQuestion.correctAnswer);
    if (requiredParts.length === 0) return false; // No parts to complete if correctAnswer is an empty object
    return requiredParts.every(part => multiPartAnswers[part]?.trim());
  };

  const handleMultiPartSubmit = () => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || Array.isArray(currentQuestion.correctAnswer)) return;
    
    const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
    const results: Record<string, boolean> = {};
    let allPartsCorrect = true;
    let correctPartsCount = 0;
    const totalParts = Object.keys(correctAnswersMap).length;

    for (const part in correctAnswersMap) {
      const userAnswer = (multiPartAnswers[part] || '').trim().toLowerCase();
      const correctAnswerText = String(correctAnswersMap[part]).trim().toLowerCase();
      const isPartCorrect = userAnswer === correctAnswerText;
      results[part] = isPartCorrect;
      if (isPartCorrect) correctPartsCount++;
      if (!isPartCorrect) allPartsCorrect = false;
    }
    
    setMultiPartResults(results);
    setIsAnswerCorrect(allPartsCorrect);
    
    if (allPartsCorrect) { // Full points if all parts are correct
        setScore(score + (currentQuestion.pointsAwarded || 10));
    } else if (correctPartsCount > 0 && totalParts > 0) { // Partial points (e.g., half if half parts correct)
        const partialScore = Math.round(((currentQuestion.pointsAwarded || 10) * correctPartsCount) / totalParts);
        setScore(score + partialScore);
    }
    
    const userAnswerString = JSON.stringify(multiPartAnswers);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswerString }));
    setSelectedAnswer(userAnswerString);

    const feedbackMessage = allPartsCorrect
      ? "Great job! All parts are correct. Ready for the next question?"
      : "Some parts are incorrect. Check the feedback below.";
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: allPartsCorrect,
        question: currentQuestion.question || currentQuestion.text || '',
        userAnswer: userAnswerString,
        correctAnswer: JSON.stringify(correctAnswersMap)
      }
    ]);
  };
  
  const renderQuestionContent = () => {
    if (!currentQuestion) return null; // Use the component-scoped currentQuestion

    const questionTypeString = String(currentQuestion.questionType);

    switch(questionTypeString) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-4 mb-20">
            {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
                const isCorrectOption = optionId.toLowerCase() === correctAnswerId;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(optionId, index)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${
                      answeredQuestions[currentQuestion.id] === optionId // Check if this option was the one answered
                        ? isAnswerCorrect // If it was answered, use the overall correctness for this question
                          ? "bg-green-50 border-2 border-green-500 text-green-800"
                          : "bg-red-50 border-2 border-red-500 text-red-800"
                        : selectedAnswer !== null && isCorrectOption // If an answer was selected (but not this one) AND this is the correct one
                          ? "bg-green-50 border-2 border-green-500 text-green-800" 
                          : "bg-white hover:bg-gray-50 border border-gray-300" // Default or if another option was selected (and this isn't the correct one to highlight)
                    }`}
                  >
                    <span className="font-bold mr-2">{optionLetter}.</span> {optionText}
                  </button>
                );
              })
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center">
                <p>No answer options available for this question.</p>
              </div>
            )}
          </div>
        );
      
      case 'FILL_IN_THE_BLANK':
      case 'OPEN_ENDED':
        return (
          <div className="mt-8">
            <div className="mb-4">
              <label htmlFor="text-answer" className="block text-gray-700 text-sm font-medium mb-2">Your Answer:</label>
              <div className="flex">
                <input
                  id="text-answer" type="text" value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && textAnswer.trim() && selectedAnswer === null) { e.preventDefault(); handleTextAnswerSubmit(); }}}
                  placeholder="Type your answer here..." disabled={selectedAnswer !== null}
                  className={`w-full p-4 text-lg rounded-l-md border ${ selectedAnswer === null ? "border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200" : isAnswerCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`}
                />
                <button onClick={handleTextAnswerSubmit} disabled={selectedAnswer !== null || !textAnswer.trim()}
                  className={`px-6 rounded-r-md ${ selectedAnswer === null && textAnswer.trim() ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                >Submit</button>
              </div>
              {selectedAnswer !== null && (
                <div className={`mt-4 p-4 rounded-md ${ isAnswerCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  <p className="font-medium">{isAnswerCorrect ? "Correct! Well done." : `Incorrect. The correct answer is "${ Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer[0] : currentQuestion.correctAnswer }".`}</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'MULTI_PART':
        return (
          <div className="mt-8">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 font-medium">This is a multi-part question. Enter your answers for each part:</p>
            </div>
            {currentQuestion.correctAnswer && typeof currentQuestion.correctAnswer === 'object' && !Array.isArray(currentQuestion.correctAnswer) && Object.keys(currentQuestion.correctAnswer).map((part) => (
              <div key={part} className="mb-6">
                <div className="mb-2 font-medium text-gray-700">Part {part.toUpperCase()}:</div>
                <div className="flex"><input type="text" value={multiPartAnswers[part] || ''} onChange={(e) => setMultiPartAnswers({...multiPartAnswers, [part]: e.target.value})}
                    placeholder={`Enter answer for part ${part.toUpperCase()}`} disabled={selectedAnswer !== null}
                    className="w-full p-4 text-lg rounded-l-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200" />
                </div>
              </div>
            ))}
            <button onClick={handleMultiPartSubmit} disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`px-6 py-3 rounded-md ${ selectedAnswer === null && isMultiPartComplete() ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >Submit All Answers</button>
            {selectedAnswer !== null && currentQuestion.correctAnswer && typeof currentQuestion.correctAnswer === 'object' && !Array.isArray(currentQuestion.correctAnswer) && (
              <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200">
                <p className="font-medium text-blue-800 mb-2">Results:</p>
                {Object.keys(currentQuestion.correctAnswer).map(part => (
                  <div key={part} className={`mb-2 p-2 rounded ${ multiPartResults[part] ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    <p><span className="font-medium">Part {part.toUpperCase()}: </span>
                      {multiPartResults[part] ? "Correct!" : `Incorrect. The correct answer is "${(currentQuestion.correctAnswer as Record<string,string>)[part]}".`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return (<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center"><p>Unknown question type: {currentQuestion.questionType}</p></div>);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div></div>;
  if (error) return <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]"><div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl"><div className="flex items-center"><div className="flex-shrink-0"><svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Error Loading Questions</h3><div className="mt-2 text-sm text-red-700"><p>{error}</p></div></div></div></div><p className="text-gray-600 mb-6">We encountered a problem while loading practice questions.</p><div className="flex space-x-4"><Button onClick={() => fetchRandomQuestions()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Try Again</Button><Button onClick={() => router.push("/student/practice")} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Return to Practice Topics</Button></div></div>;
  
  // This check should now use `currentQuestion` which is derived safely.
  if (!currentQuestion && !loading && !error) {
      return <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]"><h1 className="text-2xl font-bold mb-4">No Questions Available</h1><p className="text-gray-600 mb-6">We couldn't find any practice questions right now.</p><Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white">Return to Practice Topics</Button></div>;
  }

  if (showSummary) {
    const percentageCorrect = questions.length > 0 ? Math.round((score / (questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0) || 1) ) * 100) : 0; // Ensure total points is not 0
    const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);

    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex items-center h-14 border-b px-4 bg-white">
          <h1 className="text-xl font-semibold text-center flex-1">Practice Session Results</h1>
        </div>
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-48 h-48 relative mb-6 md:mb-0 md:mr-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={percentageCorrect >= 70 ? "#10b981" : percentageCorrect >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="10" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * percentageCorrect) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="font-bold text-3xl" fill="#374151">{percentageCorrect}%</text>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 text-sm">Total Questions</p><p className="text-2xl font-semibold">{questions.length}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 text-sm">Score</p><p className="text-2xl font-semibold text-green-600">{score} / {totalPossibleScore}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 text-sm">Correct Answers</p><p className="text-2xl font-semibold text-green-600">{questionResults.filter(r => r.correct).length}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 text-sm">XP Earned</p><p className="text-2xl font-semibold text-amber-500">100</p></div>
                </div>
                <div className="flex justify-end space-x-4">
                  <Button onClick={() => router.push("/student/practice")} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Return to Practice</Button>
                  <Button onClick={completeSession} className="bg-indigo-600 hover:bg-indigo-700 text-white">Finish Session</Button>
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Question Review</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden"><div className="divide-y">
            {questionResults.map((result, index) => (
              <div key={index} className={`p-4 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start">
                  <div className={`mt-1 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${result.correct ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {result.correct ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Q{index + 1}: {result.question}</p>
                    <div className="mt-2 text-sm">
                      <p className={`${result.correct ? 'text-green-800' : 'text-gray-600'}`}>Your answer: {result.userAnswer}</p>
                      {!result.correct && (<p className="text-green-800 mt-1">Correct answer: {result.correctAnswer}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div></div>
        </div>
      </div>
    );
  }
  
  // This ensures currentQuestion is not null if we've passed the loading/error/empty checks
  if (!currentQuestion) {
    // This case should ideally not be reached if logic above is correct, but as a fallback:
    return <div className="flex justify-center items-center min-h-screen">Error: Current question is not available.</div>;
  }


  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;

  return (
    <div className="flex flex-col h-screen" ref={containerRef}>
      <div className="flex items-center h-14 border-b px-4">
        <button onClick={clearProgressAndExit} className="text-gray-600 hover:text-gray-800 mr-4">← Exit</button>
        <div className="flex-1 text-center">{currentQuestion?.topic?.name || 'Practice'} • Question {currentQuestionIndex + 1}/{questions.length}</div>
        <div className="text-amber-500 font-semibold">{score} points</div>
      </div>
      <div className="w-full h-1.5 bg-gray-200"><div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} /></div>
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-auto" style={{ width: `${splitPosition}%` }}><div className="p-10">
          <h1 className="text-2xl font-medium text-gray-800 mb-6">{currentQuestion?.question || currentQuestion?.text || 'Loading question...'}</h1>
          {currentQuestion?.imageUrl && (<div className="mb-6 flex justify-center"><img src={currentQuestion.imageUrl} alt="Question diagram" className="max-w-full h-auto max-h-64 rounded-md border border-gray-200"/></div>)}
          {renderQuestionContent()}
          {showHint && currentQuestion?.hint && (<div className="my-8 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800"><p className="font-medium mb-1">Hint:</p><p>{currentQuestion.hint}</p></div>)}
          <div className="mt-8 border-t pt-6 flex justify-between">
            <Button onClick={() => setShowHint(true)} disabled={selectedAnswer !== null || showHint || !currentQuestion?.hint} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">Get Hint</Button>
            <Button onClick={handleNextQuestion} disabled={selectedAnswer === null} className={`px-8 py-2 ${selectedAnswer !== null ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>{currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'}</Button>
          </div>
        </div></div>
        <div className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex flex-col items-center justify-center" onMouseDown={handleMouseDown}><div className="h-10 w-1 bg-gray-400 rounded-full"></div></div>
        <div className="bg-green-50 flex flex-col" style={{ width: `${100 - splitPosition - 0.25}%` }}>
          <div className="p-4 border-b bg-white flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-2">AI</div>
            <div className="flex-1"><div className="font-medium">AI Tutor</div><div className="text-xs text-gray-500">Your personal learning assistant</div></div>
            <div className="text-xs text-green-600 flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>Connected</div>
          </div>
          <div ref={aiContentRef} className="flex-1 overflow-auto p-4">
            {chatHistory.length > 0 ? (<div className="space-y-4">
              {chatHistory.map((message, index) => (<div key={index} className={`${message.role === 'user' ? 'ml-auto bg-blue-500 text-white' : 'mr-auto bg-white text-gray-800'} max-w-[80%] rounded-lg p-3 shadow-sm`}><p className="whitespace-pre-wrap">{message.content}</p></div>))}
              {isLoadingAI && (<div className="mr-auto bg-white text-gray-800 max-w-[80%] rounded-lg p-3 shadow-sm"><div className="flex space-x-2"><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div>)}
            </div>) : aiMessage ? (<div className="bg-white rounded-lg p-4 shadow-sm"><p>{aiMessage}</p></div>) : (<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8"><div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 text-4xl">🤔</div><p>I'm here to help! Ask me anything about this question or I'll give you feedback after you answer.</p></div>)}
          </div>
          <div className="p-4 border-t bg-white">
            <div className="flex items-center rounded-full border border-gray-300 pr-2 overflow-hidden">
              <input type="text" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about this question..." className="flex-1 py-2 px-4 text-sm border-none outline-none" disabled={isLoadingAI} />
              <button onClick={handleSendMessage} disabled={isLoadingAI || !userMessage.trim()} className={`w-8 h-8 rounded-full flex items-center justify-center ${userMessage.trim() && !isLoadingAI ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}