'use client';

import { useState } from 'react';
import MockExamComponent from './MockExamComponent';

const EXAM_DURATION_MINUTES = 10;
const TOTAL_QUESTIONS = 10;

interface MockExamLandingProps {
  userId: string;
}

export default function MockExamLanding({ userId }: MockExamLandingProps) {
  const [examStarted, setExamStarted] = useState(false);

  if (!examStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-3xl mx-4">
          <h1 className="text-3xl font-bold mb-8 text-center">Mock Exam</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Exam Information</h2>
            <div className="space-y-2 text-gray-600">
              <p>Duration: {EXAM_DURATION_MINUTES} minutes</p>
              <p>Number of Questions: {TOTAL_QUESTIONS}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Follow all instructions carefully.</li>
              <li>Answer all questions.</li>
              <li>Use of calculators is <span className="underline font-semibold">NOT</span> allowed.</li>
            </ol>
          </div>

          <button
            onClick={() => setExamStarted(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  return <MockExamComponent userId={userId} examDurationMinutes={EXAM_DURATION_MINUTES} />;
} 