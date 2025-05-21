import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const TeacherPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId: user?.id!,
    },
  });
  
  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Schedule</h1>
          <BigCalendar
            data={lessons.map((lesson) => ({
              title: lesson.name,
              start: lesson.startTime,
              end: lesson.endTime,
            }))}
          />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default TeacherPage;
