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
  // Attendance and Lesson are likely removed based on previous discussion,
  // but if they exist and have dependencies, clear them here.
  // await prisma.attendance.deleteMany();
  // await prisma.lesson.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  // await prisma.class.deleteMany(); // If classes are removed
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
  const topicsData = [
    // Numbers
    { name: "Whole Numbers", description: "Operations, place value, estimation." },
    { name: "Fractions", description: "Concepts, equivalent fractions, operations with fractions." },
    { name: "Decimals", description: "Place value, conversion, operations with decimals." },
    // Measurements
    { name: "Mass", description: "Units of mass (kg, g), conversion, problem sums." },
    { name: "Length", description: "Units of length (km, m, cm), conversion, problem sums." },
    { name: "Time", description: "Units of time, duration, 24-hour clock, problem sums." },
    { name: "Money", description: "Counting money, calculations involving money." },
    { name: "Area & Perimeter", description: "Squares, rectangles, composite figures." },
    { name: "Volume", description: "Cubes, cuboids, capacity." },
    // Statistics
    { name: "Graphs", description: "Bar graphs, line graphs, pictograms." },
    { name: "Pie Charts", description: "Interpreting pie charts." },
    { name: "Average", description: "Calculating and interpreting average." },
    // Geometry
    { name: "Angles", description: "Types of angles, measuring angles, angles on a straight line, angles at a point." },
    { name: "Triangles", description: "Types of triangles, properties, sum of angles." },
    { name: "4-sided Figures", description: "Properties of squares, rectangles, parallelograms, rhombuses, trapeziums." },
    // { name: "Construction", description: "Constructing geometric figures." }, // Construction might be hard to represent in MCQ/TF
    { name: "Symmetry", description: "Line symmetry, rotational symmetry." },
    // Ratio & Percentage
    { name: "Ratio", description: "Concept of ratio, equivalent ratios, problem sums." },
    { name: "Proportion", description: "Direct and inverse proportion." }, // Usually under Ratio or as a separate advanced topic
    { name: "Percentage", description: "Converting between fractions, decimals, and percentages; percentage of a quantity; percentage increase/decrease." },
    // Rate & Speed
    { name: "Rate & Speed", description: "Distance, time, speed calculations." }, // Combined for simplicity
    // Algebra
    { name: "Algebraic Expressions", description: "Forming and simplifying algebraic expressions." },
  ];

  const createdTopics = {};
  for (const topic of topicsData) {
    const newTopic = await prisma.topic.create({
      data: {
        name: topic.name,
        description: topic.description,
        subjectId: mathSubject.id,
      },
    });
    createdTopics[topic.name] = newTopic.id;
  }
  console.log("Mathematics Topics seeded.");

  // --- Seed Sample Mathematics Questions ---
  console.log("Seeding Sample Mathematics Questions...");

  // Category: Numbers - Whole Numbers
  await prisma.question.create({
    data: {
      text: "What is the value of the digit 7 in the number 57,321?",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "a", text: "70" },
        { id: "b", text: "700" },
        { id: "c", text: "7000" },
        { id: "d", text: "70000" },
      ],
      correctAnswer: ["c"],
      explanation: "The digit 7 is in the thousands place, so its value is 7000.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 5,
      subjectId: mathSubject.id,
      topicId: createdTopics["Whole Numbers"],
      tags: ["Place Value"],
    },
  });

  await prisma.question.create({
    data: {
      text: "Round off 48,567 to the nearest hundred.",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "a", text: "48,500" },
        { id: "b", text: "48,600" },
        { id: "c", text: "49,000" },
        { id: "d", text: "48,570" },
      ],
      correctAnswer: ["b"],
      explanation: "The digit in the tens place is 6, which is 5 or greater, so we round up the hundreds digit. 48,567 rounded to the nearest hundred is 48,600.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 5,
      subjectId: mathSubject.id,
      topicId: createdTopics["Whole Numbers"],
      tags: ["Rounding"],
    },
  });

  // Category: Numbers - Fractions
  await prisma.question.create({
    data: {
      text: "What is 2/5 + 1/3?",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "a", text: "3/8" },
        { id: "b", text: "11/15" },
        { id: "c", text: "3/15" },
        { id: "d", text: "2/15" },
      ],
      correctAnswer: ["b"],
      explanation: "To add fractions, find a common denominator. The common denominator for 5 and 3 is 15. (2/5) * (3/3) = 6/15. (1/3) * (5/5) = 5/15. 6/15 + 5/15 = 11/15.",
      difficulty: DifficultyLevel.MEDIUM,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Fractions"],
      tags: ["Addition", "Unlike Denominators"],
    },
  });
  
  await prisma.question.create({
    data: {
      text: "Mary had 20 sweets. She gave 1/4 of them to her brother. How many sweets did her brother receive?",
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: "5", // Can also be an array of acceptable string variations
      explanation: "1/4 of 20 is (1/4) * 20 = 20/4 = 5 sweets.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Fractions"],
      tags: ["Fraction of a Quantity"],
    },
  });

  // Category: Measurements - Area & Perimeter
  await prisma.question.create({
    data: {
      text: "A rectangle has a length of 8 cm and a width of 5 cm. What is its perimeter?",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "a", text: "13 cm" },
        { id: "b", text: "26 cm" },
        { id: "c", text: "40 cm" },
        { id: "d", text: "30 cm" },
      ],
      correctAnswer: ["b"],
      explanation: "Perimeter of a rectangle = 2 * (length + width) = 2 * (8 + 5) = 2 * 13 = 26 cm.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Area & Perimeter"],
      tags: ["Perimeter", "Rectangle"],
    },
  });

  // Category: Statistics - Average
   await prisma.question.create({
    data: {
      text: "The average mass of 3 boys is 45 kg. A fourth boy with a mass of 53 kg joins the group. What is the new average mass of the 4 boys?",
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: "47", // or "47 kg"
      explanation: "Total mass of 3 boys = 3 * 45 = 135 kg. Total mass of 4 boys = 135 + 53 = 188 kg. New average mass = 188 / 4 = 47 kg.",
      difficulty: DifficultyLevel.MEDIUM,
      pointsAwarded: 15,
      subjectId: mathSubject.id,
      topicId: createdTopics["Average"],
      tags: ["Average", "Problem Sum"],
    },
  });

  // Category: Geometry - Angles
  await prisma.question.create({
    data: {
      text: "In the figure, ABC is a straight line. Find angle x.",
      questionType: QuestionType.OPEN_ENDED,
      // Assume an image would show angle ABD = 70 degrees, angle DBC = x
      imageUrl: "/sample_angle_question.png", // You'd need to host this image
      correctAnswer: "110", // or "110°"
      explanation: "Angles on a straight line add up to 180°. So, x = 180° - 70° = 110°.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Angles"],
      tags: ["Angles on a straight line"],
    },
  });
  
  // Category: Ratio & Percentage - Percentage
  await prisma.question.create({
    data: {
      text: "There are 40 pupils in a class. 60% of them are girls. How many boys are there in the class?",
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: "a", text: "16" },
        { id: "b", text: "24" },
        { id: "c", text: "10" },
        { id: "d", text: "20" },
      ],
      correctAnswer: ["a"],
      explanation: "Percentage of boys = 100% - 60% = 40%. Number of boys = 40% of 40 = (40/100) * 40 = 16.",
      difficulty: DifficultyLevel.MEDIUM,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Percentage"],
      tags: ["Percentage", "Problem Sum"],
    },
  });

  // Category: Rate & Speed
  await prisma.question.create({
    data: {
      text: "A car travels at a speed of 60 km/h. How far will it travel in 2.5 hours?",
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: "150", // or "150 km"
      explanation: "Distance = Speed × Time. Distance = 60 km/h × 2.5 h = 150 km.",
      difficulty: DifficultyLevel.MEDIUM,
      pointsAwarded: 10,
      subjectId: mathSubject.id,
      topicId: createdTopics["Rate & Speed"],
      tags: ["Distance", "Speed", "Time"],
    },
  });

  // Category: Algebra - Algebraic Expressions
  await prisma.question.create({
    data: {
      text: "Simplify the expression: 3y + 7 - y + 2",
      questionType: QuestionType.OPEN_ENDED,
      correctAnswer: "2y + 9",
      explanation: "Combine like terms: (3y - y) + (7 + 2) = 2y + 9.",
      difficulty: DifficultyLevel.EASY,
      pointsAwarded: 5,
      subjectId: mathSubject.id,
      topicId: createdTopics["Algebraic Expressions"],
      tags: ["Simplification"],
    },
  });


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
  const firstTopicId = createdTopics["Whole Numbers"];
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

  // Create a subject
  const englishSubject = await prisma.subject.create({
    data: {
      name: 'English',
    },
  });

  // Create some topics
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Grammar',
        description: 'English grammar rules and usage',
        subjectId: englishSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Vocabulary',
        description: 'English vocabulary and word usage',
        subjectId: englishSubject.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Reading Comprehension',
        description: 'Understanding and analyzing written text',
        subjectId: englishSubject.id,
      },
    }),
  ]);

  // Create sample questions
  const questions = await Promise.all([
    // Grammar questions
    prisma.question.create({
      data: {
        text: 'Which sentence is grammatically correct?',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['She dont like ice cream', 'She doesnt likes ice cream', 'She doesn\'t like ice cream', 'She not like ice cream'],
        correctAnswer: 'She doesn\'t like ice cream',
        explanation: 'The correct form of the negative present simple with "she" uses "doesn\'t"',
        difficulty: DifficultyLevel.MEDIUM,
        subjectId: englishSubject.id,
        topicId: topics[0].id,
        pointsAwarded: 1,
      },
    }),
    prisma.question.create({
      data: {
        text: 'Choose the correct past tense form:',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['I goed to school', 'I gone to school', 'I went to school', 'I going to school'],
        correctAnswer: 'I went to school',
        explanation: '"Went" is the correct past tense form of "go"',
        difficulty: DifficultyLevel.EASY,
        subjectId: englishSubject.id,
        topicId: topics[0].id,
        pointsAwarded: 1,
      },
    }),
    // Vocabulary questions
    prisma.question.create({
      data: {
        text: 'What is the opposite of "happy"?',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['Sad', 'Angry', 'Tired', 'Excited'],
        correctAnswer: 'Sad',
        explanation: 'The antonym (opposite) of happy is sad',
        difficulty: DifficultyLevel.EASY,
        subjectId: englishSubject.id,
        topicId: topics[1].id,
        pointsAwarded: 1,
      },
    }),
    prisma.question.create({
      data: {
        text: 'Which word means "to move quickly"?',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['Crawl', 'Rush', 'Walk', 'Stand'],
        correctAnswer: 'Rush',
        explanation: '"Rush" means to move or do something quickly',
        difficulty: DifficultyLevel.MEDIUM,
        subjectId: englishSubject.id,
        topicId: topics[1].id,
        pointsAwarded: 1,
      },
    }),
    // Reading Comprehension questions
    prisma.question.create({
      data: {
        text: 'What is the main purpose of a topic sentence?',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: [
          'To end a paragraph',
          'To provide supporting details',
          'To introduce the main idea of a paragraph',
          'To connect to the next paragraph'
        ],
        correctAnswer: 'To introduce the main idea of a paragraph',
        explanation: 'A topic sentence states the main idea of a paragraph',
        difficulty: DifficultyLevel.MEDIUM,
        subjectId: englishSubject.id,
        topicId: topics[2].id,
        pointsAwarded: 1,
      },
    }),
  ]);

  console.log('Seed data created successfully');

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