import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { email, password, metadata } = await request.json()
    
    // Validate request
    if (!email || !password) {
      return NextResponse.json(
        { error: { message: "Email and password are required" } },
        { status: 400 }
      )
    }
    
    console.log(`Creating child user with email: ${email}`);
    
    // Create the user with admin privileges 
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email since it's a placeholder
      user_metadata: metadata || {}
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