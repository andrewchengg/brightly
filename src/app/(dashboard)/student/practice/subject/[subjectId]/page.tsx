// src/app/(dashboard)/student/practice/subject/[subjectId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress"; 
import { 
    FaArrowLeft, 
    FaDice, 
    FaStar, 
    FaLock, 
    FaTrophy, 
    FaChartLine, 
    FaBook, 
    FaArrowRight,
    FaPencilAlt, 
    FaBookOpen, 
    FaHeadphones, 
    FaMicrophoneAlt, 
    FaEdit, 
    FaListOl, 
    FaAlignLeft,
    FaSpinner,
    FaCalculator,
    FaFlask,
    FaLanguage
} from "react-icons/fa";
import { Topic, Subject as PrismaSubject } from '@/generated/prisma'; 

// Configuration for subject-specific display (can be expanded)
const subjectDisplayConfig = {
  "1": { name: "Mathematics", gradient: "from-blue-500 to-indigo-600", icon: FaCalculator },
  "2": { name: "Science", gradient: "from-green-500 to-emerald-600", icon: FaFlask },
  "3": { name: "English", gradient: "from-purple-500 to-pink-600", icon: FaLanguage },
  "4": { name: "Chinese", gradient: "from-red-500 to-orange-600", icon: FaBookOpen } // 华文 or similar icon
  // Add more subjects as needed
};

// Interfaces for generic topic display
interface TopicWithMastery extends Topic {
  masteryPercentage: number;
  subject: { 
    id: number;
    name: string;
  };
}

interface SubjectDetails extends PrismaSubject {
  // No extra fields needed for now beyond PrismaSubject
}

// Interfaces for Chinese Practice Hub
interface PracticeComponent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  path?: string; 
  subComponents?: PracticeComponent[]; 
  disabled?: boolean; 
}

const chinesePracticeComponents: PracticeComponent[] = [
  {
    id: "paper1-composition", name: "Paper 1: Composition (作文)",
    description: "Practice writing narrative and descriptive essays based on picture prompts.",
    icon: FaPencilAlt, path: "/student/practice/chinese/composition", disabled: true,
  },
  {
    id: "paper2-language-comprehension", name: "Paper 2: Language & Comprehension (语文理解与应用)",
    description: "Test your vocabulary, grammar, and reading comprehension skills.", icon: FaBookOpen,
    subComponents: [
        { id: "paper2-mcq", name: "Section A: Multiple Choice (选择题)", description: "Vocabulary, Grammar, Cloze Passages.", icon: FaListOl, path: "/student/practice/chinese/paper2/mcq", disabled: false, },
        { id: "paper2-open-ended", name: "Section B: Open-Ended Comprehension (理解问答)", description: "Read passages and answer questions.", icon: FaAlignLeft, path: "/student/practice/chinese/paper2/comprehension", disabled: true, },
        { id: "paper2-practical-writing", name: "Section C: Practical Writing (实用文)", description: "Notices, Emails, Notes.", icon: FaEdit, path: "/student/practice/chinese/paper2/practical-writing", disabled: true, }
    ]
  },
  {
    id: "paper3-listening-comprehension", name: "Paper 3: Listening Comprehension (听力理解)",
    description: "Listen to audio clips and answer multiple-choice questions.", icon: FaHeadphones,
    path: "/student/practice/chinese/listening", disabled: true,
  },
  {
    id: "oral-exam", name: "Oral Examination (口试)",
    description: "Practice reading aloud and picture/video conversation.", icon: FaMicrophoneAlt,
    subComponents: [
        { id: "oral-reading", name: "Part A: Passage Reading (朗读短文)", description: "Practice reading passages aloud.", icon: FaBookOpen, path: "/student/practice/chinese/oral/reading", disabled: true, },
        { id: "oral-conversation", name: "Part B: Picture/Video Conversation (看图/录像说话)", description: "Practice describing visuals and conversing.", icon: FaMicrophoneAlt, path: "/student/practice/chinese/oral/conversation", disabled: false, }
    ]
  },
];


