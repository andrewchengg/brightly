import Image from "next/image";
import CountChart from "./CountChart";
import prisma from "@/lib/prisma";

const CountChartContainer = async () => {
  // Without the sex field in the Student model, we'll use mock data for the chart
  // In a real application, you would need to modify this based on what data is actually available
  const totalStudents = await prisma.student.count();
  
  // For demonstration, split approximately 60/40
  const boys = Math.round(totalStudents * 0.6);
  const girls = totalStudents - boys;

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Students</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <CountChart boys={boys} girls={girls} />
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
                      <div className="w-5 h-5 bg-brightSky rounded-full" />
          <h1 className="font-bold">{boys}</h1>
          <h2 className="text-xs text-gray-300">
            Boys ({totalStudents > 0 ? Math.round((boys / totalStudents) * 100) : 0}%)
          </h2>
        </div>
        <div className="flex flex-col gap-1">
                      <div className="w-5 h-5 bg-brightYellow rounded-full" />
          <h1 className="font-bold">{girls}</h1>
          <h2 className="text-xs text-gray-300">
            Girls ({totalStudents > 0 ? Math.round((girls / totalStudents) * 100) : 0}%)
          </h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
