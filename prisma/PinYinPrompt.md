---

## AI TASK: GENERATE PRISMA SEED SCRIPT FOR PSLE CHINESE HANYU PINYIN QUESTIONS (ADVANCED)

**OVERALL OBJECTIVE:**
Your primary goal is to generate a complete and runnable `seed.js` Node.js script. This script will use Prisma Client to populate a PostgreSQL database with a specified number of Hanyu Pinyin questions for the Chinese language subject. These questions must emulate the style, format, and difficulty appropriate for the Singapore Primary School Leaving Examination (PSLE) Chinese Paper 2. The focus is on two-character words with challenging distractor Pinyin options.

**CURRENT BATCH CONTEXT (Assume this will be updated for subsequent requests):**

- **Current Batch Number:** Specify Set/Batch Number (e.g., "Set 18", "Pinyin Batch 5")
- **Number of Questions for this Batch:** Specify count (e.g., 25, 50)
- **Starting `pdfPageNumber` for this Batch:** Specify starting number (e.g., 1701) - This should increment for each new batch to ensure global uniqueness for `(pdfPageNumber, questionNumberOnPage)` when `questionGroupId` is null.
- **Action for Existing Topic 41 Questions:** Specify (e.g., "Add new questions without deleting existing", or "Delete all existing Topic 41 questions first, then add these new ones.")

**CORE DATABASE SCHEMA CONTEXT (Relevant Models):**
You must generate data compatible with the following Prisma schema structure:

1.  **`Subject` Model:**

    - All questions generated will be for the "Chinese" subject, which has `subjectId: 4`.

2.  **`Topic` Model:**

    - `id` (Int, Primary Key)
    - `name` (String)
    - `description` (String?)
    - `subjectId` (Int)
    - The script must ensure the target Topic exists using `prisma.topic.upsert()`. For Hanyu Pinyin questions, use:
      - `id: 41`
      - `name: '汉语拼音 (Hanyu Pinyin)'`
      - `description: 'Questions related to Hanyu Pinyin.'`
      - `subjectId: 4`

3.  **`Question` Model:**
    - `id` (Int, @default(autoincrement()))
    - `pdfPageNumber` (Int): Use the batch-specific starting number and increment as needed (e.g., if `questionsPerPage` is 25, then one `pdfPageNumber` can hold up to 25 questions).
    - `questionNumberOnPage` (String): Create a unique string, e.g., `PY<BatchSize>H-B<BatchNum>-<PageNum>-<CounterOnPage>`. Example: `PY25H-B5-1701-1`.
    - `text` (String, @db.Text): **Crucial Format:** This field must contain _only_ the Chinese sentence with the **two-character target Chinese word** enclosed in standard Chinese parentheses `（）`. No Pinyin should be inside these parentheses. No numbered options should be in this text field.
      - Example: `他做事很（认真）。`
    - `questionType` (Enum): Must be `MULTIPLE_CHOICE`.
    - `options` (Json): Must be a JSON object where keys are strings "1", "2", "3", "4", and values are the Pinyin option strings (for the two-character target word).
      - Example: `{"1": "rèn zhēn", "2": "rèn zēn", "3": "lèn zhēn", "4": "rèn zhēn"}` (Note: Ensure options are distinct and one is correct).
    - `correctAnswer` (Json): A string representing the key of the correct option from the `options` object.
      - Example: `"1"`
    - `answerKeyRawText` (String?): The correct Pinyin string itself.
      - Example: `'rèn zhēn'`
    - `explanation` (String?, @db.Text): A concise, student-friendly explanation stating the correct Pinyin and tones for the target two-character word. No internal deliberations or self-corrections.
      - Example: `“认真”的正确拼音是 rèn zhēn。认 (rèn) 是第四声，真 (zhēn) 是第一声。`
    - `marks` (Int?): Set to `2`.
    - `difficulty` (Enum: EASY, MEDIUM, HARD): Aim for a mix, with an emphasis on `MEDIUM` and `HARD` for these "harder" batches by making distractor options very similar to the correct answer (differing by tone, initial, final, or common mispronunciations for the two-character combination).
    - `pointsAwarded` (Int, @default(10)): Set to `10`.
    - `subjectId` (Int): Set to `4`.
    - `topicId` (Int): Set to `41` (for Hanyu Pinyin).
    - `questionGroupId` (Int?): Set to `null` for these standalone Pinyin questions.
    - `sourceYear` (Int?): Set to `2024`.
    - `sourceLevel` (String?): Set to `'Primary 6'`.
    - `sourceAssessmentType` (String?): Indicate the batch, e.g., `'PSLE Paper 2 - Pinyin Harder Batch <BatchNum>'`.
    - `productionReady` (Boolean, @default(false)): Set to `false`.
    - The `Question` model has a unique constraint: `@@unique([questionGroupId, pdfPageNumber, questionNumberOnPage], name: "unique_live_question_in_group_page_num")`.

