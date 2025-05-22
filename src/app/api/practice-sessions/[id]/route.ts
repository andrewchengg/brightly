// src/app/api/practice-sessions/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Import for API routes
import { cookies } from 'next/headers'; // Import cookies

const prisma = new PrismaClient();

// --- Your existing PATCH function here (ensure it also uses createServerClient correctly if needed) ---
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch (error) { /* Ignored */ }},
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch (error) { /* Ignored */ }},
      },
    }
  );
  // ... (rest of your PATCH logic, ensuring you use this supabase instance for auth checks if any) ...
  try {
    const { id: practiceSessionId } = params;
    const body = await request.json();
    const { status, endTime, score, correctAnswers, xpEarned } = body;

    // Optional: Authenticate user before allowing update
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Optional: Check if this session belongs to the authenticated user
    // const sessionToUpdate = await prisma.practiceSession.findUnique({where: {id: practiceSessionId}});
    // if (sessionToUpdate?.studentId !== authUser.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }


    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (endTime) updateData.endTime = new Date(endTime);
    if (score !== undefined) updateData.score = Number(score);
    if (correctAnswers !== undefined) updateData.correctAnswers = Number(correctAnswers);
    if (xpEarned !== undefined) updateData.xpEarned = Number(xpEarned);


    const updatedPracticeSession = await prisma.practiceSession.update({
      where: { id: practiceSessionId },
      data: updateData,
      include: { student: true } 
    });

    if (updatedPracticeSession.status === 'COMPLETED' && updatedPracticeSession.studentId) {
      await prisma.result.upsert({ // Use upsert to avoid duplicate errors if re-finalizing
        where: { practiceSessionId: updatedPracticeSession.id },
        update: {
          score: updatedPracticeSession.score || 0,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        },
        create: {
          score: updatedPracticeSession.score || 0,
          practiceSessionId: updatedPracticeSession.id,
          studentId: updatedPracticeSession.studentId,
          submittedAt: updatedPracticeSession.endTime || new Date(),
        }
      });
    }
    
    return NextResponse.json(updatedPracticeSession);

  } catch (error: any) {
    console.error('API PATCH Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update practice session', details: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


// Corrected DELETE function
export async function DELETE(
  request: NextRequest, // Use NextRequest for cookies()
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies(); // Get cookie store from next/headers

  // Initialize Supabase client correctly for Route Handlers
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // set and remove are not strictly necessary for a DELETE operation
        // that only reads auth state, but it's good practice to include them
        // if you were to perform operations that might refresh the session.
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch (e) { /* empty */ }
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch (e) { /* empty */ }
        },
      },
    }
  );

  try {
    const { id: practiceSessionId } = params;

    if (!practiceSessionId) {
      return NextResponse.json({ error: 'Practice Session ID is required' }, { status: 400 });
    }

    // --- IMPORTANT: Authentication and Authorization Check ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("API DELETE /practice-sessions/[id]: Unauthorized access attempt.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the session to be deleted actually belongs to the authenticated user
    const sessionToDelete = await prisma.practiceSession.findUnique({
      where: { id: practiceSessionId },
      select: { studentId: true } // Only fetch necessary field
    });

    if (!sessionToDelete) {
      return NextResponse.json({ message: 'Practice session not found' }, { status: 404 });
    }

    if (sessionToDelete.studentId !== user.id) {
      console.warn(`API DELETE /practice-sessions/[id]: Forbidden. User ${user.id} tried to delete session ${practiceSessionId} owned by ${sessionToDelete.studentId}.`);
      return NextResponse.json({ error: 'Forbidden: You can only delete your own practice sessions' }, { status: 403 });
    }
    // --- End Auth Check ---


    // Delete related StudentAnswers first (Prisma handles cascade if set, but explicit is safer)
    await prisma.studentAnswer.deleteMany({
      where: { practiceSessionId: practiceSessionId },
    });

    // Delete related Result record
     await prisma.result.deleteMany({ // Use deleteMany in case there could somehow be more than one, though it's unique
      where: { practiceSessionId: practiceSessionId },
    });


    // Then delete the PracticeSession
    await prisma.practiceSession.delete({
      where: { id: practiceSessionId },
    });

    console.log("API: PracticeSession deleted:", practiceSessionId);
    return NextResponse.json({ message: 'Practice session discarded successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('API: Error deleting practice session:', error);
    if (error.code === 'P2025') { // Prisma error code for record not found
        return NextResponse.json({ message: 'Practice session already deleted or not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete practice session', details: error.message, stack: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}