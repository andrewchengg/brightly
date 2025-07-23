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
  FaLanguage,
  FaReadme, // Added FaReadme
  FaPlay,
  FaAtom,
  FaSquareRootAlt,
  FaRulerCombined,
  FaChartBar,
  FaCube,
  FaMagnet,
  FaLeaf,
  FaMicroscope,
  FaGraduationCap,
  FaUsers,
  FaGlobe,
  FaHistory,
} from "react-icons/fa";
import { Topic, Subject as PrismaSubject } from "@/generated/prisma";
import { toast } from "react-toastify";
import { useSupabaseUser } from "@/lib/hooks/auth";

// Configuration for subject-specific display (can be expanded)
const subjectDisplayConfig = {
  "1": {
    name: "Mathematics",
    gradient: "from-blue-500 to-indigo-600",
    icon: FaCalculator,
  },
  "2": {
    name: "Science",
    gradient: "from-green-500 to-emerald-600",
    icon: FaFlask,
  },
  "3": {
    name: "English",
    gradient: "from-purple-800 to-purple-900",
    icon: FaLanguage,
  },
  "4": {
    name: "Chinese",
    gradient: "from-red-500 to-orange-600",
    icon: FaBookOpen,
  },
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
    id: "paper1-composition",
    name: "Paper 1: Composition (作文)",
    description:
      "Practice writing narrative and descriptive essays based on picture prompts.",
    icon: FaPencilAlt,
    path: "/student/practice/chinese/composition",
    disabled: true,
  },
  {
    id: "paper2-language-comprehension",
    name: "Paper 2: Language & Comprehension (语文理解与应用)",
    description:
      "Test your vocabulary, grammar, and reading comprehension skills.",
    icon: FaBookOpen,
    subComponents: [
      {
        id: "paper2-pinyin",
        name: "汉语拼音 (Hanyu Pinyin)",
        description: "Practice Hanyu Pinyin questions.",
        icon: FaListOl,
        path: `/student/practice/topic/41`,
        disabled: false,
      },
      {
        id: "paper2-vocabulary",
        name: "词语选择 (Vocabulary Choice)",
        description: "Practice vocabulary and grammar questions.",
        icon: FaListOl,
        path: `/student/practice/topic/42`,
        disabled: false,
      },
      {
        id: "paper2-cloze",
        name: "短文填空 (Cloze Passage Skills)",
        description: "Practice skills for completing cloze passages.",
        icon: FaReadme,
        path: `/student/practice/launch-group-by-topic/43`, // Launcher will redirect to /chinese/cloze/...
        disabled: false,
      },
      {
        id: "paper2-reading-comp-mcq",
        name: "阅读理解一 (Reading Comprehension - MCQ)",
        description: "Practice MCQ-based reading comprehension skills.",
        icon: FaReadme,
        path: `/student/practice/launch-group-by-topic/44`,
        disabled: false,
      },
      {
        id: "paper2-dialogue",
        name: "完成对话 (Dialogue Completion Skills)",
        description: "Practice skills for completing dialogues.",
        icon: FaReadme,
        path: `/student/practice/launch-group-by-topic/45`,
        disabled: false,
      },
      {
        id: "paper2-open-ended-comp",
        name: "Section B: Open-Ended Comprehension (理解问答)",
        description: "Read passages and answer open-ended questions.",
        icon: FaAlignLeft,
        path: "/student/practice/chinese/paper2/comprehension",
        disabled: true,
      },
      {
        id: "paper2-practical-writing",
        name: "Section C: Practical Writing (实用文)",
        description: "Notices, Emails, Notes.",
        icon: FaEdit,
        path: "/student/practice/chinese/paper2/practical-writing",
        disabled: true,
      },
    ],
  },
  {
    id: "paper3-listening-comprehension",
    name: "Paper 3: Listening Comprehension (听力理解)",
    description: "Listen to audio clips and answer multiple-choice questions.",
    icon: FaHeadphones,
    path: "/student/practice/chinese/listening",
    disabled: false,
  },
  {
    id: "oral-exam",
    name: "Oral Examination (口试)",
    description: "Practice reading aloud and picture/video conversation.",
    icon: FaMicrophoneAlt,
    subComponents: [
      {
        id: "oral-reading",
        name: "Part A: Passage Reading (朗读短文)",
        description: "Practice reading passages aloud.",
        icon: FaBookOpen,
        path: "/student/practice/chinese/oral/reading",
        disabled: false,
      },
      {
        id: "oral-conversation",
        name: "Part B: Picture/Video Conversation (看图/录像说话)",
        description: "Practice describing visuals and conversing.",
        icon: FaMicrophoneAlt,
        path: "/student/practice/chinese/oral/conversation",
        disabled: false,
      },
    ],
  },
];

