// src/components/MockExam/MockExamComponent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // <--- ADD THIS IMPORT
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // Not used directly here, but good to keep if planned
import { PracticeSessionType, QuestionType as PrismaQuestionType, PracticeSessionStatus } from '@/generated/prisma';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaArrowRight, FaFlagCheckered, FaSpinner } from 'react-icons/fa'; 
import { Button } from '@/components/ui/button'; 

// ... (rest of the component code remains the same as previously provided)
export const dynamic = 'force-dynamic';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: number;
  text: string;
  options?: Option[];
  correctAnswer: string | string[] | Record<string, string> | null;
  topicName: string;
  questionType: keyof typeof PrismaQuestionType;
  marks: number;
  topic: {
    id: number;
    name: string;
  };
  booklet?: 'A' | 'B';
}

interface PaperConfig {
  id: string;
  name: string;
  duration: number; 
  totalMarks: number;
  description: string;
  requirements: any; 
}

interface SubjectConfig {
  id: string;
  name: string;
  papers: PaperConfig[];
}

const subjectsConfig: SubjectConfig[] = [ 
  {
    id: 'mathematics',
    name: 'Mathematics',
    papers: [
      {
        id: 'paper1', name: 'Paper 1', duration: 60, totalMarks: 45, description: 'Booklet A & B',
        requirements: { mcq1Mark: 10, mcq2Mark: 5, short1Mark: 5, short2Mark: 10 }
      },
      {
        id: 'paper2', name: 'Paper 2', duration: 90, totalMarks: 55, description: 'Short & Long Answer',
        requirements: { short2Mark: 5, longAnswerTargetCount: 12, longAnswerTotalMarks: 45 }
      }
    ]
  }
];

interface MockExamComponentProps {
  userId: string;
  examDurationMinutes: number; 
  subjectId: string;
  paperId: string; 
  isBothPapers: boolean; 
}