export default function SubjectPracticePage({ params }: { params: { subjectId: string } }) {
  const router = useRouter();
  const { subjectId } = params;
  const numericSubjectId = parseInt(subjectId, 10);

  const [topicsWithMastery, setTopicsWithMastery] = useState<TopicWithMastery[]>([]);
  const [currentSubject, setCurrentSubject] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayConfig = subjectDisplayConfig[subjectId as keyof typeof subjectDisplayConfig] || { 
    gradient: "from-gray-500 to-gray-600",
    name: "Subject",
    icon: FaBook 
  };
  const SubjectIcon = displayConfig.icon;

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
        const subjectRes = await fetch(`/api/subjects/${numericSubjectId}`);
        if (!subjectRes.ok) throw new Error("Failed to fetch subject details. Subject might not exist.");
        const subjectData: SubjectDetails = await subjectRes.json();
        setCurrentSubject(subjectData);

        // If it's not Chinese, fetch topics and mastery like before
        if (numericSubjectId !== 4) { // Assuming 4 is Chinese ID
          const topicsRes = await fetch(`/api/topics?subjectId=${numericSubjectId}`);
          if (!topicsRes.ok) throw new Error("Failed to fetch topics for this subject.");
          const topicsData: Topic[] = await topicsRes.json();
          
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
              subject: { id: subjectData.id, name: subjectData.name } 
            };
          });
          setTopicsWithMastery(enrichedTopics);
        }
        // For Chinese (ID 4), we don't need to fetch topics here as the hub page lists components directly.
        // If Chinese also had topics for general practice, you could fetch them here too.

      } catch (err: any) {
        console.error(`Error fetching data for subject ${subjectId}:`, err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    fetchDataForSubject();
  }, [numericSubjectId, subjectId]);

  const handleGeneralNavigate = (path?: string) => {
    if (path) {
      router.push(path);
    } else {
      alert("This practice component is under development or not yet available.");
    }
  };
  
  const handleStartRandomPractice = async () => {
    router.push(`/student/practice/random?subjectId=${numericSubjectId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <FaSpinner className="animate-spin text-4xl text-indigo-500" />
        <p className="mt-4 text-indigo-600 font-medium">Loading {displayConfig.name} content...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-lg">
                <h2 className="text-xl font-semibold mb-2">Error Loading Subject Page</h2>
                <p className="mb-4">{error}</p>
                <Button onClick={() => router.push('/student/practice')} variant="outline">
                    Back to Subjects
                </Button>
            </div>
        </div>
    );
  }

  const pageTitle = currentSubject?.name || displayConfig.name;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className={`bg-gradient-to-r ${displayConfig.gradient} rounded-2xl p-6 md:p-8 mb-10 shadow-lg text-white`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 md:-ml-3"
                onClick={() => router.push('/student/practice')}
              >
                <FaArrowLeft className="mr-1.5 md:mr-2 h-4 w-4" /> Back to Subjects
              </Button>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl hidden sm:flex">
                     <SubjectIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                    {pageTitle} Practice
                    {numericSubjectId === 4 && " (华文练习)"}
                    </h1>
                    <p className="text-white/80 mt-1 text-sm md:text-base">
                        {numericSubjectId === 4 
                            ? "Select a component to begin practicing for your Chinese examination." 
                            : `Select a topic for ${pageTitle} or try a randomized session.`}
                    </p>
                </div>
            </div>
          </div>
          
          {numericSubjectId !== 4 && ( // Show random practice button for subjects other than Chinese hub
            <Button 
              className="mt-4 md:mt-0 bg-white text-indigo-700 hover:bg-indigo-50 font-medium shadow-md hover:shadow-lg transition-all duration-300"
              onClick={handleStartRandomPractice}
            >
              <FaDice className="mr-2" /> Random Practice for {pageTitle}
            </Button>
          )}
        </div>
      </div>
      
      {/* Conditional Rendering: Chinese Hub or Topic List */}
      {numericSubjectId === 4 ? ( // CHINESE SUBJECT HUB
        <div className="space-y-8">
          {chinesePracticeComponents.map((component) => (
            <ChineseComponentSection 
              key={component.id} 
              component={component} 
              onNavigate={handleGeneralNavigate} 
            />
          ))}
        </div>
      ) : ( // GENERIC TOPIC LIST FOR OTHER SUBJECTS
        topicsWithMastery.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBook className="text-gray-400 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">No topics available</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              There are no practice topics available for {pageTitle} yet.
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
        )
      )}
    </div>
  );
}

// --- UI Components for Generic Topic List ---
interface TopicCardProps {
  topic: TopicWithMastery;
}
function TopicCard({ topic }: TopicCardProps) {
  const router = useRouter();
  const getMasteryLevel = (percentage: number) => {
    if (percentage >= 80) return { label: "Mastered", icon: FaTrophy, color: "text-yellow-500", progressColor: "bg-yellow-500" };
    if (percentage >= 60) return { label: "Advanced", icon: FaChartLine, color: "text-blue-500", progressColor: "bg-blue-600" };
    if (percentage >= 30) return { label: "Intermediate", icon: FaStar, color: "text-green-500", progressColor: "bg-green-500" };
    return { label: "Beginner", icon: FaLock, color: "text-gray-500", progressColor: "bg-gray-500" };
  };

  const mastery = getMasteryLevel(topic.masteryPercentage);
  const MasteryIcon = mastery.icon;

  // Use subject-specific gradient if available, otherwise a default
   const subjectConfig = subjectDisplayConfig[topic.subject.id.toString() as keyof typeof subjectDisplayConfig];
   const cardGradient = subjectConfig ? ` ${subjectConfig.gradient.replace('from-','from-').replace('-500','-100').replace('-600','-200')}` : 'from-gray-100 to-gray-200';


  return (
    <Card 
      className="overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 hover:translate-y-[-3px] cursor-pointer flex flex-col group"
      onClick={() => router.push(`/student/practice/topic/${topic.id}`)}
    >
      <div className={`p-5 bg-gradient-to-br ${cardGradient}`}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-800 line-clamp-2 flex-grow mr-2">{topic.name}</h2>
          <div className="bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm flex-shrink-0">
            <MasteryIcon className={`${mastery.color} text-lg`} />
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-gray-600 mb-4 text-sm min-h-[40px] line-clamp-2">
          {topic.description || "Practice this topic to improve your skills."}
        </p>
        
        <div className="mt-auto"> 
          <div className="flex justify-between mb-1 items-center">
            <span className="text-xs font-medium text-gray-700">Mastery Level</span>
            <span className={`text-xs font-semibold ${mastery.color} bg-gray-100 px-2 py-0.5 rounded-full`}>
              {mastery.label}
            </span>
          </div>
          <ProgressBar 
            value={topic.masteryPercentage} 
            className="h-2 bg-gray-200" 
            progressClassName={`${mastery.progressColor} transition-all duration-500 ease-out`}
          />
          
          <div className="flex justify-end mt-4">
            <span className="text-indigo-600 group-hover:text-indigo-800 text-sm font-medium flex items-center">
              Start Practice <FaArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}


// --- UI Components for Chinese Practice Hub ---
interface ChineseComponentSectionProps {
    component: PracticeComponent;
    onNavigate: (path?: string) => void;
}

function ChineseComponentSection({ component, onNavigate }: ChineseComponentSectionProps) {
    const Icon = component.icon;
    return (
        <Card className={`overflow-hidden rounded-xl shadow-md border border-gray-200 ${component.disabled ? 'opacity-70' : 'hover:shadow-lg transition-shadow'}`}>
             <div className={`p-5 bg-gradient-to-br ${component.disabled ? 'from-gray-100 to-gray-200' : 'from-orange-100 to-red-200'} flex flex-col sm:flex-row items-start sm:items-center justify-between`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={`p-3 rounded-lg ${component.disabled ? 'bg-gray-300' : 'bg-white/60'}`}>
                        <Icon className={`w-6 h-6 md:w-7 md:h-7 ${component.disabled ? 'text-gray-500' : 'text-red-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-lg md:text-xl font-bold ${component.disabled ? 'text-gray-500' : 'text-gray-800'}`}>{component.name}</h2>
                        <p className={`text-sm mt-1 ${component.disabled ? 'text-gray-400' : 'text-gray-600'}`}>{component.description}</p>
                    </div>
                </div>
                {!component.subComponents && (
                    <Button 
                        onClick={() => onNavigate(component.path)} 
                        disabled={component.disabled}
                        className={`mt-2 sm:mt-0 w-full sm:w-auto ${component.disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                    >
                        {component.disabled ? "Coming Soon" : "Practice"} <FaArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                )}
             </div>
            {component.subComponents && component.subComponents.length > 0 && (
                <div className="p-4 md:p-5 space-y-3 bg-white">
                    {component.subComponents.map(sub => (
                        <ChineseSubComponentCard key={sub.id} subComponent={sub} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </Card>
    );
}

interface ChineseSubComponentCardProps {
    subComponent: PracticeComponent;
    onNavigate: (path?: string) => void;
}

function ChineseSubComponentCard({ subComponent, onNavigate }: ChineseSubComponentCardProps) {
    const Icon = subComponent.icon;
    return (
        <Card 
            className={`p-3 md:p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all  ${subComponent.disabled ? 'bg-gray-50 opacity-80' : 'hover:border-red-300 hover:bg-red-50/30 cursor-pointer'}`}
            onClick={!subComponent.disabled ? () => onNavigate(subComponent.path) : undefined}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${subComponent.disabled ? 'text-gray-400' : 'text-red-500'}`} />
                <div>
                    <h3 className={`font-semibold text-sm md:text-base ${subComponent.disabled ? 'text-gray-500' : 'text-gray-700'}`}>{subComponent.name}</h3>
                    <p className={`text-xs ${subComponent.disabled ? 'text-gray-400' : 'text-gray-500'}`}>{subComponent.description}</p>
                </div>
            </div>
            <Button 
                size="sm" 
                variant={subComponent.disabled ? "outline" : "default"}
                onClick={!subComponent.disabled ? (e) => {e.stopPropagation(); onNavigate(subComponent.path)} : undefined} 
                disabled={subComponent.disabled}
                className={`mt-2 sm:mt-0 text-xs px-3 py-1.5 shrink-0 ${subComponent.disabled ? 'text-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
                {subComponent.disabled ? "Coming Soon" : "Go"} <FaArrowRight className="ml-1 h-3 w-3" />
            </Button>
        </Card>
    );
}