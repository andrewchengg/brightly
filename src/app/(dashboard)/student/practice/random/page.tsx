// src/app/(dashboard)/student/practice/random/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { PracticeSessionStatus, PracticeSessionType, QuestionType as PrismaQuestionType } from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage'; 
import { useSupabaseUser } from "@/lib/hooks/auth"; 
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
  topic: {
    id: number; 
    name: string;
    subjectId?: number; // Make sure API provides this if needed by createNewPracticeSession
  };
  difficulty?: string; 
  pointsAwarded?: number;
  questionType?: keyof typeof PrismaQuestionType; 
  imageUrl?: string;
  topicName?: string; // Kept for potential backward compatibility
}

interface LocalStoragePracticeProgress {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  score: number;
  answeredQuestions: Record<number, string>; 
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
  const [loading, setLoading] = useState(true); 
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65); 
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string>>({});
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false); 
  const [questionResults, setQuestionResults] = useState<LocalStoragePracticeProgress['questionResults']>([]);
  const [textAnswer, setTextAnswer] = useState(''); 
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({});
  const [multiPartResults, setMultiPartResults] = useState<Record<string, boolean>>({});
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser(); // Use the hook
  const [userId, setUserId] = useState<string | null>(null); // This will be derived from authUser

  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null); 
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);   

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) {
        console.log("RandomPractice: Auth user loaded, setting userId:", authUser.id);
        setUserId(authUser.id);
        if (safeStorage.getItem('userId') !== authUser.id) { // Sync localStorage if needed
            safeStorage.setItem('userId', authUser.id, 'local');
        }
      } else {
        console.warn('RandomPractice: No authenticated user found after loading. Redirecting to sign-in.');
        toast.error("User session not found. Please sign in.");
        router.push('/sign-in'); 
      }
    }
  }, [authUser, authUserIsLoaded, router]);

  const createNewPracticeSession = useCallback(async (fetchedQuestions: QuestionClient[]) => {
    if (!userId) {
      console.error("createNewPracticeSession: Called without userId.");
      setError("User information is missing. Cannot start session.");
      return null;
    }
    if (fetchedQuestions.length === 0) {
      setError("No questions available to start a session.");
      return null;
    }
    
    const firstQuestion = fetchedQuestions[0];
    const subjectIdForSession = firstQuestion?.topic?.subjectId; // Ensure your API provides subjectId within topic object
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
      console.log("New practice session created:", sessionData.id);
      return sessionData.id;
    } catch (err: any) {
      console.error("Error creating new practice session:", err);
      setError(`Could not start a new practice session: ${err.message}`);
      return null;
    }
  }, [userId]);

  const fetchRandomQuestionsAndStartSession = useCallback(async () => {
    if (!userId) {
      console.warn("fetchRandomQuestionsAndStartSession: Aborted because userId is not yet available.");
      // setLoading(false); // No longer needed here as the calling useEffect handles it
      return;
    }
    console.log("fetchRandomQuestionsAndStartSession: Called with userId:", userId);
    
    safeStorage.removeItem(`randomPracticeProgress_${userId}`); // Clear old local storage first
    console.log("Cleared old local storage for user:", userId);

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
        console.log("fetchRandomQuestionsAndStartSession: New session started and questions set. Session ID:", newSessionId);
      } else {
        setError("Fetched questions but failed to start a new practice session in the database.");
        setQuestions([]); 
      }
    } catch (error: any) {
      console.error("Error fetching random questions or starting session:", error);
      setError(error.message || "Failed to load questions. Please try again.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, createNewPracticeSession]);

  useEffect(() => {
    if (!userId) {
      setLoading(true); // Keep loading if no userId yet
      return; 
    }
    
    setLoading(true); // Start loading when userId is available
    const savedProgressString = safeStorage.getItem(`randomPracticeProgress_${userId}`);
    let resumableSessionFound = false;
    if (savedProgressString) {
        try {
            const progress: LocalStoragePracticeProgress = JSON.parse(savedProgressString);
            if (progress.questions?.length > 0 && !progress.sessionFinalized && progress.practiceSessionId) {
                console.log("Resuming session from localStorage:", progress.practiceSessionId);
                setQuestions(progress.questions); setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
                setScore(progress.score || 0); setAnsweredQuestions(progress.answeredQuestions || {});
                setQuestionResults(progress.questionResults || []); setCurrentPracticeSessionId(progress.practiceSessionId);
                setCurrentSubjectId(progress.subjectId || null); setCurrentTopicId(progress.topicId || null);
                setSessionFinalized(false); 
                if (progress.currentQuestionIndex >= progress.questions.length) { setShowSummary(true); setSessionFinalized(true); }
                resumableSessionFound = true;
            }
        } catch (error) { safeStorage.removeItem(`randomPracticeProgress_${userId}`); }
    }

    if (!resumableSessionFound) {
        console.log("No resumable session, fetching new questions for user:", userId);
        fetchRandomQuestionsAndStartSession(); 
    } else {
        setLoading(false); // Resumed session, stop loading
    }
  }, [userId, fetchRandomQuestionsAndStartSession]); // fetchRandomQuestionsAndStartSession is a dependency

  useEffect(() => { 
    if (!userId || loading || questions.length === 0 || !currentPracticeSessionId || showSummary) return; 
    const progress: LocalStoragePracticeProgress = {
      questions, currentQuestionIndex, score, answeredQuestions, questionResults,
      sessionFinalized, practiceSessionId: currentPracticeSessionId,
      subjectId: currentSubjectId, topicId: currentTopicId,
    };
    safeStorage.setItem(`randomPracticeProgress_${userId}`, JSON.stringify(progress));
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading, userId, currentPracticeSessionId, showSummary, currentSubjectId, currentTopicId]);

  useEffect(() => { 
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedAnswerString = answeredQuestions[currentQuestionId];
      
      setSelectedAnswer(null); setIsAnswerCorrect(null); setTextAnswer('');
      setMultiPartAnswers({}); setMultiPartResults({}); 
      
      if (savedAnswerString) {
        setSelectedAnswer(savedAnswerString);
        const questionType = currentQuestion.questionType as PrismaQuestionType | undefined; // Cast for switch
        if (questionType === PrismaQuestionType.OPEN_ENDED || questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
          setTextAnswer(savedAnswerString);
          const cAns = currentQuestion.correctAnswer;
          const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
          const isCorr = cAnsArr.includes(savedAnswerString.trim().toLowerCase());
          setIsAnswerCorrect(isCorr);
          if (!aiMessage) setAiMessage(isCorr ? "Great job!" : `Correct: ${cAnsArr.join(' or ')}`);
        } else if (questionType === PrismaQuestionType.MULTI_PART && typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer && !Array.isArray(currentQuestion.correctAnswer)) {
          try {
            const userAnswers = JSON.parse(savedAnswerString);
            setMultiPartAnswers(userAnswers);
            const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
            let allCorrect = true; const results: Record<string, boolean> = {};
            for (const part in correctAnswersMap) {
              const isPartCorrect = (userAnswers[part] || '').trim().toLowerCase() === String(correctAnswersMap[part]).trim().toLowerCase();
              results[part] = isPartCorrect; if (!isPartCorrect) allCorrect = false;
            }
            setMultiPartResults(results); setIsAnswerCorrect(allCorrect);
            if (!aiMessage) setAiMessage(allCorrect ? "All parts correct!" : "Some parts incorrect.");
          } catch(e) { console.error("Error parsing multi-part saved answer", e)}
        } else { // MCQ
          const isCorr = String(currentQuestion.correctAnswer ?? '').toLowerCase() === savedAnswerString.toLowerCase();
          setIsAnswerCorrect(isCorr);
          const cOpt = currentQuestion.options.find(o => o.id.toLowerCase() === String(currentQuestion.correctAnswer ?? '').toLowerCase());
          if (!aiMessage) setAiMessage(isCorr ? "Great job!" : `Correct: ${cOpt?.text || currentQuestion.correctAnswer}`);
        }
      } else {
         setAiMessage(null);
      }
      setShowHint(false); 
      setChatHistory([]);
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion, aiMessage]);

  const awardXPAndStreak = useCallback(async () => {
    if (!userId || sessionFinalized) return;
    console.log("Attempting to award XP and update streak for user:", userId);
    try {
      const xpResponse = await fetch('/api/user/award-xp', { /* ... */ });
      const streakResponse = await fetch('/api/user/update-streak', { /* ... */ });
      // ... (handle responses as before)
    } catch (error) { /* ... */ }
  }, [userId, score, sessionFinalized]);

  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string | Record<string,string>, isCorrect: boolean, points: number) => {
    if (!currentPracticeSessionId) { toast.error("Error saving: No active session."); return; }
    try {
      const response = await fetch('/api/student-answers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId: currentPracticeSessionId, questionId: question.id, submittedAnswer: userAnswer, isCorrect, pointsEarned: points, attemptedAt: new Date().toISOString(), }),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || "Failed to save answer"); }
      console.log("Answer saved for q:", question.id);
    } catch (err:any) { toast.error(`Answer save failed: ${err.message}`); }
  }, [currentPracticeSessionId]);
  
  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!currentPracticeSessionId || !userId || sessionFinalized) return;
    console.log("Finalizing practice session in DB:", currentPracticeSessionId);
    try {
      const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', endTime: new Date().toISOString(), score: score, correctAnswers: questionResults.filter(r => r.correct).length, xpEarned: score }),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to finalize session'); }
      setSessionFinalized(true); 
      await awardXPAndStreak(); 
      if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
    } catch (err: any) { toast.error(`Session finalization error: ${err.message}`); }
  }, [currentPracticeSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized]);

  const handleAnswerMCQ = useCallback((optionId: string, optionText: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(optionId);
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    setIsAnswerCorrect(isCorrect); setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    const correctOption = currentQuestion.options.find(opt => opt.id.toLowerCase() === correctAnswerId);
    const correctAnswerDisplayText = correctOption ? correctOption.text : `ID: ${currentQuestion.correctAnswer}`;
    setAiMessage(isCorrect ? "Great job!" : `Incorrect. Correct: "${correctAnswerDisplayText}".`);
    setChatHistory(prev => [{ role: "assistant", content: isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctAnswerDisplayText}".` }]);
    const points = isCorrect ? (currentQuestion.pointsAwarded || 10) : 0;
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: isCorrect, question: currentQuestion.text || '', userAnswer: optionText, correctAnswer: correctAnswerDisplayText }]);
    if (isCorrect) setScore(prevScore => prevScore + points);
    saveStudentAnswerToDb(currentQuestion, optionId, isCorrect, points);
  }, [currentQuestion, selectedAnswer, saveStudentAnswerToDb]);
  
  const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null) return;
    const userAnswer = textAnswer.trim(); setSelectedAnswer(userAnswer);
    const cAns = currentQuestion.correctAnswer;
    const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
    const isCorrect = cAnsArr.includes(userAnswer.toLowerCase());
    setIsAnswerCorrect(isCorrect); setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswer }));
    const feedback = isCorrect ? "Great job!" : `Incorrect. Correct: "${cAnsArr.join(' or ')}".`;
    setAiMessage(feedback); setChatHistory(prev => [{ role: "assistant", content: feedback }]);
    const points = isCorrect ? (currentQuestion.pointsAwarded || 10) : 0;
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: isCorrect, question: currentQuestion.text || '', userAnswer: userAnswer, correctAnswer: cAnsArr.join(' or ') }]);
    if (isCorrect) setScore(prevScore => prevScore + points);
    saveStudentAnswerToDb(currentQuestion, userAnswer, isCorrect, points);
  }, [textAnswer, currentQuestion, selectedAnswer, saveStudentAnswerToDb]);

  const handleMultiPartSubmit = useCallback(() => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return;
    const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
    const results: Record<string, boolean> = {}; let allPartsCorrect = true; let correctPartsCount = 0;
    const totalParts = Object.keys(correctAnswersMap).length;
    for (const part in correctAnswersMap) {
      const userAnswerPart = (multiPartAnswers[part] || '').trim().toLowerCase();
      const correctAnswerTextPart = String(correctAnswersMap[part]).trim().toLowerCase();
      const isPartCorrect = userAnswerPart === correctAnswerTextPart;
      results[part] = isPartCorrect; if (isPartCorrect) correctPartsCount++; if (!isPartCorrect) allPartsCorrect = false;
    }
    setMultiPartResults(results); setIsAnswerCorrect(allPartsCorrect);
    const pointsAwardedForQuestion = currentQuestion.pointsAwarded || 10; let pointsEarnedThisQuestion = 0;
    if (allPartsCorrect && totalParts > 0) { pointsEarnedThisQuestion = pointsAwardedForQuestion;
    } else if (correctPartsCount > 0 && totalParts > 0) { pointsEarnedThisQuestion = Math.round((pointsAwardedForQuestion * correctPartsCount) / totalParts); }
    setScore(prevScore => prevScore + pointsEarnedThisQuestion);
    const userAnswerString = JSON.stringify(multiPartAnswers);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswerString })); setSelectedAnswer(userAnswerString);
    const feedback = allPartsCorrect ? "All parts correct!" : "Some parts incorrect.";
    setAiMessage(feedback); setChatHistory(prev => [{ role: "assistant", content: feedback }]);
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: allPartsCorrect, question: currentQuestion.text || '', userAnswer: multiPartAnswers, correctAnswer: correctAnswersMap }]);
    saveStudentAnswerToDb(currentQuestion, multiPartAnswers, allPartsCorrect, pointsEarnedThisQuestion);
  }, [currentQuestion, selectedAnswer, multiPartAnswers, saveStudentAnswerToDb]);

  const handleNextQuestion = useCallback(async () => { 
    setShowHint(false); 
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setAiMessage(null); setChatHistory([]); 
    } else {
      setShowSummary(true);
      await finalizePracticeSessionInDb(); 
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const completeSessionAndStartNew = useCallback(async () => {
    if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
    setShowSummary(false);
    await fetchRandomQuestionsAndStartSession();
  }, [userId, fetchRandomQuestionsAndStartSession]);

  const clearProgressAndExit = useCallback(async () => {
    const confirmExit = typeof window !== 'undefined' && window.confirm("Are you sure you want to exit? All progress for this session will be lost.");
    if (confirmExit) {
      if (userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
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
  const isMultiPartComplete = () => { if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return false; const parts = Object.keys(currentQuestion.correctAnswer); return parts.length > 0 && parts.every(p => multiPartAnswers[p]?.trim()); };
  
  const renderQuestionContent = () => {
    if (!currentQuestion) return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as keyof typeof PrismaQuestionType | "UNKNOWN";

    switch(questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-4 mb-20">
            {(currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) ? (
              currentQuestion.options.map((option, index: number) => {
                const optionId = option.id;
                const optionText = option.text;
                const optionLetter = String.fromCharCode(65 + index);
                const isSelected = selectedAnswer === optionId;
                const isThisCorrectOption = String(currentQuestion.correctAnswer || '').toLowerCase() === optionId.toLowerCase();
                let buttonClass = "bg-white hover:bg-gray-50 border border-gray-300";
                if (selectedAnswer !== null) { 
                  if (isSelected) { 
                    buttonClass = isAnswerCorrect ? "bg-green-50 border-2 border-green-500 text-green-800" : "bg-red-50 border-2 border-red-500 text-red-800";
                  } else if (isThisCorrectOption) { 
                    buttonClass = "bg-green-50 border-2 border-green-500 text-green-800";
                  }
                }
                return (
                  <button key={option.id || index} onClick={() => handleAnswerMCQ(optionId, optionText)} disabled={selectedAnswer !== null}
                    className={`w-full text-left p-5 rounded-md transition-all duration-200 text-lg ${buttonClass}`}>
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
          <div className="mt-8"><div className="mb-4">
            <label htmlFor="text-answer" className="block text-gray-700 text-sm font-medium mb-2">Your Answer:</label>
            <div className="flex">
              <input id="text-answer" type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && textAnswer.trim() && selectedAnswer === null) { e.preventDefault(); handleTextAnswerSubmit(); }}}
                placeholder="Type your answer..." disabled={selectedAnswer !== null}
                className={`w-full p-4 text-lg rounded-l-md border ${ selectedAnswer === null ? "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" : isAnswerCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`} />
              <button onClick={handleTextAnswerSubmit} disabled={selectedAnswer !== null || !textAnswer.trim()}
                className={`px-6 rounded-r-md ${ selectedAnswer === null && textAnswer.trim() ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit</button>
            </div>
            {selectedAnswer !== null && (<div className={`mt-4 p-4 rounded-md ${ isAnswerCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}><p className="font-medium">{isAnswerCorrect ? "Correct!" : `Incorrect. Correct answer(s): "${ Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.join(' or ') : currentQuestion.correctAnswer }".`}</p></div>)}
          </div></div>
        );
      case PrismaQuestionType.MULTI_PART:
        if (typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) {
            return <p className="text-red-500">Error: Correct answer format for multi-part question is invalid.</p>;
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-8"><div className="mb-6 p-4 bg-amber-50 border rounded-md"><p className="text-amber-800 font-medium">Multi-part question. Enter answers for each part:</p></div>
            {parts.map((part) => (
              <div key={part} className="mb-6">
                <div className="mb-2 font-medium text-gray-700">Part {part.toUpperCase()}:</div>
                <div className="flex"><input type="text" value={multiPartAnswers[part] || ''} onChange={(e) => setMultiPartAnswers({...multiPartAnswers, [part]: e.target.value})}
                    placeholder={`Answer for part ${part.toUpperCase()}`} disabled={selectedAnswer !== null}
                    className={`w-full p-4 text-lg rounded-l-md border ${ selectedAnswer !== null && multiPartResults[part] !== undefined ? multiPartResults[part] ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50" : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`} />
                </div>
                {selectedAnswer !== null && multiPartResults[part] !== undefined && !multiPartResults[part] && (<p className="text-xs text-red-600 mt-1">Correct: "{(currentQuestion.correctAnswer as Record<string,string>)[part]}"</p>)}
              </div>
            ))}
            <button onClick={handleMultiPartSubmit} disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`px-6 py-3 rounded-md ${ selectedAnswer === null && isMultiPartComplete() ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit All</button>
            {selectedAnswer !== null && aiMessage && (<div className={`mt-4 p-4 rounded-md ${ isAnswerCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}><p className="font-medium">{aiMessage}</p></div>)}
          </div>
        );
      default: return (<div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center"><p>Unsupported question type: {currentQuestion.questionType || 'Not specified'}</p></div>);
    }
  };
  
  // Rendering section - modernized design
  if (loading) {
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

  // Return the practice UI - keep all the logic but modernize the presentation
  if (showSummary) {
    const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);
    const percentageCorrect = totalPossibleScore > 0 ? Math.round((score / totalPossibleScore) * 100) : 0;
    const correctAnswers = questionResults.filter(r => r.correct).length;
    
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header with results title */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">Practice Session Results</h1>
          </div>
        </div>
        
        {/* Results overview */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Score circle */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={percentageCorrect >= 70 ? "#10b981" : percentageCorrect >= 40 ? "#f59e0b" : "#ef4444"} 
                    strokeWidth="8" 
                    strokeDasharray="282.7" 
                    strokeDashoffset={282.7 - (282.7 * percentageCorrect) / 100} 
                    strokeLinecap="round" 
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000 ease-out"
                  />
                  <text x="50" y="45" textAnchor="middle" className="font-bold text-3xl fill-gray-700">{percentageCorrect}%</text>
                  <text x="50" y="65" textAnchor="middle" className="text-sm fill-gray-500">Score</text>
                </svg>
              </div>
            </div>
            
            {/* Stats grid */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Session Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <FaChartBar className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Questions</p>
                      <p className="font-semibold text-lg">{questions.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <FaCheck className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Correct Answers</p>
                      <p className="font-semibold text-lg text-green-700">{correctAnswers} / {questions.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                      <FaTrophy className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Your Score</p>
                      <p className="font-semibold text-lg text-amber-600">{score} / {totalPossibleScore}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                      <FaMedal className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">XP Earned</p>
                      <p className="font-semibold text-lg text-purple-600">{score}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row mt-6 gap-3">
                <Button
                  onClick={clearProgressAndExit}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <FaArrowLeft className="mr-2" /> Return to Practice Menu
                </Button>
                
                <Button
                  onClick={completeSessionAndStartNew}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <FaRocket className="mr-2" /> Start New Practice
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Question review */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-800">Question Review</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {questionResults.map((result, index) => (
              <div key={index} className={`p-5 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start">
                  <div className={`mt-1 mr-4 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    result.correct ? 'bg-green-500' : 'bg-red-500'
                  } text-white font-bold`}>
                    {result.correct ? <FaCheck /> : <FaTimes />}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-2">Q{index + 1}: {result.question}</p>
                    
                    <div className="space-y-1 text-sm">
                      <p className={`${result.correct ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="font-medium">Your answer: </span>
                        {typeof result.userAnswer === 'object' ? 
                          JSON.stringify(result.userAnswer) : 
                          result.userAnswer
                        }
                      </p>
                      
                      {!result.correct && (
                        <p className="text-blue-700">
                          <span className="font-medium">Correct answer: </span>
                          {typeof result.correctAnswer === 'object' ? 
                            JSON.stringify(result.correctAnswer) : 
                            Array.isArray(result.correctAnswer) ? 
                              result.correctAnswer.join(' or ') : 
                              String(result.correctAnswer)
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom action bar */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            <p className="text-sm text-gray-500">Session completed</p>
            <Button
              onClick={completeSessionAndStartNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Practice Again <FaArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header with progress and score */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Button 
              variant="ghost" 
              className="text-gray-500 hover:text-gray-700 mr-2"
              onClick={() => router.push('/student/practice')}
            >
              <FaArrowLeft className="mr-2" /> Back
            </Button>
            <h1 className="text-xl font-bold text-gray-800">Random Practice Session</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Question</span>
              <div className="font-bold text-indigo-700">{currentQuestionIndex + 1} / {questions.length}</div>
            </div>
            
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Score</span>
              <div className="font-bold text-green-700">{score} pts</div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-2 rounded-full mt-4">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Keep the existing rendered content but wrapped in modern UI containers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={containerRef}>
        {/* Question section - Left column (larger) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Question content */}
          {currentQuestion && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded mr-2">
                      {currentQuestion.topic?.name || "Topic"}
                    </span>
                    {currentQuestion.difficulty && (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        currentQuestion.difficulty === 'HARD' ? 'bg-red-100 text-red-700' : 
                        currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                    )}
                  </div>
                  {currentQuestion.pointsAwarded && (
                    <span className="text-sm font-semibold text-green-600">
                      {currentQuestion.pointsAwarded} points
                    </span>
                  )}
                </div>
                
                <div className="text-lg font-medium text-gray-800 mb-6">
                  {currentQuestion.text}
                </div>
                
                {currentQuestion.imageUrl && (
                  <div className="mb-4">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question image" 
                      className="max-w-full h-auto rounded-lg border border-gray-200" 
                    />
                  </div>
                )}
              </div>
              
              {/* Show hint button */}
              {!showHint && currentQuestion.hint && (
                <Button
                  variant="outline"
                  className="mb-4 border-amber-300 text-amber-600 hover:bg-amber-50"
                  onClick={() => setShowHint(true)}
                >
                  <FaLightbulb className="mr-2 text-amber-500" /> Show Hint
                </Button>
              )}
              
              {/* Hint display */}
              {showHint && currentQuestion.hint && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg">
                  <div className="flex items-start">
                    <FaLightbulb className="text-amber-500 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-amber-800">{currentQuestion.hint}</p>
                  </div>
                </div>
              )}
              
              {renderQuestionContent()}
            </div>
          )}
        </div>
        
        {/* AI Assistant panel - Right column (smaller) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-indigo-600 text-white p-4">
            <div className="flex items-center">
              <FaCommentDots className="mr-2" />
              <h3 className="font-medium">AI Learning Assistant</h3>
            </div>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto" ref={aiContentRef}>
            {/* Chat history display */}
            <div className="space-y-4">
              {/* Default welcome message */}
              {!chatHistory.length && (
                <div className="bg-indigo-50 p-3 rounded-lg text-gray-700 text-sm">
                  I'm your AI learning assistant. Ask me questions about this topic if you need help!
                </div>
              )}
              
              {/* Render chat messages */}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-100 text-indigo-900 ml-auto max-w-[80%]' 
                    : 'bg-gray-100 text-gray-800 max-w-[80%]'
                }`}>
                  {msg.content}
                </div>
              ))}
              
              {/* Loading indicator for AI response */}
              {isLoadingAI && (
                <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Message input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex">
              <input
                type="text"
                placeholder="Ask a question..."
                className="flex-grow border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button 
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-700 flex items-center justify-center"
                onClick={handleSendMessage}
                disabled={isLoadingAI || !userMessage.trim()}
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Answer feedback section */}
      {isAnswerCorrect !== null && (
        <div className={`mt-6 p-4 rounded-xl ${
          isAnswerCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center mb-2">
            {isAnswerCorrect ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <FaCheck className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-800">Correct Answer!</h3>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <FaTimes className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-800">Incorrect Answer</h3>
              </>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={async () => {
                if (currentQuestionIndex < questions.length - 1) {
                  handleNextQuestion();
                } else {
                  // Force summary view to appear when it's the last question
                  setShowSummary(true);
                  await finalizePracticeSessionInDb();
                  console.log("Showing summary view");
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow-sm"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}