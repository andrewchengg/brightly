import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": "Brightly - Educational Learning Platform",
    },
  });
};

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  priority: "high" | "medium" | "low";
  category: string;
  dueDate?: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  duration: string;
  subject: string;
  type: string;
  description: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get user authentication
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch student data for context
    let studentContext = "";
    try {
      const statsResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/api/parent/statistics`,
        {
          headers: {
            Cookie: req.headers.get("Cookie") || "",
          },
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();

        // Format the data for AI context
        const contextSummary = statsData.children
          .map((child: any) => {
            const weakSubjects = child.subjectBreakdown
              .filter((subject: any) => subject.accuracy < 70)
              .map(
                (subject: any) =>
                  `${subject.subject} (${subject.accuracy}% accuracy)`
              );

            const strongSubjects = child.subjectBreakdown
              .filter((subject: any) => subject.accuracy >= 85)
              .map(
                (subject: any) =>
                  `${subject.subject} (${subject.accuracy}% accuracy)`
              );

            return `
CHILD: ${child.name}
- Current Level: ${child.level}, XP: ${child.xpPoints}
- Study Streak: ${child.currentStreak} days (longest: ${child.longestStreak})
- Today's Performance: ${child.today.questionsAnswered} questions, ${
              child.today.accuracy
            }% accuracy, ${child.today.timeSpentMinutes} minutes
- Weekly Performance: ${child.week.questionsAnswered} questions, ${
              child.week.accuracy
            }% accuracy, ${child.week.timeSpentMinutes} minutes
- Strong Subjects: ${
              strongSubjects.length > 0
                ? strongSubjects.join(", ")
                : "None identified yet"
            }
- Weak Subjects: ${
              weakSubjects.length > 0
                ? weakSubjects.join(", ")
                : "None identified yet"
            }
- Recent Daily Performance: ${child.dailyStats
              .slice(-7)
              .map(
                (day: any) => `${day.date}: ${day.questions}q, ${day.accuracy}%`
              )
              .join(" | ")}
`;
          })
          .join("\n");

        studentContext = `
REAL STUDENT DATA CONTEXT:
${contextSummary}

Use this actual performance data to provide specific, data-driven insights and recommendations.
`;
      }
    } catch (error) {
      console.error("Error fetching student context:", error);
      // Continue without context if there's an error
    }

    const systemPrompt = `You are an AI educational planner for parents. You help analyze children's educational progress and create personalized learning plans based on REAL performance data.

Your capabilities include:
1. Analyzing weak topics and learning gaps using actual student performance data
2. Creating data-driven study schedules and learning roadmaps
3. Providing specific educational guidance based on performance patterns
4. Identifying trends in accuracy, time management, and subject performance
5. Creating targeted improvement plans for struggling areas

IMPORTANT: You will receive real student performance data including:
- Current performance levels and accuracy rates by subject
- Daily and weekly study patterns
- Strong and weak subject areas
- Time spent studying and question-answering patterns
- Learning streaks and engagement metrics

Always reference this specific data in your responses and provide concrete, actionable advice based on the actual performance metrics.

CRITICAL: When creating roadmaps, generate DAILY STEP-BY-STEP plans:
- "Tomorrow: Practice 20 algebra problems focusing on [specific weak area]"
- "Day 2: Review Chinese character writing for [specific characters they struggle with]"
- "Day 3: Mixed practice combining both weak subjects"
- "Weekend: Take a mock exam covering the week's topics"

Make it feel like a personal tutor giving day-by-day instructions, not generic advice!

When asked about creating schedules, roadmaps, or plans, you should provide structured data.

For roadmaps, respond with this JSON structure with SPECIFIC DAILY TASKS:
{
  "content": "Your explanation here",
  "roadmap": [
    {
      "id": "unique_id",
      "title": "Tomorrow: [Specific Task]",
      "description": "Exact activity to do tomorrow with specific practice questions/exercises",
      "estimatedTime": "30-60 minutes",
      "priority": "high|medium|low",
      "category": "subject/topic",
      "dueDate": "tomorrow's date"
    },
    {
      "id": "unique_id2",
      "title": "Day 2: [Next Specific Task]",
      "description": "Exact activity for the day after tomorrow",
      "estimatedTime": "30-60 minutes",
      "priority": "high|medium|low",
      "category": "subject/topic",
      "dueDate": "day after tomorrow's date"
    }
  ]
}

IMPORTANT: Always create DAY-BY-DAY roadmaps starting from tomorrow with:
- Specific daily tasks (not vague goals)
- Concrete practice activities
- Exact timing for each day
- Build up to weekly assessments/mock exams
- Reference the child's actual weak subjects from the data

For schedules, respond with this JSON structure:
{
  "content": "Your explanation here",
  "schedule": [
    {
      "id": "unique_id",
      "title": "Activity title",
      "time": "HH:MM",
      "duration": "duration",
      "subject": "subject name",
      "type": "study|practice|review|break",
      "description": "activity description"
    }
  ]
}

Always provide helpful, educational advice focused on the child's learning improvement.`;

    const openai = getOpenRouterClient();
    const completion = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: studentContext + "\n\nUSER QUESTION: " + message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }

    // Try to parse JSON response for structured data
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch {
      // If it's not JSON, treat as plain text
      parsedResponse = { content: aiResponse };
    }

    // Generate dates for roadmap items if they don't have them (daily progression)
    if (parsedResponse.roadmap) {
      parsedResponse.roadmap = parsedResponse.roadmap.map(
        (item: RoadmapItem, index: number) => {
          // Start from tomorrow and add one day for each subsequent item
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1 + index);

          return {
            ...item,
            id: item.id || `roadmap_${Date.now()}_${index}`,
            dueDate: item.dueDate || tomorrow.toISOString(),
          };
        }
      );
    }

    // Generate IDs for schedule items if they don't have them
    if (parsedResponse.schedule) {
      parsedResponse.schedule = parsedResponse.schedule.map(
        (item: ScheduleItem, index: number) => ({
          ...item,
          id: item.id || `schedule_${Date.now()}_${index}`,
        })
      );
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Error in AI planner API:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
