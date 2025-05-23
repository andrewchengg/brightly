// src/app/(dashboard)/student/practice/random/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { PracticeSessionStatus, PracticeSessionType, QuestionType as PrismaQuestionType } from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage'; 
import { useSupabaseUser } from "@/lib/hooks/auth"; 
import LevelUpNotification from "@/components/LevelUpNotification"; // Import LevelUpNotification
import { FaLightbulb, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaRedo, FaCheck, FaTimes, FaCommentDots, FaPaperPlane, FaTrophy, FaMedal, FaChartBar, FaArrowRight, FaRocket } from "react-icons/fa";

// Interfaces
interface OptionClient {
  id: string;
  text: string;
}

interface QuestionClient {
  id: number;
  text: string;
  question?: string; 
  options: OptionClient[]; 
  correctAnswer: string | string[] | Record<string, string> | null; 
  hint?: string;
  explanation?: string | null; // Added explanation
  topic: {
    id: number; 
    name: string;
    subjectId?: number; 
  };
  difficulty?: string; 
  pointsAwarded?: number;
  questionType?: keyof typeof PrismaQuestionType; 
  imageUrl?: string;
  topicName?: string; 
}

interface LocalStoragePracticeProgress {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string | Record<string, string>>; // Allow multi-part
  questionResults: {id: number, correct: boolean, question: string, userAnswer: string | Record<string, string>, correctAnswer: string | string[] | Record<string, string> | null}[];
  sessionFinalized?: boolean;
  practiceSessionId?: string | null;
  subjectId?: number | null; 
  topicId?: number | null;   
}

