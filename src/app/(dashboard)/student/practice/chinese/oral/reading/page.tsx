// src/app/(dashboard)/student/practice/chinese/oral/reading/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { FaArrowLeft, FaBookOpen, FaSpinner, FaClock, FaGraduationCap, FaExclamationTriangle } from 'react-icons/fa';
import { OralPromptType, DifficultyLevel } from '@/generated/prisma'; // Assuming these enums are correctly generated

interface OralPromptClient { // Define a client-side interface
  id: number;
  title: string;
  description?: string | null; // Allow null
  passageText?: string | null; // Allow null
  difficulty?: DifficultyLevel | null; // Allow null
  estimatedTimeSeconds?: number | null; // Allow null
  keywords: string[];
  subject?: { id: number; name: string }; // Optional for list view, but good to have
  topic?: { id: number; name: string } | null; // Allow null
}

interface OralPromptsResponse {
  oralPrompts: OralPromptClient[]; // Use the client-side interface
}

const difficultyColors = {
  [DifficultyLevel.EASY]: "bg-green-100 text-green-800",
  [DifficultyLevel.MEDIUM]: "bg-yellow-100 text-yellow-800", 
  [DifficultyLevel.HARD]: "bg-red-100 text-red-800",
  [DifficultyLevel.VERY_HARD]: "bg-purple-100 text-purple-800"
};

export default function PassageReadingListPage() {
  const router = useRouter();
  const [passages, setPassages] = useState<OralPromptClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPassages = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch only production-ready passages for students
        const response = await fetch('/api/oral-prompts?subjectId=4&promptType=PASSAGE_READING&productionReady=true');
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({error: "Server error"}));
          throw new Error(`Failed to fetch passages: ${response.status} - ${errData.error || "Unknown error"}`);
        }
        
        const data: OralPromptsResponse = await response.json();
        setPassages(data.oralPrompts || []); // Ensure passages is an array
      } catch (err: any) {
        console.error("Error fetching passages:", err);
        setError(err.message || "Failed to load passages");
      } finally {
        setLoading(false);
      }
    };

    fetchPassages();
  }, []);

  const handlePassageClick = (passageId: number) => {
    router.push(`/student/practice/chinese/oral/reading/${passageId}`);
  };

  const formatTime = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <FaArrowLeft className="mr-2" /> Back to Chinese Practice
        </Button>
        
        <div className="flex flex-col justify-center items-center min-h-[400px]">
          <FaSpinner className="animate-spin text-4xl text-indigo-500 mb-4" />
          <p className="text-lg text-gray-600">Loading passages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <FaArrowLeft className="mr-2" /> Back to Chinese Practice
        </Button>
        
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Passages</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <FaArrowLeft className="mr-2" /> Back to Chinese Practice
      </Button>

      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 md:p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FaBookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Passage Reading Practice</h1>
            <p className="text-orange-100 mt-1">朗读短文练习</p>
          </div>
        </div>
        <p className="text-orange-100 max-w-2xl">
          Choose a passage to practice your Chinese reading aloud skills. Focus on pronunciation, 
          intonation, and fluency.
        </p>
      </div>

      {passages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBookOpen className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Passages Available</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            There are no reading passages available for practice yet. Please check back later 
            or contact your teacher.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {passages.map((passage) => (
            <Card 
              key={passage.id} 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-indigo-200"
              onClick={() => handlePassageClick(passage.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-800 mb-1">
                      {passage.title}
                    </CardTitle>
                    {passage.description && (
                      <CardDescription className="text-sm text-gray-600">
                        {passage.description}
                      </CardDescription>
                    )}
                  </div>
                  {passage.difficulty && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[passage.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                      <FaGraduationCap className="inline mr-1" />
                      {passage.difficulty}
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {passage.passageText && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {passage.passageText.length > 150 
                        ? `${passage.passageText.substring(0, 150)}...` 
                        : passage.passageText}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {passage.estimatedTimeSeconds && (
                      <div className="flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        <span>{formatTime(passage.estimatedTimeSeconds)}</span>
                      </div>
                    )}
                    {passage.topic && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                          {passage.topic.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent Card's onClick from firing if button is inside
                      handlePassageClick(passage.id);
                    }}
                  >
                    Practice
                  </Button>
                </div>
                
                {passage.keywords && passage.keywords.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {passage.keywords.slice(0, 3).map((keyword, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {passage.keywords.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{passage.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 