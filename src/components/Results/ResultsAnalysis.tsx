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
  sessions: Array<{
    id: string;
    endTime: Date | null;
    totalQuestions: number | null;
    correctAnswers: number | null;
    totalMarksEarned: number | null;
    totalPossibleMarks: number | null;
    durationSeconds: number | null;
    xpEarned: number | null;
  }>;
}

interface ResultData {
  id: string;
  date: Date | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  totalMarksEarned: number | null;
  totalPossibleMarks: number | null;
  durationSeconds: number | null;
  xpEarned: number | null;
  accuracy: number;
}

export default function ResultsAnalysis({ sessions }: ResultsAnalysisProps) {
  const results: ResultData[] = sessions.map((result) => ({
    id: result.id,
    date: result.endTime,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    totalMarksEarned: result.totalMarksEarned,
    totalPossibleMarks: result.totalPossibleMarks,
    durationSeconds: result.durationSeconds,
    xpEarned: result.xpEarned,
    accuracy: result.totalPossibleMarks && result.totalMarksEarned
      ? Math.round((result.totalMarksEarned / result.totalPossibleMarks) * 100)
      : 0,
  }));

  const averageScore = results.length > 0
    ? Math.round(results.reduce((acc, result) => acc + (result.totalMarksEarned || 0), 0) / results.length)
    : 0;

  const averageAccuracy = results.length > 0
    ? Math.round(results.reduce((acc, result) => acc + result.accuracy, 0) / results.length)
    : 0;

  const totalXP = results.reduce((acc, result) => acc + (result.xpEarned || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Average Score</h3>
          <p className="text-3xl font-bold text-blue-600">{averageScore}</p>
          <p className="text-sm text-gray-500">marks per session</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Average Accuracy</h3>
          <p className="text-3xl font-bold text-green-600">{averageAccuracy}%</p>
          <p className="text-sm text-gray-500">correct answers</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total XP</h3>
          <p className="text-3xl font-bold text-purple-600">{totalXP}</p>
          <p className="text-sm text-gray-500">experience points</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Recent Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Score</th>
                <th className="text-right py-2">Accuracy</th>
                <th className="text-right py-2">XP</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b">
                  <td className="py-2">
                    {result.date?.toLocaleDateString() || "N/A"}
                  </td>
                  <td className="text-right py-2">
                    {result.totalMarksEarned ?? 0} / {result.totalPossibleMarks ?? 0}
                  </td>
                  <td className="text-right py-2">{result.accuracy}%</td>
                  <td className="text-right py-2">{result.xpEarned ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
