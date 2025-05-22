"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FaBook, FaCalculator, FaLanguage, FaFlask, FaGlobe } from "react-icons/fa";

// Define the subjects we want to display
const subjects = [
  {
    id: 1,
    name: "Math",
    icon: FaCalculator,
    topicsCount: 12,
    gradient: "from-blue-100 to-indigo-200"
  },
  {
    id: 2,
    name: "Science",
    icon: FaFlask,
    topicsCount: 8,
    gradient: "from-green-100 to-emerald-200"
  },
  {
    id: 3,
    name: "English",
    icon: FaLanguage,
    topicsCount: 10,
    gradient: "from-purple-100 to-pink-200"
  },
  {
    id: 4,
    name: "Chinese",
    icon: FaGlobe,
    topicsCount: 6,
    gradient: "from-amber-100 to-orange-200"
  }
];

export default function SubjectSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Select a Subject to Practice</h1>
        <p className="text-gray-600 mt-2">Choose a subject to begin practicing topics and improve your skills</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((subject) => (
          <SubjectCard 
            key={subject.id} 
            subject={subject} 
            onClick={() => router.push(`/student/practice/subject/${subject.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface SubjectProps {
  id: number;
  name: string;
  icon: any;
  topicsCount: number;
  gradient: string;
}

interface SubjectCardProps {
  subject: SubjectProps;
  onClick: () => void;
}

function SubjectCard({ subject, onClick }: SubjectCardProps) {
  const IconComponent = subject.icon;

  return (
    <Card 
      className={`p-6 cursor-pointer hover:shadow-md transition-all duration-300 border border-gray-200 hover:scale-105 bg-gradient-to-br ${subject.gradient}`}
      onClick={onClick}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{subject.name}</h2>
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-indigo-800 shadow-sm">
          <IconComponent size={24} />
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">
        Practice {subject.name} topics to improve your skills and knowledge.
      </p>
      
      <div className="mt-auto pt-2 border-t border-gray-200/50">
        <div className="text-sm text-gray-700">
          {subject.topicsCount} {subject.topicsCount === 1 ? 'topic' : 'topics'} available
        </div>
      </div>
    </Card>
  );
} 