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

interface ExamResult {
  id: string;
  submittedAt: string;
  score: number;
  totalQuestions: number;
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

export default function ResultsAnalysis({ userId }: ResultsAnalysisProps) {
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<QuestionAnalysis[]>([]);
  const [weakTopics, setWeakTopics] = useState<{ topic: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      // Fetch exam history
      const { data: examData, error: examError } = await supabase
        .from('Result')
        .select('*')
        .eq('studentId', userId)
        .eq('type', 'MOCK_EXAM')
        .order('submittedAt', { ascending: true });

      if (examError) throw examError;

      // Get the most recent exam result
      const latestExam = examData?.[examData.length - 1];
      
      if (latestExam) {
        // Fetch questions and answers for the latest exam
        const { data: questionData, error: questionError } = await supabase
          .from('Question')
          .select(`
            id,
            text,
            correctAnswer,
            Topic (
              id,
              name,
              Subject (
                name
              )
            )
          `)
          .in('id', Object.keys(latestExam.answers || {}).map(Number));

        if (questionError) throw questionError;

        // Analyze incorrect answers
        const incorrectOnes = questionData?.filter(q => {
          const userAnswer = latestExam.answers?.[q.id];
          return userAnswer !== q.correctAnswer;
        }).map(q => ({
          id: q.id,
          text: q.text,
          topicId: q.Topic.id,
          topicName: q.Topic.name,
          subjectName: q.Topic.Subject.name,
          correctAnswer: q.correctAnswer,
          userAnswer: latestExam.answers?.[q.id] || 'Not answered'
        })) || [];

        setIncorrectQuestions(incorrectOnes);

        // Analyze weak topics
        const topicCounts = incorrectOnes.reduce((acc, q) => {
          const key = `${q.subjectName} - ${q.topicName}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const sortedTopics = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count);

        setWeakTopics(sortedTopics);
      }

      setExamHistory(examData || []);
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
    total: result.totalQuestions
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
          {weakTopics.map(({ topic, count }) => (
            <div key={topic} className="flex justify-between items-center">
              <span className="font-medium">{topic}</span>
              <span className="text-red-500">
                {count} incorrect {count === 1 ? 'question' : 'questions'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Incorrect Questions Detail */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Questions to Review</h2>
        <div className="space-y-6">
          {incorrectQuestions.map((q) => (
            <div key={q.id} className="border-b pb-4">
              <h3 className="font-medium mb-2">{q.text}</h3>
              <div className="text-sm text-gray-600">
                <p>Topic: {q.topicName} ({q.subjectName})</p>
                <p className="text-red-500">Your answer: {q.userAnswer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 