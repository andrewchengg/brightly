import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { userId, email, username, name, role, password, metadata } = await request.json();
    
    // Validate request
    if (!userId) {
      return NextResponse.json(
        { error: { message: "User ID is required" } },
        { status: 400 }
      );
    }
    
    // Get the existing user first to merge metadata properly
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError) {
      return NextResponse.json({ error: getUserError }, { status: 400 });
    }
    
    const existingMetadata = existingUser?.user?.user_metadata || {};
    
    // Prepare update data
    const updateData: any = {
      user_metadata: {
        ...existingMetadata,
        ...(role && { role }),
        ...(username && { username }),
        ...(name && { name }),
        ...(metadata && { ...metadata })
      }
    };
    
    // Add email if provided
    if (email) {
      updateData.email = email;
    }
    
    // Add password if provided
    if (password) {
      updateData.password = password;
    }
    
    // Update the user with admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
    
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    
    return NextResponse.json({ user: data.user }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: "Internal server error: " + error.message } },
      { status: 500 }
    );
  }
} 