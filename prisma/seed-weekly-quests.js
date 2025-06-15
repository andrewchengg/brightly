// Standalone seed script for Weekly Quests
const {
  PrismaClient,
  WeeklyQuestCategory
} = require("../src/generated/prisma");
const prisma = new PrismaClient();

// Helper function to get the start of the week (Monday)
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get the end of the week (Sunday)
function getWeekEnd(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

// Calculate XP target based on level
function calculateXPTarget(level) {
  return Math.floor(100 + (level * 25)); // Base 100 XP, +25 per level
}

// Calculate accuracy session target based on level
function calculateAccuracyTarget(level) {
  return Math.max(3, Math.floor(3 + (level * 0.5))); // Base 3, +0.5 per level (rounded down)
}

// Weekly Quest Templates based on WEEKLY_QUEST_IDEAS.md
const WEEKLY_QUEST_TEMPLATES = [
  // Core Weekly Quests (Your original ideas)
  {
    id: 'earn-xp',
    category: WeeklyQuestCategory.CORE,
    template: (level) => ({
      title: `Earn ${calculateXPTarget(level)} XP`,
      description: "Complete practice sessions to gain experience points",
      target: calculateXPTarget(level),
      icon: 'FaTrophy',
      color: "amber"
    })
  },
  {
    id: 'high-accuracy',
    category: WeeklyQuestCategory.CORE,
    template: (level) => ({
      title: `Score 80%+ in ${calculateAccuracyTarget(level)} sessions`,
      description: "Achieve high accuracy in your practice sessions",
      target: calculateAccuracyTarget(level),
      icon: 'FaBullseye',
      color: "green"
    })
  },
  {
    id: 'review-mistakes',
    category: WeeklyQuestCategory.CORE,
    template: () => ({
      title: "Review 10 mistakes",
      description: "Learn from your previous incorrect answers",
      target: 10,
      icon: 'FaExclamationTriangle',
      color: "orange"
    })
  },

  // Subject Mastery Quests
  {
    id: 'multi-subject',
    category: WeeklyQuestCategory.SUBJECT,
    template: () => ({
      title: "Master Multiple Subjects",
      description: "Complete at least 1 practice session in 3 different subjects",
      target: 3,
      icon: 'FaBook',
      color: "purple"
    })
  },
  {
    id: 'subject-specialist',
    category: WeeklyQuestCategory.SUBJECT,
    template: () => ({
      title: "Subject Specialist",
      description: "Complete 5+ practice sessions in your chosen subject specialty",
      target: 5,
      icon: 'FaGraduationCap',
      color: "blue"
    })
  },
  {
    id: 'cross-subject-explorer',
    category: WeeklyQuestCategory.SUBJECT,
    template: () => ({
      title: "Cross-Subject Explorer",
      description: "Try a new subject you haven't practiced this week",
      target: 1,
      icon: 'FaRocket',
      color: "indigo"
    })
  },

  // Consistency & Streak Quests
  {
    id: 'weekly-warrior',
    category: WeeklyQuestCategory.CONSISTENCY,
    template: () => ({
      title: "Weekly Warrior",
      description: "Practice for at least 5 days this week",
      target: 5,
      icon: 'FaCalendarCheck',
      color: "green"
    })
  },
  {
    id: 'consistent-learner',
    category: WeeklyQuestCategory.CONSISTENCY,
    template: () => ({
      title: "Consistent Learner",
      description: "Complete at least 2 practice sessions on 4 different days",
      target: 4,
      icon: 'FaChartLine',
      color: "teal"
    })
  },
  {
    id: 'perfect-week',
    category: WeeklyQuestCategory.CONSISTENCY,
    template: () => ({
      title: "Perfect Week",
      description: "Practice every day of the week (7 days)",
      target: 7,
      icon: 'FaCrown',
      color: "yellow"
    })
  },

  // Challenge & Difficulty Quests
  {
    id: 'rising-star',
    category: WeeklyQuestCategory.CHALLENGE,
    template: () => ({
      title: "Rising Star",
      description: "Complete 3 practice sessions with increasing difficulty levels",
      target: 3,
      icon: 'FaStar',
      color: "pink"
    })
  },
  {
    id: 'challenge-seeker',
    category: WeeklyQuestCategory.CHALLENGE,
    template: () => ({
      title: "Challenge Seeker",
      description: "Complete 2 'Random Practice' sessions",
      target: 2,
      icon: 'FaPlay',
      color: "red"
    })
  },
  {
    id: 'topic-explorer',
    category: WeeklyQuestCategory.CHALLENGE,
    template: () => ({
      title: "Topic Explorer",
      description: "Complete practice sessions from 5 different topics",
      target: 5,
      icon: 'FaBookOpen',
      color: "cyan"
    })
  },

  // Performance & Achievement Quests
  {
    id: 'accuracy-champion',
    category: WeeklyQuestCategory.PERFORMANCE,
    template: () => ({
      title: "Accuracy Champion",
      description: "Maintain 85%+ average accuracy across all sessions this week",
      target: 1, // Achievement-based, not cumulative
      icon: 'FaCrosshairs',
      color: "emerald"
    })
  },
  {
    id: 'speed-demon',
    category: WeeklyQuestCategory.PERFORMANCE,
    template: () => ({
      title: "Speed Demon",
      description: "Complete 10 practice sessions within the week",
      target: 10,
      icon: 'FaFire',
      color: "orange"
    })
  },
  {
    id: 'perfectionist',
    category: WeeklyQuestCategory.PERFORMANCE,
    template: () => ({
      title: "Perfectionist",
      description: "Score 95% or higher in 2 practice sessions",
      target: 2,
      icon: 'FaGem',
      color: "violet"
    })
  },

  // Social & Competitive Quests
  {
    id: 'league-climber',
    category: WeeklyQuestCategory.SOCIAL,
    template: () => ({
      title: "League Climber",
      description: "Gain enough XP to move up in your league ranking",
      target: 1,
      icon: 'FaMedal',
      color: "gold"
    })
  },
  {
    id: 'comeback-champion',
    category: WeeklyQuestCategory.SOCIAL,
    template: () => ({
      title: "Comeback King/Queen",
      description: "Improve your score by 10+ points from last week's average",
      target: 1,
      icon: 'FaArrowUp',
      color: "rose"
    })
  },

  // Learning & Growth Quests
  {
    id: 'knowledge-seeker',
    category: WeeklyQuestCategory.LEARNING,
    template: () => ({
      title: "Knowledge Seeker",
      description: "Complete practice sessions from topics you've never tried before",
      target: 2,
      icon: 'FaSearch',
      color: "slate"
    })
  },
  {
    id: 'weakness-warrior',
    category: WeeklyQuestCategory.LEARNING,
    template: () => ({
      title: "Weakness Warrior",
      description: "Focus on your lowest-performing subject (complete 3 sessions)",
      target: 3,
      icon: 'FaShieldAlt',
      color: "red"
    })
  },
  {
    id: 'balanced-learner',
    category: WeeklyQuestCategory.LEARNING,
    template: () => ({
      title: "Balanced Learner",
      description: "Score 70%+ in at least 2 different subjects",
      target: 2,
      icon: 'FaBalanceScale',
      color: "lime"
    })
  }
];

// Generate random weekly quests for a student
function generateQuestsForStudent(studentId, level = 1, count = 5) {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // Always include at least one core quest
  const coreQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category === WeeklyQuestCategory.CORE);
  const otherQuests = WEEKLY_QUEST_TEMPLATES.filter(q => q.category !== WeeklyQuestCategory.CORE);
  
  // Shuffle arrays
  const shuffledCore = [...coreQuests].sort(() => Math.random() - 0.5);
  const shuffledOther = [...otherQuests].sort(() => Math.random() - 0.5);
  
  // Select quests (at least 1-2 core, rest random)
  const coreCount = Math.min(2, count);
  const otherCount = count - coreCount;
  
  const selectedTemplates = [
    ...shuffledCore.slice(0, coreCount),
    ...shuffledOther.slice(0, otherCount)
  ];

  return selectedTemplates.map(template => {
    const questData = template.template(level);
    return {
      studentId,
      questType: template.id,
      title: questData.title,
      description: questData.description,
      target: questData.target,
      progress: Math.floor(Math.random() * Math.min(questData.target, 5)), // Random progress for demo (capped at 5)
      isCompleted: false,
      weekStart,
      weekEnd,
      icon: questData.icon,
      color: questData.color,
      category: template.category
    };
  });
}

