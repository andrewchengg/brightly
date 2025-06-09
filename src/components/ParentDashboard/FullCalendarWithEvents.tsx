"use client";

import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaUsers,
  FaGraduationCap,
  FaClock,
  FaCalendarPlus,
  FaTimes,
} from "react-icons/fa";

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

interface Child {
  id: string;
  name: string;
  username: string;
  email?: string;
  img?: string;
  level: number;
  xpPoints: number;
  class?: { name: string };
  grade?: { level: number; name?: string };
}

interface FullCalendarWithEventsProps {
  className?: string;
}

const FullCalendarWithEvents: React.FC<FullCalendarWithEventsProps> = ({
  className,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [practiceDates, setPracticeDates] = useState<{ [key: string]: any }>(
    {}
  );
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    childId: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // Fetch children data
  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/parent/children");
      if (response.ok) {
        const data = await response.json();
        setChildren(Array.isArray(data.children) ? data.children : []);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

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
    fetchChildren();
    fetchEvents();
    fetchPracticeDates();
  }, []);

  // Handle slot selection (when user clicks or drags on empty calendar space)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setEventForm({
      title: "",
      description: "",
      childId: children.length > 0 ? children[0].id : "",
      date: moment(start).format("YYYY-MM-DD"),
      startTime: moment(start).format("HH:mm"),
      endTime: moment(end).format("HH:mm"),
    });
    setShowAddEventModal(true);
  };

  // Handle event selection (when user clicks on an event)
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Handle adding new event
  const handleAddEvent = async () => {
    if (
      !eventForm.title.trim() ||
      !eventForm.childId ||
      !eventForm.date ||
      !eventForm.startTime ||
      !eventForm.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startDateTime = new Date(`${eventForm.date}T${eventForm.startTime}`);
    const endDateTime = new Date(`${eventForm.date}T${eventForm.endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    setAddingEvent(true);
    try {
      const response = await fetch("/api/student/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          studentId: eventForm.childId,
        }),
      });

      if (response.ok) {
        toast.success("Event added successfully!");
        setShowAddEventModal(false);
        setEventForm({
          title: "",
          description: "",
          childId: "",
          date: "",
          startTime: "",
          endTime: "",
        });
        // Refresh events
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    } finally {
      setAddingEvent(false);
    }
  };

  return (
    <div className={className}>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FaCalendarAlt className="mr-2 text-green-600" />
              Family Calendar
            </CardTitle>
            <Button
              onClick={() => setShowAddEventModal(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FaCalendarPlus className="mr-2 w-4 h-4" />
              Add Event
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[600px] bg-white rounded-lg border relative">
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
              onView={setView}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
              style={{ height: "100%", padding: "10px" }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor:
                    event.type === "lesson" ? "#059669" : "#f59e0b",
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
            <div className="text-xs text-gray-500 ml-4">
              💡 Click or drag on empty spaces to create new events
            </div>
          </div>
        </CardContent>
      </Card>

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
                <FaTimes />
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

                {selectedEvent.description && (
                  <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add New Event</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddEventModal(false)}
                >
                  <FaTimes />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <Input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child *
                </label>
                <select
                  value={eventForm.childId}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, childId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select a child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <Input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, startTime: e.target.value })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <Input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, endTime: e.target.value })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  placeholder="Add event description (optional)"
                  className="w-full"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEventModal(false)}
                  className="flex-1"
                  disabled={addingEvent}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEvent}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={addingEvent}
                >
                  {addingEvent ? "Adding..." : "Add Event"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FullCalendarWithEvents;
