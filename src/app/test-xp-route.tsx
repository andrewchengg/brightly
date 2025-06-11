'use client';

import React, { useState } from 'react';

interface ApiResponse {
  success?: boolean;
  error?: string;
  currentXp?: number;
  awarded?: number;
  level?: number;
  leveledUp?: boolean;
  previousLevel?: number;
  nextLevelXp?: number;
  progressToNextLevel?: number;
  details?: any;
  [key: string]: any;
}

export default function TestXP() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpAmount, setXpAmount] = useState(10);

  const testAwardXP = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/award-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xpAmount, activityType: 'test' }),
      });

      const data = await response.json() as ApiResponse;
      setResult(data);
      
      if (!response.ok) {
        setError(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error testing XP:', err);
      setError(`Failed to test XP: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test XP Award</h1>
      
      <div className="mb-4">
        <label className="block mb-2">XP Amount:</label>
        <input 
          type="number" 
          value={xpAmount} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setXpAmount(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      
      <button 
        onClick={testAwardXP}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Award XP'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 
