import { 
  FaTrophy, 
  FaBullseye, 
  FaFire, 
  FaBook, 
  FaChartLine, 
  FaUsers, 
  FaCrown, 
  FaMedal, 
  FaGem, 
  FaBookOpen,
  FaPlay,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaRocket,
  FaStar,
  FaCrosshairs,
  FaGraduationCap,
  FaArrowUp,
  FaSearch,
  FaShieldAlt,
  FaBalanceScale
} from "react-icons/fa";

export interface WeeklyQuest {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  icon: any;
  color: string;
  category: 'core' | 'subject' | 'consistency' | 'challenge' | 'performance' | 'social' | 'learning';
}

// Function to calculate XP target based on level
export const calculateXPTarget = (level: number): number => {
  return Math.floor(100 + (level * 25)); // Base 100 XP, +25 per level
};

// Function to calculate accuracy session target based on level
export const calculateAccuracyTarget = (level: number): number => {
  return Math.max(3, Math.floor(3 + (level * 0.5))); // Base 3, +0.5 per level (rounded down)
};

// All available weekly quest templates
export const WEEKLY_QUEST_TEMPLATES = [
  // Core Weekly Quests (Your original ideas)
  {
    id: 'earn-xp',
    category: 'core' as const,
    template: (level: number) => ({
      title: `Earn ${calculateXPTarget(level)} XP`,
      description: "Complete practice sessions to gain experience points",
      target: calculateXPTarget(level),
      icon: FaTrophy,
      color: "amber"
    })
  },
  {
    id: 'high-accuracy',
    category: 'core' as const,
    template: (level: number) => ({
      title: `Score 80%+ in ${calculateAccuracyTarget(level)} sessions`,
      description: "Achieve high accuracy in your practice sessions",
      target: calculateAccuracyTarget(level),
      icon: FaBullseye,
      color: "green"
    })
  },
  {
    id: 'review-mistakes',
    category: 'core' as const,
    template: () => ({
      title: "Review 10 mistakes",
      description: "Learn from your previous incorrect answers",
      target: 10,
      icon: FaExclamationTriangle,
      color: "orange"
    })
  },

  // Subject Mastery Quests
  {
    id: 'multi-subject',
    category: 'subject' as const,
    template: () => ({
      title: "Master Multiple Subjects",
      description: "Complete at least 1 practice session in 3 different subjects",
      target: 3,
      icon: FaBook,
      color: "purple"
    })
  },
  {
    id: 'subject-specialist',
    category: 'subject' as const,
    template: () => ({
      title: "Subject Specialist",
      description: "Complete 5+ practice sessions in your chosen subject specialty",
      target: 5,
      icon: FaGraduationCap,
      color: "blue"
    })
  },
  {
    id: 'cross-subject-explorer',
    category: 'subject' as const,
    template: () => ({
      title: "Cross-Subject Explorer",
      description: "Try a new subject you haven't practiced this week",
      target: 1,
      icon: FaRocket,
      color: "indigo"
    })
  },

  // Consistency & Streak Quests
  {
    id: 'weekly-warrior',
    category: 'consistency' as const,
    template: () => ({
      title: "Weekly Warrior",
      description: "Practice for at least 5 days this week",
      target: 5,
      icon: FaCalendarCheck,
      color: "green"
    })
  },
  {
    id: 'consistent-learner',
    category: 'consistency' as const,
    template: () => ({
      title: "Consistent Learner",
      description: "Complete at least 2 practice sessions on 4 different days",
      target: 4,
      icon: FaChartLine,
      color: "teal"
    })
  },
  {
    id: 'perfect-week',
    category: 'consistency' as const,
    template: () => ({
      title: "Perfect Week",
      description: "Practice every day of the week (7 days)",
      target: 7,
      icon: FaCrown,
      color: "yellow"
    })
  },

  // Challenge & Difficulty Quests
  {
    id: 'rising-star',
    category: 'challenge' as const,
    template: () => ({
      title: "Rising Star",
      description: "Complete 3 practice sessions with increasing difficulty levels",
      target: 3,
      icon: FaStar,
      color: "pink"
    })
  },
  {
    id: 'challenge-seeker',
    category: 'challenge' as const,
    template: () => ({
      title: "Challenge Seeker",
      description: "Complete 2 'Random Practice' sessions",
      target: 2,
      icon: FaPlay,
      color: "red"
    })
  },
  {
    id: 'topic-explorer',
    category: 'challenge' as const,
    template: () => ({
      title: "Topic Explorer",
      description: "Complete practice sessions from 5 different topics",
      target: 5,
      icon: FaBookOpen,
      color: "cyan"
    })
  },

  // Performance & Achievement Quests
  {
    id: 'accuracy-champion',
    category: 'performance' as const,
    template: () => ({
      title: "Accuracy Champion",
      description: "Maintain 85%+ average accuracy across all sessions this week",
      target: 1, // Achievement-based, not cumulative
      icon: FaCrosshairs,
      color: "emerald"
    })
  },
  {
    id: 'speed-demon',
    category: 'performance' as const,
    template: () => ({
      title: "Speed Demon",
      description: "Complete 10 practice sessions within the week",
      target: 10,
      icon: FaFire,
      color: "orange"
    })
  },
  {
    id: 'perfectionist',
    category: 'performance' as const,
    template: () => ({
      title: "Perfectionist",
      description: "Score 95% or higher in 2 practice sessions",
      target: 2,
      icon: FaGem,
      color: "violet"
    })
  },

  // Social & Competitive Quests
  {
    id: 'league-climber',
    category: 'social' as const,
    template: () => ({
      title: "League Climber",
      description: "Gain enough XP to move up in your league ranking",
      target: 1,
      icon: FaMedal,
      color: "gold"
    })
  },
  {
    id: 'comeback-champion',
    category: 'social' as const,
    template: () => ({
      title: "Comeback King/Queen",
      description: "Improve your score by 10+ points from last week's average",
      target: 1,
      icon: FaArrowUp,
      color: "rose"
    })
  },

  // Learning & Growth Quests
  {
    id: 'knowledge-seeker',
    category: 'learning' as const,
    template: () => ({
      title: "Knowledge Seeker",
      description: "Complete practice sessions from topics you've never tried before",
      target: 2,
      icon: FaSearch,
      color: "slate"
    })
  },
  {
    id: 'weakness-warrior',
    category: 'learning' as const,
    template: () => ({
      title: "Weakness Warrior",
      description: "Focus on your lowest-performing subject (complete 3 sessions)",
      target: 3,
      icon: FaShieldAlt,
      color: "red"
    })
  },
  {
    id: 'balanced-learner',
    category: 'learning' as const,
    template: () => ({
      title: "Balanced Learner",
      description: "Score 70%+ in at least 2 different subjects",
      target: 2,
      icon: FaBalanceScale,
      color: "lime"
    })
  }
];

