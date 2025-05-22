// src/app/(dashboard)/student/results/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // Assuming you have this
import { createClient } from '@/lib/supabase/client'; // Using client-side Supabase
import { PracticeSessionType, PracticeSessionStatus } from '@/generated/prisma';
import { toast } from 'react-toastify';




interface CompletedSession {
  id: string;
  title?: string | null;
  type: keyof typeof PracticeSessionType;
  endTime?: Date | string | null;
  score?: number | null;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  xpEarned: number;
  subjectName?: string | null;
  topicName?: string | null;
  questionGroupName?: string | null;
}

export default function StudentResultsPage() {
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient(); // For getting current user

  useEffect(() => {
    const fetchCompletedSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view results.");
          router.push('/sign-in');
          return;
        }

        const response = await fetch('/api/student/practice-sessions/completed');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({error: 'Failed to fetch results'}));
          throw new Error(errData.error?.message || errData.error || 'Failed to fetch results');
        }
        const data: CompletedSession[] = await response.json();
        setCompletedSessions(data);
      } catch (err: any) {
        console.error('Error fetching completed sessions:', err);
        setError(err.message || 'Failed to load your practice history.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedSessions();
  }, [router, supabase]);

  const viewSessionDetails = (sessionId: string) => {
    router.push(`/student/results/${sessionId}`); 
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Your Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-md">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
        </div>
        <Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Go to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Your Practice History</h1>
        <Button onClick={() => router.push('/student/practice')} className="bg-indigo-600 hover:bg-indigo-700">
          Start New Practice
        </Button>
      </div>

      {completedSessions.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h2 className="mt-2 text-xl font-medium text-gray-900">No Completed Sessions Yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            Complete some practice sessions to see your results here.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push('/student/practice')} className="bg-indigo-600 hover:bg-indigo-700">
              Start Practicing
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {completedSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className={`p-6 border-l-4 ${ (session.score || 0) >= ((session.totalQuestions || 1) * (session.type === PracticeSessionType.MOCK_EXAM ? 1 : 10) * 0.7) ? 'border-green-500' : (session.score || 0) >= ((session.totalQuestions || 1) * (session.type === PracticeSessionType.MOCK_EXAM ? 1 : 10) * 0.4) ? 'border-yellow-500' : 'border-red-500'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                  <h2 className="text-xl font-semibold text-gray-800 mb-1 sm:mb-0">
                    {session.title || `${session.subjectName || session.topicName || session.questionGroupName || 'Practice'} Session`}
                  </h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Completed: {session.endTime ? new Date(session.endTime).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Score</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {session.score ?? 0} / { (session.totalQuestions || 0) * (session.type === PracticeSessionType.MOCK_EXAM ? 1 : 10) }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Correct</p>
                    <p className="text-2xl font-bold text-green-600">
                      {session.correctAnswers ?? 0}/{session.totalQuestions ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">XP Earned</p>
                    <p className="text-2xl font-bold text-amber-500">{session.xpEarned || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Type</p>
                    <p className="text-sm font-medium text-gray-700 capitalize pt-1.5">
                      {session.type?.replace(/_/g, ' ').toLowerCase() || 'Practice'}
                    </p>
                  </div>
                </div>
                
                {(session.subjectName || session.topicName || session.questionGroupName) && (
                    <p className="text-sm text-gray-500 mb-4">
                        {session.subjectName && <span>Subject: {session.subjectName}</span>}
                        {session.topicName && <span className="ml-2 pl-2 border-l border-gray-300">Topic: {session.topicName}</span>}
                        {session.questionGroupName && <span className="ml-2 pl-2 border-l border-gray-300">Paper: {session.questionGroupName}</span>}
                    </p>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={() => viewSessionDetails(session.id)}
                    variant="outline"
                    className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}