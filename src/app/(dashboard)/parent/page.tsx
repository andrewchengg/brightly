"use client";
import ClientAnnouncements from "@/components/ClientAnnouncements";
import BigCalendar from "@/components/BigCalender";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ParentPage = () => {
  const supabase = createClient();
  const [parentName, setParentName] = useState("Parent");

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: parentData } = await supabase
            .from("Parent")
            .select("name")
            .eq("id", user.id)
            .single();
          
          if (parentData?.name) {
            setParentName(parentData.name);
          }
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
      }
    };

    fetchParentData();
  }, [supabase]);

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold">Schedule ({parentName})</h1>
          </div>
          <BigCalendar data={[]} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <ClientAnnouncements />
      </div>
    </div>
  );
};

export default ParentPage;