// Function to generate random weekly quests
export const generateWeeklyQuests = (level: number = 1, count: number = 5): WeeklyQuest[] => {
  // Always include at least one core quest
  const coreQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category === 'core');
  const otherQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category !== 'core');
  
  // Shuffle arrays
  const shuffledCore = [...coreQuests].sort(() => Math.random() - 0.5);
  const shuffledOther = [...otherQuests].sort(() => Math.random() - 0.5);
  
  // Select quests (at least 1-2 core, rest random)
  const coreCount = Math.min(2, count);
  const otherCount = count - coreCount;
  
  const selectedTemplates = [
    ...shuffledCore.slice(0, coreCount), // Take 1-2 core quests
    ...shuffledOther.slice(0, otherCount) // Fill rest with other quests
  ];
  
  // Generate actual quest objects
  return selectedTemplates.map((template, index) => {
    const questData = template.template(level);
    return {
      id: index + 1,
      title: questData.title,
      description: questData.description,
      progress: 0, // Always start at 0
      target: questData.target,
      icon: questData.icon,
      color: questData.color,
      category: template.category
    };
  });
};

// Function to get current week's quests (you can implement storage/persistence as needed)
export const getCurrentWeeklyQuests = (level: number = 1): WeeklyQuest[] => {
  // For now, return a default set. You can implement localStorage, database, etc.
  // This is where you'd check if current week's quests exist, or generate new ones
  return generateWeeklyQuests(level, 5);
}; 