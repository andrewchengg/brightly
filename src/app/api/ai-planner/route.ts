import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
      "X-Title": "Brightly",
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

    // Fetch topic-level performance data for better educational insights
    let studentContext = "";
    try {
      // Import required functions
      const { getStudentContext } = await import("@/lib/student-context");

      // First, get all children of this parent using Prisma
      const prisma = (await import("@/lib/prisma")).default;
      const children = await prisma.student.findMany({
        where: { parentId: user.id },
        select: { id: true, name: true },
      });

      if (children.length === 0) {
        studentContext = `
STUDENT LEARNING ANALYSIS DATA:
No children found for this parent account. Please ensure children are properly linked to this parent account.
`;
      } else {
        // Get learning context for all children
        const childrenData = await Promise.all(
          children.map(async (child) => {
            const contextData = await getStudentContext(child.id);
            return { name: child.name, data: contextData };
          })
        );

        // Format combined data for all children
        const childSummaries = childrenData
          .filter((child) => child.data !== null)
          .map((child) => {
            const data = child.data!;

            const weakTopicsText =
              data.weakTopics.length > 0
                ? data.weakTopics
                    .map(
                      (topic) =>
                        `${topic.subject} - ${topic.topic}: ${topic.accuracy}% accuracy (${topic.incorrectCount}/${topic.totalCount} incorrect)`
                    )
                    .join("\n    ")
                : "No specific weak topics identified yet";

            const recentMistakesText =
              data.recentMistakes.length > 0
                ? data.recentMistakes
                    .map(
                      (mistake) =>
                        `${mistake.subject} - ${mistake.topic}: "${mistake.questionText}" | Answer: "${mistake.userAnswer}" | Correct: "${mistake.correctAnswer}"`
                    )
                    .join("\n    ")
                : "No recent mistakes to analyze";

            return `
CHILD: ${child.name}

WEAK TOPICS (Topics with <70% accuracy):
    ${weakTopicsText}

RECENT MISTAKES PATTERN:
    ${recentMistakesText}

SUBJECT PERFORMANCE:
  - Strong Subjects: ${
    data.strongSubjects.length > 0
      ? data.strongSubjects.join(", ")
      : "None identified yet"
  }
  - Weak Subjects: ${
    data.weakSubjects.length > 0
      ? data.weakSubjects.join(", ")
      : "None identified yet"
  }

WEEKLY PERFORMANCE:
  - Questions Attempted: ${data.weeklyPerformance.questionsAnswered}
  - Overall Accuracy: ${data.weeklyPerformance.accuracy}%
  - Time Spent: ${data.weeklyPerformance.timeSpentMinutes} minutes
`;
          });

        if (childSummaries.length === 0) {
          studentContext = `
STUDENT LEARNING ANALYSIS DATA:
Children found but no learning data available yet. Students need to complete some practice sessions before performance analysis can be provided.
`;
        } else {
          studentContext = `
STUDENT LEARNING ANALYSIS DATA:
${childSummaries.join("\n---\n")}

Focus your recommendations on the specific weak topics and mistake patterns above.
`;
        }
      }
    } catch (error) {
      studentContext = `
STUDENT LEARNING ANALYSIS DATA:
Error retrieving student performance data. Proceeding with general educational guidance.
`;
    }

    const systemPrompt = `You are an AI educational planner for parents. You help analyze children's educational progress and create personalized learning plans based on REAL performance data.

CRITICAL: You MUST respond in valid JSON format only. Never use markdown formatting, bold text, or any other text formatting.

Your capabilities include:
1. Analyzing weak topics and learning gaps using actual student performance data
2. Creating data-driven study schedules and learning roadmaps
3. Providing specific educational guidance based on performance patterns
4. Identifying trends in accuracy, time management, and subject performance
5. Creating targeted improvement plans for struggling areas

IMPORTANT: You will receive detailed learning analysis data including:
- WEAK TOPICS: Specific topics with <70% accuracy, showing exact performance (e.g., "Algebra - Linear Equations: 45% accuracy (11/20 incorrect)")
- RECENT MISTAKES: Actual questions the student got wrong with their answers vs correct answers
- SUBJECT PERFORMANCE: Overall strong and weak subject areas
- WEEKLY PERFORMANCE: Questions attempted, overall accuracy, and time spent

Focus your analysis on the specific weak topics and mistake patterns. Create targeted practice plans that address the exact topics where the student is struggling.

RESPONSE FORMAT: You must ALWAYS respond with valid JSON.

When parents ask for roadmaps, plans, or schedules, you MUST provide BOTH:
1. A conversational explanation in "content" 
2. A structured roadmap/schedule that will display as beautiful cards

CRITICAL: The "content" field should ONLY contain natural language explanation that will be shown as a chat message. NEVER put JSON or structured data in the content field.

For roadmaps/learning plans, respond with this EXACT JSON structure:
{
  "content": "Looking at your child's learning analysis, I can see they're struggling with specific topics that need targeted attention. Based on their weak topics showing low accuracy rates and recent mistake patterns, I've created a focused recovery plan that addresses these exact areas. The plan starts with their weakest topics and builds understanding systematically through targeted practice sessions.",
  "roadmap": [
    {
      "id": "foundation_day1",
      "title": "Tomorrow: Basic Number Recognition & Simple Addition",
      "description": "Start with single-digit addition problems (1+1, 2+3, etc.). Practice 10 very simple problems slowly, focusing on getting every single one correct rather than speed. Use visual aids like counting objects if needed.",
      "estimatedTime": "20 minutes",
      "priority": "high",
      "category": "Mathematics - Foundation",
      "dueDate": "2025-01-09"
    },
    {
      "id": "foundation_day2", 
      "title": "Day 2: Review Addition + Simple Subtraction",
      "description": "Review yesterday's addition problems first, then introduce basic subtraction (5-2, 8-3). Only 15 problems total, making sure to understand each step completely.",
      "estimatedTime": "25 minutes",
      "priority": "high",
      "category": "Mathematics - Foundation",
      "dueDate": "2025-01-10"
    },
    {
      "id": "foundation_day3",
      "title": "Day 3: Mixed Basic Operations Practice", 
      "description": "Combine addition and subtraction in 20 mixed problems. If accuracy drops below 80%, go back to simpler problems. The goal is building confidence through success.",
      "estimatedTime": "30 minutes",
      "priority": "high",
      "category": "Mathematics - Foundation",
      "dueDate": "2025-01-11"
    },
    {
      "id": "foundation_day4",
      "title": "Day 4: Introduction to Multiplication Tables",
      "description": "Focus only on 2 times table and 5 times table up to 10. Use repetition and visual patterns. Practice 15 problems maximum.",
      "estimatedTime": "30 minutes",
      "priority": "medium",
      "category": "Mathematics - Foundation",
      "dueDate": "2025-01-12"
    },
    {
      "id": "foundation_day5",
      "title": "Day 5: Review Week + Confidence Assessment",
      "description": "Take a mini-quiz covering this week's topics: 10 addition, 10 subtraction, 10 basic multiplication. Aim for 70% accuracy minimum before moving to harder concepts.",
      "estimatedTime": "35 minutes",
      "priority": "high", 
      "category": "Mathematics - Assessment",
      "dueDate": "2025-01-13"
    }
  ]
}

For schedules, respond with this EXACT JSON structure:
{
  "content": "Your natural language explanation here - no markdown formatting, just plain text",
  "schedule": [
    {
      "id": "unique_id",
      "title": "Activity title",
      "time": "09:00",
      "duration": "30 minutes",
      "subject": "Mathematics",
      "type": "practice",
      "description": "activity description"
    }
  ]
}

For general advice without roadmaps/schedules:
{
  "content": "Your helpful advice here - no markdown formatting, just plain text"
}

REQUIREMENTS:
- When parents ask for roadmaps, plans, or study schedules, ALWAYS provide both "content" AND "roadmap" fields
- Create DAY-BY-DAY roadmaps starting from tomorrow (minimum 3-5 days)
- Include specific daily tasks, not vague goals
- Reference the child's actual weak subjects from the performance data
- Use natural language in content without any formatting symbols
- Always return valid JSON only

CONTENT FIELD RULES:
- The "content" field is displayed as a chat message to parents
- Write natural conversational text explaining your analysis and the plan
- Reference specific weak topics and accuracy rates (e.g., "Linear Equations at 45% accuracy")
- Mention patterns from recent mistakes when relevant
- Be encouraging but realistic about the challenges identified
- Example GOOD content: "I can see your child is struggling with Linear Equations (45% accuracy) and Fractions (38% accuracy). Based on their recent mistakes, I've created a targeted plan..."
- NEVER include raw JSON, markdown formatting, or duplicate the roadmap details

The roadmap data will be displayed as beautiful cards below your message - don't repeat those details in content!`;

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
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
