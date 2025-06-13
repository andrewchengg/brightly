"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { 
  FaBook, 
  FaCalculator, 
  FaLanguage, 
  FaFlask, 
  FaGlobe, 
  FaArrowRight,
  FaHeadphones,
  FaComments,
  FaMicrophone,
  FaExclamationTriangle,
  FaTrophy,
  FaFire,
  FaUsers,
  FaChartLine,
  FaCrown,
  FaMedal,
  FaGem,
  FaBullseye,
  FaBookOpen,
  FaPlay
} from "react-icons/fa";

// Define the subjects we want to display
const subjects = [
  {
    id: 1,
    name: "Math",
    icon: FaCalculator,
    topicsCount: 12,
    gradient: "from-blue-700 to-indigo-800",
    buttonColor: "bg-blue-900 hover:bg-blue-950",
    description: "Numbers, algebra, geometry and more. Build your math skills step by step."
  },
  {
    id: 2,
    name: "Science",
    icon: FaFlask,
    topicsCount: 8,
    gradient: "from-green-700 to-emerald-800",
    buttonColor: "bg-green-900 hover:bg-green-950",
    description: "Explore physics, chemistry, biology and scientific principles through hands-on learning."
  },
  {
    id: 3,
    name: "English",
    icon: FaLanguage,
    topicsCount: 10,
    gradient: "from-purple-700 to-pink-800",
    buttonColor: "bg-purple-900 hover:bg-purple-950",
    description: "Develop reading, writing and comprehension skills to become a confident communicator."
  },
  {
    id: 4,
    name: "Chinese",
    icon: FaGlobe,
    topicsCount: 6,
    gradient: "from-amber-700 to-orange-800",
    buttonColor: "bg-amber-900 hover:bg-amber-950",
    description: "Learn Chinese characters, vocabulary, and build your language skills systematically."
  }
];

const dailyQuests = [
  {
    id: 1,
    title: "Earn 50 XP",
    description: "Complete practice sessions to gain experience",
    progress: 50,
    target: 50,
    xpReward: 10,
    icon: FaTrophy,
    color: "amber"
  },
  {
    id: 2,
    title: "Score 90% or higher in 3 lessons",
    description: "Achieve high accuracy in your practice sessions",
    progress: 3,
    target: 3,
    xpReward: 15,
    icon: FaBullseye,
    color: "green"
  },
  {
    id: 3,
    title: "Earn 20 Combo Bonus XP",
    description: "Answer questions correctly in a row",
    progress: 20,
    target: 20,
    xpReward: 20,
    icon: FaFire,
    color: "orange"
  }
];

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Mock mistakes count - replace with actual data source
  const mistakesCount = 0; // This would come from your data source
  
  // Function to format mistakes count display
  const formatMistakesCount = (count: number): string => {
    if (count <= 10) {
      return count.toString();
    } else {
      const base = Math.floor(count / 10) * 10;
      return `${base}+`;
    }
  };

  const handleSubjectPractice = (subjectId: number) => {
    router.push(`/student/practice/subject/${subjectId}`);
  };

  const handleMistakesReview = () => {
    router.push('/student/review');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Today's Review</h1>
          <p className="text-gray-600">Keep up your learning streak and master new skills!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subject Practice Containers */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Practice by Subject</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <SubjectPracticeCard 
                    key={subject.id} 
                    subject={subject} 
                    onClick={() => handleSubjectPractice(subject.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Your Collections */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your collections</h3>
              <Card 
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md"
                onClick={handleMistakesReview}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <FaExclamationTriangle className="text-2xl text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Mistakes</h3>
                        <p className="text-gray-600 text-sm">Review your incorrect answers</p>
                      </div>
                    </div>
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                      {formatMistakesCount(mistakesCount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* League Info */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <CardContent className="p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Pearl League</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    VIEW LEAGUE
                  </Button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaCrown className="text-xl text-yellow-300" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">You're ranked #1</p>
                    <p className="text-purple-100 text-sm">Keep it up to stay in the top 3!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Quests */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">Daily Quests</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                    VIEW ALL
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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
  buttonColor: string;
  description: string;
}

interface SubjectPracticeCardProps {
  subject: SubjectProps;
  onClick: () => void;
}

function SubjectPracticeCard({ subject, onClick }: SubjectPracticeCardProps) {
  const IconComponent = subject.icon;

  return (
    <Card className={`overflow-hidden border-0 shadow-lg bg-gradient-to-br ${subject.gradient} hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]`}>
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-white mb-6 md:mb-0">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">{subject.name}</h3>
            <p className="text-white/90 text-lg mb-4">
              {subject.description}
            </p>
            <Button 
              onClick={onClick}
              size="lg"
              className={`${subject.buttonColor} text-white font-bold text-lg px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200`}
            >
              START PRACTICE
              <FaPlay className="ml-2" />
            </Button>
          </div>
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <IconComponent className="text-4xl md:text-5xl text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Quest {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  icon: any;
  color: string;
}

interface QuestCardProps {
  quest: Quest;
}

function QuestCard({ quest }: QuestCardProps) {
  const IconComponent = quest.icon;
  const isCompleted = quest.progress >= quest.target;
  const progressPercentage = Math.min((quest.progress / quest.target) * 100, 100);

  const colorConfig = {
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      progress: "bg-amber-500"
    },
    green: {
      bg: "bg-green-50", 
      icon: "text-green-600",
      progress: "bg-green-500"
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600", 
      progress: "bg-orange-500"
    }
  };

  const config = colorConfig[quest.color as keyof typeof colorConfig] || colorConfig.amber;

  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center`}>
          <IconComponent className={`text-sm ${config.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 text-sm">{quest.title}</h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{quest.progress} / {quest.target}</span>
            {isCompleted && (
              <div className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <FaGem className="text-xs" />
                {quest.xpReward}
              </div>
            )}
          </div>
        </div>
      </div>
      <ProgressBar
        value={quest.progress}
        max={quest.target}
        className="h-2 bg-gray-200"
        progressClassName={`${config.progress} transition-all duration-500 ease-out`}
      />
    </div>
  );
} 