async function main() {
  console.log('🌱 Starting Weekly Quest Database Seeding...');
  console.log('='.repeat(50));

  try {
    // First, let's get some existing students to assign quests to
    const students = await prisma.student.findMany({
      take: 10, // Get up to 10 students
      select: { id: true, level: true, username: true }
    });

    if (students.length === 0) {
      console.log('⚠️  No students found in database. Creating a sample student...');
      
      // Create a sample student for testing
      const sampleStudent = await prisma.student.create({
        data: {
          id: 'sample-student-weekly-quests',
          username: 'quest_tester',
          name: 'Quest Tester Student',
          schoolLevel: 1,
          level: 3
        }
      });
      
      students.push(sampleStudent);
      console.log(`✅ Created sample student: ${sampleStudent.username}`);
    }

    console.log(`📚 Found ${students.length} students to assign quests to`);

    // Clear existing weekly quests (optional - remove if you want to keep existing data)
    const deleteCount = await prisma.weeklyQuest.deleteMany();
    console.log(`🗑️  Cleared ${deleteCount.count} existing weekly quests`);

    // Generate quests for each student
    let totalQuestsCreated = 0;
    
    for (const student of students) {
      const studentLevel = student.level || 1;
      const quests = generateQuestsForStudent(student.id, studentLevel, 5);
      
      console.log(`🎯 Generating ${quests.length} quests for ${student.username} (Level ${studentLevel})`);
      
      for (const quest of quests) {
        await prisma.weeklyQuest.create({
          data: quest
        });
        totalQuestsCreated++;
      }
    }

    console.log(`🎉 Successfully created ${totalQuestsCreated} weekly quests!`);

    // Show a summary of created quests by category
    const questsByCategory = await prisma.weeklyQuest.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    console.log('\n📊 Quests created by category:');
    questsByCategory.forEach(({ category, _count }) => {
      console.log(`   ${category}: ${_count.category} quests`);
    });

    // Show some sample quests
    console.log('\n🎮 Sample created quests:');
    const sampleQuests = await prisma.weeklyQuest.findMany({
      take: 8,
      include: {
        student: {
          select: { username: true }
        }
      }
    });

    sampleQuests.forEach(quest => {
      console.log(`   📝 ${quest.title} (${quest.student.username}) - ${quest.progress}/${quest.target}`);
    });

    console.log('\n✨ Weekly Quest seeding completed successfully!');
    console.log('You can now refresh your app to see the weekly quests.');

  } catch (error) {
    console.error('❌ Error seeding weekly quests:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }); 