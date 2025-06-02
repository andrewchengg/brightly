// src/app/(dashboard)/student/practice/chinese/listening/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "react-toastify";
import { PracticeSessionStatus, QuestionType as PrismaQuestionType, PracticeSessionType } from '@/generated/prisma';
import safeStorage from '@/lib/safeStorage';
import { useSupabaseUser } from "@/lib/hooks/auth";
import LevelUpNotification from "@/components/LevelUpNotification";
import {
  FaArrowLeft, FaSpinner, FaExclamationTriangle, FaRedo, FaCheck, FaTimes,
  FaPlay, FaPause, FaVolumeUp, FaHeadphones, FaTrophy, FaRocket, FaArrowRight
} from "react-icons/fa";

// Interfaces
interface OptionClient { id: string; text: string; }
interface QuestionClient {
  id: number;
  text: string;
  options: OptionClient[];
  correctAnswer: string | Record<string, string> | null | { id: string, text?: string };
  marks: number;
  topicName?: string;
  questionType?: keyof typeof PrismaQuestionType;
  imageUrl?: string;
  explanation?: string | null;
}
interface QuestionGroupClient {
  id: number;
  name: string;
  passageScript?: string | null; // The text script for reference/display
  audioUrl?: string | null;      // URL to the stored MP3 from Supabase Storage
}
interface PassageSet {
  group: QuestionGroupClient;
  questions: QuestionClient[];
}
interface LocalStorageLCProgress {
  passageSets: PassageSet[];
  currentPassageSetIndex: number;
  score: number;
  answeredQuestions: Record<number, string>;
  questionResults: { id: number; correct: boolean; questionText: string; userAnswer: string; correctAnswer: any; options: OptionClient[] }[];
  sessionFinalized?: boolean;
  practiceSessionId?: string | null;
  notes?: string;
  pendingAnswers?: Record<number, string>;
}

const DEFAULT_PLAY_LIMIT = 2;
const DEFAULT_MARKS_PER_QUESTION = 2;

