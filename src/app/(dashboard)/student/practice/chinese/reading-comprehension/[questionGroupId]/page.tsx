// src/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { 
    PracticeSessionStatus, PracticeSessionType, QuestionType as PrismaQuestionType, 
    QuestionGroup, DifficultyLevel 
} from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage'; 
import { useSupabaseUser } from "@/lib/hooks/auth"; 
import LevelUpNotification from "@/components/LevelUpNotification";
import { 
    FaLightbulb, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaRedo, FaCheck, FaTimes, 
    FaCommentDots, FaPaperPlane, FaTrophy, FaMedal, FaChartBar, FaArrowRight, FaRocket, 
    FaBookReader, FaRegListAlt
} from "react-icons/fa";

// Reusable Components (assuming they are in a shared location)
import PassageDisplay from '@/components/Practice/PassageDisplay'; 
import ClozeQuestionOptions from '@/components/Practice/ClozeQuestionOptions';
// You might want to create a dedicated AITutorPanel component later
// import AITutorPanel from '@/components/Practice/AITutorPanel'; 
// And a SummaryView component
// import SummaryView from '@/components/Practice/SummaryView';

// Interfaces (Consider moving to a shared types file: src/types/practice.ts)
export interface OptionClient { id: string; text: string; }
export interface QuestionClient {
  id: number; text: string; question?: string; options: OptionClient[]; 
  correctAnswer: string | string[] | Record<string, string> | null; 
  hint?: string; explanation?: string | null;
  topic: { id: number; name: string; subjectId?: number; };
  difficulty?: keyof typeof DifficultyLevel; pointsAwarded?: number;
  questionType?: keyof typeof PrismaQuestionType; imageUrl?: string;
  topicName?: string; questionNumberOnPage?: string;
}
interface LocalStorageClozePracticeProgress { // Renamed for clarity
  questionGroupId: number; passageTitle: string; passageContent: string | null; 
  audioUrl?: string | null; questions: QuestionClient[]; currentQuestionIndex: number;
  score: number; answeredQuestions: Record<number, string | Record<string, string>>;
  questionResults: {id: number, correct: boolean, question: string, userAnswer: string | Record<string, string>, correctAnswer: string | string[] | Record<string, string> | null}[];
  sessionFinalized?: boolean; practiceSessionId?: string | null; subjectId?: number | null;
}

