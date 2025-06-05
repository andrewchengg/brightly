# AI Prompt for Generating Chinese Dialogue Completion Seed Data

## Context

You are an expert in Chinese language education for primary school students. I need you to generate a `seed.js` script that will populate a database with Chinese dialogue completion exercises similar to the Primary School Leaving Examination (PSLE) format.

## Database Schema Understanding

The database has these key tables:

- `QuestionGroup` - Represents a complete dialogue exercise
- `Question` - Individual multiple choice questions (if any)
- `Topic` - Subject categories
- `Subject` - Main subjects (Chinese = subject ID 3)

### QuestionGroup Table Structure:

```sql
model QuestionGroup {
  id                     Int      @id @default(autoincrement())
  name                   String   // Exercise title
  description            String?  // The dialogue content
  audioUrl               String?  // Optional audio file
  sourceYear             Int?     // Year of the exam
  sourceAssessmentType   String?  // "PSLE" or "CA" etc.
  sourceSchool           String?  // School name
  questions              Question[] // Related questions (can be empty for dialogue completion)
}
```

## Exercise Format Requirements

### 1. Exercise Structure

Each dialogue completion exercise should have:

- **Section Title**: "完成对话" (Dialogue Completion)
- **Instructions**: "根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。"
- **8 options**: Numbered 1-8 with appropriate Chinese phrases/sentences
- **Dialogue**: A conversation between 2-3 characters with 4 blanks marked as Q1, Q2, Q3, Q4
- **Point value**: 4 questions × 2 points = 8 points total

### 2. Content Guidelines

**Target Level**: Primary 6 students (11-12 years old)
**Language Complexity**: Age-appropriate vocabulary and sentence structures
**Themes**: Should cover common scenarios like:

- School life and teacher-student interactions
- Family conversations
- Friendship and peer relationships
- Daily activities and routines
- Problem-solving situations
- Expressing emotions and feelings

### 3. Dialogue Characteristics

- **Natural flow**: Conversations should sound realistic
- **Context clues**: Blanks should be fillable through context understanding
- **Character names**: Use common Chinese names (e.g., 小明, 小红, 老师, 妈妈, 爸爸)
- **Appropriate responses**: Each blank should have only one logical answer from the 8 options
- **Progressive difficulty**: Some exercises can be easier/harder than others

### 4. Option Design

The 8 options for each exercise should:

- Include the 4 correct answers
- Include 4 distractors that are grammatically correct but contextually wrong
- Be roughly similar in length and complexity
- Cover different sentence types (statements, questions, exclamations)

## Required Output Format

Generate a `seed.js` file with this structure:

```javascript
// Sample structure - generate multiple dialogue exercises
const dialogueExercises = [
  {
    name: "完成对话练习一",
    description: `四 完成对话（4题8分）

根据上下文的意思，从表中选出适当的短语或短句，然后把代表它们的数字填写在作答簿上。

选择适当的短语：
1. [option 1]
2. [option 2]
3. [option 3]
4. [option 4]
5. [option 5]
6. [option 6]
7. [option 7]
8. [option 8]

对话：
[Character A]: [dialogue line]
[Character B]: [dialogue line with Q1 blank]
[Character A]: [dialogue line]
[Character B]: [dialogue line with Q2 blank]
[Continue dialogue with Q3 and Q4 blanks...]

答案：
Q1: [correct option number]
Q2: [correct option number]  
Q3: [correct option number]
Q4: [correct option number]`,
    audioUrl: null,
    sourceYear: 2024,
    sourceAssessmentType: "PSLE练习",
    sourceSchool: "练习题库",
  },
  // Generate 10-15 different exercises
];

// Prisma seeding code
async function seedDialogueExercises() {
  // Implementation here
}
```

## Specific Requirements

1. **Generate 10-15 different dialogue exercises**
2. **Vary the scenarios** - don't repeat the same situation
3. **Include complete Prisma seeding code** that:
   - Connects to the database
   - Creates QuestionGroup entries
   - Links to Chinese subject (assume subjectId: 3)
   - Handles the async operations properly
4. **Include answer keys** clearly marked in the description
5. **Make each dialogue unique** with different characters and situations

## Example Scenarios to Include

- Student asking teacher for help
- Friends planning weekend activities
- Family discussing daily routines
- Classmates working on group projects
- Child explaining a problem to parents
- Students in library/cafeteria conversations
- Teacher giving advice to students
- Siblings discussing household chores

## Technical Notes

- Use proper Chinese punctuation (。！？，)
- Ensure character encoding supports Chinese characters
- Include proper async/await syntax for Prisma
- Add error handling in the seed script
- Make the script runnable with `node seed.js`

Generate a complete, production-ready seed.js file that follows all these requirements.
