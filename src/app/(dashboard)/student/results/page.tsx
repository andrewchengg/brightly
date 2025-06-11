// src/app/(dashboard)/student/results/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { PracticeSessionType, PracticeSessionStatus } from '@/generated/prisma';
import { toast } from 'react-toastify';
import { FaTrophy, FaCalendarAlt, FaBook, FaPuzzlePiece, FaChartLine } from 'react-icons/fa';

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

  // Function to get emoji and color based on performance
  const getPerformanceDetails = (session: CompletedSession) => {
    const totalPossible = (session.totalQuestions || 1) * (session.type === 'MOCK_EXAM' ? 1 : 10);
    const scorePercentage = ((session.score || 0) / totalPossible) * 100;
    
    if (scorePercentage >= 80) {
      return { 
        emoji: '🏆', 
        color: 'from-green-400 to-emerald-500',
        textColor: 'text-emerald-600',
        label: 'Excellent' 
      };
    } else if (scorePercentage >= 60) {
      return { 
        emoji: '🌟', 
        color: 'from-blue-400 to-indigo-500',
        textColor: 'text-indigo-600',
        label: 'Good' 
      };
    } else if (scorePercentage >= 40) {
      return { 
        emoji: '👍', 
        color: 'from-yellow-300 to-amber-500',
        textColor: 'text-amber-600',
        label: 'Fair' 
      };
    } else {
      return { 
        emoji: '📚', 
        color: 'from-orange-300 to-red-400',
        textColor: 'text-red-500',
        label: 'Needs Practice' 
      };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-600 font-medium">Loading Your Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 max-w-md rounded-r-lg shadow-md">
          <h3 className="text-lg font-medium text-red-800">Oops! Something went wrong</h3>
          <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
        </div>
        <Button onClick={() => router.push("/student/practice")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          Go to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Your Practice Journey</h1>
            <p className="text-indigo-100 mt-1">Track your progress and see how you're improving</p>
          </div>
          <Button 
            onClick={() => router.push('/student/practice')} 
            className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-md transition-all duration-300 transform hover:scale-105"
          >
            <FaPuzzlePiece className="mr-2" /> Start New Practice
          </Button>
        </div>
      </div>

      {completedSessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-md">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaChartLine className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-gray-800">No Completed Sessions Yet</h2>
          <p className="mt-3 text-gray-500 max-w-md mx-auto">
            Complete some practice sessions to see your results and track your progress over time.
          </p>
          <div className="mt-8">
            <Button 
              onClick={() => router.push('/student/practice')} 
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 shadow-md transition-all duration-300 transform hover:scale-105"
            >
              Start Your Learning Journey
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {completedSessions.map((session) => {
            const performanceDetails = getPerformanceDetails(session);
            const totalPossible = (session.totalQuestions || 1) * (session.type === 'MOCK_EXAM' ? 1 : 10);
            const scorePercentage = ((session.score || 0) / totalPossible) * 100;
            
            return (
              <div key={session.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="relative overflow-hidden">
                  {/* Top gradient banner based on performance */}
                  <div className={`h-3 w-full bg-gradient-to-r ${performanceDetails.color}`}></div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                      <div className="flex items-center mb-3 md:mb-0">
                        <span className="text-2xl mr-3">{performanceDetails.emoji}</span>
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">
                            {session.title || `${session.subjectName || session.topicName || session.questionGroupName || 'Practice'} Session`}
                          </h2>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <FaCalendarAlt className="mr-1 text-gray-400" />
                            <span>
                              {session.endTime ? new Date(session.endTime).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
                        <span className={`text-sm font-medium ${performanceDetails.textColor}`}>
                          {performanceDetails.label}
                        </span>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full bg-gradient-to-r ${performanceDetails.color}`} 
                            style={{ width: `${Math.min(100, scorePercentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Session stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-indigo-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-indigo-500 uppercase tracking-wider font-semibold">Score</p>
                        <p className={`text-2xl font-bold mt-1 ${performanceDetails.textColor}`}>
                          {session.score ?? 0}/{totalPossible}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-green-500 uppercase tracking-wider font-semibold">Correct Answers</p>
                        <p className="text-2xl font-bold mt-1 text-green-600">
                          {session.correctAnswers ?? 0}/{session.totalQuestions ?? 0}
                        </p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-amber-500 uppercase tracking-wider font-semibold">XP Earned</p>
                        <div className="flex items-center justify-center mt-1">
                          <FaTrophy className="text-amber-500 mr-1" />
                          <p className="text-2xl font-bold text-amber-600">{session.xpEarned || 0}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Session Type</p>
                        <p className="text-sm font-semibold mt-2 text-blue-700 capitalize">
                          {session.type?.replace(/_/g, ' ').toLowerCase() || 'Practice'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Subject/Topic section */}
                    {(session.subjectName || session.topicName || session.questionGroupName) && (
                      <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4 border-t border-gray-100 pt-4">
                        {session.subjectName && (
                          <div className="flex items-center mr-4 mb-2">
                            <FaBook className="text-gray-400 mr-1" />
                            <span>{session.subjectName}</span>
                          </div>
                        )}
                        {session.topicName && (
                          <div className="flex items-center mr-4 mb-2">
                            <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                            <span>{session.topicName}</span>
                          </div>
                        )}
                        {session.questionGroupName && (
                          <div className="flex items-center mb-2">
                            <span className="w-1 h-1 rounded-full bg-gray-300 mr-2"></span>
                            <span>{session.questionGroupName}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button 
                        onClick={() => viewSessionDetails(session.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all duration-300 transform hover:translate-x-1"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