export default function RandomPractice() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true); // Can be string for specific states
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65); 
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string | Record<string, string>>>({});
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false); 
  const [questionResults, setQuestionResults] = useState<LocalStoragePracticeProgress['questionResults']>([]);
  const [textAnswer, setTextAnswer] = useState(''); 
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({});
  const [multiPartResults, setMultiPartResults] = useState<Record<string, boolean>>({}); // For individual part correctness
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);

  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null); 
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);   
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);


  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) {
        setUserId(authUser.id);
        if (safeStorage.getItem('userId', 'local') !== authUser.id) {
            safeStorage.setItem('userId', authUser.id, 'local');
        }
      } else {
        toast.error("User session not found. Please sign in.");
        router.push('/sign-in'); 
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  const createNewPracticeSession = useCallback(async (fetchedQuestions: QuestionClient[]) => {
    if (!userId) {
      setError("User information is missing. Cannot start session.");
      return null;
    }
    if (fetchedQuestions.length === 0) {
      setError("No questions available to start a session.");
      return null;
    }
    
    const firstQuestion = fetchedQuestions[0];
    const subjectIdForSession = firstQuestion?.topic?.subjectId;
    const topicIdForSession = firstQuestion?.topic?.id;

    setCurrentSubjectId(subjectIdForSession ? Number(subjectIdForSession) : null);
    setCurrentTopicId(topicIdForSession ? Number(topicIdForSession) : null);
    
    try {
      const response = await fetch('/api/practice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userId, title: `Random Practice - ${new Date().toLocaleDateString()}`,
          type: PracticeSessionType.PRACTICE, status: PracticeSessionStatus.IN_PROGRESS, 
          totalQuestions: fetchedQuestions.length,
          subjectId: subjectIdForSession, topicId: topicIdForSession,
        }),
      });
      if (!response.ok) { 
        const errData = await response.json().catch(() => ({ error: { message: 'Failed to parse session creation error' }}));
        throw new Error(errData.error?.message || errData.error || 'Failed to create practice session'); 
      }
      const sessionData = await response.json();
      setCurrentPracticeSessionId(sessionData.id);
      return sessionData.id;
    } catch (err: any) {
      setError(`Could not start a new practice session: ${err.message}`);
      return null;
    }
  }, [userId]);

  const fetchRandomQuestionsAndStartSession = useCallback(async () => {
    if (!userId) return;
    
    safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local'); 
    setLoading(true); setError(null);
    setCurrentQuestionIndex(0); setScore(0); setAnsweredQuestions({});
    setQuestionResults([]); setSessionFinalized(false); setAiMessage(null); setChatHistory([]);
    setCurrentPracticeSessionId(null); 

    try {
      const response = await fetch('/api/questions/random?limit=10');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: {message: `API error: ${response.status}`}}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      const data: QuestionClient[] = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No questions were returned from the API.');
      }
      
      const newSessionId = await createNewPracticeSession(data); 
      if (newSessionId) {
        setQuestions(data); 
      } else {
        setError("Fetched questions but failed to start a new practice session in the database.");
        setQuestions([]); 
      }
    } catch (error: any) {
      setError(error.message || "Failed to load questions. Please try again.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, createNewPracticeSession]);

  useEffect(() => {
    if (!userId) {
      setLoading(true); 
      return; 
    }
    
    setLoading(true);
    const savedProgressString = safeStorage.getItem(`randomPracticeProgress_${userId}`, 'local');
    let resumableSessionFound = false;
    if (savedProgressString) {
        try {
            const progress: LocalStoragePracticeProgress = JSON.parse(savedProgressString);
            if (progress.questions?.length > 0 && !progress.sessionFinalized && progress.practiceSessionId) {
                setQuestions(progress.questions); setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
                setScore(progress.score || 0); 
                setAnsweredQuestions(progress.answeredQuestions as Record<number, string | Record<string, string>> || {}); // Cast here
                setQuestionResults(progress.questionResults || []); setCurrentPracticeSessionId(progress.practiceSessionId);
                setCurrentSubjectId(progress.subjectId || null); setCurrentTopicId(progress.topicId || null);
                setSessionFinalized(false); 
                if (progress.currentQuestionIndex >= progress.questions.length) { setShowSummary(true); setSessionFinalized(true); }
                resumableSessionFound = true;
            } else { safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local');}
        } catch (error) { safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local'); }
    }

    if (!resumableSessionFound) {
        fetchRandomQuestionsAndStartSession(); 
    } else {
        setLoading(false);
    }
  }, [userId, fetchRandomQuestionsAndStartSession]);

  useEffect(() => { 
    if (typeof loading === 'string' || loading || !userId || questions.length === 0 || !currentPracticeSessionId || showSummary) return; 
    const progress: LocalStoragePracticeProgress = {
      questions, currentQuestionIndex, score, 
      answeredQuestions: answeredQuestions as Record<number, string>, // Cast back if necessary, ensure compatibility
      questionResults,
      sessionFinalized, practiceSessionId: currentPracticeSessionId,
      subjectId: currentSubjectId, topicId: currentTopicId,
    };
    safeStorage.setItem(`randomPracticeProgress_${userId}`, JSON.stringify(progress), 'local');
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading, userId, currentPracticeSessionId, showSummary, currentSubjectId, currentTopicId]);

 useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedUserAnswerContent = answeredQuestions[currentQuestionId]; 

      setIsAnswerCorrect(null); 
      setTextAnswer('');
      setMultiPartAnswers({});
      setMultiPartResults({}); // Reset individual part results
      setSelectedAnswer(null); 

      if (savedUserAnswerContent !== undefined) { // Check if an answer exists for this question
        const questionType = currentQuestion.questionType;
        let isCorrectForSaved = false;
        
        if (questionType === PrismaQuestionType.OPEN_ENDED || questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
          if(typeof savedUserAnswerContent === 'string') setTextAnswer(savedUserAnswerContent);
          const cAns = currentQuestion.correctAnswer;
          const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
          isCorrectForSaved = cAnsArr.includes(String(savedUserAnswerContent).trim().toLowerCase());
          setSelectedAnswer(String(savedUserAnswerContent)); 
        } else if (questionType === PrismaQuestionType.MULTI_PART && typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer && !Array.isArray(currentQuestion.correctAnswer)) {
          const userAnswers = typeof savedUserAnswerContent === 'object' && savedUserAnswerContent !== null ? savedUserAnswerContent as Record<string,string> : {};
          setMultiPartAnswers(userAnswers);
          const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
          isCorrectForSaved = true; 
          const currentPartResults: Record<string, boolean> = {};
          for (const part in correctAnswersMap) {
            const isPartCorrect = (userAnswers[part] || '').trim().toLowerCase() === String(correctAnswersMap[part]).trim().toLowerCase();
            currentPartResults[part] = isPartCorrect;
            if (!isPartCorrect) isCorrectForSaved = false;
          }
          setMultiPartResults(currentPartResults);
          setSelectedAnswer(JSON.stringify(savedUserAnswerContent)); 
        } else { // MCQ
          if(typeof savedUserAnswerContent === 'string') setSelectedAnswer(savedUserAnswerContent); 
          isCorrectForSaved = String(currentQuestion.correctAnswer ?? '').toLowerCase() === String(savedUserAnswerContent).toLowerCase();
        }
        setIsAnswerCorrect(isCorrectForSaved);
        // Set AI message based on saved answer
        // This was causing AI message to persist; removed auto-setting AI message here to allow fresh interaction
        // setAiMessage(isCorrectForSaved ? "You previously answered this correctly." : "You previously answered this incorrectly."); 
      } else {
         setAiMessage(null); // Clear AI message for new unanswered questions
      }
      setShowHint(false); 
      // setChatHistory([]); // Don't clear chat history on question change if user might want to refer back
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion]); // Removed aiMessage from deps

  const awardXPAndStreak = useCallback(async (xpToAdd: number) => {
    if (!userId || sessionFinalized || xpToAdd < 0) return null; // Allow 0 XP for streak update
    console.log(`Attempting to award ${xpToAdd} XP and update streak for user: ${userId}`);
    let levelUpDetails = null;
    try {
      if (xpToAdd > 0) { // Only call award-xp if there's XP to award
        const xpResponse = await fetch('/api/user/award-xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xpAmount: xpToAdd, activityType: 'random_practice_completion' }),
        });
        
        if (xpResponse.ok) {
          const xpData = await xpResponse.json();
          toast.success(`+${xpData.awarded || xpToAdd} XP earned!`);
          if(xpData.leveledUp) {
              levelUpDetails = { newLevel: xpData.level, previousLevel: xpData.previousLevel };
          }
        } else {
          const errorData = await xpResponse.json().catch(() => ({error: "Failed to award XP"}));
          toast.warn(`Could not award XP: ${errorData.error || xpResponse.statusText}`);
        }
      }

      // Always attempt to update streak
      const streakResponse = await fetch('/api/user/update-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType: 'random_practice_completion' }),
      });

      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        console.log("Streak updated:", streakData);
      } else {
         const errorData = await streakResponse.json().catch(() => ({error: "Failed to update streak"}));
        toast.warn(`Could not update streak: ${errorData.error || streakResponse.statusText}`);
      }
    } catch (error) {
      console.error("Error awarding XP/Streak", error);
      toast.error("An error occurred while updating your progress.");
    }
    return levelUpDetails;
  }, [userId, sessionFinalized]);


  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string | Record<string,string>, isCorrect: boolean, points: number) => {
    if (!currentPracticeSessionId) { toast.error("Error saving: No active session."); return; }
    try {
      const response = await fetch('/api/student-answers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId: currentPracticeSessionId, questionId: question.id, submittedAnswer: userAnswer, isCorrect, pointsEarned: points, attemptedAt: new Date().toISOString(), }),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || "Failed to save answer"); }
    } catch (err:any) { toast.error(`Answer save failed: ${err.message}`); }
  }, [currentPracticeSessionId]);
  
  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!currentPracticeSessionId || !userId || sessionFinalized) return;
    setLoading('submitting');
    try {
      const calculatedScore = score; 
      const correctCount = questionResults.filter(r => r.correct).length;

      const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            status: 'COMPLETED', 
            endTime: new Date().toISOString(), 
            score: calculatedScore, 
            correctAnswers: correctCount, 
            xpEarned: calculatedScore 
        }),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to finalize session'); }
      
      setSessionFinalized(true); 
      
      const levelUpInfo = await awardXPAndStreak(calculatedScore); 
      if (levelUpInfo) {
        setNewLevel(levelUpInfo.newLevel);
        setShowLevelUp(true);
      }
      
      if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local');
      toast.success("Practice session completed and results saved!");
    } catch (err: any) { 
        toast.error(`Session finalization error: ${err.message}`); 
        console.error("Session finalization error:", err);
    } finally {
        setLoading(false);
    }
  }, [currentPracticeSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized, setNewLevel, setShowLevelUp]);

  const handleSubmitAnswer = useCallback((userAns: string | Record<string,string>, isCorr: boolean) => {
    if (!currentQuestion) return;
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAns }));
    setIsAnswerCorrect(isCorr);
    
    const points = isCorr ? (currentQuestion.pointsAwarded || 10) : 0; // Default 10 points
    
    // Update questionResults - ensure it's a new object for reactivity
    setQuestionResults(prevResults => {
        const newResult = { 
            id: currentQuestion.id, 
            correct: isCorr, 
            question: currentQuestion.text || '', 
            userAnswer: userAns, 
            correctAnswer: currentQuestion.correctAnswer 
        };
        // Avoid duplicate results for the same question if user somehow re-submits (though UI should prevent)
        const existingResultIndex = prevResults.findIndex(r => r.id === currentQuestion.id);
        if (existingResultIndex > -1) {
            const updatedResults = [...prevResults];
            updatedResults[existingResultIndex] = newResult;
            return updatedResults;
        }
        return [...prevResults, newResult];
    });

    if (isCorr) {
        // Only add points if it's a new correct answer for this question
        const alreadyCountedCorrect = questionResults.find(qr => qr.id === currentQuestion.id && qr.correct);
        if (!alreadyCountedCorrect) {
            setScore(prevScore => prevScore + points);
        }
    }
    saveStudentAnswerToDb(currentQuestion, userAns, isCorr, points);
  }, [currentQuestion, saveStudentAnswerToDb, questionResults]);


