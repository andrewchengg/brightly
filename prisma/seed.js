// prisma/seed.js
const { PrismaClient, QuestionType, DifficultyLevel } = require('../src/generated/prisma');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

// --- Supabase Client for Storage (service role key) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or Service Role Key is missing. Check .env at project root.");
  process.exit(1);
}
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

// --- OpenAI Client ---
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is missing from .env");
  process.exit(1);
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TTS_AUDIO_BUCKET = 'tts-audio';
// *** NEW IDENTIFIER FOR THIS NEW BATCH OF 10 PASSAGES ***
const CURRENT_BATCH_PAPER_IDENTIFIER = "PSLE_LC_FRESH_SET_10_V15_BATCH11_SPEED1"; // New identifier
const TTS_SPEED = 1.0;
const DELAY_BETWEEN_TTS_MS = 5000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAndStoreTTS(text, fileNamePrefix) {
  // ... (generateAndStoreTTS function remains the same as the last version)
  if (!text || text.trim() === "") { /* ... */ return null; }
  console.log(`  Generating TTS for: ${fileNamePrefix.substring(0,30)}... (Length: ${text.length}, Speed: ${TTS_SPEED})`);
  try {
    const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: text, response_format: "mp3", speed: TTS_SPEED });
    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    const sanitizedPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().substring(0, 50);
    const filePath = `chinese_lc/${CURRENT_BATCH_PAPER_IDENTIFIER.toLowerCase()}/${sanitizedPrefix}_${Date.now()}.mp3`;
    console.log(`    Uploading ${filePath} to Supabase bucket: ${TTS_AUDIO_BUCKET}...`);
    const { error: uploadError } = await supabaseAdminClient.storage.from(TTS_AUDIO_BUCKET).upload(filePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabaseAdminClient.storage.from(TTS_AUDIO_BUCKET).getPublicUrl(filePath);
    if (!publicUrlData?.publicUrl) throw new Error(`Could not get public URL for ${filePath}`);
    console.log(`    TTS & Upload successful for "${fileNamePrefix.substring(0,30)}".`);
    return publicUrlData.publicUrl;
  } catch (error) { /* ... error logging from previous version ... */ return null; }
}

// JSDoc type definitions
/** @typedef {Object} SeedQuestionOption ... */
/** @typedef {Object} SeedQuestionCorrectAnswer ... */
/** @typedef {Object} SeedQuestionDefinition ... */
/** @typedef {Object} SeedPassageDefinition ... */

async function deletePassageSet(identifierToDelete, bucket) {
    // ... (deletePassageSet function remains the same as the last version) ...
    console.log(`\n[Deletion Sub-Routine] Checking for data with IDENTIFIER: ${identifierToDelete}...`);
    const groups = await prisma.questionGroup.findMany({ where: { sourceAssessmentType: identifierToDelete }, select: { id: true, audioUrl: true }});
    if (groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        await prisma.question.deleteMany({ where: { questionGroupId: { in: groupIds } } });
        await prisma.questionGroup.deleteMany({ where: { id: { in: groupIds } } });
        const audioFiles = groups.map(g => g.audioUrl).filter(Boolean).map(url => { try { const p = new URL(url).pathname.split(`/${bucket}/`)[1]; return p; } catch { return null; }}).filter(Boolean);
        if (audioFiles.length > 0) {
            const folder = `chinese_lc/${identifierToDelete.toLowerCase()}`;
            const { data: listData, error: listError } = await supabaseAdminClient.storage.from(bucket).list(folder);
            if (!listError && listData && listData.length > 0) {
                const filesInFolder = listData.map(f => `${folder}/${f.name}`);
                if (filesInFolder.length > 0) await supabaseAdminClient.storage.from(bucket).remove(filesInFolder);
            }
        }
        console.log(`  Deletion for ${identifierToDelete} complete.`);
    } else { console.log(`  No data found for ${identifierToDelete} to delete.`); }
}


async function main() {
  console.log(`STARTING SEED SCRIPT for NEW BATCH: ${CURRENT_BATCH_PAPER_IDENTIFIER} (Speed ${TTS_SPEED})...`);

  // --- Targeted DELETION for the CURRENT_BATCH_PAPER_IDENTIFIER (for idempotency) ---
  await deletePassageSet(CURRENT_BATCH_PAPER_IDENTIFIER, TTS_AUDIO_BUCKET);

  // --- Upsert Subject and Topic ---
  console.log("\n[Setup Phase] Upserting Subject and Topic...");
  const chineseLanguageSubject = await prisma.subject.upsert({
    where: { name: 'Chinese' }, update: {}, create: { name: 'Chinese' },
  });
  const listeningTopic = await prisma.topic.upsert({
    where: { name_subjectId: { name: '听力理解综合练习 (Stored Audio Speed 1.0)', subjectId: chineseLanguageSubject.id } },
    update: {},
    create: {
      name: '听力理解综合练习 (Stored Audio Speed 1.0)',
      description: 'PSLE 标准听力理解题集 - 音频已存储 (标准语速)',
      subjectId: chineseLanguageSubject.id,
    },
  });
  console.log(`  Upserted Subject: ${chineseLanguageSubject.name}, Topic: ${listeningTopic.name}`);
  console.log("[Setup Phase] Complete.");

  // --- Define 10 NEW Listening Passages (Batch 11 - Speed 1.0) ---
  // *** PLEASE ADJUST `currentGlobalQuestionNumber` CAREFULLY! ***
  // If your previous batch (P101-P110) ended at question "144", this starts at "145".
  let currentGlobalQuestionNumber = 145; // <<<< ADJUST THIS!

  /** @type {SeedPassageDefinition[]} */
  const listeningPassagesDataBatch11Speed1 = [
    // Passage 121 (1 Q)
    {
      passageNameSuffix: "P121_School_Cleaning_Campaign_Announce",
      passageFullScript: "同学们请注意，为配合即将来临的“清洁与绿化周”，我校将于本周五下午举行大扫除活动。请各班同学在班主任的带领下，认真打扫课室及公共区域。工具将由学校提供。让我们一起美化校园！",
      passageOrder: 121,
      questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "学校大扫除活动将在什么时候举行？", options: [ { id: "1", text: "本周一上午。" }, { id: "2", text: "本周五下午。" }, { id: "3", text: "下周一全天。" }], correctAnswer: { id: "2" }, marks: 2, difficulty: DifficultyLevel.EASY, } ],
    },
    // Passage 122 (Dialogue - Baking Cookies) (2 Qs)
    {
      passageNameSuffix: "P122_Baking_Cookies_Dialogue",
      passageFullScript: "女儿：妈妈，我们今天可以一起做饼干吗？我想做巧克力口味的。\n妈妈：好啊！做饼干很有趣。我们需要面粉、糖、鸡蛋、牛油，还有巧克力豆。你去把材料拿出来吧。\n女儿：太好了！我最喜欢和妈妈一起做点心了。\n妈妈：做好了我们可以送一些给隔壁的王奶奶尝尝。",
      passageOrder: 122,
      questions: [
        { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "女儿想做什么口味的饼干？", options: [ { id: "1", text: "香草口味。" }, { id: "2", text: "草莓口味。" }, { id: "3", text: "巧克力口味。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.EASY, },
        { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "妈妈建议把做好的饼干送给谁？", options: [ { id: "1", text: "老师。" }, { id: "2", text: "隔壁的王奶奶。" }, { id: "3", text: "同学。" }], correctAnswer: { id: "2" }, marks: 2, difficulty: DifficultyLevel.MEDIUM, },
      ],
    },
    // Passage 123 (Story - The Boy and The Apple Tree) (1 Q - Inferential)
    {
      passageNameSuffix: "P123_Boy_Apple_Tree_Story",
      passageFullScript: "很久以前，有一棵大苹果树和一个小男孩。男孩每天都喜欢来和苹果树玩，爬树、吃苹果、在树荫下睡觉。苹果树也很喜欢男孩。男孩长大了，很久没来看苹果树。一天，男孩回来了，看起来很难过。他说：“我需要钱买玩具。”苹果树说：“把我所有的苹果都摘去卖掉吧。”男孩照做了。又过了很多年，男孩回来了，他说：“我需要一栋房子。”苹果树说：“砍下我的树枝去盖房子吧。”男孩又照做了。再后来，男孩变成老人回来了，他说：“我想出海远航，但我没有船。”苹果树说：“把我最后的树干砍去做船吧。”老人最后坐着树做的小船出海了。苹果树虽然什么都没有了，但它很快乐。",
      passageOrder: 123,
      questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "苹果树为什么最后会感到快乐？", options: [ { id: "1", text: "因为它结了很多苹果。" }, { id: "2", text: "因为它帮助了男孩实现愿望。" }, { id: "3", text: "因为它变得很高大。" }], correctAnswer: { id: "2" }, marks: 2, difficulty: DifficultyLevel.HARD, } ],
    },
    // Passage 124 (Instructions - School Talent Show Audition) (1 Q)
    {
      passageNameSuffix: "P124_Talent_Show_Audition_Instructions",
      passageFullScript: "“校园才艺秀”海选开始啦！无论你是唱歌、跳舞、乐器演奏还是其他才艺，都欢迎报名参加。报名截止日期为本周五。请到音乐室外布告栏索取报名表格，并在下周一带齐所需道具到礼堂参加海选。",
      passageOrder: 124,
      questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "参加“校园才艺秀”海选的同学应该在哪里索取报名表格？", options: [ { id: "1", text: "教员室。" }, { id: "2", text: "学校网站。" }, { id: "3", text: "音乐室外布告栏。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.MEDIUM, } ],
    },
    // Passage 125 (Advertisement - Science Museum Workshop) (1 Q)
    {
      passageNameSuffix: "P125_Science_Museum_Workshop_Ad",
      passageFullScript: "探索科学奥秘！科学馆将于学校假期举办“小小科学家”工作坊，适合七至十岁的儿童参加。通过有趣的动手实验，激发孩子对科学的兴趣。名额有限，请尽早通过科学馆网站报名。费用为每人三十元。",
      passageOrder: 125,
      questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "“小小科学家”工作坊的报名费是多少？", options: [ { id: "1", text: "免费。" }, { id: "2", text: "每人二十元。" }, { id: "3", text: "每人三十元。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.EASY, } ],
    },
    // Passage 126 (Dialogue - Traffic Jam) (2 Qs)
    {
        passageNameSuffix: "P126_Traffic_Jam_Dialogue",
        passageFullScript: "司机：乘客您好，前面好像发生交通事故了，现在路上非常堵车。\n乘客：是吗？那大概要堵多久啊？我赶时间去机场，怕来不及。\n司机：看起来有点严重，可能至少要半个小时。如果您真的很赶时间，我建议您在前面那个地铁站下车，改搭地铁去机场会比较快。\n乘客：好吧，那麻烦您在地铁站让我下车。谢谢您的建议。",
        passageOrder: 126,
        questions: [
            { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "路上堵车的主要原因是什么？", options: [ { id: "1", text: "道路维修。" }, { id: "2", text: "下大雨。" }, { id: "3", text: "发生交通事故。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.EASY, },
            { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "司机建议乘客怎样去机场？", options: [ { id: "1", text: "继续等德士。" }, { id: "2", text: "走路去机场。" }, { id: "3", text: "改搭地铁。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.MEDIUM, }
        ],
    },
    // Passage 127 (Story - The Fox and The Grapes Adaptation) (1 Q)
    {
        passageNameSuffix: "P127_Fox_Grapes_Adapt_Story",
        passageFullScript: "一只狐狸饿了，它走到一个葡萄架下，看到架上挂着一串串熟透了的紫葡萄。狐狸馋得直流口水，它跳起来想摘葡萄，试了好几次，就是够不着。最后，狐狸只好放弃了。它边走边自言自语地说：“这葡萄肯定是酸的，不好吃！”",
        passageOrder: 127,
        questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "狐狸为什么说葡萄是酸的？", options: [ { id: "1", text: "它真的尝过葡萄是酸的。" }, { id: "2", text: "因为它摘不到葡萄，自我安慰。" }, { id: "3", text: "别人告诉它葡萄是酸的。" }], correctAnswer: { id: "2" }, marks: 2, difficulty: DifficultyLevel.HARD, } ], // Inferential
    },
    // Passage 128 (Instructions - School Field Trip Consent Form) (1 Q)
    {
        passageNameSuffix: "P128_Field_Trip_Consent_Instructions",
        passageFullScript: "各位家长，学校将于下个月组织四年级学生前往新生水厂参观。请详细阅读随函附上的活动详情和安全须知。如果您同意孩子参加，请在本周五之前填写并交回家长同意书给班主任。逾期者将视为不参加。",
        passageOrder: 128,
        questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "家长同意书最晚应该在什么时候交给班主任？", options: [ { id: "1", text: "活动当天。" }, { id: "2", text: "下个星期一。" }, { id: "3", text: "本周五之前。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.MEDIUM, } ],
    },
    // Passage 129 (Dialogue - Asking for Directions) (1 Q)
    {
        passageNameSuffix: "P129_Asking_Directions_Dialogue",
        passageFullScript: "游客：不好意思，请问国家博物馆怎么走？\n路人：哦，国家博物馆离这里不远。你沿着这条路直走，过两个路口，然后向左转，就能看到了。大概走十分钟就到了。\n游客：太感谢您了！\n路人：不客气。",
        passageOrder: 129,
        questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "去国家博物馆需要走多久？", options: [ { id: "1", text: "大约五分钟。" }, { id: "2", text: "大约十分钟。" }, { id: "3", text: "大约二十分钟。" }], correctAnswer: { id: "2" }, marks: 2, difficulty: DifficultyLevel.EASY, } ],
    },
    // Passage 130 (Announcement - School Sports Equipment Borrowing) (1 Q)
    {
        passageNameSuffix: "P130_Sports_Equipment_Borrowing_Announce",
        passageFullScript: "同学们，体育器材室从今天起调整开放时间。新的开放时间为每天午餐后的一点至一点三十分，以及下午三点至三点三十分。借用器材时请出示学生证，并在使用完毕后按时归还。请爱护体育器材。",
        passageOrder: 130,
        questions: [ { questionNumberOnPage: String(currentGlobalQuestionNumber++), text: "体育器材室下午的开放时间是什么时候？", options: [ { id: "1", text: "一点至一点三十分。" }, { id: "2", text: "两点至两点三十分。" }, { id: "3", text: "三点至三点三十分。" }], correctAnswer: { id: "3" }, marks: 2, difficulty: DifficultyLevel.MEDIUM, } ],
    },
  ];

  console.log(`\n[Content Seeding Phase - Current Batch ${CURRENT_BATCH_PAPER_IDENTIFIER}] Defined ${listeningPassagesDataBatch11Speed1.length} new passages.`);
  let seededPassageCount = 0;
  let totalQuestionsInThisBatch = 0;

  for (const passageDef of listeningPassagesDataBatch11Speed1) {
    const groupNameForDb = `${CURRENT_BATCH_PAPER_IDENTIFIER} - ${passageDef.passageNameSuffix}`;
    console.log(`\nProcessing New Passage (Current Batch): ${passageDef.passageOrder}. ${passageDef.passageNameSuffix}`);

    const storedAudioUrl = await generateAndStoreTTS(passageDef.passageFullScript, passageDef.passageNameSuffix);
    console.log(`  Waiting for ${DELAY_BETWEEN_TTS_MS / 1000} seconds before next TTS generation...`);
    await delay(DELAY_BETWEEN_TTS_MS);

    if (!storedAudioUrl) {
      console.warn(`  Skipping QuestionGroup ${groupNameForDb} (Current Batch) due to TTS/upload failure.`);
      continue;
    }

    const questionGroup = await prisma.questionGroup.create({
      data: {
        name: groupNameForDb,
        description: passageDef.passageFullScript,
        audioUrl: storedAudioUrl,
        sourceYear: 2024,
        sourceLevel: "P6",
        sourceAssessmentType: CURRENT_BATCH_PAPER_IDENTIFIER,
      },
    });

    for (const qDef of passageDef.questions) {
      await prisma.question.create({
        data: {
          pdfPageNumber: passageDef.passageOrder,
          questionNumberOnPage: qDef.questionNumberOnPage,
          text: qDef.text,
          questionType: QuestionType.MULTIPLE_CHOICE,
          options: qDef.options,
          correctAnswer: qDef.correctAnswer,
          marks: qDef.marks,
          difficulty: qDef.difficulty,
          pointsAwarded: 10,
          subjectId: chineseLanguageSubject.id,
          topicId: listeningTopic.id,
          questionGroupId: questionGroup.id,
          fullPageImageUrl: qDef.questionImage || null,
          productionReady: true,
        },
      });
      totalQuestionsInThisBatch++;
    }
    seededPassageCount++;
  }

  console.log(`\n[Content Seeding Phase - Current Batch] Complete. Successfully seeded ${seededPassageCount} new passage groups with ${totalQuestionsInThisBatch} total questions.`);
  console.log(`Final global question number for this batch reached: ${currentGlobalQuestionNumber - 1}`);
  console.log(`\nSEED SCRIPT FINISHED for CURRENT BATCH: ${CURRENT_BATCH_PAPER_IDENTIFIER}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding script failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });