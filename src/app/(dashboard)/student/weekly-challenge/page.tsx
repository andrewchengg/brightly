// src/app/(dashboard)/student/weekly-challenge/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { PracticeSessionStatus, PrismaQuestionType } from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage';
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";


// Interfaces (similar to RandomPractice)
interface OptionClient { id: string; text: string; }
interface QuestionClient {
  id: number; text: string; question?: string; options: OptionClient[];
  correctAnswer: string | string[] | Record<string, string> | null;
  hint?: string; explanation?: string | null;
  topic: { id: number; name: string; subjectId?: number; };
  difficulty?: string; pointsAwarded?: number;
  questionType?: keyof typeof PrismaQuestionType; imageUrl?: string;
}
interface LocalStorageWeeklyChallengeProgress {
  questions: QuestionClient[]; currentQuestionIndex: number; score: number;
  answeredQuestions: Record<number, string | Record<string, string>>; // Allow for multi-part
  questionResults: { id: number; correct: boolean; question: string; userAnswer: string | Record<string, string>; correctAnswer: string | string[] | Record<string, string> | null;}[];
  sessionFinalized?: boolean; practiceSessionId: string | null;
  challengeWeekIdentifier?: string; // ISO string of the week's start
}

export default function WeeklyChallengePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null); // For MCQ, or as general "answered" flag for UI
  const [textAnswer, setTextAnswer] = useState(''); // For Open/Fill
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({}); // For MultiPart
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<'initial' | 'questions' | 'submitting' | false>('initial');
  const [error, setError] = useState<string | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'LOADING'>('LOADING');
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string | Record<string, string>>>({});
  const [questionResults, setQuestionResults] = useState<LocalStorageWeeklyChallengeProgress['questionResults']>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [currentChallengeWeekId, setCurrentChallengeWeekId] = useState<string | undefined>();
  const [sessionDetailsForSummary, setSessionDetailsForSummary] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);


  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);

  const currentQuestion: QuestionClient | null = questions.length > 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex]
    : null;

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else {
        toast.error("User session not found. Please sign in.");
        router.push('/sign-in');
      }
    }
  }, [authUser, authUserIsLoaded, router]);


  const startOrResumeChallenge = useCallback(async () => {
    if (!userId) return;
    setLoading('questions'); setError(null);
    try {
      const response = await fetch('/api/student/weekly-challenge/start', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to start/resume challenge.');

      setSessionDetailsForSummary(data.sessionDetails); // Store for summary page

      if (data.status === 'COMPLETED') {
        setChallengeStatus('COMPLETED');
        setPracticeSessionId(data.practiceSessionId); // Store session ID even if completed to show summary
        // Load final results for summary display if it's already completed
        // This part might need adjustment based on how you want to show summary for already completed.
        // For now, it just shows the "completed" message.
        setLoading(false);
        return;
      }

      setPracticeSessionId(data.practiceSessionId);
      const fetchedQuestions = data.questions || [];
      const fetchedChallengeWeekId = data.sessionDetails?.challengeWeekIdentifier;
      setCurrentChallengeWeekId(fetchedChallengeWeekId);
      
      const progressKey = `weeklyChallengeProgress_${userId}_${fetchedChallengeWeekId}`;
      const savedProgressString = safeStorage.getItem(progressKey);
      let successfullyResumedFromStorage = false;

      if (data.status === 'RESUMED' && savedProgressString && fetchedChallengeWeekId) {
        try {
          const progress: LocalStorageWeeklyChallengeProgress = JSON.parse(savedProgressString);
          if (progress.practiceSessionId === data.practiceSessionId && !progress.sessionFinalized) {
            setQuestions(progress.questions || fetchedQuestions); 
            setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
            setScore(progress.score || 0);
            setAnsweredQuestions(progress.answeredQuestions || {});
            setQuestionResults(progress.questionResults || []);
            setSessionFinalized(false);
             if (progress.currentQuestionIndex >= (progress.questions?.length || 0)) {
              setShowSummary(true); setSessionFinalized(true);
            }
            successfullyResumedFromStorage = true;
          } else { safeStorage.removeItem(progressKey); }
        } catch (e) { console.error("Error parsing saved progress", e); safeStorage.removeItem(progressKey); }
      }
      
      if (!successfullyResumedFromStorage) {
        setQuestions(fetchedQuestions);
        setCurrentQuestionIndex(0); setScore(0); setAnsweredQuestions({});
        setQuestionResults([]); setSessionFinalized(false);
        if(fetchedChallengeWeekId) safeStorage.removeItem(`weeklyChallengeProgress_${userId}_${fetchedChallengeWeekId}`);
      }

      setChallengeStatus('IN_PROGRESS');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && challengeStatus === 'LOADING') {
      startOrResumeChallenge();
    }
  }, [userId, challengeStatus, startOrResumeChallenge]);
  
  useEffect(() => {
    if (!userId || loading || questions.length === 0 || !practiceSessionId || showSummary || !currentChallengeWeekId) return;
    const progressKey = `weeklyChallengeProgress_${userId}_${currentChallengeWeekId}`;
    const progress: LocalStorageWeeklyChallengeProgress = {
      questions, currentQuestionIndex, score, answeredQuestions, questionResults,
      sessionFinalized, practiceSessionId, challengeWeekIdentifier: currentChallengeWeekId,
    };
    safeStorage.setItem(progressKey, JSON.stringify(progress));
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading, userId, practiceSessionId, showSummary, currentChallengeWeekId]);

 useEffect(() => {
    if (currentQuestion) {
      const currentQuestionId = currentQuestion.id;
      const savedUserAnswerContent = answeredQuestions[currentQuestionId]; 

      setIsAnswerCorrect(null); 
      setTextAnswer('');
      setMultiPartAnswers({});
      setSelectedAnswer(null); 

      if (savedUserAnswerContent !== undefined) {
        const questionType = currentQuestion.questionType;
        let isCorrectForSaved = false;
        
        if (questionType === PrismaQuestionType.OPEN_ENDED || questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
          if(typeof savedUserAnswerContent === 'string') setTextAnswer(savedUserAnswerContent);
          const cAns = currentQuestion.correctAnswer;
          const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
          isCorrectForSaved = cAnsArr.includes(String(savedUserAnswerContent).trim().toLowerCase());
          setSelectedAnswer(String(savedUserAnswerContent)); 
        } else if (questionType === PrismaQuestionType.MULTI_PART && typeof currentQuestion.correctAnswer === 'object' && currentQuestion.correctAnswer && !Array.isArray(currentQuestion.correctAnswer)) {
          if(typeof savedUserAnswerContent === 'object' && savedUserAnswerContent !== null) setMultiPartAnswers(savedUserAnswerContent as Record<string,string>);
          const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
          isCorrectForSaved = true; 
          for (const part in correctAnswersMap) {
            const isPartCorrect = ( (savedUserAnswerContent as Record<string,string>)[part] || '').trim().toLowerCase() === String(correctAnswersMap[part]).trim().toLowerCase();
            if (!isPartCorrect) isCorrectForSaved = false;
          }
          setSelectedAnswer(JSON.stringify(savedUserAnswerContent)); 
        } else { // MCQ
          if(typeof savedUserAnswerContent === 'string') setSelectedAnswer(savedUserAnswerContent); 
          isCorrectForSaved = String(currentQuestion.correctAnswer ?? '').toLowerCase() === String(savedUserAnswerContent).toLowerCase();
        }
        setIsAnswerCorrect(isCorrectForSaved);
      }
    }
  }, [currentQuestionIndex, questions, answeredQuestions]);


  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string | Record<string,string>, isCorrect: boolean, points: number) => {
    if (!practiceSessionId) { toast.error("Error saving: No active session."); return; }
    try {
      await fetch('/api/student-answers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId: practiceSessionId, questionId: question.id, submittedAnswer: userAnswer, isCorrect, pointsEarned: points, attemptedAt: new Date().toISOString(), }),
      });
    } catch (err:any) { toast.error(`Answer save failed: ${err.message}`); }
  }, [practiceSessionId]);
  
  const awardXPAndStreak = useCallback(async (xpAmount: number) => {
    if (!userId || xpAmount <= 0) return null;
    let levelUpDetails = null;
    try {
      const xpResponse = await fetch('/api/user/award-xp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAmount, activityType: 'weekly_challenge_completion' }),
      });
      if (xpResponse.ok) {
        const xpData = await xpResponse.json();
        toast.success(`+${xpData.awarded || xpAmount} XP earned!`);
        if(xpData.leveledUp) {
            levelUpDetails = { newLevel: xpData.level };
        }
      } else { toast.warn('Could not award XP.'); }
      await fetch('/api/user/update-streak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityType: 'weekly_challenge_completion' }) });
    } catch (error) { console.error("Error awarding XP/Streak", error); }
    return levelUpDetails;
  }, [userId]);

  const finalizePracticeSessionInDb = useCallback(async () => {
    if (!practiceSessionId || !userId || sessionFinalized) return;
    setLoading('submitting');
    try {
      const response = await fetch(`/api/practice-sessions/${practiceSessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', endTime: new Date().toISOString(), score: score, correctAnswers: questionResults.filter(r => r.correct).length, xpEarned: score }),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to finalize session'); }
      
      setSessionDetailsForSummary(await response.json()); // Store updated session for summary
      setSessionFinalized(true); 
      setChallengeStatus('COMPLETED');
      
      const levelUpDetails = await awardXPAndStreak(score); 
      if(levelUpDetails) {
        setNewLevel(levelUpDetails.newLevel);
        setShowLevelUp(true);
      }

      if(userId && currentChallengeWeekId) {
          const progressKey = `weeklyChallengeProgress_${userId}_${currentChallengeWeekId}`;
          safeStorage.removeItem(progressKey);
      }
      toast.success("Weekly Challenge completed and results saved!");
    } catch (err: any) { toast.error(`Session finalization error: ${err.message}`);
    } finally { setLoading(false); }
  }, [practiceSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized, currentChallengeWeekId]);

  const handleSubmitAnswer = (userAns: string | Record<string,string>, isCorr: boolean) => {
    if (!currentQuestion) return;
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAns }));
    setIsAnswerCorrect(isCorr);
    const points = isCorr ? (currentQuestion.pointsAwarded || 20) : 0;
    setQuestionResults(prev => [...prev, { id: currentQuestion.id, correct: isCorr, question: currentQuestion.text || '', userAnswer: userAns, correctAnswer: currentQuestion.correctAnswer }]);
    if (isCorr) setScore(prevScore => prevScore + points);
    saveStudentAnswerToDb(currentQuestion, userAns, isCorr, points);
};

const handleAnswerMCQ = (optionId: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(optionId);
    const isCorrect = String(currentQuestion.correctAnswer || '').toLowerCase() === optionId.toLowerCase();
    handleSubmitAnswer(optionId, isCorrect);
};

const handleTextAnswerSubmit = () => {
    if (!textAnswer.trim() || !currentQuestion || selectedAnswer !== null) return;
    const userAnswer = textAnswer.trim();
    setSelectedAnswer(userAnswer); 
    const cAns = currentQuestion.correctAnswer;
    const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
    const isCorrect = cAnsArr.includes(userAnswer.toLowerCase());
    handleSubmitAnswer(userAnswer, isCorrect);
};

const handleMultiPartSubmit = () => {
    if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer) || selectedAnswer !== null) return;
    const correctAnswersMap = currentQuestion.correctAnswer as Record<string, string>;
    let allPartsCorrect = true;
    for (const part in correctAnswersMap) {
        const userAnswerPart = (multiPartAnswers[part] || '').trim().toLowerCase();
        const correctAnswerTextPart = String(correctAnswersMap[part]).trim().toLowerCase();
        if (userAnswerPart !== correctAnswerTextPart) allPartsCorrect = false;
    }
    setSelectedAnswer(JSON.stringify(multiPartAnswers)); 
    handleSubmitAnswer(multiPartAnswers, allPartsCorrect);
};

  const handleNextQuestion = useCallback(async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setShowSummary(true);
      await finalizePracticeSessionInDb();
    }
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);

  const isMultiPartComplete = () => {
    if (!currentQuestion || currentQuestion.questionType !== PrismaQuestionType.MULTI_PART || typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) return false;
    const parts = Object.keys(currentQuestion.correctAnswer);
    return parts.length > 0 && parts.every(p => multiPartAnswers[p]?.trim());
  };

  const renderQuestionContent = () => {
    if (!currentQuestion) return <p className="text-center text-gray-500">Loading question...</p>;
    const questionTypeString = String(currentQuestion.questionType) as keyof typeof PrismaQuestionType | "UNKNOWN";

    switch(questionTypeString) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
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
                  <button key={option.id || index} onClick={() => handleAnswerMCQ(optionId)} disabled={selectedAnswer !== null}
                    className={`w-full text-left p-4 rounded-md transition-all duration-150 text-md ${buttonClass}`}>
                    <span className="font-bold mr-2">{optionLetter}.</span> {optionText}
                  </button>
                );
              })
            ) : ( <p>No options for this MCQ.</p> )}
          </div>
        );
      case PrismaQuestionType.FILL_IN_THE_BLANK: 
      case PrismaQuestionType.OPEN_ENDED:
        return (
          <div className="mt-6">
            <div className="flex">
              <input id="text-answer" type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && textAnswer.trim() && selectedAnswer === null) { e.preventDefault(); handleTextAnswerSubmit(); }}}
                placeholder="Type your answer..." disabled={selectedAnswer !== null}
                className={`w-full p-3 text-md rounded-l-md border ${ selectedAnswer === null ? "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" : isAnswerCorrect ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800"}`} />
              <button onClick={handleTextAnswerSubmit} disabled={selectedAnswer !== null || !textAnswer.trim()}
                className={`px-5 rounded-r-md ${ selectedAnswer === null && textAnswer.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit</button>
            </div>
            {selectedAnswer !== null && (<div className={`mt-3 p-3 rounded-md text-sm ${ isAnswerCorrect ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}><p className="font-medium">{isAnswerCorrect ? "Correct!" : `Incorrect. Correct answer(s): "${ Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.join(' or ') : currentQuestion.correctAnswer }".`}</p>{!isAnswerCorrect && currentQuestion.explanation && <p className="mt-1">Explanation: {currentQuestion.explanation}</p>}</div>)}
          </div>
        );
      case PrismaQuestionType.MULTI_PART:
         if (typeof currentQuestion.correctAnswer !== 'object' || currentQuestion.correctAnswer === null || Array.isArray(currentQuestion.correctAnswer)) {
            return <p className="text-red-500">Error: Multi-part question format invalid.</p>;
        }
        const parts = Object.keys(currentQuestion.correctAnswer);
        return (
          <div className="mt-6 space-y-4">
            {parts.map((part) => (
              <div key={part}>
                <label htmlFor={`multipart-${part}`} className="block text-sm font-medium text-gray-700 mb-1">Part {part.toUpperCase()}:</label>
                <input type="text" id={`multipart-${part}`} value={multiPartAnswers[part] || ''} 
                    onChange={(e) => setMultiPartAnswers({...multiPartAnswers, [part]: e.target.value})}
                    placeholder={`Answer for part ${part.toUpperCase()}`} disabled={selectedAnswer !== null}
                    className={`w-full p-3 text-md rounded-md border ${ selectedAnswer !== null && (currentQuestion.correctAnswer as Record<string, string>)[part] !== undefined ? ((multiPartAnswers[part] || '').trim().toLowerCase() === String((currentQuestion.correctAnswer as Record<string, string>)[part]).trim().toLowerCase() ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"}`} />
                {selectedAnswer !== null && (currentQuestion.correctAnswer as Record<string, string>)[part] !== undefined && !((multiPartAnswers[part] || '').trim().toLowerCase() === String((currentQuestion.correctAnswer as Record<string, string>)[part]).trim().toLowerCase()) && (<p className="text-xs text-red-600 mt-1">Correct: "{(currentQuestion.correctAnswer as Record<string,string>)[part]}"</p>)}
              </div>
            ))}
            <Button onClick={handleMultiPartSubmit} disabled={selectedAnswer !== null || !isMultiPartComplete()}
              className={`w-full py-3 ${ selectedAnswer === null && isMultiPartComplete() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Submit All Parts</Button>
            {selectedAnswer !== null && (<div className={`mt-3 p-3 rounded-md text-sm ${ isAnswerCorrect ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}><p className="font-medium">{isAnswerCorrect ? "All parts correct!" : "Some parts incorrect."}</p>{!isAnswerCorrect && currentQuestion.explanation && <p className="mt-1">Explanation: {currentQuestion.explanation}</p>}</div>)}
          </div>
        );
      default: return <p>Unsupported question type: {currentQuestion.questionType}</p>;
    }
  };


  // --- Main Return JSX ---
  if (loading === 'initial' || (loading === 'questions' && challengeStatus === 'LOADING')) {
    return <div className="flex justify-center items-center min-h-screen"><div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div><p className="ml-4 text-lg">Loading Challenge...</p></div>;
  }
  if (error) {
    return <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]"><div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-2xl"><p className="text-red-700">{error}</p></div><Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white">Back to Practice</Button></div>;
  }

  if (challengeStatus === 'COMPLETED' && !showSummary) {
    return (
      <div className="max-w-xl mx-auto text-center p-8 bg-white shadow-lg rounded-lg mt-10">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Weekly Challenge Completed!</h1>
        <p className="text-gray-700 mb-6">You've already completed this week's challenge. Well done! Check back next week for a new set of questions.</p>
        <Button onClick={() => router.push('/student/practice')} className="bg-indigo-600 hover:bg-indigo-700 text-white mr-2">
          Explore Other Practice
        </Button>
         <Button onClick={() => {setShowSummary(true); /* Fetch final score if needed */ }} variant="outline">
          View My Results
        </Button>
      </div>
    );
  }

  if (showSummary) {
    const finalScore = sessionDetailsForSummary?.score ?? score;
    const finalTotalQuestions = sessionDetailsForSummary?.totalQuestions ?? questions.length;
    const finalCorrectAnswers = sessionDetailsForSummary?.correctAnswers ?? questionResults.filter(r => r.correct).length;
    const finalXpEarned = sessionDetailsForSummary?.xpEarned ?? score;

    const totalPossibleScore = finalTotalQuestions * 20; // Assuming 20 points per question for challenge
    const percentageCorrect = totalPossibleScore > 0 ? Math.round((finalScore / totalPossibleScore) * 100) : 0;
    
    return (
        <div className="max-w-2xl mx-auto p-6 md:p-10 bg-white shadow-xl rounded-lg mt-8">
            {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
            <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Weekly Challenge Results</h1>
            <div className="text-center mb-8">
                <p className="text-5xl font-bold text-indigo-600">{percentageCorrect}%</p>
                <p className="text-gray-600">Your Score: {finalScore} / {totalPossibleScore}</p>
                <p className="text-amber-500 font-semibold mt-1">XP Earned: +{finalXpEarned}</p>
            </div>
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Question Breakdown:</h2>
                <ul className="space-y-3">
                    {questionResults.map((result, index) => (
                        <li key={result.id} className={`p-3 rounded-md border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="font-medium text-sm text-gray-700">Q{index + 1}: {result.question.substring(0,70)}...</p>
                            <p className={`text-xs ${result.correct ? 'text-green-700' : 'text-red-700'}`}>
                                Your answer was {result.correct ? 'Correct' : 'Incorrect'}.
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={() => router.push('/student/practice')} variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">Back to Practice</Button>
                <Button onClick={() => { setChallengeStatus('LOADING'); setShowSummary(false);}} className="bg-indigo-600 hover:bg-indigo-700 text-white">Check for New Challenge</Button>
            </div>
        </div>
    );
  }
  

  if (!currentQuestion) {
    return <div className="p-6 text-center text-gray-500">Preparing questions... If this persists, please refresh.</div>;
  }

  const progressPercentageDisplay = questions.length > 0 ? ((currentQuestionIndex + (answeredQuestions[currentQuestion.id] !== undefined ? 1:0)) / questions.length) * 100 : 0;
  
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 flex-grow flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-indigo-700">Weekly Challenge</h1>
            <span className="text-sm font-semibold text-indigo-500">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPercentageDisplay}%` }}></div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-lg md:text-xl text-gray-800 leading-relaxed whitespace-pre-wrap">{currentQuestion.text}</p>
          {currentQuestion.imageUrl && (
            <div className="mt-4 flex justify-center">
              <img src={currentQuestion.imageUrl} alt="Question Visual" className="max-w-full h-auto max-h-80 rounded-md border shadow-sm" />
            </div>
          )}
        </div>
        
        <div className="mb-auto"> 
         {renderQuestionContent()}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Button
            onClick={handleNextQuestion}
            disabled={selectedAnswer === null || loading === 'submitting'} // selectedAnswer checks if current question has been answered
            className="w-full py-3 text-base font-semibold rounded-lg shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading === 'submitting' ? 'Submitting...' : (currentQuestionIndex < questions.length - 1 ? 'Next Question →' : '🏁 Finish Challenge')}
          </Button>
        </div>
      </div>
    </div>
  );
}