export default function ListeningComprehensionPage() {
  const router = useRouter();
  const [passageSets, setPassageSets] = useState<PassageSet[]>([]);
  const [currentPassageSetIndex, setCurrentPassageSetIndex] = useState(0);
  const [currentQuestionStates, setCurrentQuestionStates] = useState<Array<{ selectedAnswer: string | null; isCorrect: boolean | null }>>([]);
  const [pendingAnswers, setPendingAnswers] = useState<Record<number, string>>({});

  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState<boolean | string>(true);
  const [error, setError] = useState<string | null>(null);

  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, string>>({});
  const [questionResults, setQuestionResults] = useState<LocalStorageLCProgress['questionResults']>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionFinalized, setSessionFinalized] = useState(false);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);

  const { user: authUser, isLoaded: authUserIsLoaded } = useSupabaseUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  const [notes, setNotes] = useState("");

  const currentPassageSet: PassageSet | null = passageSets.length > 0 && currentPassageSetIndex < passageSets.length
    ? passageSets[currentPassageSetIndex]
    : null;

  const localStorageKey = userId ? `lcPracticeProgress_${userId}_storedAudio_random` : null; // Key for random LC

  useEffect(() => {
    if (authUserIsLoaded) {
      if (authUser) setUserId(authUser.id);
      else { toast.error("User session not found."); router.push('/sign-in'); }
    }
  }, [authUser, authUserIsLoaded, router]);

  const createNewListeningSession = useCallback(async (fetchedPassageSets: PassageSet[]) => {
    if (!userId || fetchedPassageSets.length === 0) return null;
    const totalQuestions = fetchedPassageSets.reduce((sum, set) => sum + set.questions.length, 0);
    try {
      const response = await fetch('/api/practice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userId,
          title: `Listening Comprehension (Random) - ${new Date().toLocaleDateString()}`,
          type: PracticeSessionType.LISTENING_COMPREHENSION,
          status: PracticeSessionStatus.IN_PROGRESS,
          totalQuestions: totalQuestions,
          subjectId: 4, // Assuming Chinese is subjectId 4
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to create LC session');
      }
      const sessionData = await response.json();
      setCurrentPracticeSessionId(sessionData.id);
      return sessionData.id;
    } catch (err: any) {
      setError(`Could not start a new LC session: ${err.message}`);
      return null;
    }
  }, [userId]);

  const fetchLCSetAndStart = useCallback(async () => {
    if (!userId) return;
    if (localStorageKey) safeStorage.removeItem(localStorageKey, 'local');
    setLoading(true); setError(null);
    setCurrentPassageSetIndex(0); setScore(0); setAnsweredQuestions({});
    setQuestionResults([]); setSessionFinalized(false); setCurrentPracticeSessionId(null);
    setPlayCount(0); setNotes(""); setPendingAnswers({}); // Reset notes and pending answers for new session
    if (audioRef.current) audioRef.current.src = "";

    try {
      console.log("Frontend: Fetching a random LC set (no specific paperIdentifier).");
      const response = await fetch(`/api/questions/listening-comprehension-set`); // No paperIdentifier query param

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: `API error: ${response.status}`}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      const data: PassageSet[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No LC passages returned from API for random set.');
      
      if (!data.every(set => set.group.audioUrl)) {
          console.warn("Some fetched passages are missing audio URLs. This might cause issues.", data.filter(set => !set.group.audioUrl));
      }

      const newSessionId = await createNewListeningSession(data);
      if (newSessionId) {
        setPassageSets(data);
        if (data[0]?.questions) {
          setCurrentQuestionStates(Array(data[0].questions.length).fill({ selectedAnswer: null, isCorrect: null }));
        }
      } else {
        setError("Fetched passages but failed to start a new session in the database.");
        setPassageSets([]);
      }
    } catch (error: any) {
      setError(error.message || "Failed to load random LC passages. Check content & API.");
      setPassageSets([]);
    } finally {
      setLoading(false);
    }
  }, [userId, createNewListeningSession, localStorageKey]);

  useEffect(() => {
    if (!userId || !localStorageKey) { setLoading(true); return; }
    setLoading(true);
    const savedProgressString = safeStorage.getItem(localStorageKey, 'local');
    let resumableSessionFound = false;
    if (savedProgressString) {
      try {
        const progress: LocalStorageLCProgress = JSON.parse(savedProgressString);
        if (progress.passageSets?.length > 0 && !progress.sessionFinalized && progress.practiceSessionId) {
          setPassageSets(progress.passageSets);
          setCurrentPassageSetIndex(progress.currentPassageSetIndex || 0);
          setScore(progress.score || 0);
          setAnsweredQuestions(progress.answeredQuestions || {});
          setQuestionResults(progress.questionResults || []);
          setCurrentPracticeSessionId(progress.practiceSessionId);
          setSessionFinalized(false);
          setNotes(progress.notes || "");
          setPendingAnswers(progress.pendingAnswers || {});
          
          const passageForResume = progress.passageSets[progress.currentPassageSetIndex || 0];
          if (passageForResume?.questions) {
             setCurrentQuestionStates(
              Array(passageForResume.questions.length).fill(null).map((_, i) => {
                const qId = passageForResume.questions[i].id;
                const ans = progress.answeredQuestions[qId];
                if (ans !== undefined) {
                    const q = passageForResume.questions[i];
                    const correctAnswerId = typeof q.correctAnswer === 'string' ? q.correctAnswer : (q.correctAnswer as { id: string })?.id;
                    const isCorr = String(correctAnswerId).toLowerCase() === String(ans).toLowerCase();
                    return { selectedAnswer: ans, isCorrect: isCorr };
                }
                return {selectedAnswer: null, isCorrect: null};
              })
            );
          }
          if (progress.currentPassageSetIndex >= progress.passageSets.length) {
             setShowSummary(true); setSessionFinalized(true);
          }
          resumableSessionFound = true;
        } else { safeStorage.removeItem(localStorageKey, 'local'); }
      } catch (error) { console.error("Error parsing saved LC progress:", error); safeStorage.removeItem(localStorageKey, 'local'); }
    }
    if (!resumableSessionFound) {
        console.log("No resumable session found, fetching new LC set.");
        fetchLCSetAndStart();
    }
    else {
        console.log("Resuming LC session from localStorage.");
        setLoading(false);
    }
  }, [userId, fetchLCSetAndStart, localStorageKey]);

  useEffect(() => {
    if (!localStorageKey || typeof loading === 'string' || loading || !userId || passageSets.length === 0 || !currentPracticeSessionId || showSummary) return;
    const progress: LocalStorageLCProgress = {
      passageSets, currentPassageSetIndex, score, answeredQuestions, questionResults,
      sessionFinalized, practiceSessionId: currentPracticeSessionId, notes, pendingAnswers,
    };
    safeStorage.setItem(localStorageKey, JSON.stringify(progress), 'local');
  }, [passageSets, currentPassageSetIndex, score, answeredQuestions, questionResults, sessionFinalized, loading, userId, currentPracticeSessionId, showSummary, localStorageKey, notes, pendingAnswers]);

  useEffect(() => {
    if (currentPassageSet?.questions) {
      setCurrentQuestionStates(
        Array(currentPassageSet.questions.length).fill(null).map((_, i) => {
          const qId = currentPassageSet.questions[i].id;
          const ans = answeredQuestions[qId];
           if (ans !== undefined) {
              const q = currentPassageSet.questions[i];
              const correctAnswerId = typeof q.correctAnswer === 'string' ? q.correctAnswer : (q.correctAnswer as {id: string})?.id;
              const isCorr = String(correctAnswerId).toLowerCase() === String(ans).toLowerCase();
              return { selectedAnswer: ans, isCorrect: isCorr };
          }
          return {selectedAnswer: null, isCorrect: null};
        })
      );
      setPlayCount(0);
      setPendingAnswers({}); // Reset pending answers for new passage
      
      // Reset audio state completely when changing passages
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
        audioRef.current.removeAttribute('src');
        audioRef.current.load(); // Reset the audio element
      }
      
      // Reset all audio states
      setAudioPlaying(false);
      setAudioLoading(false);
      setAudioError(null);
    }
  }, [currentPassageSetIndex, passageSets, answeredQuestions]);

  // Manual reset function for stuck loading states
  const resetAudioState = useCallback(() => {
    console.log("Manually resetting audio state - FORCE CLEAR ALL");
    setAudioLoading(false);
    setAudioPlaying(false);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Force trigger ended event to ensure state is cleared
      audioRef.current.dispatchEvent(new Event('ended'));
    }
  }, []);

  // Add a periodic check to prevent getting stuck
  useEffect(() => {
    const checkStuckState = setInterval(() => {
      if (audioLoading && audioRef.current) {
        const audio = audioRef.current;
        // If we've been loading for more than 3 seconds and audio seems ready, force clear
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          console.warn("Force clearing stuck loading state - audio is ready");
          setAudioLoading(false);
        }
        // If audio has ended but we're still in loading state, force clear
        if (audio.ended) {
          console.warn("Force clearing loading state - audio has ended");
          setAudioLoading(false);
          setAudioPlaying(false);
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(checkStuckState);
  }, [audioLoading]);

  const handlePlayAudio = useCallback(async () => {
    if (!currentPassageSet?.group.audioUrl || audioLoading || audioPlaying) {
      if (!currentPassageSet?.group.audioUrl) toast.error("Audio for this passage is not available. Check seed data.");
      return;
    }
    if (playCount >= DEFAULT_PLAY_LIMIT) {
      toast.warn("Passage can only be played twice.");
      return;
    }
    
    console.log("Starting audio playback...");
    setAudioLoading(true);
    setAudioError(null);
    setPlayCount(prev => prev + 1);

    // Add a shorter timeout fallback to prevent permanent loading state
    const loadingTimeout = setTimeout(() => {
      console.warn("Audio loading timeout reached (3s), FORCE clearing loading state");
      setAudioLoading(false);
      setAudioError("Audio took too long to load. Try the reset button.");
    }, 3000); // Reduced to 3 seconds for faster recovery

    if (audioRef.current) {
      console.log("Playing stored audio from URL:", currentPassageSet.group.audioUrl);
      
      // Clean up previous audio
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      try {
        // Set up the audio
        audioRef.current.src = currentPassageSet.group.audioUrl;
        audioRef.current.load();
        audioRef.current.playbackRate = 1; // Play at normal speed
        
        // Add a very aggressive backup clear loading after 1 second
        const aggressiveBackup = setTimeout(() => {
          console.log("AGGRESSIVE: Force clearing loading state after 1s");
          setAudioLoading(false);
        }, 1000); // Very short timeout
        
        await audioRef.current.play();
        console.log("Audio play() call completed successfully");
        
        // Clear all timeouts and ensure state is correct
        clearTimeout(loadingTimeout);
        clearTimeout(aggressiveBackup);
        
        // FORCE clear loading and set playing
        setAudioLoading(false);
        setAudioPlaying(true);
        setAudioError(null);
        
      } catch (e) {
        console.error("Audio play() error:", e);
        setAudioError("Playback error. Please try again or check browser permissions.");
        setAudioLoading(false);
        setAudioPlaying(false);
        clearTimeout(loadingTimeout);
      }
    } else {
      setAudioError("Audio element not available.");
      setAudioLoading(false);
      clearTimeout(loadingTimeout);
    }
  }, [currentPassageSet, audioLoading, audioPlaying, playCount]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleLoadedData = () => { 
      console.log("Audio Event: loadeddata"); 
      setAudioLoading(false); // Clear loading when audio is loaded
      if (audio) audio.playbackRate = 1; 
    };
    const handleCanPlay = () => {
      console.log("Audio Event: canplay");
      setAudioLoading(false); // Clear loading when audio can start playing
    };
    const handleCanPlayThrough = () => {
      console.log("Audio Event: canplaythrough");
      setAudioLoading(false); // Clear loading when audio can play through
    };
    const handlePlay = () => { 
      console.log("Audio Event: play/playing"); 
      setAudioLoading(false); 
      setAudioPlaying(true); 
      setAudioError(null); // Clear any previous errors
      if (audio) audio.playbackRate = 1;
    };
    const handleEnded = () => { 
      console.log("Audio Event: ended - FORCE clearing all states"); 
      setAudioPlaying(false); 
      setAudioLoading(false); 
      setAudioError(null);
    };
    const handleError = (e: Event) => { 
      console.error("Audio Element Error Event:", e); 
      setAudioError("Error playing audio."); 
      setAudioLoading(false); 
      setAudioPlaying(false); 
    };
    const handlePause = () => { 
      console.log("Audio Event: pause - clearing loading state"); 
      setAudioPlaying(false); 
      setAudioLoading(false); // Also clear loading on pause
    };
    const handleLoadStart = () => {
      console.log("Audio Event: loadstart");
      setAudioLoading(true); // Set loading when starting to load
      setAudioError(null); // Clear previous errors
    };
    const handleWaiting = () => {
      console.log("Audio Event: waiting (buffering)");
      // Don't set loading true here as it might interfere with normal playback
    };
    const handleStalled = () => {
      console.log("Audio Event: stalled");
      setAudioError("Audio playback stalled. Try the reset button.");
      setAudioLoading(false);
      setAudioPlaying(false);
    };
    const handleTimeUpdate = () => {
      // Force clear loading state during playback to prevent getting stuck
      if (audio && audio.currentTime > 0 && audioLoading) {
        console.log("Audio Event: timeupdate - force clearing loading during playback");
        setAudioLoading(false);
      }
    };

    if (audio) {
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('playing', handlePlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('stalled', handleStalled);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('playing', handlePlay);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        // No need to revoke if src is a permanent URL from Supabase
      };
    }
  }, [audioLoading]); // Add audioLoading as dependency so timeupdate handler can access current state

  const awardXPAndStreak = useCallback(async (xpToAdd: number) => {
    if (!userId || sessionFinalized || xpToAdd < 0) return null;
    let levelUpDetails = null;
    try {
      if (xpToAdd > 0) {
        const xpResponse = await fetch('/api/user/award-xp', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xpAmount: xpToAdd, activityType: 'lc_practice_completion' }),
        });
        if (xpResponse.ok) { const xpData = await xpResponse.json(); toast.success(`+${xpData.awarded || xpToAdd} XP!`); if (xpData.leveledUp) levelUpDetails = { newLevel: xpData.level }; }
        else { toast.warn('Could not award XP.'); }
      }
      await fetch('/api/user/update-streak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityType: 'lc_practice_completion' }) });
    } catch (error) { toast.error("Error updating progress."); }
    return levelUpDetails;
  }, [userId, sessionFinalized]);

  const saveStudentAnswerToDb = useCallback(async (question: QuestionClient, userAnswer: string, isCorrect: boolean, points: number) => {
    if (!currentPracticeSessionId) { toast.error("No active session to save answer."); return; }
    try {
      const response = await fetch('/api/student-answers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId: currentPracticeSessionId, questionId: question.id, submittedAnswer: userAnswer, isCorrect, pointsEarned: points }),
      });
      if (!response.ok) throw new Error("Failed to save answer");
    } catch (err: any) { toast.error(`Answer save failed: ${err.message}`); }
  }, [currentPracticeSessionId]);

  const finalizeListeningSessionInDb = useCallback(async () => {
    if (!currentPracticeSessionId || !userId || sessionFinalized || !localStorageKey) return;
    setLoading('submitting');
    try {
      const correctCount = questionResults.filter(r => r.correct).length;
      const response = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', endTime: new Date().toISOString(), score, correctAnswers: correctCount, xpEarned: score }),
      });
      if (!response.ok) throw new Error('Failed to finalize session');
      setSessionFinalized(true);
      const levelUpInfo = await awardXPAndStreak(score);
      if (levelUpInfo) { setNewLevel(levelUpInfo.newLevel); setShowLevelUp(true); }
      safeStorage.removeItem(localStorageKey, 'local');
      toast.success("Listening practice completed!");
    } catch (err: any) { toast.error(`Session finalization error: ${err.message}`); }
    finally { setLoading(false); }
  }, [currentPracticeSessionId, userId, score, questionResults, awardXPAndStreak, sessionFinalized, localStorageKey, setNewLevel, setShowLevelUp]);

  const handleAnswerSelect = (questionIndex: number, optionId: string) => {
    if (!currentPassageSet) return;
    const question = currentPassageSet.questions[questionIndex];
    
    // Allow reselection before submission
    setPendingAnswers(prev => ({ ...prev, [question.id]: optionId }));
  };

  const handleSubmitAnswers = () => {
    if (!currentPassageSet) return;
    
    // Process all pending answers
    Object.entries(pendingAnswers).forEach(([questionIdStr, optionId]) => {
      const questionId = parseInt(questionIdStr);
      const question = currentPassageSet.questions.find(q => q.id === questionId);
      const questionIndex = currentPassageSet.questions.findIndex(q => q.id === questionId);
      
      if (question && questionIndex >= 0) {
        const correctAnswerId = typeof question.correctAnswer === 'string'
            ? question.correctAnswer
            : (question.correctAnswer as { id: string })?.id;

        const isCorrect = String(correctAnswerId).toLowerCase() === optionId.toLowerCase();
        const points = isCorrect ? (question.marks || DEFAULT_MARKS_PER_QUESTION) : 0;

        // Update question states
        setCurrentQuestionStates(prev => {
          const newState = [...prev];
          newState[questionIndex] = { selectedAnswer: optionId, isCorrect };
          return newState;
        });
        
        // Update answered questions
        setAnsweredQuestions(prev => ({ ...prev, [question.id]: optionId }));
        
        // Add to score if correct
        if (isCorrect) setScore(prev => prev + points);

        // Add to results
        setQuestionResults(prev => [...prev, {
          id: question.id, correct: isCorrect, questionText: question.text,
          userAnswer: optionId, correctAnswer: question.correctAnswer, options: question.options
        }]);
        
        // Save to database
        saveStudentAnswerToDb(question, optionId, isCorrect, points);
      }
    });
    
    // Clear pending answers
    setPendingAnswers({});
  };

  const handleNextPassageSet = async () => {
    if (audioRef.current && audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
    }
    if (audioRef.current && audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = "";
    }

    if (currentPassageSetIndex < passageSets.length - 1) {
      setCurrentPassageSetIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
      await finalizeListeningSessionInDb();
    }
  };

  // --- RENDER LOGIC ---
  const allQuestionsInCurrentPassageAnswered = currentPassageSet ? currentPassageSet.questions.every((q, idx) => currentQuestionStates[idx]?.selectedAnswer !== null) : false;
  const hasPendingAnswers = Object.keys(pendingAnswers).length > 0;
  const progressPercentageDisplay = passageSets.length > 0 ? ((currentPassageSetIndex + 1) / passageSets.length) * 100 : 0;

  if (typeof loading === 'string' || (loading === true && !currentPassageSet && !error)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <FaSpinner className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700">Loading Listening Practice...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-red-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-2xl">
          <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-red-600 mb-6">{error}</p>
          <Button onClick={fetchLCSetAndStart} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3">
            <FaRedo className="mr-2" />Try Again
          </Button>
        </div>
      </div>
    );
  }
  if (showSummary) {
    const totalMarksPossible = passageSets.reduce((total, set) => total + set.questions.reduce((qSum, q) => qSum + (q.marks || DEFAULT_MARKS_PER_QUESTION), 0), 0);
    const percentage = totalMarksPossible > 0 ? Math.round((score / totalMarksPossible) * 100) : 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
          <Card className="shadow-2xl border-0 overflow-hidden rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-center p-8">
              <FaTrophy className="text-6xl mx-auto mb-4 text-yellow-300 animate-bounce" />
              <CardTitle className="text-3xl font-bold mb-2">Practice Complete!</CardTitle>
              <CardDescription className="text-blue-100 text-lg">Listening Comprehension</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center bg-white">
              <div className="mb-6">
                <p className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">{percentage}%</p>
                <p className="text-slate-600 text-lg">Score: {score} / {totalMarksPossible} marks</p>
                <p className="text-amber-600 font-bold text-xl mt-2">XP Earned: +{score}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4 p-6 bg-slate-50">
              <Button 
                onClick={() => router.push('/student/practice/subject/4')} 
                variant="outline" 
                className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 text-base"
              > 
                <FaArrowLeft className="mr-2" /> Back to Chinese Practice 
              </Button>
              <Button 
                onClick={() => { setShowSummary(false); fetchLCSetAndStart(); }} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 text-base"
              > 
                <FaRocket className="mr-2" /> Try Another Set 
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  if (!currentPassageSet) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <FaHeadphones className="text-5xl text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-slate-600">No listening passages available. This might be temporary.</p>
           <Button onClick={fetchLCSetAndStart} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
            <FaRedo className="mr-2"/>Reload Passages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {showLevelUp && <LevelUpNotification level={newLevel} onClose={() => setShowLevelUp(false)} />}
      
      <div className="flex items-center h-16 border-b border-slate-200 px-6 bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/student/practice/subject/4')} 
          className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 mr-4 font-medium"
        > 
          <FaArrowLeft className="mr-2" /> Exit 
        </Button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-700 text-lg">Listening Comprehension</p>
          <p className="text-sm text-slate-500">Passage {currentPassageSetIndex + 1} of {passageSets.length}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md">
          {score} XP
        </div>
      </div>

      <div className="w-full h-2 bg-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out" 
          style={{ width: `${progressPercentageDisplay}%` }} 
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <Card className="max-w-4xl mx-auto shadow-2xl border-0 overflow-hidden rounded-xl">
          <CardHeader className="bg-gradient-to-br from-slate-800 via-slate-700 to-gray-800 text-white p-6">
            <CardTitle className="text-2xl font-bold flex items-center">
              <FaHeadphones className="mr-3 text-blue-300" />
              {currentPassageSet.group.name}
            </CardTitle>
            <CardDescription className="text-slate-300 text-base mt-2">
              Listen carefully. Plays remaining: <span className="font-bold text-blue-300">{Math.max(0, DEFAULT_PLAY_LIMIT - playCount)}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8 space-y-8 bg-white">
            <div className="text-center p-6 md:p-8 border-2 border-dashed border-blue-300 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-inner">
               <div className="mb-4">
                <FaHeadphones className="text-5xl text-blue-600 mx-auto mb-3 opacity-75" />
                <p className="text-slate-700 font-medium text-lg">Audio Passage Control</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Button 
                  onClick={handlePlayAudio} 
                  disabled={audioLoading || audioPlaying || playCount >= DEFAULT_PLAY_LIMIT || !currentPassageSet.group.audioUrl} 
                  size="lg"
                  className={`${
                    (playCount >= DEFAULT_PLAY_LIMIT && !audioPlaying && !audioLoading) || !currentPassageSet.group.audioUrl
                      ? 'bg-slate-400 cursor-not-allowed text-white hover:bg-slate-400' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                  } px-10 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none`}
                >
                  {audioLoading ? (
                    <><FaSpinner className="animate-spin mr-3" />Loading Audio...</>
                  ) : audioPlaying ? (
                    <><FaPause className="mr-3" />Playing...</>
                  ) : (
                    <><FaPlay className="mr-3" />Play Passage</>
                  )}
                </Button>
                
                {(audioLoading || audioError) && (
                  <Button 
                    onClick={resetAudioState}
                    size="lg"
                    variant="outline"
                    className="border-2 border-slate-400 text-slate-600 hover:bg-slate-100 px-6 py-4 text-base font-medium"
                  >
                    <FaRedo className="mr-2" />Reset
                  </Button>
                )}
              </div>
              {audioError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm font-medium flex items-center justify-center">
                    <FaExclamationTriangle className="mr-2"/> {audioError}
                  </p>
                </div>
              )}
              {!currentPassageSet.group.audioUrl && !audioLoading && (
                <p className="text-xs text-orange-600 mt-2">Audio for this passage is not yet available. Please try another or check back.</p>
              )}
              <audio ref={audioRef} className="hidden" />
            </div>

            <div className="space-y-6">
              {currentPassageSet.questions.map((q, qIndex) => (
                <div key={q.id} className={`p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm ${qIndex > 0 ? 'mt-8' : ''}`}>
                  <div className="mb-4">
                    <p className="text-xl font-semibold text-slate-800 mb-2 flex items-start">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-md text-base font-bold mr-4 shrink-0">
                        {qIndex + 1}
                      </span>
                      <span>{q.text}</span>
                    </p>
                    <p className="text-sm text-slate-500 ml-12">
                      <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {q.marks || DEFAULT_MARKS_PER_QUESTION} marks
                      </span>
                    </p>
                  </div>
                  
                  {q.imageUrl && (
                    <div className="mb-6 flex justify-center p-2 bg-white rounded-md border border-slate-200">
                      <img 
                        src={q.imageUrl} 
                        alt="Question visual aid" 
                        className="max-w-full max-h-72 rounded-md object-contain" 
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3 ml-12">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = currentQuestionStates[qIndex]?.selectedAnswer === opt.id;
                      const correctAnswerIdFromDB = typeof q.correctAnswer === 'string' ? q.correctAnswer : (q.correctAnswer as { id: string })?.id;
                      const isThisTheCorrectAnswerChoice = String(correctAnswerIdFromDB).toLowerCase() === opt.id.toLowerCase();
                      
                      let btnClass = "bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:border-blue-400";
                      let ringClass = "";
                      let feedbackIcon = null;

                      if (currentQuestionStates[qIndex]?.selectedAnswer !== null) {
                        if (isSelected) {
                          if (currentQuestionStates[qIndex]?.isCorrect) {
                            btnClass = "bg-green-100 border-green-500 text-green-800";
                            ringClass = "ring-2 ring-green-300";
                            feedbackIcon = <FaCheck className="text-green-600 ml-auto text-lg" />;
                          } else {
                            btnClass = "bg-red-100 border-red-500 text-red-800";
                            ringClass = "ring-2 ring-red-300";
                            feedbackIcon = <FaTimes className="text-red-600 ml-auto text-lg" />;
                          }
                        } else if (isThisTheCorrectAnswerChoice) {
                          btnClass = "bg-green-50 border-green-300 text-green-700 opacity-90";
                          feedbackIcon = <FaCheck className="text-green-600 ml-auto opacity-70 text-lg" />;
                        }
                      }
                      
                      return (
                        <Button 
                          key={opt.id} 
                          variant="outline"
                          onClick={() => handleAnswerSelect(qIndex, opt.id)}
                          disabled={currentQuestionStates[qIndex]?.selectedAnswer !== null}
                          className={`w-full justify-start text-left p-4 text-base font-medium rounded-lg flex items-center transition-all duration-150 ${btnClass} ${ringClass}`}
                        >
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold mr-4 shrink-0 transition-colors ${
                            (isSelected || pendingAnswers[q.id] === opt.id) ? 'text-white' : 'bg-slate-200 text-slate-700' 
                          } ${
                            isSelected && currentQuestionStates[qIndex]?.isCorrect ? 'bg-green-600' : 
                            isSelected && !currentQuestionStates[qIndex]?.isCorrect ? 'bg-red-600' :
                            pendingAnswers[q.id] === opt.id ? 'bg-blue-600' : ''
                          }`}>
                            {String.fromCharCode(65 + optIndex)}
                          </span> 
                          <span className="flex-1">{opt.text}</span>
                          {isSelected || pendingAnswers[q.id] === opt.id ? (
                            pendingAnswers[q.id] === opt.id && !isSelected ? (
                              <div className="ml-auto w-3 h-3 bg-blue-600 rounded-full"></div>
                            ) : (
                              feedbackIcon
                            )
                          ) : null}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {currentQuestionStates[qIndex]?.selectedAnswer !== null && !currentQuestionStates[qIndex]?.isCorrect && q.explanation && (
                    <div className="mt-6 ml-12 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg shadow">
                      <div className="flex items-start">
                        <FaExclamationTriangle className="text-amber-600 mr-3 mt-0.5 flex-shrink-0 text-lg" />
                        <div>
                          <p className="font-semibold text-amber-800 mb-1">Explanation:</p>
                          <p className="text-amber-700 text-sm leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="p-6 border-t border-slate-200 bg-slate-100">
            {hasPendingAnswers ? (
              <Button
                onClick={handleSubmitAnswers}
                disabled={(typeof loading === 'string' && loading === 'submitting')}
                className="w-full md:w-auto ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                size="lg"
              >
                <FaCheck className="mr-2" />
                Submit Answers ({Object.keys(pendingAnswers).length})
              </Button>
            ) : (
              <Button
                onClick={handleNextPassageSet}
                disabled={!allQuestionsInCurrentPassageAnswered || (typeof loading === 'string' && loading === 'submitting')}
                className="w-full md:w-auto ml-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-8 shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                size="lg"
              >
                {(typeof loading === 'string' && loading === 'submitting') ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : null}
                {currentPassageSetIndex < passageSets.length - 1 ? 'Next Passage' : 'Finish & Show Results'}
                <FaArrowRight className="ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}