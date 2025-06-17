const {
  PrismaClient,
  WeeklyQuestCategory,
  QuestRarity,
} = require("../src/generated/prisma");

const prisma = new PrismaClient();

// Master quest definitions - expanded with non-subject specific quests
const QUEST_DEFINITIONS = [
  // Core Learning Quests
  {
    questType: "earn-xp",
    title: "Experience Seeker",
    description: "Earn experience points through practice sessions",
    baseTarget: 100,
    targetFormula: "base + (level * 25)", // 100 + 25 per level
    icon: "FaTrophy",
    color: "amber",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "high-accuracy",
    title: "Accuracy Master",
    description: "Score 80% or higher in practice sessions",
    baseTarget: 3,
    targetFormula: "base + Math.floor(level * 0.5)", // 3 + 0.5 per level
    icon: "FaBullseye",
    color: "green",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "review-mistakes",
    title: "Learn from Mistakes",
    description: "Review your previous incorrect answers to improve",
    baseTarget: 10,
    targetFormula: "base", // Always 10
    icon: "FaExclamationTriangle",
    color: "orange",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "practice-sessions",
    title: "Practice Champion",
    description: "Complete practice sessions this week",
    baseTarget: 5,
    targetFormula: "base + Math.floor(level * 0.5)",
    icon: "FaFire",
    color: "red",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },

  // Consistency & Streak Quests
  {
    questType: "weekly-warrior",
    title: "Weekly Warrior",
    description: "Practice for at least 5 days this week",
    baseTarget: 5,
    targetFormula: "base",
    icon: "FaCalendarCheck",
    color: "green",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "consistent-learner",
    title: "Consistent Learner",
    description: "Complete at least 2 practice sessions on 4 different days",
    baseTarget: 4,
    targetFormula: "base",
    icon: "FaChartLine",
    color: "teal",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "perfect-week",
    title: "Perfect Week",
    description: "Practice every day of the week (7 days)",
    baseTarget: 7,
    targetFormula: "base",
    icon: "FaCrown",
    color: "yellow",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 5,
    rarity: QuestRarity.EPIC,
  },
  {
    questType: "daily-dedication",
    title: "Daily Dedication",
    description: "Practice at least once every day for 3 days straight",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaHeart",
    color: "pink",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "morning-learner",
    title: "Early Bird",
    description: "Complete 3 practice sessions before 12 PM",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaSun",
    color: "yellow",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },

  // Challenge & Achievement Quests
  {
    questType: "rising-star",
    title: "Rising Star",
    description: "Improve your average score by 5% from last week",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaStar",
    color: "pink",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 3,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "challenge-seeker",
    title: "Challenge Seeker",
    description: "Complete difficult practice sessions",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaPlay",
    color: "red",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "topic-explorer",
    title: "Topic Explorer",
    description: "Practice questions from different topics",
    baseTarget: 5,
    targetFormula: "base",
    icon: "FaBookOpen",
    color: "cyan",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "speedster",
    title: "Speedster",
    description: "Complete practice sessions in under 10 minutes each",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaBolt",
    color: "purple",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 4,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "endurance-runner",
    title: "Endurance Runner",
    description: "Complete a practice session lasting over 20 minutes",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaRunning",
    color: "indigo",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 3,
    rarity: QuestRarity.UNCOMMON,
  },

  // Performance & Excellence Quests
  {
    questType: "accuracy-champion",
    title: "Accuracy Champion",
    description: "Maintain 85%+ average accuracy across all sessions",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaCrosshairs",
    color: "emerald",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "speed-demon",
    title: "Speed Demon",
    description: "Complete 10 practice sessions within the week",
    baseTarget: 10,
    targetFormula: "base",
    icon: "FaFire",
    color: "orange",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 4,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "perfectionist",
    title: "Perfectionist",
    description: "Score 95% or higher in practice sessions",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaGem",
    color: "violet",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 5,
    rarity: QuestRarity.EPIC,
  },
  {
    questType: "no-mistakes",
    title: "Flawless Victory",
    description: "Complete a practice session with 100% accuracy",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaCheckCircle",
    color: "green",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 4,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "combo-master",
    title: "Combo Master",
    description: "Answer 10 questions correctly in a row",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaFistRaised",
    color: "orange",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 3,
    rarity: QuestRarity.UNCOMMON,
  },

  // Learning & Growth Quests
  {
    questType: "knowledge-seeker",
    title: "Knowledge Seeker",
    description:
      "Complete practice sessions from topics you haven't tried before",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaSearch",
    color: "slate",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "weakness-warrior",
    title: "Weakness Warrior",
    description: "Practice topics where you previously scored below 70%",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaShieldAlt",
    color: "red",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "improvement-tracker",
    title: "Improvement Tracker",
    description: "Show improvement in your weakest areas",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaArrowUp",
    color: "green",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 4,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "curious-learner",
    title: "Curious Learner",
    description: "Spend time reviewing explanations for incorrect answers",
    baseTarget: 5,
    targetFormula: "base",
    icon: "FaQuestionCircle",
    color: "blue",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "study-habits",
    title: "Study Habits Master",
    description: "Complete practice sessions at consistent times of day",
    baseTarget: 4,
    targetFormula: "base",
    icon: "FaClock",
    color: "indigo",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 3,
    rarity: QuestRarity.UNCOMMON,
  },

  // Social & Competitive Quests
  {
    questType: "league-climber",
    title: "League Climber",
    description: "Earn enough XP to improve your ranking",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaMedal",
    color: "gold",
    category: WeeklyQuestCategory.SOCIAL,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "comeback-champion",
    title: "Comeback Champion",
    description: "Improve your performance from your lowest-scoring session",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaArrowUp",
    color: "rose",
    category: WeeklyQuestCategory.SOCIAL,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "level-achiever",
    title: "Level Achiever",
    description: "Gain enough XP to level up",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaLevelUpAlt",
    color: "purple",
    category: WeeklyQuestCategory.SOCIAL,
    minLevel: 1,
    rarity: QuestRarity.UNCOMMON,
  },

  // Special Achievement Quests
  {
    questType: "marathon-runner",
    title: "Marathon Runner",
    description: "Complete practice sessions totaling over 60 minutes",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaMountain",
    color: "gray",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 5,
    rarity: QuestRarity.EPIC,
  },
  {
    questType: "night-owl",
    title: "Night Owl",
    description: "Complete practice sessions after 8 PM",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaMoon",
    color: "purple",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 3,
    rarity: QuestRarity.RARE,
  },
  {
    questType: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Complete practice sessions on both Saturday and Sunday",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaCalendarWeek",
    color: "blue",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
  {
    questType: "first-try-success",
    title: "First Try Success",
    description: "Get questions right on your first attempt",
    baseTarget: 15,
    targetFormula: "base",
    icon: "FaThumbsUp",
    color: "green",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 2,
    rarity: QuestRarity.COMMON,
  },
  {
    questType: "question-variety",
    title: "Question Variety",
    description:
      "Answer different types of questions (multiple choice, short answer, etc.)",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaRandom",
    color: "teal",
    category: WeeklyQuestCategory.LEARNING,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
  },
];

async function seedQuests() {
  console.log("🌱 Seeding Quest definitions...");

  // Clear existing quests
  await prisma.quest.deleteMany({});
  console.log("🗑️ Cleared existing Quest definitions");

  // Insert new quest definitions
  for (const questDef of QUEST_DEFINITIONS) {
    await prisma.quest.create({
      data: questDef,
    });
    console.log(`✅ Created quest: ${questDef.title}`);
  }

  console.log(
    `🎯 Successfully seeded ${QUEST_DEFINITIONS.length} quest definitions!`
  );
}

async function main() {
  try {
    await seedQuests();
  } catch (error) {
    console.error("❌ Error seeding quests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedQuests, QUEST_DEFINITIONS };
