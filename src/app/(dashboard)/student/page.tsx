import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import StudentSetupCheck from "@/components/StudentSetupCheck";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const StudentPage = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  console.log(`Student page loaded for user: ${userId}`);

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: userId! } },
    },
  });

  console.log(`Found ${classItem.length} classes for student:`, classItem);

  // If we have a class, let's check for lessons
  if (classItem.length > 0) {
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: classItem[0].id,
      },
    });
    console.log(`Found ${lessons.length} lessons for class ${classItem[0].id}`);
  }

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      <StudentSetupCheck />
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold">
              Schedule {classItem.length > 0 ? `(${classItem[0].name})` : ""}
            </h1>
          </div>

          {classItem.length > 0 ? (
            <div className="h-[600px]">
              <BigCalendarContainer type="classId" id={classItem[0].id} />
            </div>
          ) : (
            <div className="p-4 text-center">
              No class assigned to this student.
            </div>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer searchParams={{}} />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;