**SCRIPT STRUCTURE AND LOGIC REQUIREMENTS:**

1.  **Prisma Client Initialization:**
    ```javascript
    const { PrismaClient } = require("../src/generated/prisma"); // Adjust path if needed
    const prisma = new PrismaClient();
    ```
2.  **Constants:** Define `CHINESE_SUBJECT_ID`, and the `TOPIC_ID_PINYIN`, `TOPIC_NAME_PINYIN`, `TOPIC_DESC_PINYIN`.
3.  **`main` async function:** All database operations should be within this function.
4.  **Topic Upsert:** Ensure `pinyinTopic` (ID 41) is created or updated using `prisma.topic.upsert()`.
5.  **(Conditional) Deletion of Existing Pinyin Questions:** Based on the "Action for Existing Topic 41 Questions" in the batch context, either include or omit `prisma.question.deleteMany({ where: { topicId: TOPIC_ID_PINYIN } });`.
6.  **Question Data Array:** Prepare an array of JavaScript objects, where each object contains the necessary data to generate one Pinyin question (`targetWord`, `sentence` (template where `targetWord` will be injected), `pinyinOptions` (object), `correctAnswerKey`, `explanationPinyin`, `difficulty`).
    - This array should contain data for the **specified number of questions for the current batch.**
    - **Content Focus for Pinyin Questions:**
      - Target **two-character** Chinese words/phrases commonly encountered at Primary 6 level.
      - **Challenging Distractors:** Options should be phonetically similar to the correct Pinyin, differing by:
        - Single tones on one or both characters.
        - Similar-sounding initials (e.g., z/zh, s/sh, c/ch, n/l, f/h).
        - Similar-sounding finals (e.g., an/ang, en/eng, in/ing, üan/uan).
        - Common mispronunciations or regional variations if appropriate for testing.
        - Correct Pinyin but incorrect tones for one of the characters.
7.  **Question Generation Loop:**
    - Iterate through the prepared data array.
    - Use a helper function `createPinyinQData(...)` to structure each question object according to the `Question` model schema.
    - This helper function should correctly format the `text` field (sentence with `（targetWord）`) and ensure `options` and `correctAnswer` are in the specified JSON format.
    - Manage `pdfPageNumber` and `questionCounterOnPage` to ensure unique identifiers.
8.  **Database Insertion:**
    - For each generated question object:
      - If not deleting first, use the "findFirst then update or create" logic for `questionGroupId: null` cases to achieve upsert-like behavior and avoid duplicates from re-running the _same batch script_. This relies on `(pdfPageNumber, questionNumberOnPage)` being unique for non-grouped questions within a batch.
      - If deleting all Topic 41 questions first (for this specific batch run), you can use `prisma.question.create({ data: qData });`.
9.  **Logging:** Provide informative console logs for each major step (e.g., "Topics ensured...", "Deleting old Pinyin questions...", "Seeding X Pinyin questions...").
10. **Error Handling and Disconnection:** Include `try...catch` blocks and `prisma.$disconnect()` in a `finally` block.

**EXAMPLE OF A SINGLE DATA OBJECT FOR THE `pinyinData` ARRAY:**
(This is for your internal array before it's processed by `createPinyinQData`)

```javascript
{
  targetWord: '犹豫', // The two-character word
  sentence: '他犹豫了一下才回答。', // Full sentence where the target word appears
  pinyinOptions: {"1":"yóu yù", "2":"yóu yú", "3":"yōu yù", "4":"yōu yú"}, // Object of 4 Pinyin options
  correctAnswerKey: "1", // String key of the correct option
  pinyin: 'yóu yù', // Correct Pinyin for explanation
  difficulty: 'HARD'
}
```
