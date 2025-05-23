"use client";

import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FaCalendarPlus, FaTimes, FaEdit, FaTrash, FaCalendarAlt, FaClock, FaChevronLeft, FaChevronRight, FaCalendarDay } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'react-toastify';

const localizer = momentLocalizer(moment);

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: 'personal' | 'lesson';
}

interface StudentCalendarProps {
  className?: string;
}

const StudentCalendar: React.FC<StudentCalendarProps> = ({ className }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
  });

  // Fetch events from the API
  const fetchEvents = async () => {
    try {
      // Fetch personal events
      const personalResponse = await fetch('/api/student/events');
      let personalEvents: Event[] = [];
      
      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        personalEvents = personalData.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          description: event.description,
          type: 'personal' as const,
        }));
      }

      // Fetch class lessons
      const lessonsResponse = await fetch('/api/student/lessons');
      let lessonEvents: Event[] = [];
      
      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        lessonEvents = lessonsData.map((lesson: any) => ({
          id: lesson.id,
          title: `${lesson.name} - ${lesson.subject?.name || 'Subject'}`,
          start: new Date(lesson.startTime),
          end: new Date(lesson.endTime),
          description: `Teacher: ${lesson.teacher?.name || 'Unknown'}`,
          type: 'lesson' as const,
        }));
      }

      // Combine both types of events
      setEvents([...personalEvents, ...lessonEvents]);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    }
  };

  useEffect(() => {
    fetchEvents();
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
      return moment(date).format('MMMM YYYY');
    } else if (view === Views.WEEK) {
      const startOfWeek = moment(date).startOf('week');
      const endOfWeek = moment(date).endOf('week');
      return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`;
    } else if (view === Views.DAY) {
      return moment(date).format('dddd, MMMM D, YYYY');
    }
    return '';
  };

  // Handle slot selection (when user clicks on calendar)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setIsEditing(false);
    setFormData({
      title: '',
      description: '',
      date: moment(start).format('YYYY-MM-DD'),
      startTime: moment(start).format('HH:mm'),
      endTime: moment(end).format('HH:mm'),
    });
    setShowAddModal(true);
  };

  // Handle event selection (when user clicks on an event)
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: moment(event.start).format('YYYY-MM-DD'),
      startTime: moment(event.start).format('HH:mm'),
      endTime: moment(event.end).format('HH:mm'),
    });
    setShowEventModal(false);
    setShowAddModal(true);
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the event');
      return false;
    }

    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please select date and times');
      return false;
    }

    // Combine date and time for validation
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time');
      return false;
    }

    return true;
  };

  // Add new event
  const addEvent = async () => {
    if (!validateForm()) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    setLoading(true);
    try {
      const response = await fetch('/api/student/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Event added successfully!');
        setShowAddModal(false);
        setFormData({ title: '', description: '', date: '', startTime: '', endTime: '' });
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add event');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  // Update event
  const updateEvent = async () => {
    if (!selectedEvent || !validateForm()) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    setLoading(true);
    try {
      const response = await fetch(`/api/student/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Event updated successfully!');
        setShowAddModal(false);
        setIsEditing(false);
        setSelectedEvent(null);
        setFormData({ title: '', description: '', date: '', startTime: '', endTime: '' });
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  // Delete event
  const deleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/student/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Event deleted successfully!');
        setShowEventModal(false);
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
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
        <h2 className="text-xl font-semibold text-gray-800">Your Schedule</h2>
        <Button
          onClick={() => {
            setIsEditing(false);
            setFormData({
              title: '',
              description: '',
              date: moment().format('YYYY-MM-DD'),
              startTime: moment().format('HH:mm'),
              endTime: moment().add(1, 'hour').format('HH:mm'),
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <FaCalendarPlus size={14} />
          <span>Add Event</span>
        </Button>
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
              value={moment(date).format('YYYY-MM-DD')}
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

      <div className="h-[500px] bg-white rounded-lg border">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'week', 'day']}
          view={view}
          date={date}
          onView={handleViewChange}
          onNavigate={handleNavigate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          style={{ height: '100%', padding: '10px' }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.type === 'lesson' ? '#059669' : '#4f46e5',
              borderRadius: '4px',
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block',
              cursor: 'pointer',
            },
          })}
          dayPropGetter={(date) => {
            const today = new Date();
            const isToday = moment(date).isSame(today, 'day');
            return {
              style: {
                backgroundColor: isToday ? '#f0f9ff' : undefined,
              },
            };
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-600 rounded"></div>
          <span>Personal Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span>Class Lessons</span>
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
                <FaTimes />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  {moment(selectedEvent.start).format('MMMM D, YYYY')}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <FaClock className="inline mr-2" />
                  {moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}
                </p>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              {selectedEvent.type === 'personal' ? (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleEditEvent(selectedEvent)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <FaEdit className="mr-2" size={14} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) {
                        deleteEvent(selectedEvent.id);
                      }
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <FaTrash className="mr-2" size={14} />
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-sm text-gray-500 text-center">
                    Class lessons cannot be modified from here
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {isEditing ? 'Edit Event' : 'Add New Event'}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  setIsEditing(false);
                  setSelectedEvent(null);
                }}
              >
                <FaTimes />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter event title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter event description (optional)"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full pl-10"
                  />
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full pl-10"
                    />
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full pl-10"
                    />
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={isEditing ? updateEvent : addEvent}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading 
                    ? (isEditing ? 'Updating...' : 'Adding...') 
                    : (isEditing ? 'Update Event' : 'Add Event')
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                    setSelectedEvent(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar; 