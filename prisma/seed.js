// seed.js for YET ANOTHER 10 (Batch 21) Dialogue Completion QuestionGroups WITH 4 individual Question records each
const {
  PrismaClient,
  QuestionType,
  DifficultyLevel,
  WeeklyQuestCategory
} = require("../src/generated/prisma"); // Adjust path to your Prisma Client
const prisma = new PrismaClient();

// --- IDs ---
const CHINESE_SUBJECT_ID = 4;
const DIALOGUE_COMPLETION_TOPIC_ID = 45; // YOUR EXISTING TOPIC ID

// --- Helper to generate unique Question Group names ---
let dialogueGroupCounter = 206; // Start counter from where the previous set left off (e.g., if prev was 196-205, start at 206)
function getUniqueDialogueGroupName(baseName) {
  const name = `${baseName} (Seed_DC_IndivQ_Batch21_${dialogueGroupCounter}_${Date.now()})`;
  dialogueGroupCounter++;
  return name;
}

// === WEEKLY QUEST SEEDING FUNCTIONS ===

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

// Seed weekly quests function
async function seedWeeklyQuests() {
  console.log('🌱 Starting to seed WeeklyQuest database...');

  try {
    // First, let's get some existing students to assign quests to
    const students = await prisma.student.findMany({
      take: 10, // Get up to 10 students
      select: { id: true, level: true, username: true }
    });

    if (students.length === 0) {
      console.log('⚠️  No students found in database. Please create some students first or the quest seeding will be skipped.');
      return;
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
      take: 5,
      include: {
        student: {
          select: { username: true }
        }
      }
    });

    sampleQuests.forEach(quest => {
      console.log(`   📝 ${quest.title} (${quest.student.username}) - ${quest.progress}/${quest.target}`);
    });

  } catch (error) {
    console.error('❌ Error seeding weekly quests:', error);
    throw error;
  }
}

// === END OF WEEKLY QUEST SEEDING FUNCTIONS ===

