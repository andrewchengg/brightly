'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

export default function APIKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  
  // Check if key is already set
  useEffect(() => {
    async function checkKeyStatus() {
      try {
        const response = await fetch('/api/ai-tutor/set-key');
        const data = await response.json();
        setIsKeySet(data.keySet);
      } catch (err) {
        console.error('Error checking API key status:', err);
      }
    }
    
    checkKeyStatus();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-tutor/set-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set API key');
      }
      
      setIsKeySet(true);
      setApiKey(''); // Clear input for security
      
      // Test the connection
      const testResponse = await fetch('/api/ai-tutor/test');
      const testData = await testResponse.json();
      
      if (testData.status === 'error') {
        setError(`API key set, but connection test failed: ${testData.message}`);
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!showPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setShowPanel(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg hover:bg-gray-700"
        >
          {isKeySet ? '✓ API Key Set' : 'Set OpenAI API Key'}
        </button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-80 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Set OpenAI API Key</h3>
        <button 
          onClick={() => setShowPanel(false)} 
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {isKeySet && !error ? (
        <div className="mb-4 text-green-600 flex items-center">
          <span className="mr-2">✓</span> API key is set and working
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <Button 
            type="submit" 
            disabled={isLoading || !apiKey.trim()}
            className="w-full"
          >
            {isLoading ? 'Setting...' : 'Set API Key'}
          </Button>
        </form>
      )}
      
      <p className="mt-3 text-xs text-gray-500">
        This key is stored temporarily and only used for the AI tutor feature.
      </p>
    </div>
  );
} 