const handleAnswerMCQ = useCallback((optionId: string, optionText: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(optionId); // Mark as answered for UI disabling
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    
    const correctOption = currentQuestion.options.find(opt => opt.id.toLowerCase() === correctAnswerId);
    const correctAnswerDisplayText = correctOption ? correctOption.text : `ID: ${currentQuestion.correctAnswer}`;
    
    setAiMessage(isCorrect ? "Great job!" : `Incorrect. Correct: "${correctAnswerDisplayText}".`);
    setChatHistory(prev => [{ role: "assistant", content: isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctAnswerDisplayText}".` }]);
    
    handleSubmitAnswer(optionId, isCorrect);
}, [currentQuestion, selectedAnswer, handleSubmitAnswer]);
  
const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null) return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer); // Mark as answered for UI disabling

    const cAns = currentQuestion.correctAnswer;
    const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
    const isCorrect = cAnsArr.includes(userAnswer.toLowerCase());
    
    const feedback = isCorrect ? "Great job!" : `Incorrect. Correct: "${cAnsArr.join(' or ')}".`;
    setAiMessage(feedback);
    setChatHistory(prev => [{ role: "assistant", content: feedback }]);

    handleSubmitAnswer(userAnswer, isCorrect);
}, [textAnswer, currentQuestion, selectedAnswer, handleSubmitAnswer]);

