"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FaTasks,
  FaCalculator,
  FaFileAlt,
  FaMicrophone,
  FaSpinner,
  FaUser,
  FaClock,
  FaQuestionCircle,
  FaChevronRight,
  FaBook,
  FaRandom,
  FaArrowRight,
  FaCheckCircle,
  FaPlayCircle,
  FaEye,
  FaCalendarAlt,
  FaTrophy,
  FaArrowLeft,
  FaClipboard,
  FaGraduationCap,
  FaListOl,
} from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge"; // Using span for now
import { toast } from "react-toastify";
import moment from "moment";

enum AssignablePracticeType {
  TOPIC_QUIZ = "Topic Quiz",
  RANDOM_SUBJECT_PRACTICE = "Random Practice by Subject",
  MOCK_EXAM_PAPER = "Mock Exam Paper"
}

const mockExamPapersConfig: Record<string, Array<{id: string; name: string; duration: number; totalQuestions: number }>> = {
  mathematics: [
    { id: "paper1", name: "Paper 1 (Math)", duration: 60, totalQuestions: 30 },
    { id: "paper2", name: "Paper 2 (Math)", duration: 90, totalQuestions: 17 },
  ],
};

const DEFAULT_PRACTICE_QUESTIONS = 10;

interface Child {
  id: string;
  name: string;
  username: string;
  grade: {
    level: number;
  } | null;
}

interface Subject {
  id: number;
  name: string;
  topics: Topic[];
}

interface Topic {
  id: number;
  name: string;
  description: string | null;
}

interface AssignedHomework {
  id: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  type: string;
  totalQuestions: number;
  correctAnswers: number | null;
  xpEarned: number | null;
  durationSeconds: number | null;
  assignedAt: string;
  startTime: string | null;
  endTime: string | null;
  subject: {
    id: number;
    name: string;
  } | null;
  topic: {
    id: number;
    name: string;
  } | null;
  accuracy: number | null;
  timeSpentMinutes: number | null;
  child?: {
    id: string;
    name: string;
    username: string;
  };
}

interface OverviewStats {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  inProgressAssignments: number;
  averageAccuracy: number;
  totalXpEarned: number;
  activeChildren: number;
  thisWeekAssignments: number;
}

