"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
// Link is not used, can be removed
// import Link from "next/link"; 
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

interface OptionClient { // Client-side Option type
  id: string;
  text: string;
}

interface QuestionClient { // Client-side Question type
  id: number;
  text: string;
  question?: string; 
  options: OptionClient[]; // Ensure this is an array of OptionClient
  correctAnswer: string | string[] | Record<string, string> | null; // Can be various types or null
  hint?: string;
  topic: {
    id: string | number; // Prisma Topic.id is Int
    name: string;
  };
  difficulty?: string; // Matches Prisma DifficultyLevel enum values
  pointsAwarded?: number;
  questionType?: string; // Matches Prisma QuestionType enum values
  imageUrl?: string;
  topicName?: string; // Kept for potential backward compatibility from some data sources
}

interface PracticeProgress {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string>; 
  questionResults: {id: number, correct: boolean, question: string, userAnswer: string | Record<string, string>, correctAnswer: string | string[] | Record<string, string> | null}[];
  sessionFinalized?: boolean;
}

export default function RandomPractice() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null); // For MCQ, or stringified for others
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65); 
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string>>({}); // Stores stringified answer for multi-part
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false); 
  const [questionResults, setQuestionResults] = useState<PracticeProgress['questionResults']>([]);
  const [textAnswer, setTextAnswer] = useState(''); 
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({});
  const [multiPartResults, setMultiPartResults] = useState<Record<string, boolean>>({});
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

  useEffect(() => {
    const currentUserId = safeStorage.getItem('userId');
    if (!currentUserId) {
      console.warn('User ID not found in storage. Practice progress won\'t be saved.');
      fetchRandomQuestions(); // Fetch new questions if no user ID (or handle redirect)
      return;
    }
    
    const savedProgress = safeStorage.getItem(`randomPracticeProgress_${currentUserId}`);
    if (savedProgress) {
      try {
        const progress: PracticeProgress = JSON.parse(savedProgress);
        setQuestions(progress.questions || []); // Ensure questions is array
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
        setScore(progress.score || 0);
        setAnsweredQuestions(progress.answeredQuestions || {});
        setQuestionResults(progress.questionResults || []);
        setSessionFinalized(progress.sessionFinalized || false);
        setLoading(false);
        if(progress.questions && progress.questions.length > 0 && progress.currentQuestionIndex >= progress.questions.length) {
          setShowSummary(true);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
        fetchRandomQuestions(); 
      }
    } else {
      fetchRandomQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentUserId = safeStorage.getItem('userId');
    if (!currentUserId || loading || questions.length === 0) return; // Don't save if loading or no questions
    
    const progress: PracticeProgress = {
      questions,
      currentQuestionIndex,
      score,
      answeredQuestions,
      questionResults,
      sessionFinalized
    };
    safeStorage.setItem(`randomPracticeProgress_${currentUserId}`, JSON.stringify(progress));
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading]);

  useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedAnswerString = answeredQuestions[currentQuestionId];
      
      // Reset states for the new question
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setTextAnswer('');
      setMultiPartAnswers({});
      setMultiPartResults({});
      setAiMessage(null);
      
      if (savedAnswerString) {
        setSelectedAnswer(savedAnswerString); // This is the string representation from storage
        
        // Re-evaluate and display correctness based on question type
        if (currentQuestion.questionType === "OPEN_ENDED" || currentQuestion.questionType === "FILL_IN_THE_BLANK") {
          setTextAnswer(savedAnswerString); // Populate input field
          let correctAnswerVal = currentQuestion.correctAnswer;
          // Handle if correctAnswer is an array (e.g. for fill-in-the-blank allowing multiple correct strings)
          const correctAnswerText = Array.isArray(correctAnswerVal) 
            ? correctAnswerVal.map(cv => String(cv || '').trim().toLowerCase())
            : [String(correctAnswerVal || '').trim().toLowerCase()];
          
          const isCorrect = correctAnswerText.includes(savedAnswerString.trim().toLowerCase());
          setIsAnswerCorrect(isCorrect);
          setAiMessage(isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctAnswerText.join(' or ')}".`);
        
        } else if (currentQuestion.questionType === "MULTI_PART" && typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer !== null && !Array.isArray(currentQuestion.correctAnswer)) {
          try {
            const userAnswers = JSON.parse(savedAnswerString); // User answers were stored as JSON string
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
          } catch(e) { console.error("Error parsing multi-part saved answer from storage", e)}
        
        } else { // MULTIPLE_CHOICE (default)
          // For MCQ, correctAnswer should be the ID of the correct option
          const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
          const isCorrect = savedAnswerString.toLowerCase() === correctAnswerId;
          setIsAnswerCorrect(isCorrect);

          const correctOption = currentQuestion.options.find(option => 
            option.id.toLowerCase() === correctAnswerId
          );
          const correctText = correctOption ? correctOption.text : `Option ID: ${correctAnswerId}`;
          setAiMessage(isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctText}".`);
        }
      }
      setChatHistory([]); // Clear chat history for new question
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion]); // currentQuestion is now stable

  async function fetchRandomQuestions() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/questions/random?limit=10'); // Adjust limit as needed
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: {message: `API error: ${response.status}`}}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      const data: QuestionClient[] = await response.json(); // Expect API to return QuestionClient[]
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No questions returned from API or data is not an array.');
      }
      
      // The API should now be returning questions in the QuestionClient format, including processed options
      setQuestions(data);
      setCurrentQuestionIndex(0);
      setScore(0);
      setAnsweredQuestions({});
      setQuestionResults([]);
      setSessionFinalized(false);

    } catch (error: any) {
      console.error("Error setting up practice questions:", error);
      setError(error.message || "Failed to load questions. Please try again.");
      setQuestions([]);
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
        body: JSON.stringify({ xpAmount: score, activityType: 'practice_completed' }), // Award actual score
      });
      const xpData = await xpResponse.json().catch(() => null);
      if (!xpResponse.ok) {
        console.error('Failed to award XP', xpData || xpResponse.statusText);
        toast.error(xpData?.error?.message || "There was an issue awarding XP.");
      } else {
        console.log('Successfully awarded XP:', xpData);
        toast.success(`You earned ${xpData.awarded || score} XP! ${xpData.leveledUp ? `You reached Level ${xpData.level}!` : ''}`);
      }

      const streakResponse = await fetch('/api/user/update-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType: 'practice_completed' }),
      });
      const streakData = await streakResponse.json().catch(() => null);
      if (!streakResponse.ok) {
        console.error('Failed to update streak', streakData || streakResponse.statusText);
        toast.error(streakData?.error?.message || "There was an issue updating your streak.");
      } else {
        console.log('Successfully updated streak:', streakData);
        if (streakData?.currentStreak > 1) {
          toast.success(`You're on a ${streakData.currentStreak} day streak! Keep it up!`);
        } else if (streakData?.currentStreak === 1) {
          toast.info("Streak started! Practice tomorrow to keep it going.");
        }
      }
      setSessionFinalized(true); 
    } catch (error) {
      console.error('Error in awardXPAndStreak:', error);
      toast.error("There was an issue saving your results.");
    }
  };

  const handleAnswerMCQ = (optionId: string, optionText: string) => { // Changed to handleAnswerMCQ for clarity
    if (!currentQuestion || !Array.isArray(currentQuestion.options)) {
      console.error("Current question or options are not available for MCQ");
      return;
    }
    
    setSelectedAnswer(optionId); // Store the selected option's ID
    
    // For MCQ, correctAnswer should be the ID of the correct option
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    
    setIsAnswerCorrect(isCorrect);
    
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: optionId // Store the selected option ID
    }));
    
    const correctOption = currentQuestion.options.find(option => 
      option.id.toLowerCase() === correctAnswerId
    );
    const correctAnswerDisplayText = correctOption ? correctOption.text : `ID: ${currentQuestion.correctAnswer}`;
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct." 
      : `Not quite right. The correct answer is "${correctAnswerDisplayText}".`;
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: currentQuestion.text || '',
        userAnswer: optionText, // Store the text of the user's chosen option for display
        correctAnswer: correctAnswerDisplayText
      }
    ]);
    
    if (isCorrect) {
      setScore(prevScore => prevScore + (currentQuestion.pointsAwarded || 10));
    }
  };
  
  const handleTextAnswerSubmit = () => {
    if (!textAnswer.trim() || !currentQuestion) return;
    
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer); // Store the raw text answer
    
    let correctAnswerVal = currentQuestion.correctAnswer;
    const correctAnswersTextArray = Array.isArray(correctAnswerVal)
        ? correctAnswerVal.map(cv => String(cv || '').trim().toLowerCase())
        : [String(correctAnswerVal || '').trim().toLowerCase()];

    const isCorrect = correctAnswersTextArray.includes(userAnswer.toLowerCase());
    
    setIsAnswerCorrect(isCorrect);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswer }));
    
    const feedbackMessage = isCorrect 
      ? "Great job! That's correct." 
      : `Not quite right. The correct answer is "${correctAnswersTextArray.join(' or ')}".`;
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: isCorrect,
        question: currentQuestion.text || '',
        userAnswer: userAnswer,
        correctAnswer: correctAnswersTextArray.join(' or ')
      }
    ]);
    
    if (isCorrect) {
        setScore(prevScore => prevScore + (currentQuestion.pointsAwarded || 10));
    }
  };

  const handleMultiPartSubmit = () => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return;
    
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
    
    // Award points
    if (allPartsCorrect && totalParts > 0) { 
        setScore(prevScore => prevScore + (currentQuestion.pointsAwarded || 10));
    } else if (correctPartsCount > 0 && totalParts > 0) { 
        const partialScore = Math.round(((currentQuestion.pointsAwarded || 10) * correctPartsCount) / totalParts);
        setScore(prevScore => prevScore + partialScore);
    }
    
    const userAnswerString = JSON.stringify(multiPartAnswers); // Store as string
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswerString }));
    setSelectedAnswer(userAnswerString); // Indicate an answer has been submitted

    const feedbackMessage = allPartsCorrect
      ? "Great job! All parts are correct."
      : "Some parts are incorrect. Check the feedback below.";
    setAiMessage(feedbackMessage);
    setChatHistory(prev => [...prev, { role: "assistant", content: feedbackMessage }]);
    
    setQuestionResults(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        correct: allPartsCorrect,
        question: currentQuestion.text || '',
        userAnswer: multiPartAnswers, // Store the object for review display
        correctAnswer: correctAnswersMap  // Store the object for review display
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setShowSummary(true);
      if (!sessionFinalized) {
        awardXPAndStreak();
      }
    }
  };

  const completeSessionAndStartNew = () => {
    const currentUserId = safeStorage.getItem('userId');
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    // Reset state for a new session
    setShowSummary(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnsweredQuestions({});
    setQuestionResults([]);
    setSessionFinalized(false); // Allow XP/streak for new session
    setAiMessage(null);
    setChatHistory([]);
    fetchRandomQuestions(); // Fetch a new set of random questions
  };

  const clearProgressAndExit = () => {
    const currentUserId = safeStorage.getItem('userId');
    if (currentUserId) {
      safeStorage.removeItem(`randomPracticeProgress_${currentUserId}`);
    }
    router.push('/student/practice'); // Navigate to main practice page
  };
  
  const handleSendMessage = async () => {
    // ... (keep existing implementation, ensure it uses currentQuestion.text)
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
        ? currentQuestion.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option.text}`).join('\n')
        : 'No options available for this question type.';
        
      let correctAnswerDisplay = 'Not available';
      if (currentQuestion.questionType === "MULTIPLE_CHOICE" && currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.correctAnswer && typeof currentQuestion.correctAnswer === 'string') {
        const correctAnswerId = String(currentQuestion.correctAnswer).toLowerCase();
        const correctOption = currentQuestion.options.find(opt => opt.id.toLowerCase() === correctAnswerId);
        if (correctOption) correctAnswerDisplay = correctOption.text;
      } else if (currentQuestion.correctAnswer){
        correctAnswerDisplay = JSON.stringify(currentQuestion.correctAnswer);
      }
      
      const context = `Question: ${currentQuestion.text}\nOptions: ${optionsText}\nCorrect Answer: ${correctAnswerDisplay}${currentQuestion.hint ? `\nHint: ${currentQuestion.hint}` : ''}`;
      
      const messages = [
        { role: "system", content: `You are a helpful AI tutor for a Primary School student. Current question context: ${context}. Provide helpful explanations. If the student asks for the answer directly, try to guide them first, but provide it if they insist or seem stuck after a hint. Keep responses concise and encouraging.` },
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
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment." }]);
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
    const newSplitPosition = Math.max(30, Math.min(70, ((e.clientX - containerRect.left) / containerRect.width) * 100));
    setSplitPosition(newSplitPosition);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  const isMultiPartComplete = () => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return false;
    const requiredParts = Object.keys(currentQuestion.correctAnswer);
    if (requiredParts.length === 0) return false; 
    return requiredParts.every(part => multiPartAnswers[part]?.trim());
  };
  
  const renderQuestionContent = () => {
    if (!currentQuestion) return <p className="text-center text-gray-500">Loading question...</p>;

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
                
                const isSelected = selectedAnswer === optionId;
                const isThisCorrectOption = String(currentQuestion.correctAnswer || '').toLowerCase() === optionId.toLowerCase();

                let buttonClass = "bg-white hover:bg-gray-50 border border-gray-300";
                if (selectedAnswer !== null) { // An answer has been submitted
                  if (isSelected) { // This option was selected by the user
                    buttonClass = isAnswerCorrect ? "bg-green-50 border-2 border-green-500 text-green-800" : "bg-red-50 border-2 border-red-500 text-red-800";
                  } else if (isThisCorrectOption) { // This is the correct option, but was not selected
                    buttonClass = "bg-green-50 border-2 border-green-500 text-green-800";
                  }
                }
                
                return (
                  <button
                    key={option.id} // Use option.id if unique, otherwise index
                    onClick={() => handleAnswerMCQ(optionId, optionText)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${buttonClass}`}
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
                  <p className="font-medium">{isAnswerCorrect ? "Correct! Well done." : `Incorrect. The correct answer is "${ Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.join(' or ') : currentQuestion.correctAnswer }".`}</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'MULTI_PART':
        if (typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) {
            return <p className="text-red-500">Error: Correct answer format for multi-part question is invalid.</p>;
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-8">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 font-medium">This is a multi-part question. Enter your answers for each part:</p>
            </div>
            {parts.map((part) => (
              <div key={part} className="mb-6">
                <div className="mb-2 font-medium text-gray-700">Part {part.toUpperCase()}:</div>
                <div className="flex">
                    <input type="text" value={multiPartAnswers[part] || ''} 
                           onChange={(e) => setMultiPartAnswers({...multiPartAnswers, [part]: e.target.value})}
                           placeholder={`Enter answer for part ${part.toUpperCase()}`} 
                           disabled={selectedAnswer !== null} // Disable after main submission
                           className={`w-full p-4 text-lg rounded-l-md border ${
                             selectedAnswer !== null && multiPartResults[part] !== undefined 
                               ? multiPartResults[part] ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                               : "border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                           }`}
                    />
                </div>
                {selectedAnswer !== null && multiPartResults[part] !== undefined && !multiPartResults[part] && (
                    <p className="text-xs text-red-600 mt-1">
                      Correct answer: "{(currentQuestion.correctAnswer as Record<string, string>)[part]}"
                    </p>
                )}
              </div>
            ))}
            <button onClick={handleMultiPartSubmit} disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`px-6 py-3 rounded-md ${ selectedAnswer === null && isMultiPartComplete() ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >Submit All Answers</button>
            {/* Overall feedback after submission */}
            {selectedAnswer !== null && aiMessage && (
              <div className={`mt-4 p-4 rounded-md ${ isAnswerCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                <p className="font-medium">{aiMessage}</p>
              </div>
            )}
          </div>
        );
      default:
        return (<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-center"><p>Unknown question type: {currentQuestion.questionType || 'Not specified'}</p></div>);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div><p className="ml-4 text-lg">Loading practice session...</p></div>;
  if (error) return <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]"><div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl"><div className="flex items-center"><div className="flex-shrink-0"><svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Error Loading Questions</h3><div className="mt-2 text-sm text-red-700"><p>{error}</p></div></div></div></div><p className="text-gray-600 mb-6">We encountered a problem while loading practice questions.</p><div className="flex space-x-4"><Button onClick={() => fetchRandomQuestions()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Try Again</Button><Button onClick={() => router.push("/student/practice")} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Return to Practice Topics</Button></div></div>;
  
  if (!currentQuestion && !loading && !error && questions.length === 0) { // More specific check for truly no questions
      return <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]"><h1 className="text-2xl font-bold mb-4">No Questions Available</h1><p className="text-gray-600 mb-6">We couldn't find any practice questions matching your criteria right now.</p><Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white">Return to Practice Topics</Button></div>;
  }

  if (showSummary) {
    const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);
    const percentageCorrect = totalPossibleScore > 0 ? Math.round((score / totalPossibleScore) * 100) : 0;

    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
          <h1 className="text-xl font-semibold text-center flex-1 text-gray-700">Practice Session Results</h1>
        </div>
        <div className="container mx-auto p-6 max-w-4xl flex-1">
          <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-48 h-48 relative mb-6 md:mb-0 md:mr-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={percentageCorrect >= 70 ? "#10b981" : percentageCorrect >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="10" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * percentageCorrect) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="font-bold text-3xl" fill="#374151">{percentageCorrect}%</text>
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Session Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-lg">
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-sm">Total Questions</p><p className="font-semibold">{questions.length}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-sm">Your Score</p><p className="font-semibold text-green-600">{score} / {totalPossibleScore}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-sm">Correct Answers</p><p className="font-semibold text-green-600">{questionResults.filter(r => r.correct).length}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-sm">XP Earned</p><p className="font-semibold text-amber-500">{score}</p></div>
                </div>
                <div className="flex flex-col sm:flex-row justify-center md:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                  <Button onClick={clearProgressAndExit} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Return to Practice Menu</Button>
                  <Button onClick={completeSessionAndStartNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">Start New Random Practice</Button>
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Question Review</h2>
          <div className="bg-white rounded-xl shadow-xl overflow-hidden"><div className="divide-y divide-gray-200">
            {questionResults.map((result, index) => (
              <div key={index} className={`p-6 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start">
                  <div className={`mt-1 mr-4 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${result.correct ? 'bg-green-500' : 'bg-red-500'} text-white text-lg font-bold`}>
                    {result.correct ? "✓" : "✕"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 mb-2">Q{index + 1}: {result.question}</p>
                    <div className="text-sm space-y-1">
                      <p className={`${result.correct ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="font-medium">Your answer: </span> 
                        {typeof result.userAnswer === 'object' ? JSON.stringify(result.userAnswer) : result.userAnswer}
                      </p>
                      {!result.correct && (
                        <p className="text-blue-700 font-medium">
                          Correct answer: {
                            typeof result.correctAnswer === 'object' 
                              ? JSON.stringify(result.correctAnswer) 
                              : Array.isArray(result.correctAnswer) 
                                ? result.correctAnswer.join(' or ') 
                                : result.correctAnswer
                          }
                        </p>
                      )}
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
  
  if (!currentQuestion) { // Should ideally be caught by previous checks
    return <div className="flex justify-center items-center min-h-screen"><p>Error: Could not load current question. Please try refreshing.</p></div>;
  }

  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button onClick={clearProgressAndExit} className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors">← Exit</button>
        <div className="flex-1 text-center font-medium text-gray-700">{currentQuestion?.topic?.name || 'Practice'} • Question {currentQuestionIndex + 1} of {questions.length}</div>
        <div className="text-amber-600 font-semibold">{score} points</div>
      </div>
      <div className="w-full h-1.5 bg-gray-200"><div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} /></div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Question Panel */}
        <div className="overflow-auto bg-white" style={{ width: `${splitPosition}%` }}>
          <div className="p-6 md:p-10">
            <h1 className="text-xl md:text-2xl font-medium text-gray-800 mb-6">{currentQuestion?.text}</h1>
            {currentQuestion?.imageUrl && (
              <div className="mb-6 flex justify-center border border-gray-200 rounded-md p-2 bg-gray-50">
                <img src={currentQuestion.imageUrl} alt="Question diagram" className="max-w-full h-auto max-h-80 rounded-md object-contain"/>
              </div>
            )}
            {renderQuestionContent()}
            {showHint && currentQuestion?.hint && (
                <div className="my-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md text-yellow-800">
                    <p className="font-semibold mb-1">Hint:</p>
                    <p>{currentQuestion.hint}</p>
                </div>
            )}
            <div className="mt-8 border-t border-gray-200 pt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <Button 
                onClick={() => setShowHint(true)} 
                disabled={selectedAnswer !== null || showHint || !currentQuestion?.hint} 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto"
              >
                Get Hint
              </Button>
              <Button 
                onClick={handleNextQuestion} 
                disabled={selectedAnswer === null} 
                className={`px-8 py-3 text-base w-full sm:w-auto ${selectedAnswer !== null ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Show Results'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Draggable Separator */}
        <div 
            className="w-1.5 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150" 
            onMouseDown={handleMouseDown}
        >
            <div className="h-10 w-1 bg-gray-500 rounded-full group-hover:bg-blue-600 transition-colors duration-150"></div>
        </div>
        
        {/* AI Tutor Panel */}
        <div className="bg-green-50 flex flex-col overflow-hidden" style={{ width: `${100 - splitPosition - 0.5}%` }}> {/* Adjusted width for separator */}
          <div className="p-4 border-b border-green-200 bg-green-100 flex items-center shadow-sm">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-3 text-lg font-bold">AI</div>
            <div className="flex-1"><div className="font-semibold text-green-800">AI Tutor</div><div className="text-xs text-green-600">Your personal learning assistant</div></div>
            <div className="text-xs text-green-600 flex items-center"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5 border-2 border-green-100 shadow-md"></span>Connected</div>
          </div>
          <div ref={aiContentRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-green-25">
            {chatHistory.length > 0 ? (
              chatHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 shadow-md text-sm ${message.role === 'user' ? 'ml-auto bg-blue-500 text-white rounded-br-none' : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            ) : aiMessage ? (
                <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl p-3 shadow-md text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                        <p className="whitespace-pre-wrap">{aiMessage}</p>
                    </div>
                </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 text-4xl">💡</div>
                <p>I'm here to help! Ask me anything about this question, or I'll give you feedback after you answer.</p>
              </div>
            )}
            {isLoadingAI && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl p-3 shadow-md text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                        <div className="flex space-x-1.5 items-center">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            )}
          </div>
          <div className="p-3 border-t border-green-200 bg-green-100">
            <div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 bg-white shadow-sm">
              <input 
                type="text" 
                value={userMessage} 
                onChange={(e) => setUserMessage(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder="Ask about this question..." 
                className="flex-1 py-2.5 px-4 text-sm border-none outline-none bg-transparent rounded-l-full" 
                disabled={isLoadingAI || selectedAnswer !== null} // Disable after an answer is submitted to focus on next question
              />
              <button 
                onClick={handleSendMessage} 
                disabled={isLoadingAI || !userMessage.trim() || selectedAnswer !== null} 
                className={`w-9 h-9 m-1 rounded-full flex items-center justify-center transition-colors ${userMessage.trim() && !isLoadingAI && selectedAnswer === null ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11a1 1 0 112 0v5.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}