import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { generateWeeklyQuests } from '@/lib/weekly-quest-service-raw';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// POST /api/weekly-quests/generate-all - Generate quests for all eligible users
export async function POST() {
  try {
    console.log('🚀 Starting quest generation for all users...');
    
    // First, let's see all students and their levels
    const allStudents = await prisma.student.findMany({
      select: {
        id: true,
        username: true,
        level: true
      }
    });
    
    console.log(`👥 Found ${allStudents.length} total students:`);
    allStudents.forEach(student => {
      console.log(`   - ${student.username}: Level ${student.level}`);
    });
    
    // Get students who are level 1 or above (generate for all existing users for now)
    const eligibleStudents = allStudents.filter(student => (student.level || 0) >= 1);
    console.log(`📚 ${eligibleStudents.length} students are level 1 or above (generating for all existing users)`);
    
    if (eligibleStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No students found at level 1 or above',
        totalStudents: allStudents.length,
        eligibleStudents: 0,
        studentsProcessed: 0,
        totalQuests: 0
      });
    }

    // Clear existing quests for current week for these students first
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of this week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const deletedQuests = await prisma.weeklyQuest.deleteMany({
      where: {
        studentId: {
          in: eligibleStudents.map(s => s.id)
        },
        weekStart: {
          gte: currentWeekStart,
          lt: new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    console.log(`🗑️ Cleared ${deletedQuests.count} existing quests for current week`);

    let totalQuestsGenerated = 0;
    let successCount = 0;
    let errorCount = 0;

    // Generate quests for each eligible student
    for (const student of eligibleStudents) {
      try {
        console.log(`🎯 Generating quests for ${student.username} (Level ${student.level})`);
        await generateWeeklyQuests(student.id, student.level || 1);
        totalQuestsGenerated += 5; // Assuming 5 quests per student
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate quests for ${student.username}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Quest generation completed!`);
    console.log(`   - ${successCount} students processed successfully`);
    console.log(`   - ${errorCount} students failed`);
    console.log(`   - ${totalQuestsGenerated} total quests generated`);

    return NextResponse.json({
      success: true,
      message: 'Quest generation completed',
      totalStudents: allStudents.length,
      eligibleStudents: eligibleStudents.length,
      studentsProcessed: successCount,
      studentsFailed: errorCount,
      totalQuests: totalQuestsGenerated,
      questsCleared: deletedQuests.count
    });

  } catch (error: any) {
    console.error('❌ Error in bulk quest generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate quests', details: error.message },
      { status: 500 }
    );
  }
} 