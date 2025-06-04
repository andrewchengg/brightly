---

## AI TASK: GENERATE PRISMA SEED SCRIPT FOR PSLE CHINESE EXAM QUESTIONS

OBJECTIVE:
Create a complete `seed.js` Node.js script that uses Prisma Client to populate a PostgreSQL database with Chinese language questions. The questions should emulate the style, format, and typical distribution of the Singapore Primary School Leaving Examination (PSLE) Chinese Paper 2, focusing on specific MCQ-style sections.

DATABASE SCHEMA CONTEXT:
The relevant Prisma schema models are:

- `Subject`: `id` (Int), `name` (String)
- `Topic`: `id` (Int), `name` (String), `description` (String), `subjectId` (Int)
- `QuestionGroup`: `id` (Int), `name` (String @unique), `description` (String), `sourceYear` (Int), `sourceLevel` (String), `sourceAssessmentType` (String)
- `Question`:
  - `id` (Int @default(autoincrement()))
  - `pdfPageNumber` (Int)
  - `questionNumberOnPage` (String)
  - `text` (String @db.Text)
  - `questionType` (Enum: MULTIPLE_CHOICE)
  - `options` (Json - specifically an object like `{"1": "Option A", "2": "Option B", ...}`)
  - `correctAnswer` (Json - specifically a string key like `"1"`, `"2"`)
  - `answerKeyRawText` (String? - can be the correct option text or the key)
  - `explanation` (String? @db.Text)
  - `marks` (Int?)
  - `difficulty` (Enum: EASY, MEDIUM, HARD)
  - `pointsAwarded` (Int @default(10))
  - `subjectId` (Int - **Use 4 for "Chinese" subject**)
  - `topicId` (Int - Foreign key to Topic)
  - `questionGroupId` (Int? - Foreign key to QuestionGroup, nullable)
  - `sourceYear` (Int?)
  - `sourceLevel` (String?)
  - `sourceAssessmentType` (String?)
  - `productionReady` (Boolean @default(false))
  - `@@unique([questionGroupId, pdfPageNumber, questionNumberOnPage], name: "unique_live_question_in_group_page_num")`

SCRIPT REQUIREMENTS:

1.  **Prisma Client Setup:** Initialize Prisma Client at the beginning of the script. Ensure proper error handling and disconnection at the end.
2.  **Subject ID:** All Chinese questions should use `subjectId: 4`.
3.  **Topic Creation/Upsert:**
    - The script must first define and then `upsert` the necessary `Topic` records.
    - Use the _exact_ Topic IDs and names provided below for the specified sections.
    - For `upsert`, the `where` clause should use `id: TOPIC_ID_XXX`. The `update` block should update `name`, `description`, and `subjectId`. The `create` block should include `id`, `name`, `description`, and `subjectId`.
4.  **Question Group Creation/Upsert (for passage/dialogue-based sections):**
    - For sections like Cloze Passage, Reading Comprehension, and Complete the Dialogue, first `upsert` a `QuestionGroup`.
    - The `where` clause for `QuestionGroup` upsert should use `{ name: "Unique Group Name" }`.
    - The `description` field of the `QuestionGroup` should store the full passage text (for Cloze and Reading Comp) or the full dialogue options list and context (for Complete Dialogue).
5.  **Question Creation/Upsert:**
    - Generate questions for the specified sections, adhering to the typical PSLE count and mark distribution.
    - **MCQ Format:**
      - `Question.text`: For MCQs, this field should contain the question stem _and_ its numbered options (e.g., "Question text...\n1) Opt A\n2) Opt B...").
      - `Question.options`: A JSON object mapping string keys to string values (e.g., `{"1": "Option A text", "2": "Option B text"}`).
      - `Question.correctAnswer`: A string representing the key of the correct option (e.g., `"1"`).
    - **Upsert Logic for `Question`:**
      - For questions _with_ a `questionGroupId` (Cloze, Reading Comp, Dialogue): Use `prisma.question.upsert` with `where: { unique_live_question_in_group_page_num: { questionGroupId: group.id, pdfPageNumber: ..., questionNumberOnPage: ... } }`.
      - For questions _without_ a `questionGroupId` (i.e., `questionGroupId: null`, like Pinyin, Vocabulary): The `unique_live_question_in_group_page_num` constraint cannot be directly used in the `where` clause for `upsert` if `questionGroupId` is `null`. For these, implement a manual find-then-update-or-create logic:
        ```javascript
        const existingQuestion = await prisma.question.findFirst({
          where: {
            pdfPageNumber: qData.pdfPageNumber,
            questionNumberOnPage: qData.questionNumberOnPage,
            questionGroupId: null, // Crucial for these types
          },
        });
        if (existingQuestion) {
          await prisma.question.update({
            where: { id: existingQuestion.id },
            data: qData,
          });
        } else {
          await prisma.question.create({ data: qData });
        }
        ```
    - All other `Question` fields (`marks`, `difficulty`, `sourceYear`, etc.) should be populated with appropriate PSLE-style values. `productionReady` should be `false`.
