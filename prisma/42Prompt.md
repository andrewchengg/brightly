// seed_vocab_grammar_30_final_corrected_v2.js
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

// --- Subject ID for Chinese ---
const CHINESE_SUBJECT_ID = 4;

// --- Exact Topic ID for Vocabulary Choice / Sentence Discrimination / Grammar ---
const TOPIC_ID_VOCAB_GRAMMAR = 42;
const TOPIC_NAME_VOCAB_GRAMMAR = '词语选择 (Vocabulary Choice)';
const TOPIC_DESC_VOCAB_GRAMMAR = 'Questions related to vocabulary, grammar, and sentence discrimination.';

async function main() {
console.log(`Starting to seed 30 new Vocabulary/Grammar/Sentence Discrimination questions (topicId: ${TOPIC_ID_VOCAB_GRAMMAR}) with FINAL corrected formats...`);

// --- 0. Ensure Topic Exists ---
let vocabGrammarTopic;
try {
vocabGrammarTopic = await prisma.topic.upsert({
where: { id: TOPIC_ID_VOCAB_GRAMMAR },
update: { name: TOPIC_NAME_VOCAB_GRAMMAR, description: TOPIC_DESC_VOCAB_GRAMMAR, subjectId: CHINESE_SUBJECT_ID },
create: { id: TOPIC_ID_VOCAB_GRAMMAR, name: TOPIC_NAME_VOCAB_GRAMMAR, description: TOPIC_DESC_VOCAB_GRAMMAR, subjectId: CHINESE_SUBJECT_ID },
});
console.log('Vocabulary/Grammar topic ensured/created successfully.');
} catch (error) {
console.error("Critical error creating/ensuring Vocabulary/Grammar topic. Aborting seed:", error);
process.exit(1);
}

// --- Generate 30 Vocabulary/Grammar/Sentence Discrimination Questions ---
const questionsBatch = [];
let currentPage = 1701; // Starting pdfPageNumber for this new batch
let questionCounterOnPage = 1;
const questionsPerPage = 10; // 3 "pages" for 30 questions

const createQData = (qTextOnly, qOptions, qCorrectAnswerKey, qExplanation, qDifficulty = 'MEDIUM') => {
if (questionCounterOnPage > questionsPerPage) {
currentPage++;
questionCounterOnPage = 1;
}
const qData = {
pdfPageNumber: currentPage,
questionNumberOnPage: `VG30-FC2-${currentPage}-${questionCounterOnPage}`, // FC2 for Final Correction v2
text: qTextOnly,
questionType: 'MULTIPLE_CHOICE',
options: qOptions,
correctAnswer: qCorrectAnswerKey,
answerKeyRawText: qOptions[qCorrectAnswerKey],
explanation: qExplanation,
marks: 2,
difficulty: qDifficulty,
pointsAwarded: 10,
subjectId: CHINESE_SUBJECT_ID,
topicId: vocabGrammarTopic.id,
sourceYear: 2024,
sourceLevel: 'Primary 6',
sourceAssessmentType: 'PSLE Paper 2 - Vocab/Grammar Batch 30 (FC2)',
productionReady: false,
questionGroupId: null,
};
questionCounterOnPage++;
return qData;
};

// --- Question Data Array (30 Questions) ---
const vocabGrammarDataFinalCorrected = [
// --- Sentence Discrimination / Correct Word Usage (8 questions) ---
{
textOnly: '以下哪一个句子中画线词语“犹豫”使用得最正确？',
options: {
"1": "他站在岔路口，犹豫着不知该往哪里走。",
"2": "这道题的答案非常犹豫，让人难以确定。",
"3": "他的犹豫性格有时会让他错失良机。", // Grammatically ok, but testing verb is usually clearer
"4": "请不要犹豫这件事情的真假。"
}, correctAnswerKey: "1",
explanation: '“犹豫”指迟疑，拿不定主意。选项(1)描述了人物在选择面前的迟疑状态，动词用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子中画线词语“提供”使用得最正确？',
options: {
"1": "图书馆为读者提供了安静的阅读环境和丰富的书籍。",
"2": "他向我提供了一个非常困难的问题。", // "提出"
"3": "这次的经历提供了他宝贵的教训。", // "给予" or "带来"
"4": "妈妈每天都提供我按时完成作业。" // Incorrect verb choice
}, correctAnswerKey: "1",
explanation: '“提供”指供给（服务、条件等）。选项(1)“提供了……环境和书籍”用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子画线词语“坚持”使用得最正确？',
options: {
"1": "尽管天气寒冷，他仍然坚持每天晨跑。",
"2": "这件衣服的布料很坚持，不容易破损。", // "结实"
"3": "他坚持地认为自己的看法是正确的。", // "坚持认为" or "固执地认为"
"4": "这个观点非常坚持，几乎没有人反对。" // "坚定"
}, correctAnswerKey: "1",
explanation: '“坚持”指坚决保持、维护或进行。选项(1)“坚持晨跑”用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子画线词语“宝贵”使用得最正确？',
options: {
"1": "时间是非常宝贵的，我们应该珍惜。",
"2": "这个宝贵的玩具是他生日时爸爸送的。", // "珍贵" might be slightly better, but "宝贵" is acceptable.
"3": "他宝贵地完成了这项重要的任务。", // Incorrect adverbial use. "认真" or "出色"
"4": "这次的经验对他来说很宝贵经验。" // Redundant "经验"
}, correctAnswerKey: "1",
explanation: '“宝贵”形容极有价值，非常难得。选项(1)“宝贵的时间”用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子中画线词语“居然”使用得最正确？',
options: {
"1": "平时从不读书的他，这次考试居然考了第一名。",
"2": "他居然是一个非常善良的人。", // Possible, but less impactful than unexpected event
"3": "这道题居然很简单，我一下子就做出来了。",
"4": "他居然努力学习，所以取得了进步。" // "努力学习所以进步" is expected, "居然" implies unexpectedness.
}, correctAnswerKey: "1",
explanation: '“居然”表示出乎意料。选项(1)描述了出乎意料的情况，用法正确。选项(3)也可以，但(1)的意外程度更高。', difficulty: 'HARD'
},
{
textOnly: '以下哪一个句子中画线词语“丰富”使用得最正确？',
options: {
"1": "图书馆里有丰富的图书供我们阅读。",
"2": "他的生活经验非常丰富他的演讲。", // Awkward phrasing
"3": "这顿晚餐的菜肴很丰富多彩。", // "丰富多彩" usually describes activities or life, not directly dishes. "丰盛" for dishes.
"4": "他丰富地想象着未来的生活。" // "展开丰富的想象"
}, correctAnswerKey: "1",
explanation: '“丰富”形容（物质财富、学识经验等）种类多或数量大。选项(1)“丰富的图书”用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子中画线词语“深刻”使用得最正确？',
options: {
"1": "老师的话给我留下了深刻的印象。",
"2": "这条河的水位非常深刻。", // "深"
"3": "他对这个问题的理解很深刻不透彻。", // Contradictory
"4": "他深刻地画出了一幅美丽的风景画。" // "细致地" or "生动地"
}, correctAnswerKey: "1",
explanation: '“深刻”指达到事情或问题的本质。选项(1)“深刻的印象”用法正确。', difficulty: 'MEDIUM'
},
{
textOnly: '以下哪一个句子中画线词语“似乎”使用得最正确？',
options: {
"1": "天阴沉沉的，似乎快要下雨了。",
"2": "他似乎一定能完成这个任务。", // "似乎" and "一定" contradict.
"3": "这件事情的似乎原因找到了。", // Incorrect placement.
"4": "我似乎昨天已经告诉过你。" // Grammatically okay, but (1) is a more typical usage example for PSLE.
}, correctAnswerKey: "1",
explanation: '“似乎”表示仿佛、好像。选项(1)用法自然且正确。', difficulty: 'HARD'
},

    // --- General Sentence Correctness ( "以下哪一个句子是正确的？") (2 questions) ---
    {
      textOnly: '以下哪一个句子是正确的？',
      options: {
        "1": "他把这个消息已经告诉了老师听。",
        "2": "我们应该把教室打扫得干干净净。", // Corrected from previous example
        "3": "这件事情的原因是由于他不小心。", // "原因是" or "由于"
        "4": "为了不迟到所以他很早就出门了。" // "为了...他很早就出门了" or "因为...所以..."
      }, correctAnswerKey: "2",
      explanation: '选项(2)句子通顺，表达清晰。选项(1)“告诉了老师听”不自然，应为“告诉了老师”。选项(3)“原因是由于”语义重复。选项(4)“为了”和“所以”连用不当。', difficulty: 'HARD'
    },
    {
      textOnly: '以下哪一个句子是正确的？',
      options: {
        "1": "我差不多大约用了半小时才完成这份功课。",
        "2": "他不但喜欢踢足球，而且也喜欢打篮球，还喜欢游泳。", // Clearer separation
        "3": "尽管天气十分酷热，他仍然坚持在操场上跑步。",
        "4": "我们必须应该要努力学习，才能取得优异的好成绩。"
      }, correctAnswerKey: "3",
      explanation: '选项(3)是正确的转折句。选项(1)“差不多”和“大约”语义重复。选项(2)原句中“也喜欢”重复，修改后更佳。选项(4)“必须”、“应该”、“要”语义重复，“优异的”和“好”也部分重复。', difficulty: 'HARD'
    },

    // --- Fill-in-the-blank (Vocabulary/Character Choice using ___) (10 questions) ---
    {
      textOnly: '他做事非常___，很少出差错。',
      options: {"1":"认真", "2":"仔细", "3":"努力", "4":"刻苦"}, correctAnswerKey: "2",
      explanation: '“仔细”强调周密、细心，符合“很少出差错”的语境。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '我们要___利用课余时间，多阅读有益的书籍。',
      options: {"1":"充分", "2":"完全", "3":"合理", "4":"有效"}, correctAnswerKey: "1",
      explanation: '“充分利用”指最大限度地利用时间。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '老师的___如同春雨般滋润着我们的心田。',
      options: {"1":"教训", "2":"教诲", "3":"指示", "4":"命令"}, correctAnswerKey: "2",
      explanation: '“教诲”指教训、教导，带有尊敬的意味，比“教导”更书面和深刻。', difficulty: 'HARD'
    },
    {
      textOnly: '他___了大家的建议，对计划进行了必要的修改。',
      options: {"1":"听从", "2":"参考", "3":"采纳", "4":"接受"}, correctAnswerKey: "3",
      explanation: '“采纳建议”指接受并采用别人的建议。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '这个公园的景色___，空气清新，令人心旷神怡。',
      options: {"1":"美观", "2":"秀丽", "3":"壮丽", "4":"宜人"}, correctAnswerKey: "4",
      explanation: '“景色宜人”形容风景美好适合人的心意。', difficulty: 'HARD'
    },
    {
      textOnly: '看到灾区人民的困境，大家纷纷伸出___。',
      options: {"1":"协助之手", "2":"援助之手", "3":"支持之手", "4":"友谊之手"}, correctAnswerKey: "2",
      explanation: '“援助之手”是固定搭配，指帮助、支援的手。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '为了实现自己的理想，他___学习，从不懈怠。',
      options: {"1":"努力", "2":"刻苦", "3":"勤奋", "4":"用功"}, correctAnswerKey: "2",
      explanation: '“刻苦学习”形容非常努力、不怕艰苦地学习。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '他做事总是___，因此赢得了大家的信赖。',
      options: {"1":"马虎", "2":"草率", "3":"踏实", "4":"敷衍"}, correctAnswerKey: "3",
      explanation: '“踏实”指做事认真、实在、不浮躁。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '这件衣服的___很独特，是著名设计师的作品。',
      options: {"1":"设计", "2":"图案", "3":"风格", "4":"造型"}, correctAnswerKey: "1",
      explanation: '“设计”指衣服的构思和计划，符合“设计师的作品”的语境。', difficulty: 'HARD'
    },
    {
      textOnly: '他___了种种障碍，终于实现了目标。',
      options: {"1":"战胜", "2":"克服", "3":"打败", "4":"排除"}, correctAnswerKey: "2",
      explanation: '“克服障碍”是常用搭配，指用坚强的意志和力量战胜困难。', difficulty: 'MEDIUM'
    },

    // --- Conjunctions / Grammatical Particles (10 questions) ---
    {
      textOnly: '___努力，___会有进步。',
      options: {"1":"只要……就……", "2":"只有……才……", "3":"无论……都……", "4":"因为……所以……"}, correctAnswerKey: "1",
      explanation: '“只要……就……”表示具备了某个条件，相应的结果就会出现。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '他___学习成绩优异，___体育方面也很出色。',
      options: {"1":"因为……所以……", "2":"虽然……但是……", "3":"不但……而且……", "4":"即使……也……"}, correctAnswerKey: "3",
      explanation: '“不但……而且……”表示递进关系。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '___你明天有时间，我们就一起去图书馆。',
      options: {"1":"如果", "2":"既然", "3":"即使", "4":"除非"}, correctAnswerKey: "1",
      explanation: '“如果”引导假设条件。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '他不仅会画画，___歌也唱得很好。',
      options: {"1":"而且", "2":"反而", "3":"但是", "4":"况且"}, correctAnswerKey: "1",
      explanation: '“不仅……而且……”（或“不仅……也/还……”）表示递进关系。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '___任务多么艰巨，我们___要按时完成。',
      options: {"1":"即使……也……", "2":"虽然……但是……", "3":"无论……都……", "4":"因为……所以……"}, correctAnswerKey: "3",
      explanation: '“无论……都……”表示在任何条件下结果都一样。', difficulty: 'HARD'
    },
    {
      textOnly: '___你仔细观察，___会发现其中的奥秘。',
      options: {"1":"只要……就……", "2":"只有……才……", "3":"如果……那么……", "4":"因为……所以……"}, correctAnswerKey: "1",
      explanation: '“只要……就……”表示具备了某个条件，相应的结果就会出现。', difficulty: 'MEDIUM'
    },
    {
      textOnly: '他___没有取得第一名，___他的表现已经非常出色了。',
      options: {"1":"虽然……但是……", "2":"即使……也……", "3":"因为……所以……", "4":"尽管……可是……"}, correctAnswerKey: "4",
      explanation: '“尽管……可是……”表示转折，承认前一事实，但引出含有某种程度转折的结果。', difficulty: 'HARD'
    },
    {
      textOnly: '___别人的帮助，我们___应该心怀感激。',
      options: {"1":"对于……也……", "2":"无论……都……", "3":"既然……就……", "4":"由于……因此……"}, correctAnswerKey: "1",
      explanation: '“对于……也……”表示针对某一对象或情况，同样应该如何。', difficulty: 'HARD'
    },
    {
      textOnly: '小明___聪明，___他若不努力，也难以取得好成绩。',
      options: {"1":"虽然……但是……", "2":"固然……但……", "3":"即使……也……", "4":"因为……所以……"}, correctAnswerKey: "2",
      explanation: '“固然……但……”承认前一个事实（聪明），然后通过“但”引出转折或限制条件。', difficulty: 'HARD'
    },
    {
      textOnly: '我们___要学好课本知识，___要积极参加课外活动。',
      options: {"1":"不但……而且……", "2":"不仅……还……", "3":"一边……一边……", "4":"或者……或者……"}, correctAnswerKey: "2",
      explanation: '“不仅……还……”表示递进关系，强调后者。', difficulty: 'MEDIUM'
    },

];

for (const data of vocabGrammarDataFinalCorrected) {
const q = createQData(data.textOnly, data.options, data.correctAnswerKey, data.explanation, data.difficulty);
questionsBatch.push(q);
}

for (const qData of questionsBatch) {
const existingQuestion = await prisma.question.findFirst({
where: {
pdfPageNumber: qData.pdfPageNumber,
questionNumberOnPage: qData.questionNumberOnPage,
questionGroupId: null
}
});
if (existingQuestion) {
await prisma.question.update({ where: { id: existingQuestion.id }, data: qData });
} else {
await prisma.question.create({ data: qData });
}
}
console.log(`Seeded/Updated ${questionsBatch.length} Vocabulary/Grammar/Sentence Discrimination questions with FINAL corrected formats.`);

console.log('Vocabulary/Grammar/Sentence Discrimination generation process finished.');
}

main()
.catch((e) => {
console.error(e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});