export default function HomeworkPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [assignedHomework, setAssignedHomework] = useState<AssignedHomework[]>([]);
  const [allHomework, setAllHomework] = useState<AssignedHomework[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedPracticeType, setSelectedPracticeType] = useState<AssignablePracticeType | "">("");
  const [selectedMockPaperId, setSelectedMockPaperId] = useState<string>("");
  const [viewingHomework, setViewingHomework] = useState<AssignedHomework | null>(null);

  // Assignment form state
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
    fetchAllHomework();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildHomework(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to continue");
        return;
      }

      // Fetch children
      const childrenResponse = await fetch("/api/parent/children");
      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json();
        setChildren(childrenData.children || []);
      } else {
        toast.error("Failed to load children");
      }

      // Fetch subjects with topics
      const subjectsResponse = await fetch("/api/subjects");
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData);
      } else {
        toast.error("Failed to load subjects");
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllHomework = async () => {
    try {
      const response = await fetch("/api/parent/assigned-tasks");
      if (response.ok) {
        const data = await response.json();
        const homework = data.all || [];
        setAllHomework(homework);
        calculateOverviewStats(homework);
      } else {
        console.error("Failed to load all homework");
      }
    } catch (error) {
      console.error("Error fetching all homework:", error);
    }
  };

  const fetchChildHomework = async (childId: string) => {
    try {
      setLoadingHomework(true);
      const response = await fetch(`/api/parent/assigned-tasks?childId=${childId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignedHomework(data.all || []);
      } else {
        toast.error("Failed to load homework");
      }
    } catch (error) {
      console.error("Error fetching homework:", error);
      toast.error("Failed to load homework");
    } finally {
      setLoadingHomework(false);
    }
  };

  const calculateOverviewStats = (homework: AssignedHomework[]) => {
    const completed = homework.filter(h => h.status === "COMPLETED");
    const pending = homework.filter(h => h.status === "NOT_STARTED");
    const inProgress = homework.filter(h => h.status === "IN_PROGRESS");
    
    const avgAccuracy = completed.length > 0 
      ? Math.round(completed.reduce((sum, h) => sum + (h.accuracy || 0), 0) / completed.length)
      : 0;
      
    const totalXp = completed.reduce((sum, h) => sum + (h.xpEarned || 0), 0);
    
    const uniqueChildren = new Set(homework.map(h => h.child?.id).filter(Boolean)).size;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = homework.filter(h => new Date(h.assignedAt) >= oneWeekAgo).length;

    setOverviewStats({
      totalAssignments: homework.length,
      completedAssignments: completed.length,
      pendingAssignments: pending.length,
      inProgressAssignments: inProgress.length,
      averageAccuracy: avgAccuracy,
      totalXpEarned: totalXp,
      activeChildren: uniqueChildren,
      thisWeekAssignments: thisWeek,
    });
  };

  const handleSubjectSelect = (subjectId: number) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
    setSelectedMockPaperId("");

    // Auto-generate assignment title
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject && selectedChild) {
      setAssignmentTitle(`${subject.name} Practice for ${selectedChild.name}`);
    }
  };

  const handleTopicSelect = (topicId: number) => {
    setSelectedTopic(topicId);

    // Update assignment title with topic
    const subject = subjects.find((s) => s.id === selectedSubject);
    const topic = subject?.topics.find((t) => t.id === topicId);
    if (subject && topic && selectedChild) {
      setAssignmentTitle(`${subject.name}: ${topic.name} - ${selectedChild.name}`);
    }
  };

  const getAvailableMockPapers = () => {
    if (!selectedSubject) return [];
    const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase();
    return selectedSubjectName ? mockExamPapersConfig[selectedSubjectName] || [] : [];
  };

  const handleAssign = async () => {
    if (!selectedChild) {
      toast.error("Please select a child");
      return;
    }

    if (!selectedPracticeType) {
      toast.error("Please select a practice type");
      return;
    }

    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (!assignmentTitle.trim()) {
      toast.error("Please provide an assignment title");
      return;
    }

    // Validate specific requirements for each practice type
    if (selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && !selectedTopic) {
      toast.error("Please select a topic for the quiz");
      return;
    }

    if (selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && !selectedMockPaperId) {
      toast.error("Please select a mock exam paper");
      return;
    }

    setAssigning(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      let assignmentData: any = {
        studentId: selectedChild.id,
        parentId: user.id,
        title: assignmentTitle,
        subjectId: selectedSubject,
        totalQuestions: DEFAULT_PRACTICE_QUESTIONS,
      };

      // Configure assignment data based on practice type
      switch (selectedPracticeType) {
        case AssignablePracticeType.TOPIC_QUIZ:
          assignmentData = {
            ...assignmentData,
            type: "TOPIC_QUIZ",
            topicId: selectedTopic,
          };
          break;
        case AssignablePracticeType.RANDOM_SUBJECT_PRACTICE:
          assignmentData = {
            ...assignmentData,
            type: "PRACTICE",
          };
          break;
        case AssignablePracticeType.MOCK_EXAM_PAPER:
          const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name.toLowerCase();
          const subjectPapers = selectedSubjectName ? mockExamPapersConfig[selectedSubjectName] : undefined;
          const paperConfig = subjectPapers?.find((p: any) => p.id === selectedMockPaperId);

          if (!paperConfig) {
            toast.error("Selected mock exam paper configuration not found");
            return;
          }

          assignmentData = {
            ...assignmentData,
            type: "MOCK_EXAM",
            totalQuestions: paperConfig.totalQuestions,
            examDurationMinutes: paperConfig.duration,
            title: `${assignmentTitle} - ${paperConfig.name}`,
          };
          break;
        default:
          toast.error("Invalid practice type selected");
          return;
      }

      const response = await fetch("/api/parent/assign-practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        toast.success(`Assignment created successfully for ${selectedChild.name}!`);

        // Reset form
        setSelectedSubject(null);
        setSelectedTopic(null);
        setSelectedPracticeType("");
        setSelectedMockPaperId("");
        setAssignmentTitle("");
        setAssignmentDescription("");

        // Refresh homework lists
        fetchChildHomework(selectedChild.id);
        fetchAllHomework();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create assignment");
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "NOT_STARTED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Completed";
      case "IN_PROGRESS":
        return "In Progress";
      case "NOT_STARTED":
        return "Not Started";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-2xl text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // If no child is selected, show child selection
  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl shadow-xl">
                <FaTasks className="text-2xl text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight py-2">
                Manage Homework
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-1">
              Select a child to view and assign homework
            </p>
          </div>
        </div>

        {/* Overview Statistics */}
        {overviewStats && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Homework Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Total Assignments
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overviewStats.totalAssignments}
                      </p>
                      <p className="text-xs text-gray-500">All time</p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 group-hover:scale-110 transition-transform duration-300">
                      <FaTasks className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Completion Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overviewStats.totalAssignments > 0 
                          ? Math.round((overviewStats.completedAssignments / overviewStats.totalAssignments) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-500">{overviewStats.completedAssignments} completed</p>
                    </div>
                    <div className="p-2 rounded-xl bg-green-50 group-hover:scale-110 transition-transform duration-300">
                      <FaCheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Active Assignments
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overviewStats.pendingAssignments + overviewStats.inProgressAssignments}
                      </p>
                      <p className="text-xs text-gray-500">{overviewStats.pendingAssignments} pending</p>
                    </div>
                    <div className="p-2 rounded-xl bg-orange-50 group-hover:scale-110 transition-transform duration-300">
                      <FaClock className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Average Score
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {overviewStats.averageAccuracy}%
                      </p>
                      <p className="text-xs text-gray-500">across all completed assignments</p>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50 group-hover:scale-110 transition-transform duration-300">
                      <FaTrophy className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <FaUser className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">Active Children</h3>
                  <p className="text-xl font-bold text-blue-600">{overviewStats.activeChildren}</p>
                  <p className="text-xs text-gray-600">children with assignments</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <FaCalendarAlt className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">This Week</h3>
                  <p className="text-xl font-bold text-green-600">{overviewStats.thisWeekAssignments}</p>
                  <p className="text-xs text-gray-600">assignments created</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <FaTrophy className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">Total XP</h3>
                  <p className="text-xl font-bold text-purple-600">{overviewStats.totalXpEarned}</p>
                  <p className="text-xs text-gray-600">experience points earned</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaUser className="text-indigo-600" />
            Select Child
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{child.name}</h3>
                    <p className="text-sm text-gray-600">@{child.username}</p>
                    {child.grade && (
                      <p className="text-xs text-indigo-600 mt-1">
                        Grade {child.grade.level}
                      </p>
                    )}
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          {children.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FaUser className="mx-auto text-3xl mb-2 opacity-50" />
              <p>No children found</p>
              <p className="text-sm mt-1">Please add children to your account first</p>
            </div>
          )}
        </Card>
        </div>
      </div>
    );
  }

  // At this point, selectedChild is guaranteed to be non-null
  if (!selectedChild) {
    return null; // This should never happen due to the early return above
  }
  
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Homework Details Modal */}
      {viewingHomework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Homework Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingHomework(null)}
                  className="flex items-center gap-2"
                >
                  <FaArrowLeft className="w-3 h-3" />
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                {/* Title and Status */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {viewingHomework.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingHomework.status)}`}>
                      {getStatusText(viewingHomework.status)}
                    </span>
                    {viewingHomework.subject && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {viewingHomework.subject.name}
                      </span>
                    )}
                    {viewingHomework.topic && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        {viewingHomework.topic.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaQuestionCircle className="text-indigo-600" />
                    Assignment Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium text-gray-800">{viewingHomework.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Questions</p>
                      <p className="font-medium text-gray-800">{viewingHomework.totalQuestions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Assigned Date</p>
                      <p className="font-medium text-gray-800">
                        {moment(viewingHomework.assignedAt).format('MMMM DD, YYYY [at] h:mm A')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Assigned Time Ago</p>
                      <p className="font-medium text-gray-800">
                        {moment(viewingHomework.assignedAt).fromNow()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Data (if completed) */}
                {viewingHomework.status === "COMPLETED" && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaCheckCircle className="text-green-600" />
                      Performance Results
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Accuracy</p>
                        <p className="font-medium text-green-800 text-lg">
                          {viewingHomework.accuracy !== null ? `${viewingHomework.accuracy}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Correct Answers</p>
                        <p className="font-medium text-green-800 text-lg">
                          {viewingHomework.correctAnswers !== null ? `${viewingHomework.correctAnswers}/${viewingHomework.totalQuestions}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">XP Earned</p>
                        <p className="font-medium text-green-800 text-lg flex items-center gap-1">
                          <FaTrophy className="text-yellow-600" />
                          {viewingHomework.xpEarned || 0} XP
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time Spent</p>
                        <p className="font-medium text-green-800 text-lg flex items-center gap-1">
                          <FaClock className="text-blue-600" />
                          {viewingHomework.timeSpentMinutes ? `${viewingHomework.timeSpentMinutes} minutes` : 'N/A'}
                        </p>
                      </div>
                      {viewingHomework.startTime && (
                        <div>
                          <p className="text-sm text-gray-600">Started At</p>
                          <p className="font-medium text-green-800">
                            {moment(viewingHomework.startTime).format('MMMM DD, YYYY [at] h:mm A')}
                          </p>
                        </div>
                      )}
                      {viewingHomework.endTime && (
                        <div>
                          <p className="text-sm text-gray-600">Completed At</p>
                          <p className="font-medium text-green-800">
                            {moment(viewingHomework.endTime).format('MMMM DD, YYYY [at] h:mm A')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* In Progress Information */}
                {viewingHomework.status === "IN_PROGRESS" && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaPlayCircle className="text-blue-600" />
                      In Progress
                    </h4>
                    <div className="space-y-2">
                      {viewingHomework.startTime && (
                        <div>
                          <p className="text-sm text-gray-600">Started At</p>
                          <p className="font-medium text-blue-800">
                            {moment(viewingHomework.startTime).format('MMMM DD, YYYY [at] h:mm A')}
                          </p>
                          <p className="text-sm text-blue-600">
                            Started {moment(viewingHomework.startTime).fromNow()}
                          </p>
                        </div>
                      )}
                      <p className="text-blue-800">
                        The student has started this assignment and is currently working on it.
                      </p>
                    </div>
                  </div>
                )}

                {/* Not Started Information */}
                {viewingHomework.status === "NOT_STARTED" && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaClock className="text-yellow-600" />
                      Pending
                    </h4>
                    <p className="text-yellow-800">
                      This assignment has been assigned but the student hasn't started it yet.
                    </p>
                  </div>
                )}

                {/* Child Information */}
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaUser className="text-indigo-600" />
                    Student Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Student Name</p>
                      <p className="font-medium text-indigo-800">{viewingHomework.child?.name || selectedChild?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Username</p>
                      <p className="font-medium text-indigo-800">@{viewingHomework.child?.username || selectedChild?.username}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Header with child info */}
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-3">
            <Button
              variant="outline"
              onClick={() => setSelectedChild(null)}
              className="flex items-center gap-2"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Children
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Manage Homework - {selectedChild.name}
              </h1>
              <p className="text-gray-600 mt-1 text-base">
                Assign new homework and track progress
              </p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assign Homework Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaRandom className="text-indigo-600" />
              Assign Homework
            </h2>

            {/* Practice Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Practice Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPracticeType(AssignablePracticeType.TOPIC_QUIZ);
                    setSelectedTopic(null);
                    setSelectedMockPaperId("");
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ
                        ? "bg-indigo-100"
                        : "bg-gray-100"
                    }`}>
                      <FaListOl className={`w-5 h-5 ${
                        selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ
                          ? "text-indigo-600"
                          : "text-gray-600"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Topic Quiz</h3>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPracticeType(AssignablePracticeType.RANDOM_SUBJECT_PRACTICE);
                    setSelectedTopic(null);
                    setSelectedMockPaperId("");
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedPracticeType === AssignablePracticeType.RANDOM_SUBJECT_PRACTICE
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedPracticeType === AssignablePracticeType.RANDOM_SUBJECT_PRACTICE
                        ? "bg-indigo-100"
                        : "bg-gray-100"
                    }`}>
                      <FaRandom className={`w-5 h-5 ${
                        selectedPracticeType === AssignablePracticeType.RANDOM_SUBJECT_PRACTICE
                          ? "text-indigo-600"
                          : "text-gray-600"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Random Practice</h3>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPracticeType(AssignablePracticeType.MOCK_EXAM_PAPER);
                    setSelectedTopic(null);
                    setSelectedMockPaperId("");
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER
                        ? "bg-indigo-100"
                        : "bg-gray-100"
                    }`}>
                      <FaGraduationCap className={`w-5 h-5 ${
                        selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER
                          ? "text-indigo-600"
                          : "text-gray-600"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Mock Exam</h3>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleSubjectSelect(subject.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                      selectedSubject === subject.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <FaBook className={`w-5 h-5 ${
                        selectedSubject === subject.id
                          ? "text-indigo-600"
                          : "text-gray-600"
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedSubject === subject.id
                        ? "text-indigo-900"
                        : "text-gray-700"
                    }`}>
                      {subject.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection - Only for Topic Quiz */}
            {selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && selectedSubject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedSubjectData?.topics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleTopicSelect(topic.id)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                        selectedTopic === topic.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className={`text-sm font-medium ${
                        selectedTopic === topic.id
                          ? "text-indigo-900"
                          : "text-gray-700"
                      }`}>
                        {topic.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mock Exam Paper Selection - Only for Mock Exam */}
            {selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && selectedSubject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mock Exam Paper *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getAvailableMockPapers().map((paper: any) => (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setSelectedMockPaperId(paper.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedMockPaperId === paper.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium ${
                            selectedMockPaperId === paper.id
                              ? "text-indigo-900"
                              : "text-gray-900"
                          }`}>
                            {paper.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {paper.duration} mins • {paper.totalQuestions} questions
                          </p>
                        </div>
                        <FaGraduationCap className={`w-5 h-5 ${
                          selectedMockPaperId === paper.id
                            ? "text-indigo-600"
                            : "text-gray-600"
                        }`} />
                      </div>
                    </button>
                  ))}
                </div>
                {getAvailableMockPapers().length === 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    No mock exam papers available for this subject.
                  </p>
                )}
              </div>
            )}

            {/* Assignment Details - Show when practice type and subject are selected */}
            {(selectedPracticeType && selectedSubject) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Title
                  </label>
                  <Input
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="Enter assignment title"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <Textarea
                    value={assignmentDescription}
                    onChange={(e) => setAssignmentDescription(e.target.value)}
                    placeholder="Add any special instructions"
                    rows={3}
                    className="w-full"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Assignment Details:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && (
                      <>
                        <li>• Type: Topic Quiz</li>
                        <li>• Number of questions: {DEFAULT_PRACTICE_QUESTIONS}</li>
                        <li>• Difficulty: Adaptive</li>
                      </>
                    )}
                    {selectedPracticeType === AssignablePracticeType.RANDOM_SUBJECT_PRACTICE && (
                      <>
                        <li>• Type: Random Practice</li>
                        <li>• Number of questions: {DEFAULT_PRACTICE_QUESTIONS}</li>
                        <li>• Mixed topics from selected subject</li>
                      </>
                    )}
                    {selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && (
                      <>
                        <li>• Type: Mock Exam Paper</li>
                        <li>• Duration: {getAvailableMockPapers().find(p => p.id === selectedMockPaperId)?.duration || 0} minutes</li>
                        <li>• Questions: {getAvailableMockPapers().find(p => p.id === selectedMockPaperId)?.totalQuestions || 0}</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <Button
              onClick={handleAssign}
              disabled={
                assigning ||
                !selectedPracticeType ||
                !selectedSubject ||
                !assignmentTitle.trim() ||
                (selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && !selectedTopic) ||
                (selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && !selectedMockPaperId)
              }
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200"
            >
              {assigning ? (
                <div className="flex items-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Creating Assignment...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FaTasks />
                  Assign to {selectedChild.name}
                </div>
              )}
            </Button>
          </Card>
        </div>

        {/* Assigned Homework Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FaClipboard className="text-indigo-600" />
                Assigned Homework
              </h2>
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {assignedHomework.length} assignments
              </span>
            </div>

            {loadingHomework ? (
              <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin text-2xl text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading homework...</span>
              </div>
            ) : assignedHomework.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaTasks className="mx-auto text-3xl mb-2 opacity-50" />
                <p>No homework assigned yet</p>
                <p className="text-sm mt-1">
                  Use the form on the left to assign homework
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {assignedHomework.map((homework) => (
                  <div
                    key={homework.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 mb-1">
                          {homework.title}
                        </h3>
                                                 <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                           {homework.subject && (
                             <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                               {homework.subject.name}
                             </span>
                           )}
                           {homework.topic && (
                             <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                               {homework.topic.name}
                             </span>
                           )}
                         </div>
                        <p className="text-xs text-gray-500">
                          Assigned {moment(homework.assignedAt).fromNow()}
                        </p>
                      </div>
                                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(homework.status)}`}>
                         {getStatusText(homework.status)}
                       </span>
                    </div>

                    {homework.status === "COMPLETED" && homework.accuracy !== null && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <FaCheckCircle className="text-green-600" />
                              <span className="text-green-800">
                                {homework.accuracy}% accuracy
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FaTrophy className="text-yellow-600" />
                              <span className="text-green-800">
                                {homework.xpEarned || 0} XP
                              </span>
                            </div>
                            {homework.timeSpentMinutes && (
                              <div className="flex items-center gap-1">
                                <FaClock className="text-blue-600" />
                                <span className="text-green-800">
                                  {homework.timeSpentMinutes}m
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {homework.status === "IN_PROGRESS" && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <FaPlayCircle className="text-blue-600" />
                          <span>In progress...</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => setViewingHomework(homework)}
                      >
                        <FaEye className="w-3 h-3" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