6.  **Logging:** Include `console.log` statements to indicate the start and end of seeding, and progress for each section/group.
7.  **Idempotency:** The script should be runnable multiple times without creating duplicate topics or question groups (due to `upsert`). Questions should also be upserted or handled to avoid duplication on re-runs.
8.  **Full File Generation:** Provide the complete `seed.js` file content.

SPECIFIED SECTIONS, TOPIC IDs, AND QUESTION DISTRIBUTION:

- **Target: One full "Paper Set" of MCQ-style questions.**
- **Question Numbering:** Use sequential `questionNumberOnPage` like "Q1", "Q2", ..., "Q29" for the entire set. Use distinct `pdfPageNumber` values for different logical groupings if appropriate.

| Section                        | Topic Name (Chinese & English)            | Topic ID | Approx. Questions | Approx. Marks |
| :----------------------------- | :---------------------------------------- | :------- | :---------------- | :------------ |
| 1. Language Application        | 汉语拼音 (Hanyu Pinyin)                   | 41       | 2                 | 4             |
| 2. Language Application        | 词语选择 (Vocabulary Choice)              | 42       | 13                | 26            |
| 3. Cloze Passage               | 短文填空 (Cloze Passage Skills)           | 43       | 5 (1 passage)     | 10            |
| 4. Reading Comprehension 1     | 阅读理解一 (Reading Comprehension Skills) | 44       | 5 (1 passage)     | 10            |
| 5. Complete the Dialogue       | 完成对话 (Dialogue & Conversation Skills) | 45       | 4 (1 dialogue)    | 8             |
| **Total for this Seed Script** |                                           |          | **29**            | **58**        |

**CONTENT GUIDELINES FOR QUESTIONS:**

- **Pinyin:** Provide a sentence with one or two characters in parentheses (target for Pinyin), followed by 4 Pinyin options.
- **Vocabulary:** Provide a sentence with a blank ( ) and 4 single-word/short-phrase options.
- **Cloze Passage:** Create one short narrative passage (approx. 100-150 characters) with 5 blanks. For each blank, provide 4 word options. The `QuestionGroup.description` should hold the full passage text. Individual `Question.text` should provide the sentence context for the blank and its specific options.
- **Reading Comprehension 1:** Create one short narrative or informational passage (approx. 150-200 characters). Generate 5 MCQ questions based on it. The `QuestionGroup.description` should hold the full passage. Individual `Question.text` should be the question stem and its options.
- **Complete the Dialogue:** Create one dialogue scenario. Provide a list of 5-6 numbered sentences as options for the dialogue. The dialogue itself should have 4 blanks. The `QuestionGroup.description` should contain the instructions and the full list of numbered options. Individual `Question.text` for each blank should provide the preceding and succeeding dialogue turns (if any) for context, and the blank itself. The `Question.options` field should be the object map of the full numbered list of sentences.

**EXAMPLE OF A SINGLE QUESTION OBJECT (for `Question.create` or `Question.upsert` `data`):**
(This is just a structural example, content should be Chinese language)

```json
// e.g.,
// {
//   pdfPageNumber: 1,
//   questionNumberOnPage: "Q1",
//   text: "这是（   ）的苹果？\n1) 红\n2) 绿\n3) 黄\n4) 大",
//   questionType: "MULTIPLE_CHOICE",
//   options: { "1": "红", "2": "绿", "3": "黄", "4": "大" },
//   correctAnswer: "1",
//   answerKeyRawText: "红",
//   explanation: "苹果通常是红色的。",
//   marks: 2,
//   difficulty: "EASY",
//   pointsAwarded: 10,
//   subjectId: 4,
//   topicId: 42, // Example: Vocabulary Choice
//   questionGroupId: null, // Null for standalone questions
//   sourceYear: 2024,
//   sourceLevel: "Primary 6",
//   sourceAssessmentType: "PSLE Paper 2 Style",
//   productionReady: false
// }
// --------------------------------------------------------------------
```
