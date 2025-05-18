// prisma/seed.js
// @ts-check
const { PrismaClient, QuestionType, DifficultyLevel } = require("@prisma/client"); // or from "../src/generated/prisma" if that's your setup
const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key. Please check your .env file.');
  process.exit(1);
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);


async function main() {
  console.log("Starting seeding process...");

  // Clear existing data (order matters due to foreign key constraints)
  console.log("Clearing existing data...");
  await prisma.studentAnswer.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.result.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.lesson.deleteMany(); // Delete Lesson before Subject
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany(); // Keep this line
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.badge.deleteMany(); // Clear badges if you have them

  console.log("Data cleared.");

  // --- Seed Admin ---
  console.log("Seeding Admins...");
  await prisma.admin.create({ data: { id: "admin_user_1", username: "superadmin" } });

  // --- Seed Grades ---
  console.log("Seeding Grades...");
  const grades = [];
  for (let i = 1; i <= 6; i++) {
    grades.push(await prisma.grade.create({ data: { level: i } }));
  }

  // --- Seed a generic Teacher (e.g., for assigning content or as a placeholder) ---
  console.log("Seeding a generic Teacher...");
  let genericTeacher;
  try {
    const { data: teacherAuth, error: teacherError } = await supabaseAdmin.auth.admin.createUser({
      email: `teacher_generic@edcel.app`,
      password: "password123",
      user_metadata: { role: "teacher", name: "Generic Teacher", username: "genericteacher" },
      email_confirm: true,
    });
    if (teacherError) throw teacherError;
    genericTeacher = await prisma.teacher.create({
      data: {
        id: teacherAuth.user.id,
        username: "genericteacher",
        name: "Generic Teacher",
        email: `teacher_generic@edcel.app`,
        address: "School Address",
        img: "/noavatar.png",
      },
    });
  } catch (err) {
    console.error("Error creating generic teacher, using fallback:", err.message);
    genericTeacher = await prisma.teacher.create({
      data: {
        id: "fallback_teacher_id",
        username: "genericteacher_fallback",
        name: "Generic Teacher (Fallback)",
        email: `teacher_generic_fallback@edcel.app`,
        address: "School Address",
        img: "/noavatar.png",
      },
    });
  }


  // --- Seed Mathematics Subject ---
  console.log("Seeding Mathematics Subject...");
  const mathSubject = await prisma.subject.create({
    data: { name: "Mathematics" },
  });

  // --- Seed Mathematics Topics ---
  console.log("Seeding Mathematics Topics...");
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Numbers and Operations',
        description: 'Whole numbers, fractions, decimals, and basic operations',
        subjectId: mathSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Geometry',
        description: 'Angles, shapes, area, and perimeter',
        subjectId: mathSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Measurement',
        description: 'Length, mass, volume, and time',
        subjectId: mathSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Statistics',
        description: 'Data handling and analysis',
        subjectId: mathSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Algebra',
        description: 'Basic algebraic expressions and solving equations',
        subjectId: mathSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Ratio and Proportion',
        description: 'Direct and inverse proportion, ratios',
        subjectId: mathSubject.id,
      },
    }),
  ]);
  console.log("Mathematics Topics seeded.");

  // --- Seed Sample Mathematics Questions ---
  console.log("Seeding Sample Mathematics Questions...");

  // Sample questions for each topic
  const questions = [
    // Numbers and Operations
    {
      text: 'What is the value of 3/4 + 2/5 expressed as a decimal?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '0.95' },
        { id: 'b', text: '1.15' },
        { id: 'c', text: '0.85' },
        { id: 'd', text: '1.05' },
      ],
      correctAnswer: 'b',
      explanation: 'Convert 3/4 = 0.75 and 2/5 = 0.4, then add: 0.75 + 0.4 = 1.15',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[0].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'If 5x + 3 = 28, what is the value of x?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '5' },
        { id: 'b', text: '6' },
        { id: 'c', text: '7' },
        { id: 'd', text: '8' },
      ],
      correctAnswer: 'a',
      explanation: 'Subtract 3 from both sides: 5x = 25, then divide by 5: x = 5',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[4].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'A rectangle has a length of 8 cm and a width of 5 cm. What is its area?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '26 cm²' },
        { id: 'b', text: '40 cm²' },
        { id: 'c', text: '13 cm²' },
        { id: 'd', text: '36 cm²' },
      ],
      correctAnswer: 'b',
      explanation: 'Area of rectangle = length × width = 8 × 5 = 40 cm²',
      difficulty: DifficultyLevel.EASY,
      topicId: topics[1].id,
      subjectId: mathSubject.id,
      pointsAwarded: 1,
    },
    {
      text: 'The ratio of boys to girls in a class is 3:4. If there are 28 girls, how many boys are there?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '21' },
        { id: 'b', text: '24' },
        { id: 'c', text: '18' },
        { id: 'd', text: '37' },
      ],
      correctAnswer: 'a',
      explanation: 'If 4 parts = 28 girls, then 1 part = 7. Therefore, 3 parts (boys) = 21',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[5].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'The mean of five numbers is 12. If four of the numbers are 10, 15, 8, and 13, what is the fifth number?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '14' },
        { id: 'b', text: '12' },
        { id: 'c', text: '16' },
        { id: 'd', text: '10' },
      ],
      correctAnswer: 'a',
      explanation: 'Sum = Mean × Count = 12 × 5 = 60. Sum of known numbers = 46. Therefore, fifth number = 60 - 46 = 14',
      difficulty: DifficultyLevel.HARD,
      topicId: topics[3].id,
      subjectId: mathSubject.id,
      pointsAwarded: 3,
    },
    {
      text: 'A container can hold 2.5 litres of water. How many millilitres is this?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '250 ml' },
        { id: 'b', text: '2500 ml' },
        { id: 'c', text: '25 ml' },
        { id: 'd', text: '25000 ml' },
      ],
      correctAnswer: 'b',
      explanation: '1 litre = 1000 millilitres, so 2.5 litres = 2.5 × 1000 = 2500 millilitres',
      difficulty: DifficultyLevel.EASY,
      topicId: topics[2].id,
      subjectId: mathSubject.id,
      pointsAwarded: 1,
    },
    {
      text: 'What is the perimeter of a square with an area of 36 cm²?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '36 cm' },
        { id: 'b', text: '24 cm' },
        { id: 'c', text: '18 cm' },
        { id: 'd', text: '12 cm' },
      ],
      correctAnswer: 'b',
      explanation: 'Area = side², so side = √36 = 6 cm. Perimeter = 4 × side = 4 × 6 = 24 cm',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[1].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'If 3a + 2b = 20 and a = 4, what is the value of b?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '4' },
        { id: 'b', text: '5' },
        { id: 'c', text: '6' },
        { id: 'd', text: '7' },
      ],
      correctAnswer: 'a',
      explanation: 'Substitute a = 4: 3(4) + 2b = 20, 12 + 2b = 20, 2b = 8, b = 4',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[4].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'A shop sells notebooks at $2 each. If you buy 5 notebooks, you get a 10% discount on the total price. How much would you pay for 5 notebooks?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '$9.00' },
        { id: 'b', text: '$9.50' },
        { id: 'c', text: '$8.50' },
        { id: 'd', text: '$9.25' },
      ],
      correctAnswer: 'a',
      explanation: 'Original price = 5 × $2 = $10. Discount = 10% of $10 = $1. Final price = $10 - $1 = $9',
      difficulty: DifficultyLevel.MEDIUM,
      topicId: topics[0].id,
      subjectId: mathSubject.id,
      pointsAwarded: 2,
    },
    {
      text: 'The bar graph shows the number of ice creams sold each day from Monday to Friday. If the mean number of ice creams sold per day is 30, how many ice creams were sold on Friday?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'a', text: '35' },
        { id: 'b', text: '40' },
        { id: 'c', text: '45' },
        { id: 'd', text: '50' },
      ],
      correctAnswer: 'c',
      explanation: 'If Mon=20, Tue=25, Wed=30, Thu=15, and mean=30, then: (20+25+30+15+x)/5 = 30, so x = 45',
      difficulty: DifficultyLevel.HARD,
      topicId: topics[3].id,
      subjectId: mathSubject.id,
      pointsAwarded: 3,
    },
  ];

  // Create all questions
  for (const question of questions) {
    await prisma.question.create({
      data: {
        ...question,
        tags: ['PSLE', 'Mathematics'],
      },
    });
  }

  console.log("Sample Mathematics Questions seeded.");

  // --- Seed Parents ---
  console.log("Seeding Parents...");
  const parents = [];
  for (let i = 1; i <= 5; i++) {
    const parentEmail = `parent${i}@edcel.app`;
    let parentId = `parent_user_${i}`;
    try {
        const { data: parentAuth, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: parentEmail,
            password: 'password123',
            user_metadata: { role: 'parent', name: `Parent Name ${i}`, username: `parent${i}` },
            email_confirm: true,
        });
        if (parentAuthError) throw parentAuthError;
        parentId = parentAuth.user.id;
    } catch (err) {
        console.error(`Error creating Supabase auth user for parent${i}:`, err.message);
        // Continue with fallback ID if auth creation fails for some reason in dev
    }
    parents.push(await prisma.parent.create({
      data: {
        id: parentId,
        username: `parent${i}`,
        name: `Parent Name ${i}`,
        email: parentEmail,
      },
    }));
  }

  // --- Seed Students ---
  console.log("Seeding Students...");
  for (let i = 1; i <= 10; i++) {
    const studentEmail = `student${i}_placeholder@edcel.app`; // Placeholder
    const studentPin = `${100000 + i}`; // Simple PIN
    let studentId = `student_user_${i}`;

    try {
        const { data: studentAuth, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: studentEmail,
            password: studentPin,
            user_metadata: { role: 'student', name: `Student Name ${i}`, parentIdForReference: parents[i % parents.length].id },
            email_confirm: true,
        });
        if (studentAuthError) throw studentAuthError;
        studentId = studentAuth.user.id;
    } catch(err) {
        console.error(`Error creating Supabase auth user for student${i}:`, err.message);
    }

    await prisma.student.create({
      data: {
        id: studentId,
        username: `student${i}`, // Temporary, student will set final one
        name: `Student Name ${i}`,
        email: studentEmail, // Store placeholder email
        schoolLevel: (i % 6) + 1,
        schoolName: `School ${String.fromCharCode(65 + (i % 3))}`,
        parentId: parents[i % parents.length].id,
        gradeId: grades[i % grades.length].id,
        // classId: if you keep classes, assign here
        initialSetupComplete: false, // Student needs to complete setup
        xpPoints: Math.floor(Math.random() * 5000),
        currentStreak: Math.floor(Math.random() * 10),
        level: Math.floor(Math.random()*5)+1,
      },
    });
  }

  // --- Seed some assignments and exams (simplified) ---
  console.log("Seeding Assignments and Exams...");
  const firstTopicId = topics[0].id;
  if (firstTopicId) {
    await prisma.assignment.create({
      data: {
        title: "Whole Numbers Practice Assignment",
        description: "Practice your skills with whole numbers.",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
        subjectId: mathSubject.id,
        topicId: firstTopicId,
      },
    });
    await prisma.exam.create({
      data: {
        title: "Numbers Mini Exam",
        description: "A short exam on Numbers.",
        subjectId: mathSubject.id,
        topicId: firstTopicId, // Or could be null for a broader subject exam
      },
    });
  }


  console.log("Seeding completed successfully.");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });