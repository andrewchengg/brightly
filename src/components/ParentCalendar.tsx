"use client";

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  FaCalendarAlt,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaUsers,
  FaGraduationCap,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";

const localizer = momentLocalizer(moment);

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: "personal" | "lesson";
  childName?: string;
  childrenNames?: string;
  subject?: { name: string };
  teacher?: { name: string };
  class?: { name: string };
}

interface ParentCalendarProps {
  className?: string;
}

const ParentCalendar: React.FC<ParentCalendarProps> = ({ className }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [practiceDates, setPracticeDates] = useState<{ [key: string]: any }>(
    {}
  );
  const [loading, setLoading] = useState(false);

  // Fetch practice dates from the API
  const fetchPracticeDates = async () => {
    try {
      const response = await fetch("/api/parent/practice-dates");
      if (response.ok) {
        const data = await response.json();
        const datesMap: { [key: string]: any } = {};
        data.practiceDates.forEach((dayData: any) => {
          datesMap[dayData.date] = dayData;
        });
        setPracticeDates(datesMap);
      }
    } catch (error) {
      console.error("Error fetching practice dates:", error);
    }
  };

  // Fetch events from the API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch personal events for all children
      const personalResponse = await fetch("/api/parent/events");
      let personalEvents: Event[] = [];

      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        personalEvents = personalData.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          description: event.description,
          type: "personal" as const,
          childName: event.childName,
        }));
      }

      // Fetch class lessons for all children
      const lessonsResponse = await fetch("/api/parent/lessons");
      let lessonEvents: Event[] = [];

      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        lessonEvents = lessonsData.map((lesson: any) => ({
          id: lesson.id,
          title: `${lesson.name} - ${lesson.subject?.name || "Subject"}`,
          start: new Date(lesson.startTime),
          end: new Date(lesson.endTime),
          description: `Teacher: ${
            lesson.teacher?.name || "Unknown"
          } | Class: ${lesson.class?.name || "Unknown"}`,
          type: "lesson" as const,
          childrenNames: lesson.childrenNames,
          subject: lesson.subject,
          teacher: lesson.teacher,
          class: lesson.class,
        }));
      }

      // Combine both types of events
      setEvents([...personalEvents, ...lessonEvents]);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchPracticeDates();
  }, []);

  // Navigation functions
  const navigateToNext = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(date.getMonth() + 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(date.getDate() + 7);
    } else if (view === Views.DAY) {
      newDate.setDate(date.getDate() + 1);
    }
    setDate(newDate);
  };

  const navigateToPrev = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(date.getMonth() - 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(date.getDate() - 7);
    } else if (view === Views.DAY) {
      newDate.setDate(date.getDate() - 1);
    }
    setDate(newDate);
  };

  const navigateToToday = () => {
    setDate(new Date());
  };

  const handleDateJump = (selectedDate: string) => {
    if (selectedDate) {
      setDate(new Date(selectedDate));
    }
  };

  // Get current view title
  const getViewTitle = () => {
    if (view === Views.MONTH) {
      return moment(date).format("MMMM YYYY");
    } else if (view === Views.WEEK) {
      const startOfWeek = moment(date).startOf("week");
      const endOfWeek = moment(date).endOf("week");
      return `${startOfWeek.format("MMM D")} - ${endOfWeek.format(
        "MMM D, YYYY"
      )}`;
    } else if (view === Views.DAY) {
      return moment(date).format("dddd, MMMM D, YYYY");
    }
    return "";
  };

  // Handle event selection (when user clicks on an event)
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleViewChange = (selectedView: View) => {
    setView(selectedView);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FaUsers className="text-indigo-600" />
          Children's Schedule
        </h2>
        <div className="text-sm text-gray-600">
          {loading ? "Loading events..." : `${events.length} events loaded`}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        {/* Left side - Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={navigateToPrev}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <FaChevronLeft size={12} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            onClick={navigateToToday}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 px-3"
          >
            <FaCalendarDay size={12} />
            <span>Today</span>
          </Button>

          <Button
            onClick={navigateToNext}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <FaChevronRight size={12} />
          </Button>
        </div>

        {/* Center - Current view title */}
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-800 min-w-0">
            {getViewTitle()}
          </h3>

          {/* Date picker for quick navigation */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={moment(date).format("YYYY-MM-DD")}
              onChange={(e) => handleDateJump(e.target.value)}
              className="w-auto text-sm"
            />
          </div>
        </div>

        {/* Right side - View selector */}
        <div className="flex items-center gap-1 bg-white rounded-md border">
          <Button
            onClick={() => setView(Views.MONTH)}
            variant={view === Views.MONTH ? "default" : "ghost"}
            size="sm"
            className="rounded-r-none text-xs px-2 py-1"
          >
            Month
          </Button>
          <Button
            onClick={() => setView(Views.WEEK)}
            variant={view === Views.WEEK ? "default" : "ghost"}
            size="sm"
            className="rounded-none text-xs px-2 py-1"
          >
            Week
          </Button>
          <Button
            onClick={() => setView(Views.DAY)}
            variant={view === Views.DAY ? "default" : "ghost"}
            size="sm"
            className="rounded-l-none text-xs px-2 py-1"
          >
            Day
          </Button>
        </div>
      </div>

      <div className="h-[500px] bg-white rounded-lg border relative">
        <style jsx global>{`
          /* Practice completed days - simple dot */
          .practice-completed::after {
            content: "";
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
          }

          /* Today + practiced - green dot with subtle glow */
          .practice-today-completed::after {
            content: "";
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
          }

          /* Today + not practiced - subtle orange dot */
          .practice-today-pending::after {
            content: "";
            position: absolute;
            bottom: 4px;
            left: 4px;
            width: 6px;
            height: 6px;
            background: #f59e0b;
            border-radius: 50%;
            opacity: 0.7;
          }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={["month", "week", "day"]}
          view={view}
          date={date}
          onView={handleViewChange}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          popup
          style={{ height: "100%", padding: "10px" }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.type === "lesson" ? "#059669" : "#f59e0b",
              borderRadius: "4px",
              opacity: 0.8,
              color: "white",
              border: "0px",
              display: "block",
              cursor: "pointer",
            },
          })}
          dayPropGetter={(date) => {
            const today = new Date();
            const isToday = moment(date).isSame(today, "day");
            const dateKey = moment(date).format("YYYY-MM-DD");
            const dayPracticeData = practiceDates[dateKey];
            const hasPracticed = dayPracticeData?.hasPracticed;

            let backgroundColor = undefined;
            let border = undefined;
            let className = "";

            if (isToday && hasPracticed) {
              backgroundColor = "#dcfce7"; // light green
              border = "2px solid #16a34a"; // green border
              className = "practice-today-completed";
            } else if (isToday && !hasPracticed) {
              backgroundColor = "#fef3c7"; // light yellow
              border = "2px solid #f59e0b"; // orange border
              className = "practice-today-pending";
            } else if (isToday) {
              backgroundColor = "#f0f9ff"; // light blue
            } else if (hasPracticed) {
              backgroundColor = "#f0fdf4"; // very light green
              border = "1px solid #22c55e"; // green border
              className = "practice-completed";
            }

            return {
              style: {
                backgroundColor,
                border,
                position: "relative" as const,
              },
              className,
              title: hasPracticed
                ? `✨ Practice day: ${moment(date).format("MMM D")} - ${
                    dayPracticeData.sessionCount
                  } session(s) by ${dayPracticeData.childrenWhoStudied?.join(
                    ", "
                  )}`
                : isToday
                ? "🎯 Encourage your children to practice today!"
                : undefined,
            };
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span>Personal Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span>Class Lessons</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span>Practice Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span>Practice Today!</span>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventModal(false)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  {moment(selectedEvent.start).format("MMMM D, YYYY")}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <FaClock className="inline mr-2" />
                  {moment(selectedEvent.start).format("h:mm A")} -{" "}
                  {moment(selectedEvent.end).format("h:mm A")}
                </p>

                {selectedEvent.type === "lesson" &&
                  selectedEvent.childrenNames && (
                    <p className="text-sm text-gray-600 mb-2">
                      <FaUsers className="inline mr-2" />
                      Children: {selectedEvent.childrenNames}
                    </p>
                  )}

                {selectedEvent.type === "personal" &&
                  selectedEvent.childName && (
                    <p className="text-sm text-gray-600 mb-2">
                      <FaUsers className="inline mr-2" />
                      Child: {selectedEvent.childName}
                    </p>
                  )}

                {selectedEvent.type === "lesson" && selectedEvent.subject && (
                  <p className="text-sm text-gray-600 mb-2">
                    <FaGraduationCap className="inline mr-2" />
                    Subject: {selectedEvent.subject.name}
                  </p>
                )}

                {selectedEvent.description && (
                  <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-500 text-center">
                  {selectedEvent.type === "lesson"
                    ? "This is a class lesson schedule"
                    : "This is a personal event from your child"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ParentCalendar;
