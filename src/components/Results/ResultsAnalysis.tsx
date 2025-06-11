import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ResultsAnalysisProps {
  userId: string;
}

interface StudentAnswer {
  questionId: number;
  submittedAnswer: string;
  isCorrect: boolean;
  question: {
    text: string;
    correctAnswer: string;
    topic: {
      id: number;
      name: string;
      subject: {
        name: string;
      };
    };
  };
}

interface PracticeSession {
  id: string;
  title: string;
  type: string;
  totalQuestions: number;
  studentAnswers: StudentAnswer[];
}

interface Result {
  id: string;
  submittedAt: string;
  score: number;
  practiceSession: PracticeSession;
}

interface QuestionAnalysis {
  id: number;
  text: string;
  topicId: number;
  topicName: string;
  subjectName: string;
  correctAnswer: string;
  userAnswer: string;
}

// Type for the data that comes from Supabase
interface SupabaseResult {
  id: string;
  score: number;
  submittedAt: string;
  practiceSession: {
    id: string;
    title: string;
    type: string;
    totalQuestions: number;
    studentAnswers: {
      questionId: number;
      submittedAnswer: string;
      isCorrect: boolean;
      question: {
        text: string;
        correctAnswer: string;
        topic: {
          id: number;
          name: string;
          subject: {
            name: string;
          };
        };
      };
    }[];
  };
}

export default function ResultsAnalysis({ userId }: ResultsAnalysisProps) {
  const [examHistory, setExamHistory] = useState<Result[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<QuestionAnalysis[]>([]);
  const [weakTopics, setWeakTopics] = useState<{ topic: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      // Fetch results with related practice sessions and student answers
      const { data: resultsData, error: resultsError } = await supabase
        .from('Result')
        .select(`
          id,
          score,
          submittedAt,
          practiceSession:PracticeSession (
            id,
            title,
            type,
            totalQuestions,
            studentAnswers:StudentAnswer (
              questionId,
              submittedAnswer,
              isCorrect,
              question:Question (
                text,
                correctAnswer,
                topic:Topic (
                  id,
                  name,
                  subject:Subject (name)
                )
              )
            )
          )
        `)
        .eq('studentId', userId)
        .order('submittedAt', { ascending: false });

      if (resultsError) throw resultsError;
      
      if (!resultsData || resultsData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Cast and transform the result data to match our interface
      const typedResults = (resultsData as unknown[]).map((result: any): Result => ({
        id: result.id,
        score: result.score,
        submittedAt: result.submittedAt,
        practiceSession: {
          id: result.practiceSession?.id,
          title: result.practiceSession?.title,
          type: result.practiceSession?.type,
          totalQuestions: result.practiceSession?.totalQuestions,
          studentAnswers: result.practiceSession?.studentAnswers || []
        }
      }));
      
      // Set the exam history
      setExamHistory(typedResults);
      
      // Process the latest exam result for detailed analysis
      if (typedResults.length > 0) {
        const latestResult = typedResults[0];
        const studentAnswers = latestResult.practiceSession.studentAnswers || [];
        
        // Find incorrect answers
        const incorrectOnes = studentAnswers
          .filter(answer => !answer.isCorrect)
          .map(answer => ({
            id: answer.questionId,
            text: answer.question.text,
            topicId: answer.question.topic.id,
            topicName: answer.question.topic.name,
            subjectName: answer.question.topic.subject.name,
            correctAnswer: answer.question.correctAnswer,
            userAnswer: answer.submittedAnswer || 'Not answered'
          }));
        
        setIncorrectQuestions(incorrectOnes);

        // Analyze weak topics
        const topicCounts = incorrectOnes.reduce((acc: Record<string, number>, q) => {
          const key = `${q.subjectName} - ${q.topicName}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const sortedTopics = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count);

        setWeakTopics(sortedTopics);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading results...</div>;
  }

  if (examHistory.length === 0) {
    return <div className="text-center p-4">No exam history available.</div>;
  }

  const chartData = examHistory.map(result => ({
    date: new Date(result.submittedAt).toLocaleDateString(),
    score: result.score,
    total: result.practiceSession?.totalQuestions || 0
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Performance Trend Graph */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance Trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                name="Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak Topics Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Areas for Improvement</h2>
        <div className="space-y-4">
          {weakTopics.length > 0 ? (
            weakTopics.map(({ topic, count }) => (
              <div key={topic} className="flex justify-between items-center">
                <span className="font-medium">{topic}</span>
                <span className="text-red-500">
                  {count} incorrect {count === 1 ? 'question' : 'questions'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-600">Great job! No weak areas identified in your latest exam.</p>
          )}
        </div>
      </div>

      {/* Incorrect Questions Detail */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Questions to Review</h2>
        <div className="space-y-6">
          {incorrectQuestions.length > 0 ? (
            incorrectQuestions.map((q) => (
              <div key={q.id} className="border-b pb-4">
                <h3 className="font-medium mb-2">{q.text}</h3>
                <div className="text-sm text-gray-600">
                  <p>Topic: {q.topicName} ({q.subjectName})</p>
                  <p className="text-red-500">Your answer: {q.userAnswer}</p>
                  <p className="text-green-600">Correct answer: {q.correctAnswer}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No incorrect questions in your latest exam. Great work!</p>
          )}
        </div>
      </div>
    </div>
  );
} 