const handleMultiPartSubmit = useCallback(() => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer) || selectedAnswer !== null) return;
    
    const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
    let allPartsCorrect = true;
    const currentPartResults: Record<string, boolean> = {};

    for (const part in correctAnswersMap) {
      const userAnswerPart = (multiPartAnswers[part] || '').trim().toLowerCase();
      const correctAnswerTextPart = String(correctAnswersMap[part]).trim().toLowerCase();
      const isPartCorrect = userAnswerPart === correctAnswerTextPart;
      currentPartResults[part] = isPartCorrect;
      if (!isPartCorrect) allPartsCorrect = false;
    }
    setMultiPartResults(currentPartResults); // For UI feedback on individual parts
    setSelectedAnswer(JSON.stringify(multiPartAnswers)); // Mark as answered for UI disabling
    
    const feedback = allPartsCorrect ? "All parts correct!" : "Some parts incorrect.";
    setAiMessage(feedback);
    setChatHistory(prev => [{ role: "assistant", content: feedback }]);

    handleSubmitAnswer(multiPartAnswers, allPartsCorrect);
}, [currentQuestion, selectedAnswer, multiPartAnswers, handleSubmitAnswer]);


  const handleNextQuestion = useCallback(async () => { 
    setShowHint(false); 
    setAiMessage(null); // Clear AI message for the next question
    // Chat history can persist if user wants to refer back, or clear it:
    // setChatHistory([]); 

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setShowSummary(true);
      await finalizePracticeSessionInDb(); 
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const completeSessionAndStartNew = useCallback(async () => {
    if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local');
    setShowSummary(false);
    setShowLevelUp(false); // Reset level up notification state
    await fetchRandomQuestionsAndStartSession();
  }, [userId, fetchRandomQuestionsAndStartSession]);

  const clearProgressAndExit = useCallback(async () => {
    const confirmExit = typeof window !== 'undefined' && window.confirm("Are you sure you want to exit? All progress for this session will be lost.");
    if (confirmExit) {
      if (userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`, 'local');
      if (currentPracticeSessionId) {
        try {
          const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, { method: 'DELETE' });
          if (!response.ok) { const errData = await response.json(); toast.error(`Could not discard session: ${errData.error || 'Server error'}`); }
          else { toast.info("Practice session discarded."); }
        } catch (err: any) { toast.error(`Error discarding session: ${err.message}`); }
      }
      router.push('/student/practice'); 
    }
  }, [currentPracticeSessionId, userId, router]);
  
  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || !currentQuestion) return;
    const currentUserMessage = userMessage.trim(); setUserMessage(''); setIsLoadingAI(true);
    const currentChatHistory = [...chatHistory, { role: "user", content: currentUserMessage }];
    setChatHistory(currentChatHistory); 
    if (aiContentRef.current) setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
    try {
      const optionsText = currentQuestion.options?.map((o, i) => `${String.fromCharCode(65+i)}. ${o.text}`).join('\n') || 'N/A';
      let cAnsDisp = 'Not available';
      if(currentQuestion.correctAnswer){
        if(typeof currentQuestion.correctAnswer === 'string' && currentQuestion.questionType === PrismaQuestionType.MULTIPLE_CHOICE) {
            const correctAnswerStr = currentQuestion.correctAnswer as string;
            const opt = currentQuestion.options.find(o => o.id.toLowerCase() === correctAnswerStr.toLowerCase());
            cAnsDisp = opt ? opt.text : String(currentQuestion.correctAnswer);
        } else { cAnsDisp = JSON.stringify(currentQuestion.correctAnswer); }
      }
      const context = `Q: ${currentQuestion.text}\nOpts: ${optionsText}\nAns: ${cAnsDisp}\nHint: ${currentQuestion.hint || 'None'}`;
      const response = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{role: "system", content: `Tutor for Primary School. Context: ${context}. Guide, don't just give answers unless asked repeatedly. Keep concise and encouraging.`}, ...currentChatHistory] }),
      });
      if (!response.ok) throw new Error('AI tutor request failed');
      const data = await response.json(); 
      setChatHistory(prev => [...prev, { role: "assistant", content: data.message }]);
      if (aiContentRef.current) setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
    } catch (error) { console.error('AI tutor error:', error); setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble." }]);
    } finally { setIsLoadingAI(false); }
  }, [userMessage, currentQuestion, chatHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }};
  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); isDragging.current = true; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); };
  const handleMouseMove = (e: MouseEvent) => { if (!isDragging.current || !containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(); const newPos = Math.max(30, Math.min(70, ((e.clientX - rect.left) / rect.width) * 100)); setSplitPosition(newPos); };
  const handleMouseUp = () => { isDragging.current = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  const isMultiPartComplete = () => { if (!currentQuestion || currentQuestion.questionType !== PrismaQuestionType.MULTI_PART || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return false; const parts = Object.keys(currentQuestion.correctAnswer); return parts.length > 0 && parts.every(p => multiPartAnswers[p]?.trim()); };
  
  const renderQuestionContent = () => {
    if (!currentQuestion) return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as keyof typeof PrismaQuestionType | "UNKNOWN";

    switch(questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3"> {/* Reduced space for tighter look */}
            {(currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const isThisSelected = selectedAnswer === optionId;
                const isThisCorrectDB = String(currentQuestion.correctAnswer || '').toLowerCase() === optionId.toLowerCase();
                
                let buttonClass = "bg-white hover:bg-gray-50 border border-gray-300";
                if (selectedAnswer !== null) { 
                  if (isThisSelected) { 
                    buttonClass = isAnswerCorrect ? "bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500" : "bg-red-100 border-red-500 text-red-800 ring-2 ring-red-500";
                  } else if (isThisCorrectDB) { 
                    buttonClass = "bg-green-100 border-green-500 text-green-800"; // Show correct if user picked wrong
                  }
                }
                return (
                  <button key={option.id || index} onClick={() => handleAnswerMCQ(optionId, optionText)} disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-md transition-all duration-150 text-md ${buttonClass}`}> {/* Reduced padding */}
                    <span className="font-bold mr-2">{optionLetter}.</span> {optionText}
                  </button>
                );
              })
            ) : ( <div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center"><p>No options available for this MCQ.</p></div> )}
          </div>
        );
      case PrismaQuestionType.FILL_IN_THE_BLANK: 
      case PrismaQuestionType.OPEN_ENDED:
        return (
          <div className="mt-6"> {/* Reduced margin */}
            <div className="mb-3"> {/* Reduced margin */}
              <label htmlFor="text-answer" className="block text-gray-700 text-sm font-medium mb-1">Your Answer:</label>
              <div className="flex">
                <input id="text-answer" type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && textAnswer.trim() && selectedAnswer === null) { e.preventDefault(); handleTextAnswerSubmit(); }}}
                  placeholder="Type your answer..." disabled={selectedAnswer !== null}
                  className={`w-full p-3 text-md rounded-l-md border ${ selectedAnswer === null ? "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" : isAnswerCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`} /> {/* Reduced padding */}
                <button onClick={handleTextAnswerSubmit} disabled={selectedAnswer !== null || !textAnswer.trim()}
                  className={`px-5 rounded-r-md ${ selectedAnswer === null && textAnswer.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit</button>
              </div>
            </div>
            {selectedAnswer !== null && (
                <div className={`mt-3 p-3 rounded-md text-sm ${ isAnswerCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                    <p className="font-medium">{isAnswerCorrect ? "Correct!" : `Incorrect. Correct answer(s): "${ Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.join(' or ') : currentQuestion.correctAnswer }".`}</p>
                    {!isAnswerCorrect && currentQuestion.explanation && <p className="mt-1">Explanation: {currentQuestion.explanation}</p>}
                </div>
            )}
          </div>
        );
      case PrismaQuestionType.MULTI_PART:
        if (typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) {
            return <p className="text-red-500">Error: Correct answer format for multi-part question is invalid.</p>;
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-6 space-y-4"> {/* Reduced margin */}
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-md"><p className="text-amber-800 font-medium text-sm">Multi-part question. Enter answers for each part:</p></div>
            {parts.map((part) => (
              <div key={part} className="mb-4"> {/* Reduced margin */}
                <label htmlFor={`multipart-${part}`} className="block text-sm font-medium text-gray-700 mb-1">Part {part.toUpperCase()}:</label>
                <div className="flex"><input type="text" id={`multipart-${part}`} value={multiPartAnswers[part] || ''} 
                    onChange={(e) => setMultiPartAnswers({...multiPartAnswers, [part]: e.target.value})}
                    placeholder={`Answer for part ${part.toUpperCase()}`} disabled={selectedAnswer !== null}
                    className={`w-full p-3 text-md rounded-md border ${ selectedAnswer !== null && multiPartResults[part] !== undefined ? (multiPartResults[part] ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"}`} /> {/* Reduced padding */}
                </div>
                {selectedAnswer !== null && multiPartResults[part] !== undefined && !multiPartResults[part] && (<p className="text-xs text-red-600 mt-1">Correct: "{(currentQuestion.correctAnswer as Record<string,string>)[part]}"</p>)}
              </div>
            ))}
            <Button onClick={handleMultiPartSubmit} disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`w-full py-3 ${ selectedAnswer === null && isMultiPartComplete() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit All Parts</Button>
            {selectedAnswer !== null && (
                 <div className={`mt-3 p-3 rounded-md text-sm ${ isAnswerCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    <p className="font-medium">{aiMessage || (isAnswerCorrect ? "All parts correct!" : "Some parts incorrect.")}</p>
                    {!isAnswerCorrect && currentQuestion.explanation && <p className="mt-1">Explanation: {currentQuestion.explanation}</p>}
                </div>
            )}
          </div>
        );
      default: return (<div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center"><p>Unsupported question type: {currentQuestion.questionType || 'Not specified'}</p></div>);
    }
  };
  
  
  if (typeof loading === 'string' || (loading === true && !currentQuestion && !error)) { // More specific loading check
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-indigo-100">
            <FaSpinner className="animate-spin text-indigo-600 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Preparing Your Practice Session</h2>
          <p className="text-gray-600 mb-4">Loading questions and personalizing your experience...</p>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-2 animate-pulse" style={{width: '75%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
            <FaExclamationTriangle className="text-red-600 text-3xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full"
              onClick={fetchRandomQuestionsAndStartSession}
            >
              <FaRedo className="mr-2" /> Try Again
            </Button>
            <Button 
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
              onClick={() => router.push('/student/practice')}
            >
              <FaArrowLeft className="mr-2" /> Back to Subjects
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (showSummary) {
    const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);
    const percentageCorrect = totalPossibleScore > 0 ? Math.round((score / totalPossibleScore) * 100) : 0; 
    const correctCount = questionResults.filter(r => r.correct).length;
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
                <FaTrophy className="text-5xl mx-auto mb-4 opacity-80" />
                <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
                <p className="text-indigo-200">Great effort! Here's how you did:</p>
            </div>

            <div className="p-6 md:p-8">
                <div className="text-center mb-8">
                    <p className="text-6xl font-bold text-indigo-600">{percentageCorrect}%</p>
                    <p className="text-gray-600 mt-1">Your Score: {score} / {totalPossibleScore}</p>
                    <p className="text-amber-500 font-semibold mt-1">XP Earned: +{score}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 uppercase">Total Questions</p>
                        <p className="text-2xl font-semibold text-gray-700">{questions.length}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 uppercase">Correct Answers</p>
                        <p className="text-2xl font-semibold text-green-600">{correctCount} / {questions.length}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Review Your Answers:</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {questionResults.map((result, index) => (
                            <div key={result.id} className={`flex items-center justify-between p-3 rounded-md text-sm ${result.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <span>Q{index + 1}: {result.question.substring(0, 50)}...</span>
                                {result.correct ? <FaCheck /> : <FaTimes />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={clearProgressAndExit} variant="outline" className="flex-1">
                        <FaArrowLeft className="mr-2"/> Practice Menu
                    </Button>
                    <Button onClick={completeSessionAndStartNew} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                       <FaRocket className="mr-2"/> Start New Random Practice
                    </Button>
                </div>
            </div>
        </div>
      </div>
    );
  }
  
  if (!currentQuestion && !loading && !error && questions.length === 0) { 
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
                <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">No Questions Loaded</h2>
                <p className="text-gray-600 mb-6">We couldn't find any practice questions right now. Please try again or select a different topic.</p>
                <Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                   <FaArrowLeft className="mr-2" /> Return to Practice Menu
                </Button>
            </div>
        </div>
      );
  }
  
  if (!currentQuestion) { // Fallback if currentQuestion is null after loading and no error
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
                <FaSpinner className="animate-spin text-indigo-600 text-4xl mx-auto mb-6" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Loading Next Question...</h2>
                <p className="text-gray-600">Please wait a moment.</p>
            </div>
        </div>
     );
  }
  
  const progressPercentageDisplay = questions.length > 0 ? ((currentQuestionIndex ) / questions.length) * 100 : 0; // Only count answered questions

  return ( 
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button onClick={clearProgressAndExit} className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"> <FaArrowLeft className="mr-1.5"/> Exit</button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">{currentQuestion?.topic?.name || 'Random Practice'} • Q {currentQuestionIndex + 1} / {questions.length}</div>
        <div className="text-amber-600 font-semibold text-sm md:text-base">{score} XP</div>
      </div>
      <div className="w-full h-1.5 bg-gray-200"><div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progressPercentageDisplay}%` }} /></div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-auto bg-white custom-scrollbar" style={{ width: `${splitPosition}%` }}>
            <div className="p-4 md:p-8"> {/* Reduced padding */}
                <div className="mb-3 flex justify-between items-center">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      Topic: {currentQuestion?.topic?.name || "General"}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        currentQuestion?.difficulty === 'HARD' || currentQuestion?.difficulty === 'VERY_HARD' ? 'bg-red-100 text-red-700' : 
                        currentQuestion?.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {currentQuestion?.difficulty || 'MEDIUM'}
                    </span>
                </div>

                <h1 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 leading-snug">{currentQuestion?.text}</h1>
                {currentQuestion?.imageUrl && (
                <div className="mb-4 flex justify-center border border-gray-200 rounded-lg p-2 bg-gray-50 shadow-sm">
                    <img src={currentQuestion.imageUrl} alt="Question diagram" className="max-w-full h-auto max-h-80 rounded-md object-contain"/>
                </div>
                )}
                {renderQuestionContent()}
                
                {/* Feedback and Explanation Area */}
                {selectedAnswer !== null && (isAnswerCorrect === false || currentQuestion.explanation) && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${isAnswerCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        {isAnswerCorrect === false && (
                             <p className="font-medium text-red-800 mb-1">
                                Incorrect. Correct Answer: {
                                    Array.isArray(currentQuestion.correctAnswer) ? 
                                    currentQuestion.correctAnswer.join(' or ') : 
                                    (typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer !== null && !Array.isArray(currentQuestion.correctAnswer)) ?
                                    Object.entries(currentQuestion.correctAnswer).map(([k,v]) => `${k}: ${v}`).join(', ')
                                    : String(currentQuestion.correctAnswer)
                                }
                            </p>
                        )}
                        {currentQuestion.explanation && (
                            <div>
                                <p className="font-semibold text-gray-700 mt-2">Explanation:</p>
                                <p className="text-gray-600 whitespace-pre-wrap">{currentQuestion.explanation}</p>
                            </div>
                        )}
                    </div>
                )}


                <div className="mt-6 border-t border-gray-200 pt-5 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <Button 
                    onClick={() => setShowHint(true)} 
                    disabled={selectedAnswer !== null || showHint || !currentQuestion?.hint} 
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto text-sm py-2"
                >
                    <FaLightbulb className="mr-1.5"/> Get Hint
                </Button>
                <Button 
                    onClick={handleNextQuestion} 
                    disabled={selectedAnswer === null || (typeof loading === 'string' && loading === 'submitting')} 
                    className={`px-6 py-2.5 text-sm w-full sm:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all ${selectedAnswer !== null ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                >
                    {(typeof loading === 'string' && loading === 'submitting') ? <FaSpinner className="animate-spin mr-2"/> : null}
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : '🏁 Show Results'}
                </Button>
                </div>
                 {showHint && currentQuestion?.hint && (
                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 shadow text-sm">
                        <div className="flex items-start">
                            <FaLightbulb className="text-yellow-500 mt-0.5 mr-2 flex-shrink-0"/>
                            <div>
                                <p className="font-semibold mb-0.5 text-yellow-900">Hint:</p>
                                <p>{currentQuestion.hint}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150" onMouseDown={handleMouseDown}><div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div></div>
        
        <div className="bg-indigo-50 flex flex-col overflow-hidden custom-scrollbar" style={{ width: `${100 - splitPosition - 0.5}%` }}> {/* Adjusted width slightly */}
          <div className="p-3 border-b border-indigo-200 bg-indigo-100 flex items-center shadow-sm">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-2.5 text-md font-bold"><FaCommentDots/></div>
            <div className="flex-1"><div className="font-semibold text-indigo-800 text-sm">AI Learning Assistant</div><div className="text-xs text-indigo-600">Here to help with this question!</div></div>
            <div className="text-xs text-indigo-600 flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 border border-indigo-100 shadow-sm"></span>Online</div>
          </div>
          <div ref={aiContentRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-indigo-25 custom-scrollbar"> {/* Custom scrollbar if defined */}
            {chatHistory.length > 0 ? ( chatHistory.map((message, index) => (<div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm ${message.role === 'user' ? 'ml-auto bg-indigo-500 text-white rounded-br-none' : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}><p className="whitespace-pre-wrap">{message.content}</p></div></div>)) )
            : aiMessage ? (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><p className="whitespace-pre-wrap">{aiMessage}</p></div></div>)
            : (<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6"><div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-3xl text-indigo-500"><FaLightbulb/></div><p className="text-sm">Ask me anything about this question, or I'll give feedback after you answer.</p></div>)}
            {isLoadingAI && (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><div className="flex space-x-1 items-center"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>)}
          </div>
          <div className="p-2.5 border-t border-indigo-200 bg-indigo-100">
            <div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white shadow-sm">
              <input type="text" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about this question..." className="flex-1 py-2 px-3.5 text-sm border-none outline-none bg-transparent rounded-l-full" disabled={isLoadingAI || selectedAnswer !== null} />
              <button onClick={handleSendMessage} disabled={isLoadingAI || !userMessage.trim() || selectedAnswer !== null} className={`w-8 h-8 m-0.5 rounded-full flex items-center justify-center transition-colors ${userMessage.trim() && !isLoadingAI && selectedAnswer === null ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}>
                <FaPaperPlane className="h-3.5 w-3.5"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}