export default function MockExamComponent({ userId, examDurationMinutes, subjectId, paperId, isBothPapers }: MockExamComponentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({}); 
  const [isLoading, setIsLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false); 
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<string | null>(null);
  const [calculatedTotalMarks, setCalculatedTotalMarks] = useState(0);
  
  const [currentPaper, setCurrentPaper] = useState<'paper1' | 'paper2'>(paperId as 'paper1' | 'paper2');
  const [showPaperTransition, setShowPaperTransition] = useState(false); 
  const [paper1Answers, setPaper1Answers] = useState<Record<number, string | null>>({});
  const [paper1Score, setPaper1Score] = useState(0);
  const [paper1QuestionCount, setPaper1QuestionCount] = useState(0); 

  const [textAnswer, setTextAnswer] = useState(''); 
  const [multiPartAnswers, setMultiPartAnswers] = useState<Record<string, string>>({}); 
  
  const router = useRouter(); // Now correctly defined due to import
  
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  
  const handleSubmit = useCallback(async () => {
    if (examSubmitted || isSubmitting) return;
    
    const unansweredQuestions = questions.filter(q => answers[q.id] === null || answers[q.id] === undefined);
    if (unansweredQuestions.length > 0 && !isSubmitting) { 
        const confirmSubmit = window.confirm(`You have ${unansweredQuestions.length} unanswered question(s). Are you sure you want to submit? Unanswered questions will be marked as incorrect.`);
        if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    toast.info("Submitting your exam...");
    
    let currentPaperScore = 0;
    let correctAnswersForThisPaperCount = 0;

    const studentAnswersPayload = questions.map(q => {
        const submittedAnswerRaw = answers[q.id];
        let isCorrect = false;
        let pointsEarnedThisQuestion = 0;

        if (submittedAnswerRaw !== null && submittedAnswerRaw !== undefined) {
            if (q.questionType === PrismaQuestionType.MULTIPLE_CHOICE) {
                isCorrect = String(q.correctAnswer).toLowerCase() === String(submittedAnswerRaw).toLowerCase();
            } else if (q.questionType === PrismaQuestionType.OPEN_ENDED || q.questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
                const cAns = q.correctAnswer;
                const cAnsArr = Array.isArray(cAns) ? cAns.map(cv => String(cv ?? '').trim().toLowerCase()) : [String(cAns ?? '').trim().toLowerCase()];
                isCorrect = cAnsArr.includes(String(submittedAnswerRaw).trim().toLowerCase());
            } else if (q.questionType === PrismaQuestionType.MULTI_PART && typeof q.correctAnswer === 'object' && q.correctAnswer && !Array.isArray(q.correctAnswer)) {
                try {
                    const userAnswersMap = JSON.parse(submittedAnswerRaw); 
                    const correctAnswersMap = q.correctAnswer as Record<string, string>;
                    isCorrect = true;
                    for (const part in correctAnswersMap) {
                        if ((userAnswersMap[part] || '').trim().toLowerCase() !== String(correctAnswersMap[part]).trim().toLowerCase()) {
                            isCorrect = false; break;
                        }
                    }
                } catch (e) { isCorrect = false; }
            }
        } 
        if (isCorrect) {
            pointsEarnedThisQuestion = q.marks;
            currentPaperScore += q.marks;
            correctAnswersForThisPaperCount++;
        }

        return {
            practiceSessionId: currentPracticeSessionId,
            questionId: q.id,
            submittedAnswer: submittedAnswerRaw, 
            isCorrect, 
            pointsEarned: pointsEarnedThisQuestion,
            attemptedAt: new Date().toISOString(), 
        };
    }).filter(ans => ans.practiceSessionId !== null); 
    
    if (currentPracticeSessionId && studentAnswersPayload.length > 0) {
        try {
            await fetch('/api/student-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentAnswersPayload), 
            });
        } catch (e) {
            console.error("Error saving student answers:", e);
            toast.error("Could not save all answers.");
        }
    }
    
    if (isBothPapers && currentPaper === 'paper1') {
      setPaper1Answers(answers); 
      setPaper1Score(currentPaperScore);
      setPaper1QuestionCount(questions.length); 
      console.log("Paper 1 submitted. Score:", currentPaperScore, "Questions in P1:", questions.length);
      
      setShowPaperTransition(true);
      setTimeout(async () => {
        setShowPaperTransition(false);
        setCurrentPaper('paper2');
        const paper2Config = subjectsConfig.find(s => s.id === subjectId)?.papers.find(p => p.id === 'paper2');
        setTimeRemaining((paper2Config?.duration || 90) * 60); 
        await fetchQuestionsForPaper('paper2'); 
        setIsSubmitting(false);  
      }, 3000); 
    } else {
      let finalScore = currentPaperScore;
      let finalCorrectAnswersCount = correctAnswersForThisPaperCount;
      let finalTotalQuestions = questions.length; 

      if (isBothPapers && currentPaper === 'paper2') {
        finalScore += paper1Score; 
        finalTotalQuestions += paper1QuestionCount; 
        console.log("Paper 2 submitted. P2 Score:", currentPaperScore, "Total Score:", finalScore, "Total Questions for Both:", finalTotalQuestions);
      } else {
        console.log("Single paper submitted. Score:", finalScore, "Total Questions:", finalTotalQuestions);
      }

      if (currentPracticeSessionId) {
        try {
            await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: PracticeSessionStatus.COMPLETED,
                endTime: new Date().toISOString(),
                score: finalScore, 
                correctAnswers: finalCorrectAnswersCount, 
                totalQuestions: finalTotalQuestions,     
                xpEarned: finalScore, 
              }),
            });
        } catch(e){
            console.error("Error finalizing session:", e);
            toast.error("Could not finalize session details.");
        }
      }
      setExamSubmitted(true);
      toast.success(`Exam Submitted! Your Score: ${finalScore}`);
      router.push(`/student/results/${currentPracticeSessionId || 'summary'}`); 
    }
  }, [examSubmitted, isSubmitting, questions, answers, currentPracticeSessionId, router, isBothPapers, currentPaper, paper1Score, subjectId, paper1QuestionCount]);

  useEffect(() => { 
    if (!examStarted || timeRemaining <= 0 || examSubmitted) {
        if (timeRemaining <=0 && examStarted && !examSubmitted && !isSubmitting) { 
            handleSubmit();
        }
        return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, timeRemaining, examSubmitted, isSubmitting, handleSubmit]);

  const fetchQuestionsForPaper = async (paperToFetch: string) => {
    setIsLoading(true);
    try {
      const subjectConfigFound = subjectsConfig.find(s => s.id === subjectId);
      const paperConfig = subjectConfigFound?.papers.find(p => p.id === paperToFetch);
      if (!subjectConfigFound || !paperConfig) throw new Error(`Configuration for ${subjectId} - ${paperToFetch} not found.`);

      const response = await fetch(`/api/questions/${subjectId}/${paperToFetch}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper: paperToFetch, requirements: paperConfig.requirements }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      const fetchedQuestions: Question[] = await response.json();
      
      if (!fetchedQuestions || fetchedQuestions.length === 0) throw new Error('No questions returned from API for this paper.');
      
      setQuestions(fetchedQuestions);
      setCalculatedTotalMarks(fetchedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0));
      setCurrentQuestionIndex(0); 
      if (!isBothPapers || (isBothPapers && paperToFetch === 'paper1')) {
        setAnswers({}); 
      }
      setTextAnswer('');
      setMultiPartAnswers({});

      if (currentPracticeSessionId) {
        let sessionTotalQuestions = fetchedQuestions.length;
        if (isBothPapers && paperToFetch === 'paper2') {
            sessionTotalQuestions += paper1QuestionCount; 
        }
        if (!isBothPapers || (isBothPapers && paperToFetch === 'paper2')) {
            try {
                const updateTotalQuestionsResponse = await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ totalQuestions: sessionTotalQuestions }),
                });
                if (!updateTotalQuestionsResponse.ok) {
                    console.error("Failed to update totalQuestions for session:", await updateTotalQuestionsResponse.text());
                } else {
                    console.log(`MockExam: Updated totalQuestions for session ${currentPracticeSessionId} to ${sessionTotalQuestions}`);
                }
            } catch (e) { console.error("Error updating totalQuestions for session:", e); }
        } else if (isBothPapers && paperToFetch === 'paper1') {
            // paper1QuestionCount is set in handleSubmit if this logic path is taken
            // Or if starting "Both", it's set after first fetch
            setPaper1QuestionCount(fetchedQuestions.length); 
             try {
                await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ totalQuestions: fetchedQuestions.length }),
                });
            } catch(e) { console.error("Error initially setting totalQuestions for P1 of Both:", e)}
        }
      }
    } catch (error: any) {
      setError('Failed to fetch questions: ' + (error.message || 'Unknown error'));
      toast.error('Failed to load questions: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const initializeExam = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const initialPaperConfig = subjectsConfig.find(s => s.id === subjectId)?.papers.find(p => p.id === paperId); 
      if (!initialPaperConfig) throw new Error ("Initial paper configuration not found for mock exam.");
      setTimeRemaining(initialPaperConfig.duration * 60);

      let sessionTitle = `${subjectId.charAt(0).toUpperCase() + subjectId.slice(1)} - ${isBothPapers ? 'Full Mock Exam' : (initialPaperConfig.name)}`;
      
      const newSessionResponse = await fetch('/api/practice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userId,
          title: `${sessionTitle} - Mock Exam - ${new Date().toLocaleDateString()}`,
          type: PracticeSessionType.MOCK_EXAM,
          status: PracticeSessionStatus.IN_PROGRESS,
          examDurationMinutes: examDurationMinutes, 
          totalQuestions: 0, 
        }),
      });

      if (!newSessionResponse.ok) {
          const errorData = await newSessionResponse.json();
          throw new Error(errorData.error?.message || 'Failed to create practice session');
      }
      const sessionData = await newSessionResponse.json();
      setCurrentPracticeSessionId(sessionData.id);

      await fetchQuestionsForPaper(paperId); 
      setExamStarted(true);

    } catch (error: any) {
      setError("Failed to start exam: " + (error.message || "Unknown error"));
      toast.error("Failed to start exam: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeExam();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
        const currentQ = questions[currentQuestionIndex];
        const savedAnswerString = answers[currentQ.id];
        
        setTextAnswer(''); 
        setMultiPartAnswers({});

        if(savedAnswerString !== null && savedAnswerString !== undefined) {
            if (currentQ.questionType === PrismaQuestionType.OPEN_ENDED || currentQ.questionType === PrismaQuestionType.FILL_IN_THE_BLANK) {
                setTextAnswer(savedAnswerString);
            } else if (currentQ.questionType === PrismaQuestionType.MULTI_PART) {
                try { setMultiPartAnswers(JSON.parse(savedAnswerString)); } catch { setMultiPartAnswers({}); }
            }
        }
    }
  }, [currentQuestionIndex, questions, answers]);

  const handleAnswerChange = (questionId: number, answer: string | Record<string, string>) => {
    if (timeRemaining <= 0 || examSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: typeof answer === 'string' ? answer : JSON.stringify(answer) }));
  };
  
  const handleTextAnswerInput = (value: string) => { // Renamed from handleTextAnswerChange to avoid confusion
    setTextAnswer(value);
    if (currentQuestionData) { 
        handleAnswerChange(currentQuestionData.id, value);
    }
  };

  const handleMultiPartAnswerInput = (partKey: string, value: string) => { // Renamed
    const newMultiPartAns = {...multiPartAnswers, [partKey]: value};
    setMultiPartAnswers(newMultiPartAns);
     if (currentQuestionData) {
        handleAnswerChange(currentQuestionData.id, newMultiPartAns);
    }
  };
  
  const handleNavigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
        setCurrentQuestionIndex(index);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleCancel = async () => {
    const confirmExit = window.confirm("Are you sure you want to cancel this exam? Your progress will be paused but not submitted.");
    if (!confirmExit) return;

    if (currentPracticeSessionId) {
      try {
        await fetch(`/api/practice-sessions/${currentPracticeSessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: PracticeSessionStatus.PAUSED, endTime: new Date().toISOString() }),
        });
        toast.info("Exam paused.");
      } catch(e) {
        toast.error("Could not pause session.");
      }
    }
    router.push('/student/mock-exam');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 0 || seconds < 0) return "00:00";
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading && !examStarted) return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-4xl text-indigo-600" /><p className="ml-3">Preparing mock exam...</p></div>;
  if (isLoading && examStarted && questions.length === 0 && !error) return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-4xl text-indigo-600" /><p className="ml-3">Loading questions...</p></div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error} <Button onClick={initializeExam}>Try Again</Button></div>;

  if (showPaperTransition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Paper 1 Completed</h2>
          <p className="text-gray-600 mb-4">Preparing Paper 2...</p>
          <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto"/>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && examStarted && !isLoading) return <div className="text-center p-8">No questions available for this paper. Please contact support.</div>;
  const currentQuestionData = questions[currentQuestionIndex];
  if (!currentQuestionData) return <div className="text-center p-8">Loading question data...</div>;
  
  const questionType = currentQuestionData.questionType as keyof typeof PrismaQuestionType | undefined;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col p-4">
      <div className="max-w-4xl mx-auto w-full bg-white shadow-xl rounded-lg p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
          <div className="mb-3 sm:mb-0">
            <h1 className="text-xl md:text-2xl font-bold text-indigo-700">
                {subjectId.charAt(0).toUpperCase() + subjectId.slice(1)} Mock Exam - {currentPaper === 'paper1' ? "Paper 1" : "Paper 2"}
            </h1>
            <p className="text-xs md:text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length} | Marks: {currentQuestionData.marks}</p>
          </div>
          <div className={`text-lg md:text-xl font-mono font-semibold px-3 py-1 rounded-md ${timeRemaining <= 60 && timeRemaining > 0 ? 'text-red-600 bg-red-100 animate-pulse' : timeRemaining <= 0 ? 'text-red-700 bg-red-200' : 'text-gray-700 bg-gray-100'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Question Navigation Bubbles */}
        <div className="mb-6 flex flex-wrap gap-1.5 justify-center max-w-full overflow-x-auto pb-2">
            {questions.map((q, index) => (
                <button
                    key={q.id}
                    onClick={() => handleNavigateToQuestion(index)}
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-xs font-medium flex items-center justify-center border-2 transition-all shrink-0
                        ${index === currentQuestionIndex ? 'bg-indigo-600 text-white border-indigo-700 scale-110 ring-2 ring-indigo-300' :
                         (answers[q.id] !== null && answers[q.id] !== undefined) ? 'bg-green-500 text-white border-green-600' :
                         'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300'}`}
                    title={`Go to Question ${index + 1}`}
                >
                    {index + 1}
                </button>
            ))}
        </div>

        {/* Current Question Display */}
        <div className="mb-8 p-4 border rounded-md bg-indigo-50 min-h-[150px]">
          <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-3 leading-relaxed whitespace-pre-wrap">{currentQuestionData.text}</h3>
           {currentQuestionData.imageUrl && <img src={currentQuestionData.imageUrl} alt="Question Visual" className="my-3 rounded-md border max-h-60 mx-auto object-contain"/>}
            <p className="text-xs text-gray-600 mt-1">Topic: {currentQuestionData.topicName}</p>
        </div>

        {/* Answer Input Area */}
        <div className="min-h-[150px] mb-6"> 
            {questionType === PrismaQuestionType.MULTIPLE_CHOICE && currentQuestionData.options && (
                <div className="space-y-2">
                    {currentQuestionData.options.map((option, index) => {
                        const optionId = option.id;
                        const optionText = option.text;
                        const optionLetter = String.fromCharCode(65 + index);
                        const isSelected = answers[currentQuestionData.id] === optionId;
                        return (
                            <button key={option.id || index}
                                onClick={() => handleOptionSelect(currentQuestionData.id, optionId)}
                                disabled={timeRemaining <= 0 || examSubmitted}
                                className={`w-full text-left p-3 rounded-md transition-all duration-150 text-sm border
                                    ${isSelected ? "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500" : "bg-white hover:bg-gray-100 border-gray-300"}
                                    ${(timeRemaining <= 0 || examSubmitted) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <span className="font-semibold mr-2">{optionLetter}.</span> {optionText}
                            </button>
                        );
                    })}
                </div>
            )}

            {(questionType === PrismaQuestionType.OPEN_ENDED || questionType === PrismaQuestionType.FILL_IN_THE_BLANK) && (
                <div className="mt-2">
                    <label htmlFor={`text-answer-${currentQuestionData.id}`} className="block text-sm font-medium text-gray-700 mb-1">Your Answer:</label>
                    <textarea id={`text-answer-${currentQuestionData.id}`} value={textAnswer}
                        onChange={(e) => handleTextAnswerInput(e.target.value)} 
                        placeholder="Type your answer here..." disabled={timeRemaining <= 0 || examSubmitted}
                        rows={questionType === PrismaQuestionType.OPEN_ENDED ? 5 : 3}
                        className={`w-full p-3 text-sm rounded-md border ${timeRemaining <= 0 || examSubmitted ? "border-gray-300 bg-gray-100" :"border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"}`} 
                    />
                </div>
            )}

            {questionType === PrismaQuestionType.MULTI_PART && typeof currentQuestionData.correctAnswer === 'object' && currentQuestionData.correctAnswer && !Array.isArray(currentQuestionData.correctAnswer) && (
                <div className="mt-2 space-y-3">
                    {Object.keys(currentQuestionData.correctAnswer).map((partKey) => (
                        <div key={partKey}>
                            <label htmlFor={`mp-${currentQuestionData.id}-${partKey}`} className="block text-sm font-medium text-gray-700 mb-1">Part {partKey.toUpperCase()}:</label>
                            <input type="text" id={`mp-${currentQuestionData.id}-${partKey}`} value={multiPartAnswers[partKey] || ''}
                                onChange={(e) => handleMultiPartAnswerInput(partKey, e.target.value)} 
                                placeholder={`Answer for part ${partKey.toUpperCase()}`} disabled={timeRemaining <= 0 || examSubmitted}
                                className={`w-full p-3 text-sm rounded-md border ${timeRemaining <= 0 || examSubmitted ? "border-gray-300 bg-gray-100" : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"}`} />
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
          <Button
            onClick={handlePrevious}
            disabled={isFirstQuestion || examSubmitted || isSubmitting}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <FaArrowLeft className="mr-2"/> Previous
          </Button>
          
          <Button
            onClick={handleCancel}
            disabled={examSubmitted || isSubmitting}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            Cancel Exam
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={examSubmitted || isSubmitting || (timeRemaining <=0 && !isSubmitting)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? <FaSpinner className="animate-spin mr-2"/> : null} 
              {isBothPapers && currentPaper === 'paper1' ? 'Submit Paper 1 & Start Paper 2' : <>Submit Exam <FaFlagCheckered className="ml-2"/></>}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={examSubmitted || isSubmitting}
              className="w-full sm:w-auto"
            >
              Next <FaArrowRight className="ml-2"/>
            </Button>
          )}
        </div>

        {examSubmitted && <div className="mt-4 text-center text-green-600">Exam submitted successfully! Redirecting to results...</div>}
        {timeRemaining <= 0 && !examSubmitted && !isSubmitting && <div className="mt-4 text-center text-red-600">Time's up! Your exam is being submitted...</div>}
      </div>
    </div>
  );
}