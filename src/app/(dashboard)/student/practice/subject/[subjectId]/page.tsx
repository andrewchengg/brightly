// src/app/(dashboard)/student/practice/subject/[subjectId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress"; // Ensure this is correctly named if you have it
import { FaArrowLeft, FaDice, FaStar, FaLock, FaTrophy, FaChartLine, FaBook, FaArrowRight } from "react-icons/fa";
import { Topic, Subject as PrismaSubject } from '@/generated/prisma'; // Import Subject type

// Subject gradients and icons mapping
const subjectStyles = {
  "1": { gradient: "from-blue-500 to-indigo-600", name: "Math" },
  "2": { gradient: "from-green-500 to-emerald-600", name: "Science" },
  "3": { gradient: "from-purple-500 to-pink-600", name: "English" },
  "4": { gradient: "from-amber-500 to-orange-600", name: "Chinese" }
  // Add more if needed
};

interface TopicWithMasteryAndSubject extends Topic {
  masteryPercentage: number;
  subject: { // Assuming subject is nested or fetched alongside
    id: number;
    name: string;
  };
}

interface SubjectDetails extends PrismaSubject { // Using PrismaSubject for type safety
  // no extra fields needed for now
}

export default function SubjectTopicsPage({ params }: { params: { subjectId: string } }) {
  const router = useRouter();
  const { subjectId } = params;
  const numericSubjectId = parseInt(subjectId, 10);

  const [topicsWithMastery, setTopicsWithMastery] = useState<TopicWithMasteryAndSubject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjectStyle = subjectStyles[subjectId as keyof typeof subjectStyles] || { 
    gradient: "from-gray-500 to-gray-600",
    name: "Subject"
  };

  useEffect(() => {
    async function fetchDataForSubject() {
      if (isNaN(numericSubjectId)) {
        setError("Invalid Subject ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch subject details
        const subjectRes = await fetch(`/api/subjects/${numericSubjectId}`);
        if (!subjectRes.ok) throw new Error("Failed to fetch subject details");
        const subjectData: SubjectDetails = await subjectRes.json();
        setCurrentSubject(subjectData);

        // Fetch topics for this subject
        const topicsRes = await fetch(`/api/topics?subjectId=${numericSubjectId}`);
        if (!topicsRes.ok) throw new Error("Failed to fetch topics");
        const topicsData: Topic[] = await topicsRes.json();
        
        // Fetch mastery data for these topics
        const masteryRes = await fetch(`/api/student/mastery?subjectId=${numericSubjectId}`);
        let masteryData: Array<{ topicId: number; masteryPercentage: number }> = [];
        if (masteryRes.ok) {
          masteryData = await masteryRes.json();
        } else {
          console.warn("Could not fetch mastery data, defaulting to 0%.");
        }

        const enrichedTopics = topicsData.map(topic => {
          const masteryEntry = masteryData.find(m => m.topicId === topic.id);
          return {
            ...topic,
            masteryPercentage: masteryEntry ? masteryEntry.masteryPercentage : 0,
            subject: { id: subjectData.id, name: subjectData.name } // Add subject info
          };
        });
        
        setTopicsWithMastery(enrichedTopics);

      } catch (err: any) {
        console.error("Error fetching data for subject page:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataForSubject();
  }, [numericSubjectId]);

  const handleStartRandomPractice = async () => {
    // Navigate to random practice page, optionally pre-filtered by this subject
    router.push(`/student/practice/random?subjectId=${numericSubjectId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-indigo-500 border-indigo-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-indigo-600 font-medium">Loading {subjectStyle.name} topics...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-lg text-center">
                <h2 className="text-xl font-semibold mb-2">Error Loading Topics</h2>
                <p className="mb-4">{error}</p>
                <Button onClick={() => router.push('/student/practice')} variant="outline">
                    Back to Subjects
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
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
                <FaArrowLeft className="mr-2" /> Back to Subjects
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {currentSubject?.name || subjectStyle.name} Practice
            </h1>
            <p className="text-white/80 mt-2">Select a topic to begin practicing or try a randomized session.</p>
          </div>
          
          <Button 
            className="mt-4 md:mt-0 bg-white text-indigo-700 hover:bg-indigo-50 font-medium shadow-md hover:shadow-lg transition-all duration-300"
            onClick={handleStartRandomPractice}
          >
            <FaDice className="mr-2" /> Random Practice for {currentSubject?.name || subjectStyle.name}
          </Button>
        </div>
      </div>
      
      {topicsWithMastery.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBook className="text-gray-400 text-xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">No topics available</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            There are no practice topics available for {currentSubject?.name || subjectStyle.name} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicsWithMastery.map((topic) => (
            <TopicCard 
              key={topic.id} 
              topic={topic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicCardProps {
  topic: TopicWithMasteryAndSubject;
}

function TopicCard({ topic }: TopicCardProps) {
  const router = useRouter();
  const getMasteryLevel = (percentage: number) => {
    if (percentage >= 80) return { label: "Master", icon: FaTrophy, color: "text-yellow-500", progressColor: "bg-yellow-500" };
    if (percentage >= 60) return { label: "Advanced", icon: FaChartLine, color: "text-blue-500", progressColor: "bg-blue-600" };
    if (percentage >= 30) return { label: "Intermediate", icon: FaStar, color: "text-green-500", progressColor: "bg-green-500" };
    return { label: "Beginner", icon: FaLock, color: "text-gray-500", progressColor: "bg-gray-500" };
  };

  const mastery = getMasteryLevel(topic.masteryPercentage);
  const MasteryIcon = mastery.icon;

  const gradientColors = [
    "from-blue-100 to-indigo-200", "from-purple-100 to-pink-200",
    "from-green-100 to-emerald-200", "from-amber-100 to-orange-200",
    "from-rose-100 to-red-200", "from-sky-100 to-cyan-200",
    "from-teal-100 to-green-200"
  ];
  const colorIndex = topic.id % gradientColors.length;  
  const gradient = gradientColors[colorIndex];

  return (
    <Card 
      className="overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-200 hover:translate-y-[-5px] cursor-pointer flex flex-col"
      onClick={() => router.push(`/student/practice/topic/${topic.id}`)} // Navigate to the practice page
    >
      <div className={`p-5 bg-gradient-to-br ${gradient}`}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-800 line-clamp-2 flex-grow">{topic.name}</h2>
          <div className="bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm flex-shrink-0 ml-2">
            <MasteryIcon className={`${mastery.color}`} />
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-gray-700 mb-4 text-sm min-h-[40px] line-clamp-2">
          {topic.description || "Practice this topic to improve your skills."}
        </p>
        
        <div className="mt-auto"> {/* Pushes progress and button to bottom */}
          <div className="flex justify-between mb-1 items-center">
            <span className="text-xs font-medium text-gray-700">Mastery Level</span>
            <span className={`text-xs font-semibold ${mastery.color} bg-gray-100 px-2 py-1 rounded-full`}>
              {mastery.label}
            </span>
          </div>
          <ProgressBar 
            value={topic.masteryPercentage} 
            className="h-2 bg-gray-200" 
            progressClassName={mastery.progressColor}
          />
          
          <div className="flex justify-end mt-4">
            <span className="text-indigo-600 group-hover:text-indigo-800 text-sm font-medium flex items-center">
              Start Practice <FaArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}