export default function ReadingComprehensionPassagePracticePage() {
  const router = useRouter();
  const params = useParams();
  const questionGroupIdParam = params.questionGroupId as string;
  const numericQuestionGroupId = parseInt(questionGroupIdParam, 10);

  // State variables (most are the same as the generic QuestionGroupPracticePage)
  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string | null>(null);
  // const [passageAudioUrl, setPassageAudioUrl] = useState<string | null>(null); // Keep if cloze might have audio

  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(65);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string | Record<string, string>>>({});
  const [userMessage, setUserMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [questionResults, setQuestionResults] = useState<LocalStorageClozePracticeProgress['questionResults']>([]);
  
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(null);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiContentRef = useRef<HTMLDivElement>(null);

  const currentQuestion: QuestionClient | null =
    questions.length > 0 && currentQuestionIndex < questions.length
      ? questions[currentQuestionIndex]
      : null;

  const localStorageKey = userId
    ? `readingComprehensionPracticeProgress_${userId}_${numericQuestionGroupId}` // Specific key
    : null;

  // --- useEffect for Auth ---
  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else { toast.error("User session not found."); router.push("/sign-in"); }
    }
  }, [authUser, authUserIsLoaded, router]);

  // --- createNewSession (can be a shared hook/util later) ---
  const createNewSession = useCallback(
    async (fetchedQuestions: QuestionClient[], groupData: QuestionGroup) => {
      // ... (same logic as createNewQuestionGroupPracticeSession, ensure type is correct)
      if (!userId) { setError("User info missing."); return null; }
      const firstQSubjectId = fetchedQuestions[0]?.topic?.subjectId;
      setCurrentSubjectId(firstQSubjectId || null);
      try {
        const response = await fetch("/api/practice-session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: userId, title: `Cloze: ${groupData.name}`,
            type: PracticeSessionType.QUESTION_GROUP_PRACTICE, // Or a more specific type if you add one e.g. CLOZE_PASSAGE
            status: PracticeSessionStatus.IN_PROGRESS, totalQuestions: fetchedQuestions.length,
            subjectId: firstQSubjectId, basedOnQuestionGroupId: numericQuestionGroupId,
          }),
        });
        if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || "Session creation failed"); }
        const sD = await response.json(); setCurrentPracticeSessionId(sD.id); return sD.id;
      } catch (e:any) { setError(`Session start error: ${e.message}`); return null; }
    },
    [userId, numericQuestionGroupId]
  );

  // --- fetchContentAndStart (can be a shared hook/util later, parameterized by API endpoint) ---
  const fetchContentAndStart = useCallback(async () => {
    // ... (same logic as fetchQuestionGroupAndStartSession, but uses createNewSession)
    if (!userId || !numericQuestionGroupId || isNaN(numericQuestionGroupId)) return;
    if (localStorageKey) safeStorage.removeItem(localStorageKey, "local");
    setLoading("fetching-group"); setError(null); /* Reset all states */
    setPassageTitle(""); setPassageContent(null); /* setPassageAudioUrl(null); */ setQuestions([]);
    setCurrentQuestionIndex(0); setScore(0); setAnsweredQuestions({}); setQuestionResults([]); 
    setSessionFinalized(false); setAiMessage(null); setChatHistory([]); setCurrentPracticeSessionId(null); setCurrentSubjectId(null);
    try {
      const response = await fetch(`/api/questions/question-group/${numericQuestionGroupId}`);
      if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || `API error ${response.status}`); }
      const data: { questionGroup: QuestionGroup; questions: QuestionClient[] } = await response.json();
      if (!data.questionGroup) throw new Error("No group data from API.");
      setPassageContent(data.questionGroup.description || "");
      setPassageTitle(data.questionGroup.name || "Cloze Passage");
      const fQ = data.questions || [];
      if (fQ.length === 0 && !data.questionGroup.description?.trim()) throw new Error("No passage or questions found.");
      setQuestions(fQ);
      if (fQ.length > 0 && fQ[0].topic?.subjectId) setCurrentSubjectId(fQ[0].topic.subjectId);
      const sId = await createNewSession(fQ, data.questionGroup);
      if (!sId) setError("Failed to start new session in DB.");
    } catch (e:any) { setError(e.message || "Failed to load content."); setPassageTitle("Error"); setPassageContent("Load error."); setQuestions([]); }
    finally { setLoading(false); }
  }, [userId, numericQuestionGroupId, createNewSession, localStorageKey]);

  // --- useEffect for Loading/Resuming Session (can be a shared hook/util) ---
  useEffect(() => {
    // ... (similar logic, ensuring it uses LocalStorageClozePracticeProgress type)
    if (!userId || !numericQuestionGroupId || isNaN(numericQuestionGroupId) || !localStorageKey) { if (userId && numericQuestionGroupId && !isNaN(numericQuestionGroupId) && loading !== "fetching-group") setLoading(true); return; }
    if(loading === true) { setLoading("resuming-session"); const savedProgressString = safeStorage.getItem(localStorageKey, 'local'); let resumableSessionFound = false;
      if (savedProgressString) { try { const progress: LocalStorageClozePracticeProgress = JSON.parse(savedProgressString);
          if (progress.questionGroupId === numericQuestionGroupId && !progress.sessionFinalized && progress.practiceSessionId) {
            setPassageTitle(progress.passageTitle); setPassageContent(progress.passageContent); /* setPassageAudioUrl(progress.audioUrl); */ setQuestions(progress.questions || []); 
            setCurrentQuestionIndex(progress.currentQuestionIndex || 0); setScore(progress.score || 0); setAnsweredQuestions(progress.answeredQuestions as Record<number, string | Record<string, string>> || {});
            setQuestionResults(progress.questionResults || []); setCurrentPracticeSessionId(progress.practiceSessionId); setCurrentSubjectId(progress.subjectId || null); setSessionFinalized(false); 
            if ((progress.currentQuestionIndex || 0) >= (progress.questions?.length || 0) && (progress.questions?.length || 0) > 0) { setShowSummary(true); setSessionFinalized(true); } resumableSessionFound = true;
          } else { safeStorage.removeItem(localStorageKey, 'local');}
        } catch (error) { console.error("Error parsing saved progress:", error); safeStorage.removeItem(localStorageKey, 'local'); } }
      if (!resumableSessionFound) fetchContentAndStart(); else setLoading(false); }
  }, [userId, numericQuestionGroupId, fetchContentAndStart, localStorageKey]);

  // --- useEffect for Saving Progress (can be a shared hook/util) ---
  useEffect(() => {
    // ... (similar logic, using LocalStorageClozePracticeProgress type)
    if (!localStorageKey || typeof loading === 'string' || loading || !userId || !currentPracticeSessionId || showSummary) return; 
    const contentToSave = passageContent === null ? "" : passageContent;
    const progress: LocalStorageClozePracticeProgress = {
      questionGroupId: numericQuestionGroupId, passageTitle, passageContent: contentToSave, /* audioUrl: passageAudioUrl, */ questions, currentQuestionIndex, score, 
      answeredQuestions: answeredQuestions as Record<number, string | Record<string, string>>, questionResults, sessionFinalized, practiceSessionId: currentPracticeSessionId, subjectId: currentSubjectId,
    }; safeStorage.setItem(localStorageKey, JSON.stringify(progress), 'local');
  }, [questions, currentQuestionIndex, score, answeredQuestions, questionResults, sessionFinalized, loading, userId, currentPracticeSessionId, showSummary, numericQuestionGroupId, passageTitle, passageContent, /*passageAudioUrl,*/ currentSubjectId, localStorageKey]);

  // --- useEffect for Current Question UI State --- (Simplified for MCQ)
  useEffect(() => {
    if (currentQuestion) {
      const savedUserAnswerContent = answeredQuestions[currentQuestion.id];
      setIsAnswerCorrect(null); setSelectedAnswer(null);
      if (savedUserAnswerContent !== undefined && typeof savedUserAnswerContent === 'string') {
        setSelectedAnswer(savedUserAnswerContent);
        setIsAnswerCorrect(String(currentQuestion.correctAnswer ?? '').toLowerCase() === savedUserAnswerContent.toLowerCase());
      } else { setAiMessage(null); }
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, answeredQuestions]);

  // --- Core Logic Callbacks (awardXPAndStreak, saveStudentAnswerToDb, finalizePracticeSessionInDb) ---
  // These can be largely shared or put into a custom hook `usePracticeSessionManagement`
  const awardXPAndStreak = useCallback(async (xpToAdd: number) => { /* ... same general logic ... */ return null; }, [userId, sessionFinalized]);
  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string, isCorrect: boolean, points: number) => { /* ... same ... */ }, [currentPracticeSessionId]);
  const finalizePracticeSessionInDb = useCallback(async () => { /* ... same ... */ }, [currentPracticeSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized, localStorageKey, setNewLevel, setShowLevelUp]);

  // --- Answer Submission for Cloze (MCQ) ---
  const handleSubmitAnswerForCloze = useCallback((userAns: string, isCorr: boolean) => {
    if (!currentQuestion) return;
    setAnsweredQuestions(prev => ({ ...prev, [currentQuestion.id]: userAns }));
    setIsAnswerCorrect(isCorr);
    const points = isCorr ? (currentQuestion.pointsAwarded || 2) : 0; // Cloze often 2 marks
    setQuestionResults(prevResults => { /* ... same logic to update results ... */ 
        const newResult = { id: currentQuestion.id, correct: isCorr, question: currentQuestion.text || `Blank ${currentQuestion.questionNumberOnPage}`, userAnswer: userAns, correctAnswer: currentQuestion.correctAnswer };
        const existingResultIndex = prevResults.findIndex(r => r.id === currentQuestion.id);
        if (existingResultIndex > -1) { const updatedResults = [...prevResults]; updatedResults[existingResultIndex] = newResult; return updatedResults; }
        return [...prevResults, newResult];
    });
    if (isCorr) { const alreadyCountedCorrect = questionResults.find(qr => qr.id === currentQuestion.id && qr.correct); if (!alreadyCountedCorrect) setScore(prevScore => prevScore + points); }
    saveStudentAnswerToDb(currentQuestion, userAns, isCorr, points);
  }, [currentQuestion, saveStudentAnswerToDb, questionResults]);

  const onClozeOptionSelect = useCallback((optionId: string, optionText: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(optionId);
    const correctAnswerId = String(currentQuestion.correctAnswer || '').toLowerCase();
    const isCorrect = optionId.toLowerCase() === correctAnswerId;
    const correctOption = currentQuestion.options.find(opt => opt.id.toLowerCase() === correctAnswerId);
    const correctAnswerDisplayText = correctOption ? correctOption.text : `ID: ${currentQuestion.correctAnswer}`;
    setAiMessage(isCorrect ? "Great job!" : `Incorrect. Correct: "${correctAnswerDisplayText}".`);
    setChatHistory(prev => [{ role: "assistant", content: isCorrect ? "Great job! That's correct." : `Not quite right. The correct answer is "${correctAnswerDisplayText}".` }]);
    handleSubmitAnswerForCloze(optionId, isCorrect);
  }, [currentQuestion, selectedAnswer, handleSubmitAnswerForCloze]);

  // --- Navigation Callbacks ---
  const handleNextQuestion = useCallback(async () => { /* ... same as previous full file ... */ 
    setShowHint(false); setAiMessage(null); 
    if (questions.length === 0) { setShowSummary(true); await finalizePracticeSessionInDb(); return; }
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    else { setShowSummary(true); await finalizePracticeSessionInDb(); } 
  }, [currentQuestionIndex, questions.length, finalizePracticeSessionInDb]);
  const restartPractice = useCallback(async () => { /* ... same ... */ if(localStorageKey) safeStorage.removeItem(localStorageKey, 'local'); setShowSummary(false); setShowLevelUp(false); await fetchContentAndStart(); }, [localStorageKey, fetchContentAndStart]);
  const exitToSubjectPractice = useCallback(async () => { /* ... same ... */ if (currentSubjectId) router.push(`/student/practice/subject/${currentSubjectId}`); else router.push('/student/practice'); }, [currentSubjectId, router]);

  // --- AI Tutor Callbacks (can be a shared hook/util) ---
  const handleSendMessage = useCallback(async () => { /* ... same as previous full file, ensure context includes passageContent ... */ 
      if (!userMessage.trim() || (!currentQuestion && questions.length > 0) ) return;
      const currentUserMessage = userMessage.trim(); setUserMessage(''); setIsLoadingAI(true);
      const currentChatHistory = [...chatHistory, { role: "user", content: currentUserMessage }];
      setChatHistory(currentChatHistory); 
      if (aiContentRef.current) setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
      try {
        let context = `Passage (Cloze Test context): "${passageContent?.substring(0,300)}..."\n`;
        if (currentQuestion) {
            const optionsText = currentQuestion.options?.map((o, i) => `${String.fromCharCode(65+i)}. ${o.text}`).join('\n') || 'N/A';
            let cAnsDisp = 'Not available';
            if(currentQuestion.correctAnswer){ if(typeof currentQuestion.correctAnswer === 'string' && currentQuestion.questionType === PrismaQuestionType.MULTIPLE_CHOICE) { const correctAnswerStr = currentQuestion.correctAnswer as string; const opt = currentQuestion.options.find(o => o.id.toLowerCase() === correctAnswerStr.toLowerCase()); cAnsDisp = opt ? opt.text : String(currentQuestion.correctAnswer); } else { cAnsDisp = JSON.stringify(currentQuestion.correctAnswer); } }
            context += `Current Blank/Question (${currentQuestion.questionNumberOnPage || 'N/A'}): ${currentQuestion.text}\nOptions: ${optionsText}\nCorrect Answer for this blank: ${cAnsDisp}\nHint: ${currentQuestion.hint || 'None'}`;
        } else {
            context += "The student is asking a general question about the cloze passage.";
        }
        const response = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{role: "system", content: `Tutor for Primary School (Chinese Cloze Passage context). Context: ${context}. Guide, don't just give answers unless asked repeatedly. Keep concise and encouraging.`}, ...currentChatHistory] }) });
        if (!response.ok) throw new Error('AI tutor request failed');
        const data = await response.json(); 
        setChatHistory(prev => [...prev, { role: "assistant", content: data.message }]);
        if (aiContentRef.current) setTimeout(() => { if (aiContentRef.current) aiContentRef.current.scrollTop = aiContentRef.current.scrollHeight; }, 100);
      } catch (error) { setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble." }]); } 
      finally { setIsLoadingAI(false); }
  }, [userMessage, currentQuestion, questions, chatHistory, passageContent]);
  const handleKeyDown = (e: React.KeyboardEvent) => { /* ... same ... */ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }};
  const handleMouseDown = (e: React.MouseEvent) => { /* ... same ... */ e.preventDefault(); isDragging.current = true; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); };
  const handleMouseMove = (e: MouseEvent) => { /* ... same ... */ if (!isDragging.current || !containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(); const newPos = Math.max(30, Math.min(70, ((e.clientX - rect.left) / rect.width) * 100)); setSplitPosition(newPos); };
  const handleMouseUp = () => { /* ... same ... */ isDragging.current = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  
  // --- Loading, Error, Summary Views ---
  // These can also be extracted into separate components if they become complex.
  const isInitialLoading = typeof loading === 'string' || (loading === true && passageContent === null && !error);

  if (isInitialLoading) { return ( <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50"><div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md"><FaSpinner className="animate-spin text-indigo-600 text-5xl mx-auto mb-6" /><h2 className="text-xl font-bold text-gray-800 mb-2">Preparing Cloze Passage</h2><p className="text-gray-600 mb-4">Loading passage and questions...</p></div></div> );}
  if (error) { return ( <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50"><div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md"><div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100"><FaExclamationTriangle className="text-red-600 text-3xl" /></div><h2 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2><p className="text-gray-600 mb-6">{error}</p><div className="flex flex-col gap-3"><Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full" onClick={fetchContentAndStart} ><FaRedo className="mr-2" /> Try Again</Button><Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full" onClick={exitToSubjectPractice} ><FaArrowLeft className="mr-2" /> Back to Subject Practice</Button></div></div></div> );}
  if (showSummary) { const totalPossibleScore = questions.reduce((acc, q) => acc + (q.pointsAwarded || 10), 0); const percentageCorrect = totalPossibleScore > 0 && questions.length > 0 ? Math.round((score / totalPossibleScore) * 100) : 0; const correctCount = questionResults.filter(r => r.correct).length;
    return ( <div className="max-w-3xl mx-auto p-4 md:p-8"> {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />} <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"> <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center"> <FaBookReader className="text-5xl mx-auto mb-4 opacity-80" /> <h1 className="text-3xl font-bold mb-2">Cloze Passage Complete: {passageTitle}</h1> <p className="text-indigo-200">Well done! Here's your performance:</p> </div> <div className="p-6 md:p-8"> <div className="text-center mb-8"> <p className="text-6xl font-bold text-indigo-600">{questions.length > 0 ? `${percentageCorrect}%` : "N/A"}</p> <p className="text-gray-600 mt-1">Your Score: {score} / {totalPossibleScore}</p> <p className="text-amber-500 font-semibold mt-1">XP Earned: +{score}</p> </div> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"> <div className="bg-gray-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-500 uppercase">Total Questions</p><p className="text-2xl font-semibold text-gray-700">{questions.length}</p></div> <div className="bg-gray-50 p-4 rounded-lg text-center"><p className="text-sm text-gray-500 uppercase">Correct Answers</p><p className="text-2xl font-semibold text-green-600">{correctCount} / {questions.length}</p></div> </div> {questions.length > 0 && (<div className="mb-6"><h3 className="text-lg font-semibold text-gray-700 mb-3">Review Your Answers:</h3><div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">{questionResults.map((result, index) => (<div key={result.id} className={`flex items-center justify-between p-3 rounded-md text-sm ${result.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><span>{result.question.startsWith("Blank") ? result.question : `Q${index+1}: ${result.question.substring(0,40)}...`}</span>{result.correct ? <FaCheck /> : <FaTimes />}</div>))}</div></div>)} <div className="flex flex-col sm:flex-row gap-3"> <Button onClick={exitToSubjectPractice} variant="outline" className="flex-1"><FaArrowLeft className="mr-2"/> Back to Subject</Button> <Button onClick={restartPractice} className="flex-1 bg-indigo-600 hover:bg-indigo-700"><FaRocket className="mr-2"/> Practice This Passage Again</Button> </div> </div> </div> </div> );
  }
  if (passageContent === null && !loading && !error) { return ( <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50"><div className="bg-white p-8 rounded-2xl shadow-lg text-center w-full max-w-md"><FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" /><h2 className="text-xl font-bold text-gray-800 mb-2">Content Not Available</h2><p className="text-gray-600 mb-6">The passage content for this practice section could not be loaded.</p><Button onClick={exitToSubjectPractice} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"><FaArrowLeft className="mr-2" /> Back to Subject</Button></div></div> ); }
  
  const noQuestionsButPassageExists = passageContent !== null && questions.length === 0 && !showSummary;
  const progressPercentageDisplay = questions.length > 0 ? ((currentQuestionIndex ) / questions.length) * 100 : 0;

  return ( 
    <div className="flex flex-col h-screen bg-gray-100" ref={containerRef}>
      {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
      <div className="flex items-center h-14 border-b px-4 bg-white shadow-sm sticky top-0 z-10">
        <button onClick={exitToSubjectPractice} className="text-gray-600 hover:text-gray-800 mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors flex items-center text-sm"> <FaArrowLeft className="mr-1.5"/> Exit</button>
        <div className="flex-1 text-center font-medium text-gray-700 text-sm md:text-base">
          {passageTitle || "Cloze Passage"} {questions.length > 0 ? `• Blank ${currentQuestion?.questionNumberOnPage || currentQuestionIndex + 1}` : (noQuestionsButPassageExists ? '• Passage Review' : '')}
        </div>
        <div className="text-amber-600 font-semibold text-sm md:text-base">{score} XP</div>
      </div>
      {questions.length > 0 && <div className="w-full h-1.5 bg-gray-200"><div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progressPercentageDisplay}%` }} /></div> }
      
      <div className="flex flex-1 overflow-hidden">
        <div className="overflow-auto bg-white custom-scrollbar" style={{ width: `${splitPosition}%` }}>
           <div className="p-4 md:p-6"> 
                <PassageDisplay 
                    passageTitle={passageTitle}
                    passageContent={passageContent}
                    questions={questions}
                    currentQuestion={currentQuestion}
                    answeredQuestions={answeredQuestions}
                    questionResults={questionResults}
                />
                
                {currentQuestion && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">
                        Options for blank <span className="font-bold text-indigo-600">{currentQuestion.questionNumberOnPage || `Question ${currentQuestionIndex + 1}`}</span>:
                    </h3>
                    <ClozeQuestionOptions 
                        currentQuestion={currentQuestion}
                        selectedAnswer={selectedAnswer}
                        isAnswerCorrect={isAnswerCorrect}
                        onAnswerSelect={onClozeOptionSelect}
                    />
                    {selectedAnswer !== null && (isAnswerCorrect === false || currentQuestion?.explanation) && ( <div className={`mt-4 p-3 rounded-md text-sm ${isAnswerCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}> {isAnswerCorrect === false && ( <p className="font-medium text-red-800 mb-1">Incorrect. Correct Answer: { String(currentQuestion?.correctAnswer) }</p>)} {currentQuestion?.explanation && (<div><p className="font-semibold text-gray-700 mt-2">Explanation:</p><p className="text-gray-600 whitespace-pre-wrap">{currentQuestion.explanation}</p></div>)} </div> )}
                    <div className="mt-5 border-t border-gray-200 pt-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                      <Button onClick={() => setShowHint(true)} disabled={selectedAnswer !== null || showHint || !currentQuestion?.hint} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 w-full sm:w-auto text-xs py-1.5 px-3"><FaLightbulb className="mr-1.5"/> Hint</Button>
                      <Button onClick={handleNextQuestion} disabled={(questions.length > 0 && selectedAnswer === null) || (typeof loading === 'string' && loading === 'submitting')} className={`px-5 py-2 text-xs w-full sm:w-auto font-semibold rounded-lg shadow-sm hover:shadow-md transition-all ${ (questions.length === 0 || selectedAnswer !== null) ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}> {(typeof loading === 'string' && loading === 'submitting') ? <FaSpinner className="animate-spin mr-2"/> : null} {(questions.length > 0 && currentQuestionIndex < questions.length - 1) ? 'Next Question →' : '🏁 Show Results'} </Button>
                    </div>
                    {showHint && currentQuestion?.hint && ( <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 shadow text-xs"><div className="flex items-start"><FaLightbulb className="text-yellow-500 mt-0.5 mr-1.5 flex-shrink-0"/><p><span className="font-semibold text-yellow-900">Hint:</span> {currentQuestion.hint}</p></div></div>)}
                  </>
                )}
                {noQuestionsButPassageExists && ( <p className="mt-6 text-center text-gray-600">No questions associated with this passage currently. You can review the passage content.</p> )}
                {(passageContent === null || (passageContent !==null && passageContent.trim() === "")) && questions.length === 0 && ( <p className="text-center text-gray-500 py-10">No content loaded for this practice group.</p> )}
            </div>
        </div>
        
        <div className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex flex-col items-center justify-center group transition-colors duration-150" onMouseDown={handleMouseDown}><div className="h-8 w-0.5 bg-gray-400 rounded-full group-hover:bg-indigo-500 transition-colors duration-150"></div></div>
        <div className="bg-indigo-50 flex flex-col overflow-hidden custom-scrollbar" style={{ width: `${100 - splitPosition - 0.5}%` }}>
          <div className="p-3 border-b border-indigo-200 bg-indigo-100 flex items-center shadow-sm"><div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-2.5 text-md font-bold"><FaCommentDots/></div><div className="flex-1"><div className="font-semibold text-indigo-800 text-sm">AI Learning Assistant</div><div className="text-xs text-indigo-600">Ask about this passage or question!</div></div><div className="text-xs text-indigo-600 flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 border border-indigo-100 shadow-sm"></span>Online</div></div>
          <div ref={aiContentRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-indigo-25 custom-scrollbar">{chatHistory.length > 0 ? ( chatHistory.map((message, index) => (<div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm ${message.role === 'user' ? 'ml-auto bg-indigo-500 text-white rounded-br-none' : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}><p className="whitespace-pre-wrap">{message.content}</p></div></div>)) ) : aiMessage ? (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><p className="whitespace-pre-wrap">{aiMessage}</p></div></div>) : (<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6"><div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-3xl text-indigo-500"><FaLightbulb/></div><p className="text-sm">Ask me anything about this, or I'll give feedback after you answer.</p></div>)}{isLoadingAI && (<div className="flex justify-start"><div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none"><div className="flex space-x-1 items-center"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div></div>)}</div>
          <div className="p-2.5 border-t border-indigo-200 bg-indigo-100"><div className="flex items-center rounded-full border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white shadow-sm"><input type="text" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about the passage/question..." className="flex-1 py-2 px-3.5 text-sm border-none outline-none bg-transparent rounded-l-full" disabled={isLoadingAI || (currentQuestion && selectedAnswer !== null) || noQuestionsButPassageExists} /><button onClick={handleSendMessage} disabled={isLoadingAI || !userMessage.trim() || (currentQuestion && selectedAnswer !== null) || noQuestionsButPassageExists} className={`w-8 h-8 m-0.5 rounded-full flex items-center justify-center transition-colors ${userMessage.trim() && !isLoadingAI && (currentQuestion ? selectedAnswer === null : true) && !noQuestionsButPassageExists ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}><FaPaperPlane className="h-3.5 w-3.5"/></button></div></div>
        </div>
      </div>
    </div>
  );
}