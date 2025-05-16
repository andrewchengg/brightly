import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Define sample questions (for development only)
// In production, these should come from your database
const sampleQuestions = [
  {
    id: "1",
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    hint: "It's an even number.",
    topic: {
      id: "1",
      name: "Addition"
    }
  },
  {
    id: "2",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    hint: "Think of the Eiffel Tower.",
    topic: {
      id: "2",
      name: "Geography"
    }
  },
  {
    id: "3",
    question: "What is 5 × 7?",
    options: ["30", "35", "40", "45"],
    correctAnswer: "35",
    hint: "5 × 7 = 5 + 5 + 5 + 5 + 5 + 5 + 5",
    topic: {
      id: "1",
      name: "Multiplication"
    }
  },
  {
    id: "4",
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    correctAnswer: "Mars",
    hint: "It's named after the Roman god of war.",
    topic: {
      id: "2",
      name: "Science"
    }
  },
  {
    id: "5",
    question: "What is 10 ÷ 2?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "5",
    hint: "Think about how many groups of 2 make 10.",
    topic: {
      id: "1",
      name: "Division"
    }
  },
  {
    id: "6",
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    correctAnswer: "Pacific Ocean",
    hint: "It covers more than 30% of Earth's surface.",
    topic: {
      id: "2", 
      name: "Geography"
    }
  },
  {
    id: "7",
    question: "What is 3² (3 squared)?",
    options: ["6", "9", "12", "15"],
    correctAnswer: "9",
    hint: "3² means 3 × 3.",
    topic: {
      id: "1",
      name: "Exponents"
    }
  },
  {
    id: "8",
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gl", "Au", "Ag"],
    correctAnswer: "Au",
    hint: "It comes from the Latin word 'aurum'.",
    topic: {
      id: "2",
      name: "Science"
    }
  },
  {
    id: "9",
    question: "What is 15 - 7?",
    options: ["5", "6", "7", "8"],
    correctAnswer: "8",
    hint: "Try counting down from 15: 14, 13, ...",
    topic: {
      id: "1",
      name: "Subtraction"
    }
  },
  {
    id: "10",
    question: "How many sides does a pentagon have?",
    options: ["4", "5", "6", "7"],
    correctAnswer: "5",
    hint: "'Penta' is a prefix meaning five.",
    topic: {
      id: "1",
      name: "Geometry"
    }
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    // Eventually, this should fetch from your database
    // For now, using sample data and shuffling it
    
    // Shuffle the questions array
    const shuffled = [...sampleQuestions].sort(() => 0.5 - Math.random());
    
    // Get the first 'limit' questions or all if there are fewer
    const randomQuestions = shuffled.slice(0, Math.min(limit, shuffled.length));
    
    return NextResponse.json(randomQuestions);
  } catch (error: any) {
    console.error("Error fetching random questions:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch random questions" } },
      { status: 500 }
    );
  }
} 