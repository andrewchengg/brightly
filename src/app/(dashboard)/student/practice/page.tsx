"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Topic } from "@prisma/client";

export default function StudentPractice() {
  const router = useRouter();
  const [topics, setTopics] = useState<Array<Topic & { masteryPercentage: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const response = await fetch("/api/topics");
        if (!response.ok) {
          throw new Error("Failed to fetch topics");
        }
        const data = await response.json();
        
        // Add masteryPercentage to each topic (default 0%)
        const topicsWithMastery = data.map((topic: Topic) => ({
          ...topic,
          masteryPercentage: 0 // Default mastery percentage
        }));
        
        setTopics(topicsWithMastery);
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  const handleStartRandomPractice = async () => {
    try {
      setLoading(true);
      router.push('/student/practice/random');
    } catch (error) {
      console.error("Error starting random practice:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Practice Topics</h1>
        
        <Button 
          className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          onClick={handleStartRandomPractice}
        >
          🎲 Start Randomized Practice
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <TopicCard 
            key={topic.id} 
            topic={topic} 
            onClick={() => router.push(`/student/practice/${topic.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: Topic & { masteryPercentage: number };
  onClick: () => void;
}

function TopicCard({ topic, onClick }: TopicCardProps) {
  return (
    <Card 
      className="p-6 cursor-pointer hover:shadow-md transition-shadow duration-300 border border-gray-200"
      onClick={onClick}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{topic.name}</h2>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-800">
          {topic.masteryPercentage}%
        </div>
      </div>
      <p className="text-gray-600 mb-4 h-12 overflow-hidden">
        {topic.description || "Practice this topic to improve your skills."}
      </p>
      
      <div className="mt-auto">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Mastery</span>
        </div>
        <ProgressBar 
          value={topic.masteryPercentage} 
          className="h-2" 
          progressClassName="bg-indigo-600" 
        />
      </div>
    </Card>
  );
} 