// seed.js for YET ANOTHER 10 (Batch 11) Dialogue Completion QuestionGroups WITH 4 individual Question records each
const {
  PrismaClient,
  QuestionType,
  DifficultyLevel,
} = require("../src/generated/prisma"); // Adjust path to your Prisma Client
const prisma = new PrismaClient();

// --- IDs ---
const CHINESE_SUBJECT_ID = 4;
const DIALOGUE_COMPLETION_TOPIC_ID = 45; // YOUR EXISTING TOPIC ID

// --- Helper to generate unique Question Group names ---
let dialogueGroupCounter = 106; // Start counter from where the previous set left off (e.g., if prev was 96-105, start at 106)
function getUniqueDialogueGroupName(baseName) {
  const name = `${baseName} (Seed_DC_IndivQ_Batch11_${dialogueGroupCounter}_${Date.now()})`;
  dialogueGroupCounter++;
  return name;
}

// --- Data for 10 MORE Dialogue Completion Exercises ---
const dialogueExercisesData = [
  // Exercise 106
  {
    baseGroupName: "完成对话 (商量周末补习)",
    sharedOptionsList: {
      1: "这个周末你有空吗？我想和你一起复习华文。",
      2: "我觉得我的作文和阅读理解比较薄弱。",
      3: "那我们约在星期六上午在图书馆见面怎么样？",
      4: "太好了！有你一起复习，我感觉更有动力了！",
      5: "我周末要去参加篮球比赛。",
      6: "华文太难了，我不想复习。",
      7: "图书馆周末开门吗？",
      8: "我们可以请老师给我们补习吗？",
    },
    dialogueContext: [
      "小华：小明，__Q1__",
      "小华：是吗？太好了！__Q2__ 你呢？",
      "小华：嗯，好主意。__Q3__",
      "小华：__Q4__",
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
小华：小明，__Q1__
小明：好啊！我正想找个人一起复习呢。你觉得哪些部分需要加强？
小华：是吗？太好了！__Q2__ 你呢？
小明：我的口试和听力比较弱，我们可以互相练习。
小华：嗯，好主意。__Q3__
小明：没问题！图书馆环境安静，适合学习。
小华：__Q4__
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
  // Exercise 107
  {
    baseGroupName: "完成对话 (忘记带体育服)",
    sharedOptionsList: {
      1: "陈老师，对不起，我今天忘记带体育服了。",
      2: "我早上出门太急，不小心拿错了包。",
      3: "那我这节课可以在旁边观看吗？",
      4: "谢谢老师，我下次一定会记得带的。",
      5: "今天的体育课是什么内容？",
      6: "我可以向同学借体育服吗？",
      7: "我不想上体育课。",
      8: "我的体育服洗了还没干。",
    },
    dialogueContext: [
      "小刚：（找到体育老师）__Q1__",
      "小刚：__Q2__",
      "小刚：__Q3__ 我保证会认真观察同学们的动作。",
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
小刚：（找到体育老师）__Q1__
陈老师：哦？怎么回事？体育服是上体育课必需的。
小刚：__Q2__
陈老师：这样啊。那这节课你不能参加运动了。
小刚：__Q3__ 我保证会认真观察同学们的动作。
陈老师：好吧。下次一定要记住，不然会影响你的体育成绩。
小刚：__Q4__
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
  // Exercise 108
  {
    baseGroupName: "完成对话 (分享养宠物经验)",
    sharedOptionsList: {
      1: "你家新养的小狗真可爱！它叫什么名字？",
      2: "养宠物需要很多耐心和责任心。",
      3: "你要记得每天喂它食物，还要带它出去散步。",
      4: "看着它健康快乐地长大，是一件很幸福的事！",
      5: "我不太喜欢小狗，它们太吵了。",
      6: "小狗的寿命有多长？",
      7: "在哪里可以买到宠物用品？",
      8: "养宠物太花钱了。",
    },
    dialogueContext: [
      "小丽：小芳，__Q1__",
      "小丽：是啊，__Q2__ 我以前也养过小狗。",
      "小丽：嗯，还有，__Q3__ 这样它才不会生病。",
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
小丽：小芳，__Q1__
小芳：它叫“豆豆”！是不是很可爱？
小丽：是啊，__Q2__ 我以前也养过小狗。
小芳：真的吗？那你有什么经验可以分享吗？
小丽：嗯，还有，__Q3__ 这样它才不会生病。
小芳：我记住了！谢谢你的提醒。
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
      DifficultyLevel.MEDIUM,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 109
  {
    baseGroupName: "完成对话 (讨论如何提高写作水平)",
    sharedOptionsList: {
      1: "我的华文作文总是写不好，你有什么好办法吗？",
      2: "我觉得多阅读好的范文很有帮助。",
      3: "还有，平时要注意积累好词好句，多加运用。",
      4: "谢谢你的建议，我会努力尝试的！",
      5: "写作文太难了，我不想写。",
      6: "老师对我的作文评价不高。",
      7: "我们可以一起写作文吗？",
      8: "作文的题目是什么？",
    },
    dialogueContext: [
      "小明：小华，__Q1__",
      "小明：是吗？__Q2__ 可以学习别人的写作技巧。",
      "小明：嗯，这个方法不错。__Q3__",
      "小明：__Q4__ 希望能有进步。",
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
小华：嗯，提高写作水平确实需要一些方法和练习。
小明：是吗？__Q2__ 可以学习别人的写作技巧。
小华：对，模仿是学习的开始。
小明：嗯，这个方法不错。__Q3__
小华：是的，把学到的用到自己的作文里，慢慢就会进步。
小明：__Q4__ 希望能有进步。
答案：
Q1: 1
Q2: 2
Q3: 3
Q4: 4`,
    correctAnswers: ["1", "2", "3", "4"],
    difficulties: [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.HARD,
      DifficultyLevel.EASY,
    ],
  },
  // Exercise 110
  {
    baseGroupName: "完成对话 (邀请同学参加社区清洁活动)",
    sharedOptionsList: {
      1: "我们社区明天上午有个清洁日活动，你要不要一起参加？",
      2: "这是一个为社区做贡献的好机会。",
      3: "活动会提供手套和垃圾袋，我们只需要带上热情就行了。",
      4: "太好了！我们一起让社区变得更美丽！",
      5: "我明天有其他安排。",
      6: "清洁活动会很累吗？",
      7: "我们社区的环境已经很干净了。",
      8: "参加活动有奖励吗？",
    },
    dialogueContext: [
      "小芳：小刚，__Q1__",
      "小芳：__Q2__ 还能认识很多新朋友。",
      "小芳：是啊！__Q3__",
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
小芳：小刚，__Q1__
小刚：清洁日活动？听起来不错！
小芳：__Q2__ 还能认识很多新朋友。
小刚：好啊！我加入！我们需要准备什么吗？
小芳：是啊！__Q3__
小刚：那太方便了！
小芳：嗯！__Q4__
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
  // Exercise 111
  {
    baseGroupName: "完成对话 (课间休息讨论)",
    sharedOptionsList: {
      1: "刚才那节数学课的内容你都听懂了吗？",
      2: "我有些地方还是不太明白，特别是最后那道例题。",
      3: "我们可以一起去问问老师吗？",
      4: "太好了，有你一起我就不那么紧张了。",
      5: "数学课太简单了。",
      6: "下节课是什么课？",
      7: "老师讲得太快了。",
      8: "我们还是讨论一下别的吧。",
    },
    dialogueContext: [
      "小丽：小明，__Q1__",
      "小丽：__Q2__",
      "小丽：我也是！__Q3__ 我怕自己去问会说不清楚。",
      "小丽：__Q4__",
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
小明：大部分听懂了，但有几个概念还有点模糊。
小丽：__Q2__
小明：那道题确实有点难，我也没完全弄懂。
小丽：我也是！__Q3__ 我怕自己去问会说不清楚。
小明：好啊，我们现在就去！
小丽：__Q4__
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
  // Exercise 112
  {
    baseGroupName: "完成对话 (美术馆看画展)",
    sharedOptionsList: {
      1: "这个画展上的画都好有特色啊！",
      2: "我最喜欢那幅描绘星空的油画，太梦幻了。",
      3: "画家的想象力和技巧真是令人佩服。",
      4: "是啊，看画展能提升我们的审美能力！",
      5: "我对画画不感兴趣。",
      6: "这些画卖多少钱？",
      7: "我们可以拍照吗？",
      8: "美术馆什么时候关门？",
    },
    dialogueContext: [
      "小芳：小华，__Q1__",
      "小芳：我也是！__Q2__",
      "小芳：嗯，__Q3__",
      "小芳：对！__Q4__",
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
小华：是啊，每一幅都像一个故事。
小芳：我也是！__Q2__
小华：那幅我也很喜欢，颜色搭配得特别好。
小芳：嗯，__Q3__
小华：没错，能画出这样的作品真不简单。
小芳：对！__Q4__
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
  // Exercise 113
  {
    baseGroupName: "完成对话 (劝同学遵守规则)",
    sharedOptionsList: {
      1: "你为什么要在图书馆里吃零食？",
      2: "图书馆规定不许在里面吃东西的。",
      3: "这样会弄脏书本，也会影响其他同学阅读。",
      4: "请你把零食收起来，遵守图书馆的规则好吗？",
      5: "这个零食很好吃。",
      6: "我只是有点饿。",
      7: "没有人看见我吃零食。",
      8: "我们一起去外面吃吧。",
    },
    dialogueContext: [
      "小明：（看到小刚在吃零食）小刚！__Q1__",
      "小明：可是，__Q2__ 你忘了吗？",
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
小明：（看到小刚在吃零食）小刚！__Q1__
小刚：嘘……小声点，我只是偷偷吃一点。
小明：可是，__Q2__ 你忘了吗？
小刚：我知道，但是我很饿嘛。
小明：__Q3__
小刚：好吧好吧，我马上收起来。
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
  // Exercise 114
  {
    baseGroupName: "完成对话 (分享假期趣事)",
    sharedOptionsList: {
      1: "这个假期你过得怎么样？有什么有趣的事吗？",
      2: "我去了乡下外婆家，体验了农场生活，特别好玩！",
      3: "我还学会了喂小鸡、摘蔬菜，感觉很新鲜。",
      4: "下次有机会，你也应该去体验一下田园风光！",
      5: "我整个假期都在补习，好无聊。",
      6: "乡下的蚊子多吗？",
      7: "农场里有什么动物？",
      8: "我更喜欢城市生活。",
    },
    dialogueContext: [
      "小丽：小文，__Q1__",
      "小丽：哇，听起来真不错！__Q2__",
      "小丽：__Q3__",
      "小丽：太羡慕你了！__Q4__",
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
小丽：小文，__Q1__
小文：我过得非常充实！
小丽：哇，听起来真不错！__Q2__
小文：是啊，每天都能呼吸到新鲜空气，看到绿油油的田野。
小丽：__Q3__
小文：对啊，这些都是在城市里体验不到的。
小丽：太羡慕你了！__Q4__
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
  // Exercise 115
  {
    baseGroupName: "完成对话 (丢失钥匙)",
    sharedOptionsList: {
      1: "糟糕！我好像把家里的钥匙弄丢了！",
      2: "我记得出门的时候还带在身上的。",
      3: "会不会是掉在从学校回家的路上了？",
      4: "我得赶紧回去找找，不然晚上就进不了家门了！",
      5: "我可以去你家住一晚吗？",
      6: "我们家有备用钥匙吗？",
      7: "都怪我太粗心了。",
      8: "我们先去吃点东西吧。",
    },
    dialogueContext: [
      "小明：（焦急地在书包里翻找）哎呀！__Q1__",
      "小明：__Q2__ 怎么会不见了呢？",
      "小明：__Q3__ 我得沿路回去看看。",
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
小明：（焦急地在书包里翻找）哎呀！__Q1__
小刚：别慌，你仔细想想，最后一次用钥匙是什么时候？
小明：__Q2__ 怎么会不见了呢？
小刚：你再想想，从学校到这里，你都去过哪些地方？
小明：__Q3__ 我得沿路回去看看。
小刚：我陪你一起找吧！
小明：__Q4__
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
];

async function main() {
  console.log(
    `Start seeding ${dialogueExercisesData.length} MORE (Batch 11) Chinese Dialogue Completion exercises (Subject ID: ${CHINESE_SUBJECT_ID}, Topic ID: ${DIALOGUE_COMPLETION_TOPIC_ID})...`
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

  let startPdfPageForDialogues = 315; // Adjusted starting PDF page number for this new batch (e.g., 305 + 10)

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
    `\nFinished seeding ${dialogueExercisesData.length} MORE (Batch 11) Dialogue Completion exercises with individual questions.`
  );
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
