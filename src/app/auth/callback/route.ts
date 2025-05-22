// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let nextPath = searchParams.get('next') ?? '/'
  const intendedRoleFromQuery = searchParams.get('intended_role');

  if (code) {
    const supabase = createClient()
    const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError && sessionData?.session?.user) {
      const user = sessionData.session.user;
      let userRole = user.user_metadata?.role as string | undefined;

      if (!userRole && intendedRoleFromQuery === 'parent') {
        userRole = 'parent';
        await supabase.auth.admin.updateUserById(user.id, { // Use admin client for metadata update
          user_metadata: { 
            ...user.user_metadata, 
            role: 'parent',
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'New Parent',
            // It's better to set username on the parent setup page where they can choose it
            // username: user.user_metadata?.username || user.email?.split('@')[0] || `parent${Date.now().toString().slice(-5)}` 
          }
        });
      }
      userRole = userRole || 'student';

      if (userRole === 'parent') {
        // Check if the Parent DB record exists, create if not
        const { data: existingParent, error: parentCheckError } = await supabase
          .from('Parent')
          .select('id')
          .eq('id', user.id)
          .single();

        if (parentCheckError && parentCheckError.code !== 'PGRST116') {
            console.error("Auth Callback: Error checking parent DB record:", parentCheckError);
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }

        if (!existingParent) {
          const { error: createParentError } = await supabase.from('Parent').insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'New Parent',
            username: user.user_metadata?.username || user.email?.split('@')[0] || `parent${Date.now().toString().slice(-5)}`, // Temporary username
            email: user.email,
            updatedAt: new Date().toISOString(),
          });
          if (createParentError) {
            console.error("Auth Callback: Error creating parent DB record:", createParentError);
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }
        }

        // NOW, check if this parent has any children to decide the redirect
        const { data: children, error: childrenError } = await supabase
          .from('Student')
          .select('id', { count: 'exact', head: true }) // Efficiently count children
          .eq('parentId', user.id);

        if (childrenError) {
          console.error("Auth Callback: Error checking for parent's children:", childrenError);
          // Default to parent dashboard in case of error checking children
          finalRedirectPath = '/parent';
        } else if (children && children.count > 0) {
          // Parent has children, redirect to parent dashboard (or original 'next' if not setup flow)
          finalRedirectPath = (nextPath === '/sign-up/parent-child-setup' || nextPath === '/sign-up/parent-child-setup-flow') ? '/parent' : nextPath;
        } else {
          // New parent (or existing parent with no children), redirect to parent-child setup.
          // Pass details so the setup page can prefill.
          const parentNameForRedirect = user.user_metadata?.name || user.email?.split('@')[0] || 'New Parent';
          const parentEmailForRedirect = user.email || '';
          finalRedirectPath = `/sign-up/parent-child-setup?parentId=${user.id}&email=${encodeURIComponent(parentEmailForRedirect)}&name=${encodeURIComponent(parentNameForRedirect)}`;
        }
      } else if (userRole === 'student') {
        // ... (Your existing student logic for callback)
        const { data: existingStudent } = await supabase
            .from('Student')
            .select('id, initialSetupComplete')
            .eq('id', user.id)
            .single();
            
          if (!existingStudent) {
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Student';
            const username = user.user_metadata?.username || user.email?.split('@')[0] || `student${Date.now().toString().slice(-5)}`;
            await supabase.from('Student').insert([
              { id: user.id, username, name, email: user.email, initialSetupComplete: false, schoolLevel: 1 },
            ]);
            finalRedirectPath = '/student/complete-setup';
          } else if (!existingStudent.initialSetupComplete) {
            finalRedirectPath = '/student/complete-setup';
          } else {
            finalRedirectPath = (nextPath === '/student/complete-setup') ? '/student' : nextPath; // If they somehow hit complete-setup again, send to dashboard
          }
      } else {
        finalRedirectPath = `/${userRole}`; // Fallback for other roles
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const redirectOrigin = forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${redirectOrigin}${finalRedirectPath}`);
    } else {
      console.error("Auth callback error (exchangeCodeForSession or no session/user):", exchangeError);
    }
  } else {
    console.error("Auth callback: No code found in searchParams.");
  }
  
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}