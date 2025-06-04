// prisma/seed.js
const {
  PrismaClient,
  QuestionType,
  DifficultyLevel,
} = require("../src/generated/prisma"); // Adjust path if needed
const prisma = new PrismaClient();

// --- Subject ID for Chinese ---
const CHINESE_SUBJECT_ID = 4; // Assuming 4 is Chinese

// --- Topic ID for Cloze Passage Skills ---
const TOPIC_ID_CLOZE = 43;
const TOPIC_NAME_CLOZE = "短文填空 (Cloze Passage Skills)";
const TOPIC_DESC_CLOZE = "Skills for completing cloze passages.";

async function main() {
  console.log(
    `Start seeding Cloze Passages for Chinese (Subject ID: ${CHINESE_SUBJECT_ID}, Topic ID: ${TOPIC_ID_CLOZE})...`
  );

  // --- 1. Ensure Cloze Topic Exists ---
  const clozeTopic = await prisma.topic.upsert({
    where: { id: TOPIC_ID_CLOZE },
    update: {
      name: TOPIC_NAME_CLOZE,
      description: TOPIC_DESC_CLOZE,
      subjectId: CHINESE_SUBJECT_ID,
    },
    create: {
      id: TOPIC_ID_CLOZE,
      name: TOPIC_NAME_CLOZE,
      description: TOPIC_DESC_CLOZE,
      subjectId: CHINESE_SUBJECT_ID,
    },
  });
  console.log(
    `Ensured/Created Topic: ${clozeTopic.name} (ID: ${clozeTopic.id})`
  );

  // --- CLOZE PASSAGE SET 1: "A Day in the Park" (洋洋去公园) ---
  const passageText1 = `今天，五岁的洋洋和家人一起到公园游玩。这是洋洋 Q16 (1 做梦 2 期盼 3 想象 4 关心) 已久的一天，因为他之前摔伤了腿，哪里都不能去。\n洋洋和哥哥在公园玩得很开心。突然，天暗了下来，下起了大雨。妈妈连忙收拾东西，爸爸也在翻找雨伞：“哎呀，我把雨伞放在客厅的沙发上了！”大家听了，Q17 (1 进一步 2 差不多 3 禁不住 4 回过神) 笑了起来。爸爸看着身边的东西，能遮雨的，只有一块塑料布。他把塑料布交给妈妈，妈妈立刻把它披在哥哥和洋洋的身上。哥哥看到雨水打湿了洋洋的衣服，便把塑料布给了洋洋。\n洋洋觉得很 Q18 (1 惭愧 2 好奇 3 为难 4 悲伤)：“哥哥为什么不要和我一起遮？”妈妈牵着洋洋边跑边说：“因为哥哥觉得自己比较 Q19 (1 强壮 2 勇敢 3 能干 4 精神)，他想保护弱小的你呀！”\n洋洋听了妈妈的话，挣脱妈妈的手，跑到不远处的草丛，在那儿蹲了下来，用塑料布遮着几朵在风雨中 Q20 (1 轻手轻脚 2 摇摇摆摆 3 争先恐后 4 东张西望) 的小花儿。爸爸、妈妈和哥哥望着洋洋可爱的模样，都笑了。\n不一会儿，雨过天晴，一家人又开开心心地继续游玩。`;

  const clozeGroup1 = await prisma.questionGroup.upsert({
    where: { name: "洋洋去公园 - Cloze Passage" },
    update: {
      description: passageText1,
      sourceAssessmentType: "PSLE Cloze Style 1",
    },
    create: {
      name: "洋洋去公园 - Cloze Passage",
      description: passageText1,
      sourceYear: 2024,
      sourceLevel: "Primary 6",
      sourceAssessmentType: "PSLE Cloze Style 1",
    },
  });
  console.log(
    `Upserted QuestionGroup: ${clozeGroup1.name} (ID: ${clozeGroup1.id})`
  );

  const clozeQuestions1 = [
    {
      qNum: "Q16",
      options: { 1: "做梦", 2: "期盼", 3: "想象", 4: "关心" },
      correctAnswer: "2",
      explanation: "洋洋因为之前受伤不能出去，所以他“期盼”这一天很久了。",
    },
    {
      qNum: "Q17",
      options: { 1: "进一步", 2: "差不多", 3: "禁不住", 4: "回过神" },
      correctAnswer: "3",
      explanation: "大家听到爸爸忘了带伞，“禁不住”笑了起来，表示忍不住。",
    },
    {
      qNum: "Q18",
      options: { 1: "惭愧", 2: "好奇", 3: "为难", 4: "悲伤" },
      correctAnswer: "2",
      explanation: "洋洋不明白哥哥为什么不一起用塑料布，所以感到“好奇”。",
    },
    {
      qNum: "Q19",
      options: { 1: "强壮", 2: "勇敢", 3: "能干", 4: "精神" },
      correctAnswer: "1",
      explanation: "妈妈解释说哥哥觉得自己比较“强壮”，可以不遮雨。",
    },
    {
      qNum: "Q20",
      options: { 1: "轻手轻脚", 2: "摇摇摆摆", 3: "争先恐后", 4: "东张西望" },
      correctAnswer: "2",
      explanation: "小花在风雨中“摇摇摆摆”，形容它们不稳定的样子。",
    },
  ];

  for (let i = 0; i < clozeQuestions1.length; i++) {
    const q = clozeQuestions1[i];
    const qDataFull = {
      pdfPageNumber: 2001 + i, // Assign some unique page numbers for this set
      questionNumberOnPage: q.qNum,
      text: `Fill in blank ${q.qNum} in the passage "${clozeGroup1.name}". Options are provided within the passage text or by the application.`, // Generic text, as options are inline or managed by UI
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: q.options,
      correctAnswer: q.correctAnswer,
      answerKeyRawText: q.options[q.correctAnswer],
      explanation: q.explanation,
      marks: 2,
      difficulty: DifficultyLevel.MEDIUM,
      pointsAwarded: 10,
      subjectId: CHINESE_SUBJECT_ID,
      topicId: clozeTopic.id,
      questionGroupId: clozeGroup1.id,
      sourceYear: 2024,
      sourceLevel: "Primary 6",
      sourceAssessmentType: "PSLE Cloze Style 1",
      productionReady: false, // Set to true for testing
    };
    await prisma.question.upsert({
      where: {
        unique_live_question_in_group_page_num: {
          questionGroupId: clozeGroup1.id,
          pdfPageNumber: qDataFull.pdfPageNumber,
          questionNumberOnPage: qDataFull.questionNumberOnPage,
        },
      },
      update: qDataFull,
      create: qDataFull,
    });
  }
  console.log(
    `Seeded ${clozeQuestions1.length} questions for "${clozeGroup1.name}".`
  );

  // --- CLOZE PASSAGE SET 2: "The Little Ant" (小蚂蚁的启发) ---
  const passageText2 = `炎热的下午，小明在院子里玩耍，看见一只小蚂蚁正 Q21 (1 努力 2 缓慢 3 偷偷 4 飞快) 地搬着一块比自己身体大好几倍的饼干屑。小蚂蚁走得很吃力，好几次都差一点儿 Q22 (1 放弃 2 成功 3 跌倒 4 迷路)。\n小明好奇地蹲下来观察。他看到小蚂蚁并没有因为困难而 Q23 (1 高兴 2 害怕 3 停止 4 骄傲)，反而更加用力地向前爬。有时候，饼干屑太重了，小蚂蚁就把它放下，自己先爬过一个小土丘，然后再回头把饼干屑拖上去。\n过了好一会儿，小蚂蚁终于把饼干屑搬到了蚁穴洞口。这时，从洞里爬出几只蚂蚁，一起 Q24 (1 分享 2 争抢 3 帮忙 4 观看) 把饼干屑抬了进去。\n小明看着，心里很受 Q25 (1 感动 2 批评 3 怀疑 4 嘲笑)。他想，小小的蚂蚁尚且如此坚持不懈，遇到困难也不退缩，我们人类更应该学习它们的精神。`;

  const clozeGroup2 = await prisma.questionGroup.upsert({
    where: { name: "小蚂蚁的启发 - Cloze Passage" },
    update: {
      description: passageText2,
      sourceAssessmentType: "PSLE Cloze Style 2",
    },
    create: {
      name: "小蚂蚁的启发 - Cloze Passage",
      description: passageText2,
      sourceYear: 2024,
      sourceLevel: "Primary 6",
      sourceAssessmentType: "PSLE Cloze Style 2",
    },
  });
  console.log(
    `Upserted QuestionGroup: ${clozeGroup2.name} (ID: ${clozeGroup2.id})`
  );

  const clozeQuestions2 = [
    {
      qNum: "Q21",
      options: { 1: "努力", 2: "缓慢", 3: "偷偷", 4: "飞快" },
      correctAnswer: "1",
      explanation: "蚂蚁“努力”地搬东西，形容它很用力。",
    },
    {
      qNum: "Q22",
      options: { 1: "放弃", 2: "成功", 3: "跌倒", 4: "迷路" },
      correctAnswer: "3",
      explanation: "小蚂蚁走得很吃力，差点“跌倒”。",
    },
    {
      qNum: "Q23",
      options: { 1: "高兴", 2: "害怕", 3: "停止", 4: "骄傲" },
      correctAnswer: "3",
      explanation: "小蚂蚁没有因为困难而“停止”不前。",
    },
    {
      qNum: "Q24",
      options: { 1: "分享", 2: "争抢", 3: "帮忙", 4: "观看" },
      correctAnswer: "3",
      explanation: "其他蚂蚁出来“帮忙”一起搬饼干屑。",
    },
    {
      qNum: "Q25",
      options: { 1: "感动", 2: "批评", 3: "怀疑", 4: "嘲笑" },
      correctAnswer: "1",
      explanation: "小明被蚂蚁的精神所“感动”。",
    },
  ];

  for (let i = 0; i < clozeQuestions2.length; i++) {
    const q = clozeQuestions2[i];
    const qDataFull = {
      pdfPageNumber: 2010 + i, // Different page numbers for this set
      questionNumberOnPage: q.qNum,
      text: `Fill in blank ${q.qNum} in the passage "${clozeGroup2.name}".`,
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: q.options,
      correctAnswer: q.correctAnswer,
      answerKeyRawText: q.options[q.correctAnswer],
      explanation: q.explanation,
      marks: 2,
      difficulty: DifficultyLevel.EASY, // Example difficulty
      pointsAwarded: 10,
      subjectId: CHINESE_SUBJECT_ID,
      topicId: clozeTopic.id,
      questionGroupId: clozeGroup2.id,
      sourceYear: 2024,
      sourceLevel: "Primary 6",
      sourceAssessmentType: "PSLE Cloze Style 2",
      productionReady: false,
    };
    await prisma.question.upsert({
      where: {
        unique_live_question_in_group_page_num: {
          questionGroupId: clozeGroup2.id,
          pdfPageNumber: qDataFull.pdfPageNumber,
          questionNumberOnPage: qDataFull.questionNumberOnPage,
        },
      },
      update: qDataFull,
      create: qDataFull,
    });
  }
  console.log(
    `Seeded ${clozeQuestions2.length} questions for "${clozeGroup2.name}".`
  );

  console.log(
    `\nSeeding completed for Cloze Passages (Topic ID: ${TOPIC_ID_CLOZE}).`
  );
  console.log(
    `Remember to update the paths in your frontend components if you are hardcoding QuestionGroup IDs for specific passages.`
  );
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
