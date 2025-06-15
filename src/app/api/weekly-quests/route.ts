import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { 
  manageWeeklyQuestRotation
} from '@/lib/weekly-quest-service-raw';
import { calculateLevel } from '@/lib/xp-utils';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET /api/weekly-quests - Get current week's quests
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('API: Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = user.id;
    console.log('API: Fetching quests for student:', studentId);

    // First, check the student's level by calculating it from XP points
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { level: true, xpPoints: true }
    });

    // Use calculated level from XP points instead of stored level for consistency
    const studentLevel = calculateLevel(student?.xpPoints || 0);
    const storedLevel = student?.level || 1;
    console.log('API: Student calculated level:', studentLevel, '(stored:', storedLevel, ', XP:', student?.xpPoints, ')');

    // If student is below level 2, return locked state
    if (studentLevel < 2) {
      console.log('API: Student below level 2, returning locked state');
      return NextResponse.json({ 
        locked: true,
        level: studentLevel,
        requiredLevel: 2,
        message: 'Reach level 2 to unlock weekly quests!',
        quests: []
      });
    }

    let quests = [];
    let formattedQuests = [];

    try {
      // Simply fetch existing quests for the current week - do NOT generate new ones
      // Use same Monday-based week calculation as quest service
      const weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday-based week
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      quests = await prisma.weeklyQuest.findMany({
        where: {
          studentId,
          weekStart: {
            gte: weekStart,
            lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log('API: Retrieved quests from database:', quests.length, 'quests');

      // Convert to frontend format
      formattedQuests = quests.map(quest => ({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        progress: quest.progress,
        target: quest.target,
        icon: quest.icon,
        color: quest.color,
        category: quest.category.toLowerCase(),
        isCompleted: quest.isCompleted,
        completedAt: quest.completedAt,
      }));
    } catch (dbError) {
      console.warn('API: Database quest generation failed, using fallback:', dbError);
      
      // Fallback quests if database fails
      formattedQuests = [
        {
          id: '1',
          title: 'Review 10 mistakes',
          description: 'Learn from your previous incorrect answers',
          progress: 0,
          target: 10,
          icon: 'FaExclamationTriangle',
          color: 'orange',
          category: 'core',
          isCompleted: false,
          completedAt: null,
        },
        {
          id: '2',
          title: 'Score 80%+ in 3 sessions',
          description: 'Achieve high accuracy in your practice sessions',
          progress: 0,
          target: 3,
          icon: 'FaBullseye',
          color: 'green',
          category: 'core',
          isCompleted: false,
          completedAt: null,
        },
        {
          id: '3',
          title: 'Subject Specialist',
          description: 'Complete 5+ practice sessions in your chosen subject specialty',
          progress: 0,
          target: 5,
          icon: 'FaGraduationCap',
          color: 'blue',
          category: 'subject',
          isCompleted: false,
          completedAt: null,
        },
        {
          id: '4',
          title: 'Weekly Warrior',
          description: 'Practice for at least 5 days this week',
          progress: 0,
          target: 5,
          icon: 'FaCalendarCheck',
          color: 'green',
          category: 'consistency',
          isCompleted: false,
          completedAt: null,
        },
        {
          id: '5',
          title: 'Speed Demon',
          description: 'Complete 10 practice sessions within the week',
          progress: 0,
          target: 10,
          icon: 'FaFire',
          color: 'orange',
          category: 'performance',
          isCompleted: false,
          completedAt: null,
        },
      ];
      console.log('API: Using fallback quests:', formattedQuests.length, 'quests');
    }

    console.log('API: Final formatted quests:', formattedQuests);
    return NextResponse.json({ quests: formattedQuests });
  } catch (error: any) {
    console.error('API: Error fetching weekly quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly quests', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/weekly-quests - Admin-only quest management
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    // Only allow admin actions like quest rotation - no manual refresh for students
    switch (action) {
      case 'rotate-all':
        // Admin function to rotate all students' quests
        console.log('API: Managing weekly quest rotation for all students');
        const rotationResult = await manageWeeklyQuestRotation();
        return NextResponse.json({ 
          success: true, 
          message: 'Quest rotation completed',
          ...rotationResult 
        });
        
      default:
        return NextResponse.json(
          { error: 'Manual quest refresh is not allowed. Weekly quests are automatically generated on Monday.' },
          { status: 403 }
        );
    }
  } catch (error: any) {
    console.error('API: Error processing weekly quest action:', error);
    return NextResponse.json(
      { error: 'Failed to process action', details: error.message },
      { status: 500 }
    );
  }
} 