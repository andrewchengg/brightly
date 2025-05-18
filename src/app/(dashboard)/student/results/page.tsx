'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Topic {
  id: number;
  name: string;
}

interface Question {
  id: number;
  text: string;
  correctAnswer: any;
  pointsAwarded: number;
  topic: Topic;
  questionType: string;
  options: any;
}

interface StudentAnswer {
  id: string;
  practiceSessionId: string;
  questionId: number;
  submittedAnswer: any;
  isCorrect: boolean;
  pointsEarned: number;
  attemptedAt: string;
  feedback?: string;
}

interface DatabaseStudentAnswer extends StudentAnswer {
  question: Question;
}

interface PracticeSession {
  id: string;
  studentId: string;
  title?: string;
  status: 'NOT_STARTED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  practiceType: 'PRACTICE' | 'MOCK_EXAM' | 'ASSIGNMENT_ATTEMPT';
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  xpEarned: number;
  examDurationMinutes?: number;
  questions: Question[];
  studentAnswers: StudentAnswer[];
}

interface DatabasePracticeSession extends Omit<PracticeSession, 'questions' | 'studentAnswers'> {
  studentAnswers: DatabaseStudentAnswer[];
}

export default function ResultsPage() {
  const [result, setResult] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch the most recent practice session for this user with nested student answers and questions
      const { data: session, error: sessionError } = await supabase
        .from('PracticeSession')
        .select(`
          *,
          studentAnswers:StudentAnswer(
            *,
            question:Question(
              *,
              topic:Topic(*)
            )
          )
        `)
        .eq('studentId', user.id)
        .eq('practiceType', 'MOCK_EXAM')
        .eq('status', 'COMPLETED')
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();

      if (sessionError) throw sessionError;
      if (!session) {
        setError('No exam results found');
        setLoading(false);
        return;
      }

      const dbSession = session as DatabasePracticeSession;

      // Transform the data to match our interface
      const transformedSession: PracticeSession = {
        ...dbSession,
        questions: dbSession.studentAnswers.map(answer => answer.question).filter(Boolean),
        studentAnswers: dbSession.studentAnswers.map(answer => ({
          id: answer.id,
          practiceSessionId: answer.practiceSessionId,
          questionId: answer.questionId,
          submittedAnswer: answer.submittedAnswer,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          attemptedAt: answer.attemptedAt,
          feedback: answer.feedback
        }))
      };

      setResult(transformedSession);
    } catch (err: any) {
      console.error('Error fetching results:', err);
      setError(err.message || 'Failed to fetch exam results');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeTaken = () => {
    if (!result?.startTime || !result?.endTime) return 'N/A';
    
    const start = new Date(result.startTime);
    const end = new Date(result.endTime);
    const diffInMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    return `${diffInMinutes} minutes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-red-600">
            {error || 'No results found'}
          </h2>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Mock Exam Results</h1>
            <p className="text-blue-100">
              Completed on {result.endTime ? new Date(result.endTime).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-600 text-sm mb-1">Score</p>
              <p className="text-3xl font-bold text-blue-600">
                {result.score || 0}/{(result.totalQuestions || 0) * 10}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-600 text-sm mb-1">Time Taken</p>
              <p className="text-3xl font-bold text-blue-600">{calculateTimeTaken()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-600 text-sm mb-1">XP Earned</p>
              <p className="text-3xl font-bold text-blue-600">{result.xpEarned}</p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Question Analysis</h2>
            <div className="space-y-6">
              {result.questions.map((question, index) => {
                const studentAnswer = result.studentAnswers.find(
                  (a) => a.questionId === question.id
                );
                
                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-lg border ${
                      studentAnswer?.isCorrect
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium">
                        Question {index + 1}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          studentAnswer?.isCorrect
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {studentAnswer?.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{question.text}</p>
                    <div className="text-sm">
                      <p className="text-gray-600">
                        Topic: {question.topic.name}
                      </p>
                      <p className="text-gray-600">
                        Points: {studentAnswer?.pointsEarned || 0}/{question.pointsAwarded}
                      </p>
                      {!studentAnswer?.isCorrect && (
                        <div className="mt-2 text-red-600">
                          <p>Correct Answer: {Array.isArray(question.correctAnswer) 
                            ? question.correctAnswer.join(', ') 
                            : question.correctAnswer}
                          </p>
                          <p>Your Answer: {studentAnswer?.submittedAnswer || 'Not answered'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 flex justify-between">
            <button
              onClick={() => router.push('/student')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push('/student/mock-exam')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Another Mock Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 