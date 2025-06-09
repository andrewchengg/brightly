import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  console.log(`Fetching lessons for ${type}: ${id}`);

  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      teacher: true,
      subject: true,
      class: true,
    },
  });

  console.log(
    `Found ${dataRes.length} lessons:`,
    dataRes.map((l) => ({
      id: l.id,
      name: l.name,
      day: l.day,
      start: l.startTime.toISOString(),
      end: l.endTime.toISOString(),
      className: l.class?.name || "Unknown Class",
    }))
  );

  // Generate dates for each day of the current week
  const generateWeekDates = (lessons: (typeof dataRes)[0][]) => {
    const events = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.

    // Find the date of the most recent Monday (for WORK_WEEK view)
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    for (const lesson of lessons) {
      // Create events for each day of the week (Mon-Fri)
      for (let i = 0; i < 5; i++) {
        const lessonDate = new Date(monday);
        lessonDate.setDate(monday.getDate() + i);

        // Skip days that don't match the lesson day
        // Convert day of week (0-6) to your enum if needed
        if (i === 0 && lesson.day !== "MONDAY") continue;
        // Add more conditions for other days when you add them to your enum

        // Create the start date for this event
        const startTime = new Date(lesson.startTime);
        const startDate = new Date(lessonDate);
        startDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

        // Create the end date for this event
        const endTime = new Date(lesson.endTime);
        const endDate = new Date(lessonDate);
        endDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

        events.push({
          title: `${lesson.name} - ${lesson.subject.name} - ${lesson.teacher.name}`,
          start: startDate,
          end: endDate,
        });
      }
    }

    return events;
  };

  const data = generateWeekDates(dataRes);
  console.log(`Generated ${data.length} calendar events`);

  return (
    <div className="h-[600px]">
      <BigCalendar data={data} />
    </div>
  );
};

export default BigCalendarContainer;
