import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all children of the parent with their class info
    const children = await prisma.student.findMany({
      where: { parentId: user.id },
      select: {
        id: true,
        name: true,
        classId: true,
        class: {
          select: { name: true },
        },
      },
    });

    if (children.length === 0) {
      return NextResponse.json([]);
    }

    // Get unique class IDs
    const classIds = children
      .map((child) => child.classId)
      .filter(Boolean) as number[];

    if (classIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get lessons for all children's classes
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: { in: classIds },
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
        class: {
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
    const generateRecurringEvents = (lessonsData: typeof lessons) => {
      const events = [];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

      // Generate events for the next 4 weeks
      for (let week = 0; week < 4; week++) {
        for (const lesson of lessonsData) {
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

          // Find which children are in this class
          const childrenInClass = children.filter(
            (child) => child.classId === lesson.classId
          );
          const childNames = childrenInClass
            .map((child) => child.name)
            .join(", ");

          events.push({
            id: `lesson-${lesson.id}-${week}-${dayOfWeek}`,
            name: lesson.name,
            startTime: eventStart.toISOString(),
            endTime: eventEnd.toISOString(),
            subject: lesson.subject,
            teacher: lesson.teacher,
            class: lesson.class,
            type: "lesson",
            childrenNames: childNames,
          });
        }
      }

      return events;
    };

    const recurringEvents = generateRecurringEvents(lessons);

    return NextResponse.json(recurringEvents);
  } catch (error) {
    console.error("Error fetching parent lessons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
