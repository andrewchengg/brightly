"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { FaArrowLeft, FaDice, FaStar, FaLock, FaTrophy, FaChartLine, FaBook } from "react-icons/fa";

// Subject gradients and icons mapping
const subjectStyles = {
  "1": { gradient: "from-blue-500 to-indigo-600", name: "Math" },
  "2": { gradient: "from-green-500 to-emerald-600", name: "Science" },
  "3": { gradient: "from-purple-500 to-pink-600", name: "English" },
  "4": { gradient: "from-amber-500 to-orange-600", name: "Chinese" }
};

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

  // Get the subject style from our mapping, or use default
  const subjectStyle = subjectStyles[subjectId as keyof typeof subjectStyles] || { 
    gradient: "from-gray-500 to-gray-600",
    name: "Subject"
  };

  useEffect(() => {
    async function fetchTopics() {
      try {
        // Fetch topics for this subject
        const response = await fetch(`/api/topics?subjectId=${subjectId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch topics");
        }
        const data = await response.json();
        
        // Add masteryPercentage to each topic (with some random values for demo)
        const topicsWithMastery = data.map((topic: Topic) => ({
          ...topic,
          masteryPercentage: Math.floor(Math.random() * 100) // Random mastery for demo
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
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-indigo-600 font-medium">Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Hero section */}
      <div className={`bg-gradient-to-r ${subjectStyle.gradient} rounded-2xl p-6 md:p-8 mb-8 text-white shadow-lg`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 -ml-2"
                onClick={() => router.push('/student/practice')}
              >
                <FaArrowLeft className="mr-2" /> Back
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {subject?.name || subjectStyle.name} Practice
            </h1>
            <p className="text-white/80 mt-2">Select a topic to begin practicing or try a randomized session</p>
          </div>
          
          <Button 
            className="mt-4 md:mt-0 bg-white text-indigo-700 hover:bg-indigo-50 font-medium shadow-md hover:shadow-lg transition-all duration-300"
            onClick={handleStartRandomPractice}
          >
            <FaDice className="mr-2" /> Start Random Practice
          </Button>
        </div>
      </div>
      
      {topics.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBook className="text-gray-400 text-xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">No topics available</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            There are no practice topics available for this subject yet. Please check back later or select another subject.
          </p>
          <Button 
            className="mt-6 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => router.push('/student/practice')}
          >
            Explore Other Subjects
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  topic: Topic & { masteryPercentage: number };
  onClick: () => void;
}

function TopicCard({ topic, onClick }: TopicCardProps) {
  // Get mastery level based on percentage
  const getMasteryLevel = (percentage: number) => {
    if (percentage >= 80) return { label: "Master", icon: FaTrophy, color: "text-yellow-500" };
    if (percentage >= 60) return { label: "Advanced", icon: FaChartLine, color: "text-blue-500" };
    if (percentage >= 30) return { label: "Intermediate", icon: FaStar, color: "text-green-500" };
    return { label: "Beginner", icon: FaLock, color: "text-gray-500" };
  };

  const masteryLevel = getMasteryLevel(topic.masteryPercentage);
  const MasteryIcon = masteryLevel.icon;

  // Generate a gradient background based on topic id for variety
  const gradientColors = [
    "from-blue-100 to-indigo-200",
    "from-purple-100 to-pink-200",
    "from-green-100 to-emerald-200",
    "from-amber-100 to-orange-200",
    "from-rose-100 to-red-200",
    "from-sky-100 to-cyan-200",
    "from-teal-100 to-green-200"
  ];
  
  // Use the id to select a color
  const colorIndex = topic.id % gradientColors.length;  
  const gradient = gradientColors[colorIndex];

  return (
    <Card 
      className="overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-200 hover:translate-y-[-5px] cursor-pointer"
      onClick={onClick}
    >
      <div className={`p-5 bg-gradient-to-br ${gradient}`}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-800 line-clamp-2">{topic.name}</h2>
          
          <div className="bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm">
            <MasteryIcon className={`${masteryLevel.color}`} />
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <p className="text-gray-700 mb-4 h-12 overflow-hidden line-clamp-2">
          {topic.description || "Practice this topic to improve your skills."}
        </p>
        
        <div className="mt-4">
          <div className="flex justify-between mb-1 items-center">
            <span className="text-sm font-medium text-gray-700">Mastery Level</span>
            <span className={`text-xs font-semibold ${masteryLevel.color} bg-gray-100 px-2 py-1 rounded-full`}>
              {masteryLevel.label}
            </span>
          </div>
          <ProgressBar 
            value={topic.masteryPercentage} 
            className="h-2 bg-gray-200" 
            progressClassName={topic.masteryPercentage >= 80 ? "bg-yellow-500" : 
                              topic.masteryPercentage >= 60 ? "bg-blue-600" : 
                              topic.masteryPercentage >= 30 ? "bg-green-500" : 
                              "bg-gray-500"} 
          />
          
          <div className="flex justify-end mt-4">
            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              Start Practice <FaArrowLeft className="ml-1 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
} 