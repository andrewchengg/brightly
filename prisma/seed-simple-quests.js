const {
  PrismaClient,
  WeeklyQuestCategory,
  QuestRarity,
} = require("../src/generated/prisma");

const prisma = new PrismaClient();

// Simple quest definitions - only easy-to-track quest types
const SIMPLE_QUEST_DEFINITIONS = [
  // Core Simple Quests
  {
    questType: "earn-xp",
    title: "XP Collector",
    description: "Earn experience points through practice",
    baseTarget: 50,
    targetFormula: "base",
    icon: "FaTrophy",
    color: "amber",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
    xpReward: 25,
  },
  {
    questType: "practice-sessions",
    title: "Practice More",
    description: "Complete practice sessions",
    baseTarget: 3,
    targetFormula: "base",
    icon: "FaFire",
    color: "orange",
    category: WeeklyQuestCategory.CORE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
    xpReward: 30,
  },
  {
    questType: "high-accuracy",
    title: "Sharp Shooter",
    description: "Score 80% or higher in practice sessions",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaBullseye",
    color: "green",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
    xpReward: 40,
  },
  {
    questType: "first-try-success",
    title: "First Try Hero",
    description: "Get questions right on your first attempt",
    baseTarget: 10,
    targetFormula: "base",
    icon: "FaThumbsUp",
    color: "blue",
    category: WeeklyQuestCategory.PERFORMANCE,
    minLevel: 1,
    rarity: QuestRarity.COMMON,
    xpReward: 35,
  },

  // Consistency Simple Quests
  {
    questType: "daily-dedication",
    title: "Daily Learner",
    description: "Practice for 2 different days",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaCalendarCheck",
    color: "teal",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 1,
    rarity: QuestRarity.UNCOMMON,
    xpReward: 50,
  },
  {
    questType: "morning-learner",
    title: "Early Bird",
    description: "Complete practice sessions before 12 PM",
    baseTarget: 2,
    targetFormula: "base",
    icon: "FaSun",
    color: "yellow",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 2,
    rarity: QuestRarity.UNCOMMON,
    xpReward: 45,
  },

  // Challenge Simple Quests
  {
    questType: "speedster",
    title: "Speed Learner",
    description: "Complete practice sessions in under 10 minutes",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaBolt",
    color: "purple",
    category: WeeklyQuestCategory.CHALLENGE,
    minLevel: 2,
    rarity: QuestRarity.RARE,
    xpReward: 60,
  },
  {
    questType: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Practice on a weekend day",
    baseTarget: 1,
    targetFormula: "base",
    icon: "FaCalendarWeek",
    color: "indigo",
    category: WeeklyQuestCategory.CONSISTENCY,
    minLevel: 1,
    rarity: QuestRarity.UNCOMMON,
    xpReward: 40,
  },
];

async function seedSimpleQuests() {
  console.log("🌱 Seeding Simple Quest definitions...");

  // Clear existing quests
  await prisma.quest.deleteMany({});
  console.log("🗑️ Cleared existing Quest definitions");

  // Insert new simple quest definitions
  for (const questDef of SIMPLE_QUEST_DEFINITIONS) {
    const quest = await prisma.quest.create({
      data: {
        questType: questDef.questType,
        title: questDef.title,
        description: questDef.description,
        baseTarget: questDef.baseTarget,
        targetFormula: questDef.targetFormula,
        icon: questDef.icon,
        color: questDef.color,
        category: questDef.category,
        minLevel: questDef.minLevel,
        maxLevel: questDef.maxLevel || null,
        rarity: questDef.rarity,
        isActive: true,
        xpReward: questDef.xpReward,
      },
    });
    console.log(`✅ Created quest: ${quest.title}`);
  }

  console.log(
    `🎯 Successfully seeded ${SIMPLE_QUEST_DEFINITIONS.length} simple quest definitions!`
  );
}

async function main() {
  try {
    await seedSimpleQuests();
  } catch (error) {
    console.error("Error seeding quests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
