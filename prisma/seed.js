// @ts-check
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

// Initialize Supabase admin client for creating users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Define enum values directly
const MALE = "MALE";
const FEMALE = "FEMALE";
const MONDAY = "MONDAY";

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.announcement.deleteMany(),
    prisma.event.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.result.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.student.deleteMany(),
    prisma.class.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.parent.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.admin.deleteMany(),
  ]);

  // ADMIN
  await prisma.admin.create({
    data: {
      id: "admin1",
      username: "admin1",
    },
  });
  await prisma.admin.create({
    data: {
      id: "admin2",
      username: "admin2",
    },
  });

  // GRADE
  for (let i = 1; i <= 6; i++) {
    await prisma.grade.create({
      data: {
        level: i,
      },
    });
  }

  // Create first teacher for supervisor role in Supabase Auth and Prisma
  try {
    const { data: superAuth, error: superError } = await supabaseAdmin.auth.admin.createUser({
      email: "supervisor@example.com",
      password: "password123",
      user_metadata: { 
        role: "teacher", 
        name: "Super", 
        surname: "Visor",
        username: "teacher0" 
      },
      email_confirm: true
    });

    if (superError) {
      console.error("Error creating Supabase auth user for supervisor:", superError);
      // Use fallback ID if auth user creation fails
      await prisma.teacher.create({
        data: {
          id: "teacher0",
          username: "teacher0",
          name: "TName0",
          surname: "TSurname0",
          email: "teacher0@example.com",
          phone: "123-456-7890",
          address: "Address0",
          img: "/noAvatar.png",
          bloodType: "A+",
          sex: "MALE",
        },
      });
    } else {
      await prisma.teacher.create({
        data: {
          id: superAuth.user.id,
          username: "teacher0",
          name: "TName0",
          surname: "TSurname0",
          email: "supervisor@example.com",
          phone: "123-456-7890",
          address: "Address0",
          img: "/noAvatar.png",
          bloodType: "A+",
          sex: "MALE",
        },
      });
    }
  } catch (err) {
    console.error("Error in supervisor creation:", err);
    // Use fallback ID if auth user creation fails
    await prisma.teacher.create({
      data: {
        id: "teacher0",
        username: "teacher0",
        name: "TName0",
        surname: "TSurname0",
        email: "teacher0@example.com",
        phone: "123-456-7890",
        address: "Address0",
        img: "/noAvatar.png",
        bloodType: "A+",
        sex: "MALE",
      },
    });
  }

  // Reference to the supervisor to use for classes
  const supervisor = await prisma.teacher.findFirst({
    where: { username: "teacher0" }
  });
  const supervisorId = supervisor ? supervisor.id : "teacher0";

  // CLASS
  for (let i = 1; i <= 6; i++) {
    await prisma.class.create({
      data: {
        name: `${i}A`,
        gradeId: i,
        capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
        supervisorId: supervisorId,
      },
    });
  }

  // SUBJECT
  const subjectData = [
    { name: "Mathematics" },
    { name: "Science" },
    { name: "English" },
    { name: "History" },
    { name: "Geography" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "Biology" },
    { name: "Computer Science" },
    { name: "Art" },
  ];

  for (const subject of subjectData) {
    await prisma.subject.create({ data: subject });
  }

  // TEACHER
  for (let i = 1; i <= 15; i++) {
    const teacherEmail = `teacher${i}@example.com`;
    let teacherId = `teacher${i}`;

    try {
      const { data: teacherAuth, error: teacherError } = await supabaseAdmin.auth.admin.createUser({
        email: teacherEmail,
        password: "password123",
        user_metadata: { 
          role: "teacher", 
          name: `TName${i}`, 
          surname: `TSurname${i}`,
          username: `teacher${i}`
        },
        email_confirm: true
      });

      if (teacherError) {
        console.error(`Error creating Supabase auth user for teacher${i}:`, teacherError);
      } else {
        teacherId = teacherAuth.user.id;
      }
    } catch (err) {
      console.error(`Error in teacher${i} creation:`, err);
    }

    await prisma.teacher.create({
      data: {
        id: teacherId,
        username: `teacher${i}`,
        name: `TName${i}`,
        surname: `TSurname${i}`,
        email: teacherEmail,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
        img: "/noAvatar.png",
        bloodType: "A+",
        sex: i % 2 === 0 ? "MALE" : "FEMALE",
        subjects: { connect: [{ id: (i % 10) + 1 }] },
        classes: { connect: [{ id: (i % 6) + 1 }] },
      },
    });
  }

  // LESSON
  for (let i = 1; i <= 30; i++) {
    await prisma.lesson.create({
      data: {
        name: `Lesson${i}`,
        day: "MONDAY", // Using MONDAY as it's the only day in the enum
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 3)),
        subjectId: (i % 10) + 1,
        classId: (i % 6) + 1,
        teacherId: `teacher${(i % 15) + 1}`,
      },
    });
  }

  // PARENT
  for (let i = 1; i <= 25; i++) {
    await prisma.parent.create({
      data: {
        id: `parentId${i}`,
        username: `parentId${i}`,
        name: `PName ${i}`,
        email: `parent${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
      },
    });
  }

  // STUDENT
  for (let i = 1; i <= 50; i++) {
    await prisma.student.create({
      data: {
        id: `student${i}`,
        username: `student${i}`,
        name: `SName${i}`,
        surname: `SSurname ${i}`,
        email: `student${i}@example.com`,
        phone: `987-654-321${i}`,
        address: `Address${i}`,
        img: "/noAvatar.png", // Using a placeholder image
        bloodType: "O-",
        sex: i % 2 === 0 ? "MALE" : "FEMALE",
        parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
        gradeId: (i % 6) + 1,
        classId: (i % 6) + 1,
      },
    });
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await prisma.exam.create({
      data: {
        title: `Exam ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // ASSIGNMENT
  for (let i = 1; i <= 10; i++) {
    await prisma.assignment.create({
      data: {
        title: `Assignment ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
        lessonId: (i % 30) + 1,
      },
    });
  }

  // RESULT
  for (let i = 1; i <= 10; i++) {
    await prisma.result.create({
      data: {
        score: 90,
        studentId: `student${i}`,
        ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }),
      },
    });
  }

  // ATTENDANCE
  for (let i = 1; i <= 10; i++) {
    await prisma.attendance.create({
      data: {
        date: new Date(),
        present: true,
        studentId: `student${i}`,
        lessonId: (i % 30) + 1,
      },
    });
  }

  // EVENT
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`,
        description: `Description for Event ${i}`,
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
        classId: (i % 5) + 1,
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`,
        description: `Description for Announcement ${i}`,
        date: new Date(),
        classId: (i % 5) + 1,
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
