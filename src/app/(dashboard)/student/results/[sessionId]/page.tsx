// src/app/(dashboard)/student/results/[sessionId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeSessionType as PrismaPracticeSessionType, QuestionType as PrismaQuestionType } from '@/generated/prisma';
import { toast } from 'react-toastify';
import Image from 'next/image'; 

interface OptionClient {
  id: string;
  text: string;
}

interface QuestionForReview {
  id: number;
  text: string;
  questionType: keyof typeof PrismaQuestionType;
  options: OptionClient[];
  correctAnswer: string | string[] | Record<string, string> | null;
  explanation?: string | null;
  hint?: string | null;
  imageUrl?: string | null;
  topicName: string;
  marks: number; 
}

interface StudentAnswerForReview {
  id: string;
  submittedAnswer: any; 
  isCorrect: boolean | null;
  pointsEarned: number;
  question: QuestionForReview;
}

interface SessionDetails {
  id: string;
  title?: string | null;
  type: keyof typeof PrismaPracticeSessionType;
  endTime?: string | null; 
  score?: number | null; 
  totalQuestions?: number | null; // This should come directly from the PracticeSession record
  correctAnswers?: number | null; // This should come directly from the PracticeSession record
  xpEarned: number;
  subjectName?: string | null;
  topicName?: string | null; 
  questionGroupName?: string | null;
  studentAnswers: StudentAnswerForReview[];
  totalPossibleMarks?: number; 
}

export default function SessionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/student/practice-sessions/${sessionId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Failed to fetch session details' }));
          throw new Error(errData.error?.message || errData.error || 'Failed to fetch session details');
        }
        const data: SessionDetails = await response.json();
        console.log('SessionReviewPage: API Response Data (raw):', JSON.stringify(data, null, 2)); 

        // Calculate totalPossibleMarks from the questions *actually served* in the session
        // This is still useful for displaying "Score / Total Possible Marks"
        let calculatedTotalPossibleMarks = 0;
        if (data.studentAnswers && data.studentAnswers.length > 0) {
          data.studentAnswers.forEach(sa => {
            if (sa.question && typeof sa.question.marks === 'number') {
              calculatedTotalPossibleMarks += sa.question.marks;
            } else {
              // If a question somehow has no marks, we might default it to 1 or log a warning.
              // For mock exams, marks are crucial.
              console.warn(`SessionReviewPage: Question ID ${sa.question?.id} in studentAnswers is missing marks. Assuming 0 for totalPossibleMarks calculation for this question.`);
            }
          });
        } else if (data.totalQuestions && data.totalQuestions > 0) {
            // Fallback: if studentAnswers are empty but totalQuestions is set,
            // we can't accurately get totalPossibleMarks without knowing marks per question.
            // This scenario should ideally not happen for a completed session review.
            console.warn("SessionReviewPage: studentAnswers array is empty, but totalQuestions is set. totalPossibleMarks will be based on an assumption or might be inaccurate.");
            // We could try to estimate if we knew the average marks, but it's better to rely on actual question data.
            // For now, if studentAnswers are missing, totalPossibleMarks might not be accurate.
            // The primary display of "Correct / Total Questions" will use data.correctAnswers and data.totalQuestions directly.
        }
         console.log('SessionReviewPage: Calculated totalPossibleMarks from studentAnswers:', calculatedTotalPossibleMarks);


        setSessionDetails({
          ...data, // This data from API should already have totalQuestions and correctAnswers populated from the PracticeSession table
          totalPossibleMarks: calculatedTotalPossibleMarks,
        });

      } catch (err: any) {
        console.error('Error fetching session details:', err);
        setError(err.message || 'Failed to load session review.');
        toast.error(err.message || 'Failed to load session review.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  // Helper functions (getOptionText, renderAnswer, renderCorrectAnswerForDisplay) remain the same
  const getOptionText = (options: OptionClient[], optionId: string | number): string => {
    const opt = options.find(o => String(o.id).toLowerCase() === String(optionId).toLowerCase());
    return opt?.text || String(optionId);
  };

  const renderAnswer = (
    questionType: keyof typeof PrismaQuestionType,
    answer: any,
    options?: OptionClient[]
  ) => {
    if (answer === null || answer === undefined) return <span className="italic text-gray-500">Not answered</span>;

    switch (questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return options ? getOptionText(options, String(answer)) : String(answer);
      case PrismaQuestionType.MULTI_PART:
        if (typeof answer === 'object' && answer !== null) {
          return (
            <ul className="list-disc list-inside pl-4">
              {Object.entries(answer).map(([part, ans]) => (
                <li key={part}><strong>Part {part}:</strong> {String(ans)}</li>
              ))}
            </ul>
          );
        }
        if (typeof answer === 'string') {
            try {
                const parsed = JSON.parse(answer);
                 if (typeof parsed === 'object' && parsed !== null) {
                    return (
                        <ul className="list-disc list-inside pl-4">
                        {Object.entries(parsed).map(([part, ans]) => (
                            <li key={part}><strong>Part {part}:</strong> {String(ans)}</li>
                        ))}
                        </ul>
                    );
                }
            } catch (e) { /* Fall through if not parsable */ }
        }
        return String(answer); 
      default: 
        return String(answer);
    }
  };
  
  const renderCorrectAnswerForDisplay = (question: QuestionForReview): string | JSX.Element => {
    if (question.correctAnswer === null || question.correctAnswer === undefined) return "N/A";
  
    switch (question.questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        if (typeof question.correctAnswer === 'object' && !Array.isArray(question.correctAnswer) && (question.correctAnswer as any).id && (question.correctAnswer as any).text) {
            return `${(question.correctAnswer as any).id}. ${(question.correctAnswer as any).text}`;
        }
        const correctAnswerId = String(question.correctAnswer);
        const correctOption = question.options.find(opt => String(opt.id).toLowerCase() === correctAnswerId.toLowerCase());
        return correctOption ? `${correctOption.id}. ${correctOption.text}` : correctAnswerId;
      
      case PrismaQuestionType.MULTI_PART:
        if (typeof question.correctAnswer === 'object' && question.correctAnswer !== null && !Array.isArray(question.correctAnswer)) {
          return (
            <ul className="list-disc list-inside pl-4">
              {Object.entries(question.correctAnswer).map(([part, ans]) => (
                <li key={part}><strong>Part {part}:</strong> {String(ans)}</li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(question.correctAnswer); 
      
      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.join(' or ');
        }
        return String(question.correctAnswer);
      default:
        return String(question.correctAnswer);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Session Review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-md">
          <h3 className="text-sm font-medium text-red-800">Error Loading Review</h3>
          <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
        </div>
        <Button onClick={() => router.push("/student/results")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Back to Results
        </Button>
      </div>
    );
  }

  if (!sessionDetails) {
    return <div className="p-6 text-center text-gray-500">Session details not found.</div>;
  }
  
  // Use totalPossibleMarks for percentage if available and valid, otherwise don't show percentage for score.
  const scoreDenominator = sessionDetails.totalPossibleMarks && sessionDetails.totalPossibleMarks > 0 
                           ? sessionDetails.totalPossibleMarks 
                           : (sessionDetails.totalQuestions ?? 'N/A');
  const scorePercentage = sessionDetails.totalPossibleMarks && sessionDetails.totalPossibleMarks > 0 
    ? Math.round(((sessionDetails.score || 0) / sessionDetails.totalPossibleMarks) * 100) 
    : null; // Set to null if we can't calculate it accurately.


  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button onClick={() => router.push('/student/results')} variant="outline" className="mb-6">
        ← Back to All Results
      </Button>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            {sessionDetails.title || `${sessionDetails.type.replace(/_/g, ' ')} Review`}
          </CardTitle>
          <CardDescription>
            Completed on: {sessionDetails.endTime ? new Date(sessionDetails.endTime).toLocaleString() : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase">Score (Marks)</p>
            <p className="text-2xl font-bold text-indigo-600">
              {sessionDetails.score ?? 0} / {scoreDenominator}
              {scorePercentage !== null && ` (${scorePercentage}%)`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Correct (Questions)</p>
            <p className="text-2xl font-bold text-green-600">
              {sessionDetails.correctAnswers ?? 0} / {sessionDetails.totalQuestions ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">XP Earned</p>
            <p className="text-2xl font-bold text-amber-500">{sessionDetails.xpEarned ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Type</p>
            <p className="text-sm font-medium text-gray-700 capitalize pt-1.5">
              {sessionDetails.type?.replace(/_/g, ' ').toLowerCase() || 'Practice'}
            </p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">Questions Review</h2>
      <div className="space-y-6">
        {sessionDetails.studentAnswers.map((sa, index) => (
          <Card key={sa.id} className={`overflow-hidden ${sa.isCorrect ? 'border-green-300' : 'border-red-300'}`}>
            <CardHeader className={`p-4 ${sa.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Question {index + 1} ({sa.question.marks} {sa.question.marks === 1 ? "mark" : "marks"})</CardTitle>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sa.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {sa.isCorrect ? 'Correct' : 'Incorrect'} (+{sa.pointsEarned} XP)
                </span>
              </div>
              <CardDescription className="text-sm pt-1 text-gray-600">Topic: {sa.question.topicName}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-gray-800 whitespace-pre-wrap">{sa.question.text}</p>
              {sa.question.imageUrl && (
                <div className="my-2 flex justify-center">
                  <Image src={sa.question.imageUrl} alt="Question visual aid" width={300} height={200} className="max-w-xs max-h-64 rounded-md border object-contain" />
                </div>
              )}
              
              {sa.question.questionType === PrismaQuestionType.MULTIPLE_CHOICE && sa.question.options.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">Options:</p>
                  {sa.question.options.map(opt => (
                    <div key={opt.id} className={`pl-4 py-1 text-sm rounded 
                        ${String(sa.submittedAnswer).toLowerCase() === String(opt.id).toLowerCase() 
                            ? (sa.isCorrect ? 'bg-green-100 font-semibold' : 'bg-red-100 font-semibold') 
                            : ''}
                        ${String(renderCorrectAnswerForDisplay(sa.question)).toLowerCase().includes(` ${String(opt.id).toLowerCase()}. `) && !sa.isCorrect ? 'border border-green-500 bg-green-50' : ''}
                        ${String(renderCorrectAnswerForDisplay(sa.question)).toLowerCase() === String(opt.id).toLowerCase() && !sa.isCorrect ? 'border border-green-500 bg-green-50' : ''} 
                      `}>
                      <strong>{opt.id}.</strong> {opt.text}
                       {String(sa.submittedAnswer).toLowerCase() === String(opt.id).toLowerCase() && <span className="text-xs font-semibold ml-2"> (Your Answer)</span>}
                       {/* Simplified correct answer indication for MCQ options */}
                       {String(sa.question.correctAnswer).toLowerCase() === String(opt.id).toLowerCase() && <span className="text-xs font-semibold ml-2 text-green-700"> (Correct)</span>}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                <div className={`p-2 rounded ${sa.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {renderAnswer(sa.question.questionType, sa.submittedAnswer, sa.question.options)}
                </div>
              </div>

              {!sa.isCorrect && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Correct Answer:</p>
                  <div className="p-2 rounded bg-green-50 text-green-700">
                     {renderCorrectAnswerForDisplay(sa.question)}
                  </div>
                </div>
              )}

              {sa.question.explanation && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Explanation:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{sa.question.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}