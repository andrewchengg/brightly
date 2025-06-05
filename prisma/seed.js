// seed.js
const {
  PrismaClient,
  QuestionType,
  DifficultyLevel,
} = require("../src/generated/prisma"); // Adjust path to your Prisma Client
const prisma = new PrismaClient();

// --- Subject ID for Chinese ---
// !!! IMPORTANT: Replace '4' with the actual ID of your 'Chinese' subject in the Subject table !!!
const CHINESE_SUBJECT_ID = 4;

// --- Topic ID for Reading Comprehension 1 ---
// !!! IMPORTANT: Replace '44' with the actual ID of your 'Reading Comprehension 1' topic in the Topic table !!!
const READING_COMP_1_TOPIC_ID = 44;

async function main() {
  console.log(
    `Start seeding 3 MORE Chinese Reading Comprehension 1 passages (Topic ID: ${READING_COMP_1_TOPIC_ID}) with ~5 Qs each, varied difficulty, and challenging options, productionReady=false...`
  );

  // 1. Ensure the Topic exists
  const readingCompTopic = await prisma.topic.upsert({
    where: { id: READING_COMP_1_TOPIC_ID },
    update: {
      name: "阅读理解（一）- Reading Comprehension 1",
      subjectId: CHINESE_SUBJECT_ID,
    },
    create: {
      id: READING_COMP_1_TOPIC_ID,
      name: "阅读理解（一）- Reading Comprehension 1",
      description:
        "Slightly longer reading comprehension passages with ~5 multiple-choice questions each.",
      subjectId: CHINESE_SUBJECT_ID,
    },
  });
  console.log(
    `Ensured Reading Comprehension 1 Topic (ID: ${readingCompTopic.id}) exists.`
  );

  let currentPdfPage = 143; // Continue PDF page numbering

  // --- Passage 43: The Little Bird That Couldn't Sing (不会唱歌的小鸟) ---
  const passage43GroupName =
    "不会唱歌的小鸟 - Reading Comp 1 (Seed " + Date.now() + "P43)";
  const passage43Group = await prisma.questionGroup.upsert({
    where: { name: passage43GroupName },
    update: {
      description:
        "在一片美丽的森林里，所有的小鸟都有一副好歌喉，它们的歌声清脆婉转，此起彼伏。只有一只名叫小羽的小鸟，它的歌声非常难听，又沙哑又跑调。因此，小羽常常感到自卑，不敢在大家面前开口。其他小鸟开音乐会时，它总是悄悄地躲在一旁羡慕地听着。一位智慧的老鹰看到了小羽的苦恼，便对它说：“每一种声音都有它存在的价值。你的歌声虽然和大家不一样，但也许它有别的用处呢？”小羽听了，半信半疑。一天，森林里来了一只凶恶的狐狸，想偷袭鸟巢里的小鸟。其他小鸟的歌声虽然好听，却无法吓跑狐狸。就在危急时刻，小羽鼓起勇气，用尽全力发出它那难听又响亮的声音。狐狸被这突如其来的怪声吓了一跳，以为是什么可怕的野兽，慌忙逃走了。小鸟们得救了。从此，小羽不再为自己的歌声感到自卑，它明白了，即使是不完美的声音，也能在关键时刻发挥重要的作用。",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
    create: {
      name: passage43GroupName,
      description:
        "在一片美丽的森林里，所有的小鸟都有一副好歌喉，它们的歌声清脆婉转，此起彼伏。只有一只名叫小羽的小鸟，它的歌声非常难听，又沙哑又跑调。因此，小羽常常感到自卑，不敢在大家面前开口。其他小鸟开音乐会时，它总是悄悄地躲在一旁羡慕地听着。一位智慧的老鹰看到了小羽的苦恼，便对它说：“每一种声音都有它存在的价值。你的歌声虽然和大家不一样，但也许它有别的用处呢？”小羽听了，半信半疑。一天，森林里来了一只凶恶的狐狸，想偷袭鸟巢里的小鸟。其他小鸟的歌声虽然好听，却无法吓跑狐狸。就在危急时刻，小羽鼓起勇气，用尽全力发出它那难听又响亮的声音。狐狸被这突如其来的怪声吓了一跳，以为是什么可怕的野兽，慌忙逃走了。小鸟们得救了。从此，小羽不再为自己的歌声感到自卑，它明白了，即使是不完美的声音，也能在关键时刻发挥重要的作用。",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
  });
  console.log(
    `Upserted QuestionGroup: ${passage43Group.name} (ID: ${passage43Group.id})`
  );

  const passage43Questions = [
    {
      qNum: "Q1",
      text: "Q1. 小羽最初为什么常常感到自卑？",
      opts: {
        1: "因为它长得没有其他小鸟漂亮",
        2: "因为它不会飞翔",
        3: "因为它的歌声难听，不敢在大家面前开口",
        4: "因为它没有朋友",
      },
      ans: "3",
      diff: DifficultyLevel.EASY,
      exp: "选项3是正确的。文章第二句提到：“只有一只名叫小羽的小鸟，它的歌声非常难听，又沙哑又跑调。因此，小羽常常感到自卑，不敢在大家面前开口。”\n选项1、2、4均未在文章中提及是它自卑的原因。",
      marks: 2,
    },
    {
      qNum: "Q2",
      text: "Q2. 老鹰对小羽说了什么话来开导它？",
      opts: {
        1: "劝它多练习唱歌，就能唱好听",
        2: "告诉它歌声不重要，只要会飞就行",
        3: "说每种声音都有价值，它的歌声也许有别的用处",
        4: "让它不要理会其他小鸟的看法",
      },
      ans: "3",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项3是正确的。老鹰对它说：“每一种声音都有它存在的价值。你的歌声虽然和大家不一样，但也许它有别的用处呢？”\n选项1是不正确的。老鹰没有说多练习就能唱好听，而是强调价值和不同用处。\n选项2是不正确的。老鹰没有贬低歌声的重要性。\n选项4是不正确的。虽然这也是一种安慰，但老鹰更侧重于发掘它声音的潜在价值。",
      marks: 2,
    },
    {
      qNum: "Q3",
      text: "Q3. 小羽的歌声是如何帮助小鸟们得救的？",
      opts: {
        1: "它的歌声吸引了猎人前来帮忙",
        2: "它的歌声非常好听，感动了狐狸",
        3: "它难听又响亮的声音吓跑了准备偷袭的狐狸",
        4: "它用歌声向其他动物求救",
      },
      ans: "3",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项3是正确的。文章描述：“就在危急时刻，小羽鼓起勇气，用尽全力发出它那难听又响亮的声音。狐狸被这突如其来的怪声吓了一跳...慌忙逃走了。”\n选项1是不正确的。没有提到猎人。\n选项2是不正确的。它的歌声是难听的，不是感动狐狸。\n选项4是不正确的。它是直接用声音吓跑狐狸，不是求救。",
      marks: 2,
    },
    {
      qNum: "Q4",
      text: "Q4. 狐狸被小羽的声音吓跑的主要原因是什么？",
      opts: {
        1: "因为它觉得小羽的歌声太刺耳了",
        2: "因为它以为那是什么可怕的野兽发出的声音",
        3: "因为它害怕其他小鸟会一起攻击它",
        4: "因为它不喜欢听见任何鸟叫声",
      },
      ans: "2",
      diff: DifficultyLevel.HARD,
      exp: "选项2是正确的。文章明确指出：“狐狸被这突如其来的怪声吓了一跳，以为是什么可怕的野兽，慌忙逃走了。”狐狸是被未知的、听起来可怕的声音吓跑的。\n选项1是不正确的。虽然歌声难听，但“刺耳”不足以让凶恶的狐狸逃跑，关键是它误以为是“可怕的野兽”。\n选项3是不正确的。当时其他小鸟的歌声无法吓跑狐狸。\n选项4是不正确的。狐狸偷袭鸟巢，说明它不怕普通的鸟叫声。",
      marks: 2,
    },
    {
      qNum: "Q5",
      text: "Q5. 经历这件事后，小羽明白了什么最重要的道理？",
      opts: {
        1: "以后还是要努力把歌练好听",
        2: "只有在危险的时候，它的歌声才有用",
        3: "不完美的东西有时也能发挥重要作用，不应为此自卑",
        4: "它应该感谢老鹰的智慧",
      },
      ans: "3",
      diff: DifficultyLevel.HARD,
      exp: "选项3是正确的。文章结尾写道：“从此，小羽不再为自己的歌声感到自卑，它明白了，即使是不完美的声音，也能在关键时刻发挥重要的作用。”这概括了它从经历中领悟到的核心道理。\n选项1是不正确的。它明白了自己声音的独特价值，而不是还要努力练好听。\n选项2是不正确的。“只有”过于绝对，它明白了不完美也能发挥作用，这是一种更积极的心态转变。\n选项4是不正确的。虽然老鹰开导了它，但它最终明白的道理是关于自身价值的认知。",
      marks: 2,
    },
  ];

  for (const q of passage43Questions) {
    await prisma.question.upsert({
      where: {
        unique_live_question_in_group_page_num: {
          questionGroupId: passage43Group.id,
          pdfPageNumber: currentPdfPage,
          questionNumberOnPage: q.qNum,
        },
      },
      update: {
        text: q.text,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        productionReady: false,
        topicId: readingCompTopic.id,
      },
      create: {
        text: q.text,
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        pointsAwarded: 10,
        subjectId: CHINESE_SUBJECT_ID,
        topicId: readingCompTopic.id,
        marks: q.marks,
        questionGroupId: passage43Group.id,
        answerKeyRawText: q.ans,
        pdfPageNumber: currentPdfPage,
        questionNumberOnPage: q.qNum,
        sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
        sourceLevel: "Primary 6",
        sourceYear: 2024,
        productionReady: false,
      },
    });
  }
  console.log(`Seeded Passage 43 with ${passage43Questions.length} questions.`);
  currentPdfPage++;

  // --- Passage 44: The Farmer and His Sons (农夫和他的儿子们) ---
  const passage44GroupName =
    "农夫和他的儿子们 - Reading Comp 1 (Seed " + Date.now() + "P44)";
  const passage44Group = await prisma.questionGroup.upsert({
    where: { name: passage44GroupName },
    update: {
      description:
        "一位勤劳的老农夫有几个儿子，他们身体强壮，但却很懒惰，整天游手好闲，不爱劳动。老农夫年纪大了，知道自己时日无多，便把儿子们叫到床前，对他们说：“孩子们，我在葡萄园里埋了一箱财宝，那是我留给你们的遗产。等我去世后，你们去把它挖出来吧。”儿子们听了，都非常兴奋，幻想着得到一大笔财富。老农夫去世后，儿子们立刻带上工具跑到葡萄园里，开始到处挖掘。他们把整个葡萄园的土地都翻了一遍，累得气喘吁吁，却连财宝的影子也没看见。他们非常失望和疲惫。然而，到了秋天，被他们翻松过的葡萄园里的葡萄长得格外茂盛，结出了又多又甜的果实，卖了很多钱。这时，儿子们才恍然大悟，原来父亲所说的“财宝”指的就是通过辛勤劳动获得的丰收。",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
    create: {
      name: passage44GroupName,
      description:
        "一位勤劳的老农夫有几个儿子，他们身体强壮，但却很懒惰，整天游手好闲，不爱劳动。老农夫年纪大了，知道自己时日无多，便把儿子们叫到床前，对他们说：“孩子们，我在葡萄园里埋了一箱财宝，那是我留给你们的遗产。等我去世后，你们去把它挖出来吧。”儿子们听了，都非常兴奋，幻想着得到一大笔财富。老农夫去世后，儿子们立刻带上工具跑到葡萄园里，开始到处挖掘。他们把整个葡萄园的土地都翻了一遍，累得气喘吁吁，却连财宝的影子也没看见。他们非常失望和疲惫。然而，到了秋天，被他们翻松过的葡萄园里的葡萄长得格外茂盛，结出了又多又甜的果实，卖了很多钱。这时，儿子们才恍然大悟，原来父亲所说的“财宝”指的就是通过辛勤劳动获得的丰收。",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
  });
  console.log(
    `Upserted QuestionGroup: ${passage44Group.name} (ID: ${passage44Group.id})`
  );

  const passage44Questions = [
    {
      qNum: "Q1",
      text: "Q1. 老农夫的儿子们最初有什么主要缺点？",
      opts: {
        1: "他们身体虚弱，不能劳动",
        2: "他们很懒惰，不爱劳动",
        3: "他们非常贪心，总想不劳而获",
        4: "他们不听从父亲的教诲",
      },
      ans: "2",
      diff: DifficultyLevel.EASY,
      exp: "选项2是正确的。文章第一句描述他们“身体强壮，但却很懒惰，整天游手好闲，不爱劳动。”\n选项1是不正确的。文章说他们“身体强壮”。\n选项3虽然他们听到财宝很兴奋，但文章直接点出的缺点是“懒惰，不爱劳动”。\n选项4虽然他们懒惰可能算不听教诲，但“懒惰”是更直接描述的缺点。",
      marks: 2,
    },
    {
      qNum: "Q2",
      text: "Q2. 老农夫告诉儿子们葡萄园里埋有财宝的真实目的是什么？",
      opts: {
        1: "他真的在葡萄园里埋了金银珠宝",
        2: "他想让儿子们通过挖掘财宝来锻炼身体",
        3: "他想用这个方法激励懒惰的儿子们去翻松葡萄园的土地，从而体验劳动的价值",
        4: "他想在去世前捉弄一下儿子们",
      },
      ans: "3",
      diff: DifficultyLevel.HARD,
      exp: "选项3是正确的。老农夫知道儿子们懒惰，用“财宝”作为诱饵，目的是让他们去挖掘，从而间接地翻松土地，为葡萄丰收创造条件，并最终让他们明白劳动的价值。这是一种巧妙的教育方法。\n选项1是不正确的。他们最终没有挖到物质财宝。\n选项2是不正确的。锻炼身体可能是附带效果，但主要目的是让他们劳动并认识到劳动的成果。\n选项4是不正确的。老农夫是出于好意，想教育儿子们，不是捉弄。",
      marks: 2,
    },
    {
      qNum: "Q3",
      text: "Q3. 儿子们在葡萄园里挖掘后，最初的心情是怎样的？为什么？",
      opts: {
        1: "非常高兴，因为他们找到了很多财宝",
        2: "非常疲惫，但对找到财宝充满希望",
        3: "非常失望和疲惫，因为没有找到财宝",
        4: "非常愤怒，觉得被父亲欺骗了",
      },
      ans: "3",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项3是正确的。文章描述：“他们把整个葡萄园的土地都翻了一遍，累得气喘吁吁，却连财宝的影子也没看见。他们非常失望和疲惫。”\n选项1是不正确的。他们没有找到财宝。\n选项2是不正确的。他们是“失望”，不是充满希望。\n选项4是不正确的。他们是“失望和疲惫”，文章没有直接说他们感到愤怒或被骗，直到最后才恍然大悟。",
      marks: 2,
    },
    {
      qNum: "Q4",
      text: "Q4. 儿子们最终是如何得到“财宝”的？",
      opts: {
        1: "他们在葡萄园的一个角落里找到了父亲埋藏的箱子",
        2: "他们把翻松的土地卖给了别人",
        3: "他们辛勤挖掘翻松了土地，使得葡萄大丰收，卖了很多钱",
        4: "邻居们可怜他们，凑钱给了他们一些",
      },
      ans: "3",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项3是正确的。文章写道：“然而，到了秋天，被他们翻松过的葡萄园里的葡萄长得格外茂盛，结出了又多又甜的果实，卖了很多钱。”这才是父亲所说的真正的“财宝”。\n选项1是不正确的。没有找到埋藏的箱子。\n选项2和4文章没有提及。",
      marks: 2,
    },
    {
      qNum: "Q5",
      text: "Q5. 这个故事主要想告诉我们什么道理？",
      opts: {
        1: "不应该轻信别人的话，即使是自己的父亲",
        2: "天上不会掉馅饼，意外之财不可靠",
        3: "辛勤劳动本身就是一种宝贵的财富，能带来丰厚的回报",
        4: "孩子们应该学会自己管理遗产",
      },
      ans: "3",
      diff: DifficultyLevel.HARD,
      exp: "选项3是正确的。故事通过农夫巧妙地引导儿子们劳动，并让他们亲身体验到劳动成果（丰收的葡萄卖了很多钱）就是真正的“财宝”，从而揭示了辛勤劳动创造价值的道理。\n选项1是不正确的。父亲是善意的引导，不是欺骗。\n选项2是不正确的。虽然也相关，但故事更直接强调的是通过劳动创造财富。\n选项4是不正确的。这不是故事的核心教训。",
      marks: 2,
    },
  ];

  for (const q of passage44Questions) {
    await prisma.question.upsert({
      where: {
        unique_live_question_in_group_page_num: {
          questionGroupId: passage44Group.id,
          pdfPageNumber: currentPdfPage,
          questionNumberOnPage: q.qNum,
        },
      },
      update: {
        text: q.text,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        productionReady: false,
        topicId: readingCompTopic.id,
      },
      create: {
        text: q.text,
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        pointsAwarded: 10,
        subjectId: CHINESE_SUBJECT_ID,
        topicId: readingCompTopic.id,
        marks: q.marks,
        questionGroupId: passage44Group.id,
        answerKeyRawText: q.ans,
        pdfPageNumber: currentPdfPage,
        questionNumberOnPage: q.qNum,
        sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
        sourceLevel: "Primary 6",
        sourceYear: 2024,
        productionReady: false,
      },
    });
  }
  console.log(`Seeded Passage 44 with ${passage44Questions.length} questions.`);
  currentPdfPage++;

  // --- Passage 45: The Contest Between the Wind and the Sun (北风和太阳的比赛) ---
  const passage45GroupName =
    "北风和太阳的比赛 - Reading Comp 1 (Seed " + Date.now() + "P45)";
  const passage45Group = await prisma.questionGroup.upsert({
    where: { name: passage45GroupName },
    update: {
      description:
        "北风和太阳常常争论谁的本领更大。一天，它们看到一个穿着厚外套的行路人，便决定比赛，看谁能先让行路人脱掉外套。北风首先得意洋洋地出场，它鼓起腮帮，猛烈地吹着寒冷的风，想把行路人的外套吹掉。可是，风越吹得紧，行路人反而把外套裹得越紧，甚至还加上了围巾。北风吹得筋疲力尽，只好认输。接着，太阳出来了。它没有像北风那样猛烈，只是微笑着散发出温暖的阳光，照在行路人身上。行路人渐渐感到暖和起来，便主动解开了围巾，然后脱掉了厚外套，坐在路边休息。北风看了，十分佩服。太阳说：“有时候，强硬的方法未必有效，温和与友善往往能达到更好的效果。”",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
    create: {
      name: passage45GroupName,
      description:
        "北风和太阳常常争论谁的本领更大。一天，它们看到一个穿着厚外套的行路人，便决定比赛，看谁能先让行路人脱掉外套。北风首先得意洋洋地出场，它鼓起腮帮，猛烈地吹着寒冷的风，想把行路人的外套吹掉。可是，风越吹得紧，行路人反而把外套裹得越紧，甚至还加上了围巾。北风吹得筋疲力尽，只好认输。接着，太阳出来了。它没有像北风那样猛烈，只是微笑着散发出温暖的阳光，照在行路人身上。行路人渐渐感到暖和起来，便主动解开了围巾，然后脱掉了厚外套，坐在路边休息。北风看了，十分佩服。太阳说：“有时候，强硬的方法未必有效，温和与友善往往能达到更好的效果。”",
      sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
      sourceLevel: "Primary 6",
      sourceYear: 2024,
      audioUrl: null,
    },
  });
  console.log(
    `Upserted QuestionGroup: ${passage45Group.name} (ID: ${passage45Group.id})`
  );

  const passage45Questions = [
    {
      qNum: "Q1",
      text: "Q1. 北风和太阳为什么要进行比赛？",
      opts: {
        1: "它们想看看谁能帮助行路人",
        2: "它们想通过比赛决定谁是天气的主宰",
        3: "它们常常争论谁的本领更大，想通过比赛分出胜负",
        4: "行路人请求它们比赛来取乐",
      },
      ans: "3",
      diff: DifficultyLevel.EASY,
      exp: "选项3是正确的。文章第一句提到：“北风和太阳常常争论谁的本领更大。”后来它们看到行路人便“决定比赛，看谁能先让行路人脱掉外套”，目的是为了解决它们之间的争论。\n选项1是不正确的。它们是比赛，不是想帮助行路人。\n选项2是不正确的。是比本领大小，不是主宰天气。\n选项4是不正确的。是它们自己决定比赛。",
      marks: 2,
    },
    {
      qNum: "Q2",
      text: "Q2. 北风试图让行路人脱掉外套时，采取了什么方法？结果如何？",
      opts: {
        1: "它轻轻地吹拂，行路人脱掉了外套",
        2: "它猛烈地吹着寒冷的风，行路人把外套裹得更紧了",
        3: "它和太阳合作，一起让行路人感到温暖",
        4: "它吹起了温暖的风，行路人很快就脱了外套",
      },
      ans: "2",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项2是正确的。文章描述北风“猛烈地吹着寒冷的风...可是，风越吹得紧，行路人反而把外套裹得越紧”。\n选项1和4与北风吹的是“寒冷的风”以及结果不符。\n选项3是不正确的。它们是比赛，没有合作。",
      marks: 2,
    },
    {
      qNum: "Q3",
      text: "Q3. 太阳是如何成功让行路人脱掉外套的？",
      opts: {
        1: "它突然升高温度，让行路人热得受不了",
        2: "它用强光照射行路人的眼睛，迫使他脱衣",
        3: "它微笑着散发温暖的阳光，让行路人渐渐感到暖和而主动脱衣",
        4: "它请求行路人配合比赛，脱掉外套",
      },
      ans: "3",
      diff: DifficultyLevel.MEDIUM,
      exp: "选项3是正确的。文章描述太阳“只是微笑着散发出温暖的阳光...行路人渐渐感到暖和起来，便主动解开了围巾，然后脱掉了厚外套”。\n选项1是不正确的。“突然升高温度”和“热得受不了”的描述过于极端，太阳的方法是温和的。\n选项2是不正确的。没有提到强光照射眼睛。\n选项4是不正确的。行路人是因感到暖和而主动脱衣，不是被请求。",
      marks: 2,
    },
    {
      qNum: "Q4",
      text: "Q4. 北风看到太阳成功后，它的反应是什么？",
      opts: {
        1: "非常生气，不承认失败",
        2: "觉得太阳的方法很愚蠢",
        3: "十分佩服太阳的方法",
        4: "决定再和太阳比试一次",
      },
      ans: "3",
      diff: DifficultyLevel.EASY,
      exp: "选项3是正确的。文章写道：“北风看了，十分佩服。”\n选项1、2、4均与文章描述不符。",
      marks: 2,
    },
    {
      qNum: "Q5",
      text: "Q5. 这个寓言故事主要想说明什么道理？",
      opts: {
        1: "太阳总是比北风更强大",
        2: "做事要像北风一样直接有力",
        3: "强硬的方法有时不如温和与友善的方法有效",
        4: "只有通过比赛才能真正了解对方的实力",
      },
      ans: "3",
      diff: DifficultyLevel.HARD,
      exp: "选项3是正确的。故事结尾太阳说：“有时候，强硬的方法未必有效，温和与友善往往能达到更好的效果。”这正是故事通过对比北风和太阳的方法及其结果所要揭示的道理。\n选项1是不正确的。故事不是简单比较谁更强大，而是比较方法的效果。\n选项2是不正确的。北风的方法失败了，故事不提倡这种方法。\n选项4是不正确的。这不是故事的核心寓意，故事的重点在于方法的选择及其效果。",
      marks: 2,
    },
  ];

  for (const q of passage45Questions) {
    await prisma.question.upsert({
      where: {
        unique_live_question_in_group_page_num: {
          questionGroupId: passage45Group.id,
          pdfPageNumber: currentPdfPage,
          questionNumberOnPage: q.qNum,
        },
      },
      update: {
        text: q.text,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        productionReady: false,
        topicId: readingCompTopic.id,
      },
      create: {
        text: q.text,
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: q.opts,
        correctAnswer: q.ans,
        explanation: q.exp,
        difficulty: q.diff,
        pointsAwarded: 10,
        subjectId: CHINESE_SUBJECT_ID,
        topicId: readingCompTopic.id,
        marks: q.marks,
        questionGroupId: passage45Group.id,
        answerKeyRawText: q.ans,
        pdfPageNumber: currentPdfPage,
        questionNumberOnPage: q.qNum,
        sourceAssessmentType: "PSLE Paper 2 Reading Comp 1",
        sourceLevel: "Primary 6",
        sourceYear: 2024,
        productionReady: false,
      },
    });
  }
  console.log(`Seeded Passage 45 with ${passage45Questions.length} questions.`);
  currentPdfPage++;

  console.log(
    `\nFinished seeding 3 MORE Reading Comprehension 1 passages and their questions.`
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
