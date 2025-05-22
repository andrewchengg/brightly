"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Topic } from "@/generated/prisma";

interface TopicWithMastery extends Topic {
  masteryPercentage: number;
  subject: {
    id: number;
    name: string;
  };
}

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const [topic, setTopic] = useState<TopicWithMastery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopic() {
      try {
        const response = await fetch(`/api/topics/${topicId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch topic");
        }
        const data = await response.json();
        setTopic({
          ...data,
          masteryPercentage: 0 // Default mastery percentage
        });
      } catch (error) {
        console.error("Error fetching topic:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopic();
  }, [topicId]);

  const startPractice = () => {
    // This will be implemented later to start a practice session
    alert(`Starting practice for topic: ${topic?.name}`);
    // Eventually navigate to practice session: router.push(`/student/practice/${topicId}/session`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Topic not found</h1>
        <Button onClick={() => router.push("/student/practice")}>
          Back to Practice Topics
        </Button>
      </div>
    );
  }

  // Generate topic color the same way as in the grid
  const getTopicColor = (topicName: string) => {
    let hash = 0;
    for (let i = 0; i < topicName.length; i++) {
      hash = topicName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
  };

  const bgColor = getTopicColor(topic.name);

  return (
    <div className="p-6">
      <Button 
        variant="outline" 
        onClick={() => router.push("/student/practice")}
        className="mb-6"
      >
        ← Back to Topics
      </Button>

      <Card className="shadow-lg max-w-4xl mx-auto">
        <CardHeader style={{ backgroundColor: bgColor }} className="rounded-t-lg">
          <CardTitle className="text-2xl font-bold">{topic.name}</CardTitle>
          <CardDescription className="text-gray-800">
            Subject: {topic.subject.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p>{topic.description || "No description available."}</p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Your Progress</h3>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Mastery</span>
              <span className="text-sm font-medium">{topic.masteryPercentage}%</span>
            </div>
            <ProgressBar value={topic.masteryPercentage} max={100} className="h-2 mb-4" />
            <p className="text-sm text-gray-600">
              Complete practice sessions to increase your mastery of this topic.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-gray-50 rounded-b-lg">
          <Button onClick={startPractice} className="w-full">
            Start Practice
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 