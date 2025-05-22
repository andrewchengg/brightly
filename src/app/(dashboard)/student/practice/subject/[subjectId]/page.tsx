"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

interface Topic {
  id: number;
  name: string;
  description: string | null;
  subjectId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Subject {
  id: number;
  name: string;
}

export default function SubjectTopics({ params }: { params: { subjectId: string } }) {
  const router = useRouter();
  const { subjectId } = params;
  const [topics, setTopics] = useState<Array<Topic & { masteryPercentage: number }>>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        // Fetch topics for this subject
        const response = await fetch(`/api/topics?subjectId=${subjectId}`);
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
        
        // Set the subject if it's in the first topic
        if (data.length > 0 && data[0].subject) {
          setSubject(data[0].subject);
        } else {
          // Otherwise fetch the subject directly
          const subjectResponse = await fetch(`/api/subjects/${subjectId}`);
          if (subjectResponse.ok) {
            const subjectData = await subjectResponse.json();
            setSubject(subjectData);
          }
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, [subjectId]);

  const handleStartRandomPractice = async () => {
    try {
      setLoading(true);
      router.push(`/student/practice/random?subjectId=${subjectId}`);
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
        <div>
          <Button 
            variant="ghost" 
            className="mb-2 text-gray-500 hover:text-gray-700 -ml-2"
            onClick={() => router.push('/student/practice')}
          >
            ← Back to Subjects
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">
            {subject?.name || 'Subject'} Practice Topics
          </h1>
        </div>
        
        <Button 
          className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          onClick={handleStartRandomPractice}
        >
          🎲 Start Randomized Practice
        </Button>
      </div>
      
      {topics.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700">No topics available</h3>
          <p className="text-gray-500 mt-2">There are no practice topics available for this subject yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <TopicCard 
              key={topic.id} 
              topic={topic} 
              onClick={() => router.push(`/student/practice/${topic.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicCardProps {
  topic: Topic;
  onClick: () => void;
}

function TopicCard({ topic, onClick }: TopicCardProps) {
  // Generate a gradient background based on topic id for variety
  const gradientColors = [
    "from-blue-100 to-indigo-200",
    "from-purple-100 to-pink-200",
    "from-green-100 to-emerald-200",
    "from-amber-100 to-orange-200",
    "from-rose-100 to-red-200",
    "from-sky-100 to-cyan-200",
    "from-yellow-100 to-amber-200",
    "from-teal-100 to-green-200"
  ];
  
  // Use the last character of the id to select a color
  const colorIndex = topic.id % gradientColors.length;  
  const gradient = gradientColors[colorIndex];

  return (
    <Card 
      className={"p-6 cursor-pointer hover:shadow-md transition-all duration-300 border border-gray-200 hover:scale-105 bg-gradient-to-br " + gradient}
      onClick={onClick}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{topic.name}</h2>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-indigo-800 shadow-sm">
          {topic.masteryPercentage}%
        </div>
      </div>
      <p className="text-gray-700 mb-4 h-12 overflow-hidden">
        {topic.description || "Practice this topic to improve your skills."}
      </p>
      
      <div className="mt-auto">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Mastery</span>
        </div>
        <ProgressBar 
          value={topic.masteryPercentage} 
          className="h-2 bg-white/60" 
          progressClassName="bg-indigo-600" 
        />
      </div>
    </Card>
  );
} 