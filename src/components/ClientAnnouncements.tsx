"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: number;
  title: string;
  description: string;
  date: Date;
};

export default function ClientAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        // Fetch up to 3 most recent announcements
        const { data: announcementsData, error } = await supabase
          .from('Announcement')
          .select('*')
          .order('date', { ascending: false })
          .limit(3);
          
        if (error) {
          console.error('Error fetching announcements:', error);
          return;
        }
        
        setAnnouncements(announcementsData || []);
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnnouncements();
  }, [supabase]);

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No announcements available</div>
        ) : (
          <>
            {announcements[0] && (
              <div className="bg-lamaSkyLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[0].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Date(announcements[0].date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[0].description}</p>
              </div>
            )}
            {announcements[1] && (
              <div className="bg-lamaPurpleLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[1].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Date(announcements[1].date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[1].description}</p>
              </div>
            )}
            {announcements[2] && (
              <div className="bg-lamaYellowLight rounded-md p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{announcements[2].title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                    {new Date(announcements[2].date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{announcements[2].description}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 