export default function SubjectPracticePage({
  params,
}: {
  params: { subjectId: string };
}) {
  const router = useRouter();
  const { subjectId } = params;
  const numericSubjectId = parseInt(subjectId, 10);

  const [topicsWithMastery, setTopicsWithMastery] = useState<
    TopicWithMastery[]
  >([]);
  const [currentSubject, setCurrentSubject] = useState<SubjectDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [masteryLoading, setMasteryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayConfig = subjectDisplayConfig[
    subjectId as keyof typeof subjectDisplayConfig
  ] || {
    gradient: "from-gray-500 to-gray-600",
    name: "Subject",
    icon: FaBook,
  };
  const SubjectIcon = displayConfig.icon;

  // Get subject name for subscription gate
  const getSubjectInfo = (id: number) => {
    switch (id) {
      case 1:
        return { name: "Math", displayName: "Mathematics" };
      case 4:
        return { name: "Chinese", displayName: "Chinese" };
      default:
        return { name: "Unknown", displayName: "Unknown Subject" };
    }
  };

  const subjectInfo = getSubjectInfo(numericSubjectId);

  // DEVELOPMENT MODE: Remove all subscription gates, allow direct access to all subjects
  console.log(
    `[DEV MODE] Subject practice access granted for subject ${numericSubjectId} (${subjectInfo.name})`
  );

  return (
    <SubjectPracticeContent
      params={params}
      numericSubjectId={numericSubjectId}
    />
  );
}

// Extract the main component logic
function SubjectPracticeContent({
  params,
  numericSubjectId,
}: {
  params: { subjectId: string };
  numericSubjectId: number;
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const [topicsWithMastery, setTopicsWithMastery] = useState<
    TopicWithMastery[]
  >([]);
  const [currentSubject, setCurrentSubject] = useState<SubjectDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [masteryLoading, setMasteryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayConfig = subjectDisplayConfig[
    numericSubjectId.toString() as keyof typeof subjectDisplayConfig
  ] || {
    gradient: "from-gray-500 to-gray-600",
    name: "Subject",
    icon: FaBook,
  };
  const SubjectIcon = displayConfig.icon;

  useEffect(() => {
    async function fetchInitialData() {
      if (isNaN(numericSubjectId)) {
        setError("Invalid Subject ID.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch subject and topics in parallel (fast queries)
        const [subjectRes, topicsRes] = await Promise.all([
          fetch(`/api/subjects/${numericSubjectId}`),
          numericSubjectId !== 4
            ? fetch(`/api/topics?subjectId=${numericSubjectId}`)
            : Promise.resolve(null),
        ]);

        if (!subjectRes.ok) {
          throw new Error(
            "Failed to fetch subject details. Subject might not exist."
          );
        }
        const subjectData: SubjectDetails = await subjectRes.json();
        setCurrentSubject(subjectData);

        if (numericSubjectId !== 4 && topicsRes) {
          if (!topicsRes.ok) {
            throw new Error("Failed to fetch topics for this subject.");
          }
          const topicsData: Topic[] = await topicsRes.json();

          // Set topics immediately with 0% mastery (skeleton state)
          const initialTopics = topicsData.map((topic) => ({
            ...topic,
            masteryPercentage: 0,
            subject: { id: subjectData.id, name: subjectData.name },
          }));
          setTopicsWithMastery(initialTopics);
        }

        setLoading(false);

        // Now fetch mastery data asynchronously (slow query)
        if (numericSubjectId !== 4) {
          fetchMasteryData(numericSubjectId, subjectData);
        }
      } catch (err: any) {
        console.error(
          `Error fetching data for subject ${numericSubjectId}:`,
          err
        );
        setError(err.message || "Failed to load data.");
        setLoading(false);
      }
    }

    async function fetchMasteryData(
      subjectId: number,
      subjectData: SubjectDetails
    ) {
      try {
        const masteryRes = await fetch(
          `/api/student/mastery?subjectId=${subjectId}`
        );
        let masteryData: Array<{
          topicId: number;
          masteryPercentage: number;
        }> = [];

        if (masteryRes.ok) {
          masteryData = await masteryRes.json();
        } else {
          console.warn("Could not fetch mastery data, defaulting to 0%.");
        }

        // Update topics with actual mastery data
        setTopicsWithMastery((prevTopics) =>
          prevTopics.map((topic) => {
            const masteryEntry = masteryData.find(
              (m) => m.topicId === topic.id
            );
            return {
              ...topic,
              masteryPercentage: masteryEntry
                ? masteryEntry.masteryPercentage
                : 0,
            };
          })
        );
      } catch (err) {
        console.warn("Failed to load mastery data:", err);
      } finally {
        setMasteryLoading(false);
      }
    }

    fetchInitialData();
  }, [numericSubjectId]);

  const handleGeneralNavigate = (path?: string) => {
    if (path) {
      router.push(path);
    } else {
      toast.warn(
        "This practice component is under development or not yet available."
      );
    }
  };

  const handleStartRandomPractice = async () => {
    console.log(
      "[DEBUG] handleStartRandomPractice called with numericSubjectId:",
      numericSubjectId
    );
    // Check for existing in-progress sessions for this subject
    if (user?.id) {
      try {
        const response = await fetch(
          `/api/student/practice-sessions/in-progress?studentId=${user.id}`
        );
        if (response.ok) {
          const data = await response.json();
          const subjectSession = data.sessions?.find(
            (session: any) => session.subjectId === numericSubjectId
          );

          if (subjectSession) {
            console.log(
              "[DEBUG] Redirecting to existing session:",
              subjectSession.id
            );
            router.push(
              `/student/practice/random?sessionId=${subjectSession.id}`
            );
            return;
          }
        }
      } catch (error) {
        console.error("Error checking for existing sessions:", error);
      }
    }

    // No existing session found, start new practice
    console.log(
      "[DEBUG] Redirecting to new random practice with subjectId:",
      numericSubjectId
    );
    router.push(`/student/practice/random?subjectId=${numericSubjectId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <FaSpinner className="animate-spin text-4xl text-indigo-500" />
        <p className="mt-4 text-indigo-600 font-medium">
          Loading {displayConfig.name} content...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-lg">
          <h2 className="text-xl font-semibold mb-2">
            Error Loading Subject Page
          </h2>
          <p className="mb-4">{error}</p>
          <Button
            onClick={() => router.push("/student/practice")}
            variant="outline"
          >
            Back to Subjects
          </Button>
        </div>
      </div>
    );
  }

  const pageTitle = currentSubject?.name || displayConfig.name;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Back to Subjects Button at Top */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={() => router.push("/student/practice")}
        >
          <FaArrowLeft className="mr-1.5 md:mr-2 h-4 w-4" /> Back to Subjects
        </Button>
      </div>

      {/* Random Practice Section - Only show for non-Chinese subjects */}
      {numericSubjectId !== 4 && (
        <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-purple-800 via-purple-700 to-violet-800 mb-8 relative">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full transform -translate-x-12 translate-y-12"></div>

          <div className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-white mb-6 md:mb-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Random Practice
                </h1>
                <p className="text-white text-lg mb-4">
                  Get a randomized mix of {pageTitle} questions across all
                  topics.
                </p>
                <Button
                  onClick={handleStartRandomPractice}
                  size="lg"
                  className="bg-white/20 text-white hover:bg-white/30 font-bold text-lg px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  START +50 XP
                  <FaPlay className="ml-2" />
                </Button>
              </div>
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <FaDice className="text-6xl md:text-7xl text-white" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {numericSubjectId === 4 ? (
        <div className="space-y-8">
          {chinesePracticeComponents.map((component) => (
            <ChineseComponentSection
              key={component.id}
              component={component}
              onNavigate={handleGeneralNavigate}
            />
          ))}
        </div>
      ) : topicsWithMastery.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBook className="text-gray-400 text-3xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">
            No topics available
          </h3>
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
              masteryLoading={masteryLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicCardProps {
  topic: TopicWithMastery;
  masteryLoading: boolean;
}
function TopicCard({ topic, masteryLoading }: TopicCardProps) {
  const router = useRouter();

  // Function to get topic-specific icon based on topic name/subject
  const getTopicIcon = (topicName: string, subjectId: number) => {
    const name = topicName.toLowerCase();

    // Math topics
    if (subjectId === 1) {
      if (name.includes("algebra") || name.includes("equation"))
        return FaCalculator;
      if (name.includes("geometry") || name.includes("shape"))
        return FaRulerCombined;
      if (name.includes("fraction") || name.includes("decimal"))
        return FaSquareRootAlt;
      if (name.includes("graph") || name.includes("chart")) return FaChartBar;
      if (name.includes("volume") || name.includes("area")) return FaCube;
      return FaCalculator;
    }

    // Science topics
    if (subjectId === 2) {
      if (name.includes("physics") || name.includes("force")) return FaAtom;
      if (name.includes("chemistry") || name.includes("element"))
        return FaFlask;
      if (
        name.includes("biology") ||
        name.includes("plant") ||
        name.includes("animal")
      )
        return FaLeaf;
      if (name.includes("magnet") || name.includes("electric")) return FaMagnet;
      if (name.includes("microscope") || name.includes("cell"))
        return FaMicroscope;
      return FaFlask;
    }

    // English topics
    if (subjectId === 3) {
      if (name.includes("grammar") || name.includes("language"))
        return FaLanguage;
      if (name.includes("reading") || name.includes("comprehension"))
        return FaBookOpen;
      if (name.includes("writing") || name.includes("essay"))
        return FaPencilAlt;
      if (name.includes("vocabulary") || name.includes("word")) return FaBook;
      return FaLanguage;
    }

    // Chinese topics
    if (subjectId === 4) {
      if (name.includes("pinyin")) return FaLanguage;
      if (name.includes("writing") || name.includes("composition"))
        return FaPencilAlt;
      if (name.includes("reading") || name.includes("comprehension"))
        return FaBookOpen;
      if (name.includes("listening")) return FaHeadphones;
      if (name.includes("speaking") || name.includes("oral"))
        return FaMicrophoneAlt;
      return FaGlobe;
    }

    return FaBook; // Default icon
  };

  const getMasteryLevel = (percentage: number) => {
    if (percentage >= 80)
      return {
        label: "Mastered",
        icon: FaTrophy,
        color: "text-yellow-500",
        progressColor: "bg-yellow-500",
      };
    if (percentage >= 60)
      return {
        label: "Advanced",
        icon: FaChartLine,
        color: "text-blue-500",
        progressColor: "bg-blue-600",
      };
    if (percentage >= 30)
      return {
        label: "Intermediate",
        icon: FaStar,
        color: "text-green-500",
        progressColor: "bg-green-500",
      };
    return {
      label: "Beginner",
      icon: FaLock,
      color: "text-gray-500",
      progressColor: "bg-gray-500",
    };
  };

  const mastery = getMasteryLevel(topic.masteryPercentage);
  const MasteryIcon = mastery.icon;
  const TopicIcon = getTopicIcon(topic.name, topic.subject.id);
  const subjectConfig =
    subjectDisplayConfig[
      topic.subject.id.toString() as keyof typeof subjectDisplayConfig
    ];
  const cardGradient = subjectConfig
    ? ` ${subjectConfig.gradient
        .replace("from-", "from-")
        .replace("-500", "-100")
        .replace("-600", "-200")}`
    : "from-gray-100 to-gray-200";

  return (
    <Card
      className="overflow-hidden rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 hover:translate-y-[-3px] cursor-pointer flex flex-col group"
      onClick={() => router.push(`/student/practice/topic/${topic.id}`)}
    >
      <div className={`p-5 bg-gradient-to-br ${cardGradient}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-grow">
            <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center shadow-sm flex-shrink-0">
              <TopicIcon className="text-gray-700 text-xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 line-clamp-2 flex-grow">
              {topic.name}
            </h2>
          </div>
          <div className="bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm flex-shrink-0 ml-2">
            {masteryLoading ? (
              <FaSpinner className="animate-spin text-lg text-gray-500" />
            ) : (
              <MasteryIcon className={`${mastery.color} text-lg`} />
            )}
          </div>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-gray-600 mb-4 text-sm min-h-[40px] line-clamp-2">
          {topic.description || "Practice this topic to improve your skills."}
        </p>
        <div className="mt-auto">
          <div className="flex justify-between mb-1 items-center">
            <span className="text-xs font-medium text-gray-700">
              Mastery Level
            </span>
            {masteryLoading ? (
              <div className="bg-gray-200 animate-pulse rounded-full h-4 w-16"></div>
            ) : (
              <span
                className={`text-xs font-semibold ${mastery.color} bg-gray-100 px-2 py-0.5 rounded-full`}
              >
                {mastery.label}
              </span>
            )}
          </div>
          {masteryLoading ? (
            <div className="h-2 bg-gray-200 rounded-full animate-pulse"></div>
          ) : (
            <ProgressBar
              value={topic.masteryPercentage}
              className="h-2 bg-gray-200"
              progressClassName={`${mastery.progressColor} transition-all duration-500 ease-out`}
            />
          )}
          <div className="flex justify-end mt-4">
            <div className="bg-indigo-100 group-hover:bg-indigo-200 rounded-full p-2 transition-colors duration-200">
              <FaArrowRight className="text-indigo-600 group-hover:text-indigo-800 h-4 w-4 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ChineseComponentSectionProps {
  component: PracticeComponent;
  onNavigate: (path?: string) => void;
}
function ChineseComponentSection({
  component,
  onNavigate,
}: ChineseComponentSectionProps) {
  const Icon = component.icon;
  return (
    <Card
      className={`overflow-hidden rounded-xl shadow-md border border-gray-200 ${
        component.disabled ? "opacity-70" : "hover:shadow-lg transition-shadow"
      }`}
    >
      <div
        className={`p-5 bg-gradient-to-br ${
          component.disabled
            ? "from-gray-100 to-gray-200"
            : "from-orange-100 to-red-200"
        } flex flex-col sm:flex-row items-start sm:items-center justify-between`}
      >
        <div className="flex items-center gap-3 mb-3 sm:mb-0">
          <div
            className={`p-3 rounded-lg ${
              component.disabled ? "bg-gray-300" : "bg-white/60"
            }`}
          >
            <Icon
              className={`w-6 h-6 md:w-7 md:h-7 ${
                component.disabled ? "text-gray-500" : "text-red-600"
              }`}
            />
          </div>
          <div>
            <h2
              className={`text-lg md:text-xl font-bold ${
                component.disabled ? "text-gray-500" : "text-gray-800"
              }`}
            >
              {component.name}
            </h2>
            <p
              className={`text-sm mt-1 ${
                component.disabled ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {component.description}
            </p>
          </div>
        </div>
        {!component.subComponents && (
          <Button
            onClick={() => onNavigate(component.path)}
            disabled={component.disabled}
            className={`mt-2 sm:mt-0 w-full sm:w-auto ${
              component.disabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {component.disabled ? "Coming Soon" : "Practice"}{" "}
            <FaArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {component.subComponents && component.subComponents.length > 0 && (
        <div className="p-4 md:p-5 space-y-3 bg-white">
          {component.subComponents.map((sub) => (
            <ChineseSubComponentCard
              key={sub.id}
              subComponent={sub}
              onNavigate={onNavigate}
            />
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
function ChineseSubComponentCard({
  subComponent,
  onNavigate,
}: ChineseSubComponentCardProps) {
  const Icon = subComponent.icon;
  return (
    <Card
      className={`p-3 md:p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all  ${
        subComponent.disabled
          ? "bg-gray-50 opacity-80"
          : "hover:border-red-300 hover:bg-red-50/30 cursor-pointer"
      }`}
      onClick={
        !subComponent.disabled ? () => onNavigate(subComponent.path) : undefined
      }
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${
            subComponent.disabled ? "text-gray-400" : "text-red-500"
          }`}
        />
        <div>
          <h3
            className={`font-semibold text-sm md:text-base ${
              subComponent.disabled ? "text-gray-500" : "text-gray-700"
            }`}
          >
            {subComponent.name}
          </h3>
          <p
            className={`text-xs ${
              subComponent.disabled ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {subComponent.description}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={subComponent.disabled ? "outline" : "default"}
        onClick={
          !subComponent.disabled
            ? (e) => {
                e.stopPropagation();
                onNavigate(subComponent.path);
              }
            : undefined
        }
        disabled={subComponent.disabled}
        className={`mt-2 sm:mt-0 text-xs px-3 py-1.5 shrink-0 ${
          subComponent.disabled
            ? "text-gray-400 cursor-not-allowed"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        {subComponent.disabled ? "Coming Soon" : "Go"}{" "}
        <FaArrowRight className="ml-1 h-3 w-3" />
      </Button>
    </Card>
  );
}
