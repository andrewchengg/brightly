// src/app/(dashboard)/student/practice/random/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { PracticeSessionStatus, PracticeSessionType, QuestionType as PrismaQuestionType } from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage'; 
import { useSupabaseUser } from "@/lib/hooks/auth"; // Good to have access to the authenticated user object if needed


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
  const [userId, setUserId] = useState<string | null>(null);
  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null); 
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);   

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

    const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser(); // Use the hook

    useEffect(() => {
      // This effect now primarily syncs the userId from the auth hook
      // or localStorage if the hook isn't fully loaded yet.
      if (authUserIsLoaded) {
        if (authUser) {
          console.log("RandomPractice: Auth user loaded, setting userId:", authUser.id);
          setUserId(authUser.id);
          // Ensure localStorage is also set if somehow missed by the hook's effect
          if (safeStorage.getItem('userId') !== authUser.id) {
              safeStorage.setItem('userId', authUser.id, 'local');
          }
        } else {
          // Auth user is null after loading, means not logged in.
          const storedId = safeStorage.getItem('userId');
          if (storedId) { // Attempt to use localStorage if authUser is null but ID was there
              console.warn("RandomPractice: Auth user is null, but found userId in localStorage. Using stored ID:", storedId);
              setUserId(storedId);
          } else {
              console.warn('RandomPractice: User ID not found from auth hook or storage. Redirecting to sign-in.');
              toast.error("User session not found. Please sign in.");
              router.push('/sign-in');
          }
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
      console.error("createNewPracticeSession: Called with no questions.");
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
          studentId: userId,
          title: `Random Practice - ${new Date().toLocaleDateString()}`,
          type: 'PRACTICE', 
          status: 'IN_PROGRESS',
          totalQuestions: fetchedQuestions.length,
          subjectId: subjectIdForSession,
          topicId: topicIdForSession,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to parse session creation error' }));
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
      setLoading(false); 
      setError("User session information is not yet available. Please wait or try refreshing.");
      return;
    }
    console.log("fetchRandomQuestionsAndStartSession: Called with userId:", userId);
    setLoading(true); 
    setError(null);
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
        setCurrentQuestionIndex(0); setScore(0); setAnsweredQuestions({});
        setQuestionResults([]); setSessionFinalized(false); setAiMessage(null); setChatHistory([]);
        console.log("fetchRandomQuestionsAndStartSession: New session started and questions set.");
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
      console.log("useEffect[userId, fetchRandomQuestionsAndStartSession]: userId not set yet, skipping session logic.");
      return; 
    }
    console.log("useEffect[userId, fetchRandomQuestionsAndStartSession]: userId is now available:", userId);

    const savedProgressString = safeStorage.getItem(`randomPracticeProgress_${userId}`);
    if (savedProgressString) {
        try {
            const progress: LocalStoragePracticeProgress = JSON.parse(savedProgressString);
            if (progress.questions && progress.questions.length > 0 && !progress.sessionFinalized && progress.practiceSessionId) {
                console.log("Resuming session from localStorage:", progress.practiceSessionId);
                setQuestions(progress.questions);
                setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
                setScore(progress.score || 0);
                setAnsweredQuestions(progress.answeredQuestions || {});
                setQuestionResults(progress.questionResults || []);
                setCurrentPracticeSessionId(progress.practiceSessionId);
                setCurrentSubjectId(progress.subjectId || null);
                setCurrentTopicId(progress.topicId || null);
                setSessionFinalized(false); 
                if (progress.currentQuestionIndex >= progress.questions.length) {
                    setShowSummary(true); 
                    setSessionFinalized(true); 
                }
                setLoading(false); 
                return; 
            } else {
                console.log("Invalid or finalized saved progress found, removing.");
                safeStorage.removeItem(`randomPracticeProgress_${userId}`);
            }
        } catch (error) {
            console.error('Error loading saved progress, removing it:', error);
            safeStorage.removeItem(`randomPracticeProgress_${userId}`);
        }
    }
    console.log("No resumable session, fetching new questions.");
    fetchRandomQuestionsAndStartSession(); 
    
  }, [userId, fetchRandomQuestionsAndStartSession]);


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
        if (currentQuestion.questionType === PrismaQuestionType.OPEN_ENDED || currentQuestion.questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
          setTextAnswer(savedAnswerString);
          const cAns = currentQuestion.correctAnswer;
          const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
          const isCorr = cAnsArr.includes(savedAnswerString.trim().toLowerCase());
          setIsAnswerCorrect(isCorr);
          if (!aiMessage) setAiMessage(isCorr ? "Great job!" : `Correct: ${cAnsArr.join(' or ')}`);
        } else if (currentQuestion.questionType === PrismaQuestionType.MULTI_PART && typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer && !Array.isArray(currentQuestion.correctAnswer)) {
          try {
            const userAnswers = JSON.parse(savedAnswerString);
            setMultiPartAnswers(userAnswers);
            const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
            let allCorrect = true;
            const results: Record<string, boolean> = {};
            for (const part in correctAnswersMap) {
              const isPartCorrect = (userAnswers[part] || '').trim().toLowerCase() === String(correctAnswersMap[part]).trim().toLowerCase();
              results[part] = isPartCorrect; if (!isPartCorrect) allCorrect = false;
            }
            setMultiPartResults(results); setIsAnswerCorrect(allCorrect);
            if (!aiMessage) setAiMessage(allCorrect ? "All parts correct!" : "Some parts incorrect.");
          } catch(e) { console.error("Error parsing multi-part saved answer", e)}
        } else { 
          const isCorr = String(currentQuestion.correctAnswer ?? '').toLowerCase() === savedAnswerString.toLowerCase();
          setIsAnswerCorrect(isCorr);
          const cOpt = currentQuestion.options.find(o => o.id.toLowerCase() === String(currentQuestion.correctAnswer ?? '').toLowerCase());
          if (!aiMessage) setAiMessage(isCorr ? "Great job!" : `Correct: ${cOpt?.text || currentQuestion.correctAnswer}`);
        }
      } else {
         setAiMessage(null);
      }
      setChatHistory([]);
    }
  }, [currentQuestionIndex, questions, answeredQuestions, currentQuestion, aiMessage]); // Added aiMessage here to prevent re-clearing after feedback

  const awardXPAndStreak = useCallback(async () => {
    if (!userId) {
        console.warn("awardXPAndStreak: userId is null, cannot award.");
        return;
    }
    if (sessionFinalized) {
      console.log("XP and streak already processed for this client session view of a finalized session.");
      return; 
    }
    console.log("Attempting to award XP and update streak for user:", userId);
    try {
      const xpResponse = await fetch('/api/user/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAmount: score, activityType: 'practice_completed' }),
      });
      const xpData = await xpResponse.json().catch(() => null);
      if (!xpResponse.ok) {
        console.error('Failed to award XP', xpData || xpResponse.statusText);
        toast.error(xpData?.error?.message || "There was an issue awarding XP.");
      } else {
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
        if (streakData?.currentStreak > 1) {
          toast.success(`You're on a ${streakData.currentStreak} day streak! Keep it up!`);
        } else if (streakData?.currentStreak === 1) {
          toast.info("Streak started! Practice tomorrow to keep it going.");
        }
      }
    } catch (error) {
      console.error('Error in awardXPAndStreak:', error);
      toast.error("There was an issue saving your XP/streak results.");
    }
  }, [userId, score, sessionFinalized]);

  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string | Record<string,string>, isCorrect: boolean, points: number) => {
    if (!currentPracticeSessionId) { 
      console.error("Cannot save answer: practiceSessionId is null");
      toast.error("Error saving answer: session not active.");
      return; 
    }
    try {
      const response = await fetch('/api/student-answers', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId: currentPracticeSessionId, questionId: question.id, submittedAnswer: userAnswer, isCorrect, pointsEarned: points, attemptedAt: new Date().toISOString(), }),
      });
      if (!response.ok) { 
        const errData = await response.json().catch(() => ({error: {message: 'Failed to parse error from save answer API.'}}));
        throw new Error(errData.error?.message || errData.error || "Failed to save student answer via API");
      }
      const savedData = await response.json();
      console.log("Student answer saved for q:", question.id, "DB ID:", savedData.id);
    } catch (err:any) { console.error("DB save error:", err); toast.error(`Answer save failed: ${err.message}`); }
  }, [currentPracticeSessionId]);
  
  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!currentPracticeSessionId || !userId || sessionFinalized) { 
      console.log("Cannot finalize session: ID missing, no user, or already finalized by this client action.");
      if(sessionFinalized && userId) await awardXPAndStreak(); // If somehow called again and already finalized, re-ensure XP/Streak
      return; 
    }
    console.log("Finalizing practice session in DB:", currentPracticeSessionId);
    try {
      const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', endTime: new Date().toISOString(), score: score, correctAnswers: questionResults.filter(r => r.correct).length, xpEarned: score }),
      });
      if (!response.ok) { const errData = await response.json().catch(() => ({error: {message: 'Failed to parse finalization error'}})); throw new Error(errData.error?.message || errData.error || 'Failed to finalize practice session'); }
      console.log("Practice session finalized in DB:", await response.json());
      setSessionFinalized(true); 
      await awardXPAndStreak(); 
      if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
    } catch (err: any) { console.error("Error finalizing practice session in DB:", err); toast.error(`Session finalization error: ${err.message}`); }
  }, [currentPracticeSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized]);

  const handleAnswerMCQ = useCallback((optionId: string, optionText: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(optionId);
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    setIsAnswerCorrect(isCorrect);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    const correctOption = currentQuestion.options.find(opt => opt.id.toLowerCase() === correctAnswerId);
    const correctAnswerDisplayText = correctOption ? correctOption.text : `ID: ${currentQuestion.correctAnswer}`;
    const feedbackMessage = isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctAnswerDisplayText}".`;
    setAiMessage(feedbackMessage); setChatHistory(prev => [{ role: "assistant", content: feedbackMessage }]); // Reset chat with new feedback
    const points = isCorrect ? (currentQuestion.pointsAwarded || 10) : 0;
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: isCorrect, question: currentQuestion.text || '', userAnswer: optionText, correctAnswer: correctAnswerDisplayText }]);
    if (isCorrect) setScore(prevScore => prevScore + points);
    saveStudentAnswerToDb(currentQuestion, optionId, isCorrect, points);
  }, [currentQuestion, selectedAnswer, saveStudentAnswerToDb]);
  
  const handleTextAnswerSubmit = useCallback(() => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null) return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer);
    const cAns = currentQuestion.correctAnswer;
    const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
    const isCorrect = cAnsArr.includes(userAnswer.toLowerCase());
    setIsAnswerCorrect(isCorrect);
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswer }));
    const feedbackMessage = isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${cAnsArr.join(' or ')}".`;
    setAiMessage(feedbackMessage); setChatHistory(prev => [{ role: "assistant", content: feedbackMessage }]);
    const points = isCorrect ? (currentQuestion.pointsAwarded || 10) : 0;
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: isCorrect, question: currentQuestion.text || '', userAnswer: userAnswer, correctAnswer: cAnsArr.join(' or ') }]);
    if (isCorrect) setScore(prevScore => prevScore + points);
    saveStudentAnswerToDb(currentQuestion, userAnswer, isCorrect, points);
  }, [textAnswer, currentQuestion, selectedAnswer, saveStudentAnswerToDb]);

  const handleMultiPartSubmit = useCallback(() => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer) || selectedAnswer !== null) return;
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
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAnswerString }));
    setSelectedAnswer(userAnswerString);
    const feedbackMessage = allPartsCorrect ? "Great job! All parts are correct." : "Some parts are incorrect. Check the feedback below.";
    setAiMessage(feedbackMessage); setChatHistory(prev => [{ role: "assistant", content: feedbackMessage }]);
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: allPartsCorrect, question: currentQuestion.text || '', userAnswer: multiPartAnswers, correctAnswer: correctAnswersMap }]);
    saveStudentAnswerToDb(currentQuestion, multiPartAnswers, allPartsCorrect, pointsEarnedThisQuestion);
  }, [currentQuestion, selectedAnswer, multiPartAnswers, saveStudentAnswerToDb]);

  const handleNextQuestion = useCallback(async () => { 
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setAiMessage(null); // Clear AI message for next question
      setChatHistory([]); 
    } else {
      setShowSummary(true);
      await finalizePracticeSessionInDb(); 
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const completeSessionAndStartNew = useCallback(async () => {
    if(userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
    setShowSummary(false);
    // setLoading(true); // fetchRandomQuestionsAndStartSession will handle its own loading
    await fetchRandomQuestionsAndStartSession();
  }, [userId, fetchRandomQuestionsAndStartSession]);

  const clearProgressAndExit = useCallback(async () => {
    if (currentPracticeSessionId && !sessionFinalized) {
        try {
            await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAUSED', endTime: new Date().toISOString() }),
            });
            console.log("Practice session paused:", currentPracticeSessionId);
        } catch(err) { console.error("Error pausing session:", err); }
    }
    if (userId) safeStorage.removeItem(`randomPracticeProgress_${userId}`);
    router.push('/student/practice'); 
  }, [currentPracticeSessionId, sessionFinalized, userId, router]);
  
  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || !currentQuestion) return;
    const currentUserMessage = userMessage.trim(); setUserMessage(''); setIsLoadingAI(true);
    const currentChatHistory = [...chatHistory, { role: "user", content: currentUserMessage }];
    setChatHistory(currentChatHistory); // Update immediately for UI
    if (aiContentRef.current) setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
    try {
      const optionsText = currentQuestion.options?.map((o, i) => `${String.fromCharCode(65+i)}. ${o.text}`).join('\n') || 'N/A';
      let cAnsDisp = 'Not available';
      if(currentQuestion.correctAnswer){
        if(typeof currentQuestion.correctAnswer === 'string' && currentQuestion.questionType === PrismaQuestionType.MULTIPLE_CHOICE) {
            const opt = currentQuestion.options.find(o => o.id.toLowerCase() === currentQuestion.correctAnswer!.toLowerCase());
            cAnsDisp = opt ? opt.text : String(currentQuestion.correctAnswer);
        } else { cAnsDisp = JSON.stringify(currentQuestion.correctAnswer); }
      }
      const context = `Question: ${currentQuestion.text}\nOptions: ${optionsText}\nCorrect Answer: ${cAnsDisp}\nHint: ${currentQuestion.hint || 'None'}`;
      const response = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{role: "system", content: `Tutor for Primary School. Context: ${context}. Guide, don't just give answers unless asked repeatedly. Keep concise and encouraging.`}, ...currentChatHistory] }), // Send updated history
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
                if (selectedAnswer !== null) { // An answer has been submitted
                  if (isSelected) { // This option was selected by the user
                    buttonClass = isAnswerCorrect ? "bg-green-50 border-2 border-green-500 text-green-800" : "bg-red-50 border-2 border-red-500 text-red-800";
                  } else if (isThisCorrectOption) { // This is the correct option, but was not selected
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
            ) : ( <div className="p-4 bg-yellow-50 border rounded-md text-yellow-800 text-center"><p>No answer options available for this MCQ.</p></div> )}
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
  
  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div><p className="ml-4 text-lg">Loading practice session...</p></div>;
  if (error) return <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]"><div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl"><div className="flex items-center"><div className="flex-shrink-0"><svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></div><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Error</h3><div className="mt-2 text-sm text-red-700"><p>{error}</p></div></div></div></div><p className="text-gray-600 mb-6">We encountered a problem.</p><Button onClick={() => fetchRandomQuestionsAndStartSession()} className="bg-indigo-600 hover:bg-indigo-700 text-white">Try Again</Button><Button onClick={() => router.push("/student/practice")} className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800">Return to Topics</Button></div>;
  if (!currentQuestion && !loading && !error && questions.length === 0) { return <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]"><h1 className="text-2xl font-bold mb-4">No Questions Available</h1><p className="text-gray-600 mb-6">We couldn't find any practice questions right now.</p><Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white">Return to Topics</Button></div>;}
  
  if (showSummary) {
    const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0);
    const percentageCorrect = totalPossibleScore > 0 ? Math.round((score / totalPossibleScore) * 100) : 0; 
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
          <h1 className="text-xl font-semibold text-center flex-1 text-gray-700">Practice Session Results</h1>
        </div>
        <div className="container mx-auto p-6 max-w-4xl flex-1">
          <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-36 h-36 md:w-48 md:h-48 relative mb-6 md:mb-0 md:mr-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={percentageCorrect >= 70 ? "#10b981" : percentageCorrect >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * percentageCorrect) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="font-bold text-3xl fill-gray-700">{percentageCorrect}%</text>
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Session Overview</h2>
                <div className="grid grid-cols-2 gap-4 mb-6 text-base md:text-lg">
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-xs sm:text-sm">Total Questions</p><p className="font-semibold">{questions.length}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-xs sm:text-sm">Your Score</p><p className="font-semibold text-green-600">{score} / {totalPossibleScore}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-xs sm:text-sm">Correct Answers</p><p className="font-semibold text-green-600">{questionResults.filter(r => r.correct).length}</p></div>
                  <div className="bg-gray-100 p-4 rounded-lg shadow-sm"><p className="text-gray-500 text-xs sm:text-sm">XP Earned</p><p className="font-semibold text-amber-500">{score}</p></div>
                </div>
                <div className="flex flex-col sm:flex-row justify-center md:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                  <Button onClick={clearProgressAndExit} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Return to Practice Menu</Button>
                  <Button onClick={completeSessionAndStartNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">Start New Random Practice</Button>
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Question Review</h2>
          <div className="bg-white rounded-xl shadow-xl overflow-hidden"><div className="divide-y divide-gray-200">
            {questionResults.map((result, index) => (
              <div key={index} className={`p-4 md:p-6 ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start">
                  <div className={`mt-1 mr-3 md:mr-4 flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${result.correct ? 'bg-green-500' : 'bg-red-500'} text-white text-base md:text-lg font-bold`}>
                    {result.correct ? "✓" : "✕"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 mb-2 text-sm md:text-base">Q{index + 1}: {result.question}</p>
                    <div className="text-xs md:text-sm space-y-1">
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
                                : String(result.correctAnswer)
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
  
  if (!currentQuestion) { return <div className="flex justify-center items-center min-h-screen"><p>Loading next question...</p></div>; }
  
  const progressPercentageDisplay = questions.length > 0 ? ((currentQuestionIndex +1 ) / questions.length) * 100 : 0;

  return ( 
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm">
        <button onClick={clearProgressAndExit} className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors">← Exit Practice</button>
        <div className="flex-1 text-center font-medium text-gray-700">{currentQuestion?.topic?.name || 'Random Practice'} • Question {currentQuestionIndex + 1} of {questions.length}</div>
        <div className="text-amber-600 font-semibold">{score} XP</div>
      </div>
      <div className="w-full h-1.5 bg-gray-300"><div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${progressPercentageDisplay}%` }} /></div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-auto bg-white" style={{ width: `${splitPosition}%` }}>
            <div className="p-6 md:p-10">
                <h1 className="text-xl md:text-2xl font-medium text-gray-800 mb-6 leading-tight">{currentQuestion?.text}</h1>
                {currentQuestion?.imageUrl && (
                <div className="mb-6 flex justify-center border border-gray-200 rounded-lg p-2 bg-gray-50 shadow-sm">
                    <img src={currentQuestion.imageUrl} alt="Question diagram" className="max-w-full h-auto max-h-96 rounded-md object-contain"/>
                </div>
                )}
                {renderQuestionContent()}
                {showHint && currentQuestion?.hint && (
                    <div className="my-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md text-yellow-800 shadow">
                        <p className="font-semibold mb-1 text-yellow-900">Hint:</p>
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
                    💡 Get Hint
                </Button>
                <Button 
                    onClick={handleNextQuestion} 
                    disabled={selectedAnswer === null} 
                    className={`px-8 py-3 text-base w-full sm:w-auto font-semibold rounded-lg shadow-md hover:shadow-lg transition-all ${selectedAnswer !== null ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : '🏁 Show Results'}
                </Button>
                </div>
            </div>
        </div>
        
        <div className="w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150" onMouseDown={handleMouseDown}><div className="h-10 w-1 bg-gray-400 rounded-full group-hover:bg-blue-500 transition-colors duration-150"></div></div>
        
        <div className="bg-emerald-50 flex flex-col overflow-hidden" style={{ width: `${100 - splitPosition - 0.5}%` }}>
          <div className="p-4 border-b border-emerald-200 bg-emerald-100 flex items-center shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mr-3 text-lg font-bold">AI</div>
            <div className="flex-1"><div className="font-semibold text-emerald-800">AI Tutor</div><div className="text-xs text-emerald-600">Your personal learning assistant</div></div>
            <div className="text-xs text-emerald-600 flex items-center"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 border-2 border-emerald-100 shadow-md"></span>Online</div>
          </div>
          <div ref={aiContentRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-emerald-25 custom-scrollbar">
            {chatHistory.length > 0 ? ( chatHistory.map((message, index) => (<div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-3 shadow-md text-sm ${message.role === 'user' ? 'ml-auto bg-blue-500 text-white rounded-br-none' : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}><p className="whitespace-pre-wrap">{message.content}</p></div></div>)) )
            : aiMessage ? (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-3 shadow-md text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><p className="whitespace-pre-wrap">{aiMessage}</p></div></div>)
            : (<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8"><div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-4xl">💡</div><p>I'm here to help! Ask me anything about this question, or I'll give you feedback after you answer.</p></div>)}
            {isLoadingAI && (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-3 shadow-md text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><div className="flex space-x-1.5 items-center"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>)}
          </div>
          <div className="p-3 border-t border-emerald-200 bg-emerald-100">
            <div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 bg-white shadow-sm">
              <input type="text" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about this question..." className="flex-1 py-2.5 px-4 text-sm border-none outline-none bg-transparent rounded-l-full" disabled={isLoadingAI || selectedAnswer !== null} />
              <button onClick={handleSendMessage} disabled={isLoadingAI || !userMessage.trim() || selectedAnswer !== null} className={`w-9 h-9 m-1 rounded-full flex items-center justify-center transition-colors ${userMessage.trim() && !isLoadingAI && selectedAnswer === null ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11a1 1 0 112 0v5.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}