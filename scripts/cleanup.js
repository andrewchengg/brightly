// seed_cleanup_and_prepare.js
const { PrismaClient } = require("../src/generated/prisma"); // Adjust path if needed
const prisma = new PrismaClient();

// --- Topic IDs ---
const TOPIC_ID_PINYIN = 41;
const TOPIC_ID_VOCABULARY = 42;

async function main() {
  console.log(`Starting cleanup and preparation process...`);

  // --- 1. Delete existing Hanyu Pinyin questions (topicId: 41) ---
  try {
    const deletedPinyinCount = await prisma.question.deleteMany({
      where: { topicId: TOPIC_ID_PINYIN },
    });
    console.log(
      `Deleted ${deletedPinyinCount.count} questions with topicId ${TOPIC_ID_PINYIN} (Hanyu Pinyin).`
    );
  } catch (error) {
    console.error(
      `Error deleting Pinyin questions (topicId ${TOPIC_ID_PINYIN}):`,
      error
    );
    // Decide if you want to proceed if deletion fails.
  }

  // --- 2. Update existing Vocabulary Choice questions (topicId: 42) ---
  //    - Remove numbered options from the `text` field if present.
  //    - Change `（   ）` to `___` in the `text` field.
  console.log(
    `Starting update process for Vocabulary Choice questions (topicId ${TOPIC_ID_VOCABULARY})...`
  );
  try {
    const vocabQuestionsToUpdate = await prisma.question.findMany({
      where: { topicId: TOPIC_ID_VOCABULARY },
    });

    let updatedCount = 0;
    for (const question of vocabQuestionsToUpdate) {
      let newText = question.text;
      let textChanged = false;

      // Replace `（   ）` or `(   )` or `( )` with `___`
      const blankRegex =
        /\uff08\s*\uff09|\(\s*\)|\uff08\s* \s*\uff09|\(\s* \s*\)/g; // Matches full-width and half-width parentheses with optional spaces
      const placeholderRegex = /（\s*   \s*）/g; // Specifically for （   ）
      if (newText.match(placeholderRegex) || newText.match(blankRegex)) {
        newText = newText.replace(placeholderRegex, "___");
        newText = newText.replace(blankRegex, "___");
        textChanged = true;
      }

      // Remove numbered options (e.g., "\n1) Option A\n2) Option B...") from the text
      // This regex tries to find a newline, then a number, then a parenthesis/dot, then space, then text,
      // and repeats this pattern. It's a bit aggressive and might need refinement
      // if your question stems themselves have numbered lists.
      const optionsInTextRegex = /(\n\s*\d+[.)]\s*.*)+$/s;
      if (optionsInTextRegex.test(newText)) {
        newText = newText.replace(optionsInTextRegex, "").trim();
        textChanged = true;
      }

      if (textChanged) {
        try {
          await prisma.question.update({
            where: { id: question.id },
            data: { text: newText },
          });
          updatedCount++;
        } catch (updateError) {
          console.error(
            `Failed to update question ID ${question.id}:`,
            updateError
          );
        }
      }
    }
    console.log(
      `Updated ${updatedCount} Vocabulary Choice questions (topicId ${TOPIC_ID_VOCABULARY}) to new text format.`
    );
  } catch (error) {
    console.error(
      `Error updating Vocabulary Choice questions (topicId ${TOPIC_ID_VOCABULARY}):`,
      error
    );
  }

  console.log("Cleanup and preparation process finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
