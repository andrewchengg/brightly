import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 404 });
  }

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Fetch user's profile data based on their role (stored in user.user_metadata.role)
    const role = user.user_metadata?.role;
    
    let profileData = null;
    let profileError = null;
    
    try {
      if (role === 'student') {
        const { data, error } = await supabase
          .from('Student')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profileData = data;
        profileError = error;
      } else if (role === 'parent') {
        const { data, error } = await supabase
          .from('Parent')
          .select('*, students:Student(*)')
          .eq('id', user.id)
          .single();
        
        profileData = data;
        profileError = error;
      } else if (role === 'teacher') {
        const { data, error } = await supabase
          .from('Teacher')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profileData = data;
        profileError = error;
      } else {
        // Admin or other role
        profileData = { id: user.id, role: role || 'unknown' };
      }
    } catch (fetchError: any) {
      console.error('Profile fetch error:', fetchError);
      profileError = { message: fetchError.message || 'Error fetching profile' };
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: role || 'unknown',
        created_at: user.created_at,
        metadata: user.user_metadata || {}
      },
      profile: profileData,
      error: profileError
    });
    
  } catch (error: any) {
    console.error('Debug profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 