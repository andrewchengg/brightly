import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { username, password, metadata } = await request.json()
    
    // Validate request
    if (!username || !password) {
      return NextResponse.json(
        { error: { message: "Username and password are required" } },
        { status: 400 }
      )
    }
    
    console.log(`Creating child user with username: ${username}`);
    
    // Create the user with admin privileges
    // For child users, we'll create a temporary email but will 
    // allow them to update it during setup if they wish
    const tempEmail = `${username}_${Date.now()}@noreply.edcel.app`;
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      password,
      email_confirm: true, // Auto-confirm the email since it's temporary
      user_metadata: {
        role: 'student',
        username: username, // Store username in metadata
        ...(metadata || {}) // Include any additional metadata
      }
    })
    
    if (error) {
      console.error("Error creating child user:", error)
      return NextResponse.json({ error }, { status: 400 })
    }
    
    console.log("Child user created successfully:", data.user.id);
    return NextResponse.json({ user: data.user }, { status: 201 })
    
  } catch (error: any) {
    console.error("Server error creating child user:", error)
    return NextResponse.json(
      { error: { message: "Internal server error: " + error.message } },
      { status: 500 }
    )
  }
} 