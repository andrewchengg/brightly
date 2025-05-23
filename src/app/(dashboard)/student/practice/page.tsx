"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FaBook, FaCalculator, FaLanguage, FaFlask, FaGlobe, FaArrowRight } from "react-icons/fa";

// Define the subjects we want to display
const subjects = [
  {
    id: 1,
    name: "Math",
    icon: FaCalculator,
    topicsCount: 12,
    gradient: "from-blue-500 to-indigo-600",
    description: "Numbers, algebra, geometry and more. Build your math skills step by step."
  },
  {
    id: 2,
    name: "Science",
    icon: FaFlask,
    topicsCount: 8,
    gradient: "from-green-500 to-emerald-600",
    description: "Explore physics, chemistry, biology and scientific principles through hands-on learning."
  },
  {
    id: 3,
    name: "English",
    icon: FaLanguage,
    topicsCount: 10,
    gradient: "from-purple-500 to-pink-600",
    description: "Develop reading, writing and comprehension skills to become a confident communicator."
  },
  {
    id: 4,
    name: "Chinese",
    icon: FaGlobe,
    topicsCount: 6,
    gradient: "from-amber-500 to-orange-600",
    description: "Learn Chinese characters, vocabulary, and build your language skills systematically."
  }
];

export default function SubjectSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 md:p-8 mb-10 shadow-lg text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Choose Your Subject</h1>
        <p className="mt-2 text-indigo-100 md:w-2/3">
          Select a subject to begin your practice journey. Each subject contains specialized topics designed to help you master key concepts and skills.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
  description: string;
}

interface SubjectCardProps {
  subject: SubjectProps;
  onClick: () => void;
}

function SubjectCard({ subject, onClick }: SubjectCardProps) {
  const IconComponent = subject.icon;

  return (
    <Card 
      className="overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-200 hover:translate-y-[-5px] relative group"
      onClick={onClick}
    >
      {/* Top gradient banner */}
      <div className={`h-24 bg-gradient-to-r ${subject.gradient} flex items-center justify-between px-6`}>
        <h2 className="text-2xl font-bold text-white">{subject.name}</h2>
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm text-white shadow">
          <IconComponent size={30} />
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-gray-700 mb-6 min-h-[80px]">
          {subject.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium">
            {subject.topicsCount} {subject.topicsCount === 1 ? 'topic' : 'topics'} available
          </div>
          
          <button className="text-indigo-600 font-medium flex items-center gap-1 group-hover:text-indigo-800">
            Get Started <FaArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </Card>
  );
} 