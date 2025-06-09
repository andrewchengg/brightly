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
} from "react-icons/fa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";

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

interface AssignmentType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  type: "TOPIC_QUIZ" | "MOCK_EXAM" | "ORAL_PRACTICE";
  requiresTopic?: boolean;
  requiresDuration?: boolean;
  defaultQuestions?: number;
  defaultDuration?: number;
}

const assignmentTypes: AssignmentType[] = [
  {
    id: "math-topic",
    name: "Math Topic Practice",
    description: "Randomized questions from a specific math topic",
    icon: FaCalculator,
    color: "bg-blue-500",
    type: "TOPIC_QUIZ",
    requiresTopic: true,
    defaultQuestions: 10,
  },
  {
    id: "math-mock",
    name: "Math Mock Exam",
    description: "Full-length mathematics mock examination",
    icon: FaFileAlt,
    color: "bg-red-500",
    type: "MOCK_EXAM",
    requiresDuration: true,
    defaultQuestions: 25,
    defaultDuration: 90,
  },
  {
    id: "chinese-oral",
    name: "Chinese Oral Practice",
    description: "Chinese speaking and pronunciation practice",
    icon: FaMicrophone,
    color: "bg-green-500",
    type: "ORAL_PRACTICE",
    requiresTopic: true,
    defaultQuestions: 5,
  },
  {
    id: "english-topic",
    name: "English Topic Practice",
    description: "Randomized English questions from selected topics",
    icon: FaBook,
    color: "bg-purple-500",
    type: "TOPIC_QUIZ",
    requiresTopic: true,
    defaultQuestions: 8,
  },
  {
    id: "random-practice",
    name: "Random Mixed Practice",
    description: "Mixed questions from multiple subjects",
    icon: FaRandom,
    color: "bg-orange-500",
    type: "TOPIC_QUIZ",
    defaultQuestions: 15,
  },
];

export default function AssignPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Form state
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

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

  const handleSubjectSelect = (subjectId: number) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null); // Reset topic when subject changes

    // Auto-generate assignment title
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) {
      setAssignmentTitle(`${subject.name} Practice Assignment`);
    }
  };

  const handleTopicSelect = (topicId: number) => {
    setSelectedTopic(topicId);

    // Update assignment title with topic
    const subject = subjects.find((s) => s.id === selectedSubject);
    const topic = subject?.topics.find((t) => t.id === topicId);
    if (subject && topic) {
      setAssignmentTitle(`${subject.name}: ${topic.name} Practice`);
    }
  };

  const handleAssign = async () => {
    if (!selectedChild) {
      toast.error("Please select a child");
      return;
    }

    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }

    if (!assignmentTitle.trim()) {
      toast.error("Please provide an assignment title");
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

      const assignmentData = {
        studentId: selectedChild,
        parentId: user.id,
        title: assignmentTitle,
        type: "TOPIC_QUIZ", // Default to topic quiz
        subjectId: selectedSubject,
        topicId: selectedTopic,
        totalQuestions: 10, // Fixed number of questions
      };

      const response = await fetch("/api/parent/assign-practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        const result = await response.json();
        const childName = children.find((c) => c.id === selectedChild)?.name;
        toast.success(`Assignment created successfully for ${childName}!`);

        // Reset form
        setSelectedChild("");
        setSelectedSubject(null);
        setSelectedTopic(null);
        setAssignmentTitle("");
        setAssignmentDescription("");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-2xl text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);
  const canAssign =
    selectedChild && selectedSubject && selectedTopic && assignmentTitle.trim();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <FaTasks className="text-indigo-600" />
          Assign Homework
        </h1>
        <p className="text-gray-600 mt-1">
          Select a child, subject, and topic to create a practice assignment
        </p>
      </div>

      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center space-x-2 ${
                selectedChild ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  selectedChild ? "bg-indigo-600 text-white" : "bg-gray-200"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Select Child</span>
            </div>
            <FaArrowRight className="text-gray-400" />
            <div
              className={`flex items-center space-x-2 ${
                selectedSubject ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  selectedSubject ? "bg-indigo-600 text-white" : "bg-gray-200"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Select Subject</span>
            </div>
            <FaArrowRight className="text-gray-400" />
            <div
              className={`flex items-center space-x-2 ${
                selectedTopic ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  selectedTopic ? "bg-indigo-600 text-white" : "bg-gray-200"
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Select Topic</span>
            </div>
          </div>
        </div>

        {/* Child Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaUser className="text-indigo-600" />
            Step 1: Select Child
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedChild === child.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{child.name}</div>
                  <div className="text-sm text-gray-500">@{child.username}</div>
                </div>
              </button>
            ))}
          </div>
          {children.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No children found</p>
              <p className="text-sm text-gray-400">
                Make sure you have children added to your account
              </p>
            </div>
          )}
        </Card>

        {/* Subject Selection */}
        {selectedChild && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaBook className="text-indigo-600" />
              Step 2: Select Subject
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectSelect(subject.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedSubject === subject.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="font-medium">{subject.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {subject.topics.length} topics
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Topic Selection */}
        {selectedSubject && selectedSubjectData && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaBook className="text-indigo-600" />
              Step 3: Select Topic from {selectedSubjectData.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {selectedSubjectData.topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTopic === topic.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="font-medium">{topic.name}</div>
                  {topic.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {topic.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedSubjectData.topics.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No topics available for this subject
              </p>
            )}
          </Card>
        )}

        {/* Assignment Details */}
        {selectedTopic && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaTasks className="text-indigo-600" />
              Assignment Details
            </h2>

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
                  placeholder="Add any special instructions for your child"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">
                  Assignment Details:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Number of questions: 10</li>
                  <li>• Type: Practice Quiz</li>
                  <li>• Difficulty: Adaptive</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {canAssign && (
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedChild("");
                setSelectedSubject(null);
                setSelectedTopic(null);
                setAssignmentTitle("");
                setAssignmentDescription("");
              }}
            >
              Reset
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2"
            >
              {assigning ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <FaTasks className="mr-2" />
                  Assign Homework
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
