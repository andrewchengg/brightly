import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, get the student's class
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      select: { classId: true },
    });

    if (!student || !student.classId) {
      return NextResponse.json([]);
    }

    // Get lessons for the student's class
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: student.classId,
      },
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Generate recurring events for the current week and next few weeks
    const generateRecurringEvents = (lessons: any[]) => {
      const events = [];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

      // Generate events for the next 4 weeks
      for (let week = 0; week < 4; week++) {
        for (const lesson of lessons) {
          if (!lesson.day) continue;

          // Map day enum to day of week (0 = Sunday, 1 = Monday, etc.)
          const dayMap: { [key: string]: number } = {
            SUNDAY: 0,
            MONDAY: 1,
            TUESDAY: 2,
            WEDNESDAY: 3,
            THURSDAY: 4,
            FRIDAY: 5,
            SATURDAY: 6,
          };

          const dayOfWeek = dayMap[lesson.day];
          if (dayOfWeek === undefined) continue;

          // Calculate the date for this lesson
          const lessonDate = new Date(startOfWeek);
          lessonDate.setDate(
            startOfWeek.getDate() + week * 7 + (dayOfWeek - 1)
          );

          // Create start and end times for this specific date
          const startTime = new Date(lesson.startTime);
          const endTime = new Date(lesson.endTime);

          const eventStart = new Date(lessonDate);
          eventStart.setHours(
            startTime.getHours(),
            startTime.getMinutes(),
            0,
            0
          );

          const eventEnd = new Date(lessonDate);
          eventEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

          events.push({
            id: `${lesson.id}-${week}-${dayOfWeek}`, // Unique ID for each occurrence
            name: lesson.name,
            startTime: eventStart.toISOString(),
            endTime: eventEnd.toISOString(),
            subject: lesson.subject,
            teacher: lesson.teacher,
          });
        }
      }

      return events;
    };

    const recurringEvents = generateRecurringEvents(lessons);

    return NextResponse.json(recurringEvents);
  } catch (error) {
    console.error("Error fetching student lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}
