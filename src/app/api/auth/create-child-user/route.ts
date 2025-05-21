import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CreateChildUserRequest = {
  username: string;
  password: string;
  email: string;
  metadata?: Record<string, any>;
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { username, password, email, metadata } = await request.json() as CreateChildUserRequest;
    
    // Validate request
    if (!username || !password) {
      return NextResponse.json(
        { error: { message: "Username and password are required" } },
        { status: 400 }
      )
    }
    
    if (!email) {
      return NextResponse.json(
        { error: { message: "Email is required" } },
        { status: 400 }
      )
    }
    
    console.log(`Creating child user with username: ${username} and email: ${email}`);
    
    // Skip checking for existing users with the admin API and let Supabase handle duplicates
    // This avoids compatibility issues with different Supabase versions
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        role: 'student',
        username: username, // Store username in metadata
        ...(metadata || {}) // Include any additional metadata
      }
    })
    
    if (error) {
      // Special handling for duplicate email error
      if (error.message.includes("already been registered") || 
          error.message.includes("already exists") ||
          error.message.includes("unique constraint")) {
        
        return NextResponse.json(
          { error: { message: "A user with this email already exists. Please use another email address." } },
          { status: 400 }
        )
      }
      
      console.error("Error creating child user:", error)
      return NextResponse.json(
        { error: { message: "Failed to create user: " + error.message } },
        { status: 400 }
      )
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