// --- Data for 10 MORE Dialogue Completion Exercises ---
const dialogueExercisesData = [
  // Exercise 206
  {
    baseGroupName: "完成对话 (讨论周末义卖活动)",
    sharedOptionsList: {
      1: "我们班周末要参加学校的义卖活动，你准备卖什么呀？",
      2: "我想卖一些自己做的小手工艺品，比如书签和钥匙扣。",
      3: "我们还可以一起制作一些海报，宣传我们的摊位。",
      4: "希望能为班级筹集到一些活动经费，也很有意义！",
      5: "义卖活动太累了。",
      6: "我不知道该卖什么好。",
      7: "卖东西能赚钱吗？",
      8: "我们还是去玩吧。",
    },
    dialogueContext: [
      "小丽：小明，__Q1__",
      "小丽：这个主意不错！__Q2__ 大家都夸你心灵手巧。",
      "小丽：好啊！__Q3__ 吸引更多同学来光顾。",
      "小丽：对！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小丽：小明，__Q1__
小明：我还在想呢，你有什么好点子吗？
小丽：这个主意不错！__Q2__ 大家都夸你心灵手巧。
小明：谢谢！那我们一起准备吧！
小丽：好啊！__Q3__ 吸引更多同学来光顾。
小明：太好了！
小丽：对！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 207
  {
    baseGroupName: "完成对话 (道歉并解释弄丢同学的书)",
    sharedOptionsList: {
      1: "对不起，我不小心把你借给我的那本《格林童话》弄丢了。",
      2: "我昨天把它放在书包里，今天早上就找不到了。",
      3: "我明天去书店给你买一本一模一样的赔给你，好吗？",
      4: "请你原谅我这次的马虎，我以后借东西一定会更小心的。",
      5: "这本书不好看。",
      6: "我还有很多其他的书。",
      7: "是你自己不小心弄丢的。",
      8: "我们一起去找找吧。",
    },
    dialogueContext: [
      "小刚：小芳，__Q1__",
      "小刚：__Q2__ 我到处都找遍了。",
      "小刚：__Q3__",
      "小刚：__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小刚：小芳，__Q1__
小芳：啊？怎么会这样？那本书我还没看完呢。
小刚：__Q2__ 我到处都找遍了。
小芳：唉，那可怎么办啊？
小刚：__Q3__
小芳：好吧，那只能这样了。
小刚：__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 208
  {
    baseGroupName: "完成对话 (分享参加学校运动会的经历)",
    sharedOptionsList: {
      1: "上周的学校运动会你参加了吗？感觉怎么样？",
      2: "我参加了跳远比赛，虽然没有拿到名次，但重在参与嘛！",
      3: "我还看到了很多同学在赛场上奋力拼搏的样子，非常感动。",
      4: "运动会不仅锻炼了我们的身体，还增强了班级的凝聚力！",
      5: "运动会太累了，我不想参加。",
      6: "我跑步得了第一名。",
      7: "运动会应该多设一些有趣的团体项目。",
      8: "明年的运动会我一定要拿到冠军。",
    },
    dialogueContext: [
      "小华：小丽，__Q1__",
      "小华：是啊！__Q2__",
      "小华：没错！__Q3__ 大家都非常努力。",
      "小华：嗯！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小华：小丽，__Q1__
小丽：我参加了！气氛特别热烈，同学们都很投入！
小华：是啊！__Q2__
小丽：你也很棒啊！能勇敢地挑战自己就很了不起了！
小华：没错！__Q3__ 大家都非常努力。
小丽：是的，这种精神值得我们学习。
小华：嗯！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 209
  {
    baseGroupName: "完成对话 (劝说同学不要在图书馆打电话)",
    sharedOptionsList: {
      1: "同学，不好意思，这里是图书馆，请不要打电话。",
      2: "你的说话声音会影响到其他正在看书或学习的同学。",
      3: "如果你有急事需要打电话，可以去外面的走廊或者休息区。",
      4: "请你配合一下，共同维护图书馆的安静环境，谢谢。",
      5: "你在跟谁打电话？",
      6: "我也想打电话。",
      7: "图书馆里信号不好。",
      8: "我们可以小声打电话吗？",
    },
    dialogueContext: [
      "图书管理员：（走近正在打电话的同学）__Q1__",
      "图书管理员：__Q2__",
      "图书管理员：__Q3__",
      "图书管理员：__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
图书管理员：（走近正在打电话的同学）__Q1__
同学：啊，对不起，我马上就好。
图书管理员：__Q2__
同学：我知道了，我这就出去打。
图书管理员：__Q3__
同学：好的，谢谢提醒。
图书管理员：__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 210
  {
    baseGroupName: "完成对话 (讨论如何帮助受灾地区的学校)",
    sharedOptionsList: {
      1: "我看到新闻里说，邻省有些学校在水灾中受损严重，学生们都不能上课了。",
      2: "我觉得我们可以组织一次爱心捐款，帮助他们重建校园。",
      3: "还可以捐赠一些我们看过的课外书和学习用品给他们。",
      4: "虽然我们的帮助可能很微小，但希望能给他们带去一些温暖和希望。",
      5: "水灾太可怕了，希望他们平安。",
      6: "我们应该如何预防水灾？",
      7: "政府一定会帮助他们的。",
      8: "我们还是先管好自己的学习吧。",
    },
    dialogueContext: [
      "小明：小华，__Q1__",
      "小明：是啊，他们现在一定很困难。__Q2__",
      "小明：这个想法很好！__Q3__",
      "小明：嗯！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小明：小华，__Q1__
小华：我也看到了，真是让人揪心。
小明：是啊，他们现在一定很困难。__Q2__
小华：好主意！我们可以向学校建议，组织全校师生一起行动。
小明：这个想法很好！__Q3__
小华：对，让他们知道我们都在关心他们。
小明：嗯！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 211
  {
    baseGroupName: "完成对话 (分享学乐器的经验)",
    sharedOptionsList: {
      1: "你最近在学弹钢琴吗？我听到琴房里传出很好听的琴声。",
      2: "我觉得学乐器最重要的是坚持练习，不能三天打鱼两天晒网。",
      3: "还要找到一位好老师，学习正确的指法和乐理知识。",
      4: "如果你也对音乐感兴趣，不妨也尝试学一种乐器吧！",
      5: "弹钢琴太难了，我学不会。",
      6: "我没有时间练习乐器。",
      7: "学乐器要花很多钱吗？",
      8: "我更喜欢听音乐，而不是弹奏。",
    },
    dialogueContext: [
      "小丽：小刚，__Q1__",
      "小丽：是吗？__Q2__",
      "小丽：嗯，有道理。__Q3__",
      "小丽：太好了！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小丽：小刚，__Q1__
小刚：是啊，我刚开始学不久，还在练习基础指法呢。
小丽：是吗？__Q2__
小刚：你说得对，练习确实很重要。
小丽：嗯，有道理。__Q3__
小刚：是的，好老师能让你少走很多弯路。
小丽：太好了！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 212
  {
    baseGroupName: "完成对话 (讨论如何安排假期生活)",
    sharedOptionsList: {
      1: "假期快到了，你有什么计划来充实自己的假期生活吗？",
      2: "我觉得除了完成作业，我们还可以多读一些自己喜欢的书。",
      3: "或者学一门新技能，比如画画、游泳或者编程。",
      4: "合理安排假期，才能让它过得既轻松愉快又有意义！",
      5: "假期太短了，根本不够玩。",
      6: "我只想每天睡到自然醒。",
      7: "爸爸妈妈会带我去旅游。",
      8: "假期里有很多补习班要上。",
    },
    dialogueContext: [
      "老师：同学们，__Q1__",
      "小明：老师，__Q2__",
      "小华：嗯，这个建议不错。__Q3__",
      "老师：说得都很好！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
老师：同学们，__Q1__
小明：老师，__Q2__
老师：小明说得对，阅读能开阔眼界。还有其他想法吗？
小华：嗯，这个建议不错。__Q3__
老师：说得都很好！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 213
  {
    baseGroupName: "完成对话 (劝说同学不要在楼道内打球)",
    sharedOptionsList: {
      1: "你们不能在楼道里打球，这里空间太小，很危险！",
      2: "球很容易打到别人，或者碰坏楼道里的东西。",
      3: "如果想打球，可以去操场或者体育馆，那里更安全。",
      4: "请你们遵守学校的规定，不要在楼道里进行危险活动。",
      5: "这个球是新买的吗？",
      6: "我也想和你们一起打球。",
      7: "老师没有看见我们。",
      8: "我们只是随便玩玩。",
    },
    dialogueContext: [
      "值日老师：（看到几个同学在楼道打球）同学们！__Q1__",
      "值日老师：__Q2__",
      "值日老师：__Q3__",
      "值日老师：__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
值日老师：（看到几个同学在楼道打球）同学们！__Q1__
同学A：老师，我们只是轻轻地玩一下。
值日老师：__Q2__
同学B：知道了，老师，我们不打了。
值日老师：__Q3__
同学A：好的，我们现在就去操场。
值日老师：__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 214
  {
    baseGroupName: "完成对话 (分享观看画展的感受)",
    sharedOptionsList: {
      1: "我上周末去参观了一个现代艺术画展，感觉很特别！",
      2: "有些画我不太能看懂，但色彩和构图都很大胆。",
      3: "我觉得艺术就是这样，可以有很多不同的表达方式。",
      4: "多看画展能培养我们的艺术修养和想象力。",
      5: "我对现代艺术不感兴趣。",
      6: "画展的门票免费吗？",
      7: "那些画都是谁画的？",
      8: "美术馆里可以拍照吗？",
    },
    dialogueContext: [
      "小芳：小华，__Q1__",
      "小芳：是啊！__Q2__ 和我们平时看的传统绘画很不一样。",
      "小芳：没错！__Q3__ 每个人都可以有自己的理解。",
      "小芳：嗯！__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小芳：小华，__Q1__
小华：哦？现代艺术画展？听起来很抽象啊！
小芳：是啊！__Q2__ 和我们平时看的传统绘画很不一样。
小华：那你看懂了那些画的含义吗？
小芳：没错！__Q3__ 每个人都可以有自己的理解。
小华：嗯，艺术欣赏确实是见仁见智。
小芳：嗯！__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 215
  {
    baseGroupName: "完成对话 (请求老师帮忙写推荐信)",
    sharedOptionsList: {
      1: "王老师，我下学期想申请加入学校的科学兴趣小组，您能帮我写一封推荐信吗？",
      2: "我对科学实验非常感兴趣，也取得了一些小小的成绩。",
      3: "如果能得到您的推荐，我相信对我的申请会很有帮助。",
      4: "太感谢您了！我一定会努力，不辜负您的期望！",
      5: "科学兴趣小组的活动多吗？",
      6: "写推荐信太麻烦您了。",
      7: "我的科学成绩不太好。",
      8: "我不想加入任何兴趣小组。",
    },
    dialogueContext: [
      "小明：（找到科学老师）__Q1__",
      "小明：__Q2__ 我在上次的科学小发明比赛中还得了奖。",
      "小明：__Q3__",
      "小明：__Q4__",
    ],
    fullDialogueForGroup: (opts) => `四 完成对话（4题8分）
根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。
选择适当的短语：
1. ${opts[1]}
2. ${opts[2]}
3. ${opts[3]}
4. ${opts[4]}
5. ${opts[5]}
6. ${opts[6]}
7. ${opts[7]}
8. ${opts[8]}
对话：
小明：（找到科学老师）__Q1__
王老师：哦，小明，你想加入科学兴趣小组？很好啊！
小明：__Q2__ 我在上次的科学小发明比赛中还得了奖。
王老师：嗯，你确实对科学很有热情，表现也不错。
小明：__Q3__
王老师：没问题，我很乐意为你写推荐信。
小明：__Q4__
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
];

async function main() {
  console.log(
    `Start seeding ${dialogueExercisesData.length} MORE (Batch 21) Chinese Dialogue Completion exercises (Subject ID: ${CHINESE_SUBJECT_ID}, Topic ID: ${DIALOGUE_COMPLETION_TOPIC_ID})...`
  );

  const chineseSubject = await prisma.subject.findUnique({
    where: { id: CHINESE_SUBJECT_ID },
  });
  if (!chineseSubject) {
    console.error(
      `ERROR: Chinese Subject with ID ${CHINESE_SUBJECT_ID} not found.`
    );
    return;
  }
  console.log(`Verified Chinese Subject (ID: ${chineseSubject.id}) exists.`);

  const dialogueTopic = await prisma.topic.findUnique({
    where: { id: DIALOGUE_COMPLETION_TOPIC_ID },
  });
  if (!dialogueTopic) {
    console.error(
      `ERROR: Dialogue Completion Topic with ID ${DIALOGUE_COMPLETION_TOPIC_ID} not found.`
    );
    return;
  }
  if (dialogueTopic.subjectId !== CHINESE_SUBJECT_ID) {
    console.error(
      `ERROR: Topic ID ${DIALOGUE_COMPLETION_TOPIC_ID} ("${dialogueTopic.name}") is not linked to Subject ID ${CHINESE_SUBJECT_ID}.`
    );
    return;
  }
  console.log(
    `Verified Dialogue Completion Topic (ID: ${dialogueTopic.id}, Name: "${dialogueTopic.name}") exists and is linked to Subject ID ${CHINESE_SUBJECT_ID}.`
  );

  let startPdfPageForDialogues = 415; // Adjusted starting PDF page number for this new batch (e.g., 405 + 10)

  for (const exercise of dialogueExercisesData) {
    const dialogueExerciseGroupName = getUniqueDialogueGroupName(
      exercise.baseGroupName
    );
    let dialogueGroup;
    try {
      dialogueGroup = await prisma.questionGroup.upsert({
        where: { name: dialogueExerciseGroupName },
        update: {
          description: exercise.fullDialogueForGroup(
            exercise.sharedOptionsList
          ),
          sourceLevel: "Primary 6",
        },
        create: {
          name: dialogueExerciseGroupName,
          description: exercise.fullDialogueForGroup(
            exercise.sharedOptionsList
          ),
          audioUrl: null,
          sourceYear: 2024,
          sourceAssessmentType: "PSLE模拟练习 (完成对话)",
          sourceSchool: "模拟题库",
          sourceLevel: "Primary 6",
        },
      });
      console.log(
        `Upserted QuestionGroup: "${dialogueGroup.name}" (ID: ${dialogueGroup.id})`
      );
    } catch (error) {
      console.error(
        `Error upserting QuestionGroup "${dialogueExerciseGroupName}":`,
        error
      );
      continue;
    }

    const qNumPrefixes = ["Q1", "Q2", "Q3", "Q4"];
    for (let i = 0; i < 4; i++) {
      const q_data = {
        qNumOnPage: qNumPrefixes[i],
        textForQuestion: exercise.dialogueContext[i],
        correctAnswer: exercise.correctAnswers[i],
        difficulty: exercise.difficulties[i],
        marks: 2,
      };
      try {
        const questionText = `${exercise.baseGroupName} - ${q_data.qNumOnPage}: ${q_data.textForQuestion}`;
        await prisma.question.upsert({
          where: {
            unique_live_question_in_group_page_num: {
              questionGroupId: dialogueGroup.id,
              pdfPageNumber: startPdfPageForDialogues,
              questionNumberOnPage: q_data.qNumOnPage,
            },
          },
          update: {
            text: questionText,
            options: exercise.sharedOptionsList,
            correctAnswer: q_data.correctAnswer,
            difficulty: q_data.difficulty,
            productionReady: false,
            topicId: DIALOGUE_COMPLETION_TOPIC_ID,
          },
          create: {
            text: questionText,
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: exercise.sharedOptionsList,
            correctAnswer: q_data.correctAnswer,
            explanation: `请参考对话上下文。正确答案是选项 ${
              q_data.correctAnswer
            }: "${exercise.sharedOptionsList[parseInt(q_data.correctAnswer)]}"`,
            difficulty: q_data.difficulty,
            pointsAwarded: 10,
            subjectId: CHINESE_SUBJECT_ID,
            topicId: DIALOGUE_COMPLETION_TOPIC_ID,
            marks: q_data.marks,
            questionGroupId: dialogueGroup.id,
            answerKeyRawText: q_data.correctAnswer,
            pdfPageNumber: startPdfPageForDialogues,
            questionNumberOnPage: q_data.qNumOnPage,
            sourceAssessmentType: "PSLE模拟练习 (完成对话)",
            sourceLevel: "Primary 6",
            sourceYear: 2024,
            productionReady: false,
          },
        });
        console.log(
          `   Upserted Question ${q_data.qNumOnPage} for Group ID ${dialogueGroup.id}`
        );
      } catch (q_error) {
        console.error(
          `Error upserting Question ${q_data.qNumOnPage} for Group ID ${dialogueGroup.id}:`,
          q_error
        );
      }
    }
    startPdfPageForDialogues++;
  }
  console.log(
    `\nFinished seeding ${dialogueExercisesData.length} MORE (Batch 21) Dialogue Completion exercises with individual questions.`
  );

  // Now seed weekly quests
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Starting Weekly Quest Seeding...');
  console.log('='.repeat(60));
  
  try {
    await seedWeeklyQuests();
    console.log('✅ Weekly quest seeding completed successfully!');
  } catch (error) {
    console.error('❌ Weekly quest seeding failed:', error);
  }
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    if (e.code === "P2002" && e.meta && e.meta.target) {
      console.error(
        `Unique constraint failed on fields: ${e.meta.target.join(", ")}`
      );
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
